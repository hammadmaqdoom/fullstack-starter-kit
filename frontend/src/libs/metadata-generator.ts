import type { Metadata } from 'next';
import { loadRuntimeConfig, getMetaNameForPlatform } from './config-loader';

const BACKEND_URL = process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:3001';

export interface ContentMetadata {
  metaTitle?: string;
  metaDescription?: string;
  metaKeywords?: string;
  ogTitle?: string;
  ogDescription?: string;
  ogImage?: string;
  ogType?: string;
  ogUrl?: string;
  ogSiteName?: string;
  twitterCard?: string;
  twitterSite?: string;
  twitterCreator?: string;
  twitterImage?: string;
  canonicalUrl?: string;
  hreflang?: Array<{ locale: string; url: string }>;
}

export async function generateContentMetadata(
  slug: string,
  locale: string,
): Promise<Metadata> {
  try {
    const [contentResponse, seoResponse, hreflangResponse] = await Promise.all([
      fetch(`${BACKEND_URL}/api/v1/contents/slug/${slug}?includeDrafts=false`).then(r => r.json()),
      fetch(`${BACKEND_URL}/api/v1/seo/metadata/${contentResponse?.id || ''}`).catch(() => null),
      fetch(`${BACKEND_URL}/api/v1/geo/hreflang/${contentResponse?.id || ''}`).catch(() => null),
    ]);

    const content = contentResponse;
    const seoMetadata: ContentMetadata = seoResponse || {};
    const hreflang = hreflangResponse || [];

    const title = seoMetadata.metaTitle || content?.title || 'Default Title';
    const description = seoMetadata.metaDescription || content?.excerpt || 'Default Description';
    const canonical = seoMetadata.canonicalUrl || `${process.env.NEXT_PUBLIC_SITE_URL || ''}/${locale}/${slug}`;

    const metadata: Metadata = {
      title,
      description,
      alternates: {
        canonical,
        languages: hreflang.reduce((acc: Record<string, string>, item: { locale: string; url: string }) => {
          acc[item.locale] = item.url;
          return acc;
        }, {}),
      },
      openGraph: {
        title: seoMetadata.ogTitle || title,
        description: seoMetadata.ogDescription || description,
        images: seoMetadata.ogImage ? [{ url: seoMetadata.ogImage }] : undefined,
        type: (seoMetadata.ogType as any) || 'website',
        url: seoMetadata.ogUrl || canonical,
        siteName: seoMetadata.ogSiteName,
      },
      twitter: {
        card: (seoMetadata.twitterCard as any) || 'summary_large_image',
        site: seoMetadata.twitterSite,
        creator: seoMetadata.twitterCreator,
        images: seoMetadata.twitterImage ? [seoMetadata.twitterImage] : undefined,
      },
      keywords: seoMetadata.metaKeywords?.split(',').map(k => k.trim()),
    };

    // Add verification meta tags
    const config = await loadRuntimeConfig();
    const other: Record<string, string> = {};
    config.verification.forEach(v => {
      if (v.verificationCode) {
        other[getMetaNameForPlatform(v.platform)] = v.verificationCode;
      }
    });
    metadata.other = other;

    return metadata;
  } catch (error) {
    console.error('Failed to generate metadata:', error);
    return {
      title: 'Default Title',
      description: 'Default Description',
    };
  }
}

