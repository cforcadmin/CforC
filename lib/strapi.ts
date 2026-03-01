/**
 * Strapi API Utility Functions
 * Centralized functions for fetching data from Strapi CMS
 */

const STRAPI_URL = process.env.NEXT_PUBLIC_STRAPI_URL || 'http://localhost:1337';
const STRAPI_API_TOKEN = process.env.NEXT_PUBLIC_STRAPI_API_TOKEN;

/**
 * Base fetch function for Strapi API calls
 */
async function fetchStrapi(endpoint: string, options: RequestInit = {}) {
  const url = `${STRAPI_URL}/api${endpoint}`;

  const headers: HeadersInit = {
    'Content-Type': 'application/json',
    ...(STRAPI_API_TOKEN && {
      Authorization: `Bearer ${STRAPI_API_TOKEN}`,
    }),
    ...options.headers,
  };

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
 * Get all activities
 */
export async function getActivities() {
  // Strapi v5: Explicitly populate Visuals field (media fields need explicit population)
  // Set pagination limit to 1000 to get all activities
  return fetchStrapi('/activities?populate=Visuals&pagination[limit]=1000');
}

/**
 * Get a single activity by ID or Slug
 * First tries by documentId, then falls back to searching by Slug field
 */
export async function getActivityById(idOrSlug: string | number) {
  try {
    // First try fetching by documentId (new format)
    return await fetchStrapi(`/activities/${idOrSlug}?populate=*`);
  } catch (error) {
    // If not found, try searching by Slug field (old format from previous site)
    const response = await fetchStrapi(`/activities?filters[Slug][$eq]=${idOrSlug}&populate=*`);
    if (response.data && response.data.length > 0) {
      return { data: response.data[0] };
    }
    throw new Error('Activity not found');
  }
}

/**
 * Get all open calls
 */
export async function getOpenCalls() {
  // Strapi v5: Explicitly populate Image field (media fields need explicit population)
  // Set pagination limit to 1000 to get all open calls
  return fetchStrapi('/open-calls?populate=Image&pagination[limit]=1000');
}

/**
 * Get all newsletters
 */
export async function getNewsletters() {
  return fetchStrapi('/newsletters?populate=Image&pagination[limit]=1000&sort=Date:desc');
}

/**
 * Get a single open call by ID or Slug
 * First tries by documentId, then falls back to searching by Slug field
 */
export async function getOpenCallById(idOrSlug: string | number) {
  try {
    // First try fetching by documentId (new format)
    return await fetchStrapi(`/open-calls/${idOrSlug}?populate=*`);
  } catch (error) {
    // If not found, try searching by Slug field (old format from previous site)
    const response = await fetchStrapi(`/open-calls?filters[Slug][$eq]=${idOrSlug}&populate=*`);
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
  return fetchStrapi('/projects?populate[cover_image]=true&populate[partners][populate]=logo&populate[external_links]=true&pagination[limit]=1000&sort=sort_order:asc');
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
  return fetchStrapi(`/projects?filters[slug][$eq]=${slug}&populate[cover_image]=true&populate[project_images]=true&populate[partners][populate]=logo&populate[external_links]=true&populate[project_entries][populate][cover_image]=true&populate[supporters_banner_light]=true&populate[supporters_banner_dark]=true`);
}

/**
 * Get a single ΣΗΜΑ entry by slug (returns regardless of visibility)
 */
export async function getProjectEntryBySlug(slug: string) {
  return fetchStrapi(`/project-entries?filters[slug][$eq]=${slug}&populate=*`);
}

/**
 * Get hero section data
 */
export async function getHeroSection() {
  return fetchStrapi('/hero-section?populate=*');
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
  return fetchStrapi(`/pages?filters[slug][$eq]=${slug}&populate=*`);
}

/**
 * Get all members
 */
export async function getMembers() {
  return fetchStrapi('/members?populate=*&pagination[limit]=1000');
}

/**
 * Get all working groups with coordinator and members populated
 */
export async function getWorkingGroups() {
  return fetchStrapi('/working-groups?populate[Image]=true&populate[Coordinator][populate]=Image&populate[Members][populate]=Image&pagination[limit]=1000&sort=SortOrder:asc')
}

/**
 * Get all coordination teams with coordinator and members populated
 */
export async function getCoordinationTeams() {
  return fetchStrapi('/coordination-teams?populate[Image]=true&populate[Coordinator][populate]=Image&populate[Members][populate]=Image&pagination[limit]=1000&sort=SortOrder:asc')
}

/**
 * Get a single member by Slug or documentId
 * First tries by Slug, then falls back to documentId
 */
export async function getMemberBySlugOrId(slugOrId: string) {
  // First try by Slug (most common for member URLs)
  const response = await fetchStrapi(`/members?filters[Slug][$eq]=${slugOrId}&populate=*`);
  if (response.data && response.data.length > 0) {
    return { data: response.data[0] };
  }

  // Fall back to documentId
  try {
    return await fetchStrapi(`/members/${slugOrId}?populate=*`);
  } catch (error) {
    throw new Error('Member not found');
  }
}
