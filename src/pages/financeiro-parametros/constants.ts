// ─── Constantes do módulo Parâmetros Financeiros ──────────────────────────

import type {
  PlanoContaFormState,
  CentroCustoFormState,
  FormaPagamentoFormState,
  ContaFinanceiraFormState,
} from "./types";

export const TIPOS_PLANO_CONTA = [
  { value: "receita", label: "Receita" },
  { value: "despesa", label: "Despesa" },
] as const;

export const TIPOS_FORMA_PAGAMENTO = [
  { value: "Dinheiro", label: "Dinheiro" },
  { value: "Pix", label: "Pix" },
  { value: "Boleto", label: "Boleto" },
  { value: "Cartão de Crédito", label: "Cartão de Crédito" },
  { value: "Cartão de Débito", label: "Cartão de Débito" },
  { value: "Transferência", label: "Transferência" },
  { value: "Outros", label: "Outros" },
] as const;

export const TIPOS_CONTA_FINANCEIRA = [
  { value: "Caixa", label: "Caixa" },
  { value: "Banco", label: "Conta Bancária" },
  { value: "Poupança", label: "Poupança" },
  { value: "Cartão de Crédito", label: "Cartão de Crédito" },
  { value: "Aplicação", label: "Aplicação" },
  { value: "Outros", label: "Outros" },
] as const;

export const NO_PARENT = "__root__";
export const NO_FILIAL = "__none__";

export const emptyPlanoContaForm: PlanoContaFormState = {
  parent_id: NO_PARENT,
  codigo: "",
  nome: "",
  tipo: "despesa",
  aceita_lancamento: true,
  nao_valoriza_dre: false,
  ativo: true,
};

export const emptyCentroCustoForm: CentroCustoFormState = {
  codigo: "",
  nome: "",
  descricao: "",
  filial_id: NO_FILIAL,
  ativo: true,
};

export const emptyFormaPagamentoForm: FormaPagamentoFormState = {
  nome: "",
  tipo: "Outros",
  exige_conta: false,
  ativo: true,
};

export const emptyContaFinanceiraForm: ContaFinanceiraFormState = {
  nome: "",
  tipo: "Banco",
  banco: "",
  agencia: "",
  numero_conta: "",
  saldo_inicial: "0",
  filial_id: NO_FILIAL,
  ativo: true,
};
