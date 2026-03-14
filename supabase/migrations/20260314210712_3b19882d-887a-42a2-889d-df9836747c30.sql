
-- Adicionar coluna status_financeiro à tabela clientes
ALTER TABLE public.clientes 
ADD COLUMN IF NOT EXISTS status_financeiro TEXT NOT NULL DEFAULT 'Adimplente';
