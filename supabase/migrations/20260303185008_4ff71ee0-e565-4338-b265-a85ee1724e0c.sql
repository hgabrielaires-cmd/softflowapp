
-- Table to track users following a card (project)
CREATE TABLE public.painel_seguidores (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  card_id uuid NOT NULL REFERENCES public.painel_atendimento(id) ON DELETE CASCADE,
  user_id uuid NOT NULL,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  UNIQUE(card_id, user_id)
);

ALTER TABLE public.painel_seguidores ENABLE ROW LEVEL SECURITY;

-- Authenticated users can manage their own follows
CREATE POLICY "Autenticados gerenciam seguidores"
  ON public.painel_seguidores
  FOR ALL
  TO authenticated
  USING (auth.uid() IS NOT NULL)
  WITH CHECK (auth.uid() IS NOT NULL);

-- Filial filter
CREATE POLICY "Filial filter painel_seguidores"
  ON public.painel_seguidores
  FOR ALL
  TO authenticated
  USING (EXISTS (
    SELECT 1 FROM painel_atendimento pa
    WHERE pa.id = painel_seguidores.card_id
    AND user_has_filial_access(pa.filial_id)
  ))
  WITH CHECK (EXISTS (
    SELECT 1 FROM painel_atendimento pa
    WHERE pa.id = painel_seguidores.card_id
    AND user_has_filial_access(pa.filial_id)
  ));
