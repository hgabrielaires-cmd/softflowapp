
-- Add mesa_atendimento_id to jornada_atividades
ALTER TABLE public.jornada_atividades ADD COLUMN mesa_atendimento_id uuid REFERENCES public.mesas_atendimento(id) ON DELETE SET NULL;

-- Create usuario_mesas junction table
CREATE TABLE public.usuario_mesas (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  mesa_id uuid NOT NULL REFERENCES public.mesas_atendimento(id) ON DELETE CASCADE,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(user_id, mesa_id)
);

ALTER TABLE public.usuario_mesas ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admin gerencia usuario_mesas" ON public.usuario_mesas
  FOR ALL USING (is_admin(auth.uid())) WITH CHECK (is_admin(auth.uid()));

CREATE POLICY "Autenticados visualizam usuario_mesas" ON public.usuario_mesas
  FOR SELECT USING (auth.uid() IS NOT NULL);
