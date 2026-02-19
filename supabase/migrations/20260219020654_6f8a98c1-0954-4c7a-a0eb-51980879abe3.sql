
-- Tabela de notificações do sistema
CREATE TABLE public.notificacoes (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  titulo TEXT NOT NULL,
  mensagem TEXT NOT NULL,
  tipo TEXT NOT NULL DEFAULT 'info', -- 'info', 'aviso', 'urgente'
  -- Destinatário: se user_id estiver preenchido, é para aquele usuário específico
  -- Se role estiver preenchida, é para todos com aquela role
  -- Se ambos nulos, é para todos os usuários
  destinatario_user_id UUID NULL,
  destinatario_role TEXT NULL,
  criado_por UUID NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.notificacoes ENABLE ROW LEVEL SECURITY;

-- Admin pode gerenciar todas as notificações
CREATE POLICY "Admin gerencia notificacoes"
ON public.notificacoes
FOR ALL
USING (is_admin(auth.uid()))
WITH CHECK (is_admin(auth.uid()));

-- Usuários veem notificações dirigidas a eles, à sua role, ou globais
CREATE POLICY "Usuarios visualizam notificacoes"
ON public.notificacoes
FOR SELECT
USING (
  auth.uid() IS NOT NULL
  AND (
    destinatario_user_id = auth.uid()
    OR destinatario_role IN (
      SELECT role::text FROM public.user_roles WHERE user_id = auth.uid()
    )
    OR (destinatario_user_id IS NULL AND destinatario_role IS NULL)
  )
);

-- Tabela de leitura de notificações (controla quais foram lidas por cada usuário)
CREATE TABLE public.notificacoes_lidas (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  notificacao_id UUID NOT NULL REFERENCES public.notificacoes(id) ON DELETE CASCADE,
  user_id UUID NOT NULL,
  lido_em TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(notificacao_id, user_id)
);

ALTER TABLE public.notificacoes_lidas ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Usuarios gerenciam suas leituras"
ON public.notificacoes_lidas
FOR ALL
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

-- Trigger para updated_at
CREATE TRIGGER update_notificacoes_updated_at
BEFORE UPDATE ON public.notificacoes
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();
