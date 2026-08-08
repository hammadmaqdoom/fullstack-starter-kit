import type { MetadataRoute } from 'next';

/**
 * Internal app — no public marketing URLs to index.
 * Auth and operational token routes stay out of the sitemap.
 */
export default function sitemap(): MetadataRoute.Sitemap {
  return [];
}
