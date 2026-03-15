-- Fix cron jobs: use anon key directly since vault secrets are inaccessible

-- Régua de cobrança (daily 12:00)
SELECT cron.alter_job(
  6,
  schedule := '0 12 * * *',
  command := $$
  SELECT net.http_post(
    url := 'https://gjovmocrotguhjrqroin.supabase.co/functions/v1/regua-cobranca',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'Authorization', 'Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imdqb3Ztb2Nyb3RndWhqcnFyb2luIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzE0MzExNzQsImV4cCI6MjA4NzAwNzE3NH0.twruCrQynckiqSPX0RztrhyHkUdN7xZA0-DBeA7kYf8'
    ),
    body := '{}'::jsonb
  );
  $$
);

-- Gerar faturas mensais (monthly 1st at 11:00)
SELECT cron.alter_job(
  7,
  command := $$
  SELECT net.http_post(
    url := 'https://gjovmocrotguhjrqroin.supabase.co/functions/v1/gerar-faturas-mensais',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'Authorization', 'Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imdqb3Ztb2Nyb3RndWhqcnFyb2luIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzE0MzExNzQsImV4cCI6MjA4NzAwNzE3NH0.twruCrQynckiqSPX0RztrhyHkUdN7xZA0-DBeA7kYf8'
    ),
    body := jsonb_build_object(
      'mes', EXTRACT(MONTH FROM NOW())::int,
      'ano', EXTRACT(YEAR FROM NOW())::int
    )
  );
  $$
);

-- Processar alertas SLA (every minute)
SELECT cron.alter_job(
  3,
  command := $$
  SELECT net.http_post(
    url := 'https://gjovmocrotguhjrqroin.supabase.co/functions/v1/processar-alertas-sla',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'Authorization', 'Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imdqb3Ztb2Nyb3RndWhqcnFyb2luIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzE0MzExNzQsImV4cCI6MjA4NzAwNzE3NH0.twruCrQynckiqSPX0RztrhyHkUdN7xZA0-DBeA7kYf8'
    ),
    body := concat('{"time": "', now(), '"}')::jsonb
  ) as request_id;
  $$
);

-- Processar automações (hourly)
SELECT cron.alter_job(
  4,
  command := $$
  SELECT net.http_post(
    url := 'https://gjovmocrotguhjrqroin.supabase.co/functions/v1/processar-automacoes',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'Authorization', 'Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imdqb3Ztb2Nyb3RndWhqcnFyb2luIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzE0MzExNzQsImV4cCI6MjA4NzAwNzE3NH0.twruCrQynckiqSPX0RztrhyHkUdN7xZA0-DBeA7kYf8'
    ),
    body := '{}'::jsonb
  ) AS request_id;
  $$
);