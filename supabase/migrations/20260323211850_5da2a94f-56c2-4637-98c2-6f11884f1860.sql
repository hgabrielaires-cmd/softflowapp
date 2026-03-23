
-- Create chat-midias storage bucket
INSERT INTO storage.buckets (id, name, public)
VALUES ('chat-midias', 'chat-midias', true)
ON CONFLICT (id) DO NOTHING;

-- RLS policies for chat-midias bucket
CREATE POLICY "Authenticated users can upload chat media"
ON storage.objects FOR INSERT TO authenticated
WITH CHECK (bucket_id = 'chat-midias');

CREATE POLICY "Anyone can view chat media"
ON storage.objects FOR SELECT TO public
USING (bucket_id = 'chat-midias');

CREATE POLICY "Authenticated users can delete own chat media"
ON storage.objects FOR DELETE TO authenticated
USING (bucket_id = 'chat-midias');
