# Design Specifications

This folder contains **design and UI specifications** for your project. Only fill this out if your project has a **frontend/user interface**.

## 📋 What Goes Here

All the visual and interaction design specifications:

1. **Design System** - Colors, typography, components, spacing
2. **Wireframes** - Page layouts and user flows
3. **UI Specifications** - Detailed specs for each page/section

## 🎯 When to Use This Folder

### Skip This Folder If:
- ❌ Building an API-only backend
- ❌ Building a CLI tool
- ❌ No user interface

### Use This Folder If:
- ✅ Building a website
- ✅ Building a web application
- ✅ Building a dashboard
- ✅ Any project with a user interface

## 📝 How to Fill These Out

### 1. Start with Design System (2-3 hours)

Define your visual language:
- **Color Palette**: Primary, secondary, accent colors with hex codes
- **Typography**: Font families, sizes, weights, line heights
- **Spacing System**: Consistent spacing values (4px, 8px, 16px, etc.)
- **Components**: Buttons, forms, cards, navigation patterns
- **Breakpoints**: Mobile, tablet, desktop sizes
- **Animations**: Transitions, hover effects, loading states

**Why it matters**: Without a design system, your UI will be inconsistent and look unprofessional.

### 2. Create Wireframes (1-2 hours)

Sketch out your pages:
- Low-fidelity sketches or high-fidelity mockups
- Page layouts and component placement
- User flows (how users navigate)
- Mobile and desktop versions

**Tools**:
- Figma (recommended, free)
- Sketch
- Adobe XD
- Even pen and paper!

### 3. Write UI Specifications (2-4 hours)

Detail each page/section:
- Exact content (headlines, copy, button labels)
- Component behavior (what happens on click, hover)
- Responsive rules (how it adapts to screen sizes)
- States (loading, empty, error)
- Interactions and animations

## ⚡ Quick Start

### For a Simple Website:
1. Fill out: `design-system.md` (colors, fonts, basic components)
2. Add: Wireframes to `wireframes/` folder
3. Create: One UI spec file per page in `ui-specifications/`
4. Skip: Complex component libraries (unless needed)

### For a Web Application:
1. Fill out: Complete `design-system.md` (all components, states)
2. Add: Detailed wireframes with user flows
3. Create: UI specs for all pages and major components
4. Include: Loading states, empty states, error states

### For a Dashboard:
1. Fill out: `design-system.md` (focus on data visualization)
2. Add: Wireframes showing layout and navigation
3. Create: UI specs for dashboard widgets and charts
4. Include: Interactive states (filters, sorting, drill-down)

## 🎨 Design System Checklist

Before you start building, ensure your design system includes:

### Colors
- [ ] Primary color (with shades: 50, 100, 200, ..., 900)
- [ ] Secondary color (with shades)
- [ ] Accent/Action color
- [ ] Neutral colors (grays for text, borders, backgrounds)
- [ ] Semantic colors (success, warning, error, info)
- [ ] All colors have hex codes

### Typography
- [ ] Font families chosen (headings, body, mono)
- [ ] Font sizes defined (h1-h6, body, small)
- [ ] Font weights specified (regular, medium, bold)
- [ ] Line heights defined
- [ ] Letter spacing (if needed)
- [ ] Google Fonts links (if using web fonts)

### Spacing
- [ ] Base unit defined (e.g., 4px or 8px)
- [ ] Spacing scale (4, 8, 12, 16, 24, 32, 48, 64px)
- [ ] Consistent padding/margin values

### Components
- [ ] Buttons (primary, secondary, outline, ghost, disabled)
- [ ] Forms (inputs, selects, checkboxes, radio buttons)
- [ ] Cards (content containers)
- [ ] Navigation (navbar, sidebar, breadcrumbs)
- [ ] Modals/Dialogs
- [ ] Alerts/Notifications
- [ ] Loading indicators
- [ ] Empty states
- [ ] Error states

### Responsive Design
- [ ] Breakpoints defined (mobile, tablet, desktop)
- [ ] Mobile-first approach
- [ ] Touch-friendly (44x44px minimum touch targets)

### Accessibility
- [ ] Color contrast meets WCAG AA (4.5:1 for text)
- [ ] Focus states for keyboard navigation
- [ ] Alt text strategy for images
- [ ] Semantic HTML usage

## 🔗 Workflow

```
1. Design System (Foundation)
   ↓
2. Wireframes (Structure)
   ↓
3. UI Specifications (Details)
   ↓
4. Implementation (Code)
```

## 💡 Best Practices

### Be Specific
- ❌ "Use a nice blue color"
- ✅ "Primary: #3B82F6 (blue-500)"

- ❌ "Make the heading big"
- ✅ "H1: 48px, font-weight: 700, line-height: 1.2"

### Use Real Content
- ❌ "Lorem ipsum dolor sit amet..."
- ✅ "Ship Secure Code 10x Faster" (actual headline)

### Define All States
- Default state
- Hover state
- Active/Pressed state
- Focus state (keyboard navigation)
- Disabled state
- Loading state
- Error state
- Empty state

### Think Mobile-First
- Design for mobile screens first
- Then adapt for larger screens
- Ensure touch targets are 44x44px minimum

### Use Reference Images
- Save screenshots of designs you like
- Store in `wireframes/` folder
- Reference them in UI specs

## 📚 Resources

### Design Tools
- **Figma**: [figma.com](https://figma.com) - Free, collaborative design tool
- **Excalidraw**: [excalidraw.com](https://excalidraw.com) - Simple wireframing
- **Whimsical**: [whimsical.com](https://whimsical.com) - Wireframes and flows

### Design Inspiration
- **Dribbble**: [dribbble.com](https://dribbble.com) - Design inspiration
- **Landingfolio**: [landingfolio.com](https://landingfolio.com) - Landing pages
- **Mobbin**: [mobbin.com](https://mobbin.com) - Mobile app designs
- **21st.dev**: [21st.dev](https://21st.dev) - Premium components

### Component Libraries
- **shadcn/ui**: [ui.shadcn.com](https://ui.shadcn.com) - React components
- **Tailwind UI**: [tailwindui.com](https://tailwindui.com) - Tailwind components
- **Radix UI**: [radix-ui.com](https://radix-ui.com) - Unstyled components

### Color Tools
- **Coolors**: [coolors.co](https://coolors.co) - Color palette generator
- **Tailwind Colors**: [tailwindcss.com/docs/customizing-colors](https://tailwindcss.com/docs/customizing-colors)
- **Contrast Checker**: [webaim.org/resources/contrastchecker](https://webaim.org/resources/contrastchecker)

### Typography
- **Google Fonts**: [fonts.google.com](https://fonts.google.com)
- **Font Pair**: [fontpair.co](https://fontpair.co) - Font combinations
- **Type Scale**: [typescale.com](https://typescale.com) - Typography calculator

## 🎯 Common Mistakes to Avoid

### 1. No Design System
**Problem**: Building UI without defining colors/fonts first  
**Solution**: Always start with design-system.md

### 2. Vague Specifications
**Problem**: "Make it look good"  
**Solution**: Specify exact colors, sizes, spacing

### 3. Ignoring Mobile
**Problem**: Designing only for desktop  
**Solution**: Design mobile-first, then scale up

### 4. Inconsistent Spacing
**Problem**: Random padding/margin values (13px, 17px, 23px)  
**Solution**: Use spacing scale (8px, 16px, 24px, 32px)

### 5. Poor Color Contrast
**Problem**: Light gray text on white background  
**Solution**: Check contrast ratio (minimum 4.5:1)

### 6. No Component States
**Problem**: Only defining default state  
**Solution**: Define hover, active, disabled, loading, error states

### 7. Forgetting Empty States
**Problem**: No design for empty lists/no data  
**Solution**: Design empty states with helpful messages

## ✅ Completion Checklist

Before moving to implementation:

- [ ] Design system is complete with all colors, fonts, components
- [ ] Wireframes are created for all major pages
- [ ] UI specifications are written for all pages/sections
- [ ] All component states are defined
- [ ] Responsive behavior is documented
- [ ] Accessibility considerations are included
- [ ] Reference images are saved
- [ ] Real content is used (not Lorem Ipsum)

---

**Ready to start?** Begin with `design-system.md` and work your way through wireframes and UI specs.

**Next Steps After Completion**:
1. Review all design specs
2. Use AI prompts from `../PROMPTS.md` to generate components
3. Implement UI based on specifications

