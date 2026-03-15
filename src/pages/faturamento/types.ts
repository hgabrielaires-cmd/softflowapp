// ─── Types for Faturamento module ─────────────────────────────────────────

export interface Fatura {
  id: string;
  numero_fatura: string;
  contrato_id: string | null;
  cliente_id: string;
  filial_id: string | null;
  pedido_id: string | null;
  valor: number;
  valor_desconto: number;
  valor_final: number;
  data_emissao: string;
  data_vencimento: string;
  data_pagamento: string | null;
  status: string;
  forma_pagamento: string | null;
  referencia_mes: number | null;
  referencia_ano: number | null;
  tipo: string;
  gerado_automaticamente: boolean;
  observacoes: string | null;
  asaas_payment_id: string | null;
  asaas_url: string | null;
  asaas_barcode: string | null;
  asaas_bank_slip_url: string | null;
  asaas_pix_qrcode: string | null;
  asaas_pix_image: string | null;
  created_at: string;
  updated_at: string;
  clientes?: { nome_fantasia: string } | null;
  contratos?: { numero_exibicao: string } | null;
}

export interface NotaFiscal {
  id: string;
  fatura_id: string | null;
  cliente_id: string;
  filial_id: string | null;
  numero_nf: string;
  serie: string | null;
  valor: number;
  data_emissao: string;
  status: string;
  xml_url: string | null;
  pdf_url: string | null;
  observacoes: string | null;
  created_at: string;
  clientes?: { nome_fantasia: string } | null;
  faturas?: { numero_fatura: string } | null;
}

export interface ClienteOption {
  id: string;
  nome_fantasia: string;
}

export interface ContratoOption {
  id: string;
  numero_exibicao: string;
}

export interface FaturaFormState {
  cliente_id: string;
  contrato_id: string;
  valor: string;
  valor_desconto: string;
  data_vencimento: string;
  tipo: string;
  forma_pagamento: string;
  referencia_mes: string;
  referencia_ano: string;
  observacoes: string;
}

export interface NotaFiscalFormState {
  cliente_id: string;
  fatura_id: string;
  numero_nf: string;
  serie: string;
  valor: string;
  data_emissao: string;
  observacoes: string;
}

export interface PagamentoFormState {
  data_pagamento: string;
  forma_pagamento: string;
}

export interface AditivoPendente {
  id: string;
  numero_exibicao: string;
  tipo_pedido: string;
}

export interface ContratoAguardando {
  id: string;
  numero_exibicao: string;
  tipo: string;
  status: string;
  created_at: string;
  updated_at: string;
  cliente_id: string;
  plano_id: string | null;
  pedido_id: string | null;
  contrato_origem_id: string | null;
  cliente_nome: string;
  plano_nome: string;
  valor_mensalidade: number;
  valor_implantacao: number;
  parcelas_implantacao: number;
  data_assinatura: string;
  dias_aguardando: number;
  badge_tipo: "Não Faturado" | "Upgrade Pendente" | "OA Pendente" | "Módulo Pendente" | "Downgrade Pendente" | "Retroativo";
  is_retroativo: boolean;
  modulos_adicionais: { nome: string; quantidade: number; valor_mensalidade_modulo: number }[] | null;
  aditivos_pendentes: AditivoPendente[];
}
