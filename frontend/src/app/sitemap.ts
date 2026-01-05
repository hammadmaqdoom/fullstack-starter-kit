import { MetadataRoute } from 'next';

const BACKEND_URL = process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:3001';

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  try {
    const response = await fetch(`${BACKEND_URL}/api/v1/seo/sitemap.xml`, {
      next: { revalidate: 3600 }, // Revalidate every hour
    });

    if (!response.ok) {
      return [];
    }

    const xml = await response.text();
    
    // Parse XML to extract URLs (simplified - in production, use proper XML parser)
    const urlMatches = xml.matchAll(/<loc>(.*?)<\/loc>/g);
    const urls: MetadataRoute.Sitemap = [];

    for (const match of urlMatches) {
      const url = match[1];
      const lastmodMatch = xml.match(new RegExp(`<url>([\\s\\S]*?)<loc>${url.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}<\/loc>([\\s\\S]*?)<\/url>`));
      const lastmod = lastmodMatch?.[0].match(/<lastmod>(.*?)<\/lastmod>/)?.[1];

      urls.push({
        url,
        lastModified: lastmod ? new Date(lastmod) : new Date(),
        changeFrequency: 'weekly',
        priority: 0.8,
      });
    }

    return urls;
  } catch (error) {
    console.error('Failed to generate sitemap:', error);
    return [];
  }
}
