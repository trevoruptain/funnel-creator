---
name: funnel-editor
version: 0.1.0
description: Insert a funnel question at the beginning, middle, or end. Asks all necessary questions before calling the tool.
allowed-tools:
  - AskUserQuestion
---

# Funnel Editor Skill

This skill lets you insert a funnel step (any question type) at the beginning, middle, or end of a funnel. It gathers all required information via `AskUserQuestion` before calling the `insert_funnel_step` MCP tool.

## Prerequisites

The `funnel-creator` MCP server must be configured. It provides:
- `list_funnels` — list available funnels
- `get_funnel_steps` — get steps for a funnel (when inserting in middle)
- `insert_funnel_step` — insert the new step

## How to Use

Run `/funnel-editor` to add a new question to a funnel.

---

## Instructions for Claude

When this skill is invoked, follow these steps. Present questions **ONE AT A TIME**, waiting for the user's response.

**AskUserQuestion constraints:** Requires 2–4 options per question. No free-text. Use AskUserQuestion only for multiple-choice questions (funnel, position, step, type). For free-text (question text, step ID, placeholder, etc.), ask in a normal message and let the user type their answer.

### Step 1: Which funnel?

First call `list_funnels` to get available funnels. Then ask:

```
AskUserQuestion({
  questions: [{
    header: "Which funnel do you want to add a question to?",
    options: [
      { label: "Discover Aurora (aurora-399-v1)", value: "aurora-399-v1" },
      // ... build from list_funnels response, one option per funnel
    ]
  }]
})
```

### Step 2: Where to insert?

```
AskUserQuestion({
  questions: [{
    header: "Where should the new question go?",
    options: [
      { label: "Beginning", value: "beginning" },
      { label: "Middle (after a specific step)", value: "after_step" },
      { label: "End", value: "end" }
    ]
  }]
})
```

### Step 3: If middle — after which step?

Only if the user chose "Middle" in Step 2. Call `get_funnel_steps` with the chosen funnel slug.

**IMPORTANT: AskUserQuestion requires 2–4 options.** If the funnel has more than 4 steps, use a two-step drill-down:

**3a. First — which section?** Split steps into 2–4 groups (e.g. beginning, early-middle, mid, later). Present group labels:

```
AskUserQuestion({
  questions: [{
    header: "Which section of the funnel?",
    options: [
      { label: "Beginning (welcome, gender, pregnancy-status)", value: "section-0" },
      { label: "Early middle (stat-complications → risk-level)", value: "section-1" },
      { label: "Mid funnel (monitoring-desires → current-gaps)", value: "section-2" },
      { label: "Later (investment-readiness → email)", value: "section-3" }
    ]
  }]
})
```

**3b. Second — after which step?** From the chosen section, pick the 2–4 steps in that range. Ask:

```
AskUserQuestion({
  questions: [{
    header: "After which step should the new question appear?",
    options: [
      { label: "welcome — welcome", value: "welcome" },
      { label: "gender — multiple-choice", value: "gender" },
      { label: "pregnancy-status — multiple-choice", value: "pregnancy-status" }
      // 2–4 options only, from the chosen section
    ]
  }]
})
```

If the funnel has 4 or fewer steps total, skip 3a and ask 3b directly with all steps.

### Step 4: Question type?

**AskUserQuestion allows 2–4 options.** Use a two-step drill-down:

**4a. Category?**

```
AskUserQuestion({
  questions: [{
    header: "What kind of step?",
    options: [
      { label: "Choice (multiple-choice or checkboxes)", value: "choice" },
      { label: "Input (email, text, or number)", value: "input" },
      { label: "Content (info card, welcome, checkout, result)", value: "content" }
    ]
  }]
})
```

**4b. Specific type?**

- If **choice**: options `[{ label: "Multiple choice", value: "multiple-choice" }, { label: "Checkboxes", value: "checkboxes" }]`
- If **input**: options `[{ label: "Email", value: "email" }, { label: "Text input", value: "text-input" }, { label: "Number picker", value: "number-picker" }]` (3 options)
- If **content**: options `[{ label: "Info card", value: "info-card" }, { label: "Welcome", value: "welcome" }, { label: "Checkout", value: "checkout" }, { label: "Result", value: "result" }]` (4 options)

### Step 5: Type-specific config

Ask only the fields needed for the chosen type. For free-text, ask in a message. Use AskUserQuestion only for yes/no or 2–4 choice questions.

**multiple-choice** — question (string), options (format: `id: Label` per line, e.g. `yes: Yes`). Optional: description, required (default true). Build config: `{ question, options: [{ id, label }], required?: true }`

**checkboxes** — Same as multiple-choice. Optional: minSelections (number, default 1), maxSelections (number), required. Parse min/max as integers.

**email** — title (string). Optional: description, placeholder, buttonText, privacyNote, required (default true)

**text-input** — question (string). Optional: description, placeholder, multiline (boolean), required (default true)

**number-picker** — question (string), min (number), max (number). **Must parse min and max as integers.** Optional: description, unit (e.g. "lbs"), step (number, default 1), defaultValue (number), required (default true)

**info-card** — title (string), description (string). Optional: stat (e.g. "87%"), bullets (string[], one item per line), buttonText, image (URL)

**welcome** — title (string). Optional: subtitle, logo (URL), image (URL), buttonText (default "Get Started")

**checkout** — title (string), price (number). Optional: subtitle, originalPrice, currency ("USD"), buttonText, features (string[]), guarantee, image (URL)

**result** — title (string). Optional: subtitle, image (URL), features (string[]), ctaText, ctaUrl

### Step 6: Step ID

Ask in a message: "Step ID (unique slug, e.g. budget-question). Used internally—no spaces." Suggest a slug from the question text if helpful (e.g. "What's your budget?" → "budget-question").

### Step 7: Confirm and insert

Summarize: funnel, position, step ID, type, config. Then call `insert_funnel_step` with:

- `funnel_slug`: from Step 1
- `position`: "beginning" | "after_step" | "end"
- `after_step_id`: only when position is "after_step" (value from Step 3)
- `step_id`: from Step 6
- `type`: from Step 4
- `config`: object built from Step 5

---

## Config shapes reference

Build the `config` object from the fields below. **Numbers must be numbers, not strings** (parse min, max, price, step, etc. with `parseInt`).

| Type | Required | Optional |
|------|----------|----------|
| multiple-choice | question (string), options: [{ id, label }] | description, required (bool) |
| checkboxes | question, options | description, minSelections (int), maxSelections (int), required |
| email | title | description, placeholder, buttonText, privacyNote, required |
| text-input | question | description, placeholder, multiline (bool), required |
| number-picker | question, min (int), max (int) | description, unit, step (int), defaultValue (int), required |
| info-card | title, description | stat, bullets (string[]), buttonText, image |
| welcome | title | subtitle, logo, image, buttonText |
| checkout | title, price (int) | subtitle, originalPrice, currency, buttonText, features (string[]), guarantee, image |
| result | title | subtitle, image, features (string[]), ctaText, ctaUrl |

**Options format:** `[{ id: "yes", label: "Yes" }, { id: "no", label: "No" }]` — each option needs `id` and `label`. Optional: `icon`, `description`.

**Parsing user input:** When the user provides "id: Label" lines, split each line on the first colon. For bullets/features, split on newlines into string[]. For min/max/price/step, use `parseInt()`.

---

## Key principles

1. **Ask everything first** — Never call `insert_funnel_step` until you have all required fields.
2. **One question at a time** — Wait for each response before proceeding.
3. **2–4 options only** — AskUserQuestion requires 2–4 options. For more steps, use two-step drill-down (section → step).
4. **Free-text = regular message** — Don't use AskUserQuestion for free-text; ask in a message.
5. **Unique step_id** — Must not duplicate an existing step_id in the funnel.
