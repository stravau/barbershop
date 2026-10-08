import type { MetadataRoute } from "next"
import { getSiteUrl } from "@/lib/site"

/** The public pages worth indexing (/sitemap.xml). */
export default function sitemap(): MetadataRoute.Sitemap {
  const site = getSiteUrl()
  return [
    { url: `${site}/`, changeFrequency: "weekly", priority: 1 },
    { url: `${site}/servicos`, changeFrequency: "monthly", priority: 0.8 },
    { url: `${site}/marcar`, changeFrequency: "daily", priority: 0.9 },
  ]
}
