// ─── Types for Clientes module ──────────────────────────────────────────

export interface ClienteContato {
  id: string;
  cliente_id: string;
  nome: string;
  cargo: string | null;
  telefone: string | null;
  email: string | null;
  decisor: boolean;
  ativo: boolean;
  created_at: string;
}

export interface PedidoHistorico {
  id: string;
  tipo_pedido: string;
  status_pedido: string;
  financeiro_status: string;
  valor_implantacao_final: number;
  valor_mensalidade_final: number;
  valor_total: number;
  created_at: string;
  plano_id: string;
  contrato_id: string | null;
  planos?: { nome: string } | null;
  modulos_adicionais?: any[];
}

export interface RentabilidadeConsolidada {
  receitaMensal: number;
  custoMensal: number;
  lucro: number;
  margem: number;
  markup: number;
}

export interface ContatoFormState {
  nome: string;
  cargo: string;
  telefone: string;
  email: string;
  decisor: boolean;
  ativo: boolean;
}

export interface ClienteFormState {
  nome_fantasia: string;
  razao_social: string;
  apelido: string;
  cnpj_cpf: string;
  inscricao_estadual: string;
  ie_isento: boolean;
  responsavel_nome: string;
  contato_nome: string;
  telefone: string;
  email: string;
  cidade: string;
  uf: string;
  cep: string;
  logradouro: string;
  numero: string;
  complemento: string;
  bairro: string;
  filial_id: string;
  ativo: boolean;
}
