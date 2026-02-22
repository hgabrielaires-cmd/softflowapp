
-- Add comissao_servico_percentual to profiles
ALTER TABLE public.profiles ADD COLUMN comissao_servico_percentual numeric DEFAULT 5;

-- Add comissao_servico fields to pedidos
ALTER TABLE public.pedidos ADD COLUMN comissao_servico_percentual numeric DEFAULT 0;
ALTER TABLE public.pedidos ADD COLUMN comissao_servico_valor numeric DEFAULT 0;
