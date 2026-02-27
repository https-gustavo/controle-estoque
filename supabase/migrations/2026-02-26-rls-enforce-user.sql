alter table public.products enable row level security;
alter table public.sales enable row level security;
alter table public.store_settings enable row level security;

drop policy if exists products_sel on public.products;
drop policy if exists products_ins on public.products;
drop policy if exists products_upd on public.products;
drop policy if exists products_del on public.products;
create policy products_sel on public.products for select using (user_id = auth.uid());
create policy products_ins on public.products for insert with check (user_id = auth.uid());
create policy products_upd on public.products for update using (user_id = auth.uid()) with check (user_id = auth.uid());
create policy products_del on public.products for delete using (user_id = auth.uid());

drop policy if exists sales_sel on public.sales;
drop policy if exists sales_ins on public.sales;
drop policy if exists sales_upd on public.sales;
drop policy if exists sales_del on public.sales;
create policy sales_sel on public.sales for select using (user_id = auth.uid());
create policy sales_ins on public.sales for insert with check (user_id = auth.uid());
create policy sales_upd on public.sales for update using (user_id = auth.uid()) with check (user_id = auth.uid());
create policy sales_del on public.sales for delete using (user_id = auth.uid());

drop policy if exists store_settings_sel on public.store_settings;
drop policy if exists store_settings_ins on public.store_settings;
drop policy if exists store_settings_upd on public.store_settings;
drop policy if exists store_settings_del on public.store_settings;
create policy store_settings_sel on public.store_settings for select using (user_id = auth.uid());
create policy store_settings_ins on public.store_settings for insert with check (user_id = auth.uid());
create policy store_settings_upd on public.store_settings for update using (user_id = auth.uid()) with check (user_id = auth.uid());
create policy store_settings_del on public.store_settings for delete using (user_id = auth.uid());

drop function if exists public.set_user_id() cascade;
create function public.set_user_id()
returns trigger
language plpgsql
security definer
as $$
begin
  if new.user_id is null then
    new.user_id := auth.uid();
  end if;
  return new;
end;
$$;

drop function if exists public.lock_user_id() cascade;
create function public.lock_user_id()
returns trigger
language plpgsql
security definer
as $$
begin
  new.user_id := old.user_id;
  return new;
end;
$$;

drop trigger if exists trg_products_set_user on public.products;
create trigger trg_products_set_user before insert on public.products for each row execute function public.set_user_id();
drop trigger if exists trg_products_lock_user on public.products;
create trigger trg_products_lock_user before update on public.products for each row execute function public.lock_user_id();

drop trigger if exists trg_sales_set_user on public.sales;
create trigger trg_sales_set_user before insert on public.sales for each row execute function public.set_user_id();
drop trigger if exists trg_sales_lock_user on public.sales;
create trigger trg_sales_lock_user before update on public.sales for each row execute function public.lock_user_id();

drop trigger if exists trg_store_settings_set_user on public.store_settings;
create trigger trg_store_settings_set_user before insert on public.store_settings for each row execute function public.set_user_id();
drop trigger if exists trg_store_settings_lock_user on public.store_settings;
create trigger trg_store_settings_lock_user before update on public.store_settings for each row execute function public.lock_user_id();
