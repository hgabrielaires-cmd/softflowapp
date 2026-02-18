
-- 1. Adicionar role 'tecnico' ao enum existente
ALTER TYPE public.app_role ADD VALUE IF NOT EXISTS 'tecnico';

-- 2. Criar tabela filiais
CREATE TABLE public.filiais (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  nome TEXT NOT NULL,
  ativa BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.filiais ENABLE ROW LEVEL SECURITY;

-- Admin gerencia filiais
CREATE POLICY "Admin pode gerenciar filiais"
ON public.filiais FOR ALL
USING (is_admin(auth.uid()))
WITH CHECK (is_admin(auth.uid()));

-- Todos autenticados podem visualizar filiais ativas
CREATE POLICY "Autenticados podem ver filiais"
ON public.filiais FOR SELECT
TO authenticated
USING (true);

-- 3. Adicionar filial_id em profiles (FK para filiais)
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS filial_id UUID REFERENCES public.filiais(id) ON DELETE SET NULL;
