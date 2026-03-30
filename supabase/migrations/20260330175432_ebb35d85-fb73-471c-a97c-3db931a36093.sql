
-- Tabela de atendentes colaboradores por conversa
create table if not exists chat_conversa_atendentes (
  id uuid primary key default gen_random_uuid(),
  conversa_id uuid not null references chat_conversas(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  convidado_por uuid references auth.users(id),
  entrou_em timestamptz default now(),
  unique(conversa_id, user_id)
);

alter table chat_conversa_atendentes enable row level security;

create policy "Autenticados gerenciam colaboradores" on chat_conversa_atendentes
  for all using (auth.role() = 'authenticated');

alter publication supabase_realtime add table chat_conversa_atendentes;
