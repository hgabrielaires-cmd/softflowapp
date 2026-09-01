// ─── Módulo: Bot de Vendedores (Nova Proposta via Telegram) ───────────────
// Roteado pelo index.ts quando o telegram_id bate com um profiles.is_vendedor.
// Reaproveita a tabela telegram_pendencias como state machine (etapa/dados_extraidos).

const TELEGRAM_API = "https://api.telegram.org/bot";

export const MENU_VENDEDOR = {
  keyboard: [
    [{ text: "📋 Nova Proposta" }, { text: "🔍 Consultar Propostas" }],
    [{ text: "📊 Vendas" }, { text: "💰 Comissões" }],
  ],
  resize_keyboard: true,
  is_persistent: true,
};

type Vendedor = {
  user_id: string;
  full_name: string;
  filial_id: string | null;
  is_vendedor: boolean;
  telefone?: string | null;
};

function fmt(v: number) {
  return Number(v || 0).toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

async function sendMessage(
  token: string,
  chatId: number,
  text: string,
  replyMarkup?: unknown,
): Promise<number | null> {
  const res = await fetch(`${TELEGRAM_API}${token}/sendMessage`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      chat_id: chatId,
      text,
      parse_mode: "Markdown",
      reply_markup: replyMarkup ?? MENU_VENDEDOR,
    }),
  });
  const json = await res.json().catch(() => ({}));
  return json?.result?.message_id ?? null;
}

async function editMessage(
  token: string,
  chatId: number,
  messageId: number,
  text: string,
  replyMarkup?: unknown,
) {
  await fetch(`${TELEGRAM_API}${token}/editMessageText`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      chat_id: chatId,
      message_id: messageId,
      text,
      parse_mode: "Markdown",
      reply_markup: replyMarkup ?? { inline_keyboard: [] },
    }),
  }).catch(() => {});
}

async function answerCallback(token: string, callbackId: string, text = "") {
  await fetch(`${TELEGRAM_API}${token}/answerCallbackQuery`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ callback_query_id: callbackId, text }),
  }).catch(() => {});
}

async function sendDocument(token: string, chatId: number, buffer: Uint8Array, filename: string, caption?: string) {
  const form = new FormData();
  form.append("chat_id", String(chatId));
  if (caption) form.append("caption", caption);
  form.append("document", new Blob([buffer], { type: "application/pdf" }), filename);
  await fetch(`${TELEGRAM_API}${token}/sendDocument`, { method: "POST", body: form });
}

// ── Identifica se quem está falando é um vendedor cadastrado ──────────────
export async function buscarVendedor(supabase: any, telegramId: number): Promise<Vendedor | null> {
  const { data } = await supabase
    .from("profiles")
    .select("user_id, full_name, filial_id, is_vendedor, active, telefone, telegram_bot_acessos!inner(ativo, telegram_bots!inner(slug))")
    .eq("telegram_id", telegramId)
    .eq("active", true)
    .eq("is_vendedor", true)
    .eq("telegram_bot_acessos.ativo", true)
    .eq("telegram_bot_acessos.telegram_bots.slug", "vendas")
    .maybeSingle();

  if (!data) return null;

  return data as Vendedor;
}

// ── Entrada principal do modo vendedor ─────────────────────────────────────
export async function handleVendedorMessage(
  supabase: any,
  token: string,
  anthropicKey: string,
  chatId: number,
  vendedor: Vendedor,
  text: string,
  telegramUserId: number,
) {
  if (text === "/start" || text === "👋") {
    await sendMessage(token, chatId, `👋 Olá, *${vendedor.full_name}*!\n\nUse os botões abaixo para gerar uma proposta ou consultar suas vendas.`);
    return;
  }

  if (text === "📋 Nova Proposta") {
    await iniciarNovaProposta(supabase, token, chatId, vendedor, telegramUserId);
    return;
  }

  if (text === "🔍 Consultar Propostas") {
    await consultarPropostas(supabase, token, chatId, vendedor);
    return;
  }

  if (text === "📊 Vendas" || text === "💰 Comissões") {
    await sendMessage(token, chatId, "🚧 Em breve! Por enquanto acesse pelo Softflow web.");
    return;
  }

  // ── Pendência em aberto? processa como resposta do fluxo ──
  const { data: pendencia } = await supabase
    .from("telegram_pendencias")
    .select("*")
    .eq("chat_id", chatId)
    .eq("status", "aguardando_resposta")
    .like("etapa", "prop_%")
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (!pendencia) {
    await sendMessage(token, chatId, "Use *📋 Nova Proposta* para começar.");
    return;
  }

  if (pendencia.etapa === "prop_coleta") {
    await processarColeta(supabase, token, anthropicKey, chatId, vendedor, pendencia, text);
    return;
  }

  if (pendencia.etapa === "prop_editar_campo") {
    await processarEdicaoCampo(supabase, token, chatId, pendencia, text);
    return;
  }
}

const TOTAL_STEPS = 6;

function perguntaDoStep(n: number): string {
  switch (n) {
    case 1:
      return "📋 *Nova Proposta* — 1 de 6\n\nQual o nome da empresa (cliente)?";
    case 2:
      return "2 de 6\n\nQual o nome do contato?";
    case 4:
      return "4 de 6\n\nQual o telefone, com DDD? Ex: _84999990000_";
    case 5:
      return "5 de 6\n\nQual plano e quais módulos adicionais? Ex: _\"Plano Master, com XTAG e Tablet na Mesa\"_";
    case 6:
      return "6 de 6\n\nTem desconto ou condição especial? Se não tiver, responda *não*.\nEx: _\"10% de desconto na mensalidade, implantação em 2x\"_";
    default:
      return "";
  }
}

async function enviarPerguntaCargo(supabase: any, token: string, chatId: number) {
  const { data: cargos } = await supabase.from("crm_cargos").select("id, nome").eq("ativo", true).order("nome");
  const botoes = (cargos ?? []).map((c: any) => [{ text: c.nome, callback_data: `propcargo_${c.id}` }]);
  botoes.push([{ text: "— Nenhum / pular —", callback_data: "propcargo_nenhum" }]);
  await sendMessage(token, chatId, "3 de 6\n\nQual o cargo do contato?", { inline_keyboard: botoes });
}

async function iniciarNovaProposta(supabase: any, token: string, chatId: number, vendedor: Vendedor, telegramUserId: number) {
  await supabase
    .from("telegram_pendencias")
    .update({ status: "cancelado" })
    .eq("chat_id", chatId)
    .eq("status", "aguardando_resposta")
    .like("etapa", "prop_%");

  await supabase.from("telegram_pendencias").insert({
    chat_id: chatId,
    user_id: telegramUserId,
    etapa: "prop_coleta",
    status: "aguardando_resposta",
    filial_id: vendedor.filial_id,
    dados_extraidos: { vendedor_id: vendedor.user_id, _step: 1 },
  });

  await sendMessage(token, chatId, perguntaDoStep(1), { remove_keyboard: true });
}

async function avancarStep(
  supabase: any,
  token: string,
  chatId: number,
  pendenciaId: string,
  dados: Record<string, any>,
  proximoStep: number,
) {
  if (proximoStep > TOTAL_STEPS) {
    await mostrarResumo(supabase, token, chatId, pendenciaId, { ...dados, _step: undefined });
    return;
  }

  const novosDados = { ...dados, _step: proximoStep };
  await supabase.from("telegram_pendencias").update({ dados_extraidos: novosDados }).eq("id", pendenciaId);

  if (proximoStep === 3) {
    await enviarPerguntaCargo(supabase, token, chatId);
    return;
  }

  await sendMessage(token, chatId, perguntaDoStep(proximoStep));
}

// ── Passo 2: uma pergunta de cada vez, numerada (cargo vem por botão, não por texto) ──
async function processarColeta(
  supabase: any,
  token: string,
  anthropicKey: string,
  chatId: number,
  vendedor: Vendedor,
  pendencia: any,
  text: string,
) {
  const dados = pendencia.dados_extraidos ?? {};
  const step = dados._step ?? 1;

  if (step === 1) {
    dados.empresa_nome = text.trim();
    await avancarStep(supabase, token, chatId, pendencia.id, dados, 2);
    return;
  }

  if (step === 2) {
    dados.contato_nome = text.trim();
    await avancarStep(supabase, token, chatId, pendencia.id, dados, 3);
    return;
  }

  if (step === 3) {
    // Cargo é escolhido por botão (ver handleVendedorCallback) — se a pessoa digitar em vez de clicar, reforça o teclado.
    await enviarPerguntaCargo(supabase, token, chatId);
    return;
  }

  if (step === 4) {
    const digitos = text.replace(/\D/g, "");
    if (digitos.length < 10) {
      await sendMessage(token, chatId, "⚠️ Telefone inválido — manda com DDD, só números ou não. Ex: 84999990000");
      return;
    }
    dados.telefone = digitos;
    await avancarStep(supabase, token, chatId, pendencia.id, dados, 5);
    return;
  }

  if (step === 5) {
    const processingId = await sendMessage(token, chatId, "⏳ Entendendo...");

    const { data: planos } = await supabase.from("planos").select("nome").eq("ativo", true);
    const { data: modulos } = await supabase.from("modulos").select("nome").eq("ativo", true);

    const prompt = `Extraia o plano e os módulos adicionais mencionados nesta mensagem de um vendedor: "${text}"

Planos disponíveis: ${(planos ?? []).map((p: any) => p.nome).join(", ")}
Módulos disponíveis: ${(modulos ?? []).map((m: any) => m.nome).join(", ")}

Use o nome EXATO da lista mais parecido com o que foi dito, não invente. Retorne APENAS JSON válido:

{ "plano_nome": string|null, "modulos": ["nome1","nome2"] }`;

    const extraido = await chamarClaudeJson(anthropicKey, prompt);

    if (!extraido.plano_nome) {
      if (processingId) await editMessage(token, chatId, processingId, "⚠️ Não identifiquei o plano. Qual plano o cliente vai contratar?");
      else await sendMessage(token, chatId, "⚠️ Não identifiquei o plano. Qual plano o cliente vai contratar?");
      return;
    }

    dados.plano_nome = extraido.plano_nome;
    dados.modulos = extraido.modulos ?? [];

    if (processingId) await editMessage(token, chatId, processingId, "✅ Entendido!");
    await avancarStep(supabase, token, chatId, pendencia.id, dados, 6);
    return;
  }

  if (step === 6) {
    const semDesconto = /^n[aã]o$/i.test(text.trim());
    if (semDesconto) {
      await avancarStep(supabase, token, chatId, pendencia.id, dados, 7);
      return;
    }

    const processingId = await sendMessage(token, chatId, "⏳ Entendendo...");

    const prompt = `Extraia condições comerciais desta mensagem de um vendedor: "${text}"

Retorne APENAS JSON válido:

{
  "desconto_mensalidade_percentual": number|null,
  "desconto_mensalidade_meses": number|null,
  "desconto_implantacao_percentual": number|null,
  "valor_implantacao": number|null,
  "parcelamento_implantacao": number|null
}

Regras:
- Se o desconto da mensalidade valer só por um período (ex: "nos 2 primeiros meses", "6 meses"), preencha desconto_mensalidade_meses com esse número.
- Se o desconto da mensalidade for permanente (sem prazo mencionado), deixe desconto_mensalidade_meses como null.
- desconto_implantacao_percentual é o desconto sobre o valor de implantação/treinamento, se houver — é separado do desconto da mensalidade.`;

    const extraido = await chamarClaudeJson(anthropicKey, prompt);

    Object.assign(dados, Object.fromEntries(Object.entries(extraido).filter(([, v]) => v !== null && v !== undefined)));

    if (processingId) await editMessage(token, chatId, processingId, "✅ Entendido!");
    await avancarStep(supabase, token, chatId, pendencia.id, dados, 7);
    return;
  }
}

async function chamarClaudeJson(anthropicKey: string, prompt: string): Promise<Record<string, any>> {
  const claudeRes = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-api-key": anthropicKey,
      "anthropic-version": "2023-06-01",
    },
    body: JSON.stringify({
      model: "claude-sonnet-4-6",
      max_tokens: 500,
      messages: [{ role: "user", content: prompt }],
    }),
  });

  const claudeData = await claudeRes.json().catch(() => ({}));
  const claudeText = claudeData?.content?.[0]?.text ?? "{}";

  try {
    const match = String(claudeText).match(/\{[\s\S]*\}/);
    return match ? JSON.parse(match[0]) : {};
  } catch {
    return {};
  }
}

// ── Passo 3: resumo com botões de edição ────────────────────────────────
function textoResumo(d: Record<string, any>): string {
  return (
    `📋 *Resumo da Proposta*\n\n` +
    `🏢 Empresa: *${d.empresa_nome}*\n` +
    `👤 Contato: ${d.contato_nome}${d.cargo_nome ? ` (${d.cargo_nome})` : ""}\n` +
    `📞 Telefone: ${d.telefone}\n` +
    (d.segmento_nome ? `🏷️ Segmento: ${d.segmento_nome}\n` : "") +
    (d.campanha_nome ? `📣 Campanha: ${d.campanha_nome}\n` : "") +
    (d.canal_nome ? `📡 Canal: ${d.canal_nome}\n` : "") +
    `\n📦 Plano: *${d.plano_nome}*\n` +
    (d.modulos?.length ? `➕ Módulos: ${d.modulos.join(", ")}\n` : "") +
    (d.desconto_mensalidade_percentual
      ? `🎁 Desconto mensalidade: ${d.desconto_mensalidade_percentual}%${d.desconto_mensalidade_meses ? ` (primeiros ${d.desconto_mensalidade_meses} meses)` : " (permanente)"}\n`
      : "") +
    (d.desconto_implantacao_percentual ? `🏗️ Desconto implantação: ${d.desconto_implantacao_percentual}%\n` : "") +
    (d.valor_implantacao ? `💵 Implantação: ${fmt(d.valor_implantacao)}${d.parcelamento_implantacao > 1 ? ` em ${d.parcelamento_implantacao}x` : ""}\n` : "") +
    `\nConfirma?`
  );
}

const TECLADO_RESUMO = {
  inline_keyboard: [
    [{ text: "✅ Confirmar e Gerar PDF", callback_data: "prop_confirmar" }],
    [
      { text: "✏️ Editar Empresa", callback_data: "prop_edit_empresa_nome" },
      { text: "✏️ Editar Contato", callback_data: "prop_edit_contato_nome" },
    ],
    [
      { text: "✏️ Editar Telefone", callback_data: "prop_edit_telefone" },
      { text: "✏️ Editar Plano", callback_data: "prop_edit_plano_nome" },
    ],
    [{ text: "✏️ Editar Desconto", callback_data: "prop_edit_desconto_percentual" }],
    [{ text: "❌ Cancelar", callback_data: "prop_cancelar" }],
  ],
};

async function mostrarResumo(
  supabase: any,
  token: string,
  chatId: number,
  pendenciaId: string,
  dados: Record<string, any>,
  messageId?: number | null,
) {
  await supabase
    .from("telegram_pendencias")
    .update({ etapa: "prop_resumo", dados_extraidos: dados })
    .eq("id", pendenciaId);

  const texto = textoResumo(dados);
  if (messageId) await editMessage(token, chatId, messageId, texto, TECLADO_RESUMO);
  else await sendMessage(token, chatId, texto, TECLADO_RESUMO);
}

async function processarEdicaoCampo(supabase: any, token: string, chatId: number, pendencia: any, text: string) {
  const campo = (pendencia.dados_extraidos?._editando as string) ?? null;
  if (!campo) return;
  const dados = { ...pendencia.dados_extraidos };
  delete dados._editando;
  dados[campo] = campo === "desconto_percentual" ? Number(text.replace(/[^\d.]/g, "")) : text.trim();
  await mostrarResumo(supabase, token, chatId, pendencia.id, dados);
}

// ── Callbacks (botões inline) ───────────────────────────────────────────
export async function handleVendedorCallback(
  supabase: any,
  token: string,
  chatId: number,
  vendedor: Vendedor,
  callbackQuery: any,
) {
  const data = String(callbackQuery.data ?? "");
  const messageId = callbackQuery.message?.message_id;

  const { data: pendencia } = await supabase
    .from("telegram_pendencias")
    .select("*")
    .eq("chat_id", chatId)
    .eq("status", "aguardando_resposta")
    .like("etapa", "prop_%")
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (!pendencia) {
    await answerCallback(token, callbackQuery.id, "⚠️ Proposta expirada, comece de novo.");
    return;
  }

  // ── Seleção de cargo por botão (passo 3 da coleta) ──
  if (data.startsWith("propcargo_") && pendencia.etapa === "prop_coleta") {
    const escolhido = data.replace("propcargo_", "");
    const dados = pendencia.dados_extraidos ?? {};

    if (escolhido !== "nenhum") {
      const { data: cargo } = await supabase.from("crm_cargos").select("nome").eq("id", escolhido).maybeSingle();
      if (cargo?.nome) dados.cargo_nome = cargo.nome;
    }

    await answerCallback(token, callbackQuery.id, "✅");
    await editMessage(token, chatId, messageId, `3 de 6\n\n✅ Cargo: *${dados.cargo_nome ?? "não informado"}*`);
    await avancarStep(supabase, token, chatId, pendencia.id, dados, 4);
    return;
  }

  if (data === "prop_cancelar") {
    await answerCallback(token, callbackQuery.id, "❌");
    await supabase.from("telegram_pendencias").update({ status: "cancelado" }).eq("id", pendencia.id);
    await editMessage(token, chatId, messageId, "❌ Proposta cancelada.");
    return;
  }

  if (data.startsWith("prop_edit_")) {
    const campo = data.replace("prop_edit_", "");
    await answerCallback(token, callbackQuery.id, "✏️");
    await supabase
      .from("telegram_pendencias")
      .update({ etapa: "prop_editar_campo", dados_extraidos: { ...pendencia.dados_extraidos, _editando: campo } })
      .eq("id", pendencia.id);
    await editMessage(token, chatId, messageId, `✏️ Digite o novo valor:`);
    return;
  }

  if (data === "prop_confirmar") {
    await answerCallback(token, callbackQuery.id, "⏳ Gerando PDF...");
    await confirmarEGerarPdf(supabase, token, chatId, vendedor, pendencia, messageId);
    return;
  }

  if (data === "prop_enviar_cliente") {
    await answerCallback(token, callbackQuery.id, "⏳ Enviando...");
    await dispararWhatsAppEregistrarCrm(supabase, token, chatId, vendedor, pendencia, messageId);
    return;
  }

  if (data === "prop_nao_enviar") {
    await answerCallback(token, callbackQuery.id, "👍");
    await supabase.from("telegram_pendencias").update({ status: "concluido" }).eq("id", pendencia.id);
    await editMessage(token, chatId, messageId, "👍 Ok, PDF fica salvo. Envie manualmente quando quiser.");
    return;
  }

  await answerCallback(token, callbackQuery.id);
}

// ── Passo 4/5: monta o ProposalData real, chama o gerador visual (/print) e envia o PDF pro vendedor ──
const PROPOSAL_ENGINE_URL = "https://softplus-pitch.lovable.app/print";

function toBase64Utf8(str: string): string {
  return btoa(unescape(encodeURIComponent(str)));
}

const CATEGORIA_PADRAO = "operacao"; // fallback quando não dá pra inferir a categoria real do módulo

async function confirmarEGerarPdf(
  supabase: any,
  token: string,
  chatId: number,
  vendedor: Vendedor,
  pendencia: any,
  messageId: number,
) {
  const d = pendencia.dados_extraidos;
  const BROWSERLESS_API_KEY = Deno.env.get("BROWSERLESS_API_KEY");

  // ── Resolve o plano e os módulos escolhidos com dados reais do banco ──
  const { data: plano } = await supabase
    .from("planos")
    .select("nome, descricao, valor_implantacao_padrao, valor_mensalidade_padrao")
    .ilike("nome", d.plano_nome)
    .maybeSingle();

  const nomesModulos: string[] = Array.isArray(d.modulos) ? d.modulos : [];
  let modulosContratados: any[] = [];
  if (nomesModulos.length) {
    const { data: mods } = await supabase
      .from("modulos")
      .select("id, nome, descricao, valor_mensalidade_modulo, valor_implantacao_modulo")
      .in("nome", nomesModulos);
    modulosContratados = mods ?? [];

    for (const nome of nomesModulos) {
      if (!modulosContratados.some((m) => m.nome.toLowerCase() === nome.toLowerCase())) {
        const { data: aprox } = await supabase
          .from("modulos")
          .select("id, nome, descricao, valor_mensalidade_modulo, valor_implantacao_modulo")
          .ilike("nome", `%${nome}%`)
          .limit(1)
          .maybeSingle();
        if (aprox) modulosContratados.push(aprox);
      }
    }
  }

  // ── Módulos sugeridos (opcionais) — outros ativos que o cliente ainda não contratou ──
  const idsContratados = modulosContratados.map((m) => m.id).filter(Boolean);
  const { data: modulosOpcionaisRaw } = await supabase
    .from("modulos")
    .select("id, nome, descricao, valor_mensalidade_modulo")
    .eq("ativo", true)
    .not("id", "in", `(${idsContratados.length ? idsContratados.join(",") : "00000000-0000-0000-0000-000000000000"})`)
    .limit(3);

  const descontoPct = Number(d.desconto_percentual || 0);
  const aplicarDesconto = (valor: number) => Math.max(0, Math.round(valor * (1 - descontoPct / 100) * 100) / 100);

  const primeiraLinha = (texto?: string | null) => (texto || "").split(",")[0]?.trim() || "";

  const includedFeatures = (plano?.descricao || "")
    .split(",")
    .map((s: string) => s.trim())
    .filter(Boolean)
    .map((nome: string, i: number) => ({
      id: `feature-${i}`,
      name: nome,
      description: "",
      category: CATEGORIA_PADRAO,
      kind: "incluido",
    }));

  const addons = modulosContratados.map((m) => ({
    id: m.id ?? m.nome,
    name: m.nome,
    description: primeiraLinha(m.descricao) || m.nome,
    category: CATEGORIA_PADRAO,
    kind: "adicional",
    quantity: 1,
    listMonthlyPrice: Number(m.valor_mensalidade_modulo || 0),
    unitMonthlyPrice: aplicarDesconto(Number(m.valor_mensalidade_modulo || 0)),
  }));

  const optionals = (modulosOpcionaisRaw ?? []).map((m: any) => ({
    id: m.id,
    name: m.nome,
    description: primeiraLinha(m.descricao) || m.nome,
    category: CATEGORIA_PADRAO,
    kind: "opcional",
    unitMonthlyPrice: Number(m.valor_mensalidade_modulo || 0),
  }));

  const hoje = new Date();
  const validade = new Date(hoje.getTime() + 15 * 24 * 60 * 60 * 1000);
  const fmtData = (dt: Date) => dt.toLocaleDateString("pt-BR");

  const proposalData = {
    meta: {
      number: `${hoje.getFullYear()}-${String(Math.floor(1000 + Math.random() * 9000))}`,
      issuedAt: fmtData(hoje),
      consultant: vendedor.full_name,
      consultantContact: vendedor.telefone ?? undefined,
      headline: `Sua operação inteira integrada, pensada para ${d.empresa_nome}.`,
      subheadline: "Uma plataforma única para operação, gestão, vendas e inteligência.",
    },
    client: {
      companyName: d.empresa_nome,
      contactName: d.contato_nome,
      segment: d.segmento_nome ?? undefined,
    },
    plan: {
      name: plano?.nome ?? d.plano_nome,
      listMonthlyPrice: Number(plano?.valor_mensalidade_padrao || 0),
      negotiatedMonthlyPrice: aplicarDesconto(Number(plano?.valor_mensalidade_padrao || 0)),
    },
    includedFeatures,
    addons,
    optionals,
    implementation: {
      title: "Implantação e treinamento",
      description: "Instalação do sistema, cadastro de cardápio e treinamento da equipe.",
      listPrice: Number(d.valor_implantacao ?? plano?.valor_implantacao_padrao ?? 0),
      negotiatedPrice: Number(d.valor_implantacao ?? plano?.valor_implantacao_padrao ?? 0),
      paymentCondition: d.parcelamento_implantacao > 1 ? `Em até ${d.parcelamento_implantacao}x` : "Pagamento único",
    },
    conditions: {
      paymentMethods: ["PIX", "Cartão de crédito"],
      billingCycle: "Mensalidade cobrada mensalmente",
      validUntil: fmtData(validade),
    },
  };

  if (!BROWSERLESS_API_KEY) {
    await editMessage(token, chatId, messageId, "❌ BROWSERLESS_API_KEY não configurada.");
    return;
  }

  const printUrl = `${PROPOSAL_ENGINE_URL}?data=${toBase64Utf8(JSON.stringify(proposalData))}`;

  const pdfRes = await fetch(`https://production-sfo.browserless.io/pdf?token=${BROWSERLESS_API_KEY}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ url: printUrl, options: { format: "A4", landscape: true, printBackground: true } }),
  });

  if (!pdfRes.ok) {
    await editMessage(token, chatId, messageId, "❌ Não consegui gerar o PDF agora. Tente novamente em instantes.");
    return;
  }

  const pdfFinalBytes = new Uint8Array(await pdfRes.arrayBuffer());

  const storagePath = `propostas/${Date.now()}_${vendedor.user_id}.pdf`;
  await supabase.storage.from("propostas-pdf").upload(storagePath, pdfFinalBytes, { contentType: "application/pdf", upsert: true });

  await supabase
    .from("telegram_pendencias")
    .update({ etapa: "prop_aguardando_envio", dados_extraidos: { ...d, pdf_path: storagePath } })
    .eq("id", pendencia.id);

  await editMessage(token, chatId, messageId, "✅ PDF gerado!");
  await sendDocument(token, chatId, pdfFinalBytes, `Proposta_${d.empresa_nome}.pdf`, `Proposta para ${d.empresa_nome}`);

  await sendMessage(
    token,
    chatId,
    "Enviar essa proposta para o cliente agora pelo WhatsApp?",
    { inline_keyboard: [
      [{ text: "✅ Enviar para o cliente", callback_data: "prop_enviar_cliente" }],
      [{ text: "⏸️ Não enviar agora", callback_data: "prop_nao_enviar" }],
    ] },
  );
}

// ── Passo 6/7/8/9: dispara via WhatsApp do vendedor e registra no CRM ───
async function dispararWhatsAppEregistrarCrm(
  supabase: any,
  token: string,
  chatId: number,
  vendedor: Vendedor,
  pendencia: any,
  messageId: number,
) {
  const d = pendencia.dados_extraidos;

  // ── busca ou cria empresa (clientes) ──
  let { data: cliente } = await supabase
    .from("clientes")
    .select("id")
    .ilike("nome_fantasia", d.empresa_nome)
    .eq("filial_id", vendedor.filial_id)
    .maybeSingle();

  if (!cliente) {
    const { data: novoCliente } = await supabase
      .from("clientes")
      .insert({
        nome_fantasia: d.empresa_nome,
        razao_social: d.empresa_nome,
        cnpj_cpf: "",
        contato_nome: d.contato_nome,
        telefone: d.telefone,
        filial_id: vendedor.filial_id,
        ativo: true,
        status_financeiro: "novo",
      })
      .select("id")
      .single();
    cliente = novoCliente;
  }

  // ── busca funil/etapa "Proposta" padrão ──
  const { data: etapaProposta } = await supabase
    .from("crm_etapas")
    .select("id, funil_id")
    .ilike("nome", "%proposta%")
    .eq("ativo", true)
    .limit(1)
    .maybeSingle();

  const { data: plano } = await supabase.from("planos").select("id, valor_implantacao_padrao, valor_mensalidade_padrao").ilike("nome", d.plano_nome).maybeSingle();
  const { data: segmento } = d.segmento_nome ? await supabase.from("segmentos").select("id").ilike("nome", d.segmento_nome).maybeSingle() : { data: null };
  const { data: campanha } = d.campanha_nome ? await supabase.from("crm_campanhas").select("id").ilike("nome", d.campanha_nome).maybeSingle() : { data: null };
  const { data: canal } = d.canal_nome ? await supabase.from("crm_canais").select("id").ilike("nome", d.canal_nome).maybeSingle() : { data: null };
  const { data: cargo } = d.cargo_nome ? await supabase.from("crm_cargos").select("id").ilike("nome", d.cargo_nome).maybeSingle() : { data: null };

  // ── cria oportunidade ──
  const { data: oportunidade } = await supabase
    .from("crm_oportunidades")
    .insert({
      titulo: d.empresa_nome,
      cliente_id: cliente?.id ?? null,
      funil_id: etapaProposta?.funil_id ?? null,
      etapa_id: etapaProposta?.id ?? null,
      responsavel_id: vendedor.user_id,
      valor: (plano?.valor_mensalidade_padrao ?? 0),
      desconto_mensalidade: d.desconto_percentual ?? 0,
      desconto_mensalidade_tipo: "%",
      valor_implantacao_padrao: d.valor_implantacao ?? plano?.valor_implantacao_padrao ?? 0,
      parcelamento_implantacao: d.parcelamento_implantacao ?? 1,
      segmento_ids: segmento?.id ? [segmento.id] : null,
      campanha_id: campanha?.id ?? null,
      canal_id: canal?.id ?? null,
      status: "aberto",
      criado_via: "telegram",
    })
    .select("id")
    .single();

  if (oportunidade?.id) {
    await supabase.from("crm_oportunidade_contatos").insert({
      oportunidade_id: oportunidade.id,
      nome: d.contato_nome,
      telefone: d.telefone,
      cargo_id: cargo?.id ?? null,
    });

    if (plano?.id) {
      await supabase.from("crm_oportunidade_produtos").insert({
        oportunidade_id: oportunidade.id,
        tipo: "plano",
        referencia_id: plano.id,
        quantidade: 1,
        valor_implantacao: d.valor_implantacao ?? plano.valor_implantacao_padrao,
        valor_mensalidade: plano.valor_mensalidade_padrao,
      });
    }
  }

  // ── dispara WhatsApp via instância do vendedor ──
  const { data: setorVendedor } = await supabase
    .from("setores")
    .select("instance_name")
    .eq("usuario_id", vendedor.user_id)
    .eq("ativo", true)
    .not("instance_name", "is", null)
    .limit(1)
    .maybeSingle();

  const instanceName = setorVendedor?.instance_name ?? "Softflow_WhatsApp";

  const { data: cfgEvolution } = await supabase
    .from("integracoes_config")
    .select("server_url, token")
    .eq("nome", "evolution_api")
    .eq("ativo", true)
    .maybeSingle();

  let enviado = false;
  if (cfgEvolution?.server_url && cfgEvolution?.token) {
    const { data: signed } = await supabase.storage.from("propostas-pdf").createSignedUrl(d.pdf_path, 60 * 60 * 24 * 7);
    const mensagem = `Olá, ${d.contato_nome}! Segue a proposta para *${d.empresa_nome}*. Qualquer dúvida, me chama por aqui! 😊`;

    const res = await fetch(`${Deno.env.get("SUPABASE_URL")}/functions/v1/evolution-api`, {
      method: "POST",
      headers: { "Content-Type": "application/json", "Authorization": `Bearer ${Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")}` },
      body: JSON.stringify({
        action: "send_media",
        server_url: cfgEvolution.server_url,
        api_key: cfgEvolution.token,
        instance_name: instanceName,
        number: d.telefone,
        mediatype: "document",
        media: signed?.signedUrl,
        caption: mensagem,
        fileName: `Proposta_${d.empresa_nome}.pdf`,
      }),
    });
    enviado = res.ok;
  }

  await supabase
    .from("telegram_pendencias")
    .update({ status: "concluido" })
    .eq("id", pendencia.id);

  if (oportunidade?.id) {
    await supabase.from("crm_proposta_envios").insert({
      oportunidade_id: oportunidade.id,
      usuario_id: vendedor.user_id,
      instancia_usada: instanceName,
      numero_destino: d.telefone,
      contato_nome: d.contato_nome,
      tipo: "pdf_telegram",
      status_envio: enviado ? "enviado" : "erro",
    });
  }

  await editMessage(
    token,
    chatId,
    messageId,
    enviado
      ? `✅ *Proposta enviada!*\n\n📤 WhatsApp: ${instanceName}\n🏢 Oportunidade registrada no CRM na etapa Proposta.`
      : `⚠️ Oportunidade registrada no CRM, mas não consegui confirmar o envio pelo WhatsApp. Confira a instância *${instanceName}* no painel.`,
  );
}

// ── Consultar propostas do vendedor ─────────────────────────────────────
async function consultarPropostas(supabase: any, token: string, chatId: number, vendedor: Vendedor) {
  const { data: oportunidades } = await supabase
    .from("crm_oportunidades")
    .select("titulo, valor, created_at")
    .eq("responsavel_id", vendedor.user_id)
    .order("created_at", { ascending: false })
    .limit(5);

  if (!oportunidades?.length) {
    await sendMessage(token, chatId, "Você ainda não tem propostas registradas.");
    return;
  }

  const linhas = oportunidades
    .map((o: any) => `• *${o.titulo}* — ${fmt(o.valor)}`)
    .join("\n");

  await sendMessage(token, chatId, `🔍 *Suas últimas propostas:*\n\n${linhas}`);
}
