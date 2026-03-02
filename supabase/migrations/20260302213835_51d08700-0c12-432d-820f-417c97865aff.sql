-- Índices para FKs sem índice nas tabelas mais importantes para performance

-- painel_atendimento (tabela central do sistema, vai crescer muito)
CREATE INDEX idx_painel_atendimento_etapa_id ON public.painel_atendimento(etapa_id);
CREATE INDEX idx_painel_atendimento_cliente_id ON public.painel_atendimento(cliente_id);
CREATE INDEX idx_painel_atendimento_filial_id ON public.painel_atendimento(filial_id);
CREATE INDEX idx_painel_atendimento_contrato_id ON public.painel_atendimento(contrato_id);
CREATE INDEX idx_painel_atendimento_pedido_id ON public.painel_atendimento(pedido_id);
CREATE INDEX idx_painel_atendimento_responsavel_id ON public.painel_atendimento(responsavel_id);
CREATE INDEX idx_painel_atendimento_jornada_id ON public.painel_atendimento(jornada_id);
CREATE INDEX idx_painel_atendimento_plano_id ON public.painel_atendimento(plano_id);

-- painel_comentarios
CREATE INDEX idx_painel_comentarios_card_id ON public.painel_comentarios(card_id);
CREATE INDEX idx_painel_comentarios_parent_id ON public.painel_comentarios(parent_id);

-- painel_apontamentos
CREATE INDEX idx_painel_apontamentos_card_id ON public.painel_apontamentos(card_id);
CREATE INDEX idx_painel_apontamentos_usuario_id ON public.painel_apontamentos(usuario_id);

-- jornada_etapas e atividades (usados em joins frequentes)
CREATE INDEX idx_jornada_etapas_jornada_id ON public.jornada_etapas(jornada_id);
CREATE INDEX idx_jornada_atividades_etapa_id ON public.jornada_atividades(etapa_id);

-- pedidos (vai crescer com vendas)
CREATE INDEX idx_pedidos_cliente_id ON public.pedidos(cliente_id);
CREATE INDEX idx_pedidos_filial_id ON public.pedidos(filial_id);
CREATE INDEX idx_pedidos_plano_id ON public.pedidos(plano_id);
CREATE INDEX idx_pedidos_vendedor_id ON public.pedidos(vendedor_id);

-- contratos
CREATE INDEX idx_contratos_cliente_id ON public.contratos(cliente_id);
CREATE INDEX idx_contratos_pedido_id ON public.contratos(pedido_id);
CREATE INDEX idx_contratos_plano_id ON public.contratos(plano_id);

-- clientes e contatos
CREATE INDEX idx_clientes_filial_id ON public.clientes(filial_id);
CREATE INDEX idx_cliente_contatos_cliente_id ON public.cliente_contatos(cliente_id);

-- profiles
CREATE INDEX idx_profiles_filial_id ON public.profiles(filial_id);

-- plano_modulos
CREATE INDEX idx_plano_modulos_plano_id ON public.plano_modulos(plano_id);
CREATE INDEX idx_plano_modulos_modulo_id ON public.plano_modulos(modulo_id);

-- pedido_comentarios
CREATE INDEX idx_pedido_comentarios_pedido_id ON public.pedido_comentarios(pedido_id);