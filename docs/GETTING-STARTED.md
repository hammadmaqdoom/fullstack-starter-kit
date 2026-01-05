# Getting Started Guide

Welcome! This guide will walk you through using this template to build a premium website with AI.

## 📖 Overview

This template helps you create professional websites by:
1. **You** define everything upfront (content, design, layout)
2. **AI** generates the code based on your specifications
3. **You** iterate and refine section by section

**Time investment**: 4-8 hours of prep work → 20-40 hours of AI-assisted building

---

## 🎯 Step-by-Step Walkthrough

### Step 1: Copy This Template (5 minutes)

```bash
# Copy to your new project
cp -r projects-boilerplate my-awesome-website
cd my-awesome-website

# Optional: Initialize git
git init
git add .
git commit -m "Initial commit: Project template"
```

---

### Step 2: Product Brief (30-60 minutes)

Open `website-guidelines/product-brief.md` and fill it out completely.

**What to define**:
- What is your product/service?
- Who is it for? (be specific!)
- What's the main goal? (sign ups, sales, leads?)
- What sections do you need?

**Example**:
```
Product: AI-powered code security scanner
Target: Engineering teams at Series A-C startups (10-100 devs)
Goal: Sign ups for 14-day free trial
Sections: Nav, Hero, Trust Logos, Features, Pricing, FAQ, Footer
```

**💡 Tip**: The more specific you are here, the better your final result.

---

### Step 3: Design Moodboard (1-2 hours)

Open `website-sections/0.design-moodboard.md`

**What to do**:
1. **Find 2-4 websites** you love the look of
   - Screenshot them
   - Save to `website-sections/inspo-images/`
   - Name them: `ref-1-stripe-gradient.png`, etc.

2. **Choose your colors** (with hex codes!)
   - Primary: `#01FFFF` (Cyan)
   - Secondary: `#A855F7` (Purple)
   - Background: `#0A0A0A` (Near black)
   - Text: `#FFFFFF`, `#CCCCCC`, `#999999`

3. **Pick your fonts** (include Google Fonts links)
   - Headings: Satoshi Bold
   - Body: Inter Regular
   - Link: https://fonts.google.com/specimen/Inter

4. **Define effects**
   - Glowing particles? Gradient backgrounds? Blur effects?
   - Be specific: "Cyan particles, 2-4px, 30% opacity, floating upward"

**💡 Tip**: Visit [21st.dev](https://21st.dev) and find components you like. Copy their code!

---

### Step 4: Section Specifications (2-4 hours)

Now fill out each section file in `website-sections/`:

#### Priority Order:
1. **`2.hero-section.md`** ⭐ MOST IMPORTANT
   - First thing visitors see
   - Sets the visual tone
   - Spend the most time here

2. **`1.navigation-bar.md`**
   - Persistent UI element
   - Sets navigation patterns

3. **`4.features.md`** & **`6.pricing.md`**
   - Core conversion sections

4. **Everything else**
   - Trust logos, testimonials, FAQ, footer

#### For Each Section:

**Content** (write all text):
- Headlines
- Descriptions
- Button labels
- Any supporting text

**Design** (be specific):
- Layout pattern (grid? columns? stack?)
- Colors (hex codes)
- Font sizes (48px, 20px, etc.)
- Spacing (padding, margins, gaps)
- Hover effects
- Animations

**References**:
- Screenshot examples
- Component code from 21st.dev
- Specific things you like

**Example - Hero Section**:
```
Headline: "Ship Secure Code 10x Faster"
Sub-headline: "AI-powered security analysis..."
Layout: Split 40/60 (text left, 3D visual right)
Background: #0A0A0A with cyan particles (2-4px, 50 count)
Typography: 64px Satoshi Bold, gradient (white → cyan)
3D Visual: Chrome angel statue on colorful marble base
Screenshot: inspo-images/hero-ref-stripe.png
```

**💡 Tip**: The more specific you are, the less back-and-forth with AI later.

---

### Step 5: Collect Visual Assets (30-60 minutes)

Before moving to AI:

- [ ] All screenshots in `website-sections/inspo-images/`
- [ ] Logo files ready (if you have them)
- [ ] Any product screenshots
- [ ] Testimonial photos (if using real testimonials)

**Naming convention**:
- `hero-ref-stripe-gradient.png`
- `nav-ref-vercel-blur.png`
- `features-ref-linear-cards.png`

---

### Step 6: Generate Documentation with AI (30 minutes)

Now open your project in **Cursor** (or your AI coding assistant).

Open `PROMPTS.md` and use the prompts **in order**:

#### Prompt 1: Create Style Guide
Copy and paste Prompt 1 into Cursor.

**What happens**: AI creates `website-guidelines/STYLE_GUIDE.md`
- Consolidates your moodboard into a design system
- Creates CSS variables
- Defines component patterns

**Review it**: Make sure colors, fonts, and effects match your vision.

---

#### Prompt 2: Create Project Requirements
Copy and paste Prompt 2 into Cursor.

**What happens**: AI creates `website-guidelines/PROJECT_REQUIREMENTS.md`
- Lists tech stack (Next.js, Tailwind, etc.)
- Defines dependencies
- Creates section index
- Plans file structure

**Review it**: Check that tech choices make sense for your project.

---

#### Prompt 3: Create Task List
Copy and paste Prompt 3 into Cursor.

**What happens**: AI creates `website-guidelines/tasks.md`
- Phase 1: Setup tasks
- Phase 2: Build tasks for each section
- All with checkboxes

**Review it**: This is your build roadmap.

---

### Step 7: Build with AI (20-40 hours)

Now the fun part! Follow the prompts in `PROMPTS.md`:

#### Phase 1: Setup (1-2 hours)
```
Use Prompt 4: "Start building Phase 1 from tasks.md"
```

AI will:
- Initialize Next.js project
- Install dependencies (Tailwind, Framer Motion, etc.)
- Set up fonts
- Create base file structure

**Wait for it to complete** before moving on.

---

#### Phase 2: Build Hero Section (4-6 hours)

⚠️ **IMPORTANT**: Start a NEW chat in Cursor for this.

```
Use Prompt 5: "Build the Hero section from tasks.md"
```

AI will build the hero section based on your specs.

**Then iterate**:
1. Review what AI built
2. Give specific feedback (use Prompt 6 examples)
3. Refine until it's perfect
4. Ask AI to update `STYLE_GUIDE.md` with learnings

**Example feedback**:
```
❌ "Make it better"
✅ "The 3D model needs more contrast. Increase the rim light 
    intensity to 0.8 and make the marble base more colorful."
```

**Commit to git** when done.

---

#### Phase 3: Build Remaining Sections (15-30 hours)

For EACH remaining section:

1. **Start NEW chat** (keeps context clean)
2. Use Prompt 7: "Build the next section from tasks.md"
3. Review and give feedback
4. Refine
5. Update style guide
6. Commit to git

**Repeat** for all sections.

---

### Step 8: Final Polish (2-4 hours)

- [ ] Test on mobile, tablet, desktop
- [ ] Check all links work
- [ ] Verify animations perform well
- [ ] Run Lighthouse audit
- [ ] Optimize images
- [ ] Add meta tags for SEO

---

## 💡 Pro Tips

### 1. Be Specific in Feedback
❌ "Make it bigger"  
✅ "Increase font size from 48px to 64px"

❌ "Add more spacing"  
✅ "Add 32px padding between sections"

### 2. Use Screenshots
When giving feedback, paste:
- Screenshot of current result
- Screenshot of desired reference
- Explain the specific difference

### 3. Update Style Guide
After each section, capture what worked:
```
"I like this spacing better - update STYLE_GUIDE.md to 
reflect 120px vertical padding as our standard."
```

### 4. Commit Often
After each section is done, commit:
```bash
git add .
git commit -m "Complete hero section"
```

### 5. New Chat Per Section
Don't build everything in one chat:
- Keeps context focused
- Saves tokens
- Easier to iterate

---

## 🆘 Common Issues

### "AI isn't following my specs"
→ Your specs might be too vague. Add more detail:
- Exact measurements (px, rem)
- Hex codes for colors
- Specific component names

### "The design looks generic"
→ Did you skip the moodboard? Go back and:
- Add reference screenshots
- Define specific colors/fonts
- Copy component code from 21st.dev

### "Sections don't match"
→ Update `STYLE_GUIDE.md` after each section
→ Make sure AI references it when building

### "Mobile is broken"
→ Did you specify mobile behavior in section specs?
→ Go back and add mobile breakpoint details

---

## ✅ Checklist: Are You Ready to Start?

Before asking AI to build:

- [ ] Product brief complete
- [ ] Moodboard complete with colors, fonts, effects
- [ ] All section specs filled out
- [ ] Reference screenshots saved
- [ ] Component code copied (if using 21st.dev)
- [ ] Visual assets ready

If yes, proceed to Step 6 (Generate Documentation)!

---

## 📚 Quick Reference

| Phase | Time | What You Do |
|-------|------|-------------|
| 1. Setup | 5 min | Copy template |
| 2. Product Brief | 30-60 min | Define what you're building |
| 3. Moodboard | 1-2 hrs | Choose colors, fonts, effects |
| 4. Section Specs | 2-4 hrs | Write content + design specs |
| 5. Assets | 30-60 min | Gather screenshots, logos |
| 6. AI Docs | 30 min | Generate style guide, requirements |
| 7. Build | 20-40 hrs | AI builds, you iterate |
| 8. Polish | 2-4 hrs | Test, optimize, ship |

**Total**: ~30-50 hours for a premium website

---

## 🎉 Ready to Build?

You now have everything you need. Remember:

**The secret to great AI-generated websites is the prep work.**

Invest 4-8 hours upfront defining everything, and you'll get a $5,000+ quality website.

**Good luck! 🚀**

---

**Need help?** Re-read the section READMEs:
- `website-guidelines/README.md`
- `website-sections/README.md`
- `PROMPTS.md`

