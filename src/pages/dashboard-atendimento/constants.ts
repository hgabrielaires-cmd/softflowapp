export const STATUS_CORES: Record<string, string> = {
  "Aberto": "bg-gray-100 border-gray-300 text-gray-700",
  "Em Andamento": "bg-blue-50 border-blue-300 text-blue-700",
  "Aguardando Cliente": "bg-amber-50 border-amber-300 text-amber-700",
  "Resolvido": "bg-emerald-50 border-emerald-300 text-emerald-700",
};

export const KANBAN_STATUS_COLORS: Record<string, string> = {
  "Aberto": "hsl(220, 10%, 60%)",
  "Em Andamento": "hsl(210, 90%, 45%)",
  "Aguardando Cliente": "hsl(38, 92%, 50%)",
  "Resolvido": "hsl(160, 60%, 45%)",
};
