/**
 * Strapi API Utility Functions
 * Centralized functions for fetching data from Strapi CMS
 */

const isServer = typeof window === 'undefined';

/**
 * Base fetch function for Strapi API calls.
 * - Server-side: calls Strapi directly with the API token
 * - Client-side: calls /api/strapi/... proxy (token stays server-side)
 */
async function fetchStrapi(endpoint: string, options: RequestInit = {}) {
  let url: string;
  let headers: HeadersInit;

  if (isServer) {
    // Server-side: call Strapi directly with server-only env vars
    const strapiUrl = process.env.STRAPI_URL || process.env.NEXT_PUBLIC_STRAPI_URL || 'http://localhost:1337';
    const strapiToken = process.env.STRAPI_API_TOKEN;
    url = `${strapiUrl}/api${endpoint}`;
    headers = {
      'Content-Type': 'application/json',
      ...(strapiToken && { Authorization: `Bearer ${strapiToken}` }),
      ...options.headers,
    };
  } else {
    // Client-side: call the Next.js proxy route (no token needed)
    url = `/api/strapi${endpoint}`;
    headers = {
      'Content-Type': 'application/json',
      ...options.headers,
    };
  }

  try {
    const response = await fetch(url, {
      ...options,
      headers,
    });

    if (!response.ok) {
      throw new Error(`Strapi API error: ${response.status} ${response.statusText}`);
    }

    return await response.json();
  } catch (error) {
    console.error(`Error fetching from Strapi (${endpoint}):`, error);
    throw error;
  }
}

/**
 * Same as fetchStrapi, but reads EVERY page.
 *
 * Το Strapi αγνοεί σιωπηλά το `pagination[limit]` πάνω από 100: ζητάς 1000,
 * παίρνεις 100, κανένα σφάλμα. Στις 19/8/2026 τα open calls ήταν 103 — τρία
 * δεν εμφανίζονταν καθόλου στο site και κανείς δεν το είχε προσέξει.
 * Επιστρέφει το ίδιο σχήμα ({ data, meta }) ώστε να μην αλλάζουν οι καλούντες.
 */
async function fetchStrapiAll(endpoint: string, options: RequestInit = {}) {
  const join = endpoint.includes('?') ? '&' : '?';
  const data: any[] = [];
  let meta: any = null;
  for (let page = 1; page <= 50; page++) {
    const json = await fetchStrapi(
      `${endpoint}${join}pagination[page]=${page}&pagination[pageSize]=100`,
      options,
    );
    const batch = json?.data || [];
    data.push(...batch);
    meta = json?.meta ?? meta;
    const pageCount = json?.meta?.pagination?.pageCount ?? 1;
    if (page >= pageCount || batch.length === 0) break;
  }
  return { data, meta };
}

/**
 * Get all activities
 */
export async function getActivities() {
  // Strapi v5: Explicitly populate Visuals field (media fields need explicit population)
  // Set pagination limit to 1000 to get all activities
  return fetchStrapiAll('/activities?populate=Visuals');
}

/**
 * Get a single activity by ID or Slug
 * First tries by Slug field, then falls back to documentId lookup
 */
export async function getActivityById(idOrSlug: string | number) {
  // First try searching by Slug field (most common path from listing pages)
  const response = await fetchStrapi(`/activities?filters[Slug][$eq]=${encodeURIComponent(idOrSlug)}&populate=*`);
  if (response.data && response.data.length > 0) {
    return { data: response.data[0] };
  }

  // Fall back to documentId lookup
  return await fetchStrapi(`/activities/${encodeURIComponent(idOrSlug)}?populate=*`);
}

/**
 * Get all open calls
 */
export async function getOpenCalls() {
  // Strapi v5: Explicitly populate Image field (media fields need explicit population)
  // Set pagination limit to 1000 to get all open calls
  return fetchStrapiAll('/open-calls?populate=Image');
}

/**
 * Get all newsletters
 */
export async function getNewsletters() {
  return fetchStrapiAll('/newsletters?populate=Image&sort=Date:desc');
}

/**
 * Get a single open call by ID or Slug
 * First tries by documentId, then falls back to searching by Slug field
 */
export async function getOpenCallById(idOrSlug: string | number) {
  try {
    // First try fetching by documentId (new format)
    return await fetchStrapi(`/open-calls/${encodeURIComponent(idOrSlug)}?populate=*`);
  } catch (error) {
    // If not found, try searching by Slug field (old format from previous site)
    const response = await fetchStrapi(`/open-calls?filters[Slug][$eq]=${encodeURIComponent(idOrSlug)}&populate=*`);
    if (response.data && response.data.length > 0) {
      return { data: response.data[0] };
    }
    throw new Error('Open call not found');
  }
}

/**
 * Get all projects, ordered by sort_order
 */
export async function getProjects() {
  return fetchStrapiAll('/projects?populate[cover_image]=true&populate[partners][populate]=logo&populate[external_links]=true&sort=sort_order:asc');
}

/**
 * Get featured projects only (for navbar dropdown)
 */
export async function getFeaturedProjects() {
  return fetchStrapi('/projects?populate[cover_image]=true&filters[featured][$eq]=true&pagination[limit]=1000&sort=sort_order:asc');
}

/**
 * Get a single project by slug with all relations populated
 */
export async function getProjectBySlug(slug: string) {
  return fetchStrapi(`/projects?filters[slug][$eq]=${encodeURIComponent(slug)}&populate[cover_image]=true&populate[project_images]=true&populate[partners][populate]=logo&populate[external_links]=true&populate[project_entries][populate][cover_image]=true&populate[supporters_banner_light]=true&populate[supporters_banner_dark]=true`);
}

/**
 * Get a single ΣΗΜΑ entry by slug (returns regardless of visibility)
 */
export async function getProjectEntryBySlug(slug: string) {
  return fetchStrapi(`/project-entries?filters[slug][$eq]=${encodeURIComponent(slug)}&populate=*`);
}

/**
 * Get all pages
 */
export async function getPages() {
  return fetchStrapi('/pages?populate=*');
}

/**
 * Get a single page by slug
 */
export async function getPageBySlug(slug: string) {
  return fetchStrapi(`/pages?filters[slug][$eq]=${encodeURIComponent(slug)}&populate=*`);
}

/**
 * Fetch all pages of a Strapi collection.
 * Strapi caps `pagination[limit]` at 100 regardless of what we request, so a
 * single call to a collection with >100 entries silently drops the overflow.
 * This loops until `meta.pagination.total` is satisfied.
 */
async function fetchAllPaginated(basePath: string, pageSize = 100) {
  const sep = basePath.includes('?') ? '&' : '?'
  const collected: any[] = []
  let start = 0
  let total = Infinity
  let lastMeta: any = null

  while (start < total) {
    const page = await fetchStrapi(
      `${basePath}${sep}pagination[start]=${start}&pagination[limit]=${pageSize}&pagination[withCount]=true`
    )
    const rows = page?.data || []
    collected.push(...rows)
    lastMeta = page?.meta
    total = page?.meta?.pagination?.total ?? collected.length
    if (rows.length === 0) break
    start += rows.length
  }

  return { data: collected, meta: lastMeta }
}

/**
 * Fields on `member` that must NEVER reach public pages (they end up
 * serialized into page props / HTML). Covers auth internals (pre-existing)
 * and the OC registry/financial fields. Applied server-side to every
 * public member query — the OC reads Strapi directly and is unaffected.
 */
const SENSITIVE_MEMBER_FIELDS = [
  'password', 'magicLinkToken', 'magicLinkExpiry', 'lastLoginAt', 'AddedToPaidGroup',
  'AM', 'RegistrationYear', 'BoardApprovalDate', 'Gender', 'BAN', 'StartFellow',
  'SocialMediaPresented', 'Payments', 'ReceiptType', 'FatherName', 'TaxId',
  'CompanyName', 'CompanyAddress', 'CompanyTaxId', 'AdminNotes', 'CommunityNotes',
]

export function sanitizeMember<T extends Record<string, any> | null | undefined>(m: T): T {
  if (!m || typeof m !== 'object') return m
  for (const f of SENSITIVE_MEMBER_FIELDS) delete (m as any)[f]
  return m
}

/** Sanitizes member objects nested inside other entities (working groups, teams). */
export function sanitizeNestedMembers(entity: Record<string, any> | null | undefined) {
  if (!entity) return entity
  for (const key of ['Coordinator', 'Admin', 'Comms', 'IT', 'Community', 'Financer', 'Outreach']) {
    if (entity[key]) sanitizeMember(entity[key])
  }
  if (Array.isArray(entity.Members)) entity.Members.forEach(sanitizeMember)
  return entity
}

/**
 * Get all members (paginated — Strapi caps single-page responses at 100)
 */
export async function getMembers() {
  const response = await fetchAllPaginated('/members?populate=*');
  (response.data || []).forEach(sanitizeMember);
  return response;
}

/**
 * Get all working groups with coordinator and members populated
 */
export async function getWorkingGroups() {
  const response = await fetchStrapi('/working-groups?populate[Image]=true&populate[Coordinator][populate]=Image&populate[Members][populate]=Image&populate[Admin][populate]=Image&populate[Comms][populate]=Image&populate[IT][populate]=Image&pagination[limit]=1000&sort=SortOrder:asc');
  (response.data || []).forEach(sanitizeNestedMembers);
  return response;
}

/**
 * Get all coordination teams with coordinator and members populated
 */
export async function getCoordinationTeams() {
  const response = await fetchStrapi('/coordination-teams?populate[Image]=true&populate[Coordinator][populate]=Image&populate[Members][populate]=Image&populate[Admin][populate]=Image&populate[Comms][populate]=Image&populate[IT][populate]=Image&pagination[limit]=1000&sort=SortOrder:asc');
  (response.data || []).forEach(sanitizeNestedMembers);
  return response;
}

/**
 * Get a single member by Slug or documentId
 * First tries by Slug, then falls back to documentId
 */
export async function getMemberBySlugOrId(slugOrId: string) {
  // First try by Slug (most common for member URLs)
  const response = await fetchStrapi(`/members?filters[Slug][$eq]=${encodeURIComponent(slugOrId)}&populate=*`);
  if (response.data && response.data.length > 0) {
    return { data: sanitizeMember(response.data[0]) };
  }

  // Fall back to documentId
  try {
    const single = await fetchStrapi(`/members/${slugOrId}?populate=*`);
    if (single?.data) sanitizeMember(single.data);
    return single;
  } catch (error) {
    throw new Error('Member not found');
  }
}
