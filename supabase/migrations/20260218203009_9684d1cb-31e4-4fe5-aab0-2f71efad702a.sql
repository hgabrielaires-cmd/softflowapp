ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS filial_favorita_id UUID REFERENCES public.filiais(id) ON DELETE SET NULL;