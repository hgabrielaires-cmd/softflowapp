// ─── Types do módulo Despesas ─────────────────────────────────────────────

export type RecorrenciaPeriodo =
  | "semanal"
  | "quinzenal"
  | "mensal"
  | "bimestral"
  | "trimestral"
  | "semestral"
  | "anual";

export interface RateioLinha {
  centro_custo_id: string;
  percentual: number;
}

export interface ParcelaPreview {
  numero: number;
  data_vencimento: string;
  valor: number;
}

export interface DespesaWizardState {
  valor: string;
  data_emissao: string;
  data_vencimento: string;
  codigo_barras: string;
  fornecedor_id: string;
  plano_conta_id: string;
  forma_pagamento_id: string;
  conta_financeira_id: string;
  ratear: boolean;
  rateios: RateioLinha[];
  recorrente: boolean;
  periodo: RecorrenciaPeriodo;
  vezes: number;
  parcelas: ParcelaPreview[];
  descricao: string;
}

export interface FornecedorOption {
  id: string;
  nome_fantasia: string;
  razao_social: string | null;
  cnpj_cpf: string;
}

export interface FornecedorRapidoForm {
  nome_fantasia: string;
  cnpj_cpf: string;
  telefone: string;
}

export interface DespesaRegistro {
  id: string;
  grupo_id: string;
  fornecedor_id: string;
  plano_conta_id: string;
  forma_pagamento_id: string;
  conta_financeira_id: string;
  valor: number;
  data_emissao: string;
  data_vencimento: string;
  descricao: string | null;
  status: string;
  parcela_numero: number;
  parcela_total: number;
  created_at: string;
  fornecedores?: { nome_fantasia: string } | null;
  fin_despesa_rateios?: { centro_custo_id: string }[] | null;
}

export interface DespesaFiltros {
  busca: string;
  base_data: "vencimento" | "emissao";
  data_inicio: string;
  data_fim: string;
  fornecedor_id: string;
  centro_custo_id: string;
  plano_conta_id: string;
  forma_pagamento_id: string;
  status: string;
}

export type EscopoParcelas = "parcela" | "futuras";

export interface DespesaEditState {
  fornecedor_id: string;
  plano_conta_id: string;
  forma_pagamento_id: string;
  conta_financeira_id: string;
  valor: string;
  data_emissao: string;
  data_vencimento: string;
  descricao: string;
  status: string;
}

// ─── Auditoria (audit_logs / entity_type = fin_despesas) ──────────────────

export type AuditoriaAcao = "despesa_created" | "despesa_updated" | "despesa_deleted";

export interface AuditoriaDespesaRegistro {
  id: string;
  created_at: string;
  user_id: string | null;
  action: string;
  entity_id: string | null;
  details: Record<string, unknown> | null;
}

export interface AuditoriaFiltros {
  data_inicio: string;
  data_fim: string;
  user_id: string;
  acao: string;
}
