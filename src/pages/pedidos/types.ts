// ─── Types for Pedidos module ─────────────────────────────────────────────

export interface ModuloOpcional {
  id: string;
  nome: string;
  valor_implantacao_modulo: number | null;
  valor_mensalidade_modulo: number | null;
  incluso_no_plano: boolean;
  permite_revenda: boolean;
  quantidade_maxima: number | null;
}

export interface ModuloAdicionadoItem {
  modulo_id: string;
  nome: string;
  quantidade: number;
  valor_implantacao_modulo: number;
  valor_mensalidade_modulo: number;
}

export interface ServicoAdicionadoItem {
  servico_id: string;
  nome: string;
  quantidade: number;
  valor_unitario: number;
  unidade_medida: string;
}

export interface PedidoWithJoins {
  id: string;
  cliente_id: string;
  plano_id: string;
  filial_id: string;
  vendedor_id: string;
  valor_implantacao: number;
  valor_mensalidade: number;
  valor_total: number;
  comissao_percentual: number;
  comissao_valor: number;
  status_pedido: string;
  observacoes: string | null;
  created_at: string;
  updated_at: string;
  financeiro_status?: string;
  financeiro_motivo?: string | null;
  contrato_liberado?: boolean;
  valor_implantacao_original?: number;
  valor_mensalidade_original?: number;
  desconto_implantacao_tipo?: string;
  desconto_implantacao_valor?: number;
  valor_implantacao_final?: number;
  desconto_mensalidade_tipo?: string;
  desconto_mensalidade_valor?: number;
  valor_mensalidade_final?: number;
  acrescimo_implantacao_tipo?: string;
  acrescimo_implantacao_valor?: number;
  acrescimo_mensalidade_tipo?: string;
  acrescimo_mensalidade_valor?: number;
  modulos_adicionais?: ModuloAdicionadoItem[];
  tipo_pedido?: string;
  contrato_id?: string | null;
  servicos_pedido?: ServicoAdicionadoItem[] | null;
  tipo_atendimento?: string | null;
  numero_exibicao?: string;
  motivo_desconto?: string | null;
  comissao_implantacao_percentual?: number;
  comissao_implantacao_valor?: number;
  comissao_mensalidade_percentual?: number;
  comissao_mensalidade_valor?: number;
  comissao_servico_percentual?: number;
  comissao_servico_valor?: number;
  pagamento_mensalidade_forma?: string | null;
  pagamento_mensalidade_parcelas?: number | null;
  pagamento_mensalidade_desconto_percentual?: number;
  pagamento_mensalidade_observacao?: string | null;
  pagamento_implantacao_forma?: string | null;
  pagamento_implantacao_parcelas?: number | null;
  pagamento_implantacao_desconto_percentual?: number;
  pagamento_implantacao_observacao?: string | null;
  clientes?: { nome_fantasia: string } | null;
  planos?: { nome: string } | null;
  filiais?: { nome: string } | null;
}

export interface FormState {
  cliente_id: string;
  plano_id: string;
  filial_id: string;
  vendedor_id: string;
  comissao_percentual: string;
  comissao_implantacao_percentual: string;
  comissao_mensalidade_percentual: string;
  comissao_servico_percentual: string;
  observacoes: string;
  motivo_desconto: string;
  valor_implantacao_original: number;
  valor_mensalidade_original: number;
  desconto_implantacao_tipo: "R$" | "%";
  desconto_implantacao_valor: string;
  desconto_mensalidade_tipo: "R$" | "%";
  desconto_mensalidade_valor: string;
  acrescimo_implantacao_tipo: "R$" | "%";
  acrescimo_implantacao_valor: string;
  acrescimo_mensalidade_tipo: "R$" | "%";
  acrescimo_mensalidade_valor: string;
  modulos_adicionais: ModuloAdicionadoItem[];
  tipo_pedido: "Novo" | "Upgrade" | "Aditivo" | "OA";
  tipo_atendimento: "Interno" | "Externo" | "";
  servicos_pedido: ServicoAdicionadoItem[];
  contrato_id: string | null;
  pagamento_mensalidade_tipo: "Pré-pago" | "Pós-pago";
  pagamento_mensalidade_observacao: string;
  pagamento_mensalidade_forma: string;
  pagamento_mensalidade_parcelas: string;
  pagamento_mensalidade_desconto_percentual: string;
  pagamento_implantacao_forma: string;
  pagamento_implantacao_parcelas: string;
  pagamento_implantacao_desconto_percentual: string;
  pagamento_implantacao_observacao: string;
}

export interface DraftComentario {
  texto: string;
  prioridade: string;
  arquivo: File | null;
  arquivo_nome: string | null;
}

export interface ClienteFormState {
  nome_fantasia: string;
  razao_social: string;
  apelido: string;
  cnpj_cpf: string;
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
  inscricao_estadual: string;
  ie_isento: boolean;
}

export interface ClienteContatoInline {
  nome: string;
  cargo: string;
  telefone: string;
  email: string;
  decisor: boolean;
  ativo: boolean;
}
