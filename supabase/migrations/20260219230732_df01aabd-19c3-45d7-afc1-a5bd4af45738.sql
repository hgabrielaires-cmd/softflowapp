
-- Adicionar CNPJ e Inscrição Estadual na tabela filiais
ALTER TABLE public.filiais
  ADD COLUMN IF NOT EXISTS cnpj text,
  ADD COLUMN IF NOT EXISTS inscricao_estadual text;
