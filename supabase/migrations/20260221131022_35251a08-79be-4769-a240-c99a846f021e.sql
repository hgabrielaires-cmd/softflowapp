
-- 1. Tabela mesas_atendimento
CREATE TABLE public.mesas_atendimento (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  nome TEXT NOT NULL,
  descricao TEXT,
  ativo BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.mesas_atendimento ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admin gerencia mesas_atendimento" ON public.mesas_atendimento FOR ALL USING (is_admin(auth.uid())) WITH CHECK (is_admin(auth.uid()));
CREATE POLICY "Autenticados visualizam mesas_atendimento" ON public.mesas_atendimento FOR SELECT USING (auth.uid() IS NOT NULL);

CREATE TRIGGER update_mesas_atendimento_updated_at BEFORE UPDATE ON public.mesas_atendimento FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- 2. Tabela jornadas
CREATE TABLE public.jornadas (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  nome TEXT NOT NULL,
  descricao TEXT,
  filial_id UUID REFERENCES public.filiais(id),
  vinculo_tipo TEXT NOT NULL,
  vinculo_id UUID NOT NULL,
  ativo BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.jornadas ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admin gerencia jornadas" ON public.jornadas FOR ALL USING (is_admin(auth.uid())) WITH CHECK (is_admin(auth.uid()));
CREATE POLICY "Autenticados visualizam jornadas" ON public.jornadas FOR SELECT USING (auth.uid() IS NOT NULL);

CREATE TRIGGER update_jornadas_updated_at BEFORE UPDATE ON public.jornadas FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- 3. Tabela jornada_etapas
CREATE TABLE public.jornada_etapas (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  jornada_id UUID NOT NULL REFERENCES public.jornadas(id) ON DELETE CASCADE,
  nome TEXT NOT NULL,
  descricao TEXT,
  mesa_atendimento_id UUID REFERENCES public.mesas_atendimento(id),
  ordem INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.jornada_etapas ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admin gerencia jornada_etapas" ON public.jornada_etapas FOR ALL USING (is_admin(auth.uid())) WITH CHECK (is_admin(auth.uid()));
CREATE POLICY "Autenticados visualizam jornada_etapas" ON public.jornada_etapas FOR SELECT USING (auth.uid() IS NOT NULL);

CREATE TRIGGER update_jornada_etapas_updated_at BEFORE UPDATE ON public.jornada_etapas FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- 4. Tabela jornada_atividades
CREATE TABLE public.jornada_atividades (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  etapa_id UUID NOT NULL REFERENCES public.jornada_etapas(id) ON DELETE CASCADE,
  nome TEXT NOT NULL,
  descricao TEXT,
  horas_estimadas NUMERIC NOT NULL DEFAULT 0,
  checklist JSONB NOT NULL DEFAULT '[]'::jsonb,
  tipo_responsabilidade TEXT NOT NULL DEFAULT 'Interna',
  ordem INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.jornada_atividades ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admin gerencia jornada_atividades" ON public.jornada_atividades FOR ALL USING (is_admin(auth.uid())) WITH CHECK (is_admin(auth.uid()));
CREATE POLICY "Autenticados visualizam jornada_atividades" ON public.jornada_atividades FOR SELECT USING (auth.uid() IS NOT NULL);

CREATE TRIGGER update_jornada_atividades_updated_at BEFORE UPDATE ON public.jornada_atividades FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
