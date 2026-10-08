import type { MetadataRoute } from "next"
import { getSiteUrl } from "@/lib/site"

/** /robots.txt — keep crawlers out of the admin, accounts, private booking pages and the API. */
export default function robots(): MetadataRoute.Robots {
  return {
    rules: { userAgent: "*", allow: "/", disallow: ["/admin", "/conta", "/marcacao", "/api"] },
    sitemap: `${getSiteUrl()}/sitemap.xml`,
  }
}
