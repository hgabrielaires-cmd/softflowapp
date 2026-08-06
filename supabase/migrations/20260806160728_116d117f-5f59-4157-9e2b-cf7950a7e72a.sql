CREATE OR REPLACE FUNCTION public.fn_fornecedor_maiusculo()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  NEW.nome_fantasia = UPPER(NEW.nome_fantasia);
  IF NEW.razao_social IS NOT NULL THEN
    NEW.razao_social = UPPER(NEW.razao_social);
  END IF;
  IF NEW.contato_nome IS NOT NULL THEN
    NEW.contato_nome = UPPER(NEW.contato_nome);
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_fornecedor_maiusculo ON public.fornecedores;
CREATE TRIGGER trg_fornecedor_maiusculo
  BEFORE INSERT OR UPDATE ON public.fornecedores
  FOR EACH ROW
  EXECUTE FUNCTION public.fn_fornecedor_maiusculo();