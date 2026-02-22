-- Adicionar campo tipo_atendimento para pedidos OA (Interno/Externo)
ALTER TABLE public.pedidos 
ADD COLUMN tipo_atendimento text NULL;