CREATE OR REPLACE FUNCTION public.fn_despesa_herdar_filial()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  IF NEW.filial_id IS NULL AND NEW.conta_financeira_id IS NOT NULL THEN
    SELECT filial_id INTO NEW.filial_id
    FROM public.fin_contas_financeiras
    WHERE id = NEW.conta_financeira_id;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_despesa_herdar_filial ON public.fin_despesas;
CREATE TRIGGER trg_despesa_herdar_filial
  BEFORE INSERT OR UPDATE ON public.fin_despesas
  FOR EACH ROW EXECUTE FUNCTION public.fn_despesa_herdar_filial();

CREATE OR REPLACE FUNCTION public.fn_movimentacao_herdar_filial()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  IF NEW.filial_id IS NULL AND NEW.conta_financeira_id IS NOT NULL THEN
    SELECT filial_id INTO NEW.filial_id
    FROM public.fin_contas_financeiras
    WHERE id = NEW.conta_financeira_id;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_movimentacao_herdar_filial ON public.fin_movimentacoes;
CREATE TRIGGER trg_movimentacao_herdar_filial
  BEFORE INSERT OR UPDATE ON public.fin_movimentacoes
  FOR EACH ROW EXECUTE FUNCTION public.fn_movimentacao_herdar_filial();