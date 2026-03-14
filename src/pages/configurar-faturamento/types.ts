// ─── Types for Configurar Faturamento ─────────────────────────────────────

export interface ContratoEspelho {
  id: string;
  numero_exibicao: string;
  tipo: string;
  status: string;
  updated_at: string;
  contrato_origem_id: string | null;
  cliente: {
    id: string;
    nome_fantasia: string;
    razao_social: string | null;
    cnpj_cpf: string;
    email: string | null;
    telefone: string | null;
    filial_id: string | null;
  };
  plano: {
    id: string;
    nome: string;
    valor_mensalidade_padrao: number;
    valor_implantacao_padrao: number;
  } | null;
  pedido: {
    id: string;
    tipo_pedido: string;
    valor_mensalidade: number;
    valor_mensalidade_final: number;
    valor_implantacao: number;
    valor_implantacao_final: number;
    pagamento_implantacao_parcelas: number | null;
    pagamento_implantacao_forma: string | null;
    pagamento_mensalidade_forma: string | null;
    filial_id: string | null;
    modulos_adicionais: ModuloAdicionalPedido[] | null;
    servicos_pedido: ServicoPedido[] | null;
  } | null;
  zapsign: {
    sign_url: string | null;
    status: string;
  } | null;
  contrato_base: {
    numero_exibicao: string;
    cliente_nome: string;
  } | null;
}

export interface ModuloAdicionalPedido {
  modulo_id: string;
  nome: string;
  valor_mensalidade: number;
  valor_implantacao: number;
  quantidade: number;
}

export interface ServicoPedido {
  servico_id: string;
  nome: string;
  valor: number;
  quantidade: number;
}

export interface ConfigFaturamentoForm {
  // Implantação
  valor_implantacao: number;
  parcelas_implantacao: number;
  // Mensalidade
  valor_mensalidade: number;
  dia_vencimento: number;
  forma_pagamento: string;
  mes_inicio: number;
  ano_inicio: number;
  // Módulos
  modulos: ModuloConfig[];
  // OA
  oa_descricao: string;
  oa_valor: number;
  oa_mes_referencia: number;
  oa_ano_referencia: number;
  oa_observacao: string;
  // Cliente cobrança
  email_cobranca: string;
  whatsapp_cobranca: string;
  // Geral
  observacoes: string;
}

export interface ModuloConfig {
  id: string;
  nome: string;
  valor_unitario: number;
  quantidade: number;
  valor_mensal: number;
  data_inicio: string;
}

export interface FaturaPreviewItem {
  descricao: string;
  valor: number;
  tipo: "mensalidade" | "implantacao" | "modulo" | "oa";
}

export interface FaturaPreviewMes {
  mes: number;
  ano: number;
  label: string;
  itens: FaturaPreviewItem[];
  total: number;
}

// ─── Contrato Financeiro Base (dados do registro existente) ───────────────

export interface ContratoFinanceiroBase {
  id: string;
  contrato_id: string;
  cliente_id: string;
  plano_id: string | null;
  valor_mensalidade: number;
  dia_vencimento: number;
  forma_pagamento: string;
  data_inicio: string;
  status: string;
  filial_id: string | null;
  plano_nome?: string;
  // Parcelas pendentes do base
  parcelas_pendentes: ParcelaImplantacao[];
  // Módulos ativos do base
  modulos_ativos: ModuloFinanceiroAtivo[];
  // OAs pendentes
  oas_pendentes: OAFinanceiraPendente[];
}

export interface ParcelaImplantacao {
  id: string;
  descricao: string;
  valor_total: number;
  numero_parcelas: number;
  valor_por_parcela: number;
  parcelas_pagas: number;
  status: string;
}

export interface ModuloFinanceiroAtivo {
  id: string;
  nome: string;
  valor_mensal: number;
  data_inicio: string;
  ativo: boolean;
}

export interface OAFinanceiraPendente {
  id: string;
  descricao: string;
  valor: number;
  mes_referencia: number;
  ano_referencia: number;
  faturada: boolean;
}
