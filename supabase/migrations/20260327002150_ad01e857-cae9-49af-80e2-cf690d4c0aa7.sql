create table public.cliente_documentos (
  id uuid primary key default gen_random_uuid(),
  cliente_id uuid not null references public.clientes(id) on delete cascade,
  nome text not null,
  descricao text,
  url text not null,
  criado_em timestamptz default now()
);

alter table public.cliente_documentos enable row level security;

create policy "Autenticados podem gerenciar documentos" on public.cliente_documentos
  for all to authenticated using (true) with check (true);