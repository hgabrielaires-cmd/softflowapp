ALTER TABLE public.telegram_pendencias
  ADD COLUMN IF NOT EXISTS message_id bigint,
  ADD COLUMN IF NOT EXISTS plano_pagina integer NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS plano_conta_escolhido_id uuid;