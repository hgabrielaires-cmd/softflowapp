UPDATE public.message_templates 
SET conteudo = 'Olá {contato.nome}, {saudacao}!

Tudo bem?

Me chamo *{usuario.nome}*, sou do financeiro da Softplus Tecnologia. 

Primeiro queria agradecer por ter escolhido nosso sistema para auxiliar nos processos da *{cliente.nome_fantasia}*. 

Saiba que vamos nos empenhar ao máximo para que tudo corra como o esperado. ☺️💙

Passando para alinhar o que ficou acertado com {vendedor.nome} 

☑️ *Módulos Contratados*

Plano {plano.nome}
{plano.modulos}

Valor base do plano: {plano.valor_base}

{modulos.adicionais}

*MENSALIDADE TOTAL*

{valores.mensalidade_com_desconto}

{pagamento.mensalidade.observacao}
{regras.mensalidade}

*IMPLANTAÇÃO E TREINAMENTO*

{valores.implantacao_com_desconto}

{pagamento.implantacao.observacao}
{regras.implantacao}

✍️ *TERMO DE ACEITE:*

{link_assinatura}


Qualquer dúvida é só me chamar.',
updated_at = now()
WHERE id = '4cf9b089-5318-4013-aa10-ecea1079f216'