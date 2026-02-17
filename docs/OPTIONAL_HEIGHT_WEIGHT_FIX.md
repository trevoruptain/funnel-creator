# Optional Fix: Restrict Height/Weight to Pregnant Users Only

## Current State

The `height` and `weight` questions currently show for:
- ✅ Pregnant users
- ✅ Trying to conceive users
- ✅ Planning to conceive users
- ❌ Supporting users

**Current condition:**
```json
{"stepId": "welcome", "operator": "not_equals", "value": "supporting"}
```

## Context from Audit

From the funnel audit (Feb 2026):
- **Page 4, S07 (Height)**: Flagged as "High-friction and early sensitive ask"
- **Recommendation**: "Move to post-opt-in progressive profiling"
- **Page 3 (Branch Coverage)**: Notes that S06 and S07 appeared in trying/planning paths with pregnancy-specific wording

The audit suggests these anthropometric questions may be too sensitive to ask early, especially for users who aren't currently pregnant.

## Decision Point

Should height/weight questions be asked for users who are only "trying" or "planning" to conceive?

**Arguments for restricting to pregnant-only:**
- These users aren't pregnant yet, so the data isn't immediately relevant
- Asking for sensitive body measurements early creates friction
- The audit specifically flagged this as "high-friction"

**Arguments for keeping current behavior:**
- Might be useful for future planning/tracking
- Could help with personalized recommendations even pre-pregnancy

## How to Fix (If Decided)

If you decide to restrict height/weight to **pregnant users only**, run this SQL:

```sql
-- Restrict height question to pregnant users only
UPDATE funnel_steps
SET show_if = '{"stepId": "welcome", "operator": "equals", "value": "pregnant"}'::jsonb
WHERE funnel_id = (SELECT id FROM funnels WHERE slug = 'maternal-fetal-399-v1')
  AND step_id = 'height';

-- Restrict weight question to pregnant users only
UPDATE funnel_steps
SET show_if = '{"stepId": "welcome", "operator": "equals", "value": "pregnant"}'::jsonb
WHERE funnel_id = (SELECT id FROM funnels WHERE slug = 'maternal-fetal-399-v1')
  AND step_id = 'weight';

-- Verify the changes
SELECT 
  step_id,
  sort_order,
  config->>'question' as question,
  show_if
FROM funnel_steps
WHERE funnel_id = (SELECT id FROM funnels WHERE slug = 'maternal-fetal-399-v1')
  AND step_id IN ('height', 'weight')
ORDER BY sort_order;
```

This would make height/weight follow the same logic as:
- `trimester` (pregnant only)
- `previous-children` (pregnant only)
- `current-monitoring` (pregnant only)
- `monitoring-gaps` (pregnant only)

## Related Files

- Original audit: `/Users/trevoruptain/funnel-creator/temp/funnel-feedback-presentation_page-*.jpg`
- Previous conditional logic fix: `/tmp/fix-conditional-logic.sql`
