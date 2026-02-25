
ALTER TABLE public.painel_etapas
  ADD COLUMN alerta_whatsapp_template_id uuid REFERENCES public.message_templates(id) DEFAULT NULL,
  ADD COLUMN alerta_whatsapp_usuario_id uuid REFERENCES public.profiles(id) DEFAULT NULL,
  ADD COLUMN alerta_notificacoes_template_id uuid REFERENCES public.message_templates(id) DEFAULT NULL,
  ADD COLUMN alerta_notificacoes_usuario_id uuid REFERENCES public.profiles(id) DEFAULT NULL;
