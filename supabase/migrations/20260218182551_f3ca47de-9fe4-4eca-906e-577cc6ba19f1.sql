
-- Tabela clientes
CREATE TABLE public.clientes (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  nome_fantasia text NOT NULL,
  razao_social text,
  cnpj_cpf text NOT NULL,
  contato_nome text,
  telefone text,
  email text,
  cidade text,
  uf text CHECK (char_length(uf) <= 2),
  filial_id uuid REFERENCES public.filiais(id),
  ativo boolean NOT NULL DEFAULT true,
  created_at timestamp with time zone NOT NULL DEFAULT now()
);

ALTER TABLE public.clientes ENABLE ROW LEVEL SECURITY;

-- Admin: CRUD total
CREATE POLICY "Admin gerencia clientes"
  ON public.clientes FOR ALL
  USING (public.is_admin(auth.uid()))
  WITH CHECK (public.is_admin(auth.uid()));

-- Financeiro: CRUD total
CREATE POLICY "Financeiro gerencia clientes"
  ON public.clientes FOR ALL
  USING (public.has_role(auth.uid(), 'financeiro'))
  WITH CHECK (public.has_role(auth.uid(), 'financeiro'));

-- Vendedor: SELECT somente da sua filial
CREATE POLICY "Vendedor visualiza clientes da sua filial"
  ON public.clientes FOR SELECT
  USING (
    public.has_role(auth.uid(), 'vendedor') AND
    filial_id = (SELECT filial_id FROM public.profiles WHERE user_id = auth.uid() LIMIT 1)
  );

-- Vendedor: INSERT somente na sua filial
CREATE POLICY "Vendedor cadastra clientes na sua filial"
  ON public.clientes FOR INSERT
  WITH CHECK (
    public.has_role(auth.uid(), 'vendedor') AND
    filial_id = (SELECT filial_id FROM public.profiles WHERE user_id = auth.uid() LIMIT 1)
  );

-- Tecnico: somente leitura
CREATE POLICY "Tecnico visualiza clientes"
  ON public.clientes FOR SELECT
  USING (public.has_role(auth.uid(), 'tecnico'));

-- Tabela modulos
CREATE TABLE public.modulos (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  nome text NOT NULL,
  ativo boolean NOT NULL DEFAULT true,
  created_at timestamp with time zone NOT NULL DEFAULT now()
);

ALTER TABLE public.modulos ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admin gerencia modulos"
  ON public.modulos FOR ALL
  USING (public.is_admin(auth.uid()))
  WITH CHECK (public.is_admin(auth.uid()));

CREATE POLICY "Autenticados visualizam modulos"
  ON public.modulos FOR SELECT
  USING (auth.uid() IS NOT NULL);

-- Tabela planos
CREATE TABLE public.planos (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  nome text NOT NULL,
  descricao text,
  ativo boolean NOT NULL DEFAULT true,
  created_at timestamp with time zone NOT NULL DEFAULT now()
);

ALTER TABLE public.planos ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admin gerencia planos"
  ON public.planos FOR ALL
  USING (public.is_admin(auth.uid()))
  WITH CHECK (public.is_admin(auth.uid()));

CREATE POLICY "Autenticados visualizam planos"
  ON public.planos FOR SELECT
  USING (auth.uid() IS NOT NULL);

-- Tabela plano_modulos
CREATE TABLE public.plano_modulos (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  plano_id uuid NOT NULL REFERENCES public.planos(id) ON DELETE CASCADE,
  modulo_id uuid NOT NULL REFERENCES public.modulos(id) ON DELETE CASCADE,
  inclui_treinamento boolean NOT NULL DEFAULT false,
  ordem integer NOT NULL DEFAULT 0,
  duracao_minutos integer,
  obrigatorio boolean NOT NULL DEFAULT false
);

ALTER TABLE public.plano_modulos ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admin gerencia plano_modulos"
  ON public.plano_modulos FOR ALL
  USING (public.is_admin(auth.uid()))
  WITH CHECK (public.is_admin(auth.uid()));

CREATE POLICY "Autenticados visualizam plano_modulos"
  ON public.plano_modulos FOR SELECT
  USING (auth.uid() IS NOT NULL);
