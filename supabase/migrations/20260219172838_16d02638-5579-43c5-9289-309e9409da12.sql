
-- Add logo column to filiais
ALTER TABLE public.filiais ADD COLUMN logo_url text;

-- Create storage bucket for filial logos
INSERT INTO storage.buckets (id, name, public) VALUES ('filiais-logos', 'filiais-logos', true);

-- Public read access
CREATE POLICY "Logos são públicos" ON storage.objects FOR SELECT USING (bucket_id = 'filiais-logos');

-- Admin can upload/update/delete logos
CREATE POLICY "Admin gerencia logos" ON storage.objects FOR INSERT WITH CHECK (bucket_id = 'filiais-logos' AND public.is_admin(auth.uid()));
CREATE POLICY "Admin atualiza logos" ON storage.objects FOR UPDATE USING (bucket_id = 'filiais-logos' AND public.is_admin(auth.uid()));
CREATE POLICY "Admin deleta logos" ON storage.objects FOR DELETE USING (bucket_id = 'filiais-logos' AND public.is_admin(auth.uid()));
