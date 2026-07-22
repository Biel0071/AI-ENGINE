-- Production persistence contract. The local MVP uses JsonStore; PostgreSQL replaces it without changing the API.
create extension if not exists pgcrypto;

create table tenants (
  id text primary key,
  name text not null,
  status text not null default 'active',
  created_at timestamptz not null default now()
);

create table projects (
  id uuid primary key default gen_random_uuid(),
  tenant_id text not null references tenants(id) on delete cascade,
  slug text not null,
  name text not null,
  description text not null default '',
  lifecycle text not null default 'connected',
  analysis_status text not null default 'pending',
  deployment_status text not null default 'not-configured',
  primary_language text,
  tags jsonb not null default '[]'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (tenant_id, slug)
);

create table repositories (
  id uuid primary key default gen_random_uuid(),
  tenant_id text not null references tenants(id) on delete cascade,
  project_id uuid not null references projects(id) on delete cascade,
  provider text not null,
  owner_name text not null,
  repository_name text not null,
  canonical_url text not null,
  visibility text not null,
  external_id text,
  default_branch text,
  last_synced_at timestamptz,
  unique (tenant_id, provider, owner_name, repository_name)
);

create table runs (
  id uuid primary key default gen_random_uuid(),
  tenant_id text not null references tenants(id) on delete cascade,
  project_id uuid not null references projects(id) on delete cascade,
  run_type text not null,
  status text not null,
  input jsonb not null default '{}'::jsonb,
  output jsonb,
  created_at timestamptz not null default now(),
  started_at timestamptz,
  finished_at timestamptz
);

create table deployments (
  id uuid primary key default gen_random_uuid(),
  tenant_id text not null references tenants(id) on delete cascade,
  project_id uuid not null references projects(id) on delete cascade,
  provider text,
  environment text not null,
  status text not null,
  source_revision text,
  public_url text,
  created_at timestamptz not null default now()
);

create table graph_nodes (
  id uuid primary key default gen_random_uuid(),
  tenant_id text not null references tenants(id) on delete cascade,
  project_id uuid references projects(id) on delete cascade,
  node_key text not null,
  node_type text not null,
  label text not null,
  properties jsonb not null default '{}'::jsonb,
  source_location text,
  created_at timestamptz not null default now(),
  unique (tenant_id, node_key)
);

create table graph_edges (
  id uuid primary key default gen_random_uuid(),
  tenant_id text not null references tenants(id) on delete cascade,
  project_id uuid references projects(id) on delete cascade,
  source_node_id uuid not null references graph_nodes(id) on delete cascade,
  target_node_id uuid not null references graph_nodes(id) on delete cascade,
  edge_type text not null,
  evidence text not null,
  confidence numeric(4,3),
  properties jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

alter table projects enable row level security;
alter table repositories enable row level security;
alter table runs enable row level security;
alter table deployments enable row level security;
alter table graph_nodes enable row level security;
alter table graph_edges enable row level security;

create policy tenant_projects on projects using (tenant_id = current_setting('app.tenant_id', true));
create policy tenant_repositories on repositories using (tenant_id = current_setting('app.tenant_id', true));
create policy tenant_runs on runs using (tenant_id = current_setting('app.tenant_id', true));
create policy tenant_deployments on deployments using (tenant_id = current_setting('app.tenant_id', true));
create policy tenant_graph_nodes on graph_nodes using (tenant_id = current_setting('app.tenant_id', true));
create policy tenant_graph_edges on graph_edges using (tenant_id = current_setting('app.tenant_id', true));
