export type AppRole = 'admin' | 'gestor' | 'financeiro' | 'vendedor' | 'operacional' | 'tecnico';

export const ROLE_LABELS: Record<AppRole, string> = {
  admin: 'Administrador',
  gestor: 'Gestor',
  financeiro: 'Financeiro',
  vendedor: 'Vendedor',
  operacional: 'Operacional',
  tecnico: 'Técnico',
};

export const ROLE_COLORS: Record<AppRole, string> = {
  admin: 'bg-red-100 text-red-700 border-red-200',
  gestor: 'bg-purple-100 text-purple-700 border-purple-200',
  financeiro: 'bg-blue-100 text-blue-700 border-blue-200',
  vendedor: 'bg-sky-100 text-sky-700 border-sky-200',
  operacional: 'bg-green-100 text-green-700 border-green-200',
  tecnico: 'bg-orange-100 text-orange-700 border-orange-200',
};

export interface Profile {
  id: string;
  user_id: string;
  full_name: string;
  email: string;
  filial: string | null;
  filial_id: string | null;
  filial_favorita_id: string | null;
  mesa_favorita_id: string | null;
  avatar_url: string | null;
  active: boolean;
  comissao_percentual: number | null;
  comissao_implantacao_percentual: number | null;
  comissao_mensalidade_percentual: number | null;
  comissao_servico_percentual: number | null;
  desconto_limite_implantacao: number | null;
  desconto_limite_mensalidade: number | null;
  telefone: string | null;
  acesso_global: boolean;
  created_at: string;
  updated_at: string;
}

export interface Pedido {
  id: string;
  cliente_id: string;
  vendedor_id: string;
  filial_id: string;
  plano_id: string;
  valor_implantacao: number;
  valor_mensalidade: number;
  valor_total: number;
  comissao_percentual: number;
  comissao_valor: number;
  status_pedido: 'Aguardando Financeiro' | 'Cancelado';
  observacoes: string | null;
  created_at: string;
  updated_at: string;
  // Joins
  cliente?: Cliente;
  plano?: Plano;
  vendedor?: Profile;
  filial?: Filial;
}

export interface Filial {
  id: string;
  nome: string;
  razao_social: string | null;
  responsavel: string | null;
  ativa: boolean;
  logo_url: string | null;
  cnpj: string | null;
  inscricao_estadual: string | null;
  logradouro: string | null;
  numero: string | null;
  complemento: string | null;
  bairro: string | null;
  cidade: string | null;
  uf: string | null;
  cep: string | null;
  telefone: string | null;
  email: string | null;
  etapa_inicial_id: string | null;
  created_at: string;
}

export interface UserRole {
  id: string;
  user_id: string;
  role: AppRole;
}

export interface Cliente {
  id: string;
  nome_fantasia: string;
  razao_social: string | null;
  apelido: string | null;
  cnpj_cpf: string;
  contato_nome: string | null;
  telefone: string | null;
  email: string | null;
  cidade: string | null;
  uf: string | null;
  filial_id: string | null;
  ativo: boolean;
  created_at: string;
}

export interface Modulo {
  id: string;
  nome: string;
  ativo: boolean;
  created_at: string;
}

export interface Contrato {
  id: string;
  cliente_id: string;
  plano_id: string | null;
  numero_registro: number;
  numero_exibicao: string;
  tipo: 'Base' | 'Aditivo' | 'OA' | 'Cancelamento';
  status: 'Ativo' | 'Encerrado';
  pedido_id: string | null;
  contrato_origem_id: string | null;
  created_at: string;
  updated_at: string;
  // Joins
  plano?: Plano;
  cliente?: Cliente;
}

export interface Plano {
  id: string;
  nome: string;
  descricao: string | null;
  ativo: boolean;
  created_at: string;
}

export interface PlanoModulo {
  id: string;
  plano_id: string;
  modulo_id: string;
  inclui_treinamento: boolean;
  ordem: number;
  duracao_minutos: number | null;
  obrigatorio: boolean;
  modulo?: Modulo;
}

export interface DocumentTemplate {
  id: string;
  nome: string;
  tipo: 'CONTRATO_BASE' | 'ADITIVO' | 'CANCELAMENTO';
  filial_id: string | null;
  conteudo_html: string;
  ativo: boolean;
  versao: number;
  logo_url: string | null;
  usa_clausulas: boolean;
  created_at: string;
  updated_at: string;
  filiais?: { nome: string } | null;
}

export interface ContractClause {
  id: string;
  titulo: string;
  conteudo_html: string;
  tipo: string;
  ordem_padrao: number;
  ativo: boolean;
  created_at: string;
  updated_at: string;
}

export interface TemplateClause {
  id: string;
  template_id: string;
  clause_id: string | null;
  titulo: string;
  conteudo_html: string;
  ordem: number;
  ativo: boolean;
  created_at: string;
  updated_at: string;
}

export interface MesaAtendimento {
  id: string;
  nome: string;
  descricao: string | null;
  ativo: boolean;
  created_at: string;
  updated_at: string;
}

export interface Jornada {
  id: string;
  nome: string;
  descricao: string | null;
  filial_id: string | null;
  vinculo_tipo: string;
  vinculo_id: string;
  ativo: boolean;
  created_at: string;
  updated_at: string;
  filial?: Filial | null;
}

export interface JornadaEtapa {
  id: string;
  jornada_id: string;
  nome: string;
  descricao: string | null;
  mesa_atendimento_id: string | null;
  ordem: number;
  created_at: string;
  updated_at: string;
  mesa_atendimento?: MesaAtendimento | null;
}

export type ChecklistItemTipo = 'check' | 'sim_nao' | 'texto' | 'agendamento' | 'anexo' | 'quantitativo';

export const CHECKLIST_TIPO_LABELS: Record<ChecklistItemTipo, string> = {
  check: 'Check',
  sim_nao: 'Sim ou Não',
  texto: 'Texto Livre',
  agendamento: 'Agendamento',
  anexo: 'Anexo (11MB)',
  quantitativo: 'Quantitativo',
};

export interface ChecklistItem {
  texto: string;
  concluido: boolean;
  tipo: ChecklistItemTipo;
}

export interface JornadaAtividade {
  id: string;
  etapa_id: string;
  nome: string;
  descricao: string | null;
  horas_estimadas: number;
  checklist: ChecklistItem[];
  tipo_responsabilidade: string;
  ordem: number;
  created_at: string;
  updated_at: string;
}
