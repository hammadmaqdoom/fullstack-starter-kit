# Design System

> **INSTRUCTIONS**: This is your single source of truth for all design decisions. Define colors, typography, spacing, and component patterns. Be as specific as possible with hex codes, pixel values, and exact specifications.

---

## 1. Color Palette

### Primary Colors

**Primary** (Main brand color):
- 50: `#[hex]` - Lightest
- 100: `#[hex]`
- 200: `#[hex]`
- 300: `#[hex]`
- 400: `#[hex]`
- 500: `#[hex]` - Base color
- 600: `#[hex]`
- 700: `#[hex]`
- 800: `#[hex]`
- 900: `#[hex]` - Darkest

**Example (Blue)**:
- 50: `#EFF6FF`
- 100: `#DBEAFE`
- 200: `#BFDBFE`
- 300: `#93C5FD`
- 400: `#60A5FA`
- 500: `#3B82F6` ← Base
- 600: `#2563EB`
- 700: `#1D4ED8`
- 800: `#1E40AF`
- 900: `#1E3A8A`

### Secondary Colors

**Secondary**:
- 500: `#[hex]` - Base color
- (Add shades if needed)

### Accent Colors

**Accent** (Call-to-action color):
- 500: `#[hex]`

### Neutral Colors

**Gray** (Text, borders, backgrounds):
- 50: `#[hex]` - Lightest background
- 100: `#[hex]` - Light background
- 200: `#[hex]` - Border light
- 300: `#[hex]` - Border
- 400: `#[hex]` - Border dark
- 500: `#[hex]` - Disabled text
- 600: `#[hex]` - Secondary text
- 700: `#[hex]` - Body text
- 800: `#[hex]` - Heading text
- 900: `#[hex]` - Darkest text

### Semantic Colors

**Success** (Green):
- Base: `#10B981`
- Light: `#D1FAE5`
- Dark: `#065F46`

**Warning** (Yellow):
- Base: `#F59E0B`
- Light: `#FEF3C7`
- Dark: `#92400E`

**Error** (Red):
- Base: `#EF4444`
- Light: `#FEE2E2`
- Dark: `#991B1B`

**Info** (Blue):
- Base: `#3B82F6`
- Light: `#DBEAFE`
- Dark: `#1E40AF`

### Background Colors

- **Page Background**: `#[hex]` (e.g., `#FFFFFF` or `#F9FAFB`)
- **Card Background**: `#[hex]` (e.g., `#FFFFFF`)
- **Hover Background**: `#[hex]` (e.g., `#F3F4F6`)

---

## 2. Typography

### Font Families

**Headings**:
- Font: [Font Name] (e.g., "Inter", "Poppins", "Satoshi")
- Weights: 600 (Semibold), 700 (Bold)
- Google Fonts: `https://fonts.google.com/specimen/[FontName]`

**Body**:
- Font: [Font Name] (e.g., "Inter", "System UI")
- Weights: 400 (Regular), 500 (Medium), 600 (Semibold)

**Monospace** (Code):
- Font: [Font Name] (e.g., "Fira Code", "JetBrains Mono")
- Weight: 400 (Regular)

### Font Sizes

| Element | Size | Line Height | Weight |
|---------|------|-------------|--------|
| **H1** | 48px (3rem) | 1.2 | 700 |
| **H2** | 36px (2.25rem) | 1.3 | 700 |
| **H3** | 30px (1.875rem) | 1.3 | 600 |
| **H4** | 24px (1.5rem) | 1.4 | 600 |
| **H5** | 20px (1.25rem) | 1.4 | 600 |
| **H6** | 18px (1.125rem) | 1.4 | 600 |
| **Body Large** | 18px (1.125rem) | 1.6 | 400 |
| **Body** | 16px (1rem) | 1.6 | 400 |
| **Body Small** | 14px (0.875rem) | 1.5 | 400 |
| **Caption** | 12px (0.75rem) | 1.4 | 400 |

### Text Colors

- **Heading**: Gray-900 `#[hex]`
- **Body**: Gray-700 `#[hex]`
- **Secondary**: Gray-600 `#[hex]`
- **Disabled**: Gray-400 `#[hex]`
- **Link**: Primary-600 `#[hex]`
- **Link Hover**: Primary-700 `#[hex]`

---

## 3. Spacing System

**Base Unit**: 4px

**Spacing Scale**:
- `xs`: 4px (0.25rem)
- `sm`: 8px (0.5rem)
- `md`: 12px (0.75rem)
- `lg`: 16px (1rem)
- `xl`: 24px (1.5rem)
- `2xl`: 32px (2rem)
- `3xl`: 48px (3rem)
- `4xl`: 64px (4rem)
- `5xl`: 96px (6rem)

**Usage**:
- **Component Padding**: 16px (lg) or 24px (xl)
- **Section Padding**: 48px (3xl) or 64px (4xl)
- **Element Spacing**: 8px (sm) or 12px (md)
- **Section Spacing**: 96px (5xl) between major sections

---

## 4. Border Radius

- **None**: 0px
- **Small**: 4px (buttons, inputs)
- **Medium**: 8px (cards, modals)
- **Large**: 12px (large cards)
- **XL**: 16px (feature cards)
- **Full**: 9999px (pills, avatars)

---

## 5. Shadows

**Elevation Levels**:

```css
/* Small - Buttons, inputs */
box-shadow: 0 1px 2px 0 rgba(0, 0, 0, 0.05);

/* Medium - Cards */
box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1), 
            0 2px 4px -1px rgba(0, 0, 0, 0.06);

/* Large - Modals, dropdowns */
box-shadow: 0 10px 15px -3px rgba(0, 0, 0, 0.1), 
            0 4px 6px -2px rgba(0, 0, 0, 0.05);

/* XL - Popovers */
box-shadow: 0 20px 25px -5px rgba(0, 0, 0, 0.1), 
            0 10px 10px -5px rgba(0, 0, 0, 0.04);
```

---

## 6. Components

### 6.1 Buttons

**Primary Button**:
- Background: Primary-600 `#[hex]`
- Text: White `#FFFFFF`
- Padding: 12px 24px
- Border Radius: 8px
- Font Size: 16px
- Font Weight: 600
- Hover: Primary-700 `#[hex]`
- Active: Primary-800 `#[hex]`
- Disabled: Gray-300 `#[hex]`, text Gray-500

**Secondary Button**:
- Background: Transparent
- Text: Primary-600 `#[hex]`
- Border: 2px solid Primary-600
- Padding: 10px 22px (account for border)
- Hover: Background Primary-50

**Ghost Button**:
- Background: Transparent
- Text: Gray-700 `#[hex]`
- Padding: 12px 24px
- Hover: Background Gray-100

**Button Sizes**:
- Small: 8px 16px, 14px font
- Medium: 12px 24px, 16px font (default)
- Large: 16px 32px, 18px font

### 6.2 Forms

**Input Fields**:
- Background: White `#FFFFFF`
- Border: 1px solid Gray-300 `#[hex]`
- Border Radius: 8px
- Padding: 12px 16px
- Font Size: 16px
- Placeholder: Gray-400 `#[hex]`
- Focus: Border Primary-500, ring 3px Primary-100

**Labels**:
- Font Size: 14px
- Font Weight: 500
- Color: Gray-700 `#[hex]`
- Margin Bottom: 8px

**Error State**:
- Border: Error-500 `#[hex]`
- Error Text: Error-600, 14px, below input

### 6.3 Cards

**Standard Card**:
- Background: White `#FFFFFF`
- Border: 1px solid Gray-200 `#[hex]`
- Border Radius: 12px
- Padding: 24px
- Shadow: Medium elevation
- Hover: Shadow Large elevation

### 6.4 Navigation

**Navbar**:
- Height: 64px
- Background: White `#FFFFFF`
- Border Bottom: 1px solid Gray-200
- Padding: 0 24px
- Logo Height: 32px
- Link Color: Gray-700
- Link Hover: Primary-600
- Active Link: Primary-600, font-weight 600

### 6.5 Modals

**Modal Overlay**:
- Background: rgba(0, 0, 0, 0.5)
- Backdrop Blur: 4px

**Modal Content**:
- Background: White `#FFFFFF`
- Border Radius: 16px
- Padding: 32px
- Max Width: 500px
- Shadow: XL elevation

### 6.6 Alerts

**Success Alert**:
- Background: Success-Light `#[hex]`
- Border: Success-Base `#[hex]`
- Text: Success-Dark `#[hex]`
- Icon: Success-Base

**Error Alert**:
- Background: Error-Light `#[hex]`
- Border: Error-Base `#[hex]`
- Text: Error-Dark `#[hex]`
- Icon: Error-Base

---

## 7. Animations & Transitions

**Transition Duration**:
- Fast: 150ms (hover effects)
- Normal: 300ms (default)
- Slow: 500ms (page transitions)

**Easing**:
- Default: `cubic-bezier(0.4, 0, 0.2, 1)`
- In: `cubic-bezier(0.4, 0, 1, 1)`
- Out: `cubic-bezier(0, 0, 0.2, 1)`

**Common Transitions**:
```css
/* Button hover */
transition: background-color 150ms ease;

/* Modal open */
transition: opacity 300ms ease, transform 300ms ease;

/* Page transition */
transition: opacity 500ms ease;
```

---

## 8. Breakpoints

| Breakpoint | Min Width | Max Width | Usage |
|------------|-----------|-----------|-------|
| **xs** | 0px | 639px | Mobile phones |
| **sm** | 640px | 767px | Large phones |
| **md** | 768px | 1023px | Tablets |
| **lg** | 1024px | 1279px | Small laptops |
| **xl** | 1280px | 1535px | Desktops |
| **2xl** | 1536px | - | Large screens |

**Mobile-First Approach**: Design for mobile first, then add styles for larger screens.

---

## 9. Accessibility

### Color Contrast

All text must meet WCAG AA standards:
- Normal text (< 18px): 4.5:1 contrast ratio
- Large text (≥ 18px): 3:1 contrast ratio

**Check your colors**: [WebAIM Contrast Checker](https://webaim.org/resources/contrastchecker/)

### Focus States

All interactive elements must have visible focus states:
```css
focus:outline-none focus:ring-2 focus:ring-primary-500 focus:ring-offset-2
```

### Touch Targets

Minimum touch target size: 44x44 pixels (mobile)

---

## 10. Dark Mode (Optional)

If supporting dark mode:

**Dark Background Colors**:
- Page: Gray-900 `#111827`
- Card: Gray-800 `#1F2937`
- Hover: Gray-700 `#374151`

**Dark Text Colors**:
- Heading: Gray-50 `#F9FAFB`
- Body: Gray-300 `#D1D5DB`
- Secondary: Gray-400 `#9CA3AF`

---

## ✅ Completion Checklist

- [ ] All colors defined with hex codes
- [ ] Color contrast checked (WCAG AA)
- [ ] Typography system complete (fonts, sizes, weights)
- [ ] Spacing scale defined
- [ ] All component styles specified
- [ ] Button states defined (default, hover, active, disabled)
- [ ] Form styles complete
- [ ] Animations and transitions specified
- [ ] Breakpoints defined
- [ ] Accessibility considerations included

---

**Next Steps**:
1. Create wireframes in `wireframes/` folder
2. Write UI specifications in `ui-specifications/` folder
3. Use AI to generate CSS/Tailwind config from this design system

