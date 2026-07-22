create table users (
  id text primary key,
  display_name text not null,
  status text not null default 'active',
  created_at timestamptz not null default now()
);

create type tenant_role as enum ('master_admin', 'admin', 'subadmin', 'employee');

create table memberships (
  tenant_id text not null references tenants(id) on delete cascade,
  user_id text not null references users(id) on delete cascade,
  role tenant_role not null,
  status text not null default 'active',
  created_at timestamptz not null default now(),
  primary key (tenant_id, user_id)
);

create table memory_events (
  id uuid primary key default gen_random_uuid(),
  tenant_id text not null references tenants(id) on delete cascade,
  project_id uuid not null references projects(id) on delete cascade,
  actor_id text not null references users(id),
  event_kind text not null,
  summary text not null,
  evidence jsonb not null,
  confidence numeric(4,3) not null check (confidence between 0 and 1),
  created_at timestamptz not null default now()
);

create table graph_snapshots (
  id uuid primary key default gen_random_uuid(),
  tenant_id text not null references tenants(id) on delete cascade,
  project_id uuid references projects(id) on delete cascade,
  source_revision text,
  node_count integer not null default 0,
  edge_count integer not null default 0,
  artifact_uri text,
  created_at timestamptz not null default now()
);

alter table memberships enable row level security;
alter table memory_events enable row level security;
alter table graph_snapshots enable row level security;

create policy tenant_memberships on memberships using (tenant_id = current_setting('app.tenant_id', true));
create policy tenant_memory_events on memory_events using (tenant_id = current_setting('app.tenant_id', true));
create policy tenant_graph_snapshots on graph_snapshots using (tenant_id = current_setting('app.tenant_id', true));

create index memory_events_project_time_idx on memory_events (tenant_id, project_id, created_at desc);
create index graph_snapshots_project_time_idx on graph_snapshots (tenant_id, project_id, created_at desc);
