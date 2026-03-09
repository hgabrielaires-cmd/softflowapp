
-- Fix linter warnings: add explicit deny policies for tables accessed only via SECURITY DEFINER
CREATE POLICY "No direct access to login_attempts"
  ON public.login_attempts FOR ALL TO authenticated
  USING (false);

CREATE POLICY "No direct access to webhook_events"
  ON public.webhook_events FOR ALL TO authenticated
  USING (false);
