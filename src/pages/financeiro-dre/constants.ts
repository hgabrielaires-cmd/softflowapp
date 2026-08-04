// ─── Constantes do módulo DRE ─────────────────────────────────────────────

import type { PeriodoKey } from "./types";

export const TODAS = "__all__";

export const PERIODOS: { key: PeriodoKey; label: string }[] = [
  { key: "hoje", label: "Hoje" },
  { key: "semana", label: "Semana" },
  { key: "mes", label: "Mês" },
  { key: "mes_passado", label: "Mês ant." },
  { key: "custom", label: "Custom" },
];

export const ORIGEM_RECEITA_LABELS: Record<string, string> = {
  contaazul: "Recebimentos Conta Azul",
  manual: "Entradas manuais",
  asaas: "Recebimentos Asaas",
  telegram: "Entradas via Telegram",
  fatura: "Faturas",
};

export const ORIGEM_DESPESA_LABELS: Record<string, string> = {
  despesa: "Despesa cadastrada",
  manual: "Lançamento manual",
  telegram: "Lançamento via Telegram",
  taxa_boleto_contaazul: "Taxa de boleto Conta Azul",
  contaazul: "Conta Azul",
};

export const SEM_CATEGORIA_ID = "__sem_categoria__";
