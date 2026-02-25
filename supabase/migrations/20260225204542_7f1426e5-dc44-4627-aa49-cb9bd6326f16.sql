
ALTER TABLE public.painel_etapas
  ADD COLUMN controla_sla boolean NOT NULL DEFAULT false,
  ADD COLUMN prazo_maximo_horas numeric NULL,
  ADD COLUMN alerta_whatsapp boolean NOT NULL DEFAULT false,
  ADD COLUMN alerta_notificacoes boolean NOT NULL DEFAULT false;
