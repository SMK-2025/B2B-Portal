CREATE EXTENSION IF NOT EXISTS pgcrypto;

CREATE TYPE profile_review_status AS ENUM ('draft','incomplete','submitted','automated_review','manual_review','changes_requested','approved','partially_approved','rejected','suspended');
CREATE TYPE organization_role AS ENUM ('buyer','provider','both');

CREATE TABLE organizations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  legal_name text NOT NULL,
  display_name text NOT NULL,
  role organization_role NOT NULL,
  website_url text,
  email_domain text,
  review_status profile_review_status NOT NULL DEFAULT 'draft',
  approved_version integer,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE users (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  email text NOT NULL UNIQUE,
  password_hash text NOT NULL,
  first_name text NOT NULL,
  last_name text NOT NULL,
  account_role text NOT NULL DEFAULT 'user' CHECK (account_role IN ('user','reviewer','platform_admin')),
  email_verified_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE email_verification_tokens (
  token_hash text PRIMARY KEY,
  user_id uuid NOT NULL REFERENCES users(id),
  expires_at timestamptz NOT NULL,
  used_at timestamptz
);

CREATE TABLE sessions (
  token_hash text PRIMARY KEY,
  user_id uuid NOT NULL REFERENCES users(id),
  expires_at timestamptz NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE memberships (
  organization_id uuid NOT NULL REFERENCES organizations(id),
  user_id uuid NOT NULL REFERENCES users(id),
  role text NOT NULL CHECK (role IN ('admin','member')),
  PRIMARY KEY (organization_id, user_id)
);

CREATE TABLE profile_versions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL REFERENCES organizations(id),
  version integer NOT NULL,
  payload jsonb NOT NULL,
  review_status profile_review_status NOT NULL DEFAULT 'draft',
  submitted_at timestamptz,
  approved_at timestamptz,
  created_by uuid NOT NULL REFERENCES users(id),
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (organization_id, version)
);

CREATE TABLE review_decisions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL REFERENCES organizations(id),
  reviewer_id uuid NOT NULL REFERENCES users(id),
  decision text NOT NULL CHECK (decision IN ('approved','changes_requested','rejected')),
  reason text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE service_pages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL REFERENCES organizations(id),
  title text NOT NULL,
  review_status profile_review_status NOT NULL DEFAULT 'draft',
  approved_version integer,
  is_public boolean NOT NULL DEFAULT false,
  matching_eligible boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE service_page_versions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  service_page_id uuid NOT NULL REFERENCES service_pages(id),
  version integer NOT NULL,
  description text NOT NULL,
  structured_data jsonb NOT NULL DEFAULT '{}',
  embedding jsonb,
  review_status profile_review_status NOT NULL DEFAULT 'draft',
  created_by uuid NOT NULL REFERENCES users(id),
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (service_page_id, version)
);
