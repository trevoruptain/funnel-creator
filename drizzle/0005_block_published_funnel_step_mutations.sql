-- Block any step mutation on published funnels.
-- This is a DB-level safety net in case app/tool guards are bypassed.

CREATE OR REPLACE FUNCTION "public"."prevent_published_funnel_steps_mutation"()
RETURNS trigger
LANGUAGE plpgsql
AS $$
DECLARE
  target_funnel_id uuid;
  target_is_published boolean;
BEGIN
  IF TG_OP = 'DELETE' THEN
    target_funnel_id := OLD.funnel_id;
  ELSE
    target_funnel_id := NEW.funnel_id;
  END IF;

  SELECT f.is_published
  INTO target_is_published
  FROM funnels f
  WHERE f.id = target_funnel_id;

  IF COALESCE(target_is_published, false) THEN
    RAISE EXCEPTION
      'Blocked % on funnel_steps: funnel % is published/live. Create an unpublished draft version first.',
      TG_OP,
      target_funnel_id;
  END IF;

  IF TG_OP = 'DELETE' THEN
    RETURN OLD;
  END IF;

  RETURN NEW;
END;
$$;
--> statement-breakpoint

DROP TRIGGER IF EXISTS "funnel_steps_block_published_insert" ON "funnel_steps";
DROP TRIGGER IF EXISTS "funnel_steps_block_published_update" ON "funnel_steps";
DROP TRIGGER IF EXISTS "funnel_steps_block_published_delete" ON "funnel_steps";
--> statement-breakpoint

CREATE TRIGGER "funnel_steps_block_published_insert"
BEFORE INSERT ON "funnel_steps"
FOR EACH ROW
EXECUTE FUNCTION "public"."prevent_published_funnel_steps_mutation"();
--> statement-breakpoint

CREATE TRIGGER "funnel_steps_block_published_update"
BEFORE UPDATE ON "funnel_steps"
FOR EACH ROW
EXECUTE FUNCTION "public"."prevent_published_funnel_steps_mutation"();
--> statement-breakpoint

CREATE TRIGGER "funnel_steps_block_published_delete"
BEFORE DELETE ON "funnel_steps"
FOR EACH ROW
EXECUTE FUNCTION "public"."prevent_published_funnel_steps_mutation"();
