
-- Add server_url column to integracoes_config for Evolution API server address
ALTER TABLE public.integracoes_config ADD COLUMN server_url text DEFAULT NULL;
