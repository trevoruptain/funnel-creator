-- Convert ALL THREE free text questions to multiple choice with "Other" option
-- Based on partner feedback: Add predefined options + Other field

-- 1. "How do you currently monitor your pregnancy health?"
UPDATE funnel_steps
SET 
  type = 'multiple-choice',
  config = '{
    "question": "How do you currently monitor your pregnancy health?",
    "options": [
      {"id": "doctor-visits", "label": "Regular doctor visits"},
      {"id": "apps", "label": "Pregnancy tracking apps"},
      {"id": "wearables", "label": "Wearable devices"},
      {"id": "manual-tracking", "label": "Manual tracking (journal, calendar)"},
      {"id": "not-tracking", "label": "Not actively tracking"}
    ],
    "allowOther": true,
    "otherPlaceholder": "Doctor visits, apps, wearables..."
  }'::jsonb
WHERE step_id = 'current-monitoring-freetext'
  AND funnel_id = (SELECT id FROM funnels WHERE slug = 'maternal-fetal-399-v1');

-- 2. "What's missing from your current routine?"
UPDATE funnel_steps
SET 
  type = 'multiple-choice',
  config = '{
    "question": "What''s missing from your current routine?",
    "options": [
      {"id": "daily-insights", "label": "Daily wellness insights"},
      {"id": "personalized-guidance", "label": "Personalized guidance"},
      {"id": "easy-tracking", "label": "Easy, effortless tracking"},
      {"id": "visual-feedback", "label": "Visual progress tracking"},
      {"id": "peace-of-mind", "label": "Peace of mind reassurance"}
    ],
    "allowOther": true,
    "otherPlaceholder": "Share what would help you feel more connected..."
  }'::jsonb
WHERE step_id = 'missing-features'
  AND funnel_id = (SELECT id FROM funnels WHERE slug = 'maternal-fetal-399-v1');

-- 3. "Which feature interests you most?" (already done in previous SQL, but including for completeness)
UPDATE funnel_steps
SET 
  type = 'multiple-choice',
  config = '{
    "question": "Which feature interests you most?",
    "options": [
      {"id": "contactless", "label": "Contactless monitoring", "description": "No wearables needed"},
      {"id": "insights", "label": "Daily wellness insights"},
      {"id": "tracking", "label": "Track changes over time"},
      {"id": "design", "label": "Beautiful bedroom design"},
      {"id": "all", "label": "All of the above"}
    ],
    "allowOther": true,
    "otherPlaceholder": "Tell us more..."
  }'::jsonb
WHERE step_id = 'feature-interest-freetext'
  AND funnel_id = (SELECT id FROM funnels WHERE slug = 'maternal-fetal-399-v1');

-- Rename step IDs to reflect they're now multiple choice (not freetext)
UPDATE funnel_steps
SET step_id = 'current-monitoring'
WHERE step_id = 'current-monitoring-freetext'
  AND funnel_id = (SELECT id FROM funnels WHERE slug = 'maternal-fetal-399-v1');

UPDATE funnel_steps
SET step_id = 'feature-interest'
WHERE step_id = 'feature-interest-freetext'
  AND funnel_id = (SELECT id FROM funnels WHERE slug = 'maternal-fetal-399-v1');

-- Verify all three are now multiple choice with allowOther
SELECT step_id, type, config->'question' as question, config->'allowOther' as has_other
FROM funnel_steps
WHERE funnel_id = (SELECT id FROM funnels WHERE slug = 'maternal-fetal-399-v1')
  AND step_id IN ('current-monitoring', 'missing-features', 'feature-interest')
ORDER BY sort_order;
