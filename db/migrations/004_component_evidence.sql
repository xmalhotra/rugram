CREATE TABLE IF NOT EXISTS component_evidence (
  id TEXT PRIMARY KEY,
  component_id TEXT NOT NULL REFERENCES routine_components(id) ON DELETE CASCADE,
  claim TEXT NOT NULL,
  source_label TEXT NOT NULL,
  source_url TEXT NOT NULL,
  publisher TEXT,
  published_at TIMESTAMPTZ,
  captured_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  status TEXT NOT NULL DEFAULT 'review' CHECK (status IN ('draft', 'review', 'published', 'archived')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS component_evidence_component_idx ON component_evidence(component_id, status);
