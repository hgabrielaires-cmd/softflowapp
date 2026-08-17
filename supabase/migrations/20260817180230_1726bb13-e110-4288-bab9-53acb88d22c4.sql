alter table public.faturas
  add column if not exists boleto_pix_qrcode text,
  add column if not exists boleto_pix_txid text;