INSERT INTO users (id, handle, name, role, password_hash, avatar_url, bio, instagram_url) VALUES
  ('john', 'john', 'John', 'member', '$2b$12$A.uv1ljToQufJ92Ueh/3oenutzpBg7VdOsrfqGdbQ0W8MqCd1W0ta', NULL, NULL, NULL),
  ('cristiano', 'cristiano', 'Cristiano Ronaldo', 'creator', '$2b$12$A.uv1ljToQufJ92Ueh/3oenutzpBg7VdOsrfqGdbQ0W8MqCd1W0ta', 'https://upload.wikimedia.org/wikipedia/commons/8/8c/Cristiano_Ronaldo_2018.jpg', 'Reported morning recovery and match-preparation practices.', 'https://www.instagram.com/cristiano/'),
  ('messi', 'leomessi', 'Lionel Messi', 'creator', '$2b$12$A.uv1ljToQufJ92Ueh/3oenutzpBg7VdOsrfqGdbQ0W8MqCd1W0ta', 'https://upload.wikimedia.org/wikipedia/commons/b/b0/Lionel_Messi_2018.jpg', 'Reported preparation habits and nutrition context from football coverage.', 'https://www.instagram.com/leomessi/'),
  ('bolt', 'usainbolt', 'Usain Bolt', 'creator', '$2b$12$A.uv1ljToQufJ92Ueh/3oenutzpBg7VdOsrfqGdbQ0W8MqCd1W0ta', 'https://upload.wikimedia.org/wikipedia/commons/7/71/Usain_Bolt_portrait.jpg', 'Reported sprint-training and food context from Bolt interviews.', 'https://www.instagram.com/usainbolt/')
ON CONFLICT (id) DO UPDATE SET handle = EXCLUDED.handle, name = EXCLUDED.name, role = EXCLUDED.role, avatar_url = EXCLUDED.avatar_url, bio = EXCLUDED.bio, instagram_url = EXCLUDED.instagram_url, updated_at = now();

INSERT INTO routine_components (id, category, title, description, duration_label, suggested_time, evidence_level, source_label, source_url, safety_note, status, last_verified_at) VALUES
  ('cr7-water', 'Drink', 'Water on waking', 'Ronaldo described drinking water as part of his first-morning sequence before a cold plunge and shower.', 'First thing', '07:00', 'reported', 'WHOOP podcast', 'https://www.whoop.com/us/en/thelocker/podcast-272-cristiano-ronaldo-the-worlds-best-footballer-like-youve-never/', 'Personal routine context, not individual hydration advice.', 'published', now()),
  ('cr7-light', 'Recovery', 'Morning light exposure', 'Ronaldo said he gets a few minutes of morning light after his early routine to signal the start of the day.', '2–3 min', '07:15', 'reported', 'WHOOP podcast', 'https://www.whoop.com/us/en/thelocker/podcast-272-cristiano-ronaldo-the-worlds-best-footballer-like-youve-never/', NULL, 'published', now()),
  ('cr7-breathing', 'Mindset', 'Breathing before pressure', 'Ronaldo described rehearsing breathing and visualization so they are available before high-pressure football moments.', 'Before a key moment', '17:00', 'reported', 'WHOOP podcast', 'https://www.whoop.com/us/en/thelocker/podcast-272-cristiano-ronaldo-the-worlds-best-footballer-like-youve-never/', NULL, 'published', now()),
  ('messi-prep', 'Planning', 'Set up tomorrow tonight', 'Messi told Marca that he likes to leave the table ready for the next morning before going to sleep.', '5 min', '21:30', 'reported', 'GOAL / Marca interview', 'https://www.goal.com/en-ca/news/what-are-lionel-messis-diet-workout-and-training-secrets/212dtr4u2i61ayjpjiekd31l', NULL, 'published', now()),
  ('messi-mate', 'Drink', 'Hot, bitter mate', 'Messi told Marca that he likes his mate hot and bitter. This is personal preference, not hydration guidance.', 'With your routine', '08:00', 'reported', 'GOAL / Marca interview', 'https://www.goal.com/en-ca/news/what-are-lionel-messis-diet-workout-and-training-secrets/212dtr4u2i61ayjpjiekd31l', 'Personal preference, not hydration guidance.', 'published', now()),
  ('messi-food', 'Food', 'Whole-food meal foundation', 'Coverage of nutritionist Giuliano Poser’s work with Messi describes water, olive oil, whole grains, fresh fruit, and vegetables as the base.', 'With meals', '12:30', 'reported', 'GOAL report', 'https://www.goal.com/en-ca/news/what-are-lionel-messis-diet-workout-and-training-secrets/212dtr4u2i61ayjpjiekd31l', 'For personalised nutrition advice, consult a qualified professional.', 'published', now()),
  ('bolt-hydration', 'Drink', 'Hydrate across hot training days', 'Bolt told GQ that he stayed hydrated throughout Jamaica’s hot training days and did not eat much before workouts.', 'Throughout day', '09:00', 'reported', 'GQ interview', 'https://www.gq.com/story/the-real-life-diet-of-usain-bolt', 'Elite-athlete context, not a personalised hydration plan.', 'published', now()),
  ('bolt-fuel', 'Food', 'Light food before training', 'Bolt told GQ he ate only enough during the day to have energy for training and digest quickly.', 'Before training', '12:00', 'reported', 'GQ interview', 'https://www.gq.com/story/the-real-life-diet-of-usain-bolt', 'Personal needs vary with activity, health, and appetite.', 'published', now()),
  ('bolt-strength', 'Movement', 'Hamstring and leg work', 'Bolt told GQ his gym work included hamstring curls and leg extensions.', 'Workout', '16:00', 'reported', 'GQ profile', 'https://www.gq.com/story/runner-usain-bolt-training-secrets-and-diet', 'Elite-athlete context, not a personal training programme.', 'published', now())
ON CONFLICT (id) DO UPDATE SET category = EXCLUDED.category, title = EXCLUDED.title, description = EXCLUDED.description, duration_label = EXCLUDED.duration_label, suggested_time = EXCLUDED.suggested_time, evidence_level = EXCLUDED.evidence_level, source_label = EXCLUDED.source_label, source_url = EXCLUDED.source_url, safety_note = EXCLUDED.safety_note, status = EXCLUDED.status, last_verified_at = EXCLUDED.last_verified_at, updated_at = now();

UPDATE routine_components
SET placement = CASE WHEN id IN ('cr7-water', 'messi-food', 'bolt-fuel', 'messi-prep', 'cr7-breathing') THEN 'preference' ELSE 'timeline' END,
    profile_group = CASE id
      WHEN 'cr7-water' THEN 'Drink · Morning'
      WHEN 'messi-food' THEN 'Food · Breakfast'
      WHEN 'bolt-fuel' THEN 'Food · Pre-run'
      WHEN 'messi-prep' THEN 'Planning · Evening'
      WHEN 'cr7-breathing' THEN 'Mindset · Reset'
      ELSE NULL END,
    status = CASE WHEN id IN ('messi-mate', 'bolt-hydration', 'bolt-strength') THEN 'archived' ELSE status END,
    updated_at = now();

INSERT INTO routine_components (id, category, title, description, duration_label, suggested_time, placement, profile_group, evidence_level, source_label, source_url, safety_note, status, last_verified_at) VALUES
  ('daily-walk', 'Movement', '10-minute daylight walk', 'A short walk is a realistic way to build regular activity into a normal day.', '10 min', '08:00', 'timeline', NULL, 'reviewed', 'WHO physical activity', 'https://www.who.int/europe/news-room/fact-sheets/item/physical-activity', 'Adapt intensity and duration for your health, mobility, and local conditions.', 'published', now()),
  ('easy-run', 'Running', 'Easy conversational run', 'Keep the effort easy enough to speak in short sentences. Build a repeatable base, not a test day.', '20–30 min', '07:00', 'timeline', NULL, 'reviewed', 'WHO physical activity', 'https://www.who.int/europe/news-room/fact-sheets/item/physical-activity', 'Build gradually; seek qualified advice for pain, injury, or health concerns.', 'published', now()),
  ('strength-basics', 'Movement', 'Full-body strength session', 'Two focused strength sessions a week are a useful, achievable starting point for many adults.', '20 min', '18:00', 'timeline', NULL, 'reviewed', 'WHO physical activity', 'https://www.who.int/europe/news-room/fact-sheets/item/physical-activity', 'Choose movements and loads appropriate for your experience and health.', 'published', now()),
  ('sleep-window', 'Sleep', 'Protect a 7+ hour sleep window', 'Choose a bedtime that gives you enough room for sleep, then keep the wake time reasonably consistent.', 'Nightly', '22:30', 'timeline', NULL, 'reviewed', 'CDC sleep guidance', 'https://www.cdc.gov/sleep/about/index.html', 'Sleep needs vary. Speak with a clinician about persistent sleep problems.', 'published', now()),
  ('quinoa-breakfast', 'Food', 'Quinoa breakfast base', 'Keep a cooked-grain breakfast option ready and pair it with foods you enjoy.', 'Breakfast choice', 'Breakfast', 'preference', 'Food · Breakfast', 'reported', 'Qram preference', 'https://www.nhs.uk/live-well/eat-well/food-guidelines-and-food-labels/the-eatwell-guide/', 'A flexible food preference, not a personalised nutrition plan.', 'published', now())
ON CONFLICT (id) DO UPDATE SET category = EXCLUDED.category, title = EXCLUDED.title, description = EXCLUDED.description, duration_label = EXCLUDED.duration_label, suggested_time = EXCLUDED.suggested_time, placement = EXCLUDED.placement, profile_group = EXCLUDED.profile_group, evidence_level = EXCLUDED.evidence_level, source_label = EXCLUDED.source_label, source_url = EXCLUDED.source_url, safety_note = EXCLUDED.safety_note, status = EXCLUDED.status, last_verified_at = EXCLUDED.last_verified_at, updated_at = now();

INSERT INTO creator_component_publications (creator_id, component_id, weekday, start_time, status, sort_order) VALUES
  ('cristiano', 'cr7-water', 'Daily', '07:00', 'published', 1), ('cristiano', 'cr7-light', 'Daily', '07:15', 'published', 2), ('cristiano', 'cr7-breathing', 'Match day', '17:00', 'published', 3),
  ('messi', 'messi-prep', 'Daily', '21:30', 'published', 1), ('messi', 'messi-mate', 'Daily', '08:00', 'published', 2), ('messi', 'messi-food', 'Training day', '12:30', 'published', 3),
  ('bolt', 'bolt-hydration', 'Training day', '09:00', 'published', 1), ('bolt', 'bolt-fuel', 'Training day', '12:00', 'published', 2), ('bolt', 'bolt-strength', 'Training day', '16:00', 'published', 3)
ON CONFLICT (creator_id, component_id) DO UPDATE SET weekday = EXCLUDED.weekday, start_time = EXCLUDED.start_time, status = EXCLUDED.status, sort_order = EXCLUDED.sort_order, updated_at = now();

UPDATE creator_component_publications SET status = 'archived' WHERE component_id IN ('messi-mate', 'bolt-hydration', 'bolt-strength');
INSERT INTO creator_component_publications (creator_id, component_id, weekday, start_time, status, sort_order) VALUES
  ('bolt', 'easy-run', 'Training day', '07:00', 'published', 2)
ON CONFLICT (creator_id, component_id) DO UPDATE SET weekday = EXCLUDED.weekday, start_time = EXCLUDED.start_time, status = EXCLUDED.status, sort_order = EXCLUDED.sort_order, updated_at = now();

INSERT INTO component_evidence (id, component_id, claim, source_label, source_url, publisher, status)
SELECT CONCAT('seed-', id), id, description, source_label, source_url, source_label, 'published'
FROM routine_components
ON CONFLICT (id) DO UPDATE SET claim = EXCLUDED.claim, source_label = EXCLUDED.source_label, source_url = EXCLUDED.source_url, publisher = EXCLUDED.publisher, status = EXCLUDED.status, updated_at = now();
