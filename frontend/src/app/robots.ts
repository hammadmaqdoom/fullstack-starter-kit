import type { MetadataRoute } from 'next';
import { getBaseUrl } from '@/utils/Helpers';

const BACKEND_URL = process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:3001';

export default async function robots(): Promise<MetadataRoute.Robots> {
  try {
    const response = await fetch(`${BACKEND_URL}/api/v1/seo/robots.txt`, {
      next: { revalidate: 3600 }, // Revalidate every hour
    });

    if (response.ok) {
      const robotsTxt = await response.text();
      
      // Parse robots.txt (simplified)
      const rules: MetadataRoute.Robots['rules'] = [];
      const sitemaps: string[] = [];
      
      let currentUserAgent = '*';
      const allow: string[] = [];
      const disallow: string[] = [];

      robotsTxt.split('\n').forEach(line => {
        const trimmed = line.trim();
        if (trimmed.startsWith('User-agent:')) {
          if (currentUserAgent && (allow.length > 0 || disallow.length > 0)) {
            rules.push({
              userAgent: currentUserAgent,
              allow: allow.length > 0 ? allow : undefined,
              disallow: disallow.length > 0 ? disallow : undefined,
            });
            allow.length = 0;
            disallow.length = 0;
          }
          currentUserAgent = trimmed.replace('User-agent:', '').trim();
        } else if (trimmed.startsWith('Allow:')) {
          allow.push(trimmed.replace('Allow:', '').trim());
        } else if (trimmed.startsWith('Disallow:')) {
          disallow.push(trimmed.replace('Disallow:', '').trim());
        } else if (trimmed.startsWith('Sitemap:')) {
          sitemaps.push(trimmed.replace('Sitemap:', '').trim());
        }
      });

      // Add final rule
      if (currentUserAgent && (allow.length > 0 || disallow.length > 0)) {
        rules.push({
          userAgent: currentUserAgent,
          allow: allow.length > 0 ? allow : undefined,
          disallow: disallow.length > 0 ? disallow : undefined,
        });
      }

      return {
        rules: rules.length > 0 ? rules : [{ userAgent: '*', allow: '/' }],
        sitemap: sitemaps.length > 0 ? sitemaps[0] : `${getBaseUrl()}/sitemap.xml`,
      };
    }
  } catch (error) {
    console.error('Failed to load robots.txt:', error);
  }

  // Fallback
  return {
    rules: {
      userAgent: '*',
      allow: '/',
      disallow: '/dashboard',
    },
    sitemap: `${getBaseUrl()}/sitemap.xml`,
  };
}
