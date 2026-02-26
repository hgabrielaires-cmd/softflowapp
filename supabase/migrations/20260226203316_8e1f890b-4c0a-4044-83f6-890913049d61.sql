-- Adicionar coluna para assinatura do representante na filial
ALTER TABLE public.filiais ADD COLUMN assinatura_url text DEFAULT NULL;
