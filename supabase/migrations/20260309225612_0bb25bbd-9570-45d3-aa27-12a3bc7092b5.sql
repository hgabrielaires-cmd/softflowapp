
-- ========================================
-- Fase 1: Segurança - Tabelas e Triggers
-- ========================================

-- 1. Tabela de logs de auditoria
CREATE TABLE public.audit_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid,
  action text NOT NULL,
  entity_type text NOT NULL,
  entity_id text,
  details jsonb DEFAULT '{}',
  ip_address text,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_audit_logs_created ON public.audit_logs (created_at DESC);
CREATE INDEX idx_audit_logs_user ON public.audit_logs (user_id);
CREATE INDEX idx_audit_logs_entity ON public.audit_logs (entity_type, entity_id);

ALTER TABLE public.audit_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can read audit logs"
  ON public.audit_logs FOR SELECT TO authenticated
  USING (public.is_admin(auth.uid()));

CREATE POLICY "System can insert audit logs"
  ON public.audit_logs FOR INSERT TO authenticated
  WITH CHECK (true);

-- 2. Tabela de tentativas de login
CREATE TABLE public.login_attempts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  email text NOT NULL,
  ip_address text,
  success boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_login_attempts_lookup
  ON public.login_attempts (email, created_at DESC)
  WHERE success = false;

ALTER TABLE public.login_attempts ENABLE ROW LEVEL SECURITY;

-- 3. RPC: Verificar se login está bloqueado (3 falhas em 5 min)
CREATE OR REPLACE FUNCTION public.check_login_blocked(p_email text)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = 'public'
AS $$
  SELECT COALESCE(
    (SELECT COUNT(*) >= 3
     FROM public.login_attempts
     WHERE email = lower(trim(p_email))
       AND success = false
       AND created_at > now() - interval '5 minutes'),
    false
  );
$$;

-- 4. RPC: Registrar tentativa de login + audit log para falhas
CREATE OR REPLACE FUNCTION public.record_login_attempt(p_email text, p_success boolean, p_ip text DEFAULT NULL)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $$
BEGIN
  INSERT INTO public.login_attempts (email, ip_address, success)
  VALUES (lower(trim(p_email)), p_ip, p_success);

  IF NOT p_success THEN
    INSERT INTO public.audit_logs (action, entity_type, details, ip_address)
    VALUES ('login_failed', 'auth', jsonb_build_object('email', lower(trim(p_email))), p_ip);
  END IF;

  DELETE FROM public.login_attempts WHERE created_at < now() - interval '24 hours';
END;
$$;

GRANT EXECUTE ON FUNCTION public.check_login_blocked(text) TO anon;
GRANT EXECUTE ON FUNCTION public.record_login_attempt(text, boolean, text) TO anon;

-- 5. Trigger de auditoria: Alterações em user_roles (permissões)
CREATE OR REPLACE FUNCTION public.audit_user_roles_change()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    INSERT INTO public.audit_logs (user_id, action, entity_type, entity_id, details)
    VALUES (auth.uid(), 'role_added', 'user_roles', NEW.user_id::text,
      jsonb_build_object('role', NEW.role, 'target_user_id', NEW.user_id));
  ELSIF TG_OP = 'DELETE' THEN
    INSERT INTO public.audit_logs (user_id, action, entity_type, entity_id, details)
    VALUES (auth.uid(), 'role_removed', 'user_roles', OLD.user_id::text,
      jsonb_build_object('role', OLD.role, 'target_user_id', OLD.user_id));
  END IF;
  RETURN COALESCE(NEW, OLD);
END;
$$;

CREATE TRIGGER tr_audit_user_roles
  AFTER INSERT OR DELETE ON public.user_roles
  FOR EACH ROW EXECUTE FUNCTION public.audit_user_roles_change();

-- 6. Trigger de auditoria: Mudanças de status em contratos
CREATE OR REPLACE FUNCTION public.audit_contratos_change()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $$
BEGIN
  IF OLD.status IS DISTINCT FROM NEW.status THEN
    INSERT INTO public.audit_logs (user_id, action, entity_type, entity_id, details)
    VALUES (auth.uid(), 'status_changed', 'contratos', NEW.id::text,
      jsonb_build_object('old_status', OLD.status, 'new_status', NEW.status, 'numero', NEW.numero_exibicao));
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER tr_audit_contratos
  AFTER UPDATE ON public.contratos
  FOR EACH ROW EXECUTE FUNCTION public.audit_contratos_change();

-- 7. Trigger de auditoria: Faturas (criação e alterações financeiras)
CREATE OR REPLACE FUNCTION public.audit_faturas_change()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    INSERT INTO public.audit_logs (user_id, action, entity_type, entity_id, details)
    VALUES (auth.uid(), 'fatura_created', 'faturas', NEW.id::text,
      jsonb_build_object('numero', NEW.numero_fatura, 'valor_final', NEW.valor_final, 'status', NEW.status));
  ELSIF TG_OP = 'UPDATE' AND (
    OLD.status IS DISTINCT FROM NEW.status
    OR OLD.valor_final IS DISTINCT FROM NEW.valor_final
    OR OLD.data_pagamento IS DISTINCT FROM NEW.data_pagamento
  ) THEN
    INSERT INTO public.audit_logs (user_id, action, entity_type, entity_id, details)
    VALUES (auth.uid(), 'fatura_updated', 'faturas', NEW.id::text,
      jsonb_build_object(
        'old_status', OLD.status, 'new_status', NEW.status,
        'old_valor', OLD.valor_final, 'new_valor', NEW.valor_final,
        'numero', NEW.numero_fatura
      ));
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER tr_audit_faturas
  AFTER INSERT OR UPDATE ON public.faturas
  FOR EACH ROW EXECUTE FUNCTION public.audit_faturas_change();

-- 8. Tabela de controle de webhooks processados (dedup)
CREATE TABLE public.webhook_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  source text NOT NULL,
  event_id text NOT NULL,
  processed_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(source, event_id)
);

CREATE INDEX idx_webhook_events_lookup ON public.webhook_events (source, event_id);
ALTER TABLE public.webhook_events ENABLE ROW LEVEL SECURITY;
