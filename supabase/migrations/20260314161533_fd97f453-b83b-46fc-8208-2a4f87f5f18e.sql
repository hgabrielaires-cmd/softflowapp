
-- Add FK from ticket_seguidores.user_id to profiles.user_id
ALTER TABLE public.ticket_seguidores
  ADD CONSTRAINT ticket_seguidores_user_id_fkey
  FOREIGN KEY (user_id) REFERENCES public.profiles(user_id) ON DELETE CASCADE;

-- Add FK from ticket_comentarios.user_id to profiles.user_id
ALTER TABLE public.ticket_comentarios
  ADD CONSTRAINT ticket_comentarios_user_id_fkey
  FOREIGN KEY (user_id) REFERENCES public.profiles(user_id) ON DELETE CASCADE;
