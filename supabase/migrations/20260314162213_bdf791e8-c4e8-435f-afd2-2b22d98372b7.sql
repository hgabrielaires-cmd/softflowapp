
CREATE POLICY "Authenticated can update tags" ON public.helpdesk_tags
  FOR UPDATE TO authenticated USING (true) WITH CHECK (true);

CREATE POLICY "Authenticated can delete tags" ON public.helpdesk_tags
  FOR DELETE TO authenticated USING (true);
