-- Tabela para registrar dívidas a receber (quem te deve)
create table if not exists dividas (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete cascade not null,
  nome text not null,
  valor numeric(12,2) not null,
  data_vencimento date not null,
  descricao text,
  pago boolean default false,
  created_at timestamptz default now()
);

alter table dividas enable row level security;

create policy "Users can manage own dividas"
  on dividas for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);
