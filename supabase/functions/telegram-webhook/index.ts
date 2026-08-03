// ─── Edge Function: Telegram Webhook (financeiro) ─────────────────────────
// Recebe comprovantes/NF pelo Telegram, lê com Claude Vision e lança despesa.
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const TELEGRAM_API = "https://api.telegram.org/bot";

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

async function sendMessage(token: string, chatId: number, text: string, parseMode = "Markdown") {
  await fetch(`${TELEGRAM_API}${token}/sendMessage`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ chat_id: chatId, text, parse_mode: parseMode }),
  }).catch((e) => console.error("[telegram] sendMessage:", (e as Error).message));
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
      body: JSON.stringify({ url: webhookUrl, allowed_updates: ["message", "edited_message"] }),
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

    const message = body?.message ?? body?.edited_message;
    if (!message) return ok();

    const chatId = message.chat?.id as number;
    const userId = message.from?.id as number;
    const text = String(message.text ?? "").trim();
    const firstName = message.from?.first_name ?? "";

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
      await sendMessage(token, chatId, "⛔ Acesso não autorizado.");
      return ok();
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

    if (pendencia && text && !text.startsWith("/")) {
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
          `Comandos:\n` +
          `/status — Ver resumo financeiro`,
      );
      return ok();
    }

    if (text === "/status") {
      const { count: totalPendentes } = await supabase
        .from("fin_despesas")
        .select("id", { count: "exact", head: true })
        .eq("status", "aberto");

      const inicioMes = new Date(new Date().getFullYear(), new Date().getMonth(), 1)
        .toISOString()
        .slice(0, 10);

      const { data: totalMes } = await supabase
        .from("fin_despesas")
        .select("valor_pago")
        .eq("status", "pago")
        .gte("data_pagamento", inicioMes);

      const somaMes = (totalMes ?? []).reduce(
        (s: number, d: { valor_pago: number | null }) => s + Number(d.valor_pago ?? 0),
        0,
      );

      await sendMessage(
        token,
        chatId,
        `📊 *Status Financeiro*\n\n` +
          `📋 Despesas em aberto: *${totalPendentes ?? 0}*\n` +
          `💸 Pago este mês: *${formatMoeda(somaMes)}*\n\n` +
          `_Atualizado agora_`,
      );
      return ok();
    }

    // ── Foto ou documento ──
    const photo = message.photo as Array<{ file_id: string }> | undefined;
    const document = message.document as
      | { file_id: string; mime_type?: string }
      | undefined;

    if (!photo && !document) {
      await sendMessage(
        token,
        chatId,
        `📎 Envie uma *foto* ou *PDF* do comprovante.\n\nComandos: /start /status`,
      );
      return ok();
    }

    if (!anthropicKey) {
      await sendMessage(token, chatId, "❌ ANTHROPIC_API_KEY não configurada.");
      return ok();
    }

    await sendMessage(token, chatId, `⏳ Processando com IA...\nAguarde um momento.`);

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

    // ── Claude Vision ──
    const prompt = `Analise este comprovante/documento financeiro.
Retorne APENAS JSON válido sem markdown:
{
  "tipo": "pix"|"boleto"|"ted"|"doc"|"nota_fiscal"|"recibo"|"desconhecido",
  "valor": 0.00,
  "data": "YYYY-MM-DD",
  "cnpj_recebedor": "apenas números ou null",
  "cpf_recebedor": "apenas números ou null",
  "nome_recebedor": "string ou null",
  "banco_pagador": "string ou null",
  "numero_documento": "string ou null",
  "codigo_barras": "string ou null",
  "descricao": "breve descrição",
  "confianca": "alta"|"media"|"baixa"
}`;

    const contentBlock = isPdf
      ? { type: "document", source: { type: "base64", media_type: "application/pdf", data: base64 } }
      : { type: "image", source: { type: "base64", media_type: mimeType, data: base64 } };

    const claudeRes = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": anthropicKey,
        "anthropic-version": "2023-06-01",
      },
      body: JSON.stringify({
        model: modelo,
        max_tokens: 1024,
        messages: [{ role: "user", content: [contentBlock, { type: "text", text: prompt }] }],
      }),
    });

    const claudeData = await claudeRes.json().catch(() => ({}));
    if (!claudeRes.ok) {
      console.error("[telegram] Claude erro:", JSON.stringify(claudeData).slice(0, 400));
      await sendMessage(
        token,
        chatId,
        `❌ Erro na leitura por IA: ${claudeData?.error?.message ?? claudeRes.status}`,
      );
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
      await sendMessage(
        token,
        chatId,
        `⚠️ *Não consegui identificar o comprovante.*\n\nPor favor, envie uma imagem mais clara.`,
      );
      return ok();
    }

    // ── Fornecedor ──
    const cnpj = dados.cnpj_recebedor ? String(dados.cnpj_recebedor).replace(/\D/g, "") : null;
    let fornecedor: any = null;

    if (cnpj) {
      const { data: forn } = await supabase
        .from("fornecedores")
        .select("id, nome_fantasia, cnpj_cpf, plano_conta_id")
        .eq("cnpj_cpf", cnpj)
        .maybeSingle();
      fornecedor = forn;
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

    const [
      { data: formasPagto },
      { data: contasFinanceiras },
      { data: centrosCusto },
      { data: planosContas },
    ] = await Promise.all([
      supabase.from("fin_formas_pagamento").select("id, nome, tipo").eq("ativo", true),
      supabase.from("fin_contas_financeiras").select("id, nome, tipo").eq("ativo", true),
      supabase.from("fin_centros_custo").select("id, nome").eq("ativo", true),
      supabase
        .from("fin_plano_contas")
        .select("id, nome, codigo")
        .eq("tipo", "despesa")
        .eq("aceita_lancamento", true)
        .eq("ativo", true)
        .order("codigo")
        .limit(15),
    ]);

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

    await supabase.from("telegram_pendencias").insert({
      chat_id: chatId,
      user_id: userId,
      dados_extraidos: { ...dados, cnpj_recebedor: cnpj },
      fornecedor_id: fornecedor?.id ?? null,
      fornecedor_nome: fornecedor?.nome_fantasia ?? dados.nome_recebedor ?? null,
      forma_pagamento_id: formaPagtoId,
      conta_financeira_id: contasFinanceiras?.[0]?.id ?? null,
      centro_custo_id: centrosCusto?.[0]?.id ?? null,
      plano_conta_sugerido_id: planoMemoria?.plano_conta_id ?? fornecedor?.plano_conta_id ?? null,
      anexo_url: anexoUrl,
      status: "aguardando_resposta",
      etapa: "plano_contas",
    });

    let msgResumo =
      `✅ *Comprovante lido com sucesso!*\n\n` +
      `💰 *Valor:* ${formatMoeda(dados.valor)}\n` +
      `📅 *Data:* ${dados.data || "hoje"}\n` +
      `🧾 *Tipo:* ${String(dados.tipo ?? "").toUpperCase()}\n` +
      `🏢 *Recebedor:* ${dados.nome_recebedor || "não identificado"}\n`;

    if (fornecedor) msgResumo += `✓ Fornecedor encontrado: *${fornecedor.nome_fantasia}*\n`;

    const planoSug = planoMemoria?.fin_plano_contas;
    if (planoSug) {
      msgResumo +=
        `\n💡 *Plano de contas sugerido:*\n_${planoSug.codigo} — ${planoSug.nome}_\n\n` +
        `Confirma? Digite *S* para sim ou o *número* de outro plano abaixo:`;
    } else {
      msgResumo += `\n📁 *Para qual plano de contas devo lançar?*\nDigite o número:`;
    }

    const planosLista = (planosContas ?? [])
      .map((p: any, i: number) => `${i + 1}. ${p.codigo} — ${p.nome}`)
      .join("\n");

    await sendMessage(token, chatId, `${msgResumo}\n\n${planosLista}`);
    return ok();
  } catch (err) {
    console.error("[telegram] Erro:", (err as Error).message);
    return ok();
  }
});

// ── Processar resposta do usuário ──
async function processarResposta(
  supabase: any,
  token: string,
  chatId: number,
  text: string,
  pendencia: any,
) {
  if (pendencia.etapa !== "plano_contas") return ok();

  const { data: planos } = await supabase
    .from("fin_plano_contas")
    .select("id, nome, codigo")
    .eq("tipo", "despesa")
    .eq("aceita_lancamento", true)
    .eq("ativo", true)
    .order("codigo")
    .limit(15);

  let planoId: string | null = null;
  let planoNome = "";

  if (text.toUpperCase() === "S" && pendencia.plano_conta_sugerido_id) {
    planoId = pendencia.plano_conta_sugerido_id;
    const { data: plano } = await supabase
      .from("fin_plano_contas")
      .select("codigo, nome")
      .eq("id", planoId)
      .maybeSingle();
    planoNome = plano ? `${plano.codigo} — ${plano.nome}` : "Plano selecionado";
  } else {
    const num = parseInt(text, 10);
    if (num >= 1 && num <= (planos?.length ?? 0)) {
      const plano = planos![num - 1];
      planoId = plano.id;
      planoNome = `${plano.codigo} — ${plano.nome}`;
    }
  }

  if (!planoId) {
    await sendMessage(
      token,
      chatId,
      `❌ Opção inválida. Digite o número do plano (1-${planos?.length ?? 15}) ou *S* para confirmar a sugestão.`,
    );
    return ok();
  }

  const dados = pendencia.dados_extraidos ?? {};
  const hoje = new Date().toISOString().slice(0, 10);

  let fornecedorId = pendencia.fornecedor_id;
  if (!fornecedorId && dados.nome_recebedor) {
    const { data: novoForn, error: fornErr } = await supabase
      .from("fornecedores")
      .insert({
        nome_fantasia: dados.nome_recebedor,
        razao_social: dados.nome_recebedor,
        cnpj_cpf: dados.cnpj_recebedor || null,
        ativo: true,
        plano_conta_id: planoId,
      })
      .select("id")
      .single();
    if (fornErr) console.error("[telegram] fornecedor:", fornErr.message);
    fornecedorId = novoForn?.id ?? null;
  }

  if (!fornecedorId) {
    await sendMessage(
      token,
      chatId,
      `❌ Não foi possível identificar o fornecedor.\nAcesse o Softflow para lançar manualmente.`,
    );
    await supabase.from("telegram_pendencias").update({ status: "erro" }).eq("id", pendencia.id);
    return ok();
  }

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
      descricao: dados.descricao || "Lançado via Telegram",
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
    await sendMessage(token, chatId, `❌ Erro ao lançar despesa: ${despesaErr.message}`);
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

  if (dados.cnpj_recebedor) {
    const { error: memErr } = await supabase.from("telegram_memoria").upsert(
      {
        cnpj_fornecedor: dados.cnpj_recebedor,
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

  await sendMessage(
    token,
    chatId,
    `✅ *Despesa lançada com sucesso!*\n\n` +
      `🏢 *Fornecedor:* ${pendencia.fornecedor_nome || dados.nome_recebedor}\n` +
      `💸 *Valor pago:* ${formatMoeda(dados.valor)}\n` +
      `📅 *Data:* ${dados.data || hoje}\n` +
      `🧾 *Tipo:* ${String(dados.tipo ?? "").toUpperCase()}\n` +
      `📁 *Plano de contas:* ${planoNome}\n` +
      `📎 *Comprovante:* salvo ✓\n\n` +
      `_Lançado no Softflow_ 🚀`,
  );

  return ok();
}
