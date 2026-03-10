// ─── Constants for Faturamento module ─────────────────────────────────────

import type { FaturaFormState, NotaFiscalFormState } from "./types";
import { format } from "date-fns";

export const STATUS_FATURA = [
  { value: "Pendente", label: "Pendente", color: "bg-amber-100 text-amber-700 border-amber-200 dark:bg-amber-900/30 dark:text-amber-400 dark:border-amber-800" },
  { value: "Pago", label: "Pago", color: "bg-emerald-100 text-emerald-700 border-emerald-200 dark:bg-emerald-900/30 dark:text-emerald-400 dark:border-emerald-800" },
  { value: "Vencido", label: "Vencido", color: "bg-red-100 text-red-700 border-red-200 dark:bg-red-900/30 dark:text-red-400 dark:border-red-800" },
  { value: "Cancelado", label: "Cancelado", color: "bg-muted text-muted-foreground border-border" },
] as const;

export const TIPOS_FATURA = [
  { value: "Mensalidade", label: "Mensalidade" },
  { value: "Implantação", label: "Implantação" },
  { value: "Serviço", label: "Serviço" },
  { value: "Avulsa", label: "Avulsa" },
] as const;

export const FORMAS_PAGAMENTO = [
  { value: "Boleto", label: "Boleto" },
  { value: "Pix", label: "Pix" },
  { value: "Cartão de Crédito", label: "Cartão de Crédito" },
  { value: "Cartão de Débito", label: "Cartão de Débito" },
  { value: "Transferência", label: "Transferência" },
  { value: "Dinheiro", label: "Dinheiro" },
] as const;

export const PAGE_SIZE = 15;

export const emptyFaturaForm: FaturaFormState = {
  cliente_id: "",
  contrato_id: "",
  valor: "",
  valor_desconto: "0",
  data_vencimento: "",
  tipo: "Mensalidade",
  forma_pagamento: "",
  referencia_mes: "",
  referencia_ano: "",
  observacoes: "",
};

export function newFaturaFormDefaults(): FaturaFormState {
  return {
    ...emptyFaturaForm,
    referencia_mes: String(new Date().getMonth() + 1),
    referencia_ano: String(new Date().getFullYear()),
  };
}

export function newNotaFiscalFormDefaults(): NotaFiscalFormState {
  return {
    cliente_id: "",
    fatura_id: "",
    numero_nf: "",
    serie: "1",
    valor: "",
    data_emissao: format(new Date(), "yyyy-MM-dd"),
    observacoes: "",
  };
}
