// ─── Pure helpers for Faturamento module ──────────────────────────────────

import { isBefore, parseISO, startOfDay } from "date-fns";
import type { Fatura, FaturaFormState, NotaFiscalFormState } from "./types";
import { STATUS_FATURA } from "./constants";

export function fmtCurrency(val: number): string {
  return val.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

export function isVencida(f: Fatura): boolean {
  return f.status === "Pendente" && isBefore(parseISO(f.data_vencimento), startOfDay(new Date()));
}

export function getStatusFaturaColor(status: string): string {
  const s = STATUS_FATURA.find(s => s.value === status);
  return s?.color || "bg-muted text-muted-foreground";
}

// ─── Validation ───────────────────────────────────────────────────────────

export function validateFaturaForm(form: FaturaFormState): string | null {
  if (!form.cliente_id) return "Selecione um cliente";
  if (!form.valor || Number(form.valor) <= 0) return "Informe o valor";
  if (!form.data_vencimento) return "Informe a data de vencimento";
  return null;
}

export function validateNotaFiscalForm(form: NotaFiscalFormState): string | null {
  if (!form.cliente_id) return "Selecione um cliente";
  if (!form.numero_nf.trim()) return "Informe o número da NF";
  if (!form.valor || Number(form.valor) <= 0) return "Informe o valor";
  return null;
}

// ─── Payload builders ─────────────────────────────────────────────────────

export function buildFaturaPayload(form: FaturaFormState, filialId: string | null) {
  const valor = Number(form.valor);
  const desconto = Number(form.valor_desconto) || 0;
  return {
    cliente_id: form.cliente_id,
    contrato_id: form.contrato_id || null,
    filial_id: filialId,
    valor,
    valor_desconto: desconto,
    valor_final: valor - desconto,
    data_vencimento: form.data_vencimento,
    tipo: form.tipo,
    forma_pagamento: form.forma_pagamento || null,
    referencia_mes: form.referencia_mes ? Number(form.referencia_mes) : null,
    referencia_ano: form.referencia_ano ? Number(form.referencia_ano) : null,
    observacoes: form.observacoes.trim() || null,
  };
}

export function buildNotaFiscalPayload(form: NotaFiscalFormState, filialId: string | null) {
  return {
    cliente_id: form.cliente_id,
    fatura_id: form.fatura_id || null,
    filial_id: filialId,
    numero_nf: form.numero_nf.trim(),
    serie: form.serie || "1",
    valor: Number(form.valor),
    data_emissao: form.data_emissao,
    observacoes: form.observacoes.trim() || null,
  };
}

// ─── Form population from existing records ────────────────────────────────

export function faturaToFormState(f: Fatura): FaturaFormState {
  return {
    cliente_id: f.cliente_id,
    contrato_id: f.contrato_id || "",
    valor: String(f.valor),
    valor_desconto: String(f.valor_desconto),
    data_vencimento: f.data_vencimento,
    tipo: f.tipo,
    forma_pagamento: f.forma_pagamento || "",
    referencia_mes: f.referencia_mes ? String(f.referencia_mes) : "",
    referencia_ano: f.referencia_ano ? String(f.referencia_ano) : "",
    observacoes: f.observacoes || "",
  };
}
