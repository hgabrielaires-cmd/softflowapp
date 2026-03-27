
-- Chat Interno: conversas, participantes, mensagens, leituras

CREATE TABLE public.chat_interno_conversas (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tipo text NOT NULL DEFAULT 'direto',
  nome text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

CREATE OR REPLACE FUNCTION public.validate_chat_interno_tipo()
  RETURNS trigger LANGUAGE plpgsql SET search_path TO 'public' AS $$
BEGIN
  IF NEW.tipo NOT IN ('direto', 'grupo') THEN
    RAISE EXCEPTION 'tipo must be direto or grupo';
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_validate_chat_interno_tipo
  BEFORE INSERT OR UPDATE ON public.chat_interno_conversas
  FOR EACH ROW EXECUTE FUNCTION public.validate_chat_interno_tipo();

CREATE TABLE public.chat_interno_participantes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  conversa_id uuid NOT NULL REFERENCES public.chat_interno_conversas(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at timestamptz DEFAULT now(),
  UNIQUE(conversa_id, user_id)
);

CREATE TABLE public.chat_interno_mensagens (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  conversa_id uuid NOT NULL REFERENCES public.chat_interno_conversas(id) ON DELETE CASCADE,
  user_id uuid NOT NULL,
  conteudo text NOT NULL,
  created_at timestamptz DEFAULT now()
);

CREATE TABLE public.chat_interno_leituras (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  mensagem_id uuid NOT NULL REFERENCES public.chat_interno_mensagens(id) ON DELETE CASCADE,
  user_id uuid NOT NULL,
  lida_em timestamptz DEFAULT now(),
  UNIQUE(mensagem_id, user_id)
);

-- Indexes
CREATE INDEX idx_chat_interno_part_user ON public.chat_interno_participantes(user_id);
CREATE INDEX idx_chat_interno_part_conversa ON public.chat_interno_participantes(conversa_id);
CREATE INDEX idx_chat_interno_msg_conversa ON public.chat_interno_mensagens(conversa_id);
CREATE INDEX idx_chat_interno_msg_created ON public.chat_interno_mensagens(created_at);
CREATE INDEX idx_chat_interno_leit_user ON public.chat_interno_leituras(user_id);
CREATE INDEX idx_chat_interno_leit_msg ON public.chat_interno_leituras(mensagem_id);

-- RLS
ALTER TABLE public.chat_interno_conversas ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.chat_interno_participantes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.chat_interno_mensagens ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.chat_interno_leituras ENABLE ROW LEVEL SECURITY;

-- Conversas: user sees only conversations they participate in
CREATE POLICY "Participante ve conversa"
  ON public.chat_interno_conversas FOR SELECT
  USING (EXISTS (
    SELECT 1 FROM public.chat_interno_participantes p
    WHERE p.conversa_id = id AND p.user_id = auth.uid()
  ));

CREATE POLICY "Autenticado cria conversa"
  ON public.chat_interno_conversas FOR INSERT
  WITH CHECK (auth.role() = 'authenticated');

-- Participantes: user sees participants of their conversations
CREATE POLICY "Participante ve participantes"
  ON public.chat_interno_participantes FOR SELECT
  USING (EXISTS (
    SELECT 1 FROM public.chat_interno_participantes p2
    WHERE p2.conversa_id = conversa_id AND p2.user_id = auth.uid()
  ));

CREATE POLICY "Autenticado adiciona participante"
  ON public.chat_interno_participantes FOR INSERT
  WITH CHECK (auth.role() = 'authenticated');

-- Mensagens: user sees messages of their conversations
CREATE POLICY "Participante ve mensagens"
  ON public.chat_interno_mensagens FOR SELECT
  USING (EXISTS (
    SELECT 1 FROM public.chat_interno_participantes p
    WHERE p.conversa_id = conversa_id AND p.user_id = auth.uid()
  ));

CREATE POLICY "Participante envia mensagem"
  ON public.chat_interno_mensagens FOR INSERT
  WITH CHECK (
    auth.uid() = user_id AND
    EXISTS (
      SELECT 1 FROM public.chat_interno_participantes p
      WHERE p.conversa_id = conversa_id AND p.user_id = auth.uid()
    )
  );

-- Leituras: user manages own reads
CREATE POLICY "Usuario gerencia leituras"
  ON public.chat_interno_leituras FOR ALL
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- Realtime
ALTER PUBLICATION supabase_realtime ADD TABLE public.chat_interno_mensagens;
