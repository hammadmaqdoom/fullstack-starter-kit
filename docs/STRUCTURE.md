# Template Structure

This document explains the organization of this template and what each file does.

## 📁 Complete File Structure

```
projects-boilerplate/
│
├── 📄 README.md                          # Main overview and quick start
├── 📄 GETTING-STARTED.md                 # Detailed step-by-step guide
├── 📄 PROMPTS.md                         # Exact AI prompts to use
├── 📄 STRUCTURE.md                       # This file
├── 📄 .cursorrules                       # Style guide governance rules
│
├── 📁 website-guidelines/
│   ├── 📄 README.md                      # Instructions for this folder
│   ├── 📄 product-brief.md               # ⚠️ YOU FILL: What you're building
│   │
│   └── (AI creates these after you complete templates):
│       ├── STYLE_GUIDE.md                # 🤖 Design system & CSS variables
│       ├── PROJECT_REQUIREMENTS.md       # 🤖 Tech stack & dependencies
│       └── tasks.md                      # 🤖 Build checklist
│
└── 📁 website-sections/
    ├── 📄 README.md                      # Instructions for this folder
    │
    ├── 📁 inspo-images/                  # ⚠️ YOUR SCREENSHOTS GO HERE
    │   └── 📄 README.md                  # Naming conventions
    │
    ├── 📄 0.design-moodboard.md          # ⚠️ YOU FILL: Overall aesthetic
    ├── 📄 1.navigation-bar.md            # ⚠️ YOU FILL: Nav specs
    ├── 📄 2.hero-section.md              # ⚠️ YOU FILL: Hero specs
    ├── 📄 3.trust-logos.md               # ⚠️ YOU FILL: Trust section specs
    ├── 📄 4.features.md                  # ⚠️ YOU FILL: Features specs
    ├── 📄 5.how-it-works.md              # ⚠️ YOU FILL: Process specs
    ├── 📄 6.pricing.md                   # ⚠️ YOU FILL: Pricing specs
    ├── 📄 7.testimonials.md              # ⚠️ YOU FILL: Testimonials specs
    ├── 📄 8.faq.md                       # ⚠️ YOU FILL: FAQ specs
    └── 📄 9.footer.md                    # ⚠️ YOU FILL: Footer specs
```

---

## 📖 File Descriptions

### Root Level Files

#### `README.md`
**Purpose**: Main entry point with quick start guide  
**When to read**: First thing when you copy the template  
**Contains**:
- Quick start instructions
- Project structure overview
- Workflow checklist
- Key principles
- Resources

#### `GETTING-STARTED.md`
**Purpose**: Detailed walkthrough for beginners  
**When to read**: If you want step-by-step guidance  
**Contains**:
- Detailed instructions for each phase
- Time estimates
- Examples
- Pro tips
- Common issues

#### `PROMPTS.md`
**Purpose**: Exact prompts to use with AI  
**When to read**: After completing all templates  
**Contains**:
- Phase 2: Documentation generation prompts
- Phase 3: Building prompts
- Feedback examples
- Iteration patterns

#### `STRUCTURE.md`
**Purpose**: This file - explains the template organization  
**When to read**: To understand what each file does  

#### `.cursorrules`
**Purpose**: Automated governance for style guide  
**When to read**: You don't need to - it works automatically  
**What it does**: Ensures AI keeps style guide in sync with implementation

---

### `website-guidelines/` Folder

This folder contains your project's **strategic documentation**.

#### `README.md`
**Purpose**: Instructions for the guidelines folder  
**Contains**: Workflow explanation and checklist

#### `product-brief.md` ⚠️ YOU FILL THIS
**Purpose**: Foundation document  
**Fill out**: FIRST (before anything else)  
**Contains**:
- Product description
- Target audience
- Main goal/CTA
- Sections needed
- Requirements

**Time**: 30-60 minutes

#### `STYLE_GUIDE.md` 🤖 AI CREATES
**Purpose**: Single source of truth for design  
**Created by**: AI using Prompt 1  
**Contains**:
- Color palette with CSS variables
- Typography rules
- Component patterns
- Visual effects
- Spacing guidelines
- Changelog

**When**: After you complete all templates

#### `PROJECT_REQUIREMENTS.md` 🤖 AI CREATES
**Purpose**: Technical overview  
**Created by**: AI using Prompt 2  
**Contains**:
- Project overview
- Tech stack
- Dependencies
- Section index
- File structure
- Responsive requirements

**When**: After STYLE_GUIDE.md is created

#### `tasks.md` 🤖 AI CREATES
**Purpose**: Build checklist  
**Created by**: AI using Prompt 3  
**Contains**:
- Phase 1: Setup tasks
- Phase 2: Section build tasks
- Checkboxes to track progress

**When**: After PROJECT_REQUIREMENTS.md is created

---

### `website-sections/` Folder

This folder contains your **section-by-section specifications**.

#### `README.md`
**Purpose**: Instructions for filling out section specs  
**Contains**:
- How to be specific
- Resources for each section type
- Common mistakes to avoid
- Good vs bad examples

#### `inspo-images/` Folder
**Purpose**: Store reference screenshots  
**What goes here**: 
- Screenshots of websites you like
- Component examples
- Layout references

**Naming convention**: `[section]-ref-[description].png`  
Examples:
- `hero-ref-stripe-gradient.png`
- `nav-ref-vercel-blur.png`
- `features-ref-linear-cards.png`

#### `0.design-moodboard.md` ⚠️ YOU FILL THIS
**Purpose**: Overall aesthetic for entire website  
**Fill out**: SECOND (after product brief)  
**Contains**:
- Reference screenshots (2-4)
- Color palette with hex codes
- Typography (fonts + sources)
- Visual effects (glows, gradients, blur)
- Component patterns (buttons, cards)
- Animation philosophy

**Time**: 1-2 hours

**Why it matters**: Without this, AI makes generic choices

#### `1.navigation-bar.md` ⚠️ YOU FILL THIS
**Purpose**: Navigation specifications  
**Contains**:
- Logo and nav links
- Scroll behavior
- Mobile menu design
- Component code (if using 21st.dev)

#### `2.hero-section.md` ⚠️ YOU FILL THIS
**Purpose**: Hero section specifications  
**Priority**: ⭐ HIGHEST - spend the most time here  
**Contains**:
- Headlines and CTAs
- Layout structure
- 3D/visual elements
- Background effects
- Typography details
- Animation sequences

**Time**: 1-2 hours (most important section)

#### `3.trust-logos.md` ⚠️ YOU FILL THIS
**Purpose**: Trust/social proof section  
**Contains**:
- Logo list
- Layout pattern
- Styling approach

#### `4.features.md` ⚠️ YOU FILL THIS
**Purpose**: Features section specifications  
**Contains**:
- Feature list with icons
- Card design
- Grid layout
- Hover effects

#### `5.how-it-works.md` ⚠️ YOU FILL THIS
**Purpose**: Process/workflow section  
**Contains**:
- Step-by-step content
- Timeline design
- Connection lines
- Number styling

#### `6.pricing.md` ⚠️ YOU FILL THIS
**Purpose**: Pricing section specifications  
**Priority**: HIGH (conversion section)  
**Contains**:
- Pricing tiers
- Feature lists
- Billing toggle
- Featured tier highlighting

#### `7.testimonials.md` ⚠️ YOU FILL THIS
**Purpose**: Testimonials section  
**Contains**:
- Testimonial quotes
- Author info
- Card design
- Layout pattern (grid/carousel)

#### `8.faq.md` ⚠️ YOU FILL THIS
**Purpose**: FAQ section specifications  
**Contains**:
- Questions and answers
- Accordion design
- Expand/collapse behavior

#### `9.footer.md` ⚠️ YOU FILL THIS
**Purpose**: Footer specifications  
**Contains**:
- Navigation columns
- Social links
- Newsletter signup
- Copyright info

---

## 🔄 Workflow Order

### Phase 1: Your Preparation (4-8 hours)

1. **Copy template** (5 min)
2. **`website-guidelines/product-brief.md`** (30-60 min)
3. **`website-sections/0.design-moodboard.md`** (1-2 hrs)
4. **`website-sections/1-9.*.md`** (2-4 hrs)
5. **Collect assets** in `inspo-images/` (30-60 min)

### Phase 2: AI Creates Documentation (30 min)

1. **Prompt 1** → `STYLE_GUIDE.md`
2. **Prompt 2** → `PROJECT_REQUIREMENTS.md`
3. **Prompt 3** → `tasks.md`

### Phase 3: Build (20-40 hours)

1. **Prompt 4** → Project setup
2. **Prompt 5** → Hero section
3. **Prompt 7** → Remaining sections (one at a time)

---

## 📊 File Status Legend

- ⚠️ = **You fill this out** (templates)
- 🤖 = **AI generates this** (after your templates)
- ✅ = **Pre-configured** (ready to use)
- 📖 = **Instructions/help** (read for guidance)

---

## 🎯 Priority Files

If you're short on time, focus on these:

### Must Complete (Required)
1. `website-guidelines/product-brief.md`
2. `website-sections/0.design-moodboard.md`
3. `website-sections/2.hero-section.md`

### Should Complete (Highly Recommended)
4. `website-sections/1.navigation-bar.md`
5. `website-sections/4.features.md`
6. `website-sections/6.pricing.md`

### Nice to Complete (Recommended)
7. All remaining section files

**Why**: The more complete your specs, the better the AI output.

---

## 📏 File Size Guidelines

To give you an idea of how detailed to be:

| File | Lines | Detail Level |
|------|-------|--------------|
| `product-brief.md` | 50-100 | High |
| `0.design-moodboard.md` | 100-200 | Very High |
| `2.hero-section.md` | 200-300 | Extremely High |
| Other sections | 100-200 | High |

**More detail = Better AI output**

---

## 🔍 Finding Files Quickly

### "I want to understand the template"
→ Read `README.md` first

### "I want step-by-step instructions"
→ Read `GETTING-STARTED.md`

### "I'm ready to start filling templates"
→ Start with `website-guidelines/product-brief.md`

### "I need help with a specific section"
→ Check that section's template file (has instructions)

### "I'm ready to use AI"
→ Open `PROMPTS.md`

### "I want to see the structure"
→ You're reading it! (`STRUCTURE.md`)

---

## ✅ Completion Checklist

Use this to track your progress:

### Templates Completed
- [ ] `website-guidelines/product-brief.md`
- [ ] `website-sections/0.design-moodboard.md`
- [ ] `website-sections/1.navigation-bar.md`
- [ ] `website-sections/2.hero-section.md`
- [ ] `website-sections/3.trust-logos.md`
- [ ] `website-sections/4.features.md`
- [ ] `website-sections/5.how-it-works.md`
- [ ] `website-sections/6.pricing.md`
- [ ] `website-sections/7.testimonials.md`
- [ ] `website-sections/8.faq.md`
- [ ] `website-sections/9.footer.md`

### Assets Collected
- [ ] Reference screenshots in `inspo-images/`
- [ ] Logo files ready
- [ ] Component code copied (from 21st.dev)

### AI Documentation Generated
- [ ] `STYLE_GUIDE.md` created
- [ ] `PROJECT_REQUIREMENTS.md` created
- [ ] `tasks.md` created

### Ready to Build
- [ ] All above completed
- [ ] Project opened in Cursor
- [ ] Ready to use prompts from `PROMPTS.md`

---

## 🎉 You're Organized!

This template is now properly structured and ready to use. Start with `README.md` or `GETTING-STARTED.md` and follow the workflow.

**Remember**: The time you invest in filling out these templates determines the quality of your final website.

Good luck! 🚀

