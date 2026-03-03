-- Add Meta campaign tracking columns to projects
ALTER TABLE "projects"
  ADD COLUMN IF NOT EXISTS "meta_campaign_id" text,
  ADD COLUMN IF NOT EXISTS "meta_ad_set_id" text;
--> statement-breakpoint

-- Add Meta ad tracking columns to ad_concepts
ALTER TABLE "ad_concepts"
  ADD COLUMN IF NOT EXISTS "meta_ad_id" text,
  ADD COLUMN IF NOT EXISTS "meta_creative_id" text;
