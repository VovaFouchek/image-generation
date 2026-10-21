-- Image generation feature
-- Tenant isolation is enforced here, by RLS under the signed-in user's session: the app
-- never uses the secret key in the generation flow. In the platform, tenants and
-- tenant_members already exist; they are created here so the policies have something to use.

-- ---------------------------------------------------------------------------------------------
-- Tenants and membership
-- ---------------------------------------------------------------------------------------------

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

-- ---------------------------------------------------------------------------------------------
-- Knowledge: layer 1 (Goldfizh vision, tenant_id is null) and layer 2 (per tenant), versioned.
-- Briefs record which versions they were built from.
-- ---------------------------------------------------------------------------------------------

create table public.knowledge_versions (
  id bigint generated always as identity primary key,
  tenant_id text references public.tenants (id) on delete cascade,
  version text not null,
  content jsonb not null,
  created_at timestamptz not null default now(),
  unique nulls not distinct (tenant_id, version)
);
create index knowledge_versions_tenant_created_idx
  on public.knowledge_versions (tenant_id, created_at desc);

-- ---------------------------------------------------------------------------------------------
-- Batches and items. A single generation is a batch of one, so both screens share one pipeline.
-- ---------------------------------------------------------------------------------------------

create table public.generation_batches (
  id uuid primary key default gen_random_uuid(),
  tenant_id text not null references public.tenants (id) on delete cascade,
  created_by uuid not null default auth.uid() references auth.users (id) on delete cascade,
  kind text not null check (kind in ('single', 'variations')),
  source_batch_id uuid,
  request jsonb not null,
  brief jsonb not null,
  created_at timestamptz not null default now(),
  -- Target of the composite foreign keys below: links can never cross tenants.
  unique (id, tenant_id),
  foreign key (source_batch_id, tenant_id)
    references public.generation_batches (id, tenant_id) on delete cascade,
  check ((kind = 'variations') = (source_batch_id is not null))
);
create index generation_batches_tenant_created_idx
  on public.generation_batches (tenant_id, created_at desc);
create index generation_batches_source_idx
  on public.generation_batches (source_batch_id, tenant_id);
create index generation_batches_created_by_idx on public.generation_batches (created_by);

create table public.generation_items (
  id uuid primary key default gen_random_uuid(),
  batch_id uuid not null,
  tenant_id text not null,
  index smallint not null check (index >= 0),
  variation jsonb not null,
  prompt jsonb not null,
  -- Provider settings snapshotted at planning time; every attempt uses these (R7).
  config jsonb not null,
  status text not null default 'queued'
    check (status in ('queued', 'running', 'succeeded', 'failed')),
  attempts smallint not null default 0 check (attempts >= 0),
  -- Lease: a run older than the lease (see claim_generation_item) may be claimed again.
  running_since timestamptz,
  model text,
  provider_request_id text,
  storage_path text,
  mime_type text,
  usage jsonb,
  duration_ms integer,
  error jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (batch_id, index),
  foreign key (batch_id, tenant_id)
    references public.generation_batches (id, tenant_id) on delete cascade,
  check (status <> 'running' or running_since is not null),
  check (
    status <> 'succeeded'
    or (storage_path is not null and mime_type is not null and model is not null)
  ),
  check (status <> 'failed' or error is not null)
);
create index generation_items_tenant_created_idx
  on public.generation_items (tenant_id, created_at desc);

-- ---------------------------------------------------------------------------------------------
-- Row level security. Membership is one indexed lookup per statement: tenant_members only
-- exposes the caller's own rows, so the subquery cannot recurse.
-- ---------------------------------------------------------------------------------------------

alter table public.tenants enable row level security;
alter table public.tenant_members enable row level security;
alter table public.knowledge_versions enable row level security;
alter table public.generation_batches enable row level security;
alter table public.generation_items enable row level security;

create policy tenant_members_select_own on public.tenant_members
  for select to authenticated
  using (user_id = (select auth.uid()));

create policy tenants_select_member on public.tenants
  for select to authenticated
  using (id in (select tm.tenant_id from public.tenant_members tm where tm.user_id = (select auth.uid())));

create policy knowledge_select on public.knowledge_versions
  for select to authenticated
  using (
    tenant_id is null
    or tenant_id in (select tm.tenant_id from public.tenant_members tm where tm.user_id = (select auth.uid()))
  );

create policy batches_select_member on public.generation_batches
  for select to authenticated
  using (tenant_id in (select tm.tenant_id from public.tenant_members tm where tm.user_id = (select auth.uid())));

create policy batches_insert_member on public.generation_batches
  for insert to authenticated
  with check (
    created_by = (select auth.uid())
    and tenant_id in (select tm.tenant_id from public.tenant_members tm where tm.user_id = (select auth.uid()))
  );

create policy items_select_member on public.generation_items
  for select to authenticated
  using (tenant_id in (select tm.tenant_id from public.tenant_members tm where tm.user_id = (select auth.uid())));

create policy items_insert_member on public.generation_items
  for insert to authenticated
  with check (tenant_id in (select tm.tenant_id from public.tenant_members tm where tm.user_id = (select auth.uid())));

create policy items_update_member on public.generation_items
  for update to authenticated
  using (tenant_id in (select tm.tenant_id from public.tenant_members tm where tm.user_id = (select auth.uid())))
  with check (tenant_id in (select tm.tenant_id from public.tenant_members tm where tm.user_id = (select auth.uid())));

-- No delete policies: nothing in the flow deletes rows.

-- ---------------------------------------------------------------------------------------------
-- Privileges. Explicit, because new tables are not exposed to the Data API automatically.
-- Signed-in users may only change an item's lifecycle columns, never its prompt or config.
-- ---------------------------------------------------------------------------------------------

revoke all on public.tenants, public.tenant_members, public.knowledge_versions,
  public.generation_batches, public.generation_items from anon, authenticated;

grant select on public.tenants, public.tenant_members, public.knowledge_versions,
  public.generation_batches, public.generation_items to authenticated;
grant insert on public.generation_batches, public.generation_items to authenticated;
grant update (
  status, attempts, running_since, model, provider_request_id, storage_path, mime_type,
  usage, duration_ms, error, updated_at
) on public.generation_items to authenticated;

-- Seed and the isolation test's cleanup (secret key) only.
grant select, insert, update, delete on public.tenants, public.tenant_members,
  public.knowledge_versions, public.generation_batches, public.generation_items to service_role;

-- ---------------------------------------------------------------------------------------------
-- Functions. SECURITY INVOKER: they run as the caller, so the policies above still apply.
-- ---------------------------------------------------------------------------------------------

-- Creates a batch and its items in one transaction (1 for an example, 15 for variations).
-- p_items: [{ "variation": {...}, "prompt": {...}, "config": {...} }, ...] in index order.
create function public.create_generation_batch(
  p_tenant_id text,
  p_kind text,
  p_source_batch_id uuid,
  p_request jsonb,
  p_brief jsonb,
  p_items jsonb
)
returns uuid
language plpgsql
security invoker
set search_path = ''
as $$
declare
  v_batch_id uuid;
begin
  insert into public.generation_batches (tenant_id, kind, source_batch_id, request, brief)
  values (p_tenant_id, p_kind, p_source_batch_id, p_request, p_brief)
  returning id into v_batch_id;

  insert into public.generation_items (batch_id, tenant_id, index, variation, prompt, config)
  select v_batch_id, p_tenant_id, (item.ordinality - 1)::smallint,
    item.value -> 'variation', item.value -> 'prompt', item.value -> 'config'
  from jsonb_array_elements(p_items) with ordinality as item (value, ordinality);

  return v_batch_id;
end;
$$;

-- Atomically moves an item to running and bumps attempts. Takes queued and failed items, and
-- running ones whose lease (150 s, longer than the route's maxDuration of 120 s) has expired.
-- Returns no row when the item is running or done, which keeps run and retry idempotent.
-- Keep the lease in sync with ITEM_LEASE_MS in the app.
create function public.claim_generation_item(p_batch_id uuid, p_item_id uuid)
returns setof public.generation_items
language sql
security invoker
set search_path = ''
as $$
  update public.generation_items
  set status = 'running',
    attempts = attempts + 1,
    running_since = now(),
    error = null,
    updated_at = now()
  where id = p_item_id
    and batch_id = p_batch_id
    and (
      status in ('queued', 'failed')
      or (status = 'running' and running_since < now() - interval '150 seconds')
    )
  returning *;
$$;

revoke execute on function public.create_generation_batch(text, text, uuid, jsonb, jsonb, jsonb)
  from public, anon;
revoke execute on function public.claim_generation_item(uuid, uuid) from public, anon;
grant execute on function public.create_generation_batch(text, text, uuid, jsonb, jsonb, jsonb)
  to authenticated;
grant execute on function public.claim_generation_item(uuid, uuid) to authenticated;

-- ---------------------------------------------------------------------------------------------
-- Storage: private bucket, files under <tenant_id>/<batch_id>/<item_id>-<attempt>.<ext>.
-- The attempt in the path keeps a late (superseded) upload from overwriting a newer one, so
-- no upsert and therefore no update policy is needed. SVG is the mock provider's placeholder;
-- the image route serves every file with a sandboxing CSP, so an SVG cannot run scripts.
-- ---------------------------------------------------------------------------------------------

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('generated-images', 'generated-images', false, 10485760,
  array['image/jpeg', 'image/png', 'image/webp', 'image/svg+xml'])
on conflict (id) do nothing;

create policy generated_images_select_member on storage.objects
  for select to authenticated
  using (
    bucket_id = 'generated-images'
    and (storage.foldername(name))[1] in (
      select tm.tenant_id from public.tenant_members tm where tm.user_id = (select auth.uid())
    )
  );

create policy generated_images_insert_member on storage.objects
  for insert to authenticated
  with check (
    bucket_id = 'generated-images'
    and (storage.foldername(name))[1] in (
      select tm.tenant_id from public.tenant_members tm where tm.user_id = (select auth.uid())
    )
  );
