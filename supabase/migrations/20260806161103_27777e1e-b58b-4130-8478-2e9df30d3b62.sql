CREATE OR REPLACE FUNCTION public.fn_cliente_maiusculo()
RETURNS TRIGGER LANGUAGE plpgsql SET search_path = public AS $$
BEGIN
  IF NEW.nome_fantasia IS NOT NULL THEN NEW.nome_fantasia = UPPER(NEW.nome_fantasia); END IF;
  IF NEW.razao_social IS NOT NULL THEN NEW.razao_social = UPPER(NEW.razao_social); END IF;
  IF NEW.apelido IS NOT NULL THEN NEW.apelido = UPPER(NEW.apelido); END IF;
  RETURN NEW;
END;
$$;
DROP TRIGGER IF EXISTS trg_cliente_maiusculo ON public.clientes;
CREATE TRIGGER trg_cliente_maiusculo BEFORE INSERT OR UPDATE ON public.clientes
FOR EACH ROW EXECUTE FUNCTION public.fn_cliente_maiusculo();

CREATE OR REPLACE FUNCTION public.fn_profile_maiusculo()
RETURNS TRIGGER LANGUAGE plpgsql SET search_path = public AS $$
BEGIN
  IF NEW.full_name IS NOT NULL THEN NEW.full_name = UPPER(NEW.full_name); END IF;
  RETURN NEW;
END;
$$;
DROP TRIGGER IF EXISTS trg_profile_maiusculo ON public.profiles;
CREATE TRIGGER trg_profile_maiusculo BEFORE INSERT OR UPDATE ON public.profiles
FOR EACH ROW EXECUTE FUNCTION public.fn_profile_maiusculo();

CREATE OR REPLACE FUNCTION public.fn_filial_maiusculo()
RETURNS TRIGGER LANGUAGE plpgsql SET search_path = public AS $$
BEGIN
  IF NEW.nome IS NOT NULL THEN NEW.nome = UPPER(NEW.nome); END IF;
  IF NEW.razao_social IS NOT NULL THEN NEW.razao_social = UPPER(NEW.razao_social); END IF;
  IF NEW.responsavel IS NOT NULL THEN NEW.responsavel = UPPER(NEW.responsavel); END IF;
  RETURN NEW;
END;
$$;
DROP TRIGGER IF EXISTS trg_filial_maiusculo ON public.filiais;
CREATE TRIGGER trg_filial_maiusculo BEFORE INSERT OR UPDATE ON public.filiais
FOR EACH ROW EXECUTE FUNCTION public.fn_filial_maiusculo();