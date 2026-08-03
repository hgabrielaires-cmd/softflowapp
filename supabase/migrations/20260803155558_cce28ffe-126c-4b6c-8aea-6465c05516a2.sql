CREATE OR REPLACE FUNCTION public.audit_fin_despesas_change()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  v_changes jsonb := '{}'::jsonb;
BEGIN
  IF TG_OP = 'INSERT' THEN
    INSERT INTO public.audit_logs (user_id, action, entity_type, entity_id, details)
    VALUES (auth.uid(), 'despesa_created', 'fin_despesas', NEW.id::text,
      jsonb_build_object(
        'grupo_id', NEW.grupo_id,
        'fornecedor_id', NEW.fornecedor_id,
        'valor', NEW.valor,
        'data_vencimento', NEW.data_vencimento,
        'parcela', NEW.parcela_numero || '/' || NEW.parcela_total,
        'status', NEW.status
      ));
    RETURN NEW;
  ELSIF TG_OP = 'DELETE' THEN
    INSERT INTO public.audit_logs (user_id, action, entity_type, entity_id, details)
    VALUES (auth.uid(), 'despesa_deleted', 'fin_despesas', OLD.id::text,
      jsonb_build_object(
        'grupo_id', OLD.grupo_id,
        'fornecedor_id', OLD.fornecedor_id,
        'valor', OLD.valor,
        'data_vencimento', OLD.data_vencimento,
        'parcela', OLD.parcela_numero || '/' || OLD.parcela_total,
        'status', OLD.status
      ));
    RETURN OLD;
  ELSIF TG_OP = 'UPDATE' THEN
    IF OLD.valor IS DISTINCT FROM NEW.valor THEN
      v_changes := v_changes || jsonb_build_object('valor', jsonb_build_object('old', OLD.valor, 'new', NEW.valor));
    END IF;
    IF OLD.data_vencimento IS DISTINCT FROM NEW.data_vencimento THEN
      v_changes := v_changes || jsonb_build_object('data_vencimento', jsonb_build_object('old', OLD.data_vencimento, 'new', NEW.data_vencimento));
    END IF;
    IF OLD.data_emissao IS DISTINCT FROM NEW.data_emissao THEN
      v_changes := v_changes || jsonb_build_object('data_emissao', jsonb_build_object('old', OLD.data_emissao, 'new', NEW.data_emissao));
    END IF;
    IF OLD.status IS DISTINCT FROM NEW.status THEN
      v_changes := v_changes || jsonb_build_object('status', jsonb_build_object('old', OLD.status, 'new', NEW.status));
    END IF;
    IF OLD.fornecedor_id IS DISTINCT FROM NEW.fornecedor_id THEN
      v_changes := v_changes || jsonb_build_object('fornecedor_id', jsonb_build_object('old', OLD.fornecedor_id, 'new', NEW.fornecedor_id));
    END IF;
    IF OLD.plano_conta_id IS DISTINCT FROM NEW.plano_conta_id THEN
      v_changes := v_changes || jsonb_build_object('plano_conta_id', jsonb_build_object('old', OLD.plano_conta_id, 'new', NEW.plano_conta_id));
    END IF;
    IF OLD.forma_pagamento_id IS DISTINCT FROM NEW.forma_pagamento_id THEN
      v_changes := v_changes || jsonb_build_object('forma_pagamento_id', jsonb_build_object('old', OLD.forma_pagamento_id, 'new', NEW.forma_pagamento_id));
    END IF;
    IF OLD.conta_financeira_id IS DISTINCT FROM NEW.conta_financeira_id THEN
      v_changes := v_changes || jsonb_build_object('conta_financeira_id', jsonb_build_object('old', OLD.conta_financeira_id, 'new', NEW.conta_financeira_id));
    END IF;
    IF OLD.descricao IS DISTINCT FROM NEW.descricao THEN
      v_changes := v_changes || jsonb_build_object('descricao', jsonb_build_object('old', OLD.descricao, 'new', NEW.descricao));
    END IF;
    IF v_changes <> '{}'::jsonb THEN
      INSERT INTO public.audit_logs (user_id, action, entity_type, entity_id, details)
      VALUES (auth.uid(), 'despesa_updated', 'fin_despesas', NEW.id::text,
        jsonb_build_object('grupo_id', NEW.grupo_id, 'changes', v_changes));
    END IF;
    RETURN NEW;
  END IF;
  RETURN NULL;
END;
$function$;

DROP TRIGGER IF EXISTS audit_fin_despesas_trigger ON public.fin_despesas;
CREATE TRIGGER audit_fin_despesas_trigger
AFTER INSERT OR UPDATE OR DELETE ON public.fin_despesas
FOR EACH ROW EXECUTE FUNCTION public.audit_fin_despesas_change();

DROP POLICY IF EXISTS "Financeiro pode editar despesas" ON public.fin_despesas;
CREATE POLICY "Financeiro pode editar despesas"
ON public.fin_despesas FOR UPDATE TO authenticated
USING (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'financeiro'::app_role) OR has_role(auth.uid(), 'gestor'::app_role))
WITH CHECK (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'financeiro'::app_role) OR has_role(auth.uid(), 'gestor'::app_role));