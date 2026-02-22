
-- Add servicos_pedido column to pedidos for OA (Ordem de Atendimento) orders
ALTER TABLE public.pedidos ADD COLUMN servicos_pedido jsonb DEFAULT '[]'::jsonb;

-- Add comment for documentation
COMMENT ON COLUMN public.pedidos.servicos_pedido IS 'Lista de serviços para pedidos tipo OA (Ordem de Atendimento): [{servico_id, nome, quantidade, valor_unitario, unidade_medida}]';
