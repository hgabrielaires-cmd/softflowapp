DO $$
DECLARE v_secret text; v_fatura uuid;
BEGIN
  SELECT decrypted_secret INTO v_secret FROM vault.decrypted_secrets WHERE name='CRON_SECRET' LIMIT 1;
  SELECT id INTO v_fatura FROM public.faturas WHERE numero_fatura='FAT-2026-00006';
  PERFORM net.http_post(
    url := 'https://gjovmocrotguhjrqroin.supabase.co/functions/v1/gerar-faturas-mensais',
    headers := jsonb_build_object('Content-Type','application/json','Authorization','Bearer '||v_secret),
    body := jsonb_build_object('reprocessar_boleto_fatura_id', v_fatura::text)
  );
END $$;