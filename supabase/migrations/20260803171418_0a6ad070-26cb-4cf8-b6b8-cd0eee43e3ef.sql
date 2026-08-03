ALTER TABLE public.fin_despesas
  ADD COLUMN IF NOT EXISTS data_pagamento date,
  ADD COLUMN IF NOT EXISTS valor_pago numeric,
  ADD COLUMN IF NOT EXISTS juros_percentual numeric NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS juros_valor numeric NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS plano_conta_juros_id uuid REFERENCES public.fin_plano_contas(id);

CREATE INDEX IF NOT EXISTS idx_fin_despesas_data_pagamento ON public.fin_despesas(data_pagamento);