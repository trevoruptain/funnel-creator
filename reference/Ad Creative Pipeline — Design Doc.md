# Ad Creative Pipeline — Design Doc

## What We're Building

A reusable tool that takes a product idea and turns it into live Meta (Facebook/Instagram) ads — end to end, no code required.

**Input:** "I'm selling a smart mirror for pregnant women" **Output:** Ad images live on Meta, targeting the right audience, tracking conversions

This works for Aurora or any other product.

## How It Works

Originator describes product

        ↓

   \[1\] IDEATION

   Generate ad concepts, angles, copy

        ↓

   \[2\] IMAGE GENERATION

   Create ad visuals via Gemini

        ↓

   \[3\] REVIEW

   Originator approves or requests changes

        ↓

   \[4\] PUBLISH TO META

   Upload creatives, set targeting, go live

        ↓

   \[5\] TRACK

   Monitor performance, iterate

## Key Design Decisions

- **Claude Code skill** — not a web app. The Originator runs this through Claude, which orchestrates everything.  
- **Project-agnostic** — works by describing the product, not by hardcoding Aurora logic.  
- **Style guide system** — reuses the layered prompt template system already built (brand → purpose → use case).  
- **Meta Marketing API** — programmatic ad creation, not manual upload.  
- **Gemini API** — image generation via Google's model.  
- **Persistence**  — don’t lose project context, enable iteration (messaging, product concepts, etc)

## What Already Exists (from Aurora)

- ✅ Style guide hierarchy (12 docs) — prompt templates for image generation  
- ✅ Brand color system and naming conventions  
- ✅ Meta Pixel tracking code (event tracking pattern)  
- ✅ Sample Gemini-generated images (proof the approach works)

## Project Intake (10 Questions)

When an Originator starts a new project, Claude asks only what it can't infer. Everything else (tone, targeting interests, life stage, etc.) Claude figures out from the answers below.

**Q1: What are you selling?** *(free text)*

"A smart mirror that monitors pregnancy health"

**Q2: Who is it for?** *(free text)*

"Pregnant women who want peace of mind between doctor visits"

**Q3: What should people do after seeing the ad?** *(pick one)*

- Sign up / join waitlist  
- Visit website  
- Buy now  
- Download app

**Q4: Link to send people to?** *(URL or "none yet")*

**Q5: Do you have a logo?** *(yes → provide file, or no)*

**Q6: Do you have brand colors?** *(yes → provide hex codes or describe, e.g. "navy and gold". No → Claude generates a palette)*

**Q7: Any reference images or ads you like the look of?** *(optional — drop links, screenshots, or say "like Apple ads" / "like Flo Health's Instagram")*

**Q8: Monthly ad budget?** *(pick one)*

- Under $500 (testing)  
- $500–$2,000  
- $2,000–$10,000  
- $10,000+  
- Not sure

**Q9: Where to run ads?** *(pick one)*

- Instagram only  
- Facebook only  
- Both — let Meta optimize

**Q10: US only or international?** *(true/false — US only)*

---

*That's it. Claude infers everything else — ad copy tone, audience demographics, targeting interests, creative direction, image style — from Q1 and Q2. The Originator can always override later.*

## What Needs to Be Built

Everything below.

---

## Roadmap

### Phase 1: Foundation

- [ ] Set up project structure and Claude Code skill skeleton  
- [ ] Create `.agent/skills/ad-pipeline/SKILL.md` with skill instructions  
- [ ] Set up environment variable management (Meta API token, Gemini API key)  
- [ ] Verify Gemini API access and test image generation  
- [ ] Create a Meta Business account and App (if not already done)  
- [ ] Apply for Meta Marketing API access  
- [ ] Generate a Meta System User access token with `ads_management` permission

### Phase 2: Ideation Engine

- [ ] Build the product intake prompt (takes product description → extracts audience, pain points, angles)  
- [ ] Build the ad concept generator (takes intake → produces 3-5 ad concepts with headlines, body copy, CTA)  
- [ ] Build the image prompt generator (takes ad concept → produces Gemini-ready image prompt using style guide hierarchy)  
- [ ] Test end-to-end: product description → ad concepts → image prompts

### Phase 3: Image Generation

- [ ] Integrate Gemini API for image generation  
- [ ] Build batch generation (multiple images per concept)  
- [ ] Add image review step (display generated images for approval)  
- [ ] Build regeneration flow (Originator says "make it warmer" → adjust prompt → regenerate)  
- [ ] Save approved images to organized output folder

### Phase 4: Meta Publishing

- [ ] Build Meta Marketing API client (create campaign, ad set, ad creative)  
- [ ] Implement image upload to Meta (images → Meta Ad Account media library)  
- [ ] Build campaign creation flow (objective, budget, schedule)  
- [ ] Build audience targeting (interests, demographics, lookalikes)  
- [ ] Build ad creative assembly (image \+ headline \+ body \+ CTA \+ link)  
- [ ] Test end-to-end: approved images → live Meta ad  
- [ ] Add Meta Pixel integration (connect tracking to campaign)

### Phase 5: Polish & Generalization

- [ ] Create project config format (JSON/YAML per project — brand colors, audience, product details)  
- [ ] Build "new project" flow (Claude asks questions → generates project config)  
- [ ] Add ad performance monitoring (pull metrics from Meta API)  
- [ ] Add iteration flow (low-performing ad → new concepts → regenerate)  
- [ ] Write documentation for non-technical Originators  
- [ ] Test with a second project (not Aurora) to validate generalization

---

## Open Questions

1. **Meta API approval timeline** — Marketing API access can take days to weeks. Need to start this early.  
2. **Budget management** — Should the tool set budgets automatically or always ask the Originator?  
3. **A/B testing** — Should we auto-create multiple ad variants per concept?  
4. **Landing pages** — The quiz/funnel app exists but is separate. Should this pipeline also generate landing page URLs, or does the Originator provide them?

---

## Success Criteria

An Originator with zero technical ability can:

1. Describe their product in plain English  
2. See generated ad concepts and images  
3. Approve or request changes  
4. Have ads go live on Meta  
5. See how their ads are performing

All through Claude. No dashboards, no code, no manual uploads.  
