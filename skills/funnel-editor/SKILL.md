---
name: funnel-editor
version: 0.2.0
description: Add, edit, or remove funnel questions, and manage funnel versions (create draft, publish).
allowed-tools:
  - AskUserQuestion
---

# Funnel Editor Skill

This skill lets you modify a funnel's questions and manage versions. Supported operations:
- **Insert** a new step (beginning, middle, or end)
- **Edit** an existing step's config (deep-merged, so you only send what changed)
- **Remove** a step entirely (remaining steps are re-sequenced)
- **Create a new version** (draft copy of a published funnel for safe editing)
- **Publish a version** (promote a draft to live, replacing the current published version)

## Prerequisites

The `funnel-creator` MCP server must be configured. It provides:
- `list_funnels` — list available funnels and their versions
- `get_funnel_steps` — read current steps and config for a funnel version
- `insert_funnel_step` — insert a new step
- `edit_funnel_step` — edit (deep-merge) config on an existing step
- `remove_funnel_step` — delete a step and re-sequence the rest
- `create_funnel_version` — copy a funnel into a new unpublished draft version
- `publish_funnel_version` — promote a draft to live

## How to Use

Run `/funnel-editor` to start.

---

## Instructions for Claude

When this skill is invoked, follow these steps. Present questions **ONE AT A TIME**, waiting for the user's response.

**AskUserQuestion constraints:** Requires 2–4 options per question. No free-text. Use AskUserQuestion only for multiple-choice questions. For free-text (question text, step ID, config values, etc.), ask in a normal message and let the user type their answer.

---

### Step 0: What operation?

```
AskUserQuestion({
  questions: [{
    header: "What would you like to do?",
    options: [
      { label: "Add a new question", value: "insert" },
      { label: "Edit an existing question", value: "edit" },
      { label: "Remove a question", value: "remove" },
      { label: "Create a new draft version / publish a version", value: "version" }
    ]
  }]
})
```

Then branch to the relevant flow below.

---

## Flow A: Insert a new step

### A1: Which funnel?

Call `list_funnels` first. Then ask:

```
AskUserQuestion({
  questions: [{
    header: "Which funnel do you want to add a question to?",
    options: [
      { label: "Discover Aurora (aurora-399-v1)", value: "aurora-399-v1" },
      // ... build from list_funnels response, one option per funnel version
    ]
  }]
})
```

> **Tip:** Edits should target an unpublished draft version. If only a published version exists, suggest creating a new draft version first (Flow D).

### A2: Where to insert?

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

### A3: If middle — after which step?

Only if the user chose "Middle" in A2. Call `get_funnel_steps` with the chosen funnel slug.

**IMPORTANT: AskUserQuestion requires 2–4 options.** If the funnel has more than 4 steps, use a two-step drill-down:

**3a. First — which section?** Split steps into 2–4 groups:

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

**3b. Second — after which step?** From the chosen section, pick 2–4 steps:

```
AskUserQuestion({
  questions: [{
    header: "After which step should the new question appear?",
    options: [
      { label: "welcome — welcome", value: "welcome" },
      { label: "gender — multiple-choice", value: "gender" },
      // 2–4 options only from the chosen section
    ]
  }]
})
```

If the funnel has 4 or fewer steps, skip 3a and ask 3b directly with all steps.

### A4: Question type?

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

- If **choice**: `[{ label: "Multiple choice", value: "multiple-choice" }, { label: "Checkboxes", value: "checkboxes" }]`
- If **input**: `[{ label: "Email", value: "email" }, { label: "Text input", value: "text-input" }, { label: "Number picker", value: "number-picker" }]`
- If **content**: `[{ label: "Info card", value: "info-card" }, { label: "Welcome", value: "welcome" }, { label: "Checkout", value: "checkout" }, { label: "Result", value: "result" }]`

### A5: Type-specific config

Ask only the fields needed. For free-text, ask in a message.

*(See Config shapes reference at the bottom for field details.)*

### A6: Step ID

Ask in a message: "Step ID (unique slug, e.g. budget-question — no spaces)." Suggest a slug from the question text.

### A7: Confirm and insert

Summarize: funnel, position, step ID, type, config. Then call `insert_funnel_step`:

- `funnel_slug`: from A1
- `position`: "beginning" | "after_step" | "end"
- `after_step_id`: only when position is "after_step"
- `step_id`: from A6
- `type`: from A4
- `config`: object built from A5

---

## Flow B: Edit an existing step

### B1: Which funnel version?

Call `list_funnels`. Show draft/unpublished versions prominently.

```
AskUserQuestion({
  questions: [{
    header: "Which funnel version contains the step you want to edit?",
    options: [
      { label: "aurora-399-v2 (draft)", value: "aurora-399-v2" },
      // ... from list_funnels
    ]
  }]
})
```

> **Warning:** If the user picks a published/live version, remind them that editing a live funnel will break version history. Recommend creating a new draft version first (Flow D), then editing the draft.

### B2: Which step?

Call `get_funnel_steps` with the chosen slug. Show steps with their type:

**IMPORTANT: AskUserQuestion requires 2–4 options.** Use the same two-step drill-down as A3 if there are more than 4 steps.

```
AskUserQuestion({
  questions: [{
    header: "Which step do you want to edit?",
    options: [
      { label: "welcome — welcome", value: "welcome" },
      { label: "gender — multiple-choice", value: "gender" },
      // 2–4 options from the chosen section
    ]
  }]
})
```

### B3: Show current config and ask what to change

Read the full config from the `get_funnel_steps` response. Display it to the user:

> "Here's the current config for **[step_id]** (`[type]`):
> ```json
> { ... }
> ```
> What would you like to change? Describe the changes in plain language or paste the updated fields."

### B4: Confirm and edit

Construct the minimal config diff (only the fields that changed — the tool deep-merges). Summarize what will change, then call `edit_funnel_step`:

- `funnel_slug`: from B1
- `step_id`: from B2
- `config`: only the fields being updated (deep-merged with existing)

Report the updated config returned by the tool.

---

## Flow C: Remove a step

### C1: Which funnel version?

Same as B1 — call `list_funnels` and ask.

> **Warning:** Same caution as editing — prefer removing from a draft version, not the live one.

### C2: Which step to remove?

Call `get_funnel_steps`. Use the same 2–4 option drill-down if needed.

### C3: Confirm and remove

Show the step's label/question to the user and confirm:

> "This will permanently remove **[step_id]** (`[type]`: '[question/title]') from `[funnel_slug]`. The remaining steps will be re-sequenced. Are you sure?"

Ask with:
```
AskUserQuestion({
  questions: [{
    header: "Remove this step?",
    options: [
      { label: "Yes, remove it", value: "yes" },
      { label: "No, cancel", value: "no" }
    ]
  }]
})
```

If confirmed, call `remove_funnel_step`:
- `funnel_slug`: from C1
- `step_id`: from C2

Report success and the new step count.

---

## Flow D: Version management

```
AskUserQuestion({
  questions: [{
    header: "What do you want to do with versions?",
    options: [
      { label: "Create a new draft version (copy from existing)", value: "create" },
      { label: "Publish a draft version (make it live)", value: "publish" }
    ]
  }]
})
```

### D-Create: Create a new draft version

Call `list_funnels` and ask which version to copy from (typically the current published version). Then call `create_funnel_version`:

- `funnel_slug`: the version to copy from (e.g. `aurora-399-v1`)

Report back:
- New slug (e.g. `aurora-399-v2`)
- Preview URL (`?funnel=aurora-399-v2`)
- Number of steps copied
- Remind the user this is unpublished — they can edit it safely without affecting live traffic

### D-Publish: Publish a draft version

Call `list_funnels` and ask which **draft/unpublished** version to publish. Warn clearly:

> "Publishing `[draft_slug]` will **replace the current live version** (`[published_slug]`) for all users. This cannot be undone automatically."

Ask:
```
AskUserQuestion({
  questions: [{
    header: "Publish this version as live?",
    options: [
      { label: "Yes, publish it", value: "yes" },
      { label: "No, cancel", value: "no" }
    ]
  }]
})
```

If confirmed, call `publish_funnel_version`:
- `funnel_slug`: the draft slug to publish

Report the new live slug and the URL where users will see the updated funnel.

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

**Options format:** `[{ id: "yes", label: "Yes" }, { id: "no", label: "No" }]` — each needs `id` and `label`. Optional: `icon`, `description`.

**Parsing user input:** When user provides "id: Label" lines, split each line on the first colon. For bullets/features, split on newlines into string[]. For min/max/price/step, use `parseInt()`.

---

## Key principles

1. **Ask everything first** — Never call a tool until you have all required fields.
2. **One question at a time** — Wait for each response before proceeding.
3. **2–4 options only** — AskUserQuestion requires 2–4 options; use two-step drill-down for long step lists.
4. **Free-text = regular message** — Don't use AskUserQuestion for free-text inputs.
5. **Prefer draft versions for edits** — Always nudge toward editing an unpublished version to protect live traffic.
6. **Edit is a diff, not a replacement** — Only pass the fields that are actually changing to `edit_funnel_step`; the tool deep-merges.
7. **Confirm destructive actions** — Always confirm before removing a step or publishing a version.
