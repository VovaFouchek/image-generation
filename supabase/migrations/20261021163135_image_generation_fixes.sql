-- Follow-up to 20261021161707_image_generation.sql (applied migrations are never edited).

-- Advisor 0001: the composite FK items(batch_id, tenant_id) had no covering index, so deleting
-- a batch (cascade) would scan the items table.
create index generation_items_batch_tenant_idx
  on public.generation_items (batch_id, tenant_id);

-- p_source_batch_id is null for a single generation. A default makes it optional, which is how
-- the generated TypeScript types can express "absent"; parameters with defaults go last.
drop function public.create_generation_batch(text, text, uuid, jsonb, jsonb, jsonb);

create function public.create_generation_batch(
  p_tenant_id text,
  p_kind text,
  p_request jsonb,
  p_brief jsonb,
  p_items jsonb,
  p_source_batch_id uuid default null
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

revoke execute on function public.create_generation_batch(text, text, jsonb, jsonb, jsonb, uuid)
  from public, anon;
grant execute on function public.create_generation_batch(text, text, jsonb, jsonb, jsonb, uuid)
  to authenticated;
