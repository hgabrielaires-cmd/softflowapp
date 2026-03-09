ALTER TABLE public.painel_agendamentos 
ADD COLUMN status text NOT NULL DEFAULT 'agendado',
ADD COLUMN iniciado_em timestamp with time zone,
ADD COLUMN finalizado_em timestamp with time zone,
ADD COLUMN iniciado_por uuid,
ADD COLUMN finalizado_por uuid;