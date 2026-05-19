CREATE OR REPLACE FUNCTION public.enforce_single_active_template()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
BEGIN
  IF NEW.ativo = true THEN
    -- Only admins can activate templates (deactivates others)
    IF auth.uid() IS NOT NULL AND NOT public.is_admin(auth.uid()) THEN
      RAISE EXCEPTION 'Apenas administradores podem ativar modelos de documento';
    END IF;

    UPDATE public.document_templates
    SET ativo = false, updated_at = now()
    WHERE tipo = NEW.tipo
      AND ativo = true
      AND id != NEW.id
      AND (
        (filial_id IS NULL AND NEW.filial_id IS NULL)
        OR (filial_id = NEW.filial_id)
      );
  END IF;
  RETURN NEW;
END;
$function$;