ALTER TABLE "funnels"
  ADD COLUMN "base_slug" text,
  ADD COLUMN "version_number" integer NOT NULL DEFAULT 1,
  ADD COLUMN "is_published" boolean NOT NULL DEFAULT false;
--> statement-breakpoint

-- Backfill base_slug by stripping the -vN suffix from slug
UPDATE "funnels" SET "base_slug" = regexp_replace("slug", '-v\d+$', '');
--> statement-breakpoint

-- Backfill version_number by parsing the N from the -vN slug suffix (default 1 if no match)
UPDATE "funnels" SET "version_number" = COALESCE(
  NULLIF(substring("slug" from '-v(\d+)$'), '')::integer,
  1
);
--> statement-breakpoint

-- All existing funnels are the current live versions
UPDATE "funnels" SET "is_published" = true;
--> statement-breakpoint

ALTER TABLE "funnels" ALTER COLUMN "base_slug" SET NOT NULL;
