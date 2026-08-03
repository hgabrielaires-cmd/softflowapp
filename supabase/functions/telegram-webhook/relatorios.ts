// ─── Relatórios financeiros do bot Telegram ──────────────────────────────
// Layout inspirado em dashboards financeiros (tabelas monoespaçadas).

const EMOJI_GRUPOS: Record<string, string> = {
  "1": "💚", // Receitas
  "2": "📉", // Deduções
  "3": "💼", // Custos Diretos
  "4": "🏪", // Despesas Comerciais
  "5": "🏢", // Despesas Administrativas
  "6": "👥", // Pessoal
  "7": "🏦", // Financeiras
  "8": "📦", // Outros
};

export function getEmojiGrupo(codigo: string): string {
  const primeiroDigito = String(codigo ?? "").split(".")[0];
  return EMOJI_GRUPOS[primeiroDigito] || "📊";
}

const SEP = "━━━━━━━━━━━━━━━━━━━━━━━━━━━━";
const RODAPE = "_Atualizado agora_ 🕐";

export function tabelaMarkdown(colunas: string[], linhas: string[][]): string {
  const larguras = colunas.map((col, i) =>
    Math.max(col.length, ...linhas.map((l) => (l[i] || "").length)),
  );

  const header = colunas.map((col, i) => col.padEnd(larguras[i])).join("  ");
  const separador = larguras.map((l) => "─".repeat(l)).join("──");
  const rows = linhas
    .map((linha) => linha.map((cel, i) => (cel || "").padEnd(larguras[i])).join("  "))
    .join("\n");

  return `${header}\n${separador}\n${rows}`;
}

// Tabela com colunas numéricas alinhadas à direita (índices em `direita`)
function tabela(colunas: string[], linhas: string[][], direita: number[] = []): string {
  const larguras = colunas.map((col, i) =>
    Math.max(col.length, ...linhas.map((l) => (l[i] || "").length)),
  );
  const pad = (v: string, i: number) =>
    direita.includes(i) ? (v || "").padStart(larguras[i]) : (v || "").padEnd(larguras[i]);

  const header = colunas.map((c, i) => pad(c, i)).join("  ");
  const separador = larguras.map((l) => "─".repeat(l)).join("──");
  const rows = linhas.map((l) => l.map((c, i) => pad(c, i)).join("  ")).join("\n");
  return "```\n" + `${header}\n${separador}\n${rows}` + "\n```";
}

function bloco(linhas: string[][], direita: number[] = []): string {
  const larguras = [0, 1].map((i) => Math.max(...linhas.map((l) => (l[i] || "").length)));
  const rows = linhas
    .map((l) =>
      l
        .map((c, i) => (direita.includes(i) ? (c || "").padStart(larguras[i]) : (c || "").padEnd(larguras[i])))
        .join("  "),
    )
    .join("\n");
  return "```\n" + rows + "\n```";
}

function moeda(v: number) {
  return Number(v || 0).toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

function pct(parte: number, total: number) {
  if (!total) return "0,0%";
  return `${((parte / total) * 100).toFixed(1).replace(".", ",")}%`;
}

function d(dt: Date) {
  return dt.toISOString().slice(0, 10);
}

function br(iso: string, curto = false) {
  const [y, m, dd] = String(iso).slice(0, 10).split("-");
  return curto ? `${dd}/${m}` : `${dd}/${m}/${y}`;
}

export type Periodo = { inicio: string; fim: string; label: string };

export function periodoSemana() {
  const hoje = new Date();
  const inicio = new Date(hoje);
  inicio.setDate(hoje.getDate() - 6);
  return { inicio: d(inicio), fim: d(hoje) };
}

function periodoPadrao(): Periodo {
  const { inicio, fim } = periodoSemana();
  return { inicio, fim, label: "Últimos 7 dias" };
}

function inicioMes() {
  const h = new Date();
  return d(new Date(h.getFullYear(), h.getMonth(), 1));
}

type Despesa = {
  valor: number | null;
  valor_pago: number | null;
  data_vencimento: string;
  status: string;
  plano_conta_id: string | null;
  fornecedor_id: string | null;
};

async function despesasPagas(supabase: any, inicio: string, fim: string) {
  const { data } = await supabase
    .from("fin_despesas")
    .select("valor, valor_pago, data_pagamento, plano_conta_id, fornecedor_id, status, data_vencimento")
    .eq("status", "pago")
    .gte("data_pagamento", inicio)
    .lte("data_pagamento", fim);
  return (data ?? []) as Despesa[];
}

async function receitas(supabase: any, inicio: string, fim: string) {
  const { data } = await supabase
    .from("faturas")
    .select("valor_final, valor")
    .eq("status", "pago")
    .gte("data_pagamento", inicio)
    .lte("data_pagamento", fim);
  return (data ?? []).reduce(
    (s: number, f: any) => s + Number(f.valor_final ?? f.valor ?? 0),
    0,
  );
}

async function mapaPlanos(supabase: any) {
  const { data } = await supabase.from("fin_plano_contas").select("id, codigo, nome");
  const map = new Map<string, { codigo: string; nome: string }>();
  for (const p of data ?? []) map.set(p.id, { codigo: p.codigo, nome: p.nome });
  return map;
}

async function mapaFornecedores(supabase: any) {
  const { data } = await supabase.from("fornecedores").select("id, nome_fantasia, razao_social");
  const map = new Map<string, string>();
  for (const f of data ?? []) map.set(f.id, f.nome_fantasia || f.razao_social || "—");
  return map;
}

function valorDe(dsp: Despesa) {
  return Number(dsp.valor_pago ?? dsp.valor ?? 0);
}

// ── /categorias ───────────────────────────────────────────────────────────
export async function relatorioCategorias(supabase: any, periodo?: Periodo): Promise<string> {
  const { inicio, fim, label } = periodo ?? periodoPadrao();
  const [despesas, planos] = await Promise.all([
    despesasPagas(supabase, inicio, fim),
    mapaPlanos(supabase),
  ]);

  const total = despesas.reduce((s, x) => s + valorDe(x), 0);
  if (!total) {
    return `📁 *DESPESAS POR PLANO DE CONTAS*\n_${label}: ${br(inicio)} a ${br(fim)}_\n\n${SEP}\n\nNenhuma despesa paga no período.\n\n${RODAPE}`;
  }

  type Grupo = { codigo: string; nome: string; total: number; subs: Map<string, { nome: string; total: number }> };
  const grupos = new Map<string, Grupo>();

  for (const dsp of despesas) {
    const plano = dsp.plano_conta_id ? planos.get(dsp.plano_conta_id) : null;
    const codigo = plano?.codigo ?? "8";
    const raiz = codigo.split(".")[0];
    if (!grupos.has(raiz)) {
      grupos.set(raiz, {
        codigo: raiz,
        nome: (planos.get(
          [...planos.entries()].find(([, p]) => p.codigo === raiz)?.[0] ?? "",
        )?.nome ?? "Outros").toUpperCase(),
        total: 0,
        subs: new Map(),
      });
    }
    const g = grupos.get(raiz)!;
    g.total += valorDe(dsp);
    const chave = `${codigo} ${plano?.nome ?? "Sem plano"}`;
    const sub = g.subs.get(chave) ?? { nome: chave, total: 0 };
    sub.total += valorDe(dsp);
    g.subs.set(chave, sub);
  }

  const partes = [...grupos.values()]
    .filter((g) => g.total > 0)
    .sort((a, b) => b.total - a.total)
    .map((g) => {
      const linhas = [...g.subs.values()]
        .sort((a, b) => b.total - a.total)
        .map((s) => [s.nome, moeda(s.total), pct(s.total, total)]);
      return (
        `${getEmojiGrupo(g.codigo)} *${g.codigo} — ${g.nome}*\n` +
        `💸 ${moeda(g.total)}   📊 ${pct(g.total, total)} do total\n\n` +
        tabela(["Subcategoria", "Valor", "%"], linhas, [1, 2])
      );
    });

  return (
    `📁 *DESPESAS POR PLANO DE CONTAS*\n_${label}: ${br(inicio)} a ${br(fim)}_\n\n` +
    `${SEP}\n\n` +
    partes.join(`\n\n${SEP}\n\n`) +
    `\n\n${SEP}\n\n💸 *TOTAL DESPESAS*\n${moeda(total)}\n\n${RODAPE}`
  );
}

// ── /dre ──────────────────────────────────────────────────────────────────
export async function relatorioDre(supabase: any, periodo?: Periodo): Promise<string> {
  const { inicio, fim, label } = periodo ?? periodoPadrao();
  const [despesas, planos, totalReceitas] = await Promise.all([
    despesasPagas(supabase, inicio, fim),
    mapaPlanos(supabase),
    receitas(supabase, inicio, fim),
  ]);

  const totalDespesas = despesas.reduce((s, x) => s + valorDe(x), 0);

  const grupos = new Map<string, { nome: string; total: number }>();
  for (const dsp of despesas) {
    const plano = dsp.plano_conta_id ? planos.get(dsp.plano_conta_id) : null;
    const raiz = (plano?.codigo ?? "8").split(".")[0];
    const nomeRaiz =
      [...planos.values()].find((p) => p.codigo === raiz)?.nome ?? "Outros";
    const g = grupos.get(raiz) ?? { nome: nomeRaiz, total: 0 };
    g.total += valorDe(dsp);
    grupos.set(raiz, g);
  }

  const linhasDesp = [...grupos.entries()]
    .filter(([, g]) => g.total > 0)
    .sort((a, b) => b[1].total - a[1].total)
    .map(([cod, g]) => [`${cod} ${g.nome}`, moeda(g.total), pct(g.total, totalReceitas)]);

  const lucro = totalReceitas - totalDespesas;
  const margem = totalReceitas ? pct(lucro, totalReceitas) : "—";

  return (
    `📊 *DRE — RESULTADO*\n_${label}: ${br(inicio)} a ${br(fim)}_\n\n` +
    `${SEP}\n\n💚 *RECEITAS*\n\n` +
    tabela(["Origem", "Valor"], [["Faturamento recebido", moeda(totalReceitas)]], [1]) +
    `\nTotal Receitas: *${moeda(totalReceitas)}*\n\n` +
    `${SEP}\n\n🔴 *DESPESAS*\n\n` +
    (linhasDesp.length
      ? tabela(["Categoria", "Valor", "%Rec"], linhasDesp, [1, 2])
      : "```\nSem despesas no período\n```") +
    `\nTotal Despesas: *${moeda(totalDespesas)}*` +
    (totalReceitas ? ` (${pct(totalDespesas, totalReceitas)} da receita)` : "") +
    `\n\n${SEP}\n\n` +
    `${lucro >= 0 ? "🟢" : "🔻"} *RESULTADO OPERACIONAL*\n` +
    `${lucro >= 0 ? "Lucro" : "Prejuízo"}: *${moeda(Math.abs(lucro))}*\n` +
    `Margem: *${margem}*\n\n${RODAPE}`
  );
}

// ── /maiores ──────────────────────────────────────────────────────────────
export async function relatorioMaiores(supabase: any, periodo?: Periodo): Promise<string> {
  const { inicio, fim, label } = periodo ?? periodoPadrao();
  const [despesas, fornecedores] = await Promise.all([
    despesasPagas(supabase, inicio, fim),
    mapaFornecedores(supabase),
  ]);

  const total = despesas.reduce((s, x) => s + valorDe(x), 0);
  if (!total) {
    return `🏆 *MAIORES GASTOS*\n_${label}: ${br(inicio)} a ${br(fim)}_\n\n${SEP}\n\nNenhuma despesa paga no período.\n\n${RODAPE}`;
  }

  const porFornecedor = new Map<string, number>();
  for (const dsp of despesas) {
    const nome = dsp.fornecedor_id ? fornecedores.get(dsp.fornecedor_id) ?? "—" : "Sem fornecedor";
    porFornecedor.set(nome, (porFornecedor.get(nome) ?? 0) + valorDe(dsp));
  }

  const top = [...porFornecedor.entries()].sort((a, b) => b[1] - a[1]).slice(0, 10);
  const somaTop = top.reduce((s, [, v]) => s + v, 0);

  const linhas = top.map(([nome, valor], i) => [
    `${i + 1}°`,
    nome.slice(0, 24),
    moeda(valor),
    pct(valor, total),
  ]);

  return (
    `🏆 *MAIORES GASTOS*\n_${label}: ${br(inicio)} a ${br(fim)}_\n\n` +
    `${SEP}\n\n` +
    tabela(["#", "Fornecedor", "Valor", "%"], linhas, [2, 3]) +
    `\n\n${SEP}\n\n` +
    `💡 *Maior gasto:* ${top[0][0]}\n   Representa *${pct(top[0][1], total)}* do total do período\n\n` +
    `💸 *Total top 10:* ${moeda(somaTop)}\n\n${RODAPE}`
  );
}

// ── /status ───────────────────────────────────────────────────────────────
export async function relatorioStatus(supabase: any, periodo?: Periodo): Promise<string> {
  const { inicio, fim, label } = periodo ?? periodoPadrao();
  const mesIni = inicioMes();
  const hoje = d(new Date());

  const [despSemana, recSemana, despMes, recMes, abertasRes] = await Promise.all([
    despesasPagas(supabase, inicio, fim),
    receitas(supabase, inicio, fim),
    despesasPagas(supabase, mesIni, fim),
    receitas(supabase, mesIni, fim),
    supabase
      .from("fin_despesas")
      .select("valor, data_vencimento")
      .eq("status", "aberto"),
  ]);

  const abertas = (abertasRes?.data ?? []) as Array<{ valor: number | null; data_vencimento: string }>;
  const totalAbertas = abertas.reduce((s, a) => s + Number(a.valor ?? 0), 0);
  const vencidas = abertas.filter((a) => String(a.data_vencimento).slice(0, 10) < hoje);

  const dSemana = despSemana.reduce((s, x) => s + valorDe(x), 0);
  const dMes = despMes.reduce((s, x) => s + valorDe(x), 0);
  const resSemana = recSemana - dSemana;
  const resMes = recMes - dMes;

  const agora = new Date().toLocaleString("pt-BR", {
    timeZone: "America/Fortaleza",
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });

  return (
    `💰 *STATUS FINANCEIRO*\n_${label} • Atualizado: ${agora}_\n\n` +
    `${SEP}\n\n📅 *PERÍODO SELECIONADO*\n` +
    bloco(
      [
        ["Receitas recebidas", moeda(recSemana)],
        ["Despesas pagas", moeda(dSemana)],
        ["──────────────────", "───────────"],
        ["Resultado", `${moeda(resSemana)} ${resSemana >= 0 ? "✓" : "✗"}`],
      ],
      [1],
    ) +
    `\n${SEP}\n\n📋 *PENDÊNCIAS*\n` +
    bloco(
      [
        ["Despesas em aberto", String(abertas.length)],
        ["Valor total pendente", moeda(totalAbertas)],
        ["Despesas vencidas", `${vencidas.length}${vencidas.length ? " ⚠️" : ""}`],
      ],
      [1],
    ) +
    `\n${SEP}\n\n📈 *ESTE MÊS*\n` +
    bloco(
      [
        ["Receitas", moeda(recMes)],
        ["Despesas", moeda(dMes)],
        ["Resultado", moeda(resMes)],
        ["Margem", recMes ? pct(resMes, recMes) : "—"],
      ],
      [1],
    ) +
    `\n${RODAPE}`
  );
}

// ── /pendentes ────────────────────────────────────────────────────────────
export async function relatorioPendentes(supabase: any, periodo?: Periodo): Promise<string> {
  const { inicio, fim, label } = periodo ?? periodoPadrao();
  const hoje = d(new Date());
  const [{ data }, fornecedores] = await Promise.all([
    supabase
      .from("fin_despesas")
      .select("valor, data_vencimento, fornecedor_id")
      .eq("status", "aberto")
      .gte("data_vencimento", inicio)
      .lte("data_vencimento", fim)
      .order("data_vencimento"),
    mapaFornecedores(supabase),
  ]);

  const cab = `📋 *DESPESAS PENDENTES*\n_${label}: ${br(inicio)} a ${br(fim)}_\n\n${SEP}\n\n`;

  const lista = (data ?? []) as Array<{ valor: number | null; data_vencimento: string; fornecedor_id: string | null }>;
  if (!lista.length) {
    return `${cab}✅ Nenhuma despesa pendente no período.\n\n${RODAPE}`;
  }

  const nome = (id: string | null) => (id ? fornecedores.get(id) ?? "—" : "Sem fornecedor");
  const emAberto = lista.filter((l) => String(l.data_vencimento).slice(0, 10) >= hoje);
  const vencidas = lista.filter((l) => String(l.data_vencimento).slice(0, 10) < hoje);

  const totalPendente = lista.reduce((s, l) => s + Number(l.valor ?? 0), 0);
  const totalVencido = vencidas.reduce((s, l) => s + Number(l.valor ?? 0), 0);
  const totalAberto = totalPendente - totalVencido;

  let msg = cab;

  if (vencidas.length) {
    msg +=
      `🔴 *VENCIDAS*\n` +
      tabela(
        ["Fornecedor", "Valor", "Venceu"],
        vencidas.slice(0, 15).map((l) => [
          nome(l.fornecedor_id).slice(0, 22),
          moeda(Number(l.valor ?? 0)),
          `${br(l.data_vencimento, true)} ⚠️`,
        ]),
        [1],
      ) +
      `\n\n${SEP}\n\n`;
  }

  if (emAberto.length) {
    msg +=
      `🟡 *EM ABERTO*\n` +
      tabela(
        ["Fornecedor", "Valor", "Vence"],
        emAberto.slice(0, 15).map((l) => [
          nome(l.fornecedor_id).slice(0, 22),
          moeda(Number(l.valor ?? 0)),
          br(l.data_vencimento, true),
        ]),
        [1],
      ) +
      `\n\n${SEP}\n\n`;
  }

  if (totalVencido) msg += `⚠️ Vencido: *${moeda(totalVencido)}*\n`;
  if (totalAberto) msg += `🟡 A vencer: *${moeda(totalAberto)}*\n`;
  msg += `💸 *Total pendente: ${moeda(totalPendente)}*\n\n${RODAPE}`;

  return msg;

}
