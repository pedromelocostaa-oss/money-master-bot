alter table public.transacoes add column if not exists data_compra date;
alter table public.dividas alter column data_vencimento drop not null;