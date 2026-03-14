export interface DashKpi {
  totalAbertos: number;
  slaVencido: number;
  resolvidosHoje: number;
  tempoMedioResolucao: number; // horas
}

export interface TicketAlerta {
  id: string;
  numero_exibicao: string;
  titulo: string;
  tipo: "sla_vencido" | "sla_critico" | "contrato_vencendo" | "implantacao_atrasada";
  detalhe: string;
}

export interface TicketPorCategoria {
  categoria: string;
  total: number;
}

export interface TicketAntigo {
  id: string;
  numero_exibicao: string;
  titulo: string;
  cliente_nome: string | null;
  prioridade: string;
  created_at: string;
  dias_aberto: number;
}

export interface KanbanResumo {
  status: string;
  total: number;
  cor: string;
}
