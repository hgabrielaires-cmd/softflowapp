-- Add status_projeto to distinguish paused vs refused cards
ALTER TABLE public.painel_atendimento
ADD COLUMN status_projeto text NOT NULL DEFAULT 'ativo';

-- Add etapa_origem_id to remember where card came from (for returning after standby)
ALTER TABLE public.painel_atendimento
ADD COLUMN etapa_origem_id uuid DEFAULT NULL;

COMMENT ON COLUMN public.painel_atendimento.status_projeto IS 'ativo, pausado, recusado';
COMMENT ON COLUMN public.painel_atendimento.etapa_origem_id IS 'Etapa de origem antes de ir para Standby, para eventual retorno';

-- Table for apontamento (user assignments for resolution)
CREATE TABLE public.painel_apontamentos (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  card_id uuid NOT NULL REFERENCES public.painel_atendimento(id) ON DELETE CASCADE,
  usuario_id uuid NOT NULL REFERENCES public.profiles(id),
  apontado_por uuid NOT NULL,
  motivo text,
  created_at timestamp with time zone NOT NULL DEFAULT now()
);

ALTER TABLE public.painel_apontamentos ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Autenticados visualizam apontamentos"
ON public.painel_apontamentos FOR SELECT
USING (auth.uid() IS NOT NULL);

CREATE POLICY "Admin gerencia apontamentos"
ON public.painel_apontamentos FOR ALL
USING (is_admin(auth.uid()))
WITH CHECK (is_admin(auth.uid()));

CREATE POLICY "Operacional gerencia apontamentos"
ON public.painel_apontamentos FOR ALL
USING (has_role(auth.uid(), 'operacional'::app_role))
WITH CHECK (has_role(auth.uid(), 'operacional'::app_role));

CREATE POLICY "Tecnico insere apontamentos"
ON public.painel_apontamentos FOR INSERT
WITH CHECK (has_role(auth.uid(), 'tecnico'::app_role));