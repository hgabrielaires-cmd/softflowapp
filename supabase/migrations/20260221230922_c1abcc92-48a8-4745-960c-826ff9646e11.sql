
-- Flag para forçar troca de senha no primeiro acesso
ALTER TABLE public.profiles ADD COLUMN deve_trocar_senha boolean NOT NULL DEFAULT false;

-- Inserir template de boas-vindas se não existir
INSERT INTO public.message_templates (nome, tipo, categoria, conteudo, descricao, ativo)
VALUES (
  'Boas-vindas - Novo Usuário',
  'whatsapp',
  'boas_vindas',
  'Olá {usuario.nome}! 👋

Bem-vindo(a) ao sistema SoftFlow!

Seus dados de acesso:
📧 E-mail: {usuario.email}
🔑 Senha temporária: {usuario.senha}

⚠️ *Importante:* Ao fazer o primeiro login, você será solicitado a trocar sua senha.

Acesse agora: {link_sistema}

Qualquer dúvida, estamos à disposição!',
  'Mensagem enviada por WhatsApp ao criar um novo usuário no sistema',
  true
);
