// ─── Constantes do módulo Contas Financeiras / Livro Caixa ────────────────

import type { MovimentacaoFormState, MovimentacaoTipo } from "./types";

export const TODAS = "__all__";
export const NENHUM = "__none__";

export const TIPOS_MOVIMENTACAO: { value: MovimentacaoTipo; label: string; icon: string }[] = [
  { value: "entrada", label: "Entrada", icon: "↑" },
  { value: "saida", label: "Saída", icon: "↓" },
  { value: "transferencia", label: "Transferência", icon: "⇄" },
];

export const CATEGORIAS_ENTRADA = [
  { value: "receita_cliente", label: "Receita de cliente" },
  { value: "ajuste", label: "Ajuste de saldo" },
  { value: "outros", label: "Outros" },
];

export const CATEGORIAS_SAIDA = [
  { value: "fornecedor", label: "Fornecedor" },
  { value: "imposto", label: "Imposto" },
  { value: "salario", label: "Salário" },
  { value: "outros", label: "Outros" },
];

export const ORIGEM_LABELS: Record<string, string> = {
  manual: "Manual",
  telegram: "Telegram",
  despesa: "Despesa",
  asaas: "Asaas",
};

/** Origens geradas automaticamente — edição restrita. */
export const ORIGENS_AUTOMATICAS = ["telegram", "despesa", "asaas"];

export function hojeISO(): string {
  return new Date().toISOString().slice(0, 10);
}

export const emptyMovimentacaoForm: MovimentacaoFormState = {
  tipo: "entrada",
  conta_financeira_id: "",
  conta_destino_id: "",
  data_movimentacao: hojeISO(),
  valor: "",
  descricao: "",
  plano_conta_id: NENHUM,
  categoria: "outros",
  observacao: "",
};
