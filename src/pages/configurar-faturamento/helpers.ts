// ─── Pure helpers for Configurar Faturamento ──────────────────────────────

import type { ConfigFaturamentoForm, FaturaPreviewMes, FaturaPreviewItem } from "./types";
import { getMesLabel } from "./constants";

export function fmtCurrency(val: number): string {
  return val.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

/** Calcula o preview das próximas faturas (até 6 meses ou estabilizar). */
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

    result.push({
      mes,
      ano,
      label: getMesLabel(mes, ano),
      itens,
      total,
    });

    // Avançar mês
    mes++;
    if (mes > 12) { mes = 1; ano++; }
  }

  // Cortar quando estabilizar (2 meses seguidos com mesmo total)
  for (let i = 3; i < result.length - 1; i++) {
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
