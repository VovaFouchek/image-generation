-- Image generation feature schema (draft for the PoC; the app runs on the in-memory store by default).
-- In the platform, tenants and tenant_members already exist; they are created here only so the
-- policies have something to reference.

create table public.tenants (
  id text primary key,
  name text not null,
  created_at timestamptz not null default now()
);

create table public.tenant_members (
  tenant_id text not null references public.tenants (id) on delete cascade,
  user_id uuid not null references auth.users (id) on delete cascade,
  role text not null check (role in ('admin', 'user')),
  primary key (tenant_id, user_id)
);
create index tenant_members_user_id_idx on public.tenant_members (user_id);

-- Layers 1 and 2: Goldfizh-wide knowledge (tenant_id is null) and per-tenant knowledge.
-- Structured content is versioned; generations store the version they were built from.
create table public.knowledge_versions (
  id bigint generated always as identity primary key,
  tenant_id text references public.tenants (id) on delete cascade,
  version text not null,
  content jsonb not null,
  created_at timestamptz not null default now(),
  unique nulls not distinct (tenant_id, version)
);

create table public.generation_batches (
  id uuid primary key default gen_random_uuid(),
  tenant_id text not null references public.tenants (id) on delete cascade,
  created_by uuid references auth.users (id) on delete set null,
  kind text not null check (kind in ('single', 'variations')),
  request jsonb not null,
  brief jsonb not null,
  provider text not null,
  created_at timestamptz not null default now()
);
create index generation_batches_tenant_created_idx on public.generation_batches (tenant_id, created_at desc);

create table public.generation_items (
  id uuid primary key default gen_random_uuid(),
  batch_id uuid not null references public.generation_batches (id) on delete cascade,
  tenant_id text not null references public.tenants (id) on delete cascade,
  index smallint not null,
  variation jsonb not null,
  prompt jsonb not null,
  prompt_template_version text not null,
  status text not null default 'queued' check (status in ('queued', 'running', 'succeeded', 'failed')),
  attempts smallint not null default 0,
  model text,
  provider_request_id text,
  storage_path text,
  error jsonb,
  updated_at timestamptz not null default now(),
  unique (batch_id, index)
);
create index generation_items_tenant_id_idx on public.generation_items (tenant_id);

-- Membership check used by every policy; evaluated once per statement via (select ...).
create schema if not exists private;

create or replace function private.is_tenant_member(p_tenant_id text)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1 from public.tenant_members
    where tenant_id = p_tenant_id and user_id = (select auth.uid())
  );
$$;
revoke execute on function private.is_tenant_member(text) from public, anon;
grant usage on schema private to authenticated;
grant execute on function private.is_tenant_member(text) to authenticated;

alter table public.tenants enable row level security;
alter table public.tenant_members enable row level security;
alter table public.knowledge_versions enable row level security;
alter table public.generation_batches enable row level security;
alter table public.generation_items enable row level security;

create policy tenants_select on public.tenants
  for select to authenticated using ((select private.is_tenant_member(id)));

create policy tenant_members_select_own on public.tenant_members
  for select to authenticated using (user_id = (select auth.uid()));

-- Global knowledge is readable by every signed-in user; tenant knowledge only by members.
create policy knowledge_select on public.knowledge_versions
  for select to authenticated
  using (tenant_id is null or (select private.is_tenant_member(tenant_id)));

create policy batches_select on public.generation_batches
  for select to authenticated using ((select private.is_tenant_member(tenant_id)));

create policy items_select on public.generation_items
  for select to authenticated using ((select private.is_tenant_member(tenant_id)));

-- Writes go through the server (secret key, bypasses RLS) after the tenant is resolved from the
-- session, so no insert/update policies are granted to clients.

insert into storage.buckets (id, name, public)
values ('generated-images', 'generated-images', false)
on conflict (id) do nothing;
