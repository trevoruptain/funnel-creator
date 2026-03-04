-- Guardrails for funnel version integrity:
-- 1) one row per (base_slug, version_number)
-- 2) at most one published version per base_slug

-- Fail early with a clear message if duplicate version rows already exist.
DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM "funnels"
    GROUP BY "base_slug", "version_number"
    HAVING COUNT(*) > 1
  ) THEN
    RAISE EXCEPTION 'Cannot add funnels_base_version_unique: duplicate (base_slug, version_number) rows exist in funnels.';
  END IF;
END $$;
--> statement-breakpoint

-- Fail early with a clear message if multiple published versions already exist.
DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM "funnels"
    WHERE "is_published" = true
    GROUP BY "base_slug"
    HAVING COUNT(*) > 1
  ) THEN
    RAISE EXCEPTION 'Cannot add funnels_one_published_per_base: multiple published versions exist for at least one base_slug.';
  END IF;
END $$;
--> statement-breakpoint

CREATE UNIQUE INDEX IF NOT EXISTS "funnels_base_version_unique"
ON "funnels" ("base_slug", "version_number");
--> statement-breakpoint

CREATE UNIQUE INDEX IF NOT EXISTS "funnels_one_published_per_base"
ON "funnels" ("base_slug")
WHERE "is_published" = true;
