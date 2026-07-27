BEGIN;

CREATE SCHEMA IF NOT EXISTS fenix;

CREATE TABLE IF NOT EXISTS fenix.schema_migrations (
  version integer PRIMARY KEY,
  name text NOT NULL,
  applied_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS fenix.kernel_state (
  state_key text PRIMARY KEY,
  version bigint NOT NULL DEFAULT 0,
  document jsonb NOT NULL,
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT kernel_state_document_object CHECK (jsonb_typeof(document) = 'object')
);

INSERT INTO fenix.schema_migrations (version, name)
VALUES (1, 'kernel_state')
ON CONFLICT (version) DO NOTHING;

COMMIT;
