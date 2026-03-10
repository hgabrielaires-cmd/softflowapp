// ─── Types & Constants for Painel de Atendimento ─────────────────────────

export interface PainelEtapa {
  id: string;
  nome: string;
  ordem: number;
  cor: string | null;
  ativo: boolean;
  controla_sla: boolean;
  prazo_maximo_horas: number | null;
  ordem_entrada: string;
}

export interface PainelCard {
  id: string;
  contrato_id: string;
  pedido_id: string | null;
  cliente_id: string;
  filial_id: string;
  tipo_operacao: string;
  plano_id: string | null;
  jornada_id: string | null;
  responsavel_id: string | null;
  etapa_id: string;
  sla_horas: number;
  observacoes: string | null;
  iniciado_em: string | null;
  iniciado_por: string | null;
  aponta_tecnico_agenda: boolean;
  tipo_atendimento_local: string | null;
  comentario: string | null;
  pausado: boolean;
  pausado_em: string | null;
  pausado_por: string | null;
  pausado_motivo: string | null;
  status_projeto: string;
  etapa_origem_id: string | null;
  created_at: string;
  updated_at: string;
  // Joins
  clientes?: { nome_fantasia: string; apelido?: string | null } | null;
  filiais?: { nome: string } | null;
  planos?: { nome: string; descricao: string | null } | null;
  contratos?: { numero_exibicao: string } | null;
  profiles?: { full_name: string } | null;
}

export interface AtividadeExecucao {
  id: string;
  card_id: string;
  atividade_id: string;
  etapa_id: string | null;
  status: "pendente" | "em_andamento" | "concluida";
  iniciado_em: string | null;
  iniciado_por: string | null;
  concluido_em: string | null;
  concluido_por: string | null;
  created_at: string;
  updated_at: string;
}

export const PRIORIDADE_PESO: Record<string, number> = {
  prioridade: 4,
  urgente: 3,
  medio: 2,
  normal: 1,
};

export const PRIORIDADE_DISPLAY: Record<string, { label: string; emoji: string; className: string }> = {
  prioridade: { label: "Alta Prioridade", emoji: "⚡", className: "bg-purple-100 text-purple-700 border-purple-200" },
  urgente: { label: "Urgente", emoji: "🔴", className: "bg-red-100 text-red-700 border-red-200" },
  medio: { label: "Médio", emoji: "🟡", className: "bg-yellow-100 text-yellow-700 border-yellow-200" },
  normal: { label: "Normal", emoji: "🟢", className: "bg-green-100 text-green-700 border-green-200" },
};
