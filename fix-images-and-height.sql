-- Fix Image Paths and Complete Aurora Feedback Implementation
-- Run this in Drizzle Studio SQL tab

-- 1. FIX IMAGE PATHS (aurora-mirror.png doesn't exist, use mirror.png)
UPDATE funnel_steps
SET config = jsonb_set(config, '{image}', '"/illustrations/mirror.png"')
WHERE step_id = 'welcome'
  AND funnel_id = (SELECT id FROM funnels WHERE slug = 'maternal-fetal-399-v1');

UPDATE funnel_steps
SET config = jsonb_set(config, '{image}', '"/illustrations/mirror.png"')
WHERE step_id = 'info-introducing-aurora'
  AND funnel_id = (SELECT id FROM funnels WHERE slug = 'maternal-fetal-399-v1');


-- 2. UPDATE HEIGHT STEP - Add description for feet/inches context
UPDATE funnel_steps
SET config = jsonb_set(
  config,
  '{description}',
  '"We'\''ll convert this for you"'
)
WHERE step_id = 'height'
  AND funnel_id = (SELECT id FROM funnels WHERE slug = 'maternal-fetal-399-v1');


-- VERIFICATION
SELECT step_id, config->'image' as image
FROM funnel_steps
WHERE funnel_id = (SELECT id FROM funnels WHERE slug = 'maternal-fetal-399-v1')
  AND config ? 'image';
