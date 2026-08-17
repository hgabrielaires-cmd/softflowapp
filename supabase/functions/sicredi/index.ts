// supabase/functions/sicredi/index.ts
//
// Integração com a API de Cobrança (Boletos) do Sicredi.
// Documentação oficial: https://developers.sicredi.com.br/public/docs/getting-started-billing
//
// Ações suportadas (POST { action, ...payload }):
//   - "criar-boleto-fatura" -> { faturaId }
//   - "criar-boleto"        -> payload já pronto
//   - "consultar-boleto"    -> consulta por nossoNumero
//   - "gerar-pdf"           -> gera o PDF (2ª via) e salva no Storage
//   - "baixar-boleto"       -> baixa manual
//   - "gerar-automatico"    -> rede de segurança via cron
//
// Toda chamada exige o header x-internal-token (fail-closed).

import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

// ── Config ───────────────────────────────────────────────────────────────

const AMBIENTE = (Deno.env.get("SICREDI_AMBIENTE") ?? "sandbox").toLowerCase();
const IS_SANDBOX = AMBIENTE !== "producao";

const AUTH_URL = IS_SANDBOX
  ? "https://api-parceiro.sicredi.com.br/sb/auth/openapi/token"
  : "https://api-parceiro.sicredi.com.br/auth/openapi/token";

const API_BASE = IS_SANDBOX
  ? "https://api-parceiro.sicredi.com.br/sb/cobranca/boleto/v1"
  : "https://api-parceiro.sicredi.com.br/cobranca/boleto/v1";

function req(name: string): string {
  const v = Deno.env.get(name);
  if (!v) console.warn(`[sicredi] secret ausente: ${name}`);
  return v ?? "";
}

const X_API_KEY = req("SICREDI_X_API_KEY");
const CODIGO_BENEFICIARIO = req("SICREDI_CODIGO_BENEFICIARIO");
const COOPERATIVA = req("SICREDI_COOPERATIVA");
const POSTO = req("SICREDI_POSTO");
const CODIGO_ACESSO = req("SICREDI_CODIGO_ACESSO");

const supabase = createClient(
  Deno.env.get("SUPABASE_URL")!,
  Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
);

const INTERNAL_TOKEN = Deno.env.get("SICREDI_INTERNAL_TOKEN") ?? "";

const JSON_HEADERS = { "Content-Type": "application/json" };

function pad(value: string, length: number): string {
  return value.padStart(length, "0");
}

function username(): string {
  // Código do Beneficiário (5 posições) + Código da Cooperativa (4 posições)
  return pad(CODIGO_BENEFICIARIO, 5) + pad(COOPERATIVA, 4);
}

// ── Autenticação (OAuth2 password, com cache em tabela) ────────────────────

interface TokenRow {
  access_token: string;
  refresh_token: string;
  expires_at: string;
  refresh_expires_at: string;
}

async function getValidToken(): Promise<string> {
  const { data } = await supabase
    .from("sicredi_tokens")
    .select("*")
    .eq("ambiente", AMBIENTE)
    .maybeSingle<TokenRow>();

  const now = Date.now();
  const bufferMs = 30_000;

  if (data && new Date(data.expires_at).getTime() - bufferMs > now) {
    return data.access_token;
  }

  if (data && new Date(data.refresh_expires_at).getTime() - bufferMs > now) {
    try {
      return await refreshToken(data.refresh_token);
    } catch (err) {
      console.warn("[sicredi] refresh_token falhou, autenticando do zero:", err);
    }
  }

  return await authenticate();
}

async function authenticate(): Promise<string> {
  const body = new URLSearchParams({
    grant_type: "password",
    username: username(),
    password: CODIGO_ACESSO,
    scope: "cobranca",
  });

  const resp = await fetch(AUTH_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/x-www-form-urlencoded",
      "x-api-key": X_API_KEY,
      context: "COBRANCA",
    },
    body,
  });

  if (!resp.ok) {
    const text = await resp.text();
    const u = username();
    throw new Error(
      `Falha na autenticação Sicredi (${resp.status}): ${text} [diag: ambiente=${AMBIENTE} username=${u} (len ${u.length}) coop=${COOPERATIVA} posto=${POSTO} benef_len=${CODIGO_BENEFICIARIO.length} acesso_len=${CODIGO_ACESSO.length}]`,
    );
  }


  const json = await resp.json();
  await saveToken(json);
  return json.access_token;
}

async function refreshToken(refresh_token: string): Promise<string> {
  const body = new URLSearchParams({
    grant_type: "refresh_token",
    refresh_token,
  });

  const resp = await fetch(AUTH_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/x-www-form-urlencoded",
      "x-api-key": X_API_KEY,
      context: "COBRANCA",
    },
    body,
  });

  if (!resp.ok) {
    throw new Error(`Falha ao renovar token Sicredi (${resp.status})`);
  }

  const json = await resp.json();
  await saveToken(json);
  return json.access_token;
}

async function saveToken(json: {
  access_token: string;
  refresh_token: string;
  expires_in: number;
  refresh_expires_in: number;
}) {
  const now = Date.now();
  await supabase.from("sicredi_tokens").upsert({
    ambiente: AMBIENTE,
    access_token: json.access_token,
    refresh_token: json.refresh_token,
    expires_at: new Date(now + json.expires_in * 1000).toISOString(),
    refresh_expires_at: new Date(now + json.refresh_expires_in * 1000).toISOString(),
    updated_at: new Date().toISOString(),
  }, { onConflict: "ambiente" });
}

// ── Chamadas à API de Cobrança ──────────────────────────────────────────

function baseHeaders(token: string) {
  return {
    Authorization: `Bearer ${token}`,
    "x-api-key": X_API_KEY,
    "Content-Type": "application/json",
    cooperativa: COOPERATIVA,
    posto: POSTO,
  };
}

interface Pagador {
  tipoPessoa: "PESSOA_FISICA" | "PESSOA_JURIDICA";
  documento: string;
  nome: string;
  endereco?: string;
  cidade?: string;
  uf?: string;
  cep?: string;
}

interface CriarBoletoInput {
  seuNumero: string;
  valor: number;
  dataVencimento: string;
  pagador: Pagador;
  tipoCobranca?: "NORMAL" | "HIBRIDO";
  especieDocumento?: string;
  desconto?: unknown;
  juros?: { percentual?: number; tipoJurosPercentual?: "DIARIO" | "MENSAL"; valor?: number };
  multa?: unknown;
  mensagens?: string[];
  faturaId?: string;
}

async function criarBoleto(input: CriarBoletoInput) {
  const token = await getValidToken();

  const payload: Record<string, unknown> = {
    codigoBeneficiario: CODIGO_BENEFICIARIO,
    tipoCobranca: input.tipoCobranca ?? "NORMAL",
    especieDocumento: input.especieDocumento ?? "DUPLICATA_MERCANTIL_INDICACAO",
    dataVencimento: input.dataVencimento,
    valor: input.valor,
    seuNumero: input.seuNumero,
    pagador: input.pagador,
  };
  if (input.desconto) payload.desconto = input.desconto;
  if (input.juros) payload.juros = input.juros;
  if (input.multa) payload.multa = input.multa;
  if (input.mensagens) payload.mensagens = input.mensagens;

  const resp = await fetch(`${API_BASE}/boletos`, {
    method: "POST",
    headers: baseHeaders(token),
    body: JSON.stringify(payload),
  });

  const json = await resp.json().catch(() => null);

  const { error: logError } = await supabase.from("sicredi_boletos").insert({
    fatura_id: input.faturaId ?? null,
    seu_numero: input.seuNumero,
    valor: input.valor,
    data_vencimento: input.dataVencimento,
    cooperativa: COOPERATIVA,
    posto: POSTO,
    codigo_beneficiario: CODIGO_BENEFICIARIO,
    status: resp.ok ? "EMITIDO" : "ERRO",
    nosso_numero: json?.nossoNumero ?? null,
    linha_digitavel: json?.linhaDigitavel ?? null,
    codigo_barras: json?.codigoBarras ?? null,
    payload_emissao: {
      ambiente: AMBIENTE,
      http_status: resp.status,
      pagador: input.pagador,
      request: payload,
      response: json,
    },
  });
  if (logError) console.warn("[sicredi] falha ao registrar log do boleto:", logError.message);

  if (!resp.ok) {
    throw new Error(`Falha ao criar boleto (${resp.status}): ${JSON.stringify(json)}`);
  }

  return json;
}

async function consultarBoleto(nossoNumero: string) {
  const token = await getValidToken();
  const url = `${API_BASE}/boletos?codigoBeneficiario=${CODIGO_BENEFICIARIO}&nossoNumero=${nossoNumero}`;
  const resp = await fetch(url, { headers: baseHeaders(token) });
  const json = await resp.json().catch(() => null);
  if (!resp.ok) {
    throw new Error(`Falha ao consultar boleto (${resp.status}): ${JSON.stringify(json)}`);
  }
  return json;
}

async function gerarPdf(linhaDigitavel: string, nossoNumero?: string) {
  const token = await getValidToken();
  const url = `${API_BASE}/boletos/pdf?linhaDigitavel=${linhaDigitavel}`;
  const resp = await fetch(url, {
    headers: {
      Authorization: `Bearer ${token}`,
      "x-api-key": X_API_KEY,
      "Content-Type": "application/json",
    },
  });

  if (!resp.ok) {
    const text = await resp.text();
    throw new Error(`Falha ao gerar PDF (${resp.status}): ${text}`);
  }

  const bytes = new Uint8Array(await resp.arrayBuffer());
  const path = `${AMBIENTE}/${nossoNumero ?? linhaDigitavel}.pdf`;

  const { error: uploadError } = await supabase.storage
    .from("sicredi-boletos")
    .upload(path, bytes, { contentType: "application/pdf", upsert: true });

  if (uploadError) {
    throw new Error(`PDF gerado, mas falhou ao salvar no Storage: ${uploadError.message}`);
  }

  const { data: signed } = await supabase.storage
    .from("sicredi-boletos")
    .createSignedUrl(path, 60 * 60 * 24 * 7);

  if (nossoNumero) {
    await supabase
      .from("sicredi_boletos")
      .update({ pdf_url: signed?.signedUrl ?? path })
      .eq("nosso_numero", nossoNumero);
  }

  return { path, url: signed?.signedUrl ?? null };
}

async function baixarBoleto(nossoNumero: string) {
  const token = await getValidToken();
  const resp = await fetch(`${API_BASE}/boletos/${nossoNumero}/baixa`, {
    method: "PATCH",
    headers: { ...baseHeaders(token), codigoBeneficiario: CODIGO_BENEFICIARIO },
  });
  const json = await resp.json().catch(() => null);
  if (!resp.ok) {
    throw new Error(`Falha ao dar baixa (${resp.status}): ${JSON.stringify(json)}`);
  }

  await supabase
    .from("sicredi_boletos")
    .update({ status: "BAIXA_SOLICITADA" })
    .eq("nosso_numero", nossoNumero);

  return json;
}

// ── Emissão a partir de uma fatura real do Softflow ─────────────────────

interface FaturaRow {
  id: string;
  numero_fatura: string;
  valor: number;
  valor_final: number | null;
  data_vencimento: string;
  cliente_id: string;
  filial_id: string;
  boleto_nosso_numero: string | null;
}

interface ClienteRow {
  razao_social: string | null;
  nome_fantasia: string | null;
  cnpj_cpf: string | null;
  logradouro: string | null;
  numero: string | null;
  complemento: string | null;
  cidade: string | null;
  uf: string | null;
  cep: string | null;
}

function montarPagador(cliente: ClienteRow): Pagador {
  const documento = (cliente.cnpj_cpf ?? "").replace(/\D/g, "");
  const tipoPessoa = documento.length > 11 ? "PESSOA_JURIDICA" : "PESSOA_FISICA";
  const nome = cliente.razao_social || cliente.nome_fantasia || "";
  const endereco = [cliente.logradouro, cliente.numero].filter(Boolean).join(", ") +
    (cliente.complemento ? ` - ${cliente.complemento}` : "");

  return {
    tipoPessoa,
    documento,
    nome,
    endereco: endereco || undefined,
    cidade: cliente.cidade ?? undefined,
    uf: cliente.uf ?? undefined,
    cep: cliente.cep ? cliente.cep.replace(/\D/g, "") : undefined,
  };
}

async function criarBoletoParaFatura(faturaId: string) {
  const { data: fatura, error: faturaError } = await supabase
    .from("faturas")
    .select("id, numero_fatura, valor, valor_final, data_vencimento, cliente_id, filial_id, boleto_nosso_numero")
    .eq("id", faturaId)
    .maybeSingle<FaturaRow>();

  if (faturaError) throw new Error(`Falha ao buscar fatura ${faturaId}: ${faturaError.message}`);
  if (!fatura) throw new Error(`Fatura ${faturaId} não encontrada`);
  if (fatura.boleto_nosso_numero) {
    return { skipped: true, motivo: "Fatura já tem boleto Sicredi emitido", nossoNumero: fatura.boleto_nosso_numero };
  }

  const { data: cliente, error: clienteError } = await supabase
    .from("clientes")
    .select("razao_social, nome_fantasia, cnpj_cpf, logradouro, numero, complemento, cidade, uf, cep")
    .eq("id", fatura.cliente_id)
    .maybeSingle<ClienteRow>();

  if (clienteError) throw new Error(`Falha ao buscar cliente da fatura ${faturaId}: ${clienteError.message}`);
  if (!cliente) throw new Error(`Cliente da fatura ${faturaId} não encontrado`);

  // Sicredi limita "seu número" a 10 caracteres: usa apenas os dígitos do número da fatura.
  const seuNumero = (String(fatura.numero_fatura).replace(/\D/g, "") || String(fatura.id).replace(/\D/g, ""))
    .slice(-10);

  const boleto = await criarBoleto({
    seuNumero,
    tipoCobranca: "HIBRIDO",
    valor: fatura.valor_final ?? fatura.valor,
    dataVencimento: fatura.data_vencimento,
    pagador: montarPagador(cliente),
    faturaId: fatura.id,
  });

  if (!boleto?.qrCode) {
    console.warn(
      `[sicredi] boleto ${boleto?.nossoNumero} solicitado como HIBRIDO mas retornou sem qrCode — ` +
      `provavelmente a modalidade Híbrida (Pix) não está habilitada no cadastro de Cobrança do beneficiário. ` +
      `O boleto tradicional segue válido.`,
    );
  }

  await supabase
    .from("faturas")
    .update({
      gateway: "sicredi",
      boleto_nosso_numero: boleto.nossoNumero,
      boleto_linha_digitavel: boleto.linhaDigitavel,
      boleto_codigo_barras: boleto.codigoBarras,
      boleto_pix_qrcode: boleto.qrCode ?? null,
      boleto_pix_txid: boleto.txid ?? null,
    })
    .eq("id", fatura.id);

  try {
    const pdf = await gerarPdf(boleto.linhaDigitavel, boleto.nossoNumero);
    if (pdf.url) {
      await supabase.from("faturas").update({ boleto_pdf_url: pdf.url }).eq("id", fatura.id);
    }
  } catch (err) {
    console.warn(`[sicredi] boleto ${boleto.nossoNumero} emitido, mas PDF falhou:`, err);
  }

  return boleto;
}

// ── Geração automática em lote (rede de segurança via cron) ────────────

const SICREDI_FILIAL_ID = Deno.env.get("SICREDI_FILIAL_ID");

async function gerarAutomatico() {
  let query = supabase
    .from("faturas")
    .select("id")
    .eq("status", "Pendente")
    .is("boleto_nosso_numero", null)
    .lte("data_vencimento", new Date(Date.now() + 3 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10));

  if (SICREDI_FILIAL_ID) {
    query = query.eq("filial_id", SICREDI_FILIAL_ID);
  }

  const { data: pendentes, error } = await query;
  if (error) throw new Error(`Falha ao buscar faturas pendentes: ${error.message}`);

  const resultados: Array<{ faturaId: string; ok: boolean; erro?: string }> = [];

  for (const fatura of pendentes ?? []) {
    try {
      await criarBoletoParaFatura(fatura.id);
      resultados.push({ faturaId: fatura.id, ok: true });
    } catch (err) {
      resultados.push({ faturaId: fatura.id, ok: false, erro: String(err) });
    }
  }

  return { total: (pendentes ?? []).length, resultados };
}

// ── Conciliação: liquidados por dia (rede de segurança do webhook) ──────

function formatarDataBR(date: Date): string {
  const dd = String(date.getDate()).padStart(2, "0");
  const mm = String(date.getMonth() + 1).padStart(2, "0");
  const yyyy = date.getFullYear();
  return `${dd}/${mm}/${yyyy}`;
}

interface BoletoLiquidado {
  nossoNumero: string;
  seuNumero: string;
  dataPagamento: string; // yyyy-mm-dd
  valorLiquidado: number;
  tipoLiquidacao: string;
}

async function consultarLiquidadosDia(dia: string): Promise<BoletoLiquidado[]> {
  const token = await getValidToken();
  const items: BoletoLiquidado[] = [];
  let pagina = 0;
  let hasNext = true;

  while (hasNext) {
    const url =
      `${API_BASE}/boletos/liquidados/dia?codigoBeneficiario=${CODIGO_BENEFICIARIO}&dia=${dia}&pagina=${pagina}`;
    const resp = await fetch(url, {
      headers: {
        Authorization: `Bearer ${token}`,
        "x-api-key": X_API_KEY,
        "Content-Type": "application/x-www-form-urlencoded",
        cooperativa: COOPERATIVA,
        posto: POSTO,
      },
    });

    if (!resp.ok) {
      const text = await resp.text();
      throw new Error(`Falha ao consultar liquidados do dia ${dia} (${resp.status}): ${text}`);
    }

    const json = await resp.json();
    items.push(...(json.items ?? []));
    hasNext = Boolean(json.hasNext);
    pagina += 1;
  }

  return items;
}

async function sincronizarLiquidados() {
  const hoje = new Date();
  const ontem = new Date(hoje.getTime() - 24 * 60 * 60 * 1000);

  const [itensHoje, itensOntem] = await Promise.all([
    consultarLiquidadosDia(formatarDataBR(hoje)),
    consultarLiquidadosDia(formatarDataBR(ontem)),
  ]);

  const todos = [...itensHoje, ...itensOntem];
  const resultados: Array<{ nossoNumero: string; alterado: boolean }> = [];

  for (const item of todos) {
    const { data: fatura } = await supabase
      .from("faturas")
      .select("id, status")
      .eq("boleto_nosso_numero", item.nossoNumero)
      .maybeSingle<{ id: string; status: string }>();

    if (!fatura || fatura.status === "Pago") {
      resultados.push({ nossoNumero: item.nossoNumero, alterado: false });
      continue;
    }

    const { error } = await supabase
      .from("faturas")
      .update({ status: "Pago", data_pagamento: item.dataPagamento })
      .eq("id", fatura.id);

    if (error) {
      console.warn(`[sicredi] falha ao dar baixa via conciliação (${item.nossoNumero}):`, error.message);
    } else {
      await supabase
        .from("sicredi_boletos")
        .update({
          status: "LIQUIDADO",
          liquidado_em: new Date().toISOString(),
          valor_liquidacao: item.valorLiquidado ?? null,
        })
        .eq("nosso_numero", item.nossoNumero);
    }

    resultados.push({ nossoNumero: item.nossoNumero, alterado: !error });
  }

  return { total: todos.length, alterados: resultados.filter((r) => r.alterado).length, resultados };
}

// ── HTTP handler ─────────────────────────────────────────────────────────


Deno.serve(async (request: Request) => {
  // Fail-closed: sem o segredo interno, nada roda.
  if (!INTERNAL_TOKEN || request.headers.get("x-internal-token") !== INTERNAL_TOKEN) {
    return new Response(JSON.stringify({ error: "Unauthorized" }), {
      status: 401,
      headers: JSON_HEADERS,
    });
  }

  try {
    const body = await request.json().catch(() => ({}));
    const action = body.action;

    let result: unknown;
    switch (action) {
      case "criar-boleto-fatura":
        result = await criarBoletoParaFatura(body.faturaId);
        break;
      case "criar-boleto":
        result = await criarBoleto(body);
        break;
      case "consultar-boleto":
        result = await consultarBoleto(body.nossoNumero);
        break;
      case "gerar-pdf":
        result = await gerarPdf(body.linhaDigitavel, body.nossoNumero);
        break;
      case "baixar-boleto":
        result = await baixarBoleto(body.nossoNumero);
        break;
      case "gerar-automatico":
        result = await gerarAutomatico();
        break;
      case "sincronizar-liquidados":
        result = await sincronizarLiquidados();
        break;
      default:
        return new Response(
          JSON.stringify({ error: `Ação desconhecida: "${action}"` }),
          { status: 400, headers: JSON_HEADERS },
        );
    }

    return new Response(JSON.stringify(result), {
      status: 200,
      headers: JSON_HEADERS,
    });
  } catch (err) {
    console.error("[sicredi] erro:", err);
    return new Response(JSON.stringify({ error: String(err) }), {
      status: 500,
      headers: JSON_HEADERS,
    });
  }
});
