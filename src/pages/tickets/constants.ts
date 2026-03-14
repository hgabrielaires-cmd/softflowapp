import { TicketStatus, TicketPrioridade, TicketMesa } from "./types";

export const TICKET_STATUSES: TicketStatus[] = [
  "Aberto",
  "Em Andamento",
  "Aguardando Cliente",
  "Resolvido",
  "Fechado",
];

export const TICKET_STATUS_COLORS: Record<TicketStatus, string> = {
  "Aberto": "bg-gray-500 text-white",
  "Em Andamento": "bg-[hsl(210,90%,45%)] text-white",
  "Aguardando Cliente": "bg-amber-500 text-white",
  "Resolvido": "bg-emerald-500 text-white",
  "Fechado": "bg-gray-900 text-white",
};

export const TICKET_STATUS_BG: Record<TicketStatus, string> = {
  "Aberto": "bg-gray-100 border-gray-300",
  "Em Andamento": "bg-blue-50 border-blue-300",
  "Aguardando Cliente": "bg-amber-50 border-amber-300",
  "Resolvido": "bg-emerald-50 border-emerald-300",
  "Fechado": "bg-gray-50 border-gray-400",
};

export const TICKET_PRIORIDADES: TicketPrioridade[] = ["Baixa", "Média", "Alta", "Crítica"];

export const TICKET_PRIORIDADE_COLORS: Record<TicketPrioridade, string> = {
  "Baixa": "bg-blue-100 text-blue-700 border-blue-200",
  "Média": "bg-amber-100 text-amber-700 border-amber-200",
  "Alta": "bg-orange-100 text-orange-700 border-orange-200",
  "Crítica": "bg-red-100 text-red-700 border-red-200",
};

export const TICKET_PRIORIDADE_SLA: Record<TicketPrioridade, number> = {
  "Crítica": 4,
  "Alta": 8,
  "Média": 24,
  "Baixa": 72,
};

export const TICKET_MESAS: TicketMesa[] = ["Suporte", "Implantação", "Financeiro", "Comercial"];
