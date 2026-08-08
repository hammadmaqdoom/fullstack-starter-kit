import type { MetadataRoute } from 'next';

/** Internal HR app — block indexing. */
export default function robots(): MetadataRoute.Robots {
  return {
    rules: {
      userAgent: '*',
      disallow: '/',
    },
  };
}
