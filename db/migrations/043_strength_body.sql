-- Body weight and activity given only for personalised weights, without the rest of "About you".
-- Used when the member has no lift on record. Private.
CREATE TABLE IF NOT EXISTS strength_body (
  user_id TEXT PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
  weight_kg NUMERIC(5, 1) NOT NULL CHECK (weight_kg >= 20 AND weight_kg <= 300),
  lifestyle TEXT NOT NULL CHECK (lifestyle IN ('sedentary', 'light', 'active', 'athlete')),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
