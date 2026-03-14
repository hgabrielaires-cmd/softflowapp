
-- Helpdesk tipos de atendimento
CREATE TABLE public.helpdesk_tipos_atendimento (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  nome TEXT NOT NULL,
  descricao TEXT,
  sla_horas NUMERIC NOT NULL DEFAULT 24,
  mesa_padrao TEXT NOT NULL DEFAULT 'Suporte',
  ativo BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Helpdesk modelos de ticket
CREATE TABLE public.helpdesk_modelos_ticket (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  nome TEXT NOT NULL,
  tipo_atendimento_id UUID REFERENCES public.helpdesk_tipos_atendimento(id),
  titulo_padrao TEXT,
  corpo_html TEXT NOT NULL DEFAULT '',
  ativo BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Tickets
CREATE TABLE public.tickets (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  numero_registro SERIAL,
  numero_exibicao TEXT NOT NULL DEFAULT '',
  titulo TEXT NOT NULL,
  descricao_html TEXT NOT NULL DEFAULT '',
  status TEXT NOT NULL DEFAULT 'Aberto',
  prioridade TEXT NOT NULL DEFAULT 'Média',
  mesa TEXT NOT NULL DEFAULT 'Suporte',
  cliente_id UUID REFERENCES public.clientes(id),
  contrato_id UUID REFERENCES public.contratos(id),
  responsavel_id UUID,
  tipo_atendimento_id UUID REFERENCES public.helpdesk_tipos_atendimento(id),
  ticket_pai_id UUID REFERENCES public.tickets(id),
  sla_horas NUMERIC NOT NULL DEFAULT 24,
  sla_deadline TIMESTAMPTZ,
  tags TEXT[] DEFAULT '{}',
  previsao_entrega TIMESTAMPTZ,
  criado_por UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Generate ticket display number
CREATE OR REPLACE FUNCTION public.gerar_numero_exibicao_ticket()
RETURNS trigger LANGUAGE plpgsql SET search_path TO 'public' AS $$
BEGIN
  NEW.numero_exibicao := 'TK-' || LPAD(NEW.numero_registro::text, 4, '0');
  RETURN NEW;
END;
$$;

CREATE TRIGGER tr_ticket_numero BEFORE INSERT ON public.tickets
FOR EACH ROW EXECUTE FUNCTION public.gerar_numero_exibicao_ticket();

-- Set SLA deadline
CREATE OR REPLACE FUNCTION public.set_ticket_sla_deadline()
RETURNS trigger LANGUAGE plpgsql SET search_path TO 'public' AS $$
BEGIN
  IF NEW.sla_deadline IS NULL THEN
    NEW.sla_deadline := NEW.created_at + (NEW.sla_horas || ' hours')::interval;
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER tr_ticket_sla BEFORE INSERT ON public.tickets
FOR EACH ROW EXECUTE FUNCTION public.set_ticket_sla_deadline();

-- Ticket comentarios (timeline)
CREATE TABLE public.ticket_comentarios (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  ticket_id UUID NOT NULL REFERENCES public.tickets(id) ON DELETE CASCADE,
  user_id UUID,
  tipo TEXT NOT NULL DEFAULT 'comentario',
  visibilidade TEXT NOT NULL DEFAULT 'publico',
  conteudo TEXT NOT NULL DEFAULT '',
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Ticket seguidores
CREATE TABLE public.ticket_seguidores (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  ticket_id UUID NOT NULL REFERENCES public.tickets(id) ON DELETE CASCADE,
  user_id UUID NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(ticket_id, user_id)
);

-- Ticket anexos
CREATE TABLE public.ticket_anexos (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  ticket_id UUID NOT NULL REFERENCES public.tickets(id) ON DELETE CASCADE,
  comentario_id UUID REFERENCES public.ticket_comentarios(id) ON DELETE SET NULL,
  nome TEXT NOT NULL,
  url TEXT NOT NULL,
  tamanho_bytes BIGINT DEFAULT 0,
  tipo_mime TEXT,
  uploaded_by UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Ticket vinculos
CREATE TABLE public.ticket_vinculos (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  ticket_id UUID NOT NULL REFERENCES public.tickets(id) ON DELETE CASCADE,
  ticket_vinculado_id UUID NOT NULL REFERENCES public.tickets(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(ticket_id, ticket_vinculado_id)
);

-- Indexes
CREATE INDEX idx_tickets_status ON public.tickets(status);
CREATE INDEX idx_tickets_cliente_id ON public.tickets(cliente_id);
CREATE INDEX idx_tickets_responsavel_id ON public.tickets(responsavel_id);
CREATE INDEX idx_tickets_mesa ON public.tickets(mesa);
CREATE INDEX idx_tickets_prioridade ON public.tickets(prioridade);
CREATE INDEX idx_ticket_comentarios_ticket_id ON public.ticket_comentarios(ticket_id);
CREATE INDEX idx_ticket_seguidores_ticket_id ON public.ticket_seguidores(ticket_id);
CREATE INDEX idx_ticket_seguidores_user_id ON public.ticket_seguidores(user_id);
CREATE INDEX idx_ticket_anexos_ticket_id ON public.ticket_anexos(ticket_id);

-- RLS
ALTER TABLE public.helpdesk_tipos_atendimento ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.helpdesk_modelos_ticket ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.tickets ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ticket_comentarios ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ticket_seguidores ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ticket_anexos ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ticket_vinculos ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "auth_select_helpdesk_tipos" ON public.helpdesk_tipos_atendimento FOR SELECT TO authenticated USING (true);
CREATE POLICY "auth_insert_helpdesk_tipos" ON public.helpdesk_tipos_atendimento FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "auth_update_helpdesk_tipos" ON public.helpdesk_tipos_atendimento FOR UPDATE TO authenticated USING (true);
CREATE POLICY "auth_delete_helpdesk_tipos" ON public.helpdesk_tipos_atendimento FOR DELETE TO authenticated USING (true);

CREATE POLICY "auth_select_helpdesk_modelos" ON public.helpdesk_modelos_ticket FOR SELECT TO authenticated USING (true);
CREATE POLICY "auth_insert_helpdesk_modelos" ON public.helpdesk_modelos_ticket FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "auth_update_helpdesk_modelos" ON public.helpdesk_modelos_ticket FOR UPDATE TO authenticated USING (true);
CREATE POLICY "auth_delete_helpdesk_modelos" ON public.helpdesk_modelos_ticket FOR DELETE TO authenticated USING (true);

CREATE POLICY "auth_select_tickets" ON public.tickets FOR SELECT TO authenticated USING (true);
CREATE POLICY "auth_insert_tickets" ON public.tickets FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "auth_update_tickets" ON public.tickets FOR UPDATE TO authenticated USING (true);

CREATE POLICY "auth_select_ticket_comentarios" ON public.ticket_comentarios FOR SELECT TO authenticated USING (true);
CREATE POLICY "auth_insert_ticket_comentarios" ON public.ticket_comentarios FOR INSERT TO authenticated WITH CHECK (true);

CREATE POLICY "auth_select_ticket_seguidores" ON public.ticket_seguidores FOR SELECT TO authenticated USING (true);
CREATE POLICY "auth_insert_ticket_seguidores" ON public.ticket_seguidores FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "auth_delete_ticket_seguidores" ON public.ticket_seguidores FOR DELETE TO authenticated USING (true);

CREATE POLICY "auth_select_ticket_anexos" ON public.ticket_anexos FOR SELECT TO authenticated USING (true);
CREATE POLICY "auth_insert_ticket_anexos" ON public.ticket_anexos FOR INSERT TO authenticated WITH CHECK (true);

CREATE POLICY "auth_select_ticket_vinculos" ON public.ticket_vinculos FOR SELECT TO authenticated USING (true);
CREATE POLICY "auth_insert_ticket_vinculos" ON public.ticket_vinculos FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "auth_delete_ticket_vinculos" ON public.ticket_vinculos FOR DELETE TO authenticated USING (true);

-- Updated_at triggers
CREATE TRIGGER tr_helpdesk_tipos_updated BEFORE UPDATE ON public.helpdesk_tipos_atendimento FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER tr_helpdesk_modelos_updated BEFORE UPDATE ON public.helpdesk_modelos_ticket FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER tr_tickets_updated BEFORE UPDATE ON public.tickets FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Storage bucket
INSERT INTO storage.buckets (id, name, public) VALUES ('ticket-anexos', 'ticket-anexos', false) ON CONFLICT DO NOTHING;
CREATE POLICY "auth_upload_ticket_anexos" ON storage.objects FOR INSERT TO authenticated WITH CHECK (bucket_id = 'ticket-anexos');
CREATE POLICY "auth_read_ticket_anexos" ON storage.objects FOR SELECT TO authenticated USING (bucket_id = 'ticket-anexos');
