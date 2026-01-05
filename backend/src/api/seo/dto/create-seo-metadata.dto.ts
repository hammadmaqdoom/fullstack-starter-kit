export class CreateSeoMetadataDto {
  contentId?: string;
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
  hreflang?: Array<{
    locale: string;
    url: string;
  }>;
  customMeta?: Array<{
    name: string;
    content: string;
  }>;
}

