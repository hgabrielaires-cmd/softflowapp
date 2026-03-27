
-- 1. Add presence columns to profiles
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS is_atendente_chat boolean DEFAULT false,
  ADD COLUMN IF NOT EXISTS chat_status text DEFAULT 'offline',
  ADD COLUMN IF NOT EXISTS chat_last_heartbeat timestamptz;

-- 2. Create atendente_presenca table
CREATE TABLE IF NOT EXISTS public.atendente_presenca (
  user_id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  status text DEFAULT 'offline' NOT NULL,
  last_heartbeat timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Add validation trigger instead of CHECK constraint
CREATE OR REPLACE FUNCTION public.validate_presenca_status()
  RETURNS trigger
  LANGUAGE plpgsql
  SET search_path TO 'public'
AS $$
BEGIN
  IF NEW.status NOT IN ('online', 'pausa', 'offline') THEN
    RAISE EXCEPTION 'Invalid status: %. Must be online, pausa, or offline', NEW.status;
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_validate_presenca_status
  BEFORE INSERT OR UPDATE ON public.atendente_presenca
  FOR EACH ROW EXECUTE FUNCTION public.validate_presenca_status();

-- Enable RLS
ALTER TABLE public.atendente_presenca ENABLE ROW LEVEL SECURITY;

-- Policy: users manage their own presence
CREATE POLICY "Usuarios gerenciam propria presenca"
  ON public.atendente_presenca
  FOR ALL
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- Policy: authenticated users can read all presence
CREATE POLICY "Autenticados leem presenca de todos"
  ON public.atendente_presenca
  FOR SELECT
  USING (auth.role() = 'authenticated');

-- Enable realtime for presence table
ALTER PUBLICATION supabase_realtime ADD TABLE public.atendente_presenca;
