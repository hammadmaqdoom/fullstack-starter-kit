# CMS Guide

Complete guide for using the Content Management System (CMS) included in this boilerplate.

## 📋 Table of Contents

1. [Overview](#overview)
2. [Getting Started](#getting-started)
3. [Content Management](#content-management)
4. [SEO Configuration](#seo-configuration)
5. [Analytics Setup](#analytics-setup)
6. [Media Management](#media-management)
7. [Admin UI](#admin-ui)
8. [API Reference](#api-reference)

## 🎯 Overview

The CMS system provides:

- **Content Management**: Blog posts, pages, documentation, changelog
- **SEO Optimization**: Complete meta tags, JSON-LD, sitemaps, robots.txt
- **Analytics Integration**: GTM, GA4, Facebook, Pinterest, Yandex
- **Media Library**: Upload and manage media files
- **Dynamic Navigation**: Menu management
- **Geo-Targeting**: Multi-language SEO with hreflang

### Key Features

- **Database-First Configuration**: All analytics IDs and verification codes stored in database
- **Server-Side Metadata**: Metadata injected at build time for optimal SEO
- **Dynamic Generation**: Sitemaps and robots.txt generated from database
- **Multi-Platform Support**: Analytics and verification for all major platforms

## 🚀 Getting Started

### 1. Database Setup

After installing dependencies, generate and run migrations:

```bash
cd backend
pnpm install
pnpm migration:generate src/database/migrations/CreateCmsTables
pnpm migration:up
```

### 2. Environment Variables

Add to your `.env` files:

**Backend** (`.env`):
```bash
FRONTEND_URL=http://localhost:3001
SITE_NAME=Your Site Name
```

**Frontend** (`.env.local`):
```bash
NEXT_PUBLIC_BACKEND_URL=http://localhost:3000
NEXT_PUBLIC_SITE_URL=http://localhost:3001
```

**Important**: Analytics IDs and verification codes are stored in the database, not in `.env` files.

### 3. Access Admin UI

1. Sign in to your account
2. Navigate to `/admin/cms/contents`
3. Start creating content!

## 📝 Content Management

### Content Types

The CMS supports four content types:

1. **Blog** (`blog`) - Blog posts with categories and tags
2. **Page** (`page`) - Static pages (about, pricing, etc.)
3. **Docs** (`docs`) - Documentation pages with hierarchy
4. **Changelog** (`changelog`) - Product changelog entries

### Content Workflow

```
Draft → Review → Published → Archived
```

**Statuses**:
- `draft` - Work in progress
- `review` - Ready for review
- `published` - Live on site
- `archived` - Hidden but not deleted

### Creating Content

#### Via Admin UI

1. Go to `/admin/cms/contents`
2. Click "Create New"
3. Fill in:
   - Title
   - Slug (auto-generated from title)
   - Content (Markdown or HTML)
   - Type (blog, page, docs, changelog)
   - Category (optional)
   - Tags (optional)
   - Featured image (optional)
4. Click "Save" (saves as draft)
5. Click "Publish" when ready

#### Via API

```bash
POST /api/v1/contents
Authorization: Bearer <token>
Content-Type: application/json

{
  "title": "My First Blog Post",
  "slug": "my-first-blog-post",
  "content": "# Hello World\n\nThis is my first post.",
  "type": "blog",
  "status": "draft",
  "excerpt": "Short description",
  "categoryId": "uuid",
  "tagIds": ["uuid1", "uuid2"]
}
```

### Categories

Categories are hierarchical:

```
Technology
├── Web Development
│   ├── Frontend
│   └── Backend
└── Mobile Development
```

Create categories via admin UI or API.

### Tags

Tags are flat (non-hierarchical) and can be applied to any content.

## 🔍 SEO Configuration

### SEO Metadata

Each content piece can have complete SEO metadata:

- **Basic Meta**: Title, description, keywords
- **Open Graph**: Title, description, image, type, URL, site name
- **Twitter Card**: Card type, site, creator, image
- **Canonical URL**: Prevent duplicate content
- **Hreflang**: Multi-language support

### Setting SEO Metadata

#### Via Admin UI

1. Edit a content piece
2. Navigate to "SEO" tab
3. Fill in all metadata fields
4. Save

#### Via API

```bash
POST /api/v1/seo/metadata
Authorization: Bearer <token>

{
  "contentId": "uuid",
  "metaTitle": "SEO Optimized Title",
  "metaDescription": "SEO description",
  "ogTitle": "OG Title",
  "ogDescription": "OG description",
  "ogImage": "https://...",
  "canonicalUrl": "https://...",
  "hreflang": [
    { "locale": "en-US", "url": "https://..." },
    { "locale": "en-GB", "url": "https://..." }
  ]
}
```

### JSON-LD Structured Data

Structured data is automatically generated for:
- **BlogPosting** - Blog posts
- **Article** - Articles
- **WebPage** - All pages
- **BreadcrumbList** - Navigation breadcrumbs
- **Organization** - Site-wide (global)

#### Custom Schemas

Create custom JSON-LD schemas:

```bash
POST /api/v1/structured-data/schemas
Authorization: Bearer <token>

{
  "schemaData": {
    "@context": "https://schema.org",
    "@type": "Product",
    "name": "Product Name",
    "description": "Product description"
  },
  "contentId": "uuid",
  "isGlobal": false
}
```

### Sitemap

The sitemap is automatically generated from published content:

- **URL**: `/sitemap.xml` or `/api/v1/seo/sitemap.xml`
- **Includes**: All published content
- **Updates**: Automatically when content is published
- **Revalidation**: Every hour (ISR)

### Robots.txt

Robots.txt is dynamically generated:

- **URL**: `/robots.txt` or `/api/v1/seo/robots.txt`
- **Configurable**: Via redirects table
- **Includes**: Sitemap reference

## 📊 Analytics Setup

### Adding Analytics Platforms

#### Via Admin UI

1. Go to `/admin/cms/analytics`
2. Click "Add Analytics Config"
3. Select platform (GTM, GA4, Facebook, etc.)
4. Enter tracking ID
5. Set environment (production, staging, all)
6. Save

#### Via API

```bash
POST /api/v1/analytics/configs
Authorization: Bearer <token>

{
  "platform": "GTM",
  "name": "Production GTM",
  "trackingId": "GTM-XXXXXX",
  "isActive": true,
  "environment": "production",
  "priority": 0
}
```

### Supported Platforms

- **Google Tag Manager** (GTM) - Container ID
- **Google Analytics 4** (GA4) - Measurement ID
- **Facebook Pixel** - Pixel ID
- **Pinterest Tag** - Tag ID
- **Yandex Metrica** - Counter ID
- **Custom** - Any custom tracking script

### Site Verification

Add verification codes for:

- **Google Search Console**
- **Bing Webmaster Tools**
- **Yandex Webmaster**
- **Facebook Domain Verification**
- **Pinterest Site Verification**

#### Via Admin UI

1. Go to `/admin/cms/analytics`
2. Scroll to "Site Verifications"
3. Click "Add Verification"
4. Select platform
5. Enter verification code
6. Save

The verification meta tag is automatically injected into all pages.

### Custom Scripts

Inject custom HTML/JS snippets:

1. Go to `/admin/cms/analytics`
2. Click "Add Custom Script"
3. Enter script content
4. Choose injection position:
   - `head-start` - Start of `<head>`
   - `head-end` - End of `<head>`
   - `body-start` - Start of `<body>`
   - `body-end` - End of `<body>`
5. Set target pages (all or specific)
6. Set priority (loading order)
7. Save

### Feature Flags

Toggle features per environment:

- `ENABLE_ANALYTICS` - Master switch for all analytics
- `ENABLE_CUSTOM_SCRIPTS` - Enable custom script injection
- `ENABLE_GEO_TARGETING` - Enable geo-targeting features

## 🖼️ Media Management

### Uploading Media

#### Via Admin UI

1. Go to `/admin/cms/media`
2. Click "Upload Media"
3. Select file(s)
4. Add metadata (alt text, caption, title)
5. Upload

Files are automatically uploaded to S3 (if configured) or local storage.

### Media Metadata

Each media file can have:
- Alt text (for accessibility)
- Caption
- Title
- Dimensions (auto-detected for images)

### Using Media in Content

Media URLs can be used in:
- Featured images
- Content body
- SEO images (OG, Twitter)

## 🎨 Admin UI

### Navigation

The admin UI is accessible at `/admin/cms/` with the following sections:

- **Contents** (`/admin/cms/contents`) - Manage all content
- **Analytics** (`/admin/cms/analytics`) - Configure analytics and verification
- **SEO** (`/admin/cms/seo`) - SEO settings and previews
- **Media** (`/admin/cms/media`) - Media library

### Content Editor

The content editor supports:
- Rich text editing
- Markdown editing
- Live preview
- SEO metadata form
- Category/tag selection
- Featured image upload
- Publishing workflow

## 📡 API Reference

### Content Endpoints

| Method | Endpoint | Description | Auth |
|--------|----------|-------------|------|
| GET | `/api/v1/contents` | List contents | Public |
| GET | `/api/v1/contents/slug/:slug` | Get by slug | Public |
| GET | `/api/v1/contents/:id` | Get by ID | Public |
| POST | `/api/v1/contents` | Create content | Admin |
| PATCH | `/api/v1/contents/:id` | Update content | Admin |
| POST | `/api/v1/contents/:id/publish` | Publish content | Admin |
| DELETE | `/api/v1/contents/:id` | Delete content | Admin |

### Analytics Endpoints

| Method | Endpoint | Description | Auth |
|--------|----------|-------------|------|
| GET | `/api/v1/analytics/configs` | List configs | Public |
| POST | `/api/v1/analytics/configs` | Create config | Admin |
| GET | `/api/v1/analytics/verification` | Get verifications | Public |
| GET | `/api/v1/analytics/custom-scripts` | Get scripts | Public |
| GET | `/api/v1/analytics/feature-flags` | Get flags | Public |

### SEO Endpoints

| Method | Endpoint | Description | Auth |
|--------|----------|-------------|------|
| GET | `/api/v1/seo/metadata/:contentId` | Get metadata | Public |
| POST | `/api/v1/seo/metadata` | Update metadata | Admin |
| GET | `/api/v1/seo/sitemap.xml` | Generate sitemap | Public |
| GET | `/api/v1/seo/robots.txt` | Generate robots.txt | Public |

### Structured Data Endpoints

| Method | Endpoint | Description | Auth |
|--------|----------|-------------|------|
| GET | `/api/v1/structured-data/generate/:contentId` | Generate JSON-LD | Public |
| POST | `/api/v1/structured-data/schemas` | Create schema | Admin |

See [`docs/project-requirements/api-specification.md`](./project-requirements/api-specification.md) for complete API documentation.

## 🔧 Advanced Features

### Content Versioning

Every content update creates a version:
- View version history: `GET /api/v1/contents/:id/versions`
- Rollback to previous version (coming soon)

### Hreflang Tags

For multi-language sites:
1. Configure geo settings: `POST /api/v1/geo/settings`
2. Hreflang tags auto-generated: `GET /api/v1/geo/hreflang/:contentId`
3. Tags injected into page metadata

### URL Redirects

Manage 301/302 redirects:
- Create redirect: `POST /api/v1/seo/redirects`
- Redirects automatically handled by backend

### Dynamic Navigation

Create dynamic menus:
- Header menus
- Footer menus
- Sidebar menus
- Mobile menus

All menus are locale-aware and can be managed via admin UI.

## 🎯 Best Practices

### Content

1. **Use descriptive slugs**: `my-awesome-blog-post` not `post-1`
2. **Add excerpts**: Help with SEO and previews
3. **Use categories**: Organize content hierarchically
4. **Tag appropriately**: Use 3-5 relevant tags per post
5. **Optimize images**: Compress before uploading

### SEO

1. **Unique meta titles**: Keep under 60 characters
2. **Compelling descriptions**: 150-160 characters
3. **Use OG images**: 1200x630px recommended
4. **Set canonical URLs**: Prevent duplicate content
5. **Add hreflang**: For multi-language sites

### Analytics

1. **Environment-specific**: Use different IDs for staging/production
2. **Priority order**: Set loading order for multiple scripts
3. **Test verification**: Verify all platforms after adding codes
4. **Monitor performance**: Check analytics regularly

## 🐛 Troubleshooting

### Analytics Not Loading

1. Check feature flag: `ENABLE_ANALYTICS` must be enabled
2. Verify config is active: `isActive: true`
3. Check environment: Match current environment
4. Verify tracking ID format

### SEO Metadata Not Showing

1. Check if metadata exists: `GET /api/v1/seo/metadata/:contentId`
2. Verify content is published: Only published content shows metadata
3. Check build cache: Rebuild frontend if needed
4. Verify metadata generator: Check `generateMetadata()` function

### Sitemap Empty

1. Ensure content is published: `status: 'published'`
2. Check sitemap generation: `GET /api/v1/seo/sitemap.xml`
3. Verify frontend sitemap: Check `/sitemap.xml`
4. Rebuild if needed: ISR revalidates every hour

## 📚 Additional Resources

- [CMS Implementation Summary](../CMS_IMPLEMENTATION_SUMMARY.md) - Technical details
- [API Specification](./project-requirements/api-specification.md) - Complete API docs
- [Database Design](./project-requirements/database-design.md) - Database schema
- [System Architecture](./project-requirements/system-architecture.md) - Architecture details

