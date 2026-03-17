export const PERIODO_OPTIONS = [
  { value: "mes_atual", label: "Mês Atual" },
  { value: "mes_anterior", label: "Mês Anterior" },
  { value: "30d", label: "Últimos 30 dias" },
  { value: "60d", label: "Últimos 60 dias" },
  { value: "90d", label: "Últimos 90 dias" },
  { value: "personalizado", label: "Personalizado" },
] as const;

export const DIAS_SEM_INTERACAO_PADRAO = 7;

export const COR_GANHO = "#22C55E";
export const COR_PERDIDO = "#EF4444";
export const COR_ALERTA = "#F59E0B";
export const COR_ATRASADO = "#DC2626";
export const COR_SEM_INTERACAO = "#F97316";
