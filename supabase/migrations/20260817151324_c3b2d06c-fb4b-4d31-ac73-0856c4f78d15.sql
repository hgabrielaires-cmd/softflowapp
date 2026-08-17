DO $$
DECLARE
  v_secret text;
BEGIN
  SELECT decrypted_secret INTO v_secret FROM vault.decrypted_secrets WHERE name = 'CRON_SECRET' LIMIT 1;
  IF v_secret IS NULL THEN
    PERFORM vault.create_secret(encode(gen_random_bytes(32), 'hex'), 'CRON_SECRET', 'Segredo para autenticacao das rotinas agendadas (pg_cron -> edge functions)');
  END IF;
END $$;

SELECT cron.unschedule('gerar-faturas-mensais');
SELECT cron.unschedule('sincronizar-faturas-asaas');
SELECT cron.unschedule('regua-cobranca-diaria');

SELECT cron.schedule(
  'gerar-faturas-mensais',
  '0 11 1 * *',
  $cron$
  SELECT net.http_post(
    url := 'https://gjovmocrotguhjrqroin.supabase.co/functions/v1/gerar-faturas-mensais',
    headers := jsonb_build_object('Content-Type', 'application/json', 'Authorization', 'Bearer ' || public.get_cron_secret()),
    body := jsonb_build_object('mes', EXTRACT(MONTH FROM NOW())::int, 'ano', EXTRACT(YEAR FROM NOW())::int)
  );
  $cron$
);

SELECT cron.schedule(
  'sincronizar-faturas-asaas',
  '0 10 * * *',
  $cron$
  SELECT net.http_post(
    url := 'https://gjovmocrotguhjrqroin.supabase.co/functions/v1/sincronizar-faturas-asaas',
    headers := jsonb_build_object('Content-Type', 'application/json', 'Authorization', 'Bearer ' || public.get_cron_secret()),
    body := '{}'::jsonb
  );
  $cron$
);

SELECT cron.schedule(
  'regua-cobranca-diaria',
  '0 12 * * *',
  $cron$
  SELECT net.http_post(
    url := 'https://gjovmocrotguhjrqroin.supabase.co/functions/v1/regua-cobranca',
    headers := jsonb_build_object('Content-Type', 'application/json', 'Authorization', 'Bearer ' || public.get_cron_secret()),
    body := '{}'::jsonb
  );
  $cron$
);