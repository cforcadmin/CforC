import type { MetadataRoute } from 'next'
import { getProjects, getProjectBySlug, getActivities, getMembers } from '@/lib/strapi'
import type { Project, ProjectEntry, Activity } from '@/lib/types'

const BASE_URL = 'https://cultureforchange.net'

/**
 * ΧΤΙΖΕΤΑΙ ΜΙΑ ΦΟΡΑ ΤΗΝ ΗΜΕΡΑ — ΟΧΙ ΣΕ ΚΑΘΕ ΕΠΙΣΚΕΨΗ ΑΡΑΧΝΗΣ.
 *
 * ΤΟ ΕΥΡΗΜΑ (17/10/2026, από τα logs του Strapi): ο χάρτης ζητούσε έργα +
 * κάθε έργο ξεχωριστά + δράσεις + ολόκληρο το μητρώο = επτά κλήσεις, ΚΑΘΕ
 * φορά που κάποιος κατέβαζε το /sitemap.xml. Οι αράχνες το κατεβάζουν
 * συνέχεια: 29 φορές μέσα σε μία νύχτα, ~200 κλήσεις, με μηδέν ανθρώπους
 * στον ιστότοπο. Ήταν το μεγαλύτερο μοτίβο ολόκληρης της ημέρας.
 *
 * Ένας χάρτης ιστότοπου ΔΕΝ χρειάζεται να είναι φρεσκότερος από μια μέρα:
 * οι μηχανές αναζήτησης τον ξαναδιαβάζουν ούτως ή άλλως σε δικό τους ρυθμό,
 * και μια δράση που ανακοινώθηκε πριν από μία ώρα δεν ευρετηριάζεται
 * γρηγορότερα επειδή εμφανίστηκε νωρίτερα εδώ.
 */
export const revalidate = 86400

/**
 * ΤΟ ΙΔΙΟ ΠΑΡΑΘΥΡΟ ΠΕΡΝΑΕΙ ΚΑΙ ΣΤΑ FETCH ΑΠΟ ΜΕΣΑ.
 *
 * Το revalidate μιας διαδρομής στο Next γίνεται το ΕΛΑΧΙΣΤΟ ανάμεσα στη δική
 * της τιμή και σε κάθε fetch που κάνει. Χωρίς αυτό, το 86400 από πάνω
 * ακυρωνόταν από τα 300 δευτερόλεπτα που ορίζει το lib/strapi για όλες τις
 * αναγνώσεις — και ο χάρτης συνέχιζε να ξαναχτίζεται κάθε πέντε λεπτά.
 */
const DAY = 86400

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const staticPages: MetadataRoute.Sitemap = [
    { url: BASE_URL, lastModified: new Date(), changeFrequency: 'weekly', priority: 1 },
    { url: `${BASE_URL}/about`, changeFrequency: 'monthly', priority: 0.8 },
    { url: `${BASE_URL}/news`, changeFrequency: 'weekly', priority: 0.8 },
    { url: `${BASE_URL}/members`, changeFrequency: 'weekly', priority: 0.7 },
    { url: `${BASE_URL}/map`, changeFrequency: 'weekly', priority: 0.7 },
    { url: `${BASE_URL}/participation`, changeFrequency: 'monthly', priority: 0.6 },
    { url: `${BASE_URL}/privacy`, changeFrequency: 'yearly', priority: 0.3 },
    { url: `${BASE_URL}/terms`, changeFrequency: 'yearly', priority: 0.3 },
    { url: `${BASE_URL}/transparency`, changeFrequency: 'yearly', priority: 0.3 },
    { url: `${BASE_URL}/projects`, changeFrequency: 'weekly', priority: 0.8 },
  ]

  const dynamicPages: MetadataRoute.Sitemap = []

  try {
    const projectsResponse = await getProjects(DAY)
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
        const fullProjectResponse = await getProjectBySlug(project.slug, DAY)
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
    // Skip projects if fetch fails
  }

  // Add activity detail pages
  try {
    const activitiesResponse = await getActivities(DAY)
    const activities: Activity[] = activitiesResponse.data || []
    for (const activity of activities) {
      const slug = activity.Slug || activity.documentId || activity.id
      dynamicPages.push({
        url: `${BASE_URL}/news/${encodeURIComponent(String(slug))}`,
        lastModified: new Date(activity.updatedAt),
        changeFrequency: 'monthly',
        priority: 0.6,
      })
    }
  } catch {
    // Skip activities if fetch fails
  }

  // Add member profile pages.
  // Re-crawl push: profiles whose <title> was synthesized by Google before the
  // SEO fix landed (commit f62f69d, 2026-03-06) still show a doubled name in
  // SERPs (e.g. "βιβιαν δουμπα - Βιβιάν Δούμπα - Culture for Change"). The
  // page HTML is already correct, but Google won't re-crawl a URL whose
  // sitemap lastmod hasn't moved. For 2 weeks we bump lastModified to "now"
  // for any member with updatedAt < SEO_FIX_DATE so Google sees a recent
  // change and re-indexes them. Self-expires on RECRAWL_UNTIL — no follow-up
  // commit needed.
  const SEO_FIX_DATE = new Date('2026-03-06')
  const RECRAWL_UNTIL = new Date('2026-07-03')
  const now = new Date()
  try {
    const membersResponse = await getMembers(DAY)
    const members = membersResponse.data || []
    for (const member of members) {
      if (member.HideProfile) continue
      const slug = member.Slug || member.documentId || member.id
      const memberUpdated = new Date(member.updatedAt)
      const needsRecrawlPush = now < RECRAWL_UNTIL && memberUpdated < SEO_FIX_DATE
      dynamicPages.push({
        url: `${BASE_URL}/members/${encodeURIComponent(String(slug))}`,
        lastModified: needsRecrawlPush ? now : memberUpdated,
        changeFrequency: 'monthly',
        priority: 0.5,
      })
    }
  } catch {
    // Skip members if fetch fails
  }

  return [...staticPages, ...dynamicPages]
}
