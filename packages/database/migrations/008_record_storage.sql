-- Individual, tenant-indexed operational records. The checkpoint row is only
-- a revision barrier/manifest; binary uploads are no longer part of it.
CREATE TABLE IF NOT EXISTS portal_records (
  collection text NOT NULL,
  record_key text NOT NULL,
  network_id text,
  ordinal integer NOT NULL,
  payload jsonb NOT NULL,
  media_refs jsonb NOT NULL DEFAULT '[]'::jsonb,
  media_hashes text[] NOT NULL DEFAULT '{}',
  fingerprint text NOT NULL,
  updated_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (collection, record_key)
);
CREATE INDEX IF NOT EXISTS portal_records_tenant_idx ON portal_records(network_id, collection);
CREATE INDEX IF NOT EXISTS portal_records_media_idx ON portal_records USING gin(media_hashes);
CREATE TABLE IF NOT EXISTS portal_media (
  hash text PRIMARY KEY,
  mime_type text NOT NULL,
  bytes bytea NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  CHECK (octet_length(bytes) <= 16777216)
);
