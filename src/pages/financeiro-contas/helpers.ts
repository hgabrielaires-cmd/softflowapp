// ─── Helpers puros do módulo Contas Financeiras / Livro Caixa ─────────────

import { NENHUM, ORIGENS_AUTOMATICAS } from "./constants";
import type { ExtratoLinha, Movimentacao, MovimentacaoFormState } from "./types";

export function fmtCurrency(val: number): string {
  return val.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

export function fmtDate(iso: string): string {
  const [y, m, d] = String(iso).slice(0, 10).split("-");
  return `${d}/${m}/${y}`;
}

export function parseValor(v: string): number {
  const limpo = String(v).replace(/\s|R\$/g, "").replace(/\./g, "").replace(",", ".");
  const n = Number(limpo);
  return Number.isFinite(n) ? n : 0;
}

export function isAutomatica(m: Pick<Movimentacao, "origem">): boolean {
  return ORIGENS_AUTOMATICAS.includes(String(m.origem ?? ""));
}

/** Efeito da movimentação sobre a conta em análise (positivo entra, negativo sai). */
export function efeitoNaConta(m: Movimentacao, contaId: string | null): number {
  const valor = Number(m.valor ?? 0);
  if (m.tipo === "entrada") return valor;
  if (m.tipo === "saida") return -valor;
  // transferência
  if (contaId && m.conta_destino_id === contaId) return valor;
  if (contaId && m.conta_financeira_id === contaId) return -valor;
  return 0;
}

/**
 * Monta o extrato em ordem cronológica com saldo acumulado linha a linha.
 * `saldoAnterior` é o saldo da conta antes da primeira linha exibida.
 */
export function montarExtrato(
  movs: Movimentacao[],
  contaId: string | null,
  saldoAnterior: number,
): ExtratoLinha[] {
  let saldo = saldoAnterior;
  return movs.map((m) => {
    const efeito = contaId ? efeitoNaConta(m, contaId) : m.tipo === "saida" ? -Number(m.valor) : Number(m.valor);
    saldo += efeito;
    return { ...m, efeito, saldoAcumulado: saldo };
  });
}

export function validateMovimentacaoForm(f: MovimentacaoFormState): string | null {
  if (!f.conta_financeira_id) return "Selecione a conta financeira";
  if (f.tipo === "transferencia") {
    if (!f.conta_destino_id) return "Selecione a conta de destino";
    if (f.conta_destino_id === f.conta_financeira_id) return "Conta de destino deve ser diferente da origem";
  }
  if (!f.data_movimentacao) return "Informe a data";
  if (parseValor(f.valor) <= 0) return "Informe um valor maior que zero";
  if (!f.descricao.trim()) return "Informe a descrição";
  return null;
}

export function buildMovimentacaoPayload(f: MovimentacaoFormState, filialId: string | null) {
  return {
    conta_financeira_id: f.conta_financeira_id,
    conta_destino_id: f.tipo === "transferencia" ? f.conta_destino_id : null,
    filial_id: filialId,
    tipo: f.tipo,
    valor: parseValor(f.valor),
    data_movimentacao: f.data_movimentacao,
    descricao: f.descricao.trim(),
    categoria: f.tipo === "transferencia" ? "transferencia" : f.categoria,
    plano_conta_id: f.plano_conta_id === NENHUM ? null : f.plano_conta_id,
    observacao: f.observacao.trim() || null,
  };
}

export function movimentacaoToForm(m: Movimentacao): MovimentacaoFormState {
  return {
    tipo: m.tipo,
    conta_financeira_id: m.conta_financeira_id,
    conta_destino_id: m.conta_destino_id || "",
    data_movimentacao: String(m.data_movimentacao).slice(0, 10),
    valor: String(Number(m.valor ?? 0).toFixed(2)).replace(".", ","),
    descricao: m.descricao || "",
    plano_conta_id: m.plano_conta_id || NENHUM,
    categoria: m.categoria || "outros",
    observacao: m.observacao || "",
  };
}
