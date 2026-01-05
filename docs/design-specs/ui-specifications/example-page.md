# Example Page - Homepage

> **INSTRUCTIONS**: Use this as a template for your UI specifications. Copy this file and rename it for each page (e.g., `dashboard.md`, `product-page.md`). Fill out all sections with your specific requirements.

---

## 1. Overview

**Purpose**: Landing page to introduce the product and drive sign-ups

**URL**: `/` (homepage)

**Access**: Public (no authentication required)

**Key Goals**:
- Communicate value proposition clearly
- Drive users to sign up for free trial
- Build trust with social proof

---

## 2. Layout Structure

### Desktop (1024px+)

```
┌─────────────────────────────────────────────────┐
│              Navigation Bar                      │
├─────────────────────────────────────────────────┤
│                                                  │
│              Hero Section                        │
│         (Split: 50% text, 50% visual)           │
│                                                  │
├─────────────────────────────────────────────────┤
│                                                  │
│           Trust Logos Section                    │
│          (Centered, single row)                  │
│                                                  │
├─────────────────────────────────────────────────┤
│                                                  │
│            Features Section                      │
│         (3-column grid of cards)                 │
│                                                  │
├─────────────────────────────────────────────────┤
│                                                  │
│              Footer                              │
│                                                  │
└─────────────────────────────────────────────────┘
```

### Mobile (< 768px)

```
┌─────────────────────┐
│   Mobile Nav        │
├─────────────────────┤
│                     │
│   Hero Section      │
│   (Stacked)         │
│                     │
├─────────────────────┤
│   Trust Logos       │
│   (2 rows)          │
├─────────────────────┤
│                     │
│   Features          │
│   (Stacked cards)   │
│                     │
├─────────────────────┤
│   Footer            │
└─────────────────────┘
```

---

## 3. Sections & Content

### Section 1: Navigation Bar

**Position**: Fixed at top, sticky on scroll

**Height**: 64px

**Background**: White (#FFFFFF) with bottom border (1px, Gray-200)

**Content**:

**Left Side**:
- Logo (height: 32px)
- Company name: "YourApp" (18px, font-weight 600, Gray-900)

**Center** (Desktop only):
- Link: "Features" → `/features`
- Link: "Pricing" → `/pricing`
- Link: "Docs" → `/docs`
- Link: "Blog" → `/blog`
- (Spacing: 32px between links)
- (Style: 16px, Gray-700, hover: Primary-600)

**Right Side**:
- Button: "Sign In" (Ghost button, see design system)
- Button: "Start Free Trial" (Primary button, see design system)
- (Spacing: 12px between buttons)

**Mobile**:
- Logo on left
- Hamburger menu icon on right (24x24px)
- Menu opens as full-screen overlay

---

### Section 2: Hero Section

**Padding**: 96px top, 96px bottom (Desktop), 64px top/bottom (Mobile)

**Background**: Gradient from White to Primary-50

**Layout**: 50/50 split (Desktop), Stacked (Mobile)

#### Left Side (Text Content)

**Eyebrow Text**:
- Text: "🚀 Now in Public Beta"
- Style: 14px, font-weight 500, Primary-600
- Background: Primary-50, padding 6px 12px, border-radius 20px
- Margin bottom: 24px

**Headline**:
- Text: "Ship Secure Code 10x Faster"
- Style: H1 (48px, font-weight 700, Gray-900, line-height 1.2)
- Margin bottom: 16px

**Subheadline**:
- Text: "AI-powered security analysis that finds vulnerabilities before they reach production. Trusted by 500+ engineering teams."
- Style: 20px, font-weight 400, Gray-600, line-height 1.6
- Margin bottom: 32px

**CTA Buttons**:
- Primary: "Start Free Trial" (Primary button, see design system)
- Secondary: "Watch Demo" (Secondary button, see design system)
- Layout: Horizontal, 16px gap
- Mobile: Stack vertically, full width

**Trust Indicators** (below buttons):
- Text: "✓ No credit card required  ✓ 14-day free trial  ✓ Cancel anytime"
- Style: 14px, Gray-500
- Margin top: 16px

#### Right Side (Visual)

**Content**: Product screenshot or 3D illustration

**Image**:
- Size: 600x400px (Desktop), full width (Mobile)
- Border radius: 12px
- Shadow: Large elevation (see design system)
- Alt text: "YourApp dashboard showing security analysis"

**Animation** (optional):
- Fade in: opacity 0 → 1, 500ms ease, 200ms delay
- Slide up: transform translateY(20px) → translateY(0)

---

### Section 3: Trust Logos

**Padding**: 64px top/bottom

**Background**: Gray-50

**Headline**:
- Text: "Trusted by leading companies"
- Style: 16px, font-weight 500, Gray-600, text-align center
- Margin bottom: 32px

**Logos**:
- Display: Horizontal row (Desktop), 2x3 grid (Mobile)
- Logos: [Company1, Company2, Company3, Company4, Company5, Company6]
- Size: 120px width, auto height
- Grayscale: 100% (convert to grayscale)
- Opacity: 0.6
- Hover: Opacity 1.0, transition 200ms
- Spacing: 48px between logos (Desktop), 24px (Mobile)

---

### Section 4: Features

**Padding**: 96px top/bottom

**Background**: White

**Headline**:
- Text: "Everything you need to ship secure code"
- Style: H2 (36px, font-weight 700, Gray-900)
- Text align: Center
- Margin bottom: 48px

**Feature Cards** (3-column grid):

**Card 1: Real-time Scanning**
- Icon: 🔍 (or custom icon, 48x48px, Primary-600)
- Title: "Real-time Scanning"
  - Style: H4 (24px, font-weight 600, Gray-900)
- Description: "Scan code as you type. Catch vulnerabilities before committing."
  - Style: 16px, Gray-600, line-height 1.6
- Card Style:
  - Background: White
  - Border: 1px solid Gray-200
  - Border radius: 12px
  - Padding: 32px
  - Hover: Shadow medium → large, border Primary-200

**Card 2: AI-Powered Fixes**
- Icon: ✨
- Title: "AI-Powered Fixes"
- Description: "Get context-aware code fixes for detected issues."
- (Same card styling as Card 1)

**Card 3: Team Collaboration**
- Icon: 👥
- Title: "Team Collaboration"
- Description: "Share findings, assign issues, track resolution."
- (Same card styling as Card 1)

**Grid**:
- Desktop: 3 columns, 32px gap
- Tablet: 2 columns, 24px gap
- Mobile: 1 column, 24px gap, stacked

---

### Section 5: Footer

**Padding**: 48px top/bottom

**Background**: Gray-900

**Text Color**: Gray-300

**Layout**: 4-column grid (Desktop), stacked (Mobile)

**Column 1: Company**
- Logo (white version)
- Tagline: "Ship secure code faster"
- Copyright: "© 2026 YourApp. All rights reserved."

**Column 2: Product**
- Link: "Features"
- Link: "Pricing"
- Link: "Security"
- Link: "Changelog"

**Column 3: Resources**
- Link: "Documentation"
- Link: "API Reference"
- Link: "Blog"
- Link: "Support"

**Column 4: Legal**
- Link: "Privacy Policy"
- Link: "Terms of Service"
- Link: "Cookie Policy"

**Link Styling**:
- Color: Gray-400
- Hover: White
- Transition: 150ms ease

---

## 4. Component Specifications

### Primary CTA Button ("Start Free Trial")

**Styling**:
- Background: Primary-600 (#3B82F6)
- Text: White, 16px, font-weight 600
- Padding: 12px 32px
- Border radius: 8px
- Shadow: 0 1px 2px rgba(0,0,0,0.05)

**States**:
- Hover: Background Primary-700, shadow 0 4px 6px rgba(0,0,0,0.1)
- Active: Background Primary-800
- Focus: Ring 2px Primary-500, offset 2px

**Behavior**:
- On click: Navigate to `/sign-up`
- Transition: all 150ms ease

### Feature Card

**Default State**:
- Background: White
- Border: 1px solid Gray-200
- Border radius: 12px
- Padding: 32px
- Shadow: None

**Hover State**:
- Border: 1px solid Primary-200
- Shadow: 0 10px 15px rgba(0,0,0,0.1)
- Transform: translateY(-2px)
- Transition: all 300ms ease

---

## 5. Interactions & Animations

### Page Load Animation

**Hero Section**:
1. Headline fades in (opacity 0 → 1, 500ms, 0ms delay)
2. Subheadline fades in (opacity 0 → 1, 500ms, 100ms delay)
3. Buttons fade in (opacity 0 → 1, 500ms, 200ms delay)
4. Image slides up + fades in (translateY(20px) → 0, opacity 0 → 1, 500ms, 300ms delay)

### Scroll Animations

**Feature Cards**:
- Trigger: When card enters viewport (50% visible)
- Animation: Fade in + slide up (translateY(20px) → 0)
- Duration: 500ms ease
- Stagger: 100ms delay between cards

### Button Interactions

**Primary Button**:
- Hover: Scale 1.02, shadow increase
- Active: Scale 0.98
- Transition: all 150ms ease

---

## 6. States

### Loading State

**Initial Page Load**:
- Show skeleton screens for content
- Fade in content when loaded

### Empty State

Not applicable (homepage always has content)

### Error State

**If API fails** (e.g., can't load trust logos):
- Show placeholder or hide section
- Log error to console
- Don't break page layout

---

## 7. Responsive Behavior

### Desktop (1024px+)
- Full layout as described above
- 3-column feature grid
- Horizontal navigation
- 50/50 hero split

### Tablet (768px - 1023px)
- 2-column feature grid
- Slightly reduced padding (64px → 48px)
- Maintain horizontal navigation

### Mobile (< 768px)
- Single column layout
- Stacked hero section (text on top, image below)
- Hamburger menu navigation
- Full-width buttons
- Reduced padding (48px → 32px)
- Feature cards stack vertically

---

## 8. Accessibility

### Keyboard Navigation
- All interactive elements focusable with Tab
- Focus indicators visible (ring style)
- Skip to main content link

### Screen Readers
- Semantic HTML (header, nav, main, section, footer)
- Alt text for all images
- ARIA labels for icon buttons

### Color Contrast
- All text meets WCAG AA (4.5:1 ratio)
- Checked with WebAIM Contrast Checker

---

## ✅ Completion Checklist

- [x] Page purpose and URL documented
- [x] Layout structure described (desktop + mobile)
- [x] All content written (exact copy)
- [x] All sections specified
- [x] Component styles defined
- [x] Component states documented
- [x] Interactions and animations specified
- [x] Responsive behavior documented
- [x] Accessibility considerations included

---

**Next Steps**:
1. Review this specification with stakeholders
2. Use as reference during implementation
3. Update if design changes during development

