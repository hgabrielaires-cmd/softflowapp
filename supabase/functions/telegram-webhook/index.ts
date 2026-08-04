// ─── Edge Function: Telegram Webhook (financeiro) ─────────────────────────
// Recebe comprovantes/NF pelo Telegram, lê com Claude Vision e lança despesa.
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import {
  relatorioCategorias,
  relatorioDre,
  relatorioMaiores,
  relatorioPendentes,
  relatorioStatus,
  type Periodo,
} from "./relatorios.ts";
import { relatorioVendas } from "./vendas.ts";

const TELEGRAM_API = "https://api.telegram.org/bot";
const PLANOS_POR_PAGINA = 8;

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "content-type, x-telegram-bot-api-secret-token",
};

function ok(body: unknown = { ok: true }) {
  return new Response(JSON.stringify(body), {
    status: 200,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

const MENU_TECLADO = {
  keyboard: [
    [{ text: "📊 DRE" }, { text: "📁 Categorias" }],
    [{ text: "🏆 Maiores Gastos" }, { text: "📋 Pendentes" }],
    [{ text: "💰 Status" }, { text: "🛒 Vendas" }],
    [{ text: "❓ Ajuda" }],
  ],
  resize_keyboard: true,
  is_persistent: true,
};

async function sendMessage(
  token: string,
  chatId: number,
  text: string,
  replyMarkup?: unknown,
  parseMode = "Markdown",
): Promise<number | null> {
  try {
    const res = await fetch(`${TELEGRAM_API}${token}/sendMessage`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        chat_id: chatId,
        text,
        parse_mode: parseMode,
        reply_markup: replyMarkup ?? MENU_TECLADO,
      }),
    });

    const json = await res.json().catch(() => ({}));
    return json?.result?.message_id ?? null;
  } catch (e) {
    console.error("[telegram] sendMessage:", (e as Error).message);
    return null;
  }
}

async function editMessage(
  token: string,
  chatId: number,
  messageId: number,
  text: string,
  replyMarkup?: unknown,
) {
  const res = await fetch(`${TELEGRAM_API}${token}/editMessageText`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      chat_id: chatId,
      message_id: messageId,
      text,
      parse_mode: "Markdown",
      reply_markup: replyMarkup ?? { inline_keyboard: [] },
    }),
  }).catch((e) => {
    console.error("[telegram] editMessageText:", (e as Error).message);
    return null;
  });
  if (res && !res.ok) {
    console.error("[telegram] editMessageText:", JSON.stringify(await res.json()).slice(0, 300));
  }
}

async function answerCallback(token: string, callbackId: string, text: string) {
  await fetch(`${TELEGRAM_API}${token}/answerCallbackQuery`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ callback_query_id: callbackId, text }),
  }).catch((e) => console.error("[telegram] answerCallbackQuery:", (e as Error).message));
}

function formatMoeda(valor: number) {
  return Number(valor || 0).toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

function toBase64(buffer: ArrayBuffer) {
  const bytes = new Uint8Array(buffer);
  let bin = "";
  const chunk = 0x8000;
  for (let i = 0; i < bytes.length; i += chunk) {
    bin += String.fromCharCode(...bytes.subarray(i, i + chunk));
  }
  return btoa(bin);
}

type Plano = { id: string; codigo: string; nome: string };

async function listarPlanos(supabase: any): Promise<Plano[]> {
  const { data } = await supabase
    .from("fin_plano_contas")
    .select("id, nome, codigo")
    .eq("tipo", "despesa")
    .eq("aceita_lancamento", true)
    .eq("ativo", true)
    .order("codigo");
  return (data ?? []) as Plano[];
}

// Teclado com a página de planos + navegação
function tecladoPlanos(planos: Plano[], pagina: number, escolhidoId: string | null) {
  const totalPaginas = Math.max(1, Math.ceil(planos.length / PLANOS_POR_PAGINA));
  const page = Math.min(Math.max(pagina, 0), totalPaginas - 1);
  const slice = planos.slice(page * PLANOS_POR_PAGINA, (page + 1) * PLANOS_POR_PAGINA);

  const rows: Array<Array<{ text: string; callback_data: string }>> = slice.map((p) => [
    {
      text: `${p.id === escolhidoId ? "✅ " : ""}${p.codigo} — ${p.nome}`.slice(0, 60),
      callback_data: `pl_${p.id}`,
    },
  ]);

  const nav: Array<{ text: string; callback_data: string }> = [];
  if (page > 0) nav.push({ text: "⬆️ Anteriores", callback_data: `pg_${page - 1}` });
  if (page < totalPaginas - 1) nav.push({ text: "⬇️ Ver mais planos", callback_data: `pg_${page + 1}` });
  if (nav.length) rows.push(nav);

  if (escolhidoId) rows.push([{ text: "✅ CONFIRMAR LANÇAMENTO", callback_data: "ok" }]);

  return { inline_keyboard: rows };
}

// ── Seleção de período dos relatórios ────────────────────────────────────
type RelatorioTipo = "dre" | "categorias" | "maiores" | "status" | "pendentes";

function getPeriodo(tipo: string): Periodo {
  const hoje = new Date();
  const fmt = (dt: Date) => dt.toISOString().slice(0, 10);
  const br = (iso: string) => iso.split("-").reverse().join("/");

  switch (tipo) {
    case "ontem": {
      const ontem = new Date(hoje);
      ontem.setDate(hoje.getDate() - 1);
      return { inicio: fmt(ontem), fim: fmt(ontem), label: "Ontem", tipo };
    }
    case "semana": {
      const ini = new Date(hoje);
      ini.setDate(hoje.getDate() - hoje.getDay());
      const fim = new Date(ini);
      fim.setDate(ini.getDate() + 6);
      return {
        inicio: fmt(ini),
        fim: fmt(fim),
        label: `Esta Semana (${br(fmt(ini))} a ${br(fmt(fim))})`,
        tipo,
      };
    }
    case "semana_ant": {
      const ini = new Date(hoje);
      ini.setDate(hoje.getDate() - hoje.getDay() - 7);
      const fim = new Date(ini);
      fim.setDate(ini.getDate() + 6);
      return { inicio: fmt(ini), fim: fmt(fim), label: "Semana Passada", tipo };
    }
    case "mes": {
      const ini = new Date(hoje.getFullYear(), hoje.getMonth(), 1);
      const fim = new Date(hoje.getFullYear(), hoje.getMonth() + 1, 0);
      return {
        inicio: fmt(ini),
        fim: fmt(fim),
        label: `Este Mês (${br(fmt(ini))} a ${br(fmt(fim))})`,
        tipo,
      };
    }
    case "mes_ant": {
      const ini = new Date(hoje.getFullYear(), hoje.getMonth() - 1, 1);
      const fim = new Date(hoje.getFullYear(), hoje.getMonth(), 0);
      return { inicio: fmt(ini), fim: fmt(fim), label: "Mês Passado", tipo };
    }
    case "hoje":
    default:
      return { inicio: fmt(hoje), fim: fmt(hoje), label: "Hoje", tipo: "hoje" };
  }
}


function tecladoPeriodo(relatorio: string) {
  return {
    inline_keyboard: [
      [
        { text: "📅 Hoje", callback_data: `periodo_hoje_${relatorio}` },
        { text: "📅 Ontem", callback_data: `periodo_ontem_${relatorio}` },
      ],
      [
        { text: "📆 Esta Semana", callback_data: `periodo_semana_${relatorio}` },
        { text: "📆 Semana Passada", callback_data: `periodo_semana_ant_${relatorio}` },
      ],
      [
        { text: "🗓️ Este Mês", callback_data: `periodo_mes_${relatorio}` },
        { text: "🗓️ Mês Passado", callback_data: `periodo_mes_ant_${relatorio}` },
      ],
      [{ text: "✏️ Personalizado", callback_data: `periodo_custom_${relatorio}` }],
    ],
  };
}

async function perguntarPeriodo(
  token: string,
  chatId: number,
  relatorio: string,
  messageId?: number | null,
) {
  const texto = "📅 *Qual período deseja analisar?*";
  if (messageId) await editMessage(token, chatId, messageId, texto, tecladoPeriodo(relatorio));
  else await sendMessage(token, chatId, texto, tecladoPeriodo(relatorio));
}

async function executarRelatorio(
  tipo: string,
  periodo: Periodo,
  supabase: any,
  token: string,
  chatId: number,
  messageId?: number | null,
) {
  let texto: string;
  switch (tipo) {
    case "dre":
      texto = await relatorioDre(supabase, periodo);
      break;
    case "categorias":
      texto = await relatorioCategorias(supabase, periodo);
      break;
    case "maiores":
      texto = await relatorioMaiores(supabase, periodo);
      break;
    case "status":
      texto = await relatorioStatus(supabase, periodo);
      break;
    case "pendentes":
      texto = await relatorioPendentes(supabase, periodo);
      break;
    default:
      return;
  }

  const teclado = {
    inline_keyboard: [[{ text: "🔄 Mudar Período", callback_data: `mudar_${tipo}` }]],
  };
  if (messageId) await editMessage(token, chatId, messageId, texto, teclado);
  else await sendMessage(token, chatId, texto, teclado);
}

// ── Relatório de Vendas: filial → período → relatório ────────────────────
const TECLADO_PERIODO_VENDAS = {
  inline_keyboard: [
    [
      { text: "📅 Hoje", callback_data: "vp_hoje" },
      { text: "📅 Ontem", callback_data: "vp_ontem" },
    ],
    [
      { text: "📆 Esta Semana", callback_data: "vp_semana" },
      { text: "📆 Semana Passada", callback_data: "vp_semana_ant" },
    ],
    [
      { text: "🗓️ Este Mês", callback_data: "vp_mes" },
      { text: "🗓️ Mês Passado", callback_data: "vp_mes_ant" },
    ],
    [{ text: "✏️ Personalizado", callback_data: "vp_custom" }],
  ],
};

async function perguntarFilialVendas(
  supabase: any,
  token: string,
  chatId: number,
  userId: number,
  messageId?: number | null,
) {
  const { data: filiais } = await supabase
    .from("filiais")
    .select("id, nome")
    .eq("ativa", true)
    .order("nome");

  const teclado = {
    inline_keyboard: [
      [{ text: "🏢 Todas as Filiais", callback_data: "vf_todas" }],
      ...((filiais ?? []) as Array<{ id: string; nome: string }>).map((f) => [
        { text: `🏢 ${f.nome}`.slice(0, 60), callback_data: `vf_${f.id}` },
      ]),
    ],
  };

  await supabase
    .from("telegram_pendencias")
    .update({ status: "cancelado" })
    .eq("chat_id", chatId)
    .eq("status", "aguardando_resposta")
    .in("etapa", ["venda_filial", "venda_periodo", "venda_periodo_custom"]);

  await supabase.from("telegram_pendencias").insert({
    chat_id: chatId,
    user_id: userId,
    etapa: "venda_filial",
    status: "aguardando_resposta",
  });

  const texto = "🛒 *Relatório de Vendas*\n\nSelecione a filial:";
  if (messageId) await editMessage(token, chatId, messageId, texto, teclado);
  else await sendMessage(token, chatId, texto, teclado);
}

async function executarRelatorioVendas(
  supabase: any,
  token: string,
  chatId: number,
  filialId: string | null,
  periodo: Periodo,
  messageId?: number | null,
) {
  const texto = await relatorioVendas(supabase, filialId, periodo);
  const teclado = {
    inline_keyboard: [
      [
        { text: "🔄 Mudar Período", callback_data: "mudar_vendas" },
        { text: "🏢 Mudar Filial", callback_data: "reiniciar_vendas" },
      ],
    ],
  };
  if (messageId) await editMessage(token, chatId, messageId, texto, teclado);
  else await sendMessage(token, chatId, texto, teclado);
}




function docRecebedor(dados: Record<string, any>): { doc: string | null; tipoPessoa: "pf" | "pj" | null } {
  const cnpj = String(dados.cnpj_recebedor ?? dados.cnpj_emitente ?? "").replace(/\D/g, "");
  const cpf = dados.cpf_recebedor ? String(dados.cpf_recebedor).replace(/\D/g, "") : "";

  const doc = cnpj || cpf || null;
  if (!doc) return { doc: null, tipoPessoa: null };
  const tipo = (dados.tipo_pessoa_recebedor === "pf" || dados.tipo_pessoa_recebedor === "pj")
    ? dados.tipo_pessoa_recebedor
    : doc.length === 11 ? "pf" : "pj";
  return { doc, tipoPessoa: tipo };
}

function formatDoc(doc: string) {
  if (doc.length === 11) return doc.replace(/(\d{3})(\d{3})(\d{3})(\d{2})/, "$1.$2.$3-$4");
  if (doc.length === 14) return doc.replace(/(\d{2})(\d{3})(\d{3})(\d{4})(\d{2})/, "$1.$2.$3/$4-$5");
  return doc;
}

function descricaoItens(dados: Record<string, any>): string | null {
  const itens = Array.isArray(dados.itens) ? dados.itens : [];
  if (!itens.length) return null;
  return itens
    .map((i: any) => {
      const qtd = i?.quantidade ? `${i.quantidade}x ` : "";
      const unit = i?.valor_unit ? ` R$${formatMoeda(i.valor_unit).replace("R$ ", "")}` : "";
      return `${qtd}${i?.descricao ?? "item"}${unit}`.trim();
    })
    .join(", ");
}

function resumoComprovante(
  dados: Record<string, any>,
  fornecedorNome?: string | null,
  observacao?: string | null,
) {
  const tipo = String(dados.tipo ?? "").toLowerCase();
  const isFiscal = tipo === "nfce" || tipo === "nfe" || tipo === "nota_fiscal";
  const itens = descricaoItens(dados);
  const rotuloTipo = tipo === "nfce"
    ? "NFC-e (Cupom Fiscal)"
    : tipo === "nfe"
    ? "NF-e (Nota Fiscal)"
    : String(dados.tipo ?? "").toUpperCase();

  return (
    `✅ *${isFiscal ? "Nota fiscal lida com sucesso!" : "Comprovante reconhecido!"}*\n\n` +
    `💰 *Valor:* ${formatMoeda(dados.valor)}\n` +
    `📅 *Data:* ${dados.data || "hoje"}\n` +
    `🧾 *Tipo:* ${rotuloTipo}\n` +
    `${docRecebedor(dados).tipoPessoa === "pf" ? "👤" : isFiscal ? "🏪" : "🏢"} *${isFiscal ? "Estabelecimento" : `Destinatário${docRecebedor(dados).tipoPessoa === "pf" ? " (PF)" : ""}`}:* ${fornecedorNome || dados.nome_recebedor || dados.nome_emitente || "não identificado"}\n` +
    (docRecebedor(dados).doc
      ? `🔢 *${docRecebedor(dados).tipoPessoa === "pf" ? "CPF" : "CNPJ"}:* ${formatDoc(docRecebedor(dados).doc!)}\n`
      : "") +
    (itens ? `🛍️ *Itens:* ${itens.slice(0, 300)}\n` : "") +
    (dados.forma_pagamento ? `💳 *Pagamento:* ${dados.forma_pagamento}\n` : "") +
    (observacao ? `📝 *Obs:* ${observacao}\n` : "")
  );
}



Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  const token = Deno.env.get("TELEGRAM_BOT_TOKEN") ?? "";
  const anthropicKey = Deno.env.get("ANTHROPIC_API_KEY") ?? "";

  const supabase = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
  );

  const url = new URL(req.url);

  // ── SETUP: registrar webhook ──
  if (url.searchParams.get("action") === "setup") {
    const webhookUrl = `${Deno.env.get("SUPABASE_URL")}/functions/v1/telegram-webhook`;
    const res = await fetch(`${TELEGRAM_API}${token}/setWebhook`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        url: webhookUrl,
        allowed_updates: ["message", "edited_message", "callback_query"],
      }),
    });
    return ok(await res.json());
  }

  // ── TEST ──
  if (url.searchParams.get("action") === "test") {
    const res = await fetch(`${TELEGRAM_API}${token}/getMe`);
    return ok(await res.json());
  }

  if (req.method !== "POST") return ok();

  try {
    const body = await req.json().catch(() => null);
    console.log("[telegram] Update:", JSON.stringify(body ?? {}).slice(0, 300));

    const callbackQuery = body?.callback_query;
    const message = body?.message ?? body?.edited_message ?? callbackQuery?.message;
    if (!message) return ok();

    const chatId = message.chat?.id as number;
    const userId = (callbackQuery?.from?.id ?? message.from?.id) as number;
    const text = String(message.text ?? "").trim();
    const firstName = callbackQuery?.from?.first_name ?? message.from?.first_name ?? "";

    // ── Config da integração + IDs autorizados ──
    const { data: cfgTelegram } = await supabase
      .from("integracoes_config")
      .select("ativo, config")
      .eq("nome", "telegram")
      .maybeSingle();

    if (cfgTelegram?.ativo === false) return ok({ ok: true, ignored: true });

    const idsRaw = String(
      (cfgTelegram?.config as Record<string, unknown> | null)?.authorized_ids ??
        Deno.env.get("TELEGRAM_AUTHORIZED_IDS") ??
        "",
    );
    const authorizedIds = idsRaw.split(",").map((s) => s.trim()).filter(Boolean);

    if (authorizedIds.length > 0 && !authorizedIds.includes(String(userId))) {
      if (callbackQuery) await answerCallback(token, callbackQuery.id, "⛔ Acesso não autorizado.");
      else await sendMessage(token, chatId, "⛔ Acesso não autorizado.");
      return ok();
    }

    // ── Clique em botão inline ──
    if (callbackQuery) {
      return await processarCallback(supabase, token, chatId, callbackQuery);
    }

    // ── Modelo da IA ──
    const { data: configAI } = await supabase
      .from("integracoes_config")
      .select("config")
      .eq("nome", "anthropic")
      .maybeSingle();
    const modelo =
      (configAI?.config as Record<string, unknown> | null)?.model as string ?? "claude-sonnet-4-6";

    // ── Pendência aguardando resposta ──
    const { data: pendencia } = await supabase
      .from("telegram_pendencias")
      .select("*")
      .eq("chat_id", chatId)
      .eq("status", "aguardando_resposta")
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    const textoMenu = ["📊 DRE", "📁 Categorias", "🏆 Maiores Gastos", "📋 Pendentes", "💰 Status", "🛒 Vendas", "❓ Ajuda"];
    if (pendencia && text && !text.startsWith("/") && !textoMenu.includes(text)) {

      return await processarResposta(supabase, token, chatId, text, pendencia);
    }

    // ── Comandos ──
    if (text === "/start") {
      await sendMessage(
        token,
        chatId,
        `👋 Olá, *${firstName || "usuário"}*!\n\n` +
          `Sou o assistente financeiro da *Softplus*.\n\n` +
          `📸 Envie uma *foto* ou *PDF* de:\n` +
          `• Comprovante de pagamento (PIX/Boleto/TED)\n` +
          `• Nota fiscal\n\n` +
          `Vou processar e lançar automaticamente no sistema! 🚀\n\n` +
          `📊 *Relatórios:*\n` +
          `/status — Resumo financeiro\n` +
          `/dre — DRE da semana\n` +
          `/categorias — Despesas por plano de contas\n` +
          `/maiores — Maiores gastos da semana\n` +
          `/pendentes — Despesas em aberto e vencidas`,
      );
      return ok();
    }

    const comandoRelatorio: Record<string, RelatorioTipo> = {
      "/status": "status",
      "/categorias": "categorias",
      "/dre": "dre",
      "/maiores": "maiores",
      "/pendentes": "pendentes",
      "📊 DRE": "dre",
      "📁 Categorias": "categorias",
      "🏆 Maiores Gastos": "maiores",
      "📋 Pendentes": "pendentes",
      "💰 Status": "status",
    };

    if (text === "🛒 Vendas" || text === "/vendas") {
      await perguntarFilialVendas(supabase, token, chatId, userId);
      return ok();
    }

    if (text && (text === "❓ Ajuda" || text === "/ajuda" || text === "/help")) {
      await sendMessage(
        token,
        chatId,
        `❓ *Ajuda*\n\n` +
          `📸 Envie foto ou PDF de comprovante para lançar despesa.\n\n` +
          `📊 *Relatórios:*\n` +
          `/status • /dre • /categorias • /maiores • /pendentes • /vendas\n\n` +
          `Use os botões abaixo para acesso rápido.`,
      );
      return ok();
    }

    if (text && comandoRelatorio[text]) {
      await perguntarPeriodo(token, chatId, comandoRelatorio[text]);
      return ok();
    }



    // ── Foto ou documento ──
    const caption = String(message.caption ?? message.text ?? "").trim();
    const photo = message.photo as Array<{ file_id: string }> | undefined;
    const document = message.document as
      | { file_id: string; mime_type?: string }
      | undefined;

    if (!photo && !document) {
      await sendMessage(
        token,
        chatId,
        `📎 Envie uma *foto* ou *PDF* do comprovante.\n\nComandos: /start /status /dre /categorias /maiores /pendentes`,
      );
      return ok();
    }

    if (!anthropicKey) {
      await sendMessage(token, chatId, "❌ ANTHROPIC_API_KEY não configurada.");
      return ok();
    }

    const processingMsgId = await sendMessage(
      token,
      chatId,
      `⏳ Processando com IA...\nAguarde um momento.`,
    );
    const avisar = async (texto: string) => {
      if (processingMsgId) await editMessage(token, chatId, processingMsgId, texto);
      else await sendMessage(token, chatId, texto);
    };


    let fileId: string;
    let mimeType = "image/jpeg";
    if (photo) {
      fileId = photo[photo.length - 1].file_id;
    } else {
      fileId = document!.file_id;
      mimeType = document!.mime_type || "application/pdf";
    }
    const isPdf = mimeType === "application/pdf";

    const fileRes = await fetch(`${TELEGRAM_API}${token}/getFile?file_id=${fileId}`);
    const fileData = await fileRes.json().catch(() => ({}));
    const filePath = fileData?.result?.file_path;
    if (!filePath) {
      await sendMessage(token, chatId, "❌ Erro ao baixar arquivo.");
      return ok();
    }

    const fileResponse = await fetch(`https://api.telegram.org/file/bot${token}/${filePath}`);
    const fileBuffer = await fileResponse.arrayBuffer();
    const base64 = toBase64(fileBuffer);

    // ── Salvar comprovante no Storage (bucket privado) ──
    const storagePath = `telegram/${Date.now()}.${isPdf ? "pdf" : "jpg"}`;
    let anexoUrl: string | null = null;
    const { error: upErr } = await supabase.storage
      .from("financeiro-anexos")
      .upload(storagePath, fileBuffer, { contentType: mimeType, upsert: true });
    if (upErr) {
      console.error("[telegram] upload:", upErr.message);
    } else {
      const { data: signed } = await supabase.storage
        .from("financeiro-anexos")
        .createSignedUrl(storagePath, 60 * 60 * 24 * 365);
      anexoUrl = signed?.signedUrl ?? storagePath;
    }

    // ── Planos de contas (enviados ao Claude para sugestão) ──
    const planos = await listarPlanos(supabase);
    const planosLista = planos.map((p) => `${p.codigo} — ${p.nome}`).join("\n");
    const observacaoUsuario = (caption ?? "").trim();

    // ── Claude Vision ──
    const prompt = `Analise este documento financeiro.
Pode ser: comprovante PIX, boleto, TED, DOC, nota fiscal NF-e, cupom fiscal NFC-e, recibo ou qualquer documento de pagamento.
${observacaoUsuario ? `\nO usuário descreveu o gasto assim: "${observacaoUsuario}"\n` : ""}

Retorne APENAS JSON válido sem markdown:
{
  "tipo": "pix"|"boleto"|"ted"|"doc"|"nfe"|"nfce"|"recibo"|"desconhecido",
  "valor": 0.00,
  "data": "YYYY-MM-DD",
  "cnpj_recebedor": "apenas CNPJ com 14 dígitos ou null",
  "cpf_recebedor": "apenas CPF com 11 dígitos ou null",
  "tipo_pessoa_recebedor": "pf"|"pj"|null,
  "nome_recebedor": "string ou null",
  "cnpj_emitente": "apenas números ou null",
  "nome_emitente": "string ou null",
  "banco_pagador": "string ou null",
  "numero_documento": "string ou null",
  "chave_acesso": "string ou null",
  "codigo_barras": "string ou null",
  "itens": [
    { "descricao": "string", "quantidade": 1, "valor_unit": 0.00, "valor_total": 0.00 }
  ],
  "forma_pagamento": "string ou null",
  "descricao": "breve descrição",
  "confianca": "alta"|"media"|"baixa",
  "plano_conta_sugerido_codigo": "string ou null",
  "plano_conta_sugerido_motivo": "string ou null"
}

Para NFC-e/cupom fiscal:
- nome_recebedor = nome do estabelecimento
- cnpj_recebedor = CNPJ do emitente
- valor = valor total pago
- data = data de emissão

Para sugerir o plano de contas, analise:
1. A descrição do usuário${observacaoUsuario ? `: "${observacaoUsuario}"` : " (não informada)"}
2. O tipo de estabelecimento/fornecedor
3. O item comprado

Planos disponíveis:
${planosLista}

Exemplos de sugestão:
- "lampada", "pneu", "óleo", "peça" → código de manutenção veicular
- "almoço", "restaurante", "refeição" → código de alimentação
- "uber", "combustível", "gasolina" → código de transporte
- "hospedagem", "servidor", "cloud" → código de hospedagem
- "marketing", "publicidade" → código de marketing
- "internet", "telefone" → código de telecomunicações
- "material escritório", "papel" → código de material de escritório

Retorne em plano_conta_sugerido_codigo o código EXATO (da lista acima) do plano mais adequado, ou null se não houver correspondência clara.`;

    const contentBlock = isPdf
      ? { type: "document", source: { type: "base64", media_type: "application/pdf", data: base64 } }
      : { type: "image", source: { type: "base64", media_type: mimeType, data: base64 } };

    let claudeData: Record<string, any> = {};
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 25000);
      const claudeRes = await fetch("https://api.anthropic.com/v1/messages", {
        signal: controller.signal,
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-api-key": anthropicKey,
          "anthropic-version": "2023-06-01",
        },
        body: JSON.stringify({
          model: modelo,
          max_tokens: 1500,
          messages: [{ role: "user", content: [contentBlock, { type: "text", text: prompt }] }],
        }),
      }).finally(() => clearTimeout(timeoutId));

      if (!claudeRes.ok) {
        const erro = await claudeRes.text();
        console.error("[claude] Erro:", erro.slice(0, 400));
        await avisar(`❌ Erro ao processar com IA.\nTente novamente em instantes.`);
        return ok();
      }

      claudeData = await claudeRes.json();
      console.log("[claude] Resposta:", JSON.stringify(claudeData).slice(0, 300));
    } catch (err: any) {
      console.error("[claude] Falha:", err?.name, err?.message);
      if (err?.name === "AbortError") {
        await avisar(`⏱️ Processamento demorou muito.\nTente novamente ou envie em melhor qualidade.`);
      } else {
        await avisar(`❌ Erro inesperado: ${err?.message ?? "desconhecido"}\nTente novamente.`);
      }
      return ok();
    }

    const claudeText = claudeData?.content?.[0]?.text ?? "{}";
    let dados: Record<string, any> = {};
    try {
      const match = String(claudeText).match(/\{[\s\S]*\}/);
      dados = match ? JSON.parse(match[0]) : {};
    } catch {
      dados = {};
    }
    console.log("[telegram] Dados extraídos:", JSON.stringify(dados));

    if (!dados.valor || dados.tipo === "desconhecido") {
      await avisar(
        `⚠️ *Não consegui identificar o documento.*\n\nPor favor, envie uma imagem mais clara ou o PDF original.`,
      );
      return ok();
    }

    // Para NF-e/NFC-e, montar a descrição com os itens da nota
    if (dados.tipo === "nfce" || dados.tipo === "nfe") {
      dados.descricao = descricaoItens(dados) || dados.descricao;
    }

    if (processingMsgId) {
      await editMessage(token, chatId, processingMsgId, "✅ Documento lido com sucesso.");
    }



    // ── Fornecedor ──
    const { doc: cnpj } = docRecebedor(dados);
    let fornecedor: any = null;

    if (cnpj) {
      const { data: forn } = await supabase
        .from("fornecedores")
        .select("id, nome_fantasia, cnpj_cpf, plano_conta_id")
        .eq("cnpj_cpf", cnpj)
        .maybeSingle();
      fornecedor = forn;
      if (!fornecedor) {
        // fallback: documentos gravados com máscara (pontos/traços/barra)
        const { data: forn2 } = await supabase
          .from("fornecedores")
          .select("id, nome_fantasia, cnpj_cpf, plano_conta_id")
          .ilike("cnpj_cpf", `%${cnpj}%`)
          .limit(1)
          .maybeSingle();
        fornecedor = forn2;
      }
    }

    if (!fornecedor && dados.nome_recebedor) {
      const { data: forn } = await supabase
        .from("fornecedores")
        .select("id, nome_fantasia, cnpj_cpf, plano_conta_id")
        .ilike("nome_fantasia", `%${dados.nome_recebedor}%`)
        .limit(1)
        .maybeSingle();
      fornecedor = forn;
    }

    // ── Memória CNPJ → plano de contas ──
    let planoMemoria: any = null;
    if (cnpj) {
      const { data: mem } = await supabase
        .from("telegram_memoria")
        .select("plano_conta_id, fin_plano_contas(id, nome, codigo)")
        .eq("cnpj_fornecedor", cnpj)
        .maybeSingle();
      planoMemoria = mem;
    }

    const [{ data: formasPagto }, { data: contasFinanceiras }, { data: centrosCusto }, { data: filialPadrao }] =
      await Promise.all([
        supabase.from("fin_formas_pagamento").select("id, nome, tipo").eq("ativo", true),
        supabase.from("fin_contas_financeiras").select("id, nome, tipo").eq("ativo", true),
        supabase.from("fin_centros_custo").select("id, nome").eq("ativo", true),
        supabase
          .from("filiais")
          .select("id, conta_financeira_padrao_id")
          .eq("ativa", true)
          .not("conta_financeira_padrao_id", "is", null)
          .limit(1)
          .maybeSingle(),
      ]);

    // Conta financeira padrão configurada na filial (fallback: primeira ativa)
    const contaPadraoId: string | null =
      (filialPadrao?.conta_financeira_padrao_id &&
        contasFinanceiras?.some((c: any) => c.id === filialPadrao.conta_financeira_padrao_id)
        ? filialPadrao.conta_financeira_padrao_id
        : null) ?? contasFinanceiras?.[0]?.id ?? null;



    // ── Forma de pagamento ──
    const tipoMap: Record<string, string[]> = {
      pix: ["pix"],
      boleto: ["boleto"],
      ted: ["ted", "transferência", "transferencia"],
      doc: ["doc"],
    };
    let formaPagtoId = formasPagto?.[0]?.id ?? null;
    const termos = tipoMap[String(dados.tipo ?? "")] ?? [];
    if (termos.length) {
      const found = formasPagto?.find((f: any) =>
        termos.some((t) => String(f.nome).toLowerCase().includes(t)),
      );
      if (found) formaPagtoId = found.id;
    }

    const planoSugeridoId: string | null =
      planoMemoria?.plano_conta_id ?? fornecedor?.plano_conta_id ?? null;
    const planoSugerido = planos.find((p) => p.id === planoSugeridoId) ?? null;

    const { data: novaPendencia } = await supabase
      .from("telegram_pendencias")
      .insert({
        chat_id: chatId,
        user_id: userId,
        dados_extraidos: { ...dados, documento_recebedor: cnpj },
        fornecedor_id: fornecedor?.id ?? null,
        fornecedor_nome: fornecedor?.nome_fantasia ?? dados.nome_recebedor ?? null,
        forma_pagamento_id: formaPagtoId,
        conta_financeira_id: contaPadraoId,
        centro_custo_id: centrosCusto?.[0]?.id ?? null,
        plano_conta_sugerido_id: planoSugeridoId,
        anexo_url: anexoUrl,
        observacao_usuario: caption || null,
        status: "aguardando_resposta",
        etapa: "plano_contas",
        plano_pagina: 0,
      })
      .select("id")
      .single();

    let msg = resumoComprovante(dados, fornecedor?.nome_fantasia, caption);
    let teclado: unknown;

    if (fornecedor && planoSugerido) {
      msg +=
        `\n✓ Fornecedor encontrado: *${fornecedor.nome_fantasia}*\n` +
        `📁 Plano sugerido: *${planoSugerido.codigo} — ${planoSugerido.nome}*\n\n` +
        `Confirma este plano ou selecione outro:`;
      teclado = {
        inline_keyboard: [
          [
            {
              text: `✅ Confirmar — ${planoSugerido.codigo} ${planoSugerido.nome}`.slice(0, 60),
              callback_data: "sug",
            },
          ],
          [{ text: "🔄 Escolher outro plano", callback_data: "outro" }],
        ],
      };
    } else {
      if (fornecedor) msg += `\n✓ Fornecedor encontrado: *${fornecedor.nome_fantasia}*\n`;
      msg += `\n📁 *Selecione o plano de contas:*`;
      teclado = tecladoPlanos(planos, 0, null);
    }

    const messageId = await sendMessage(token, chatId, msg, teclado);
    if (messageId && novaPendencia?.id) {
      await supabase
        .from("telegram_pendencias")
        .update({ message_id: messageId })
        .eq("id", novaPendencia.id);
    }
    return ok();
  } catch (err) {
    console.error("[telegram] Erro:", (err as Error).message);
    return ok();
  }
});

// ── Processar clique em botão inline ──
async function processarCallback(
  supabase: any,
  token: string,
  chatId: number,
  callbackQuery: any,
) {
  const data = String(callbackQuery.data ?? "");
  const messageId = callbackQuery.message?.message_id as number;

  // ── Seleção de período dos relatórios ──
  const matchPeriodo = data.match(
    /^periodo_(.+)_(dre|categorias|maiores|status|pendentes)$/,
  );
  if (matchPeriodo) {
    const tipoPeriodo = matchPeriodo[1];
    const relatorio = matchPeriodo[2];

    if (tipoPeriodo === "custom") {
      await answerCallback(token, callbackQuery.id, "✏️");
      await supabase
        .from("telegram_pendencias")
        .update({ status: "cancelado" })
        .eq("chat_id", chatId)
        .eq("status", "aguardando_resposta")
        .eq("etapa", "aguardando_periodo_custom");
      await supabase.from("telegram_pendencias").insert({
        chat_id: chatId,
        user_id: callbackQuery.from?.id ?? chatId,
        etapa: "aguardando_periodo_custom",
        status: "aguardando_resposta",
        dados_extraidos: { relatorio },
      });
      await editMessage(
        token,
        chatId,
        messageId,
        "✏️ *Período personalizado*\n\n" +
          "Digite no formato:\n" +
          "`DD/MM/AAAA DD/MM/AAAA`\n\n" +
          "Exemplo:\n" +
          "`01/07/2026 31/07/2026`",
      );
      return ok();
    }

    await answerCallback(token, callbackQuery.id, "⏳ Gerando...");
    await executarRelatorio(
      relatorio,
      getPeriodo(tipoPeriodo),
      supabase,
      token,
      chatId,
      messageId,
    );
    return ok();
  }

  const matchMudar = data.match(/^mudar_(dre|categorias|maiores|status|pendentes)$/);
  if (matchMudar) {
    await answerCallback(token, callbackQuery.id, "📅");
    await perguntarPeriodo(token, chatId, matchMudar[1], messageId);
    return ok();
  }

  // ── Relatório de Vendas ──
  const userIdCb = (callbackQuery.from?.id ?? chatId) as number;

  if (data === "reiniciar_vendas") {
    await answerCallback(token, callbackQuery.id, "🏢");
    await perguntarFilialVendas(supabase, token, chatId, userIdCb, messageId);
    return ok();
  }

  if (data.startsWith("vf_") || data.startsWith("vp_") || data === "mudar_vendas") {
    const { data: pendVenda } = await supabase
      .from("telegram_pendencias")
      .select("*")
      .eq("chat_id", chatId)
      .eq("status", "aguardando_resposta")
      .in("etapa", ["venda_filial", "venda_periodo", "venda_periodo_custom"])
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    if (data.startsWith("vf_")) {
      const parte = data.slice(3);
      const filialId = parte === "todas" ? null : parte;
      await answerCallback(token, callbackQuery.id, "📅");

      if (pendVenda?.id) {
        await supabase
          .from("telegram_pendencias")
          .update({ filial_id: filialId, etapa: "venda_periodo" })
          .eq("id", pendVenda.id);
      } else {
        await supabase.from("telegram_pendencias").insert({
          chat_id: chatId,
          user_id: userIdCb,
          etapa: "venda_periodo",
          filial_id: filialId,
          status: "aguardando_resposta",
        });
      }

      let nomeFilial = "Todas as Filiais";
      if (filialId) {
        const { data: f } = await supabase
          .from("filiais")
          .select("nome")
          .eq("id", filialId)
          .maybeSingle();
        nomeFilial = f?.nome || "Filial";
      }

      await editMessage(
        token,
        chatId,
        messageId,
        `🛒 *Relatório de Vendas*\n🏢 ${nomeFilial}\n\n📅 Selecione o período:`,
        TECLADO_PERIODO_VENDAS,
      );
      return ok();
    }

    if (data === "mudar_vendas") {
      await answerCallback(token, callbackQuery.id, "📅");
      const filialAtual = pendVenda?.filial_id ?? null;
      if (pendVenda?.id) {
        await supabase
          .from("telegram_pendencias")
          .update({ etapa: "venda_periodo" })
          .eq("id", pendVenda.id);
      } else {
        await supabase.from("telegram_pendencias").insert({
          chat_id: chatId,
          user_id: userIdCb,
          etapa: "venda_periodo",
          filial_id: filialAtual,
          status: "aguardando_resposta",
        });
      }
      await editMessage(
        token,
        chatId,
        messageId,
        "🛒 *Relatório de Vendas*\n\n📅 Selecione o período:",
        TECLADO_PERIODO_VENDAS,
      );
      return ok();
    }

    // vp_*
    const tipoPeriodo = data.slice(3);
    const filialId = pendVenda?.filial_id ?? null;

    if (tipoPeriodo === "custom") {
      await answerCallback(token, callbackQuery.id, "✏️");
      if (pendVenda?.id) {
        await supabase
          .from("telegram_pendencias")
          .update({ etapa: "venda_periodo_custom" })
          .eq("id", pendVenda.id);
      } else {
        await supabase.from("telegram_pendencias").insert({
          chat_id: chatId,
          user_id: userIdCb,
          etapa: "venda_periodo_custom",
          filial_id: filialId,
          status: "aguardando_resposta",
        });
      }
      await editMessage(
        token,
        chatId,
        messageId,
        "✏️ *Período personalizado*\n\n" +
          "Digite no formato:\n" +
          "`DD/MM/AAAA DD/MM/AAAA`\n\n" +
          "Exemplo:\n" +
          "`01/07/2026 31/07/2026`",
      );
      return ok();
    }

    await answerCallback(token, callbackQuery.id, "⏳ Gerando...");
    await executarRelatorioVendas(
      supabase,
      token,
      chatId,
      filialId,
      getPeriodo(tipoPeriodo),
      messageId,
    );
    if (pendVenda?.id) {
      await supabase
        .from("telegram_pendencias")
        .update({ status: "concluido" })
        .eq("id", pendVenda.id);
    }
    return ok();
  }



  const { data: pendencia } = await supabase
    .from("telegram_pendencias")
    .select("*")
    .eq("chat_id", chatId)
    .eq("status", "aguardando_resposta")
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (!pendencia) {
    await answerCallback(token, callbackQuery.id, "⚠️ Nenhum lançamento pendente.");
    return ok();
  }

  const planos = await listarPlanos(supabase);
  const dados = pendencia.dados_extraidos ?? {};

  // Confirmar plano sugerido → lança direto
  if (data === "sug" && pendencia.plano_conta_sugerido_id) {
    await answerCallback(token, callbackQuery.id, "✅ Confirmado!");
    const plano = planos.find((p) => p.id === pendencia.plano_conta_sugerido_id) ?? null;
    return await finalizarLancamento(
      supabase,
      token,
      chatId,
      pendencia,
      pendencia.plano_conta_sugerido_id,
      plano ? `${plano.codigo} — ${plano.nome}` : "Plano selecionado",
      messageId,
    );
  }

  // Escolher outro plano / navegar páginas
  if (data === "outro" || data.startsWith("pg_")) {
    const pagina = data === "outro" ? 0 : parseInt(data.slice(3), 10) || 0;
    await answerCallback(token, callbackQuery.id, "📁");
    await supabase
      .from("telegram_pendencias")
      .update({ plano_pagina: pagina })
      .eq("id", pendencia.id);

    const escolhido = pendencia.plano_conta_escolhido_id ?? null;
    const planoEscolhido = planos.find((p) => p.id === escolhido) ?? null;
    const texto =
      resumoComprovante(dados, pendencia.fornecedor_nome) +
      (planoEscolhido
        ? `\n📁 *Plano selecionado:* ${planoEscolhido.codigo} — ${planoEscolhido.nome}\n\nConfirme o lançamento:`
        : `\n📁 *Selecione o plano de contas:*`);
    await editMessage(token, chatId, messageId, texto, tecladoPlanos(planos, pagina, escolhido));
    return ok();
  }

  // Selecionar um plano
  if (data.startsWith("pl_")) {
    const planoId = data.slice(3);
    const plano = planos.find((p) => p.id === planoId) ?? null;
    if (!plano) {
      await answerCallback(token, callbackQuery.id, "⚠️ Plano inválido.");
      return ok();
    }
    await answerCallback(token, callbackQuery.id, "✅ Selecionado!");
    await supabase
      .from("telegram_pendencias")
      .update({ plano_conta_escolhido_id: planoId })
      .eq("id", pendencia.id);

    const texto =
      resumoComprovante(dados, pendencia.fornecedor_nome) +
      `\n📁 *Plano selecionado:* ${plano.codigo} — ${plano.nome}\n\nConfirme o lançamento:`;
    await editMessage(
      token,
      chatId,
      messageId,
      texto,
      tecladoPlanos(planos, pendencia.plano_pagina ?? 0, planoId),
    );
    return ok();
  }

  // Confirmar lançamento
  if (data === "ok") {
    const planoId = pendencia.plano_conta_escolhido_id ?? pendencia.plano_conta_sugerido_id;
    if (!planoId) {
      await answerCallback(token, callbackQuery.id, "⚠️ Selecione um plano primeiro.");
      return ok();
    }
    await answerCallback(token, callbackQuery.id, "⏳ Lançando...");
    const plano = planos.find((p) => p.id === planoId) ?? null;
    return await finalizarLancamento(
      supabase,
      token,
      chatId,
      pendencia,
      planoId,
      plano ? `${plano.codigo} — ${plano.nome}` : "Plano selecionado",
      messageId,
    );
  }

  await answerCallback(token, callbackQuery.id, "");
  return ok();
}

// ── Processar resposta em texto (compatibilidade) ──
async function processarResposta(
  supabase: any,
  token: string,
  chatId: number,
  text: string,
  pendencia: any,
) {
  // ── Período personalizado do relatório de vendas ──
  if (pendencia.etapa === "venda_periodo_custom") {
    const m = text.match(/(\d{2}\/\d{2}\/\d{4})\s+(\d{2}\/\d{2}\/\d{4})/);
    if (!m) {
      await sendMessage(token, chatId, "⚠️ Formato inválido. Digite:\n`DD/MM/AAAA DD/MM/AAAA`");
      return ok();
    }
    const toISO = (v: string) => {
      const [dd, mm, aaaa] = v.split("/");
      return `${aaaa}-${mm}-${dd}`;
    };
    await supabase
      .from("telegram_pendencias")
      .update({ status: "concluido" })
      .eq("id", pendencia.id);
    await executarRelatorioVendas(
      supabase,
      token,
      chatId,
      pendencia.filial_id ?? null,
      { inicio: toISO(m[1]), fim: toISO(m[2]), label: `${m[1]} a ${m[2]}` },
      null,
    );
    return ok();
  }

  // ── Período personalizado de relatório ──
  if (pendencia.etapa === "aguardando_periodo_custom") {
    const matchDatas = text.match(/(\d{2}\/\d{2}\/\d{4})\s+(\d{2}\/\d{2}\/\d{4})/);
    if (!matchDatas) {
      await sendMessage(
        token,
        chatId,
        "⚠️ Formato inválido. Digite:\n`DD/MM/AAAA DD/MM/AAAA`",
      );
      return ok();
    }
    const toISO = (v: string) => {
      const [dd, mm, aaaa] = v.split("/");
      return `${aaaa}-${mm}-${dd}`;
    };
    const periodo: Periodo = {
      inicio: toISO(matchDatas[1]),
      fim: toISO(matchDatas[2]),
      label: `${matchDatas[1]} a ${matchDatas[2]}`,
    };
    const relatorio = (pendencia.dados_extraidos as Record<string, unknown> | null)?.relatorio as
      | string
      | undefined;
    await supabase
      .from("telegram_pendencias")
      .update({ status: "concluido" })
      .eq("id", pendencia.id);
    if (relatorio) {
      await executarRelatorio(relatorio, periodo, supabase, token, chatId, null);
    }
    return ok();
  }

  if (pendencia.etapa !== "plano_contas") return ok();

  const planos = await listarPlanos(supabase);
  const pagina = pendencia.plano_pagina ?? 0;
  const visiveis = planos.slice(pagina * PLANOS_POR_PAGINA, (pagina + 1) * PLANOS_POR_PAGINA);

  let planoId: string | null = null;
  let planoNome = "";

  if (text.toUpperCase() === "S" && pendencia.plano_conta_sugerido_id) {
    planoId = pendencia.plano_conta_sugerido_id;
    const plano = planos.find((p) => p.id === planoId);
    planoNome = plano ? `${plano.codigo} — ${plano.nome}` : "Plano selecionado";
  } else {
    const num = parseInt(text, 10);
    if (num >= 1 && num <= visiveis.length) {
      const plano = visiveis[num - 1];
      planoId = plano.id;
      planoNome = `${plano.codigo} — ${plano.nome}`;
    }
  }

  if (!planoId) {
    await sendMessage(
      token,
      chatId,
      `❌ Opção inválida. Use os *botões* acima para escolher o plano de contas.`,
    );
    return ok();
  }

  return await finalizarLancamento(supabase, token, chatId, pendencia, planoId, planoNome);
}

// ── Lançar a despesa ──
async function finalizarLancamento(
  supabase: any,
  token: string,
  chatId: number,
  pendencia: any,
  planoId: string,
  planoNome: string,
  messageId?: number,
) {
  const dados = pendencia.dados_extraidos ?? {};
  const hoje = new Date().toISOString().slice(0, 10);
  const observacao = String(pendencia.observacao_usuario ?? "").trim();

  const { data: filial } = await supabase
    .from("filiais")
    .select("nome, razao_social")
    .eq("ativa", true)
    .limit(1)
    .maybeSingle();

  const nomeOrigem =
    filial?.razao_social || filial?.nome || "SOFTPLUS TECNOLOGIA EM SISTEMAS";

  const responder = async (texto: string) => {
    const mid = messageId ?? pendencia.message_id;
    if (mid) await editMessage(token, chatId, mid, texto);
    else await sendMessage(token, chatId, texto);
  };

  let fornecedorId = pendencia.fornecedor_id;
  if (!fornecedorId && dados.nome_recebedor) {
    const { data: novoForn, error: fornErr } = await supabase
      .from("fornecedores")
      .insert({
        nome_fantasia: dados.nome_recebedor,
        razao_social: dados.nome_recebedor,
        cnpj_cpf: docRecebedor(dados).doc ?? "",
        ativo: true,
        plano_conta_id: planoId,
      })
      .select("id")
      .single();
    if (fornErr) console.error("[telegram] fornecedor:", fornErr.message);
    fornecedorId = novoForn?.id ?? null;
  }

  if (!fornecedorId) {
    await responder(
      `❌ Não foi possível identificar o fornecedor.\nAcesse o Softflow para lançar manualmente.`,
    );
    await supabase.from("telegram_pendencias").update({ status: "erro" }).eq("id", pendencia.id);
    return ok();
  }

  let descricaoDespesa =
    `${String(dados.tipo ?? "PAGAMENTO").toUpperCase()} de ${nomeOrigem} para ` +
    `${dados.nome_recebedor || pendencia.fornecedor_nome || "fornecedor"} ` +
    `no valor de ${formatMoeda(dados.valor)}`;
  if (observacao) descricaoDespesa += ` (${observacao})`;

  const { data: despesa, error: despesaErr } = await supabase
    .from("fin_despesas")
    .insert({
      fornecedor_id: fornecedorId,
      plano_conta_id: planoId,
      forma_pagamento_id: pendencia.forma_pagamento_id,
      conta_financeira_id: pendencia.conta_financeira_id,
      valor: dados.valor,
      valor_pago: dados.valor,
      data_emissao: dados.data || hoje,
      data_vencimento: dados.data || hoje,
      data_pagamento: dados.data || hoje,
      descricao: descricaoDespesa,
      codigo_barras: dados.codigo_barras || null,
      anexo_url: pendencia.anexo_url || null,
      status: "pago",
      parcela_numero: 1,
      parcela_total: 1,
      recorrente: false,
    })
    .select("id")
    .single();

  if (despesaErr) {
    console.error("[telegram] Erro ao inserir despesa:", despesaErr.message);
    await responder(`❌ Erro ao lançar despesa: ${despesaErr.message}`);
    return ok();
  }

  if (pendencia.centro_custo_id && despesa?.id) {
    const { error: ratErr } = await supabase.from("fin_despesa_rateios").insert({
      despesa_id: despesa.id,
      centro_custo_id: pendencia.centro_custo_id,
      percentual: 100,
    });
    if (ratErr) console.error("[telegram] rateio:", ratErr.message);
  }

  const docMemoria = docRecebedor(dados).doc;
  if (docMemoria) {
    const { error: memErr } = await supabase.from("telegram_memoria").upsert(
      {
        cnpj_fornecedor: docMemoria,
        fornecedor_id: fornecedorId,
        plano_conta_id: planoId,
        updated_at: new Date().toISOString(),
      },
      { onConflict: "cnpj_fornecedor" },
    );
    if (memErr) console.error("[telegram] memoria:", memErr.message);

    await supabase.from("fornecedores").update({ plano_conta_id: planoId }).eq("id", fornecedorId);
  }

  await supabase
    .from("telegram_pendencias")
    .update({ status: "concluido", plano_conta_id: planoId })
    .eq("id", pendencia.id);

  await responder(
    `✅ *Despesa lançada!*\n\n` +
      `🏢 *Fornecedor:* ${pendencia.fornecedor_nome || dados.nome_recebedor}\n` +
      `💸 *Valor pago:* ${formatMoeda(dados.valor)}\n` +
      `📅 *Data:* ${dados.data || hoje}\n` +
      `🧾 *Tipo:* ${String(dados.tipo ?? "").toUpperCase()}\n` +
      `📁 *Plano de contas:* ${planoNome}\n` +
      (observacao ? `📝 *Obs:* ${observacao}\n` : "") +
      `📎 *Comprovante:* salvo ✓\n\n` +
      `_Lançado no Softflow_ 🚀`,
  );

  return ok();
}
