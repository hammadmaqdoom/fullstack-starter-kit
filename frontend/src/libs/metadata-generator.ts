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

interface ContentSlugResponse {
  id?: string;
  title?: string;
  excerpt?: string;
}

async function fetchJson<T>(url: string): Promise<T | null> {
  try {
    const response = await fetch(url);
    if (!response.ok) {
      return null;
    }
    return (await response.json()) as T;
  } catch {
    return null;
  }
}

export async function generateContentMetadata(
  slug: string,
  locale: string,
): Promise<Metadata> {
  try {
    const content = await fetchJson<ContentSlugResponse>(
      `${BACKEND_URL}/api/v1/contents/slug/${slug}?includeDrafts=false`,
    );

    if (!content?.id) {
      return {
        title: 'Default Title',
        description: 'Default Description',
      };
    }

    const [seoMetadata, hreflang] = await Promise.all([
      fetchJson<ContentMetadata>(`${BACKEND_URL}/api/v1/seo/metadata/${content.id}`),
      fetchJson<Array<{ locale: string; url: string }>>(
        `${BACKEND_URL}/api/v1/geo/hreflang/${content.id}`,
      ),
    ]);

    const seo = seoMetadata ?? {};
    const hreflangEntries = hreflang ?? [];

    const title = seo.metaTitle || content.title || 'Default Title';
    const description = seo.metaDescription || content.excerpt || 'Default Description';
    const canonical = seo.canonicalUrl || `${process.env.NEXT_PUBLIC_SITE_URL || ''}/${locale}/${slug}`;

    const metadata: Metadata = {
      title,
      description,
      alternates: {
        canonical,
        languages: hreflangEntries.reduce((acc: Record<string, string>, item) => {
          acc[item.locale] = item.url;
          return acc;
        }, {}),
      },
      openGraph: {
        title: seo.ogTitle || title,
        description: seo.ogDescription || description,
        images: seo.ogImage ? [{ url: seo.ogImage }] : undefined,
        type: (seo.ogType as 'website') || 'website',
        url: seo.ogUrl || canonical,
        siteName: seo.ogSiteName,
      },
      twitter: {
        card: (seo.twitterCard as 'summary_large_image') || 'summary_large_image',
        site: seo.twitterSite,
        creator: seo.twitterCreator,
        images: seo.twitterImage ? [seo.twitterImage] : undefined,
      },
      keywords: seo.metaKeywords?.split(',').map(k => k.trim()),
    };

    const config = await loadRuntimeConfig();
    const other: Record<string, string> = {};
    config.verification.forEach((v) => {
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
