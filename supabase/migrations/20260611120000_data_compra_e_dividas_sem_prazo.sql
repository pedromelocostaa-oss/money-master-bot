-- Permite registrar a data real da compra separadamente do mês de referência (competência)
alter table public.transacoes add column if not exists data_compra date;

-- Permite cadastrar dívidas a receber sem um prazo de cobrança definido
alter table public.dividas alter column data_vencimento drop not null;
