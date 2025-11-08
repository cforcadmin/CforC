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
  return fetchStrapi('/activities?populate=Visuals');
}

/**
 * Get a single activity by ID
 */
export async function getActivityById(id: string | number) {
  return fetchStrapi(`/activities/${id}?populate=*`);
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
