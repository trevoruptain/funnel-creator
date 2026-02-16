-- Get pregnancy status step config to merge into welcome
SELECT step_id, type, config
FROM funnel_steps
WHERE step_id = 'pregnancy-status'
  AND funnel_id = (SELECT id FROM funnels WHERE slug = 'maternal-fetal-399-v1');

-- Update welcome step to include first question
UPDATE funnel_steps
SET config = jsonb_set(
  jsonb_set(
    jsonb_set(
      config,
      '{question}',
      '"What best describes you?"'
    ),
    '{options}',
    '["I''m currently pregnant", "I''m trying to conceive", "I''m a new parent", "I''m exploring for someone else"]'::jsonb
  ),
  '{hasQuestion}',
  'true'
)
WHERE step_id = 'welcome'
  AND funnel_id = (SELECT id FROM funnels WHERE slug = 'maternal-fetal-399-v1');

-- Delete the standalone pregnancy-status step (now merged into welcome)
DELETE FROM funnel_steps
WHERE step_id = 'pregnancy-status'
  AND funnel_id = (SELECT id FROM funnels WHERE slug = 'maternal-fetal-399-v1');

-- Decrement sort_order for all steps after the deleted pregnancy-status step
UPDATE funnel_steps
SET sort_order = sort_order - 1
WHERE funnel_id = (SELECT id FROM funnels WHERE slug = 'maternal-fetal-399-v1')
  AND sort_order > 1;

-- Verify
SELECT step_id, sort_order, config->'question' as question, config->'hasQuestion' as hasQuestion
FROM funnel_steps
WHERE funnel_id = (SELECT id FROM funnels WHERE slug = 'maternal-fetal-399-v1')
ORDER BY sort_order
LIMIT 3;
