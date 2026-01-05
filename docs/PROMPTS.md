# AI Prompts Library

Use these exact prompts in sequence when working with your AI coding assistant (Cursor, etc.)

## 📖 How to Use These Prompts

1. Complete all templates in `website-guidelines/` and `website-sections/` FIRST
2. Copy and paste these prompts into your AI tool in the order shown
3. Wait for each prompt to complete before moving to the next
4. Start a NEW chat for each section build (keeps context clean)

---

## Phase 2: AI Creates Documentation

### Prompt 1: Create Style Guide

```
Based on my moodboard and design preferences in
`website-sections/0.design-moodboard.md`,
create a comprehensive STYLE_GUIDE.md that includes:

- Color palette with CSS variables
- Typography rules (fonts, sizes, weights)
- Component patterns (buttons, cards, etc.)
- Visual effects (glows, gradients, blur)
- Spacing and layout guidelines

This will be our single source of truth for the
entire project.

NOTE: This is a LIVING DOCUMENT. As we build sections
and learn what works (or doesn't), we will update this
guide to reflect our learnings. Add a "Changelog"
section at the bottom to track updates.
```

**Where it goes**: `website-guidelines/STYLE_GUIDE.md`

---

### Prompt 2: Create Project Requirements

```
Based on my product brief and all section files in
`website-sections/`, create a PROJECT_REQUIREMENTS.md
that consolidates:

## Structure:
1. Project Overview – What, who, goal (from product brief)
2. Tech Stack – Table of technologies and their purpose
3. Dependencies – List of npm packages needed
4. Design System – Just reference STYLE_GUIDE.md, do NOT duplicate it
5. Page Sections – Index table with 1-line descriptions and links to spec files
   (do NOT duplicate section details, just link to them)
6. File Structure – Recommended folder organization
7. Responsive Requirements – Breakpoints

## Rules:
- Do NOT duplicate content from STYLE_GUIDE.md – just reference it
- Do NOT duplicate section details – just create an index with links
- Keep it concise (~80–100 lines)
- This is an overview document, not a copy of everything
- Do NOT include setup steps – those will go in tasks.md
```

**Where it goes**: `website-guidelines/PROJECT_REQUIREMENTS.md`

---

### Prompt 3: Create Task List

```
Based on the STYLE_GUIDE.md and PROJECT_REQUIREMENTS.md,
create a tasks.md file with:

- Phase 1: Project setup tasks
- Phase 2: Build each section (reference the section
  spec files)

Use checkboxes so we can track progress.
```

**Where it goes**: `website-guidelines/tasks.md`

---

## Phase 3: Build + Iterate

### Prompt 4: Set Up Project

```
Start building Phase 1 from tasks.md
```

**What happens**: AI installs all dependencies, libraries, fonts, and sets up project structure

⏸️ **STOP**: Wait until all dependencies are installed before continuing

---

### Prompt 5: Build First Section (Hero)

```
Build the Hero section from tasks.md
```

**Pro Tips**:
- Start a NEW chat for this section
- Commit to GitHub after completion
- Take screenshots when giving feedback

---

### Prompt 6: Iteration and Feedback

Use these types of prompts to refine each section:

#### Visual Adjustments
```
I don't like [describe issue]. [Specific change you want].

Example:
I don't like this harsh separation between the navigation
bar and hero section. Make it seamless.
```

```
The [element] should be [specific change].

Example:
The navigation links shouldn't be in a pill component.
Remove that and make the text wider spaced.
```

```
When I [action], I want [specific behavior/effect].

Example:
When I scroll, I want the navigation bar to have
a frosty/glass background effect.
```

```
The [element] needs to be inside a [component type].

Example:
The tag above the headline needs to be inside
a component/badge, not just plain text.
```

#### Comparing to Reference
```
[Paste screenshot of current result]
[Paste screenshot of original reference]

Increase the visibility and contrast of [specific element].
Reduce [specific issue] so [desired outcome].
```

#### Capturing Learnings
```
I like this [change] better - update the STYLE_GUIDE.md
to reflect this as our standard [pattern/spacing/etc].

Example:
I like this spacing better - update the STYLE_GUIDE.md
to reflect this as our standard section padding.
```

---

### Prompt 7: Build Next Section

```
Build the next section from tasks.md.

Follow the updated STYLE_GUIDE.md and match the
patterns established in previous sections.
```

**Repeat**: Use Prompts 6-7 for each remaining section

---

## 🔄 The Build Loop (Repeat for Each Section)

```
1. Start NEW chat
   ↓
2. Use Prompt 7 (Build next section)
   ↓
3. Review the output
   ↓
4. Use Prompt 6 patterns (Give feedback)
   ↓
5. Refine until happy
   ↓
6. Ask AI to update STYLE_GUIDE.md
   ↓
7. Commit to GitHub
   ↓
8. Repeat for next section
```

---

## 💡 Example Feedback Prompts by Section

### Navigation Bar
```
The nav should have a glass/blur effect when scrolling
```

```
Remove the pill background from nav links and increase
letter spacing to 0.5px
```

### Hero Section
```
The 3D model needs more contrast. The marble base
should be more visible and colorful.
```

```
Reduce the dark overlay at the bottom so the 3D
element's base isn't hidden.
```

### Features Section
```
Each feature card should have a subtle glow effect
on hover matching our primary color
```

```
Icons should be 48x48px and have a 12px padding
inside their container
```

### Pricing Section
```
The "Most Popular" badge should use our gradient
from the style guide, not a solid color
```

```
Add a subtle scale animation (1.02) on card hover
```

### Testimonials
```
Profile images should be 56px with a 2px border
using our primary color
```

```
Star ratings should use our accent orange, not yellow
```

---

## 🎯 Specific vs. Vague Feedback

### ❌ Vague (Don't do this)
- "Make it bigger"
- "This looks bad"
- "Can you improve this?"
- "Make it pop more"

### ✅ Specific (Do this)
- "Increase the font size to 48px"
- "The contrast is too low. Change the text color from #666 to #333"
- "Add 60px of padding between sections"
- "Add a subtle glow effect using our primary color at 20% opacity"

---

## 📸 Using Screenshots for Feedback

Best practice when giving visual feedback:

```
[Paste screenshot of CURRENT result]
[Paste screenshot of DESIRED reference from your moodboard]

The current version has [specific issue]. I want it to
match the reference where [specific difference].
```

Example:
```
[Screenshot of your current hero]
[Screenshot from 21st.dev that you referenced]

The current version has too much dark overlay at the
bottom. I want the colorful marble base to be visible
like in the reference.
```

---

## 🚨 Important Reminders

1. **Always complete templates before using these prompts**
2. **Use a new chat for each section** (cleaner context)
3. **Commit to GitHub after each section** (easy rollback)
4. **Be specific in feedback** (measurements, colors, specific changes)
5. **Update style guide after refinements** (capture learnings)
6. **Screenshot > Words** (visual feedback is 10x clearer)

---

## 📚 Quick Reference

| Phase | Prompt | Output |
|-------|--------|--------|
| Setup | 1 | STYLE_GUIDE.md |
| Setup | 2 | PROJECT_REQUIREMENTS.md |
| Setup | 3 | tasks.md |
| Build | 4 | Project initialization |
| Build | 5 | Hero section |
| Iterate | 6 | Refinements |
| Build | 7 | Next section |

---

**Remember**: The iteration loop is everything. Define → Build → Review → Refine. This is how real product teams work.
