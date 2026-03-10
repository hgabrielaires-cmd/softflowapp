// ─── Constants for Pedidos module ──────────────────────────────────────────

import type { FormState, ClienteFormState } from "./types";

export const UF_LIST = [
  "AC","AL","AP","AM","BA","CE","DF","ES","GO","MA","MT","MS","MG",
  "PA","PB","PR","PE","PI","RJ","RN","RS","RO","RR","SC","SP","SE","TO",
];

export const emptyClienteForm: ClienteFormState = {
  nome_fantasia: "", razao_social: "", apelido: "", cnpj_cpf: "",
  responsavel_nome: "",
  contato_nome: "", telefone: "", email: "", cidade: "", uf: "",
  cep: "", logradouro: "", numero: "", complemento: "", bairro: "",
  inscricao_estadual: "", ie_isento: false,
};

export const STATUS_OPTIONS = [
  "Aguardando Financeiro",
  "Aprovado Financeiro",
  "Reprovado Financeiro",
  "Aguardando Aprovação de Desconto",
  "Desconto Aprovado",
  "Cancelado",
] as const;

export const STATUS_COLORS: Record<string, string> = {
  "Aguardando Financeiro": "bg-amber-100 text-amber-700",
  "Aprovado Financeiro": "bg-emerald-100 text-emerald-700",
  "Reprovado Financeiro": "bg-red-100 text-red-600",
  "Aguardando Aprovação de Desconto": "bg-purple-100 text-purple-700",
  "Desconto Aprovado": "bg-teal-100 text-teal-700",
  "Cancelado": "bg-gray-100 text-gray-500",
};

export const FIN_STATUS_COLORS: Record<string, string> = {
  Aguardando: "bg-amber-100 text-amber-700",
  Aprovado: "bg-emerald-100 text-emerald-700",
  Reprovado: "bg-red-100 text-red-600",
  Cancelado: "bg-gray-100 text-gray-500",
};

export const emptyForm: FormState = {
  cliente_id: "", plano_id: "", filial_id: "", vendedor_id: "",
  comissao_percentual: "5",
  comissao_implantacao_percentual: "5",
  comissao_mensalidade_percentual: "5",
  comissao_servico_percentual: "5",
  observacoes: "",
  motivo_desconto: "",
  valor_implantacao_original: 0,
  valor_mensalidade_original: 0,
  desconto_implantacao_tipo: "R$",
  desconto_implantacao_valor: "0",
  desconto_mensalidade_tipo: "R$",
  desconto_mensalidade_valor: "0",
  acrescimo_implantacao_tipo: "R$",
  acrescimo_implantacao_valor: "0",
  acrescimo_mensalidade_tipo: "R$",
  acrescimo_mensalidade_valor: "0",
  modulos_adicionais: [],
  tipo_pedido: "Novo",
  tipo_atendimento: "",
  servicos_pedido: [],
  contrato_id: null,
  pagamento_mensalidade_tipo: "Pré-pago",
  pagamento_mensalidade_observacao: "",
  pagamento_mensalidade_forma: "",
  pagamento_mensalidade_parcelas: "",
  pagamento_mensalidade_desconto_percentual: "0",
  pagamento_implantacao_forma: "",
  pagamento_implantacao_parcelas: "",
  pagamento_implantacao_desconto_percentual: "0",
  pagamento_implantacao_observacao: "",
};

export const PRIORIDADES_DRAFT = [
  { value: "normal", label: "Normal", emoji: "🟢" },
  { value: "medio", label: "Médio", emoji: "🟡" },
  { value: "urgente", label: "Urgente", emoji: "🔴" },
  { value: "prioridade", label: "Alta Prioridade", emoji: "⚡" },
] as const;

export const PRIORIDADE_MAP_DRAFT: Record<string, { label: string; emoji: string }> = {
  normal: { label: "Normal", emoji: "🟢" },
  medio: { label: "Médio", emoji: "🟡" },
  urgente: { label: "Urgente", emoji: "🔴" },
  prioridade: { label: "Alta Prioridade", emoji: "⚡" },
};

export const MAX_FILE_SIZE_DRAFT = 11 * 1024 * 1024;

export const ITEMS_PER_PAGE = 15;
