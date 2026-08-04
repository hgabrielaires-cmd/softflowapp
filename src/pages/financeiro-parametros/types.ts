// ─── Types do módulo Parâmetros Financeiros ───────────────────────────────

export interface PlanoConta {
  id: string;
  parent_id: string | null;
  codigo: string;
  nome: string;
  tipo: "receita" | "despesa";
  nivel: number;
  aceita_lancamento: boolean;
  nao_valoriza_dre: boolean;
  ordem: number;
  ativo: boolean;
  created_at: string;
  updated_at: string;
}

export interface CentroCusto {
  id: string;
  codigo: string | null;
  nome: string;
  descricao: string | null;
  filial_id: string | null;
  ativo: boolean;
  created_at: string;
  updated_at: string;
}

export interface FormaPagamento {
  id: string;
  nome: string;
  tipo: string;
  exige_conta: boolean;
  ordem: number;
  ativo: boolean;
  created_at: string;
  updated_at: string;
}

export interface ContaFinanceira {
  id: string;
  nome: string;
  tipo: string;
  banco: string | null;
  agencia: string | null;
  numero_conta: string | null;
  saldo_inicial: number;
  filial_id: string | null;
  ativo: boolean;
  created_at: string;
  updated_at: string;
}

export interface PlanoContaFormState {
  parent_id: string;
  codigo: string;
  nome: string;
  tipo: "receita" | "despesa";
  aceita_lancamento: boolean;
  nao_valoriza_dre: boolean;
  ativo: boolean;
}

export interface CentroCustoFormState {
  codigo: string;
  nome: string;
  descricao: string;
  filial_id: string;
  ativo: boolean;
}

export interface FormaPagamentoFormState {
  nome: string;
  tipo: string;
  exige_conta: boolean;
  ativo: boolean;
}

export interface ContaFinanceiraFormState {
  nome: string;
  tipo: string;
  banco: string;
  agencia: string;
  numero_conta: string;
  saldo_inicial: string;
  filial_id: string;
  ativo: boolean;
}

export interface PlanoContaNode extends PlanoConta {
  children: PlanoContaNode[];
}
