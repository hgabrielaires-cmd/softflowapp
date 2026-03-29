
-- Config table for CRM chat automation (WhatsApp notification on opportunity creation from chat)
CREATE TABLE public.crm_automacao_chat_config (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  filial_id uuid NOT NULL REFERENCES public.filiais(id) ON DELETE CASCADE,
  ativo boolean NOT NULL DEFAULT false,
  setor_id uuid REFERENCES public.setores(id) ON DELETE SET NULL,
  destinatario_user_id uuid NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (filial_id)
);

ALTER TABLE public.crm_automacao_chat_config ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can read crm_automacao_chat_config"
  ON public.crm_automacao_chat_config FOR SELECT TO authenticated USING (true);

CREATE POLICY "Admins can manage crm_automacao_chat_config"
  ON public.crm_automacao_chat_config FOR ALL TO authenticated
  USING (public.is_admin(auth.uid()))
  WITH CHECK (public.is_admin(auth.uid()));
