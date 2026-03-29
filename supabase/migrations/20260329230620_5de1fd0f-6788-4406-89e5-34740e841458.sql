
ALTER TABLE public.crm_oportunidades ADD COLUMN IF NOT EXISTS conversa_id uuid REFERENCES public.chat_conversas(id);
