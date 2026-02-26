
ALTER TABLE public.profiles
  ADD COLUMN is_tecnico BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN tipo_tecnico TEXT DEFAULT NULL;
