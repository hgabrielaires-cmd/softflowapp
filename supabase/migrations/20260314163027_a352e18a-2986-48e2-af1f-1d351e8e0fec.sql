
-- Add parent_id to ticket_comentarios for reply threads
ALTER TABLE public.ticket_comentarios
ADD COLUMN IF NOT EXISTS parent_id UUID REFERENCES public.ticket_comentarios(id) ON DELETE CASCADE;

-- Create ticket_curtidas table for likes
CREATE TABLE IF NOT EXISTS public.ticket_curtidas (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  comentario_id UUID NOT NULL REFERENCES public.ticket_comentarios(id) ON DELETE CASCADE,
  user_id UUID NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(comentario_id, user_id)
);

-- RLS for ticket_curtidas
ALTER TABLE public.ticket_curtidas ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated can read ticket_curtidas" ON public.ticket_curtidas
  FOR SELECT TO authenticated USING (true);

CREATE POLICY "Authenticated can insert ticket_curtidas" ON public.ticket_curtidas
  FOR INSERT TO authenticated WITH CHECK (true);

CREATE POLICY "Users can delete own ticket_curtidas" ON public.ticket_curtidas
  FOR DELETE TO authenticated USING (user_id = auth.uid());

-- Index
CREATE INDEX IF NOT EXISTS idx_ticket_curtidas_comentario ON public.ticket_curtidas(comentario_id);
CREATE INDEX IF NOT EXISTS idx_ticket_comentarios_parent ON public.ticket_comentarios(parent_id);
