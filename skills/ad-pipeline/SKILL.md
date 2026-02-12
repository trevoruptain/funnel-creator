---
name: ad-pipeline
version: 0.1.0
description: Generate Meta ad concepts from product ideas - handles intake, audience inference, and creative ideation
---

# Ad Creative Pipeline Skill

This skill helps Originators create Meta (Facebook/Instagram) ad concepts from product descriptions. It handles project intake, infers audience targeting, and generates multiple ad creative concepts.

## What This Skill Does

Takes a product idea and generates ready-to-use ad concepts including:
- Audience targeting recommendations
- Brand tone and messaging strategy
- 3-5 distinct ad concepts with headlines, body copy, and CTAs

## What This Skill Does NOT Do (Yet)

- Image generation via Gemini
- Publishing to Meta Marketing API
- Performance tracking
- Campaign management

## How to Use

Run `/ad-pipeline` to start a new ad project. Claude will guide you through the intake questions and generate ad concepts.

---

## Instructions for Claude

When this skill is invoked, follow these steps:

### Step 1: Project Intake

Ask the Originator these 10 questions. Present them conversationally, one at a time or in logical groups:

**Q1: What are you selling?**
*(Free text response)*

Example: "A smart mirror that monitors pregnancy health"

**Q2: Who is it for?**
*(Free text response)*

Example: "Pregnant women who want peace of mind between doctor visits"

**Q3: What should people do after seeing the ad?**
*(Present as multiple choice)*
- Sign up / join waitlist
- Visit website
- Buy now
- Download app

**Q4: Link to send people to?**
*(URL or "none yet")*

**Q5: Do you have a logo?**
*(yes → ask for file path, or no)*

**Q6: Do you have brand colors?**
*(yes → ask for hex codes or description like "navy and gold", no → will generate palette)*

**Q7: Any reference images or ads you like the look of?**
*(Optional — links, file paths, or descriptions like "like Apple ads" or "like Flo Health's Instagram")*

**Q8: Monthly ad budget?**
*(Present as multiple choice)*
- Under $500 (testing)
- $500–$2,000
- $2,000–$10,000
- $10,000+
- Not sure

**Q9: Where to run ads?**
*(Present as multiple choice)*
- Instagram only
- Facebook only
- Both — let Meta optimize

**Q10: US only or international?**
*(true/false — US only or expand internationally)*

### Step 2: Analyze and Infer

Based on the intake responses (especially Q1 and Q2), analyze and determine:

**Audience Profile:**
- Demographics (age range, gender, life stage)
- Psychographics (values, concerns, motivations)
- Pain points the product addresses
- Aspirations the product enables

**Targeting Strategy:**
- Meta interest categories to target
- Behavioral signals
- Lookalike audience suggestions
- Placement recommendations (Feed, Stories, Reels)

**Brand Tone:**
- Voice characteristics (professional, friendly, empowering, etc.)
- Messaging approach (educational, emotional, aspirational, practical)
- Language style (technical vs. accessible, formal vs. casual)

Present this analysis to the Originator for confirmation. Allow them to adjust or override any inferences.

### Step 3: Generate Ad Concepts

Create 3-5 distinct ad concepts, each with a different angle or hook. For each concept, provide:

**Concept [Number]: [Angle Name]**

**Angle:** *(What's the unique approach? Problem-focused? Benefit-focused? Social proof? Lifestyle? Urgency?)*

**Headline:** *(5-10 words, attention-grabbing)*

**Body Copy:** *(2-4 sentences, max 125 characters for optimal mobile display)*

**CTA:** *(Clear action, matches Q3 response — e.g., "Join Waitlist", "Learn More", "Shop Now")*

**Visual Direction:** *(Brief description of what the image should show — setting, subjects, mood, style)*

**Why This Works:** *(1-2 sentences explaining the psychological hook or marketing principle)*

### Example Output Format:

```
## Concept 1: Peace of Mind Between Visits

**Angle:** Problem-focused — addresses anxiety gap between doctor appointments

**Headline:** "Know Your Baby's Okay. Every Single Day."

**Body Copy:** Between appointments, worry fills the gaps. Aurora gives you real-time health insights right from your mirror — no extra devices, no guesswork.

**CTA:** Join the Waitlist

**Visual Direction:** Close-up of expectant mother looking at her reflection with soft, reassuring lighting. Mirror display shows simple, calm health metrics. Color palette: soft blues and warm whites.

**Why This Works:** Speaks directly to the emotional pain point (worry during pregnancy) and positions the product as the solution. Creates urgency through emotional resonance rather than scarcity.
```

### Step 4: Iteration

After presenting the concepts, ask:
- "Which concept resonates most?"
- "Should I adjust tone, angle, or messaging for any of these?"
- "Would you like me to generate additional concepts with different approaches?"

Allow the Originator to:
- Request revisions to specific concepts
- Ask for more concepts exploring different angles
- Combine elements from multiple concepts
- Request longer or shorter copy

### Step 5: Save Project Context

Once the Originator is satisfied, summarize the approved concepts and save them to a project file:

Create `/Users/trevoruptain/funnel-creator/projects/ad-pipeline/[project-name]/intake.json` with:
```json
{
  "project_name": "[from Q1]",
  "created_at": "[timestamp]",
  "intake": {
    "product": "[Q1 answer]",
    "audience": "[Q2 answer]",
    "objective": "[Q3 answer]",
    "link": "[Q4 answer]",
    "has_logo": "[Q5 answer]",
    "brand_colors": "[Q6 answer]",
    "references": "[Q7 answer]",
    "budget": "[Q8 answer]",
    "placements": "[Q9 answer]",
    "geography": "[Q10 answer]"
  },
  "inferred": {
    "audience_profile": "[from Step 2]",
    "targeting_strategy": "[from Step 2]",
    "brand_tone": "[from Step 2]"
  },
  "concepts": [
    {
      "concept_number": 1,
      "angle_name": "[name]",
      "angle": "[description]",
      "headline": "[text]",
      "body_copy": "[text]",
      "cta": "[text]",
      "visual_direction": "[description]",
      "why_this_works": "[explanation]"
    }
  ]
}
```

Inform the Originator that their project has been saved and they can iterate on it later by referencing the project name.

---

## Key Principles

1. **Infer intelligently** — Don't ask what you can deduce from Q1 and Q2
2. **Show your reasoning** — Explain why you inferred certain audience traits or chose specific angles
3. **Diversity of concepts** — Each concept should explore a meaningfully different psychological trigger or marketing approach
4. **Mobile-first copy** — Keep body text concise and scannable
5. **Match the voice** — Tone should align with both the product and the target audience
6. **Evidence-based** — Reference known marketing principles when explaining why concepts work

---

## Common Pitfalls to Avoid

- Generic headlines that could apply to any product
- Body copy that just repeats the headline
- Mismatched tone (e.g., casual language for serious medical products)
- All concepts using the same angle (e.g., all problem-focused or all benefit-focused)
- CTAs that don't match the stated objective (Q3)
- Overly technical language for consumer audiences
- Vague visual directions that don't guide creative execution

---

## Success Criteria

At the end of this skill execution, the Originator should have:
1. Clear understanding of their target audience
2. 3-5 distinct ad concepts ready for creative execution
3. Confidence in the strategic rationale behind each concept
4. Saved project file for future iteration
5. Next steps clearly communicated
