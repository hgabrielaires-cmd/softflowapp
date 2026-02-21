
-- Tabela para templates de mensagens (WhatsApp, SMS, E-mail, etc.)
CREATE TABLE public.message_templates (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  nome TEXT NOT NULL,
  tipo TEXT NOT NULL DEFAULT 'whatsapp',
  categoria TEXT NOT NULL DEFAULT 'termo_aceite',
  conteudo TEXT NOT NULL DEFAULT '',
  descricao TEXT,
  ativo BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.message_templates ENABLE ROW LEVEL SECURITY;

-- Admin gerencia
CREATE POLICY "Admin gerencia message_templates"
ON public.message_templates
FOR ALL
USING (is_admin(auth.uid()))
WITH CHECK (is_admin(auth.uid()));

-- Autenticados visualizam
CREATE POLICY "Autenticados visualizam message_templates"
ON public.message_templates
FOR SELECT
USING (auth.uid() IS NOT NULL);

-- Trigger updated_at
CREATE TRIGGER update_message_templates_updated_at
BEFORE UPDATE ON public.message_templates
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Inserir template padrão do Termo de Aceite
INSERT INTO public.message_templates (nome, tipo, categoria, conteudo, descricao) VALUES
(
  'Termo de Aceite - WhatsApp',
  'whatsapp',
  'termo_aceite',
  'Olá {contato.nome}! 👋

Segue o *Termo de Aceite* referente ao contrato *{contrato.numero}* da empresa *{cliente.nome_fantasia}*.

📋 *Plano:* {plano.nome}
💰 *Implantação:* R$ {valores.implantacao}
💳 *Mensalidade:* R$ {valores.mensalidade}

🔗 *Link para assinatura:* {link_assinatura}

Por favor, revise e assine o documento.

Qualquer dúvida, estamos à disposição!
Atenciosamente, Equipe {empresa.nome}',
  'Mensagem padrão enviada via WhatsApp com o termo de aceite para assinatura do cliente'
);
