CREATE TYPE network_status AS ENUM ('draft','trial','active','suspended');
CREATE TYPE network_membership_status AS ENUM ('pending','active','rejected','suspended','left');
CREATE TYPE network_role AS ENUM ('network_admin','moderator','organization_admin','member');

CREATE TABLE networks (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  slug text NOT NULL UNIQUE,
  name text NOT NULL,
  legal_name text,
  website_url text,
  logo_url text,
  primary_color text NOT NULL DEFAULT '#183b34',
  secondary_color text NOT NULL DEFAULT '#c5a15a',
  status network_status NOT NULL DEFAULT 'draft',
  trial_ends_at timestamptz,
  enabled_modules text[] NOT NULL DEFAULT '{}',
  settings jsonb NOT NULL DEFAULT '{}',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE network_memberships (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  network_id uuid NOT NULL REFERENCES networks(id),
  organization_id uuid NOT NULL REFERENCES organizations(id),
  user_id uuid NOT NULL REFERENCES users(id),
  role network_role NOT NULL,
  status network_membership_status NOT NULL DEFAULT 'pending',
  invited_by_user_id uuid REFERENCES users(id),
  reviewed_by_user_id uuid REFERENCES users(id),
  reviewed_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX network_memberships_active_identity
  ON network_memberships(network_id,organization_id,user_id)
  WHERE status IN ('pending','active','suspended');
CREATE INDEX network_memberships_network_status ON network_memberships(network_id,status);
CREATE INDEX network_memberships_user_status ON network_memberships(user_id,status);

ALTER TABLE service_pages ADD COLUMN network_id uuid REFERENCES networks(id);

CREATE TABLE needs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL REFERENCES organizations(id),
  network_id uuid REFERENCES networks(id),
  title text NOT NULL,
  description text NOT NULL,
  category_id text NOT NULL,
  structured_data jsonb NOT NULL DEFAULT '{}',
  status text NOT NULL DEFAULT 'draft' CHECK (status IN ('draft','active','paused','closed')),
  created_by uuid NOT NULL REFERENCES users(id),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX needs_network_status ON needs(network_id,status);
