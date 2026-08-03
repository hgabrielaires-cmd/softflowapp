-- 1. cliente_documentos: escopo por filial do cliente
DROP POLICY IF EXISTS "Autenticados podem gerenciar documentos" ON public.cliente_documentos;

CREATE POLICY "Ver documentos da filial do cliente"
ON public.cliente_documentos FOR SELECT TO authenticated
USING (EXISTS (SELECT 1 FROM public.clientes c WHERE c.id = cliente_documentos.cliente_id AND public.user_has_filial_access(c.filial_id)));

CREATE POLICY "Inserir documentos da filial do cliente"
ON public.cliente_documentos FOR INSERT TO authenticated
WITH CHECK (EXISTS (SELECT 1 FROM public.clientes c WHERE c.id = cliente_documentos.cliente_id AND public.user_has_filial_access(c.filial_id)));

CREATE POLICY "Atualizar documentos da filial do cliente"
ON public.cliente_documentos FOR UPDATE TO authenticated
USING (EXISTS (SELECT 1 FROM public.clientes c WHERE c.id = cliente_documentos.cliente_id AND public.user_has_filial_access(c.filial_id)))
WITH CHECK (EXISTS (SELECT 1 FROM public.clientes c WHERE c.id = cliente_documentos.cliente_id AND public.user_has_filial_access(c.filial_id)));

CREATE POLICY "Excluir documentos da filial do cliente"
ON public.cliente_documentos FOR DELETE TO authenticated
USING (EXISTS (SELECT 1 FROM public.clientes c WHERE c.id = cliente_documentos.cliente_id AND public.user_has_filial_access(c.filial_id)));

-- 2. fin_despesas: restritiva por filial
CREATE POLICY "Despesas restritas a filiais do usuario"
ON public.fin_despesas AS RESTRICTIVE FOR ALL TO authenticated
USING (filial_id IS NULL OR public.user_has_filial_access(filial_id))
WITH CHECK (filial_id IS NULL OR public.user_has_filial_access(filial_id));

-- 3. fin_movimentacoes: restritiva por filial
CREATE POLICY "Movimentacoes restritas a filiais do usuario"
ON public.fin_movimentacoes AS RESTRICTIVE FOR ALL TO authenticated
USING (filial_id IS NULL OR public.user_has_filial_access(filial_id))
WITH CHECK (filial_id IS NULL OR public.user_has_filial_access(filial_id));

-- 4. profiles: esconder comissoes/limites de desconto dos demais usuarios
REVOKE SELECT (
  comissao_percentual,
  comissao_implantacao_percentual,
  comissao_mensalidade_percentual,
  comissao_servico_percentual,
  desconto_limite_implantacao,
  desconto_limite_mensalidade
) ON public.profiles FROM anon, authenticated;

CREATE OR REPLACE VIEW public.profiles_comissoes
WITH (security_invoker = off) AS
SELECT
  p.user_id,
  p.comissao_percentual,
  p.comissao_implantacao_percentual,
  p.comissao_mensalidade_percentual,
  p.comissao_servico_percentual,
  p.desconto_limite_implantacao,
  p.desconto_limite_mensalidade
FROM public.profiles p
WHERE p.user_id = auth.uid()
   OR public.is_admin(auth.uid())
   OR public.has_role(auth.uid(), 'gestor'::app_role);

REVOKE ALL ON public.profiles_comissoes FROM anon;
GRANT SELECT ON public.profiles_comissoes TO authenticated;

-- 5. Funcoes SECURITY DEFINER que nao devem ser chamadas via API
REVOKE ALL ON FUNCTION public.audit_fin_despesas_change() FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.fn_despesa_gera_movimentacao() FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.validar_soma_rateio_despesa() FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.fn_saldo_conta(uuid, date) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.fn_saldo_conta(uuid, date) TO authenticated, service_role;

-- 6. Buckets publicos: impedir listagem anonima (URLs publicas continuam funcionando)
DROP POLICY IF EXISTS "Public avatar access" ON storage.objects;
CREATE POLICY "Avatares visiveis para autenticados"
ON storage.objects FOR SELECT TO authenticated
USING (bucket_id = 'avatars');

DROP POLICY IF EXISTS "Logos são públicos" ON storage.objects;
CREATE POLICY "Logos visiveis para autenticados"
ON storage.objects FOR SELECT TO authenticated
USING (bucket_id = 'filiais-logos');