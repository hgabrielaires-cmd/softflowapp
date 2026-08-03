// ─── Types do módulo Contas Financeiras / Livro Caixa ─────────────────────

export type MovimentacaoTipo = "entrada" | "saida" | "transferencia";

export interface Movimentacao {
  id: string;
  conta_financeira_id: string;
  filial_id: string | null;
  tipo: MovimentacaoTipo;
  valor: number;
  data_movimentacao: string;
  descricao: string | null;
  categoria: string | null;
  plano_conta_id: string | null;
  origem: string | null;
  origem_id: string | null;
  conta_destino_id: string | null;
  anexo_url: string | null;
  observacao: string | null;
  created_by: string | null;
  created_at: string;
  updated_at: string;
}

/** Linha do extrato com saldo acumulado calculado no cliente. */
export interface ExtratoLinha extends Movimentacao {
  /** Valor com sinal aplicado do ponto de vista da conta filtrada. */
  efeito: number;
  saldoAcumulado: number;
}

export interface ContaResumo {
  id: string;
  nome: string;
  tipo: string;
  banco: string | null;
  saldo: number;
  entradasMes: number;
  saidasMes: number;
}

export interface MovimentacaoFormState {
  tipo: MovimentacaoTipo;
  conta_financeira_id: string;
  conta_destino_id: string;
  data_movimentacao: string;
  valor: string;
  descricao: string;
  plano_conta_id: string;
  categoria: string;
  observacao: string;
}

export interface ExtratoFiltros {
  conta_id: string;
  filial_id: string;
  data_inicio: string;
  data_fim: string;
  tipo: string;
}
