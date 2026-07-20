-- Operational persistence for authentication, matching, collaboration and network modules.

ALTER TABLE organizations ADD COLUMN IF NOT EXISTS submitted_at timestamptz;
ALTER TABLE organizations ADD COLUMN IF NOT EXISTS approved_at timestamptz;

CREATE TABLE IF NOT EXISTS password_reset_tokens (
  token_hash text PRIMARY KEY,
  user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  expires_at timestamptz NOT NULL,
  used_at timestamptz
);

CREATE TABLE IF NOT EXISTS categories (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  slug text NOT NULL UNIQUE,
  parent_id uuid REFERENCES categories(id),
  active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS matches (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  need_id uuid NOT NULL REFERENCES needs(id) ON DELETE CASCADE,
  service_page_id uuid NOT NULL REFERENCES service_pages(id) ON DELETE CASCADE,
  buyer_organization_id uuid NOT NULL REFERENCES organizations(id),
  provider_organization_id uuid NOT NULL REFERENCES organizations(id),
  score numeric(5,2) NOT NULL CHECK (score >= 0 AND score <= 100),
  components jsonb NOT NULL DEFAULT '{}',
  explanation jsonb NOT NULL DEFAULT '[]',
  status text NOT NULL DEFAULT 'buyer_review' CHECK (status IN (
    'buyer_review','deferred','rejected_by_buyer','released_anonymously',
    'rejected_by_provider','provider_interested','mutual_match','closed'
  )),
  buyer_decision_at timestamptz,
  provider_decision_at timestamptz,
  identity_released_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (need_id,service_page_id)
);

CREATE INDEX IF NOT EXISTS matches_buyer_status ON matches(buyer_organization_id,status);
CREATE INDEX IF NOT EXISTS matches_provider_status ON matches(provider_organization_id,status);

CREATE TABLE IF NOT EXISTS conversations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  match_id uuid NOT NULL UNIQUE REFERENCES matches(id) ON DELETE CASCADE,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS messages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  conversation_id uuid NOT NULL REFERENCES conversations(id) ON DELETE CASCADE,
  sender_user_id uuid NOT NULL REFERENCES users(id),
  body text NOT NULL CHECK (char_length(body) BETWEEN 1 AND 10000),
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS messages_conversation_created ON messages(conversation_id,created_at);

CREATE TABLE IF NOT EXISTS meetings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  match_id uuid NOT NULL REFERENCES matches(id) ON DELETE CASCADE,
  created_by_user_id uuid NOT NULL REFERENCES users(id),
  title text NOT NULL,
  starts_at timestamptz NOT NULL,
  duration_minutes integer NOT NULL CHECK (duration_minutes BETWEEN 15 AND 480),
  mode text NOT NULL CHECK (mode IN ('online','onsite')),
  location text,
  status text NOT NULL DEFAULT 'proposed' CHECK (status IN ('proposed','confirmed','cancelled')),
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS activities (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  match_id uuid REFERENCES matches(id) ON DELETE SET NULL,
  organization_id uuid REFERENCES organizations(id) ON DELETE SET NULL,
  actor_user_id uuid REFERENCES users(id) ON DELETE SET NULL,
  type text NOT NULL,
  visibility text NOT NULL CHECK (visibility IN ('shared','buyer_internal','provider_internal','platform_internal')),
  data jsonb NOT NULL DEFAULT '{}',
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS activities_match_created ON activities(match_id,created_at);
CREATE INDEX IF NOT EXISTS activities_organization_created ON activities(organization_id,created_at);

CREATE TABLE IF NOT EXISTS notifications (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  type text NOT NULL,
  data jsonb NOT NULL DEFAULT '{}',
  read_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS notifications_user_unread ON notifications(user_id,created_at) WHERE read_at IS NULL;

CREATE TABLE IF NOT EXISTS network_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  network_id uuid NOT NULL REFERENCES networks(id) ON DELETE CASCADE,
  title text NOT NULL,
  description text NOT NULL DEFAULT '',
  starts_at timestamptz NOT NULL,
  ends_at timestamptz,
  mode text NOT NULL CHECK (mode IN ('online','onsite','hybrid')),
  location text,
  capacity integer CHECK (capacity IS NULL OR capacity > 0),
  status text NOT NULL DEFAULT 'draft' CHECK (status IN ('draft','published','cancelled','completed')),
  created_by_user_id uuid NOT NULL REFERENCES users(id),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS network_event_registrations (
  event_id uuid NOT NULL REFERENCES network_events(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  status text NOT NULL DEFAULT 'registered' CHECK (status IN ('registered','waitlist','cancelled','attended','absent')),
  registered_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (event_id,user_id)
);

CREATE TABLE IF NOT EXISTS network_topics (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  network_id uuid NOT NULL REFERENCES networks(id) ON DELETE CASCADE,
  title text NOT NULL,
  body text NOT NULL,
  status text NOT NULL DEFAULT 'published' CHECK (status IN ('draft','published','archived')),
  created_by_user_id uuid NOT NULL REFERENCES users(id),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS network_documents (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  network_id uuid NOT NULL REFERENCES networks(id) ON DELETE CASCADE,
  title text NOT NULL,
  storage_key text NOT NULL,
  mime_type text NOT NULL,
  size_bytes bigint NOT NULL CHECK (size_bytes >= 0),
  visibility_roles text[] NOT NULL DEFAULT '{}',
  uploaded_by_user_id uuid NOT NULL REFERENCES users(id),
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS audit_log (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  actor_user_id uuid REFERENCES users(id) ON DELETE SET NULL,
  network_id uuid REFERENCES networks(id) ON DELETE SET NULL,
  organization_id uuid REFERENCES organizations(id) ON DELETE SET NULL,
  action text NOT NULL,
  entity_type text NOT NULL,
  entity_id text,
  before_data jsonb,
  after_data jsonb,
  ip_hash text,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS audit_log_created ON audit_log(created_at);
CREATE INDEX IF NOT EXISTS audit_log_network_created ON audit_log(network_id,created_at);
