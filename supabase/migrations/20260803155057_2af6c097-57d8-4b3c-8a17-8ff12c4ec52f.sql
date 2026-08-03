UPDATE public.fin_despesas SET status = 'aberto' WHERE status NOT IN ('aberto','pago','cancelado');
ALTER TABLE public.fin_despesas ALTER COLUMN status SET DEFAULT 'aberto';
ALTER TABLE public.fin_despesas ADD CONSTRAINT fin_despesas_status_check CHECK (status IN ('aberto','pago','cancelado'));
ALTER TABLE public.fin_despesas ADD CONSTRAINT fin_despesas_valor_positivo CHECK (valor > 0);
ALTER TABLE public.fin_despesa_rateios ADD CONSTRAINT fin_despesa_rateios_percentual_check CHECK (percentual > 0 AND percentual <= 100);

CREATE OR REPLACE FUNCTION public.validar_soma_rateio_despesa()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_despesa_id uuid := COALESCE(NEW.despesa_id, OLD.despesa_id);
  v_total numeric;
  v_qtd integer;
BEGIN
  SELECT COALESCE(SUM(percentual), 0), COUNT(*)
    INTO v_total, v_qtd
  FROM public.fin_despesa_rateios
  WHERE despesa_id = v_despesa_id;

  IF v_qtd > 0 AND ROUND(v_total, 2) <> 100 THEN
    RAISE EXCEPTION 'O rateio por centro de custo deve somar 100%% (atual: %)', ROUND(v_total, 2);
  END IF;

  RETURN NULL;
END;
$$;

CREATE CONSTRAINT TRIGGER trg_validar_soma_rateio_despesa
AFTER INSERT OR UPDATE OR DELETE ON public.fin_despesa_rateios
DEFERRABLE INITIALLY DEFERRED
FOR EACH ROW EXECUTE FUNCTION public.validar_soma_rateio_despesa();

CREATE POLICY "Financeiro pode atualizar anexos de despesas"
ON storage.objects FOR UPDATE TO authenticated
USING (
  bucket_id = 'financeiro-anexos'
  AND (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'financeiro'::app_role) OR has_role(auth.uid(), 'gestor'::app_role))
);