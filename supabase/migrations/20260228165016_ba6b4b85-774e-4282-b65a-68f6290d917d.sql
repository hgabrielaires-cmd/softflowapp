
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS is_vendedor boolean NOT NULL DEFAULT false;

COMMENT ON COLUMN public.profiles.is_vendedor IS 'Indica se o usuário atua como vendedor, independente do cargo principal';
