
-- Conversas
CREATE TABLE public.chat_conversas (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  protocolo text UNIQUE,
  canal text DEFAULT 'whatsapp',
  status text DEFAULT 'bot',
  numero_cliente text NOT NULL,
  nome_cliente text,
  setor_id uuid REFERENCES public.setores(id),
  atendente_id uuid REFERENCES public.profiles(user_id),
  cliente_id uuid REFERENCES public.clientes(id),
  contato_id uuid,
  filial_id uuid REFERENCES public.filiais(id),
  tags text[],
  canal_instancia text,
  bot_estado jsonb DEFAULT '{}',
  iniciado_em timestamptz DEFAULT now(),
  atendimento_iniciado_em timestamptz,
  encerrado_em timestamptz,
  tempo_espera_segundos int,
  tempo_atendimento_segundos int,
  nps_enviado boolean DEFAULT false,
  nps_nota int,
  nps_comentario text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Mensagens
CREATE TABLE public.chat_mensagens (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  conversa_id uuid REFERENCES public.chat_conversas(id) ON DELETE CASCADE,
  tipo text DEFAULT 'texto',
  conteudo text,
  media_url text,
  media_tipo text,
  media_nome text,
  remetente text DEFAULT 'cliente',
  atendente_id uuid REFERENCES public.profiles(user_id),
  evolution_message_id text,
  lida boolean DEFAULT false,
  created_at timestamptz DEFAULT now()
);

-- Fila de atendimento
CREATE TABLE public.chat_fila (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  conversa_id uuid REFERENCES public.chat_conversas(id) ON DELETE CASCADE,
  setor_id uuid REFERENCES public.setores(id),
  filial_id uuid REFERENCES public.filiais(id),
  posicao int,
  atribuido_a uuid REFERENCES public.profiles(user_id),
  status text DEFAULT 'aguardando',
  created_at timestamptz DEFAULT now()
);

-- Configurações do chat
CREATE TABLE public.chat_configuracoes (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  filial_id uuid REFERENCES public.filiais(id),
  ativo boolean DEFAULT true,
  horario_inicio time DEFAULT '08:00',
  horario_fim time DEFAULT '23:59',
  dias_semana int[] DEFAULT '{1,2,3,4,5,6}',
  mensagem_boas_vindas text DEFAULT 'Olá! Bem-vindo(a) à Softplus Tecnologia! 😊',
  mensagem_fora_horario text DEFAULT 'Olá! Nosso horário de atendimento é de {horario_inicio} às {horario_fim}. Deixe sua mensagem e retornaremos em breve!',
  mensagem_aguardando text DEFAULT 'Aguarde um instante, nossa equipe já vai lhe atender. 🤗\n⏳ Espera estimada: 1 a 10 min.',
  mensagem_encerramento text DEFAULT 'Obrigado pelo contato! Foi um prazer atendê-lo. 😊',
  mensagem_nps text DEFAULT 'Como você avalia nosso atendimento?\n1 - Péssimo 😞\n2 - Ruim 😕\n3 - Regular 😐\n4 - Bom 😊\n5 - Excelente 🌟',
  distribuicao_tipo text DEFAULT 'manual',
  max_conversas_por_atendente int DEFAULT 10,
  tempo_espera_estimado text DEFAULT '1 a 10 min',
  created_at timestamptz DEFAULT now()
);

-- Fluxo do bot
CREATE TABLE public.chat_bot_fluxo (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  filial_id uuid REFERENCES public.filiais(id),
  ordem int NOT NULL,
  pergunta text NOT NULL,
  tipo text DEFAULT 'opcoes',
  opcoes jsonb,
  campo_destino text,
  ativo boolean DEFAULT true,
  created_at timestamptz DEFAULT now()
);

-- Respostas rápidas
CREATE TABLE public.chat_respostas_rapidas (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  filial_id uuid REFERENCES public.filiais(id),
  setor_id uuid REFERENCES public.setores(id),
  atalho text NOT NULL,
  conteudo text NOT NULL,
  ativo boolean DEFAULT true,
  created_at timestamptz DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.chat_conversas ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.chat_mensagens ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.chat_fila ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.chat_configuracoes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.chat_bot_fluxo ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.chat_respostas_rapidas ENABLE ROW LEVEL SECURITY;

-- RLS Policies for chat_conversas
CREATE POLICY "Authenticated users can view chat_conversas"
  ON public.chat_conversas FOR SELECT TO authenticated USING (true);
CREATE POLICY "Authenticated users can insert chat_conversas"
  ON public.chat_conversas FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "Authenticated users can update chat_conversas"
  ON public.chat_conversas FOR UPDATE TO authenticated USING (true) WITH CHECK (true);

-- RLS Policies for chat_mensagens
CREATE POLICY "Authenticated users can view chat_mensagens"
  ON public.chat_mensagens FOR SELECT TO authenticated USING (true);
CREATE POLICY "Authenticated users can insert chat_mensagens"
  ON public.chat_mensagens FOR INSERT TO authenticated WITH CHECK (true);

-- RLS Policies for chat_fila
CREATE POLICY "Authenticated users can view chat_fila"
  ON public.chat_fila FOR SELECT TO authenticated USING (true);
CREATE POLICY "Authenticated users can insert chat_fila"
  ON public.chat_fila FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "Authenticated users can update chat_fila"
  ON public.chat_fila FOR UPDATE TO authenticated USING (true) WITH CHECK (true);

-- RLS Policies for chat_configuracoes
CREATE POLICY "Authenticated users can view chat_configuracoes"
  ON public.chat_configuracoes FOR SELECT TO authenticated USING (true);
CREATE POLICY "Authenticated users can insert chat_configuracoes"
  ON public.chat_configuracoes FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "Authenticated users can update chat_configuracoes"
  ON public.chat_configuracoes FOR UPDATE TO authenticated USING (true) WITH CHECK (true);

-- RLS Policies for chat_bot_fluxo
CREATE POLICY "Authenticated users can view chat_bot_fluxo"
  ON public.chat_bot_fluxo FOR SELECT TO authenticated USING (true);
CREATE POLICY "Authenticated users can insert chat_bot_fluxo"
  ON public.chat_bot_fluxo FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "Authenticated users can update chat_bot_fluxo"
  ON public.chat_bot_fluxo FOR UPDATE TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "Authenticated users can delete chat_bot_fluxo"
  ON public.chat_bot_fluxo FOR DELETE TO authenticated USING (true);

-- RLS Policies for chat_respostas_rapidas
CREATE POLICY "Authenticated users can view chat_respostas_rapidas"
  ON public.chat_respostas_rapidas FOR SELECT TO authenticated USING (true);
CREATE POLICY "Authenticated users can insert chat_respostas_rapidas"
  ON public.chat_respostas_rapidas FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "Authenticated users can update chat_respostas_rapidas"
  ON public.chat_respostas_rapidas FOR UPDATE TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "Authenticated users can delete chat_respostas_rapidas"
  ON public.chat_respostas_rapidas FOR DELETE TO authenticated USING (true);

-- Service role policies for edge functions (webhook)
CREATE POLICY "Service role full access chat_conversas"
  ON public.chat_conversas FOR ALL TO service_role USING (true) WITH CHECK (true);
CREATE POLICY "Service role full access chat_mensagens"
  ON public.chat_mensagens FOR ALL TO service_role USING (true) WITH CHECK (true);
CREATE POLICY "Service role full access chat_fila"
  ON public.chat_fila FOR ALL TO service_role USING (true) WITH CHECK (true);
CREATE POLICY "Service role full access chat_configuracoes"
  ON public.chat_configuracoes FOR ALL TO service_role USING (true) WITH CHECK (true);
CREATE POLICY "Service role full access chat_bot_fluxo"
  ON public.chat_bot_fluxo FOR ALL TO service_role USING (true) WITH CHECK (true);

-- Realtime
ALTER PUBLICATION supabase_realtime ADD TABLE public.chat_conversas, public.chat_mensagens, public.chat_fila;

-- Indexes
CREATE INDEX idx_chat_mensagens_conversa ON public.chat_mensagens(conversa_id, created_at);
CREATE INDEX idx_chat_conversas_status ON public.chat_conversas(status, setor_id);
CREATE INDEX idx_chat_conversas_numero ON public.chat_conversas(numero_cliente);
CREATE INDEX idx_chat_fila_status ON public.chat_fila(status, setor_id);

-- Updated_at trigger for chat_conversas
CREATE TRIGGER update_chat_conversas_updated_at
  BEFORE UPDATE ON public.chat_conversas
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
