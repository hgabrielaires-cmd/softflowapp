
-- Add unique constraint for auto-follow ON CONFLICT
ALTER TABLE public.painel_seguidores ADD CONSTRAINT painel_seguidores_card_user_unique UNIQUE (card_id, user_id);
