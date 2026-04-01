alter table public.stock_movements add column if not exists batch_id uuid;

create index if not exists stock_movements_batch_id_idx on public.stock_movements(batch_id);

