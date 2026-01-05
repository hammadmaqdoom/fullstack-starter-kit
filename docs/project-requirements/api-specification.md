# API Specification

> **INSTRUCTIONS**: This document defines all API endpoints, request/response formats, authentication, and error handling. Skip this file if your project doesn't have an API.

---

## 1. API Overview

### 1.1 Base Information

**Base URL**: 
- Development: `http://localhost:3000/api`
- Production: `https://api.yourapp.com`

**API Version**: `v1`

**Protocol**: REST over HTTPS

**Data Format**: JSON

**Character Encoding**: UTF-8

### 1.2 API Design Principles

- RESTful architecture
- Resource-based URLs
- HTTP methods for CRUD operations (GET, POST, PUT, PATCH, DELETE)
- Consistent response formats
- Proper HTTP status codes
- Versioning via URL path (`/api/v1/`)

---

## 2. Authentication

### 2.1 Authentication Methods

Select the methods your API supports:

- [x] **Bearer Token** (JWT)
- [ ] **API Key**
- [ ] **OAuth 2.0**
- [ ] **Basic Auth**
- [ ] **Session Cookies**

### 2.2 Bearer Token (JWT)

**How it works**:
1. User logs in with credentials
2. Server returns JWT access token
3. Client includes token in `Authorization` header
4. Server validates token on each request

**Token Format**:
```
Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

**Token Expiration**:
- Access Token: 15 minutes
- Refresh Token: 7 days

**Token Refresh**:
```http
POST /api/v1/auth/refresh
Content-Type: application/json

{
  "refreshToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
}
```

---

## 3. Common Request/Response Patterns

### 3.1 Request Headers

**Required Headers**:
```http
Content-Type: application/json
Authorization: Bearer {token}
```

**Optional Headers**:
```http
Accept-Language: en-US
X-Request-ID: unique-request-id
```

### 3.2 Success Response Format

```json
{
  "success": true,
  "data": {
    // Response data here
  },
  "meta": {
    "timestamp": "2026-01-05T10:30:00Z",
    "requestId": "req_abc123"
  }
}
```

### 3.3 Error Response Format

```json
{
  "success": false,
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "Invalid input data",
    "details": [
      {
        "field": "email",
        "message": "Email is required"
      }
    ]
  },
  "meta": {
    "timestamp": "2026-01-05T10:30:00Z",
    "requestId": "req_abc123"
  }
}
```

### 3.4 Pagination

**Request**:
```http
GET /api/v1/posts?page=2&limit=20
```

**Response**:
```json
{
  "success": true,
  "data": [
    // Array of items
  ],
  "pagination": {
    "page": 2,
    "limit": 20,
    "total": 150,
    "totalPages": 8,
    "hasNext": true,
    "hasPrev": true
  }
}
```

### 3.5 Filtering & Sorting

**Filtering**:
```http
GET /api/v1/posts?status=published&author=user123
```

**Sorting**:
```http
GET /api/v1/posts?sortBy=createdAt&order=desc
```

**Combined**:
```http
GET /api/v1/posts?status=published&sortBy=publishedAt&order=desc&page=1&limit=20
```

---

## 4. API Endpoints

### 4.1 Authentication Endpoints

#### POST /api/v1/auth/register

**Description**: Register a new user account

**Authentication**: None (public)

**Request Body**:
```json
{
  "email": "user@example.com",
  "password": "SecurePass123!",
  "fullName": "John Doe"
}
```

**Validation Rules**:
- `email`: Required, valid email format, unique
- `password`: Required, min 8 characters, must include uppercase, lowercase, number
- `fullName`: Required, 2-100 characters

**Success Response** (201 Created):
```json
{
  "success": true,
  "data": {
    "user": {
      "id": "uuid-here",
      "email": "user@example.com",
      "fullName": "John Doe",
      "emailVerified": false,
      "createdAt": "2026-01-05T10:30:00Z"
    },
    "message": "Registration successful. Please check your email to verify your account."
  }
}
```

**Error Responses**:

400 Bad Request - Validation Error:
```json
{
  "success": false,
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "Invalid input data",
    "details": [
      {
        "field": "email",
        "message": "Email is already registered"
      }
    ]
  }
}
```

---

#### POST /api/v1/auth/login

**Description**: Log in with email and password

**Authentication**: None (public)

**Request Body**:
```json
{
  "email": "user@example.com",
  "password": "SecurePass123!"
}
```

**Success Response** (200 OK):
```json
{
  "success": true,
  "data": {
    "user": {
      "id": "uuid-here",
      "email": "user@example.com",
      "fullName": "John Doe",
      "emailVerified": true
    },
    "tokens": {
      "accessToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
      "refreshToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
      "expiresIn": 900
    }
  }
}
```

**Error Responses**:

401 Unauthorized - Invalid Credentials:
```json
{
  "success": false,
  "error": {
    "code": "INVALID_CREDENTIALS",
    "message": "Invalid email or password"
  }
}
```

403 Forbidden - Email Not Verified:
```json
{
  "success": false,
  "error": {
    "code": "EMAIL_NOT_VERIFIED",
    "message": "Please verify your email before logging in"
  }
}
```

---

#### POST /api/v1/auth/logout

**Description**: Log out current user

**Authentication**: Required (Bearer Token)

**Request Body**: None

**Success Response** (200 OK):
```json
{
  "success": true,
  "data": {
    "message": "Logged out successfully"
  }
}
```

---

#### POST /api/v1/auth/refresh

**Description**: Refresh access token using refresh token

**Authentication**: None (uses refresh token in body)

**Request Body**:
```json
{
  "refreshToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
}
```

**Success Response** (200 OK):
```json
{
  "success": true,
  "data": {
    "accessToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
    "expiresIn": 900
  }
}
```

---

### 4.2 User Endpoints

#### GET /api/v1/users/me

**Description**: Get current user profile

**Authentication**: Required (Bearer Token)

**Request Parameters**: None

**Success Response** (200 OK):
```json
{
  "success": true,
  "data": {
    "user": {
      "id": "uuid-here",
      "email": "user@example.com",
      "fullName": "John Doe",
      "emailVerified": true,
      "createdAt": "2026-01-01T10:00:00Z",
      "updatedAt": "2026-01-05T10:30:00Z"
    }
  }
}
```

---

#### PATCH /api/v1/users/me

**Description**: Update current user profile

**Authentication**: Required (Bearer Token)

**Request Body**:
```json
{
  "fullName": "John Smith"
}
```

**Success Response** (200 OK):
```json
{
  "success": true,
  "data": {
    "user": {
      "id": "uuid-here",
      "email": "user@example.com",
      "fullName": "John Smith",
      "updatedAt": "2026-01-05T10:35:00Z"
    }
  }
}
```

---

#### DELETE /api/v1/users/me

**Description**: Delete current user account

**Authentication**: Required (Bearer Token)

**Request Body**:
```json
{
  "password": "SecurePass123!",
  "confirmation": "DELETE"
}
```

**Success Response** (200 OK):
```json
{
  "success": true,
  "data": {
    "message": "Account deleted successfully"
  }
}
```

---

### 4.3 Posts Endpoints

#### GET /api/v1/posts

**Description**: Get list of published posts

**Authentication**: Optional (public posts, auth for drafts)

**Query Parameters**:
- `page` (integer, default: 1)
- `limit` (integer, default: 20, max: 100)
- `status` (string: draft|published|archived, default: published)
- `authorId` (UUID, optional)
- `sortBy` (string: createdAt|publishedAt|title, default: publishedAt)
- `order` (string: asc|desc, default: desc)

**Example Request**:
```http
GET /api/v1/posts?page=1&limit=20&status=published&sortBy=publishedAt&order=desc
```

**Success Response** (200 OK):
```json
{
  "success": true,
  "data": [
    {
      "id": "uuid-here",
      "title": "My First Post",
      "content": "This is the content...",
      "status": "published",
      "publishedAt": "2026-01-01T10:00:00Z",
      "author": {
        "id": "uuid-here",
        "fullName": "John Doe"
      },
      "commentCount": 5,
      "createdAt": "2026-01-01T09:00:00Z",
      "updatedAt": "2026-01-01T10:00:00Z"
    }
  ],
  "pagination": {
    "page": 1,
    "limit": 20,
    "total": 45,
    "totalPages": 3,
    "hasNext": true,
    "hasPrev": false
  }
}
```

---

#### GET /api/v1/posts/:id

**Description**: Get single post by ID

**Authentication**: Optional (public for published, required for drafts)

**Path Parameters**:
- `id` (UUID, required)

**Success Response** (200 OK):
```json
{
  "success": true,
  "data": {
    "post": {
      "id": "uuid-here",
      "title": "My First Post",
      "content": "This is the full content...",
      "status": "published",
      "publishedAt": "2026-01-01T10:00:00Z",
      "author": {
        "id": "uuid-here",
        "fullName": "John Doe",
        "email": "john@example.com"
      },
      "tags": [
        { "id": "uuid-1", "name": "JavaScript" },
        { "id": "uuid-2", "name": "Node.js" }
      ],
      "commentCount": 5,
      "createdAt": "2026-01-01T09:00:00Z",
      "updatedAt": "2026-01-01T10:00:00Z"
    }
  }
}
```

**Error Responses**:

404 Not Found:
```json
{
  "success": false,
  "error": {
    "code": "POST_NOT_FOUND",
    "message": "Post not found"
  }
}
```

---

#### POST /api/v1/posts

**Description**: Create a new post

**Authentication**: Required (Bearer Token)

**Request Body**:
```json
{
  "title": "My New Post",
  "content": "This is the content...",
  "status": "draft",
  "tagIds": ["uuid-1", "uuid-2"]
}
```

**Validation Rules**:
- `title`: Required, 5-200 characters
- `content`: Required, min 1 character
- `status`: Optional, one of: draft|published, default: draft
- `tagIds`: Optional, array of valid tag UUIDs

**Success Response** (201 Created):
```json
{
  "success": true,
  "data": {
    "post": {
      "id": "uuid-here",
      "title": "My New Post",
      "content": "This is the content...",
      "status": "draft",
      "publishedAt": null,
      "author": {
        "id": "uuid-here",
        "fullName": "John Doe"
      },
      "tags": [
        { "id": "uuid-1", "name": "JavaScript" }
      ],
      "createdAt": "2026-01-05T10:40:00Z",
      "updatedAt": "2026-01-05T10:40:00Z"
    }
  }
}
```

---

#### PATCH /api/v1/posts/:id

**Description**: Update existing post

**Authentication**: Required (Bearer Token, must be author or admin)

**Path Parameters**:
- `id` (UUID, required)

**Request Body** (all fields optional):
```json
{
  "title": "Updated Title",
  "content": "Updated content...",
  "status": "published",
  "tagIds": ["uuid-1", "uuid-2", "uuid-3"]
}
```

**Success Response** (200 OK):
```json
{
  "success": true,
  "data": {
    "post": {
      "id": "uuid-here",
      "title": "Updated Title",
      "content": "Updated content...",
      "status": "published",
      "publishedAt": "2026-01-05T10:45:00Z",
      "updatedAt": "2026-01-05T10:45:00Z"
    }
  }
}
```

**Error Responses**:

403 Forbidden - Not Author:
```json
{
  "success": false,
  "error": {
    "code": "FORBIDDEN",
    "message": "You don't have permission to edit this post"
  }
}
```

---

#### DELETE /api/v1/posts/:id

**Description**: Delete a post

**Authentication**: Required (Bearer Token, must be author or admin)

**Path Parameters**:
- `id` (UUID, required)

**Success Response** (200 OK):
```json
{
  "success": true,
  "data": {
    "message": "Post deleted successfully"
  }
}
```

---

### 4.4 Comments Endpoints

#### GET /api/v1/posts/:postId/comments

**Description**: Get comments for a post

**Authentication**: Optional

**Path Parameters**:
- `postId` (UUID, required)

**Query Parameters**:
- `page` (integer, default: 1)
- `limit` (integer, default: 20)

**Success Response** (200 OK):
```json
{
  "success": true,
  "data": [
    {
      "id": "uuid-here",
      "content": "Great post!",
      "author": {
        "id": "uuid-here",
        "fullName": "Jane Smith"
      },
      "createdAt": "2026-01-02T14:30:00Z",
      "updatedAt": "2026-01-02T14:30:00Z"
    }
  ],
  "pagination": {
    "page": 1,
    "limit": 20,
    "total": 5,
    "totalPages": 1
  }
}
```

---

#### POST /api/v1/posts/:postId/comments

**Description**: Add a comment to a post

**Authentication**: Required (Bearer Token)

**Path Parameters**:
- `postId` (UUID, required)

**Request Body**:
```json
{
  "content": "Great post! Very helpful."
}
```

**Validation Rules**:
- `content`: Required, 1-1000 characters

**Success Response** (201 Created):
```json
{
  "success": true,
  "data": {
    "comment": {
      "id": "uuid-here",
      "content": "Great post! Very helpful.",
      "author": {
        "id": "uuid-here",
        "fullName": "John Doe"
      },
      "createdAt": "2026-01-05T10:50:00Z"
    }
  }
}
```

---

<!-- Continue with all your endpoints... -->

---

## 5. HTTP Status Codes

| Code | Meaning | Usage |
|------|---------|-------|
| 200 | OK | Successful GET, PATCH, DELETE |
| 201 | Created | Successful POST (resource created) |
| 204 | No Content | Successful DELETE (no response body) |
| 400 | Bad Request | Validation error, malformed request |
| 401 | Unauthorized | Missing or invalid authentication |
| 403 | Forbidden | Authenticated but not authorized |
| 404 | Not Found | Resource doesn't exist |
| 409 | Conflict | Resource conflict (e.g., duplicate email) |
| 422 | Unprocessable Entity | Semantic validation error |
| 429 | Too Many Requests | Rate limit exceeded |
| 500 | Internal Server Error | Server error |
| 503 | Service Unavailable | Server temporarily unavailable |

---

## 6. Error Codes

| Code | HTTP Status | Description |
|------|-------------|-------------|
| VALIDATION_ERROR | 400 | Input validation failed |
| INVALID_CREDENTIALS | 401 | Wrong email/password |
| UNAUTHORIZED | 401 | Missing or invalid token |
| EMAIL_NOT_VERIFIED | 403 | Email not verified |
| FORBIDDEN | 403 | Insufficient permissions |
| NOT_FOUND | 404 | Resource not found |
| POST_NOT_FOUND | 404 | Post not found |
| USER_NOT_FOUND | 404 | User not found |
| DUPLICATE_EMAIL | 409 | Email already registered |
| RATE_LIMIT_EXCEEDED | 429 | Too many requests |
| INTERNAL_ERROR | 500 | Server error |

---

## 7. Rate Limiting

### 7.1 Rate Limits

| Endpoint Type | Limit | Window |
|---------------|-------|--------|
| Authentication | 5 requests | 15 minutes |
| Public endpoints | 100 requests | 1 minute |
| Authenticated endpoints | 1000 requests | 1 minute |

### 7.2 Rate Limit Headers

```http
X-RateLimit-Limit: 1000
X-RateLimit-Remaining: 999
X-RateLimit-Reset: 1641384000
```

### 7.3 Rate Limit Exceeded Response

```json
{
  "success": false,
  "error": {
    "code": "RATE_LIMIT_EXCEEDED",
    "message": "Too many requests. Please try again later.",
    "retryAfter": 60
  }
}
```

---

## 8. Versioning

### 8.1 Versioning Strategy

- URL-based versioning: `/api/v1/`, `/api/v2/`
- Major version changes for breaking changes
- Minor changes are backward-compatible

### 8.2 Deprecation Policy

- Deprecated endpoints supported for 6 months
- Deprecation warnings in response headers:
  ```http
  X-API-Deprecated: true
  X-API-Deprecation-Date: 2026-07-01
  X-API-Migration-Guide: https://docs.yourapp.com/migration/v2
  ```

---

## 9. Webhooks (Optional)

### 9.1 Webhook Events

If your API supports webhooks:

| Event | Trigger |
|-------|---------|
| `user.created` | New user registered |
| `post.published` | Post published |
| `comment.created` | New comment added |

### 9.2 Webhook Payload

```json
{
  "event": "post.published",
  "timestamp": "2026-01-05T10:55:00Z",
  "data": {
    "post": {
      "id": "uuid-here",
      "title": "My Post",
      "publishedAt": "2026-01-05T10:55:00Z"
    }
  }
}
```

---

## 10. CMS API Endpoints

### 10.1 Content Management

#### List Contents
```http
GET /api/v1/contents?type=blog&status=published&limit=10&offset=0
```

**Query Parameters**:
- `type` (optional): Content type (blog, page, docs, changelog)
- `status` (optional): Content status (draft, review, published, archived)
- `categoryId` (optional): Filter by category
- `tagSlug` (optional): Filter by tag slug
- `authorId` (optional): Filter by author
- `search` (optional): Search in title/content
- `limit` (optional): Pagination limit
- `offset` (optional): Pagination offset

**Response**:
```json
{
  "data": [
    {
      "id": "uuid",
      "title": "Blog Post Title",
      "slug": "blog-post-title",
      "content": "Markdown or HTML content",
      "type": "blog",
      "status": "published",
      "publishedAt": "2026-01-05T10:00:00Z",
      "excerpt": "Short description",
      "featuredImage": "https://...",
      "readingTime": 5,
      "author": { "id": "uuid", "username": "author" },
      "category": { "id": "uuid", "name": "Tech" },
      "tags": [{ "id": "uuid", "name": "JavaScript" }]
    }
  ],
  "meta": {
    "total": 100,
    "limit": 10,
    "offset": 0
  }
}
```

#### Get Content by Slug
```http
GET /api/v1/contents/slug/:slug?includeDrafts=false
```

**Response**: Single content object (same structure as above)

#### Create Content
```http
POST /api/v1/contents
Authorization: Bearer <token>
```

**Request Body**:
```json
{
  "title": "New Blog Post",
  "slug": "new-blog-post",
  "content": "Content body",
  "type": "blog",
  "status": "draft",
  "excerpt": "Short description",
  "featuredImage": "https://...",
  "categoryId": "uuid",
  "tagIds": ["uuid1", "uuid2"]
}
```

#### Update Content
```http
PATCH /api/v1/contents/:id
Authorization: Bearer <token>
```

**Request Body**: Partial content object (same fields as create)

#### Publish Content
```http
POST /api/v1/contents/:id/publish
Authorization: Bearer <token>
```

#### Delete Content
```http
DELETE /api/v1/contents/:id
Authorization: Bearer <token>
```

### 10.2 Analytics Configuration

#### Get Analytics Configs
```http
GET /api/v1/analytics/configs?active=true&environment=production
```

**Response**:
```json
[
  {
    "id": "uuid",
    "platform": "GTM",
    "name": "Production GTM",
    "trackingId": "GTM-XXXXXX",
    "isActive": true,
    "environment": "production",
    "priority": 0
  }
]
```

#### Create Analytics Config
```http
POST /api/v1/analytics/configs
Authorization: Bearer <token>
```

**Request Body**:
```json
{
  "platform": "GA4",
  "name": "Production Analytics",
  "trackingId": "G-XXXXXXXXXX",
  "isActive": true,
  "environment": "production",
  "priority": 1
}
```

#### Get Site Verifications
```http
GET /api/v1/analytics/verification
```

**Response**:
```json
[
  {
    "id": "uuid",
    "platform": "GOOGLE",
    "verificationCode": "abc123xyz",
    "isVerified": true,
    "verifiedAt": "2026-01-05T10:00:00Z"
  }
]
```

#### Get Custom Scripts
```http
GET /api/v1/analytics/custom-scripts?active=true&position=head-end
```

**Response**:
```json
[
  {
    "id": "uuid",
    "name": "Custom Tracking",
    "scriptContent": "<script>...</script>",
    "position": "head-end",
    "isActive": true,
    "priority": 0
  }
]
```

#### Get Feature Flags
```http
GET /api/v1/analytics/feature-flags?environment=production
```

**Response**:
```json
[
  {
    "id": "uuid",
    "flagName": "ENABLE_ANALYTICS",
    "description": "Master switch for analytics",
    "isEnabled": true,
    "environment": "all"
  }
]
```

### 10.3 SEO Endpoints

#### Get SEO Metadata
```http
GET /api/v1/seo/metadata/:contentId
```

**Response**:
```json
{
  "id": "uuid",
  "contentId": "uuid",
  "metaTitle": "SEO Title",
  "metaDescription": "SEO description",
  "ogTitle": "OG Title",
  "ogDescription": "OG description",
  "ogImage": "https://...",
  "canonicalUrl": "https://...",
  "hreflang": [
    { "locale": "en-US", "url": "https://..." }
  ]
}
```

#### Update SEO Metadata
```http
POST /api/v1/seo/metadata
Authorization: Bearer <token>
```

**Request Body**: SEO metadata object (same structure as response)

#### Get Sitemap
```http
GET /api/v1/seo/sitemap.xml?locale=en
```

**Response**: XML sitemap

#### Get Robots.txt
```http
GET /api/v1/seo/robots.txt
```

**Response**: Plain text robots.txt

### 10.4 Structured Data

#### Generate JSON-LD
```http
GET /api/v1/structured-data/generate/:contentId
```

**Response**:
```json
[
  {
    "@context": "https://schema.org",
    "@type": "BlogPosting",
    "headline": "Blog Post Title",
    "datePublished": "2026-01-05T10:00:00Z"
  },
  {
    "@context": "https://schema.org",
    "@type": "WebPage",
    "name": "Blog Post Title"
  }
]
```

### 10.5 Media

#### List Media
```http
GET /api/v1/media
```

**Response**:
```json
[
  {
    "id": "uuid",
    "filename": "image.jpg",
    "url": "https://s3.../image.jpg",
    "mimeType": "image/jpeg",
    "fileSize": 1024000,
    "width": 1920,
    "height": 1080,
    "altText": "Description",
    "uploadedBy": { "id": "uuid", "username": "user" }
  }
]
```

#### Upload Media
```http
POST /api/v1/media/upload
Authorization: Bearer <token>
Content-Type: multipart/form-data
```

**Request**: Form data with `file` field

### 10.6 Navigation

#### Get Navigation Menus
```http
GET /api/v1/navigation?location=header&locale=en
```

**Response**:
```json
[
  {
    "id": "uuid",
    "name": "Main Menu",
    "location": "header",
    "items": [
      {
        "label": "Home",
        "url": "/",
        "children": []
      }
    ],
    "locale": "en",
    "isActive": true
  }
]
```

### 10.7 Geo-Targeting

#### Get Geo Settings
```http
GET /api/v1/geo/settings
```

#### Get Hreflang Tags
```http
GET /api/v1/geo/hreflang/:contentId
```

**Response**:
```json
{
  "tags": [
    { "locale": "en-US", "url": "https://.../en-us/blog/post" },
    { "locale": "en-GB", "url": "https://.../en-gb/blog/post" }
  ]
}
```

---

## 11. Testing

### 10.1 Postman Collection

Export Postman collection for API testing:
- Include all endpoints
- Include example requests/responses
- Include environment variables

### 10.2 OpenAPI/Swagger

Generate OpenAPI specification from this document:
- Use AI to convert to `openapi.yaml`
- Host Swagger UI at `/api/docs`
- Keep in sync with implementation

---

## ✅ Completion Checklist

Before moving to the next document:

- [x] All endpoints are documented with request/response examples
- [x] Authentication method is clearly defined
- [x] Error responses are documented
- [x] HTTP status codes are specified
- [x] Rate limiting is defined
- [x] Pagination strategy is documented
- [x] Validation rules are specified
- [x] Success and error cases are covered
- [x] CMS endpoints documented
- [x] Analytics endpoints documented
- [x] SEO endpoints documented

---

**Next Steps**:

1. **Continue to**: `system-architecture.md`
2. **Generate OpenAPI**: Use AI to create `openapi.yaml` from this spec
3. **Implement**: Use this spec as contract for backend development

