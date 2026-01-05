# UI Specifications

Create detailed UI specifications for each page or major section of your application.

## 📁 What Goes Here

One specification file per page or major component:
- `homepage.md` - Homepage specifications
- `dashboard.md` - Dashboard specifications
- `product-page.md` - Product page specifications
- `checkout.md` - Checkout flow specifications
- etc.

## 📝 How to Create UI Specs

### 1. Copy the Template

Use `example-page.md` as a template for each new page.

### 2. Fill Out Each Section

For each page, document:
- **Content**: Exact headlines, copy, button labels
- **Layout**: Component arrangement, grid structure
- **Styling**: Colors, fonts, spacing (reference design system)
- **Behavior**: Interactions, animations, state changes
- **Responsive**: How it adapts to different screen sizes
- **States**: Loading, empty, error states

### 3. Be Specific

❌ **Vague**:
- "A nice blue button"
- "Some padding"
- "Fade in animation"

✅ **Specific**:
- "Primary button (Primary-600 #3B82F6, 12px 24px padding, 8px border-radius)"
- "Section padding: 64px top/bottom, 24px left/right"
- "Fade in: opacity 0 → 1, 300ms ease, 100ms delay"

## 📋 UI Spec Template

Create a new file for each page using this structure:

```markdown
# [Page Name]

## 1. Overview
- Purpose: [What is this page for?]
- URL: [Page URL/route]
- Access: [Public / Authenticated / Admin only]

## 2. Layout

### Desktop (1024px+)
[Describe layout structure]

### Mobile (< 768px)
[Describe mobile layout]

## 3. Content

### Section 1: [Section Name]
**Headline**: [Exact text]
**Subheadline**: [Exact text]
**Body Copy**: [Exact text]
**CTA Button**: [Button label]

## 4. Components

### Component 1: [Component Name]
- Type: [Button / Card / Form / etc.]
- Style: [Reference design system]
- Behavior: [What happens on interaction]
- States: [Default, Hover, Active, Disabled]

## 5. Interactions

### Interaction 1: [Action Name]
- Trigger: [What triggers it]
- Effect: [What happens]
- Animation: [If any]

## 6. States

### Loading State
[What user sees while loading]

### Empty State
[What user sees when no data]

### Error State
[What user sees on error]

## 7. Responsive Behavior

### Mobile (< 768px)
[Changes from desktop]

### Tablet (768px - 1023px)
[Changes from desktop]
```

## 🎯 Example: Button Specification

**Bad Example** (too vague):
```
There's a blue button that says "Sign Up"
```

**Good Example** (specific):
```
### Primary CTA Button

**Label**: "Start Free Trial"

**Styling**:
- Background: Primary-600 (#3B82F6)
- Text: White (#FFFFFF), 16px, font-weight 600
- Padding: 12px 32px
- Border Radius: 8px
- Shadow: 0 1px 2px rgba(0,0,0,0.05)

**States**:
- Hover: Background Primary-700 (#2563EB), shadow 0 4px 6px rgba(0,0,0,0.1)
- Active: Background Primary-800 (#1E40AF)
- Disabled: Background Gray-300 (#D1D5DB), text Gray-500, cursor not-allowed

**Behavior**:
- On click: Navigate to /sign-up
- Loading state: Show spinner, text "Creating account..."
- Transition: background-color 150ms ease
```

## 💡 Tips

### 1. Use Real Content
Don't use Lorem Ipsum. Write the actual copy that will appear on the page.

### 2. Reference Design System
Instead of repeating styles, reference your design system:
```
✅ "Use Primary Button style (see design-system.md)"
❌ "Blue button with white text and rounded corners"
```

### 3. Include All States
Don't forget:
- Loading states
- Empty states (no data)
- Error states
- Success states
- Disabled states

### 4. Document Interactions
Explain what happens when users interact:
- Click
- Hover
- Scroll
- Form submission
- etc.

### 5. Show Responsive Changes
Document how the layout changes at different breakpoints.

## 📚 Common Sections to Specify

### For a Homepage:
- Hero section
- Features section
- Pricing section
- Testimonials section
- FAQ section
- Footer

### For a Dashboard:
- Navigation/Sidebar
- Header with user menu
- Main content area
- Widgets/Cards
- Data tables
- Charts/Graphs

### For a Form Page:
- Form fields
- Validation messages
- Submit button
- Success message
- Error handling

## ✅ Completion Checklist

For each page specification:

- [ ] Page purpose and URL documented
- [ ] All content written (headlines, copy, labels)
- [ ] Layout structure described
- [ ] All components specified
- [ ] Component states defined (hover, active, disabled, etc.)
- [ ] Interactions documented
- [ ] Loading/empty/error states included
- [ ] Responsive behavior documented
- [ ] References to design system included

---

**Ready to start?** Create your first UI specification file!

**Example**: Copy this template and create `homepage.md` for your homepage specifications.

