# Website Guidelines

This folder contains your project's core documentation. Start here.

## 📄 Files You Create (Templates)

### 1. product-brief.md ⭐ START HERE
**What it is**: The foundation document explaining WHAT you're building and WHY

**Fill out FIRST**: This guides everything else

**What to include**:
- Product description
- Target audience
- Main goal/CTA
- List of sections needed
- Additional requirements

### Files AI Creates (From Your Templates)

After you complete `product-brief.md` and all section specs, AI will create these:

### 2. STYLE_GUIDE.md
**What it is**: Single source of truth for all design decisions

**Created by**: AI (using Prompt 1 from PROMPTS.md)

**Contains**:
- Color palette with CSS variables
- Typography rules
- Component patterns
- Visual effects
- Spacing guidelines
- **Changelog** (updated as you build)

### 3. PROJECT_REQUIREMENTS.md
**What it is**: Technical overview consolidating all specs

**Created by**: AI (using Prompt 2 from PROMPTS.md)

**Contains**:
- Project overview
- Tech stack
- Dependencies
- Section index with links
- File structure
- Responsive requirements

### 4. tasks.md
**What it is**: Step-by-step build checklist

**Created by**: AI (using Prompt 3 from PROMPTS.md)

**Contains**:
- Phase 1: Setup tasks (with checkboxes)
- Phase 2: Section build tasks (with checkboxes)

---

## 🔄 Workflow

```
YOU fill out:
├── product-brief.md ← Do this first

Then YOU create all section specs in website-sections/
(See website-sections/README.md for details)

Then AI creates:
├── STYLE_GUIDE.md (from your moodboard)
├── PROJECT_REQUIREMENTS.md (from brief + sections)
└── tasks.md (from requirements)
```

---

## ✅ Checklist Before Moving Forward

Before asking AI to create documentation:
- [ ] `product-brief.md` is complete
- [ ] Design moodboard is complete (`website-sections/0.design-moodboard.md`)
- [ ] All section spec files are complete
- [ ] All reference images are saved in `website-sections/inspo-images/`
- [ ] You have component code copied from 21st.dev (if using)

---

## 🎯 Next Steps

1. **Complete `product-brief.md`** (this folder)
2. **Go to `website-sections/` folder** and complete all templates
3. **Come back here** and use the prompts to generate AI documentation

---

**Remember**: The more detailed you are in these templates, the better your final website will be. This is where you invest the effort that separates a $500 site from a $5,000 one.
