// ─── Constantes do módulo Despesas ────────────────────────────────────────

import type { DespesaFiltros, DespesaWizardState, RecorrenciaPeriodo } from "./types";

export const WIZARD_STEPS = [
  { numero: 1, label: "Dados" },
  { numero: 2, label: "Classificação" },
  { numero: 3, label: "Recorrência" },
  { numero: 4, label: "Revisão" },
] as const;

export const PERIODOS_RECORRENCIA: { value: RecorrenciaPeriodo; label: string }[] = [
  { value: "semanal", label: "Semanal" },
  { value: "quinzenal", label: "Quinzenal" },
  { value: "mensal", label: "Mensal" },
  { value: "bimestral", label: "Bimestral" },
  { value: "trimestral", label: "Trimestral" },
  { value: "semestral", label: "Semestral" },
  { value: "anual", label: "Anual" },
];

export const DESPESAS_ANEXOS_BUCKET = "financeiro-anexos";

export function emptyDespesaWizard(hoje: string): DespesaWizardState {
  return {
    valor: "",
    data_emissao: hoje,
    data_vencimento: hoje,
    codigo_barras: "",
    fornecedor_id: "",
    plano_conta_id: "",
    forma_pagamento_id: "",
    conta_financeira_id: "",
    ratear: false,
    rateios: [],
    recorrente: false,
    periodo: "mensal",
    vezes: 2,
    parcelas: [],
    descricao: "",
  };
}

export const emptyFornecedorRapido = {
  nome_fantasia: "",
  cnpj_cpf: "",
  telefone: "",
};

// ─── Lista / filtros ──────────────────────────────────────────────────────

export const ITEMS_PER_PAGE = 15;
export const FILTRO_TODOS = "__todos__";

export const STATUS_DESPESA = [
  { value: "aberto", label: "Em aberto" },
  { value: "pago", label: "Pago" },
  { value: "cancelado", label: "Cancelado" },
];

export const emptyDespesaFiltros: DespesaFiltros = {
  busca: "",
  base_data: "vencimento",
  data_inicio: "",
  data_fim: "",
  fornecedor_id: FILTRO_TODOS,
  centro_custo_id: FILTRO_TODOS,
  plano_conta_id: FILTRO_TODOS,
  forma_pagamento_id: FILTRO_TODOS,
  status: FILTRO_TODOS,
};
