---
name: ad-pipeline
version: 0.2.0
description: Generate Meta ad concepts from product ideas — with Gemini image generation and DB persistence via MCP tools
---

# Ad Creative Pipeline Skill

This skill helps Originators create Meta (Facebook/Instagram) ad concepts from product descriptions. It handles project intake, infers audience targeting, generates ad creative concepts, creates images with Gemini 3 Pro, and persists everything to the database via MCP tools.

## What This Skill Does

Takes a product idea and generates ready-to-use ad creatives including:
- Audience targeting recommendations
- Brand tone and messaging strategy
- 3-5 distinct ad concepts with headlines, body copy, and CTAs
- AI-generated images for each concept (via Gemini 3 Pro)
- Everything stored in the database and images on Vercel Blob

## Prerequisites

The `funnel-creator` MCP server must be configured. It provides the following tools:
- `create_project` — persist project + intake data
- `add_ad_concepts` — batch insert ad concepts
- `generate_ad_image` — generate image with Gemini and upload to Vercel Blob
- `get_project` / `list_projects` — retrieve project data

## How to Use

Run `/ad-pipeline` to start a new ad project.

---

## Instructions for Claude

When this skill is invoked, follow these steps:

### Step 1: Project Intake

Ask the Originator these 10 questions **ONE AT A TIME**. Wait for their response to each question before moving to the next one.

**Important:**
- Only ask ONE question per response
- Do not proceed to the next question until the user has answered the current one
- If the user's answer is unclear or incomplete, clarify before moving forward

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

**Visual Direction:** *(Brief description of what the image should show)*

**Image Prompt:** *(Detailed, specific prompt for Gemini image generation. Include: subject, composition, camera angle, lighting, color palette, mood, style (photorealistic/lifestyle/studio), and text overlays if any. Be very specific.)*

**Why This Works:** *(1-2 sentences explaining the psychological hook or marketing principle)*

### Example Output:

```
## Concept 1: Peace of Mind Between Visits

**Angle:** Problem-focused — addresses anxiety gap between doctor appointments

**Headline:** "Know Your Baby's Okay. Every Single Day."

**Body Copy:** Between appointments, worry fills the gaps. Aurora gives you real-time health insights right from your mirror — no extra devices, no guesswork.

**CTA:** Join the Waitlist

**Visual Direction:** Expectant mother looking at her reflection with calm health metrics displayed.

**Image Prompt:** A pregnant woman in her late 20s standing in front of a modern bathroom mirror, soft morning light streaming in from the left. The mirror displays minimal, elegant health metrics in a soft blue-green UI overlay — heart rate, baby movement indicator. She is smiling gently, wearing a comfortable white top. The bathroom is modern and bright with marble countertop. Photorealistic style, warm and reassuring mood. Shallow depth of field focused on her face and the mirror. Aspect ratio 1:1.

**Why This Works:** Speaks directly to the emotional pain point (worry during pregnancy) and positions the product as the solution.
```

### Step 4: Iteration

After presenting the concepts, ask:
- "Which concept resonates most?"
- "Should I adjust tone, angle, or messaging for any of these?"
- "Would you like me to generate additional concepts with different approaches?"

Allow the Originator to revise, combine, or request more concepts.

### Step 5: Save to Database

Once the Originator is satisfied with the concepts:

**5a.** Call `create_project` with:
- `name`: Project name
- `product_description`: Q1 answer
- `target_audience`: Q2 answer
- `intake`: All 10 answers as an object
- `inferred`: The audience profile, targeting strategy, and brand tone from Step 2

**5b.** Call `add_ad_concepts` with the `project_id` from 5a and all approved concepts. Each concept should include the `image_prompt` field.

**5c.** For each concept, generate the design specification and then the image:
  1. Call `generate_ad_design` with the `ad_concept_id` from 5b
     - This generates structured design JSON including colors, typography, layout, and text overlays
     - Returns an `image_id` for the next step
  2. Call `generate_ad_image` with the returned `image_id`
     - This generates the actual 9:16 image using the design specification
     - Returns the Vercel Blob URL

**5d.** Call `get_project` to confirm everything was saved, and present the final project summary with image URLs to the Originator.

### Step 6: Next Steps

Inform the Originator:
- Their project has been saved to the database
- Images are stored on Vercel Blob and accessible via the blob URLs
- They can retrieve their project anytime via the `get_project` or `list_projects` MCP tools
- The data team can access project data via the `/api/data/projects` endpoint

---

## Key Principles

1. **Infer intelligently** — Don't ask what you can deduce from Q1 and Q2
2. **Show your reasoning** — Explain why you inferred certain audience traits
3. **Diversity of concepts** — Each concept should explore a different psychological trigger
4. **Mobile-first copy** — Keep body text concise and scannable
5. **Specific image prompts** — Be extremely detailed in prompts for Gemini; vague prompts produce generic images
6. **Match the voice** — Tone should align with both the product and the target audience

---

## Common Pitfalls to Avoid

- Generic headlines that could apply to any product
- Body copy that just repeats the headline
- Mismatched tone (e.g., casual language for serious medical products)
- All concepts using the same angle
- CTAs that don't match the stated objective (Q3)
- Vague image prompts (e.g., "a woman using the product" — instead specify lighting, angle, setting, colors)

---

## Success Criteria

At the end of this skill execution, the Originator should have:
1. Clear understanding of their target audience
2. 3-5 distinct ad concepts ready for creative execution
3. AI-generated images for each concept stored on Vercel Blob
4. Everything persisted in the database for retrieval
5. Next steps clearly communicated
