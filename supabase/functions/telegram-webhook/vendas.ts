// ─── Relatório de Vendas do bot Telegram ─────────────────────────────────
// Mesmo padrão visual dos relatórios financeiros (tabelas monoespaçadas).

const SEP = "━━━━━━━━━━━━━━━━━━━━━━━━━━━━";
const RODAPE = "_Atualizado agora_ 🕐";

export type PeriodoVendas = { inicio: string; fim: string; label: string };

function fmt(v: number) {
  return `R$ ${Number(v || 0).toLocaleString("pt-BR", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;
}

export async function relatorioVendas(
  supabase: any,
  filialId: string | null,
  periodo: PeriodoVendas,
): Promise<string> {
  const dataInicio = `${periodo.inicio}T00:00:00`;
  const dataFim = `${periodo.fim}T23:59:59`;

  let query = supabase
    .from("pedidos")
    .select(
      `id, tipo_pedido, created_at, valor_mensalidade_final, valor_implantacao_final,
       vendedor_id, filial_id, plano_id,
       clientes!pedidos_cliente_id_fkey(nome_fantasia),
       planos!pedidos_plano_id_fkey(nome),
       contratos!contratos_pedido_id_fkey(id, status, contratos_zapsign(status))`,
    )
    .gte("created_at", dataInicio)
    .lte("created_at", dataFim)
    .order("created_at", { ascending: false });

  if (filialId) query = query.eq("filial_id", filialId);

  const { data: pedidos, error } = await query;
  if (error) console.error("[telegram] vendas:", error.message);
  const todos = (pedidos ?? []) as any[];

  // Nome da filial
  let nomeFilial = "Todas as Filiais";
  if (filialId) {
    const { data: f } = await supabase
      .from("filiais")
      .select("nome")
      .eq("id", filialId)
      .maybeSingle();
    nomeFilial = f?.nome || "Filial";
  }

  // Vendedores (sem FK direta → busca por profiles)
  const vendedorIds = [...new Set(todos.map((p) => p.vendedor_id).filter(Boolean))];
  const nomesVendedor = new Map<string, string>();
  if (vendedorIds.length) {
    const { data: profs } = await supabase
      .from("profiles")
      .select("user_id, full_name")
      .in("user_id", vendedorIds);
    for (const p of profs ?? []) nomesVendedor.set(p.user_id, p.full_name || "—");
  }

  const zsStatus = (p: any) => {
    const contrato = Array.isArray(p.contratos) ? p.contratos[0] : p.contratos;
    const zap = contrato?.contratos_zapsign;
    return Array.isArray(zap) ? zap[0]?.status : zap?.status;
  };
  const contratoId = (p: any) => {
    const contrato = Array.isArray(p.contratos) ? p.contratos[0] : p.contratos;
    return contrato?.id ?? null;
  };

  const novos = todos.filter((p) => p.tipo_pedido === "Novo");
  const aditivos = todos.filter(
    (p) => p.tipo_pedido === "Aditivo" || p.tipo_pedido === "Upgrade",
  );
  const oas = todos.filter((p) => p.tipo_pedido === "OA");

  const assinados = todos.filter((p) => zsStatus(p) === "Assinado");
  const pendentesAssinatura = todos.filter((p) => zsStatus(p) === "Pendente");
  const semContrato = todos.filter((p) => !contratoId(p));

  const soma = (lista: any[], campo: string) =>
    lista.reduce((s, p) => s + Number(p[campo] || 0), 0);

  const totalMRR = soma(todos, "valor_mensalidade_final");
  const totalImpl = soma(todos, "valor_implantacao_final");
  const mrrNovos = soma(novos, "valor_mensalidade_final");
  const mrrAditivos = soma(aditivos, "valor_mensalidade_final");

  // Por plano
  const porPlano: Record<string, { qtd: number; mrr: number }> = {};
  for (const p of todos) {
    const plano = Array.isArray(p.planos) ? p.planos[0] : p.planos;
    const nome = plano?.nome || "Sem plano";
    if (!porPlano[nome]) porPlano[nome] = { qtd: 0, mrr: 0 };
    porPlano[nome].qtd++;
    porPlano[nome].mrr += Number(p.valor_mensalidade_final || 0);
  }
  const planosLista = Object.entries(porPlano).sort((a, b) => b[1].mrr - a[1].mrr);

  // Ranking vendedores
  const porVendedor: Record<string, { nome: string; qtd: number; mrr: number; impl: number }> = {};
  for (const p of todos) {
    const id = p.vendedor_id || "—";
    const nome = p.vendedor_id ? nomesVendedor.get(p.vendedor_id) || "—" : "Sem vendedor";
    if (!porVendedor[id]) porVendedor[id] = { nome, qtd: 0, mrr: 0, impl: 0 };
    porVendedor[id].qtd++;
    porVendedor[id].mrr += Number(p.valor_mensalidade_final || 0);
    porVendedor[id].impl += Number(p.valor_implantacao_final || 0);
  }
  const ranking = Object.values(porVendedor).sort((a, b) => b.mrr - a.mrr);

  const nomeCliente = (p: any, len: number) => {
    const c = Array.isArray(p.clientes) ? p.clientes[0] : p.clientes;
    return String(c?.nome_fantasia ?? "—").substring(0, len);
  };

  let msg =
    `🛒 *RELATÓRIO DE VENDAS*\n_${periodo.label}_\n🏢 ${nomeFilial}\n\n${SEP}\n\n`;

  msg += "📦 *RESUMO GERAL*\n```\n";
  msg += `Total de pedidos     ${String(todos.length).padStart(8)}\n`;
  msg += `Clientes novos       ${String(novos.length).padStart(8)}\n`;
  msg += `Upsell / Aditivos    ${String(aditivos.length).padStart(8)}\n`;
  msg += `OAs                  ${String(oas.length).padStart(8)}\n`;
  msg += `─────────────────────────────\n`;
  msg += `MRR gerado    ${fmt(totalMRR).padStart(15)}\n`;
  msg += `Implantação   ${fmt(totalImpl).padStart(15)}\n`;
  msg += `Total geral   ${fmt(totalMRR + totalImpl).padStart(15)}\n`;
  msg += "```\n\n" + SEP + "\n\n";

  msg += "📝 *STATUS DOS CONTRATOS*\n```\n";
  msg += `✅ Assinados         ${String(assinados.length).padStart(8)}\n`;
  msg += `⏳ Pend. assinatura  ${String(pendentesAssinatura.length).padStart(8)}\n`;
  msg += `📋 Sem contrato      ${String(semContrato.length).padStart(8)}\n`;
  msg += "```\n\n";

  if (pendentesAssinatura.length) {
    msg += "⏳ *Aguardando assinatura:*\n";
    for (const p of pendentesAssinatura.slice(0, 5)) {
      msg += `• ${nomeCliente(p, 22)} — ${fmt(p.valor_mensalidade_final || 0)}/mês\n`;
    }
    if (pendentesAssinatura.length > 5) {
      msg += `_+ ${pendentesAssinatura.length - 5} outros_\n`;
    }
    msg += "\n";
  }

  msg += SEP + "\n\n";

  msg += `🆕 *CLIENTES NOVOS (${novos.length})*\n\`\`\`\n`;
  msg += `MRR novo      ${fmt(mrrNovos).padStart(15)}\n`;
  if (novos.length) {
    msg += `─────────────────────────────\n`;
    for (const p of novos.slice(0, 5)) {
      msg += `${nomeCliente(p, 18).padEnd(19)}${fmt(p.valor_mensalidade_final || 0)}\n`;
    }
    if (novos.length > 5) msg += `+ ${novos.length - 5} outros...\n`;
  }
  msg += "```\n\n" + SEP + "\n\n";

  if (aditivos.length) {
    msg += `📈 *UPSELL / ADITIVOS (${aditivos.length})*\n\`\`\`\n`;
    msg += `MRR aditivos  ${fmt(mrrAditivos).padStart(15)}\n`;
    msg += `─────────────────────────────\n`;
    for (const p of aditivos.slice(0, 5)) {
      const tipo = String(p.tipo_pedido ?? "").substring(0, 7);
      msg += `${nomeCliente(p, 16).padEnd(17)}${tipo.padEnd(8)}${fmt(p.valor_mensalidade_final || 0)}\n`;
    }
    msg += "```\n\n" + SEP + "\n\n";
  }

  if (planosLista.length) {
    msg += "📋 *VENDAS POR PLANO*\n```\n";
    msg += `Plano              Qtd  MRR\n`;
    msg += `─────────────────────────────\n`;
    for (const [plano, dd] of planosLista) {
      const pct = totalMRR > 0 ? ((dd.mrr / totalMRR) * 100).toFixed(0) : "0";
      msg += `${plano.substring(0, 16).padEnd(17)}${String(dd.qtd).padEnd(5)}${fmt(dd.mrr)} ${pct}%\n`;
    }
    msg += "```\n\n" + SEP + "\n\n";
  }

  if (ranking.length) {
    msg += "🏆 *RANKING DE VENDEDORES*\n```\n";
    msg += `   Vendedor         Qtd  MRR\n`;
    msg += `─────────────────────────────\n`;
    ranking.forEach((v, i) => {
      const medal = i === 0 ? "🥇" : i === 1 ? "🥈" : i === 2 ? "🥉" : `${i + 1}°`;
      msg += `${medal} ${v.nome.substring(0, 13).padEnd(14)}${String(v.qtd).padEnd(5)}${fmt(v.mrr)}\n`;
    });
    msg += "```\n\n";
  }

  if (!todos.length) msg += "📭 *Nenhuma venda no período.*\n\n";

  msg += RODAPE;
  return msg;
}
