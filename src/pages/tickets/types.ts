import { Profile, Cliente } from "@/lib/supabase-types";

export interface HelpdeskTipoAtendimento {
  id: string;
  nome: string;
  descricao: string | null;
  sla_horas: number;
  mesa_padrao: string;
  ativo: boolean;
  created_at: string;
  updated_at: string;
}

export interface HelpdeskModeloTicket {
  id: string;
  nome: string;
  tipo_atendimento_id: string | null;
  titulo_padrao: string | null;
  corpo_html: string;
  ativo: boolean;
  created_at: string;
  updated_at: string;
  tipo_atendimento?: HelpdeskTipoAtendimento | null;
}

export type TicketStatus = "Aberto" | "Em Andamento" | "Aguardando Cliente" | "Resolvido" | "Fechado";
export type TicketPrioridade = "Baixa" | "Média" | "Alta" | "Crítica";
export type TicketMesa = "Suporte" | "Implantação" | "Financeiro" | "Comercial";
export type TicketModo = "interno" | "externo";

export interface Ticket {
  id: string;
  numero_registro: number;
  numero_exibicao: string;
  titulo: string;
  descricao_html: string;
  status: TicketStatus;
  prioridade: TicketPrioridade;
  mesa: TicketMesa;
  cliente_id: string | null;
  contrato_id: string | null;
  responsavel_id: string | null;
  tipo_atendimento_id: string | null;
  ticket_pai_id: string | null;
  sla_horas: number;
  sla_deadline: string | null;
  tags: string[];
  previsao_entrega: string | null;
  criado_por: string | null;
  created_at: string;
  updated_at: string;
  // Joins
  clientes?: Pick<Cliente, "id" | "nome_fantasia"> | null;
  responsavel?: Pick<Profile, "user_id" | "full_name" | "avatar_url"> | null;
  seguidores?: TicketSeguidor[];
  anexos_count?: number;
}

export interface TicketAnexoItem {
  nome: string;
  url: string;
  tipo?: string;
}

export interface TicketComentario {
  id: string;
  ticket_id: string;
  user_id: string | null;
  tipo: "comentario" | "status_change" | "responsavel_change" | "sistema";
  visibilidade: "publico" | "interno";
  conteudo: string;
  metadata: Record<string, unknown>;
  parent_id: string | null;
  anexos: TicketAnexoItem[] | null;
  created_at: string;
  profile?: Pick<Profile, "user_id" | "full_name" | "avatar_url"> | null;
}

export interface TicketCurtida {
  id: string;
  comentario_id: string;
  user_id: string;
  created_at: string;
}

export interface TicketSeguidor {
  id: string;
  ticket_id: string;
  user_id: string;
  created_at: string;
  profile?: Pick<Profile, "user_id" | "full_name" | "avatar_url"> | null;
}

export interface TicketAnexo {
  id: string;
  ticket_id: string;
  comentario_id: string | null;
  nome: string;
  url: string;
  tamanho_bytes: number;
  tipo_mime: string | null;
  uploaded_by: string | null;
  created_at: string;
}

export interface TicketVinculo {
  id: string;
  ticket_id: string;
  ticket_vinculado_id: string;
  created_at: string;
  ticket_vinculado?: Pick<Ticket, "id" | "numero_exibicao" | "titulo" | "status"> | null;
}

export interface TicketAgendamento {
  id: string;
  ticket_id: string;
  data: string;
  hora_inicio: string | null;
  hora_fim: string | null;
  titulo: string | null;
  created_at: string;
}

export interface TicketFormData {
  titulo: string;
  descricao_html: string;
  cliente_id: string | null;
  contrato_id: string | null;
  mesa: TicketMesa;
  modo: TicketModo;
  tipo_atendimento_id: string | null;
  prioridade: TicketPrioridade;
  responsavel_id: string | null;
  sla_horas: number;
  tags: string[];
  previsao_entrega: string | null;
  ticket_pai_id: string | null;
  seguidores: string[];
}
