-- Alinhar estrutura de api_keys e funções com backend
alter table public.api_keys
  add column if not exists active boolean default true;

-- Backfill se houver coluna 'revoked'
do $$
begin
  if exists (select 1 from information_schema.columns where table_schema='public' and table_name='api_keys' and column_name='revoked') then
    update public.api_keys set active = not revoked where active is null;
  end if;
end $$;

-- Garantir not null após backfill
alter table public.api_keys alter column active set not null;

-- Atualizar função de criação para marcar active=true
create or replace function public.api_create_key(p_name text, p_ttl_days int default 365)
returns table(api_key text, id uuid, name text, expires_at timestamptz)
language plpgsql
security definer
as $$
declare
  v_key text;
  v_hash text;
  v_id uuid;
  v_exp timestamptz;
begin
  v_key := encode(gen_random_bytes(24), 'hex');
  v_hash := encode(digest(v_key, 'sha256'), 'hex');
  v_exp := now() + make_interval(days => p_ttl_days);
  insert into public.api_keys (user_id, name, key_hash, expires_at, active)
  values (auth.uid(), p_name, v_hash, v_exp, true)
  returning api_keys.id into v_id;
  return query select v_key, v_id, p_name, v_exp;
end
$$;

-- Resolver com active=true + não revogada (se existir)
create or replace function public.api_resolve_user(p_api_key text)
returns uuid
language plpgsql
security definer
as $$
declare
  v_hash text;
  v_user uuid;
begin
  v_hash := encode(digest(p_api_key, 'sha256'), 'hex');
  select user_id into v_user
  from public.api_keys
  where key_hash = v_hash
    and active = true
    and (revoked is null or revoked = false)
    and (expires_at is null or expires_at > now())
  limit 1;
  if v_user is null then
    raise exception 'invalid api key' using errcode = '28000';
  end if;
  update public.api_keys set last_used_at = now() where key_hash = v_hash;
  return v_user;
end
$$;
