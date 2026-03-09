-- Create a helper function that fetches CRON_SECRET from vault and calls edge functions
CREATE OR REPLACE FUNCTION public.get_cron_secret()
RETURNS TEXT
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $$
  SELECT decrypted_secret 
  FROM vault.decrypted_secrets 
  WHERE name = 'CRON_SECRET' 
  LIMIT 1;
$$;