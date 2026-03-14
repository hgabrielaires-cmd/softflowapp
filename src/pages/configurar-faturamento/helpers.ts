// ─── Pure helpers for Configurar Faturamento ──────────────────────────────

import type { ConfigFaturamentoForm, FaturaPreviewMes, FaturaPreviewItem, ContratoFinanceiroBase, ContratoEspelho } from "./types";
import { getMesLabel } from "./constants";

export function fmtCurrency(val: number | null | undefined): string {
  return (val ?? 0).toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

/** Formats a number as currency string for input display (e.g. "1.234,56") */
export function formatCurrencyInput(val: number | null | undefined): string {
  if (!val && val !== 0) return "";
  if (val === 0) return "";
  return val.toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

/** Parses a Brazilian currency input string back to number */
export function parseCurrencyInput(raw: string): number {
  const cleaned = raw.replace(/[^\d,]/g, "").replace(",", ".");
  const num = parseFloat(cleaned);
  return isNaN(num) ? 0 : num;
}

/** Calcula o preview das próximas faturas para CONTRATO NOVO. */
export function calcularPreviewFaturas(form: ConfigFaturamentoForm, planoNome: string): FaturaPreviewMes[] {
  const result: FaturaPreviewMes[] = [];
  const maxMeses = Math.max(form.parcelas_implantacao + 1, 6);

  let mes = form.mes_inicio;
  let ano = form.ano_inicio;

  for (let i = 0; i < maxMeses; i++) {
    const itens: FaturaPreviewItem[] = [];

    // Mensalidade
    if (form.valor_mensalidade > 0) {
      itens.push({
        descricao: `Mensalidade ${planoNome}`,
        valor: form.valor_mensalidade,
        tipo: "mensalidade",
      });
    }

    // Parcela de implantação
    if (form.valor_implantacao > 0 && i < form.parcelas_implantacao) {
      const valorParcela = Math.round((form.valor_implantacao / form.parcelas_implantacao) * 100) / 100;
      itens.push({
        descricao: `Implantação ${i + 1}/${form.parcelas_implantacao}`,
        valor: valorParcela,
        tipo: "implantacao",
      });
    }

    // Módulos
    for (const mod of form.modulos) {
      if (mod.valor_mensal > 0) {
        itens.push({
          descricao: mod.nome,
          valor: mod.valor_mensal,
          tipo: "modulo",
        });
      }
    }

    // OA (apenas no mês de referência)
    if (form.oa_valor > 0 && mes === form.oa_mes_referencia && ano === form.oa_ano_referencia) {
      itens.push({
        descricao: `OA: ${form.oa_descricao || "Ordem de Atendimento"}`,
        valor: form.oa_valor,
        tipo: "oa",
      });
    }

    const total = itens.reduce((sum, item) => sum + item.valor, 0);

    result.push({ mes, ano, label: getMesLabel(mes, ano), itens, total });

    mes++;
    if (mes > 12) { mes = 1; ano++; }
  }

  // Cortar quando estabilizar
  for (let i = 3; i < result.length - 1; i++) {
    if (result[i].total === result[i + 1].total && result[i].total === result[i - 1].total) {
      return result.slice(0, i + 1);
    }
  }

  return result;
}

/**
 * Calcula preview CONSOLIDADO para sub-registros (Upgrade, Módulo, OA).
 * Mostra a composição completa do boleto após a alteração, incluindo
 * itens já existentes no contrato base.
 */
export function calcularPreviewConsolidado(
  form: ConfigFaturamentoForm,
  base: ContratoFinanceiroBase,
  espelho: ContratoEspelho,
): FaturaPreviewMes[] {
  const result: FaturaPreviewMes[] = [];
  const tipoPedido = espelho.pedido?.tipo_pedido || "";
  const isUpgrade = tipoPedido === "Upgrade" || tipoPedido === "Downgrade";
  const isModulo = tipoPedido === "Módulo Adicional" || tipoPedido === "Aditivo";
  const isOA = espelho.tipo === "OA";

  // Determinar a nova mensalidade base
  const novaMensalidade = isUpgrade ? form.valor_mensalidade : base.valor_mensalidade;
  const planoNome = isUpgrade ? (espelho.plano?.nome || "Novo plano") : (base.plano_nome || "Plano");

  // Parcelas existentes pendentes do base
  const parcelasBase = base.parcelas_pendentes.map((p) => ({
    descricao: p.descricao,
    valor_por_parcela: p.valor_por_parcela,
    restantes: p.numero_parcelas - p.parcelas_pagas,
    total_parcelas: p.numero_parcelas,
    pagas: p.parcelas_pagas,
  }));

  // Nova parcela de implantação (do aditivo/upgrade)
  const novaParcela = form.valor_implantacao > 0 ? {
    descricao: `Implantação ${tipoPedido} ${espelho.plano?.nome || ""}`.trim(),
    valor_por_parcela: Math.round((form.valor_implantacao / form.parcelas_implantacao) * 100) / 100,
    restantes: form.parcelas_implantacao,
    total_parcelas: form.parcelas_implantacao,
    pagas: 0,
  } : null;

  // Módulos existentes no base
  const modulosBase = base.modulos_ativos.map((m) => ({
    nome: m.nome,
    valor_mensal: m.valor_mensal,
  }));

  // Novos módulos do pedido
  const novosModulos = isModulo ? form.modulos.map((m) => ({
    nome: m.nome,
    valor_mensal: m.valor_mensal,
  })) : [];

  // Calcular max meses para preview
  const maxParcelasExistentes = parcelasBase.reduce((max, p) => Math.max(max, p.restantes), 0);
  const maxParcelasNova = novaParcela?.restantes || 0;
  const maxMeses = Math.max(maxParcelasExistentes + 1, maxParcelasNova + 1, 4);

  const now = new Date();
  let mes = now.getDate() > 15 ? now.getMonth() + 2 : now.getMonth() + 1;
  let ano = now.getFullYear();
  if (mes > 12) { mes -= 12; ano++; }

  for (let i = 0; i < maxMeses; i++) {
    const itens: FaturaPreviewItem[] = [];

    // 1. Mensalidade base
    itens.push({
      descricao: `Mensalidade ${planoNome}`,
      valor: novaMensalidade,
      tipo: "mensalidade",
    });

    // 2. Parcelas existentes pendentes
    for (const p of parcelasBase) {
      if (i < p.restantes) {
        itens.push({
          descricao: `${p.descricao} ${p.pagas + i + 1}/${p.total_parcelas}`,
          valor: p.valor_por_parcela,
          tipo: "implantacao",
        });
      }
    }

    // 3. Nova parcela de implantação
    if (novaParcela && i < novaParcela.restantes) {
      itens.push({
        descricao: `${novaParcela.descricao} ${i + 1}/${novaParcela.total_parcelas}`,
        valor: novaParcela.valor_por_parcela,
        tipo: "implantacao",
      });
    }

    // 4. Módulos existentes
    for (const m of modulosBase) {
      itens.push({
        descricao: m.nome,
        valor: m.valor_mensal,
        tipo: "modulo",
      });
    }

    // 5. Novos módulos
    for (const m of novosModulos) {
      if (m.valor_mensal > 0) {
        itens.push({
          descricao: `${m.nome} (novo)`,
          valor: m.valor_mensal,
          tipo: "modulo",
        });
      }
    }

    // 6. OA (apenas no mês de referência)
    if (isOA && form.oa_valor > 0 && mes === form.oa_mes_referencia && ano === form.oa_ano_referencia) {
      itens.push({
        descricao: `OA: ${form.oa_descricao || "Ordem de Atendimento"}`,
        valor: form.oa_valor,
        tipo: "oa",
      });
    }

    const total = itens.reduce((sum, item) => sum + item.valor, 0);
    result.push({ mes, ano, label: getMesLabel(mes, ano), itens, total });

    mes++;
    if (mes > 12) { mes = 1; ano++; }
  }

  // Cortar quando estabilizar
  for (let i = 2; i < result.length - 1; i++) {
    if (result[i].total === result[i + 1].total && result[i].total === result[i - 1].total) {
      return result.slice(0, i + 1);
    }
  }

  return result;
}

export function validateConfigForm(form: ConfigFaturamentoForm, tipo: string): string | null {
  if (form.valor_mensalidade <= 0 && tipo !== "OA") return "Informe o valor da mensalidade";
  if (form.dia_vencimento < 1 || form.dia_vencimento > 28) return "Dia de vencimento deve ser entre 1 e 28";
  if (!form.forma_pagamento) return "Selecione a forma de pagamento";
  if (tipo === "OA" && form.oa_valor <= 0) return "Informe o valor da OA";
  return null;
}

export function getBadgeTipoLabel(tipo: string, tipoPedido?: string): string {
  if (tipo === "OA") return "Ordem de Atendimento";
  if (tipoPedido === "Upgrade") return "Upgrade";
  if (tipoPedido === "Downgrade") return "Downgrade";
  if (tipoPedido === "Módulo Adicional") return "Módulo Adicional";
  return "Contrato Inicial";
}

export function getBadgeTipoColor(label: string): string {
  const colors: Record<string, string> = {
    "Contrato Inicial": "bg-primary/10 text-primary border-primary/20",
    "Upgrade": "bg-violet-100 text-violet-800 border-violet-200 dark:bg-violet-900/30 dark:text-violet-400",
    "Downgrade": "bg-orange-100 text-orange-800 border-orange-200 dark:bg-orange-900/30 dark:text-orange-400",
    "Módulo Adicional": "bg-cyan-100 text-cyan-800 border-cyan-200 dark:bg-cyan-900/30 dark:text-cyan-400",
    "Ordem de Atendimento": "bg-blue-100 text-blue-800 border-blue-200 dark:bg-blue-900/30 dark:text-blue-400",
  };
  return colors[label] || colors["Contrato Inicial"];
}
