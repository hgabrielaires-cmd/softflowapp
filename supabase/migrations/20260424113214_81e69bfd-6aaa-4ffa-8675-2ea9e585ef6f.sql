
CREATE OR REPLACE FUNCTION public.audit_clientes_change()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_changes jsonb := '{}'::jsonb;
BEGIN
  IF TG_OP = 'INSERT' THEN
    INSERT INTO public.audit_logs (user_id, action, entity_type, entity_id, details)
    VALUES (auth.uid(), 'cliente_created', 'clientes', NEW.id::text,
      jsonb_build_object('nome_fantasia', NEW.nome_fantasia, 'cnpj_cpf', NEW.cnpj_cpf, 'razao_social', NEW.razao_social));
    RETURN NEW;
  ELSIF TG_OP = 'DELETE' THEN
    INSERT INTO public.audit_logs (user_id, action, entity_type, entity_id, details)
    VALUES (auth.uid(), 'cliente_deleted', 'clientes', OLD.id::text,
      jsonb_build_object('nome_fantasia', OLD.nome_fantasia, 'cnpj_cpf', OLD.cnpj_cpf, 'razao_social', OLD.razao_social));
    RETURN OLD;
  ELSIF TG_OP = 'UPDATE' THEN
    IF OLD.nome_fantasia IS DISTINCT FROM NEW.nome_fantasia THEN
      v_changes := v_changes || jsonb_build_object('nome_fantasia', jsonb_build_object('old', OLD.nome_fantasia, 'new', NEW.nome_fantasia));
    END IF;
    IF OLD.razao_social IS DISTINCT FROM NEW.razao_social THEN
      v_changes := v_changes || jsonb_build_object('razao_social', jsonb_build_object('old', OLD.razao_social, 'new', NEW.razao_social));
    END IF;
    IF OLD.cnpj_cpf IS DISTINCT FROM NEW.cnpj_cpf THEN
      v_changes := v_changes || jsonb_build_object('cnpj_cpf', jsonb_build_object('old', OLD.cnpj_cpf, 'new', NEW.cnpj_cpf));
    END IF;
    IF OLD.telefone IS DISTINCT FROM NEW.telefone THEN
      v_changes := v_changes || jsonb_build_object('telefone', jsonb_build_object('old', OLD.telefone, 'new', NEW.telefone));
    END IF;
    IF OLD.email IS DISTINCT FROM NEW.email THEN
      v_changes := v_changes || jsonb_build_object('email', jsonb_build_object('old', OLD.email, 'new', NEW.email));
    END IF;
    IF OLD.filial_id IS DISTINCT FROM NEW.filial_id THEN
      v_changes := v_changes || jsonb_build_object('filial_id', jsonb_build_object('old', OLD.filial_id, 'new', NEW.filial_id));
    END IF;
    IF OLD.ativo IS DISTINCT FROM NEW.ativo THEN
      v_changes := v_changes || jsonb_build_object('ativo', jsonb_build_object('old', OLD.ativo, 'new', NEW.ativo));
    END IF;
    IF v_changes <> '{}'::jsonb THEN
      INSERT INTO public.audit_logs (user_id, action, entity_type, entity_id, details)
      VALUES (auth.uid(), 'cliente_updated', 'clientes', NEW.id::text,
        jsonb_build_object('nome_fantasia', NEW.nome_fantasia, 'changes', v_changes));
    END IF;
    RETURN NEW;
  END IF;
  RETURN NULL;
END;
$$;

DROP TRIGGER IF EXISTS audit_clientes_trigger ON public.clientes;
CREATE TRIGGER audit_clientes_trigger
AFTER INSERT OR UPDATE OR DELETE ON public.clientes
FOR EACH ROW EXECUTE FUNCTION public.audit_clientes_change();
