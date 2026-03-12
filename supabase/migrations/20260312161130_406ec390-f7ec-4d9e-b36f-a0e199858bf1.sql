
-- Comentários de oportunidades CRM
CREATE TABLE public.crm_comentarios (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  oportunidade_id uuid NOT NULL REFERENCES public.crm_oportunidades(id) ON DELETE CASCADE,
  user_id uuid NOT NULL,
  texto text NOT NULL,
  prioridade text NOT NULL DEFAULT 'normal',
  anexo_url text,
  anexo_nome text,
  parent_id uuid REFERENCES public.crm_comentarios(id) ON DELETE CASCADE,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- Curtidas de comentários CRM
CREATE TABLE public.crm_curtidas (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  comentario_id uuid NOT NULL REFERENCES public.crm_comentarios(id) ON DELETE CASCADE,
  user_id uuid NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(comentario_id, user_id)
);

-- Indexes
CREATE INDEX idx_crm_comentarios_oportunidade ON public.crm_comentarios(oportunidade_id);
CREATE INDEX idx_crm_comentarios_parent ON public.crm_comentarios(parent_id);
CREATE INDEX idx_crm_curtidas_comentario ON public.crm_curtidas(comentario_id);

-- RLS
ALTER TABLE public.crm_comentarios ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.crm_curtidas ENABLE ROW LEVEL SECURITY;

-- Policies for crm_comentarios
CREATE POLICY "Autenticados visualizam crm_comentarios" ON public.crm_comentarios
  FOR SELECT TO authenticated USING (auth.uid() IS NOT NULL);

CREATE POLICY "Autenticados inserem crm_comentarios" ON public.crm_comentarios
  FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Admin gerencia crm_comentarios" ON public.crm_comentarios
  FOR ALL TO authenticated USING (is_admin(auth.uid())) WITH CHECK (is_admin(auth.uid()));

-- Policies for crm_curtidas
CREATE POLICY "Autenticados visualizam crm_curtidas" ON public.crm_curtidas
  FOR SELECT TO authenticated USING (auth.uid() IS NOT NULL);

CREATE POLICY "Autenticados gerenciam proprias crm_curtidas" ON public.crm_curtidas
  FOR ALL TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Admin gerencia crm_curtidas" ON public.crm_curtidas
  FOR ALL TO authenticated USING (is_admin(auth.uid())) WITH CHECK (is_admin(auth.uid()));
