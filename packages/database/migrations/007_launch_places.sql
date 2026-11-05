-- Dedicated ledger: not subject to snapshot rollback, deletion or recycling.
CREATE TABLE IF NOT EXISTS b2b_launch_places (
  campaign text NOT NULL,
  network_id text NOT NULL,
  slot integer NOT NULL CHECK (slot BETWEEN 1 AND 100000),
  user_id text NOT NULL,
  company_hash text NOT NULL,
  starts_on text NOT NULL,
  PRIMARY KEY (campaign, network_id, slot),
  UNIQUE (campaign, network_id, user_id),
  UNIQUE (campaign, network_id, company_hash)
);
