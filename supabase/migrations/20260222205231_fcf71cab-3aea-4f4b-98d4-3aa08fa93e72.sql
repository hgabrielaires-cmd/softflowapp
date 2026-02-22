-- Primeiro remover a constraint antiga
ALTER TABLE public.document_templates DROP CONSTRAINT document_templates_tipo_check;

-- Renomear templates existentes de ADITIVO para ADITIVO_UPGRADE
UPDATE public.document_templates SET tipo = 'ADITIVO_UPGRADE' WHERE tipo = 'ADITIVO';

-- Adicionar nova constraint com os novos valores
ALTER TABLE public.document_templates ADD CONSTRAINT document_templates_tipo_check CHECK (tipo = ANY (ARRAY['CONTRATO_BASE'::text, 'ADITIVO_UPGRADE'::text, 'ADITIVO_MODULO'::text, 'CANCELAMENTO'::text, 'ORDEM_ATENDIMENTO'::text]));