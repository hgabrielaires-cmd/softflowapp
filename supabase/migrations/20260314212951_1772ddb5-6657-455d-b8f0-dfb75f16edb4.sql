
ALTER TABLE public.faturas
ADD COLUMN IF NOT EXISTS asaas_barcode TEXT,
ADD COLUMN IF NOT EXISTS asaas_bank_slip_url TEXT,
ADD COLUMN IF NOT EXISTS asaas_pix_qrcode TEXT,
ADD COLUMN IF NOT EXISTS asaas_pix_image TEXT;
