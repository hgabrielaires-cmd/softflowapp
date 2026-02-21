
ALTER TABLE public.document_templates ADD COLUMN message_template_id uuid DEFAULT NULL REFERENCES public.message_templates(id) ON DELETE SET NULL;
