
-- Add usuario_id to setores (referencing profiles, NOT auth.users)
ALTER TABLE public.setores 
ADD COLUMN IF NOT EXISTS usuario_id uuid REFERENCES public.profiles(user_id) ON DELETE SET NULL;

-- Create proposta send log table
CREATE TABLE public.crm_proposta_envios (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  oportunidade_id uuid REFERENCES public.crm_oportunidades(id) ON DELETE CASCADE NOT NULL,
  usuario_id uuid NOT NULL,
  instancia_usada text NOT NULL,
  setor_nome text,
  numero_destino text NOT NULL,
  contato_nome text,
  status_envio text NOT NULL DEFAULT 'enviado',
  tipo text NOT NULL DEFAULT 'proposta',
  erro text,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.crm_proposta_envios ENABLE ROW LEVEL SECURITY;

-- Policy: authenticated users can insert
CREATE POLICY "Authenticated can insert proposta envios"
ON public.crm_proposta_envios FOR INSERT TO authenticated
WITH CHECK (true);

-- Policy: authenticated users can read
CREATE POLICY "Authenticated can read proposta envios"
ON public.crm_proposta_envios FOR SELECT TO authenticated
USING (true);
