# SEO Configuration Guide

Complete guide for configuring SEO features in the CMS system.

## 📋 Overview

The CMS includes comprehensive SEO features:

- ✅ Complete meta tags (title, description, keywords)
- ✅ Open Graph tags (Facebook, LinkedIn)
- ✅ Twitter Card tags
- ✅ JSON-LD structured data (23+ schema types)
- ✅ Dynamic sitemap.xml generation
- ✅ Dynamic robots.txt generation
- ✅ Hreflang tags for multi-language
- ✅ Canonical URLs
- ✅ URL redirects (301/302)

## 🎯 Quick Start

### 1. Configure Site-Wide SEO

Set up global SEO settings:

```bash
POST /api/v1/seo/metadata
Authorization: Bearer <token>

{
  "metaTitle": "Your Site Name - Tagline",
  "metaDescription": "Your site description",
  "ogSiteName": "Your Site Name"
}
```

### 2. Add Verification Codes

Add verification codes for search engines:

1. Go to `/admin/cms/analytics`
2. Navigate to "Site Verifications"
3. Add verification codes for:
   - Google Search Console
   - Bing Webmaster Tools
   - Yandex Webmaster
   - Facebook Domain Verification
   - Pinterest Site Verification

### 3. Configure Per-Content SEO

For each content piece:

1. Edit content
2. Navigate to "SEO" tab
3. Fill in:
   - Meta title (50-60 characters)
   - Meta description (150-160 characters)
   - Open Graph image (1200x630px)
   - Canonical URL
4. Save

## 📝 Meta Tags

### Basic Meta Tags

Every page should have:

```html
<meta name="title" content="Page Title" />
<meta name="description" content="Page description" />
<meta name="keywords" content="keyword1, keyword2" />
```

**Best Practices**:
- Title: 50-60 characters, include brand name
- Description: 150-160 characters, compelling and descriptive
- Keywords: 5-10 relevant keywords

### Open Graph Tags

For social media sharing (Facebook, LinkedIn):

```html
<meta property="og:title" content="Page Title" />
<meta property="og:description" content="Page description" />
<meta property="og:image" content="https://.../image.jpg" />
<meta property="og:type" content="website" />
<meta property="og:url" content="https://.../page" />
<meta property="og:site_name" content="Site Name" />
```

**Image Requirements**:
- Size: 1200x630px (recommended)
- Format: JPG or PNG
- File size: Under 1MB

### Twitter Card Tags

For Twitter sharing:

```html
<meta name="twitter:card" content="summary_large_image" />
<meta name="twitter:site" content="@yourhandle" />
<meta name="twitter:creator" content="@authorhandle" />
<meta name="twitter:title" content="Page Title" />
<meta name="twitter:description" content="Page description" />
<meta name="twitter:image" content="https://.../image.jpg" />
```

**Card Types**:
- `summary` - Small card
- `summary_large_image` - Large image card (recommended)
- `app` - App card
- `player` - Video card

## 🏗️ JSON-LD Structured Data

### Auto-Generated Schemas

The system automatically generates:

1. **Organization** (global)
   - Company/brand information
   - Social media profiles
   - Contact information

2. **WebSite** (global)
   - Site-wide schema
   - Search action

3. **WebPage** (every page)
   - Page name and description
   - URL

4. **BlogPosting** (blog posts)
   - Headline, date published
   - Author information
   - Featured image

5. **BreadcrumbList** (when category exists)
   - Navigation breadcrumbs
   - Hierarchical structure

### Custom Schemas

Create custom schemas for specific content:

#### Product Schema

```json
{
  "@context": "https://schema.org",
  "@type": "Product",
  "name": "Product Name",
  "description": "Product description",
  "image": "https://.../product.jpg",
  "brand": {
    "@type": "Brand",
    "name": "Brand Name"
  },
  "offers": {
    "@type": "Offer",
    "price": "99.99",
    "priceCurrency": "USD"
  }
}
```

#### FAQ Schema

```json
{
  "@context": "https://schema.org",
  "@type": "FAQPage",
  "mainEntity": [
    {
      "@type": "Question",
      "name": "What is this?",
      "acceptedAnswer": {
        "@type": "Answer",
        "text": "This is..."
      }
    }
  ]
}
```

#### LocalBusiness Schema

```json
{
  "@context": "https://schema.org",
  "@type": "LocalBusiness",
  "name": "Business Name",
  "address": {
    "@type": "PostalAddress",
    "streetAddress": "123 Main St",
    "addressLocality": "City",
    "addressRegion": "State",
    "postalCode": "12345",
    "addressCountry": "US"
  },
  "telephone": "+1-555-123-4567"
}
```

### Supported Schema Types

The system supports 23+ schema types:

**Content**:
- Article, BlogPosting, NewsArticle, TechArticle
- FAQPage, HowTo

**Business**:
- Organization, LocalBusiness
- Product, Service
- Review, Rating, Offer

**Rich Content**:
- Event, Course, Recipe
- VideoObject, ImageObject
- Person, JobPosting

## 🗺️ Sitemap

### Automatic Generation

The sitemap is automatically generated from:
- All published content
- Static pages
- Blog posts
- Documentation pages

**URL**: `/sitemap.xml` or `/api/v1/seo/sitemap.xml`

### Sitemap Structure

```xml
<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
  <url>
    <loc>https://example.com/blog/post-1</loc>
    <lastmod>2026-01-05T10:00:00Z</lastmod>
    <changefreq>weekly</changefreq>
    <priority>0.8</priority>
  </url>
</urlset>
```

### Submitting to Search Engines

1. **Google Search Console**:
   - Add property
   - Submit sitemap: `https://yoursite.com/sitemap.xml`

2. **Bing Webmaster Tools**:
   - Add site
   - Submit sitemap: `https://yoursite.com/sitemap.xml`

3. **Yandex Webmaster**:
   - Add site
   - Submit sitemap: `https://yoursite.com/sitemap.xml`

## 🤖 Robots.txt

### Automatic Generation

Robots.txt is dynamically generated:

**URL**: `/robots.txt` or `/api/v1/seo/robots.txt`

### Default Configuration

```
User-agent: *
Allow: /

Sitemap: https://yoursite.com/sitemap.xml
```

### Customizing Robots.txt

Configure via redirects or update the SEO service to customize rules.

## 🌍 Hreflang Tags

### Multi-Language SEO

For sites with multiple languages:

1. Configure geo settings:
```bash
POST /api/v1/geo/settings

{
  "countryCode": "US",
  "languageCode": "en",
  "hreflangConfig": {
    "enabled": true,
    "defaultLocale": "en-US",
    "alternateLocales": ["en-GB", "es-ES"]
  }
}
```

2. Hreflang tags auto-generated:
```html
<link rel="alternate" hreflang="en-US" href="https://.../en-us/page" />
<link rel="alternate" hreflang="en-GB" href="https://.../en-gb/page" />
<link rel="alternate" hreflang="x-default" href="https://.../en/page" />
```

### Best Practices

- Always include `x-default` for default language
- Use correct locale format: `language-REGION` (e.g., `en-US`)
- Ensure all alternate URLs are accessible
- Keep hreflang tags consistent across pages

## 🔗 Canonical URLs

### Preventing Duplicate Content

Set canonical URLs for each content piece:

```json
{
  "canonicalUrl": "https://yoursite.com/blog/post-slug"
}
```

**When to Use**:
- Multiple URLs for same content
- Paginated content
- URL parameters (e.g., `?utm_source=...`)
- HTTP vs HTTPS
- www vs non-www

## 🔄 URL Redirects

### Managing Redirects

Create 301 (permanent) or 302 (temporary) redirects:

```bash
POST /api/v1/seo/redirects
Authorization: Bearer <token>

{
  "fromPath": "/old-url",
  "toPath": "/new-url",
  "type": 301
}
```

**Best Practices**:
- Use 301 for permanent moves
- Use 302 for temporary redirects
- Keep redirect chains short (max 2-3 hops)
- Update internal links to new URLs

## ✅ SEO Checklist

### Site-Wide

- [ ] Site name and tagline configured
- [ ] Default meta description set
- [ ] Organization schema configured
- [ ] WebSite schema configured
- [ ] Sitemap submitted to search engines
- [ ] Robots.txt configured
- [ ] Verification codes added (Google, Bing, Yandex)

### Per-Content

- [ ] Unique meta title (50-60 chars)
- [ ] Compelling meta description (150-160 chars)
- [ ] Open Graph image (1200x630px)
- [ ] Twitter Card configured
- [ ] Canonical URL set
- [ ] JSON-LD schema generated
- [ ] Hreflang tags (if multi-language)

### Technical

- [ ] All pages have unique titles
- [ ] All pages have descriptions
- [ ] Images have alt text
- [ ] URLs are SEO-friendly (slugs)
- [ ] Internal linking structure
- [ ] Mobile-friendly (responsive)
- [ ] Fast page load times
- [ ] HTTPS enabled

## 🧪 Testing SEO

### Google Rich Results Test

Test structured data:
1. Go to [Google Rich Results Test](https://search.google.com/test/rich-results)
2. Enter page URL
3. Verify all schemas are detected

### Facebook Sharing Debugger

Test Open Graph tags:
1. Go to [Facebook Sharing Debugger](https://developers.facebook.com/tools/debug/)
2. Enter page URL
3. Verify OG tags are correct

### Twitter Card Validator

Test Twitter Cards:
1. Go to [Twitter Card Validator](https://cards-dev.twitter.com/validator)
2. Enter page URL
3. Verify card preview

### Google Search Console

Monitor SEO performance:
1. Add property in Google Search Console
2. Submit sitemap
3. Monitor indexing status
4. Check for errors
5. Review search performance

## 📊 SEO Monitoring

### Key Metrics

Track these metrics:
- **Organic traffic** - Visitors from search engines
- **Keyword rankings** - Position in search results
- **Click-through rate** - CTR from search results
- **Bounce rate** - Single-page sessions
- **Average session duration** - Time on site
- **Pages per session** - Engagement metric

### Tools

- **Google Search Console** - Search performance
- **Google Analytics** - Traffic analysis
- **Bing Webmaster Tools** - Bing performance
- **Yandex Webmaster** - Yandex performance

## 🎯 Best Practices Summary

1. **Unique Content**: Every page should have unique title and description
2. **Keyword Research**: Use relevant keywords naturally
3. **Image Optimization**: Compress images, add alt text
4. **Internal Linking**: Link related content
5. **Mobile-First**: Ensure mobile-friendly design
6. **Page Speed**: Optimize for fast load times
7. **Regular Updates**: Keep content fresh and updated
8. **Monitor Performance**: Track SEO metrics regularly

## 📚 Additional Resources

- [CMS Guide](./CMS-GUIDE.md) - Complete CMS documentation
- [Google Search Central](https://developers.google.com/search) - Official SEO guide
- [Schema.org](https://schema.org) - Structured data reference
- [Open Graph Protocol](https://ogp.me/) - OG tags specification

