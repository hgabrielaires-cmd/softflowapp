
-- Tabela de comentários internos dos pedidos
CREATE TABLE public.pedido_comentarios (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  pedido_id UUID NOT NULL REFERENCES public.pedidos(id) ON DELETE CASCADE,
  user_id UUID NOT NULL,
  texto TEXT NOT NULL,
  prioridade TEXT NOT NULL DEFAULT 'normal',
  anexo_url TEXT,
  anexo_nome TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.pedido_comentarios ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admin gerencia pedido_comentarios"
  ON public.pedido_comentarios FOR ALL
  USING (is_admin(auth.uid()))
  WITH CHECK (is_admin(auth.uid()));

CREATE POLICY "Financeiro gerencia pedido_comentarios"
  ON public.pedido_comentarios FOR ALL
  USING (has_role(auth.uid(), 'financeiro'::app_role))
  WITH CHECK (has_role(auth.uid(), 'financeiro'::app_role));

CREATE POLICY "Vendedor visualiza comentarios dos seus pedidos"
  ON public.pedido_comentarios FOR SELECT
  USING (has_role(auth.uid(), 'vendedor'::app_role) AND pedido_id IN (
    SELECT id FROM public.pedidos WHERE vendedor_id = auth.uid()
  ));

CREATE POLICY "Vendedor insere comentarios nos seus pedidos"
  ON public.pedido_comentarios FOR INSERT
  WITH CHECK (has_role(auth.uid(), 'vendedor'::app_role) AND user_id = auth.uid() AND pedido_id IN (
    SELECT id FROM public.pedidos WHERE vendedor_id = auth.uid()
  ));

-- Bucket para anexos
INSERT INTO storage.buckets (id, name, public) VALUES ('pedido-anexos', 'pedido-anexos', false);

CREATE POLICY "Autenticados fazem upload de anexos pedidos"
  ON storage.objects FOR INSERT
  WITH CHECK (bucket_id = 'pedido-anexos' AND auth.uid() IS NOT NULL);

CREATE POLICY "Autenticados visualizam anexos pedidos"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'pedido-anexos' AND auth.uid() IS NOT NULL);

CREATE POLICY "Autenticados deletam seus anexos pedidos"
  ON storage.objects FOR DELETE
  USING (bucket_id = 'pedido-anexos' AND auth.uid() IS NOT NULL);
