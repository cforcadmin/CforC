import type { MetadataRoute } from 'next'
import { getProjects, getProjectBySlug } from '@/lib/strapi'
import type { Project, ProjectEntry } from '@/lib/types'

const BASE_URL = 'https://cultureforchange.net'

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const staticPages: MetadataRoute.Sitemap = [
    { url: BASE_URL, lastModified: new Date(), changeFrequency: 'weekly', priority: 1 },
    { url: `${BASE_URL}/about`, changeFrequency: 'monthly', priority: 0.8 },
    { url: `${BASE_URL}/activities`, changeFrequency: 'weekly', priority: 0.8 },
    { url: `${BASE_URL}/members`, changeFrequency: 'weekly', priority: 0.7 },
    { url: `${BASE_URL}/open-calls`, changeFrequency: 'weekly', priority: 0.7 },
    { url: `${BASE_URL}/participation`, changeFrequency: 'monthly', priority: 0.6 },
    { url: `${BASE_URL}/privacy`, changeFrequency: 'yearly', priority: 0.3 },
    { url: `${BASE_URL}/terms`, changeFrequency: 'yearly', priority: 0.3 },
    { url: `${BASE_URL}/transparency`, changeFrequency: 'yearly', priority: 0.3 },
    { url: `${BASE_URL}/projects`, changeFrequency: 'weekly', priority: 0.8 },
  ]

  const dynamicPages: MetadataRoute.Sitemap = []

  try {
    const projectsResponse = await getProjects()
    const projects: Project[] = projectsResponse.data || []

    for (const project of projects) {
      dynamicPages.push({
        url: `${BASE_URL}/projects/${project.slug}`,
        lastModified: new Date(project.updatedAt),
        changeFrequency: 'weekly',
        priority: 0.7,
      })

      // Fetch full project with entries to get public ones
      try {
        const fullProjectResponse = await getProjectBySlug(project.slug)
        const fullProject = fullProjectResponse.data?.[0]
        if (fullProject?.project_entries) {
          const publicEntries = fullProject.project_entries.filter(
            (entry: ProjectEntry) => entry.visibility === 'public'
          )
          for (const entry of publicEntries) {
            dynamicPages.push({
              url: `${BASE_URL}/projects/${project.slug}/entries/${entry.slug}`,
              lastModified: new Date(entry.updatedAt),
              changeFrequency: 'monthly',
              priority: 0.5,
            })
          }
        }
      } catch {
        // Skip entries if fetch fails for this project
      }
    }
  } catch {
    // Return static pages only if project fetch fails
  }

  return [...staticPages, ...dynamicPages]
}
