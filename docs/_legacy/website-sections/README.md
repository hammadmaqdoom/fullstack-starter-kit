# Website Sections

This folder contains your section-by-section specifications. Each file defines exactly how one section should look and behave.

## 📁 What's In This Folder

### Files You Create

#### 0.design-moodboard.md ⭐ START HERE (after product brief)
**What it is**: The overall vibe/aesthetic for your ENTIRE website

**What to include**:
- 2-4 reference screenshots (saved in `inspo-images/`)
- Color palette with hex codes
- Typography (font names and sources)
- Visual effects (glows, gradients, textures)
- Component patterns (buttons, cards)

**Why it matters**: This guides AI on the general aesthetic. Without this, AI will make generic choices.

---

#### Section Files (1-9): One file per section
Each section file combines BOTH content AND design specs:

**Content**: Headlines, body text, button labels, images
**Design specs**: Layout, components, animations, effects, code

---

### inspo-images/ Folder
**What goes here**: Screenshots of websites/components you want to reference

**Naming convention**: `[section]-ref-[description].png`

Examples:
- `hero-ref-stripe-gradient.png`
- `nav-ref-vercel-blur.png`
- `features-ref-linear-cards.png`
- `pricing-ref-github.png`

---

## 🔄 Workflow: How to Use These Templates

### Step 1: Product Brief (Different Folder)
Complete `website-guidelines/product-brief.md` FIRST
- This defines WHAT you're building
- Lists which sections you need

### Step 2: General Moodboard (This Folder)
Complete `0.design-moodboard.md` SECOND
- This defines the overall aesthetic
- Colors, fonts, effects that apply site-wide

### Step 3: Section Specs (This Folder)
Complete each section file in order:
1. Navigation Bar
2. Hero Section (most important!)
3. Trust Logos
4. Features
5. How It Works
6. Pricing
7. Testimonials
8. FAQ
9. Footer

---

## 💡 Tips for Filling Out Section Specs

### Be Extremely Specific
❌ "Make it look modern"  
✅ "Background: #0A0A0A with subtle noise texture (5% opacity) and cyan glowing particles (2-4px, floating upward)"

### Include Reference Images
Find 2-3 examples of each section you like:
- Save screenshots to `inspo-images/`
- Reference them in the section file
- Explain WHAT specifically you like

### Copy Component Code
If you find a component on 21st.dev or shadcn/ui:
- Copy the entire component code
- Paste it into the section spec
- AI will use it as a reference

### Resources for Each Section Type

**Navigation**:
- 21st.dev/components/navigation
- Look for blur effects, scroll animations

**Hero**:
- Three.js examples (threejs.org)
- 21st.dev 3D components
- Dribbble for layout inspiration

**Features**:
- 21st.dev/components/cards
- shadcn/ui card components
- Look for grid layouts with icons

**How It Works**:
- Timeline components
- Step-by-step layouts
- Connection line animations

**Pricing**:
- 21st.dev/components/pricing
- Look for gradient borders
- Badge components for "Popular"

**Testimonials**:
- Card grids
- Carousel/slider components
- Profile photo treatments

**FAQ**:
- shadcn/ui accordion
- Expand/collapse animations

**Footer**:
- Multi-column layouts
- Social icon treatments

---

## 📏 How Detailed Should You Be?

### Minimum Details (Required)
- Content (text, headlines, descriptions)
- Layout pattern (grid / stack / columns)
- Colors (hex codes)
- Font sizes for headings and body

### Recommended Details
- Reference screenshots
- Specific spacing (padding, margins, gaps)
- Hover effects
- Animation timings
- Component code from 21st.dev

### Maximum Details (Best Results)
- Everything above, PLUS:
- Mobile breakpoint behavior
- Animation sequences with timings
- Exact color gradients
- Three.js code for 3D elements
- Accessibility requirements

**Remember**: More detail = Better output from AI

---

## 🎯 Section Priority Order

Start with these sections (they set the visual tone):

### 1. Hero Section (Highest Priority)
This is the first thing visitors see. Get this right and the rest follows.

**Spend the most time on**:
- Exact headline text
- 3D model or visual element
- Background effects
- Typography

### 2. Navigation Bar
Sets the persistent UI pattern.

**Key decisions**:
- Scroll behavior (blur effect?)
- Logo placement
- Link styling

### 3. Features
Showcases your value prop.

**Key decisions**:
- Card vs. no-card design
- Icon treatment
- Grid layout

### 4. Pricing
Critical conversion section.

**Key decisions**:
- How to highlight featured tier
- Monthly/annual toggle
- CTA button styling

### 5. Everything Else
Testimonials, FAQ, Footer are important but follow established patterns.

---

## ✅ Section Completion Checklist

For EACH section file, make sure you've specified:
- [ ] All content text (headlines, descriptions, CTAs)
- [ ] Layout pattern (grid / stack / columns / etc.)
- [ ] Reference screenshot saved in `inspo-images/`
- [ ] Typography sizes (headings and body)
- [ ] Colors (backgrounds, text, accents)
- [ ] Spacing (padding, gaps between elements)
- [ ] Hover/interactive effects
- [ ] Mobile behavior
- [ ] Component code (if using from 21st.dev or shadcn)

---

## 🚨 Common Mistakes to Avoid

### Mistake 1: Being Too Vague
❌ "Make the hero look cool"  
✅ "Hero should have a dark gradient background (#0A0A0A → #000000) with floating cyan particles (48px diameter, 30% opacity, slow upward animation)"

### Mistake 2: No Reference Images
Don't just describe - SHOW examples. Screenshots are worth 1000 words.

### Mistake 3: Skipping the Moodboard
The moodboard defines your color palette and fonts. Without it, AI will make random choices.

### Mistake 4: Not Copying Component Code
When you find a perfect component on 21st.dev, COPY THE CODE into your spec. AI needs the actual implementation, not just a link.

### Mistake 5: Forgetting Mobile
Every section needs mobile specs. Don't assume AI will figure it out.

---

## 📖 Example: Good vs. Bad Section Spec

### ❌ Bad Example (Too Vague)
```
Hero Section:
- Headline: "Welcome to our product"
- Make it look modern with animations
- Use our brand colors
```

### ✅ Good Example (Specific)
```
Hero Section:

Content:
- Pre-headline badge: "Trusted by 10,000+ developers"
- Headline: "Ship Secure Code 10x Faster"
- Sub-headline: "AI-powered security analysis that finds 
  vulnerabilities before your customers do."
- Primary CTA: "Start Free Trial" → Opens signup modal
- Secondary CTA: "Watch Demo" → Plays video

Layout:
- Split 40/60: Text left, 3D visual right
- Height: 100vh (full viewport)
- Screenshot: inspo-images/hero-ref-stripe.png
- What I like: Clean left-aligned text, bold typography

3D Visual:
- Type: Three.js angel statue (chrome material)
- Model: angel-statue.glb
- Platform: Colorful iridescent marble base
- Lighting: Cyan rim light from behind
- Animation: Slow auto-rotate (0.3 degrees/sec)
- Code: [paste Three.js setup code]

Background:
- Color: #0A0A0A
- Gradient: Radial from center (dark gray → black)
- Particles: Cyan (#01FFFF, 30% opacity, 2-4px, 50 count)
- Noise texture: 5% opacity overlay

Typography:
- Headline: 64px, Satoshi Bold, gradient (white → cyan)
- Sub-headline: 20px, Satoshi Regular, #CCCCCC
- Spacing: 24px between headline and sub-headline
```

**See the difference?** The good example gives AI everything it needs.

---

## 🆘 Need Help?

### Resources to Find Inspiration
- **Dribbble.com** - Design inspiration
- **Landingfolio.com** - Landing page examples
- **21st.dev** - Premium React components
- **shadcn/ui** - Base UI components
- **Three.js examples** - 3D elements
- **Awwwards.com** - Award-winning sites

### How to Use These Resources
1. Find a site/component you like
2. Screenshot it
3. Save to `inspo-images/`
4. Describe WHAT you like about it
5. Copy any available code
6. Reference it in your section spec

---

## 🎉 Ready to Build?

Once all section files are complete:
1. Go back to `website-guidelines/` folder
2. Use PROMPTS.md to have AI create documentation
3. Start building section by section!

---

**Remember**: These section specs are your blueprint. The more detailed you are here, the less back-and-forth with AI later. Invest the time upfront!
