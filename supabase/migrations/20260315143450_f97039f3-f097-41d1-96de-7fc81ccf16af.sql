-- Reativar contrato base 2026-0065
UPDATE public.contratos SET status = 'Ativo', updated_at = now() WHERE id = '297dcc8f-b9a1-41cc-9fa7-ce38edd82c14';

-- Restaurar pedido vinculado
UPDATE public.pedidos SET status_pedido = 'Contrato Retroativo', financeiro_status = 'Aprovado' WHERE id = '39c1f5df-b713-423e-bfa2-b50205f0de39';

-- Remover registro de cancelamento se existir
DELETE FROM public.contratos_cancelados WHERE contrato_id = '297dcc8f-b9a1-41cc-9fa7-ce38edd82c14';