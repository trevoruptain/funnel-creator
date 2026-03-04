---
name: funnel-creator
version: 0.3.0
description: Generate Meta ad concepts from product ideas — with Gemini image generation and DB persistence via MCP tools
allowed-tools:
  - AskUserQuestion
---

# Ad Creative Pipeline Skill

This skill helps Originators:
1) create Meta (Facebook/Instagram) ad concepts from product descriptions, and
2) create a brand-new funnel from scratch (new funnel v1 + initial steps) via MCP tools.

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
- `create_funnel` — create a brand-new draft funnel from scratch (v1 + initial steps)
- `publish_campaign` — create a Meta campaign (Campaign + Ad Set + Ads) from an approved project
- `activate_campaign` — flip a PAUSED campaign to ACTIVE

The following environment variables must be set for Meta publishing:
- `META_ACCESS_TOKEN` — Marketing API access token
- `META_AD_ACCOUNT_ID` — Ad account ID (numeric, without `act_` prefix)
- `META_PAGE_ID` — Facebook Page ID connected to the ad account

## How to Use

Run `/funnel-creator` to:
- start a new ad project, or
- create a new funnel from scratch.

---

## Instructions for Claude

When this skill is invoked, first determine which mode the user wants:

## Mode Selection (required first step)

Ask:
- "Do you want to (A) create a brand-new funnel from scratch, or (B) generate ad concepts/images?"

If the user chooses A, follow **Mode A** below and do not run the ad-concept flow.
If the user chooses B, follow the existing ad-concept flow in **Mode B**.

---

## Mode A: Create Funnel From Scratch

### A1) Collect structure inputs

Gather and confirm:
- `funnel_slug` (must be `<base>-v1`, e.g. `prenatal-confidence-v1`)
- `name` (human-readable funnel name)
- `price_variant` (optional)
- `version_label` (optional)
- `project_id` (optional; only if linking to an existing project)
- `theme` object
- ordered `steps` array, each containing:
  - `step_id`
  - `type`
  - `config`
  - optional `show_if` with `{ stepId, operator, value }`

### A2) Validate before tool call

Before calling `create_funnel`, ensure:
- slug ends with `-v1`
- `step_id` values are unique
- steps are in intended order
- any `show_if.stepId` references a step that exists in the funnel

### A3) Call `create_funnel`

Call MCP tool `create_funnel` with the confirmed payload.

### A4) Confirm result + next actions

After success, present:
- new funnel slug/base slug
- steps created count
- preview URL

Then ask if the user wants to:
- insert/edit/remove steps now, or
- publish when ready (typically after QA on draft).

---

## Mode B: Ad Creative Pipeline

When this mode is selected, follow these steps:

### Step 1: Project Intake

Use the `AskUserQuestion` tool to gather intake information. For each question below, call the tool with the appropriate parameters. Present questions ONE AT A TIME, waiting for the user's response before proceeding.

**Q1: What are you selling?**
```
AskUserQuestion({
  questions: [{
    header: "What are you selling?",
    options: [] // Free text - no predefined options
  }]
})
```

**Q2: Who is it for?**
```
AskUserQuestion({
  questions: [{
    header: "Who is it for? Describe your target customer.",
    options: [] // Free text
  }]
})
```

**Q3: What should people do after seeing the ad?**
```
AskUserQuestion({
  questions: [{
    header: "What should people do after seeing the ad?",
    options: [
      { label: "Sign up / join waitlist", value: "signup" },
      { label: "Visit website", value: "visit" },
      { label: "Buy now", value: "buy" },
      { label: "Download app", value: "download" }
    ]
  }]
})
```

**Q4: Link to send people to?**
```
AskUserQuestion({
  questions: [{
    header: "What's the URL where you want to send people? (Or say 'none yet')",
    options: [] // Free text
  }]
})
```

**Q5: Do you have a logo?**
```
AskUserQuestion({
  questions: [{
    header: "Do you have a logo?",
    options: [
      { label: "Yes (I'll provide the file path)", value: "yes" },
      { label: "No", value: "no" }
    ]
  }]
})
```
*If yes, ask for file path in next message*

**Q6: Do you have brand colors?**
```
AskUserQuestion({
  questions: [{
    header: "Do you have brand colors?",
    options: [
      { label: "Yes (I'll provide hex codes or description)", value: "yes" },
      { label: "No (generate a palette for me)", value: "no" }
    ]
  }]
})
```
*If yes, ask for colors in next message*

**Q7: Any reference images or ads you like?**
```
AskUserQuestion({
  questions: [{
    header: "Any reference images or ads whose style you like? (Optional - URLs, descriptions, or say 'skip')",
    options: [] // Free text
  }]
})
```

**Q8: Daily ad budget?**
```
AskUserQuestion({
  questions: [{
    header: "What's your daily ad budget in USD? (e.g. enter 50 for $50/day)",
    options: [] // Free text — they enter a dollar amount like "50" or "100"
  }]
})
```
*Store as a numeric string (e.g. "50"). This is used when publishing the campaign to Meta.*

**Q9: Where to run ads?**
```
AskUserQuestion({
  questions: [{
    header: "Where should these ads run?",
    options: [
      { label: "Instagram only", value: "instagram" },
      { label: "Facebook only", value: "facebook" },
      { label: "Both — let Meta optimize", value: "both" }
    ]
  }]
})
```

**Q10: US only or international?**
```
AskUserQuestion({
  questions: [{
    header: "Geographic targeting?",
    options: [
      { label: "US only", value: "us-only" },
      { label: "Expand internationally", value: "international" }
    ]
  }]
})
```

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

**5c.** For each concept, generate, review, and approve:
  1. Call `generate_ad_design` with the `ad_concept_id` from 5b
     - This generates structured design JSON including colors, typography, layout, and text overlays
     - Returns an `image_id` for the next step
  2. Call `generate_ad_image` with the returned `image_id`
     - This generates the actual 9:16 image using the design specification
     - Returns the Vercel Blob URL
  3. **Present image to Originator for review:**
     - Display the blob URL as a clickable link
     - Show design JSON preview (colors, visual style, mood, text overlays)
     - Ask: **"Approve this creative? Options: approve / refine / skip"**
  4. Based on response:
     - **approve**: Move to next concept
     - **refine**: Ask for feedback (e.g., "make it warmer", "more professional") → proceed to Step 6
     - **skip**: Move to next concept without saving

**5d.** Call `get_project` to confirm everything was saved, and present the final project summary with image URLs to the Originator.

### Step 6: Refinement (Optional)

If the Originator wants to refine a creative:

**6a.** Call `refine_ad_design` with:
- `image_id`: The ID of the image to refine
- `feedback`: Natural language feedback (e.g., "make it warmer", "more vibrant colors", "more professional tone")

**6b.** Call `regenerate_ad_image` with the same `image_id`
- This regenerates the image using the refined design JSON
- Returns new blob URL

**6c.** Present the regenerated image and ask for approval again

**6d.** Repeat refinement cycle as needed until approved

### Step 7: Meta Campaign Launch Guidance

Once all creatives are approved, provide the Originator with a comprehensive guide for launching their Meta ad campaign. Present this as a structured checklist covering ALL required fields:

**📋 Meta Ads Manager Setup Checklist**

---

#### **CAMPAIGN LEVEL**

**1. Campaign Objective** *(Choose one based on their goal from Q3)*
- ☐ **Awareness** — Maximize reach and brand recognition (for new product launches)
- ☐ **Traffic** — Drive clicks to website, landing page, app, or Messenger
- ☐ **Engagement** — Encourage likes, comments, shares, or video views
- ☐ **Leads** — Collect customer info via forms, Messenger, WhatsApp, or calls
- ☐ **App Promotion** — Get app installs and in-app activity
- ☐ **Sales** — Drive purchases, add-to-cart, or donations (requires Meta Pixel)

**2. Campaign Name**
- ☐ Use descriptive format: `[Product]_[Objective]_[Date]` (e.g., `Aurora_Leads_Feb2026`)

**3. Buying Type**
- ☐ Select **Auction** (recommended for flexibility and cost-efficiency)

**4. Special Ad Categories**
- ☐ Declare if applicable: Credit, Employment, Housing, Social Issues/Elections/Politics
- ☐ If none apply, select "None"

---

#### **AD SET LEVEL**

**5. Ad Set Name**
- ☐ Use descriptive format: `[Audience]_[Placement]` (e.g., `PregnantWomen_25-35_Feed`)

**6. Budget & Schedule**
- ☐ **Budget Type:** Daily budget OR Lifetime budget
- ☐ **Amount:** Based on Q8 answer (start with 20-30% of monthly budget for testing)
- ☐ **Schedule:** Set start date and end date (or run continuously)
- ☐ **Bid Strategy:** Leave as "Lowest cost" for beginners

**7. Audience Targeting** *(Use your inferred targeting from Step 2)*
- ☐ **Location:** US only (Q10) or expand to English-speaking countries
- ☐ **Age:** Based on audience analysis (e.g., 25-40 for maternal health)
- ☐ **Gender:** Based on product (e.g., All, Women, Men)
- ☐ **Language:** English (or specify)
- ☐ **Detailed Targeting:**
  - Interest categories: *(List the specific Meta interests from your analysis)*
  - Behaviors: *(E.g., "Expecting parents", "Engaged shoppers")*
  - Demographics: *(E.g., "Parents (all)", "New parents")*
- ☐ **Custom Audiences:** If available (website visitors, email list, app users)
- ☐ **Lookalike Audiences:** If you have 100+ conversions, create 1% lookalike

**8. Placements** *(Based on Q9 answer)*
- ☐ **Advantage+ Placements (RECOMMENDED):** Let Meta auto-optimize across all placements
- ☐ **Manual Placements:** Select specific placements:
  - **Facebook:** Feed, Stories, Reels, In-stream videos, Search results, In-article
  - **Instagram:** Feed, Stories, Reels, Profile feed, Explore
  - **Messenger:** Inbox, Stories
  - **Audience Network:** Native, banner, interstitial (external apps/websites)

**9. Performance Goal** *(Depends on objective)*
- ☐ For **Traffic:** Maximize clicks OR Landing page views
- ☐ For **Leads:** Maximize leads OR Lead form opens
- ☐ For **Sales:** Maximize purchases OR Add to cart
- ☐ For **Engagement:** Post engagement OR Video views

**10. Conversion Tracking** *(Critical for Sales/Leads objectives)*
- ☐ Install Meta Pixel on your website (if not already done)
- ☐ Select conversion event: Page View, Lead, Purchase, Add to Cart, etc.
- ☐ Verify pixel is firing correctly before launching

---

#### **AD LEVEL** *(Create one ad per approved concept)*

**For each concept (repeat for Concept 1, Concept 2, etc.):**

**11. Ad Name**
- ☐ Use concept name: `[Concept Name]_[Format]` (e.g., `PeaceOfMind_SingleImage`)

**12. Identity**
- ☐ Facebook Page: Your business page
- ☐ Instagram Account: Connect if running on Instagram (based on Q9)

**13. Ad Format** *(Choose based on creative type)*
- ☐ **Single Image** — Most common, use your 9:16 generated image
- ☐ **Single Video** — If you create video from image
- ☐ **Carousel** — 2-10 swipeable images/videos (good for showing features)
- ☐ **Collection** — Full-screen mobile storefront experience
- ☐ **Instant Experience** — Full-screen interactive landing page within app

**14. Creative Assets**
- ☐ **Primary Image/Video:** Upload your approved creative from Step 6
  - Recommended: 1080x1920 (9:16 ratio for Stories/Reels) or 1080x1080 (1:1 for Feed)
  - File size: Under 30MB for images, under 4GB for video
- ☐ **Primary Text:** Copy your **Body Copy** from the concept (125 chars max for mobile)
- ☐ **Headline:** Copy your **Headline** from the concept (40 chars max)
- ☐ **Description:** Optional supporting copy (30 chars)

**15. Call-to-Action Button** *(Choose based on Q3 and objective)*

**For Awareness/Traffic:**
- ☐ Learn More *(most versatile, works for most campaigns)*
- ☐ Watch More
- ☐ See Menu

**For Leads:**
- ☐ Sign Up
- ☐ Subscribe
- ☐ Apply Now
- ☐ Get Quote
- ☐ Download
- ☐ Message Us (opens Messenger)
- ☐ Call Now (mobile only, requires phone number)
- ☐ Contact Us

**For Sales:**
- ☐ Shop Now
- ☐ Buy Now
- ☐ Order Now
- ☐ Book Now
- ☐ Donate Now

**For App Promotion:**
- ☐ Install Now
- ☐ Use App
- ☐ Play Game

**16. Destination**
- ☐ **Website URL:** Paste URL from Q4
- ☐ Add UTM parameters for tracking: `?utm_source=facebook&utm_medium=cpc&utm_campaign=[campaign_name]&utm_content=[concept_name]`
- ☐ **OR** Instant Experience / Lead Form (if using that format)

**17. Display Link** *(Optional but recommended)*
- ☐ Show cleaner URL: your domain name only (e.g., `aurora.com`)

---

#### **BEFORE LAUNCH - FINAL CHECKS**

**18. Preview Your Ads**
- ☐ Use Ads Manager preview to see how ads look on:
  - Mobile Feed, Desktop Feed
  - Instagram Feed, Instagram Stories
  - Facebook Stories, Facebook Reels
- ☐ Verify all text is readable, image is clear, CTA makes sense

**19. Audience Size Check**
- ☐ Ensure audience size shows "Specific" (green, 100K-500K people ideal)
- ☐ Too broad (millions)? Add more detailed targeting
- ☐ Too narrow (<10K)? Expand age range or interests

**20. Compliance Review**
- ☐ Review Meta Advertising Policies (no misleading claims, must follow disclosure rules for health products)
- ☐ For health/wellness: Include disclaimers if making health claims
- ☐ No "before/after" images that imply unrealistic results

---

#### **POST-LAUNCH**

**21. Monitor Performance (First 48 Hours)**
- ☐ Check Ads Manager daily for:
  - CTR (Click-Through Rate): Aim for 1%+ for cold traffic
  - CPC (Cost Per Click): Should align with industry benchmarks ($0.50-$3.00 avg)
  - Relevance Score: 6+ is good, below 6 needs creative refresh
- ☐ If spending with no results after $50-100, pause and adjust targeting or creative

**22. Testing Plan** *(After initial results)*
- ☐ A/B test concepts against each other (run simultaneously, compare after 3-7 days)
- ☐ Test different audiences with same creative
- ☐ Test different placements (Stories vs Feed)
- ☐ Scale winning combos by increasing budget 20% every 3 days

---

**📌 RECOMMENDED LAUNCH STRATEGY**

Based on your budget (Q8: **[insert their answer]**) and objective (Q3: **[insert their answer]**):

1. **Week 1:** Run all concepts simultaneously with $10-20/day each
2. **Week 2:** Double down on top 2 performers, pause underperformers
3. **Week 3:** Scale winners by 20-50%, test new audiences
4. **Ongoing:** Refresh creatives every 2-3 weeks to avoid ad fatigue

---

**🎯 YOUR SPECIFIC SETUP** *(Pre-filled based on intake)*

- **Objective:** [Auto-fill based on Q3]
- **Placement:** [Auto-fill based on Q9]
- **Location:** [Auto-fill based on Q10]
- **Destination URL:** [Auto-fill from Q4]
- **Recommended CTA:** [Auto-suggest based on objective]
- **Targeting Interests:** [List from Step 2 analysis]

**Would you like me to create a tracking spreadsheet to monitor performance across all concepts?**

### Step 8: Publish to Meta (Optional)

After completing the launch checklist in Step 7, ask the Originator:

> "Would you like me to publish this campaign directly to Meta Ads now? I'll create the campaign, ad set, and one ad per approved creative — all set to PAUSED so you can review before going live."

**If yes:**

**8a.** Ask for confirmation of the daily budget:
> "Your intake says $[intake.budget]/day. Is that correct, or would you like a different amount for this campaign?"

**8b.** Call `publish_campaign` with:
- `project_id`: The project UUID from Step 5a
- `daily_budget_usd`: The confirmed daily budget in dollars (e.g. `50` for $50/day)
- `start_date`: Optional — today's date if they want to start now, or a future YYYY-MM-DD

**8c.** Report the results clearly:
- Campaign ID and name
- Ad set ID
- One row per ad concept showing the ad ID and whether it was created successfully
- The Ads Manager URL (direct link to the campaign)
- Remind them: **all ads are PAUSED — they must review in Ads Manager and activate**

**8d.** Ask if they want to go live now:
> "All ads are created but PAUSED. Would you like me to activate the campaign now?"

**If yes to activation:** Call `activate_campaign` with `project_id` and confirm activation.

**If no to publishing:** Skip to Step 9.

### Step 9: Next Steps

Inform the Originator:
- Their project has been saved to the database
- Images are stored on Vercel Blob and accessible via the blob URLs
- They can retrieve their project anytime via the `get_project` or `list_projects` MCP tools
- The data team can access project data via the `/api/data/projects` endpoint
- They can publish to Meta at any time by asking Claude to run `publish_campaign` with their `project_id`

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
5. Optionally: A live Meta campaign created (PAUSED or ACTIVE) with one ad per concept
6. Next steps clearly communicated
