
-- Tabela principal de automações
CREATE TABLE public.automacoes (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  nome TEXT NOT NULL,
  descricao TEXT,
  ativo BOOLEAN NOT NULL DEFAULT true,
  
  -- Gatilho
  gatilho_tipo TEXT NOT NULL, -- 'pedido_status', 'card_etapa', 'contrato_status', 'tempo_sem_acao'
  gatilho_config JSONB NOT NULL DEFAULT '{}'::jsonb,
  -- Ex pedido_status: {"status_de": "Desconto Aprovado", "status_para": "Aguardando Aprovação de Desconto"}
  -- Ex tempo_sem_acao: {"modulo": "financeiro", "horas": 24}
  
  -- Ação
  acao_tipo TEXT NOT NULL, -- 'whatsapp', 'notificacao', 'whatsapp_e_notificacao'
  acao_config JSONB NOT NULL DEFAULT '{}'::jsonb,
  -- Ex: {"template_id": "uuid", "destinatario_tipo": "role", "destinatario_valor": "financeiro", "usuario_ids": []}
  
  -- Lembrete
  lembrete_ativo BOOLEAN NOT NULL DEFAULT false,
  lembrete_intervalo_horas NUMERIC DEFAULT NULL,
  lembrete_maximo INTEGER DEFAULT NULL, -- máximo de lembretes antes de parar
  
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Log de execuções
CREATE TABLE public.automacoes_log (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  automacao_id UUID NOT NULL REFERENCES public.automacoes(id) ON DELETE CASCADE,
  referencia_tipo TEXT NOT NULL, -- 'pedido', 'card', 'contrato'
  referencia_id UUID NOT NULL,
  canal TEXT NOT NULL, -- 'whatsapp', 'notificacao'
  nivel INTEGER NOT NULL DEFAULT 1, -- 1 = primeiro disparo, 2+ = lembretes
  detalhes JSONB NOT NULL DEFAULT '{}'::jsonb,
  executado_em TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Índices
CREATE INDEX idx_automacoes_gatilho_tipo ON public.automacoes(gatilho_tipo);
CREATE INDEX idx_automacoes_ativo ON public.automacoes(ativo);
CREATE INDEX idx_automacoes_log_automacao_id ON public.automacoes_log(automacao_id);
CREATE INDEX idx_automacoes_log_referencia ON public.automacoes_log(referencia_tipo, referencia_id);

-- RLS
ALTER TABLE public.automacoes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.automacoes_log ENABLE ROW LEVEL SECURITY;

-- Policies automacoes
CREATE POLICY "Admin gerencia automacoes" ON public.automacoes FOR ALL USING (is_admin(auth.uid())) WITH CHECK (is_admin(auth.uid()));
CREATE POLICY "Autenticados visualizam automacoes" ON public.automacoes FOR SELECT USING (auth.uid() IS NOT NULL);

-- Policies automacoes_log
CREATE POLICY "Admin gerencia automacoes_log" ON public.automacoes_log FOR ALL USING (is_admin(auth.uid())) WITH CHECK (is_admin(auth.uid()));
CREATE POLICY "Autenticados visualizam automacoes_log" ON public.automacoes_log FOR SELECT USING (auth.uid() IS NOT NULL);

-- Trigger updated_at
CREATE TRIGGER update_automacoes_updated_at BEFORE UPDATE ON public.automacoes FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
