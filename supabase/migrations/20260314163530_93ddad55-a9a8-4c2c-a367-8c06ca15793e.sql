
-- Add ticket_id and origem to painel_agendamentos for ticket scheduling
ALTER TABLE public.painel_agendamentos
  ALTER COLUMN card_id DROP NOT NULL;

ALTER TABLE public.painel_agendamentos
  ADD COLUMN IF NOT EXISTS ticket_id UUID REFERENCES public.tickets(id) ON DELETE CASCADE,
  ADD COLUMN IF NOT EXISTS origem TEXT NOT NULL DEFAULT 'painel';

CREATE INDEX IF NOT EXISTS idx_painel_agendamentos_ticket ON public.painel_agendamentos(ticket_id);
CREATE INDEX IF NOT EXISTS idx_painel_agendamentos_origem ON public.painel_agendamentos(origem);
