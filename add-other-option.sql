-- Update specific questions to have "allowOther" flag instead of being free text

-- 1. "Which feature interests you most?" should be multiple choice with Other option
UPDATE funnel_steps
SET 
  type = 'multiple-choice',
  config = '{
    "question": "Which feature interests you most?",
    "options": [
      "Contactless monitoring",
      "Daily wellness insights", 
      "Track changes over time",
      "Beautiful bedroom design",
      "All of the above"
    ],
    "allowOther": true,
    "otherPlaceholder": "Tell us more..."
  }'::jsonb
WHERE step_id = 'feature-interest-freetext'
  AND funnel_id = (SELECT id FROM funnels WHERE slug = 'maternal-fetal-399-v1');

-- Also rename the step_id to reflect it's now multiple choice
UPDATE funnel_steps
SET step_id = 'feature-interest'
WHERE step_id = 'feature-interest-freetext'
  AND funnel_id = (SELECT id FROM funnels WHERE slug = 'maternal-fetal-399-v1');

-- 2. Keep "What's missing from your current routine?" as pure text input (correct as-is)
-- 3. Keep "How do you currently monitor" as pure text input (correct as-is)

-- Verify
SELECT step_id, type, config->'question' as question, config->'allowOther' as allowOther
FROM funnel_steps
WHERE funnel_id = (SELECT id FROM funnels WHERE slug = 'maternal-fetal-399-v1')
  AND step_id IN ('feature-interest', 'missing-features', 'current-monitoring-freetext')
ORDER BY sort_order;
