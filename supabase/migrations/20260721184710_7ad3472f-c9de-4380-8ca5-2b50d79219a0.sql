
-- clientes: filtro ativo + ordenação nome_fantasia
CREATE INDEX IF NOT EXISTS idx_clientes_ativo_nome ON public.clientes (ativo, nome_fantasia);
CREATE INDEX IF NOT EXISTS idx_clientes_nome_fantasia ON public.clientes (nome_fantasia);
CREATE INDEX IF NOT EXISTS idx_clientes_filial_id ON public.clientes (filial_id);

-- notificacoes: destinatário + created_at desc
CREATE INDEX IF NOT EXISTS idx_notificacoes_dest_user_created ON public.notificacoes (destinatario_user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_notificacoes_dest_role_created ON public.notificacoes (destinatario_role, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_notificacoes_created ON public.notificacoes (created_at DESC);

-- notificacoes_lidas: por user
CREATE INDEX IF NOT EXISTS idx_notificacoes_lidas_user ON public.notificacoes_lidas (user_id);

-- painel_checklist_progresso: filtro concluido
CREATE INDEX IF NOT EXISTS idx_painel_checklist_card ON public.painel_checklist_progresso (card_id);
CREATE INDEX IF NOT EXISTS idx_painel_checklist_concluido_false ON public.painel_checklist_progresso (card_id) WHERE concluido = false;

-- painel_atendimento
CREATE INDEX IF NOT EXISTS idx_painel_atendimento_status_created ON public.painel_atendimento (status_projeto, created_at);

-- contratos
CREATE INDEX IF NOT EXISTS idx_contratos_pedido_id ON public.contratos (pedido_id);
CREATE INDEX IF NOT EXISTS idx_contratos_zapsign_contrato ON public.contratos_zapsign (contrato_id);

-- chat_interno_mensagens
CREATE INDEX IF NOT EXISTS idx_chat_interno_msg_conv_created ON public.chat_interno_mensagens (conversa_id, created_at DESC);

-- pedidos
CREATE INDEX IF NOT EXISTS idx_pedidos_created ON public.pedidos (created_at DESC);

-- user_roles (has_role hot path)
CREATE INDEX IF NOT EXISTS idx_user_roles_user_id ON public.user_roles (user_id);
