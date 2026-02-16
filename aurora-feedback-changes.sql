-- Aurora Funnel v1 Feedback Changes - SQL Script
-- Run this in Drizzle Studio SQL tab or via psql

-- 1. UPDATE WELCOME STEP (Landing Page Optimization)
UPDATE funnel_steps
SET config = jsonb_set(
  jsonb_set(
    jsonb_set(
      config,
      '{title}',
      '"Aurora is your intelligent mirror that helps you stay connected to your pregnancy wellness—without wearables or extra effort"'
    ),
    '{subtitle}',
    '"Take 2 minutes to unlock an exclusive offer"'
  ),
  '{image}',
  '"/aurora-mirror.png"'
)
WHERE step_id = 'welcome'
  AND funnel_id = (SELECT id FROM funnels WHERE slug = 'maternal-fetal-399');

-- Remove logo field if it exists
UPDATE funnel_steps
SET config = config - 'logo'
WHERE step_id = 'welcome'
  AND funnel_id = (SELECT id FROM funnels WHERE slug = 'maternal-fetal-399');


-- 2. UPDATE "INTRODUCING AURORA" INFO CARD
-- First update the step_id
UPDATE funnel_steps
SET step_id = 'info-introducing-aurora'
WHERE step_id = 'info-personalized'
  AND funnel_id = (SELECT id FROM funnels WHERE slug = 'maternal-fetal-399');

-- Then update the config
UPDATE funnel_steps
SET config = jsonb_set(
  jsonb_set(
    jsonb_set(
      config,
      '{title}',
      '"Introducing Aurora"'
    ),
    '{description}',
    '"Aurora offers a daily pregnancy check in, built into your mirror. Aurora brings gentle, everyday insight into your home. No straps, no charging, no extra steps. Just step in front of the mirror and stay more in tune as your body changes."'
    ),
    '{image}',
    '"/illustrations/aurora-mirror.png"'
)
WHERE step_id = 'info-introducing-aurora'
  AND funnel_id = (SELECT id FROM funnels WHERE slug = 'maternal-fetal-399');


-- 3. UPDATE CHECKOUT TO BETA SIGNUP
UPDATE funnel_steps
SET config = jsonb_set(
  jsonb_set(
    jsonb_set(
      jsonb_set(
        jsonb_set(
          config - 'originalPrice' - 'guarantee',
          '{title}',
          '"You''re on the Aurora early-access list"'
        ),
        '{subtitle}',
        '"Want to know what it is? Just book a 15-minute call with the Aurora team to learn more and get exclusive early-bird pricing"'
      ),
      '{price}',
      '0'
    ),
    '{buttonText}',
    '"Schedule My 15-Min Call"'
  ),
  '{features}',
  '["Personalized walkthrough based on your answers", "Ask your most important questions", "Receive insider access to Aurora demos", "Priority consideration for early-access", "Exclusive discounts and moving up in line"]'::jsonb
)
WHERE step_id = 'checkout'
  AND funnel_id = (SELECT id FROM funnels WHERE slug = 'maternal-fetal-399');


-- 4. ADD FREE TEXT QUESTIONS
-- Get the funnel UUID
DO $$
DECLARE
  funnel_uuid UUID;
BEGIN
  SELECT id INTO funnel_uuid FROM funnels WHERE slug = 'maternal-fetal-399';

  -- Insert 3 new free text question steps after email (sort_order 16, 17, 18)
  
  -- Step 1: Current Monitoring
  INSERT INTO funnel_steps (funnel_id, sort_order, step_id, type, config)
  VALUES (
    funnel_uuid,
    16,
    'current-monitoring-freetext',
    'text-input',
    '{"question": "How do you currently monitor your pregnancy health?", "placeholder": "Doctor visits, apps, wearables...", "multiline": true, "required": false}'::jsonb
  );

  -- Step 2: Missing Features
  INSERT INTO funnel_steps (funnel_id, sort_order, step_id, type, config)
  VALUES (
    funnel_uuid,
    17,
    'missing-features',
    'text-input',
    '{"question": "What''s missing from your current routine?", "placeholder": "Share what would help you feel more connected...", "multiline": true, "required": false}'::jsonb
  );

  -- Step 3: Feature Interest
  INSERT INTO funnel_steps (funnel_id, sort_order, step_id, type, config)
  VALUES (
    funnel_uuid,
    18,
    'feature-interest-freetext',
    'text-input',
    '{"question": "Which feature interests you most?", "placeholder": "Contactless monitoring, daily insights, partner involvement...", "multiline": true, "required": false}'::jsonb
  );

  -- Update sort_order for steps that come after (checkout and result)
  UPDATE funnel_steps
  SET sort_order = sort_order + 3
  WHERE funnel_id = funnel_uuid
    AND sort_order >= 16
    AND step_id NOT IN ('current-monitoring-freetext', 'missing-features', 'feature-interest-freetext');
END $$;


-- VERIFICATION QUERIES
-- Verify welcome step
SELECT step_id, config->'title' as title, config->'subtitle' as subtitle, config->'image' as image
FROM funnel_steps
WHERE step_id = 'welcome' AND funnel_id = (SELECT id FROM funnels WHERE slug = 'maternal-fetal-399');

-- Verify introducing aurora
SELECT step_id, config->'title' as title, config->'description' as description
FROM funnel_steps
WHERE step_id = 'info-introducing-aurora' AND funnel_id = (SELECT id FROM funnels WHERE slug = 'maternal-fetal-399');

-- Verify checkout
SELECT step_id, config->'title' as title, config->'price' as price, config->'buttonText' as buttonText
FROM funnel_steps
WHERE step_id = 'checkout' AND funnel_id = (SELECT id FROM funnels WHERE slug = 'maternal-fetal-399');

-- Verify new text input steps
SELECT step_id, sort_order, type, config->'question' as question
FROM funnel_steps
WHERE funnel_id = (SELECT id FROM funnels WHERE slug = 'maternal-fetal-399')
  AND type = 'text-input'
ORDER BY sort_order;

-- View all steps in order
SELECT sort_order, step_id, type
FROM funnel_steps
WHERE funnel_id = (SELECT id FROM funnels WHERE slug = 'maternal-fetal-399')
ORDER BY sort_order;
