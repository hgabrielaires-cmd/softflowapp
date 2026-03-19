// ─── Types for Contratos module ──────────────────────────────────────────

export interface ModuloAdicionadoItem {
  modulo_id: string;
  nome: string;
  quantidade: number;
  valor_implantacao_modulo: number;
  valor_mensalidade_modulo: number;
}

export interface Contrato {
  id: string;
  numero_exibicao: string;
  numero_registro: number;
  cliente_id: string;
  plano_id: string | null;
  pedido_id: string | null;
  tipo: string;
  status: string;
  contrato_origem_id: string | null;
  created_at: string;
  updated_at: string;
  pdf_url: string | null;
  status_geracao: string | null;
  clientes?: {
    nome_fantasia: string;
    filial_id: string | null;
    razao_social: string | null;
    cnpj_cpf: string;
    inscricao_estadual: string | null;
    cidade: string | null;
    uf: string | null;
    cep: string | null;
    logradouro: string | null;
    numero: string | null;
    complemento: string | null;
    bairro: string | null;
    telefone: string | null;
    email: string | null;
    apelido?: string | null;
    responsavel_nome?: string | null;
  } | null;
  planos?: { nome: string; descricao: string | null; valor_mensalidade_padrao: number } | null;
  pedidos?: {
    numero_exibicao: string;
    status_pedido: string;
    contrato_liberado: boolean;
    financeiro_status: string;
    valor_implantacao_final: number;
    valor_mensalidade_final: number;
    valor_implantacao_original: number;
    valor_mensalidade_original: number;
    valor_total: number;
    desconto_implantacao_tipo: string;
    desconto_implantacao_valor: number;
    desconto_mensalidade_tipo: string;
    desconto_mensalidade_valor: number;
    modulos_adicionais: ModuloAdicionadoItem[] | null;
    observacoes: string | null;
    motivo_desconto: string | null;
    pagamento_mensalidade_observacao: string | null;
    pagamento_implantacao_observacao: string | null;
    pagamento_implantacao_forma: string | null;
    pagamento_implantacao_parcelas: number | null;
    pagamento_mensalidade_forma: string | null;
    pagamento_mensalidade_parcelas: number | null;
    filial_id: string;
    vendedor_id: string;
    tipo_pedido?: string;
    servicos_pedido?: any[] | null;
    tipo_atendimento?: string | null;
  } | null;
}

export interface ZapSignRecord {
  contrato_id: string;
  zapsign_doc_token: string;
  status: string;
  signers: { name: string; email: string; token: string; status: string; sign_url: string; signed_at?: string }[];
  sign_url: string | null;
}
