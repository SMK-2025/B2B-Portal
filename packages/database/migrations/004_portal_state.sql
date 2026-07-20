-- Transactional checkpoint of the complete operational portal state.
-- The normalized tables remain the long-term reporting and query model.
CREATE TABLE IF NOT EXISTS portal_state (
  id text PRIMARY KEY,
  payload jsonb NOT NULL,
  revision bigint NOT NULL DEFAULT 1,
  updated_at timestamptz NOT NULL DEFAULT now()
);
