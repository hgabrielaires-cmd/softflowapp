CREATE TABLE IF NOT EXISTS public.contaazul_config (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  filial_id uuid REFERENCES public.filiais(id) ON DELETE CASCADE,
  sync_ativo boolean NOT NULL DEFAULT true,
  horarios_sync text[] NOT NULL DEFAULT ARRAY['10:00','12:30','15:00','20:00'],
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX IF NOT EXISTS contaazul_config_filial_id_key ON public.contaazul_config (filial_id);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.contaazul_config TO authenticated;
GRANT ALL ON public.contaazul_config TO service_role;

ALTER TABLE public.contaazul_config ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admin e financeiro gerenciam config contaazul"
ON public.contaazul_config FOR ALL TO authenticated
USING (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'financeiro'))
WITH CHECK (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'financeiro'));

CREATE TRIGGER tr_contaazul_config_updated_at
BEFORE UPDATE ON public.contaazul_config
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

INSERT INTO public.contaazul_config (filial_id, horarios_sync)
SELECT id, ARRAY['10:00','12:30','15:00','20:00']
FROM public.filiais WHERE ativa = true
ON CONFLICT (filial_id) DO NOTHING;

CREATE OR REPLACE FUNCTION public.fn_recriar_crons_contaazul(p_horarios text[], p_apikey text)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $fn$
DECLARE
  v_horario text;
  v_hora int;
  v_minuto int;
  v_job_name text;
  v_i int := 1;
BEGIN
  IF NOT (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'financeiro')) THEN
    RAISE EXCEPTION 'Sem permissão para configurar sincronização';
  END IF;

  FOR v_job_name IN
    SELECT jobname FROM cron.job WHERE jobname LIKE 'sync-contaazul-%'
  LOOP
    PERFORM cron.unschedule(v_job_name);
  END LOOP;

  FOREACH v_horario IN ARRAY p_horarios
  LOOP
    v_hora := split_part(v_horario, ':', 1)::int;
    v_minuto := split_part(v_horario, ':', 2)::int;
    v_hora := (v_hora + 3) % 24;

    PERFORM cron.schedule(
      'sync-contaazul-' || v_i,
      v_minuto || ' ' || v_hora || ' * * *',
      format(
        $cron$SELECT net.http_post(url := 'https://gjovmocrotguhjrqroin.supabase.co/functions/v1/contaazul-sync', headers := %L::jsonb, body := '{"periodo": "hoje"}'::jsonb);$cron$,
        jsonb_build_object('Content-Type','application/json','apikey', p_apikey)::text
      )
    );

    v_i := v_i + 1;
  END LOOP;
END;
$fn$;

REVOKE ALL ON FUNCTION public.fn_recriar_crons_contaazul(text[], text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.fn_recriar_crons_contaazul(text[], text) TO authenticated;

CREATE OR REPLACE FUNCTION public.fn_listar_crons_contaazul()
RETURNS TABLE (jobname text, schedule text, active boolean)
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $fn$
BEGIN
  IF NOT (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'financeiro')) THEN
    RAISE EXCEPTION 'Sem permissão';
  END IF;

  RETURN QUERY
  SELECT j.jobname::text, j.schedule::text, j.active
  FROM cron.job j
  WHERE j.jobname LIKE 'sync-contaazul-%'
  ORDER BY j.jobname;
END;
$fn$;

REVOKE ALL ON FUNCTION public.fn_listar_crons_contaazul() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.fn_listar_crons_contaazul() TO authenticated;