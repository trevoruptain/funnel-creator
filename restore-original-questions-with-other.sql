-- CORRECTED SQL - Based on original TypeScript funnel + partner feedback
-- Partner wants: Keep original options + add "Other" field

-- 1. "current-monitoring" - CHECKBOXES (keep as checkboxes, not multiple choice!)
-- Original had: doctor, app, wearable, doppler, nothing
-- This should STAY as checkboxes with "Select all that apply"
UPDATE funnel_steps
SET 
  type = 'checkboxes',
  config = '{
    "question": "How do you currently monitor your pregnancy health?",
    "description": "Select all that apply",
    "options": [
      {"id": "doctor", "label": "Regular doctor visits", "icon": "👩‍⚕️"},
      {"id": "app", "label": "Pregnancy tracking app", "icon": "📱"},
      {"id": "wearable", "label": "Wearable device (Fitbit, Apple Watch, etc.)", "icon": "⌚"},
      {"id": "doppler", "label": "At-home fetal doppler", "icon": "🔊"},
      {"id": "nothing", "label": "I don''t track regularly", "icon": "🤷"}
    ],
    "required": false
  }'::jsonb
WHERE step_id IN ('current-monitoring', 'current-monitoring-freetext')
  AND funnel_id = (SELECT id FROM funnels WHERE slug = 'maternal-fetal-399-v1');

-- Rename if needed
UPDATE funnel_steps
SET step_id = 'current-monitoring'
WHERE step_id = 'current-monitoring-freetext'
  AND funnel_id = (SELECT id FROM funnels WHERE slug = 'maternal-fetal-399-v1');


-- 2. "monitoring-gaps" (was "missing-features") - MULTIPLE CHOICE with Other option
-- Original had 5 predefined options
UPDATE funnel_steps
SET 
  type = 'multiple-choice',
  step_id = 'monitoring-gaps',
  config = '{
    "question": "What''s missing from your current routine?",
    "options": [
      {"id": "peace", "label": "Peace of mind between doctor visits", "icon": "😌"},
      {"id": "understanding", "label": "Understanding what''s normal vs. concerning", "icon": "📚"},
      {"id": "partner", "label": "A way for my partner to feel involved", "icon": "👫"},
      {"id": "data", "label": "Data to share with my healthcare provider", "icon": "📋"},
      {"id": "nothing", "label": "I''m happy with my current routine", "icon": "✅"}
    ],
    "allowOther": true,
    "otherPlaceholder": "Share what would help you feel more connected..."
  }'::jsonb
WHERE step_id = 'missing-features'
  AND funnel_id = (SELECT id FROM funnels WHERE slug = 'maternal-fetal-399-v1');


-- 3. "feature-interest" - MULTIPLE CHOICE with Other option  
-- Original had 5 predefined options - keep them!
UPDATE funnel_steps
SET 
  type = 'multiple-choice',
  config = '{
    "question": "Which feature interests you most?",
    "options": [
      {"id": "contactless", "label": "Contactless monitoring", "description": "No wearables needed", "icon": "✨"},
      {"id": "daily", "label": "Daily wellness insights", "icon": "📊"},
      {"id": "trends", "label": "Track changes over time", "icon": "📈"},
      {"id": "design", "label": "Beautiful bedroom design", "icon": "🪞"},
      {"id": "all", "label": "All of the above", "icon": "🙌"}
    ],
    "allowOther": true,
    "otherPlaceholder": "Tell us more..."
  }'::jsonb
WHERE step_id IN ('feature-interest', 'feature-interest-freetext')
  AND funnel_id = (SELECT id FROM funnels WHERE slug = 'maternal-fetal-399-v1');

-- Rename if needed
UPDATE funnel_steps
SET step_id = 'feature-interest'
WHERE step_id = 'feature-interest-freetext'
  AND funnel_id = (SELECT id FROM funnels WHERE slug = 'maternal-fetal-399-v1');


-- Verify
SELECT step_id, type, config->'question' as question, 
       CASE WHEN config->>'allowOther' = 'true' THEN 'Yes' ELSE 'No' END as has_other,
       jsonb_array_length(config->'options') as num_options
FROM funnel_steps
WHERE funnel_id = (SELECT id FROM funnels WHERE slug = 'maternal-fetal-399-v1')
  AND step_id IN ('current-monitoring', 'monitoring-gaps', 'feature-interest')
ORDER BY sort_order;
