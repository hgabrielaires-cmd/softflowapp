export const DIAS_SEMANA = [
  { value: 0, label: "Domingo" },
  { value: 1, label: "Segunda" },
  { value: 2, label: "Terça" },
  { value: 3, label: "Quarta" },
  { value: 4, label: "Quinta" },
  { value: 5, label: "Sexta" },
  { value: 6, label: "Sábado" },
] as const;

const mkPeriodo = (ativo: boolean, inicio: string, fim: string) => ({ ativo, inicio, fim });

export const DEFAULT_HORARIOS_POR_DIA: Record<string, { atendimento: { ativo: boolean; inicio: string; fim: string }; plantao: { ativo: boolean; inicio: string; fim: string } }> = {
  "0": { atendimento: mkPeriodo(false, "", ""), plantao: mkPeriodo(true, "08:00", "23:59") },
  "1": { atendimento: mkPeriodo(true, "08:00", "18:00"), plantao: mkPeriodo(true, "18:00", "23:59") },
  "2": { atendimento: mkPeriodo(true, "08:00", "18:00"), plantao: mkPeriodo(true, "18:00", "23:59") },
  "3": { atendimento: mkPeriodo(true, "08:00", "18:00"), plantao: mkPeriodo(true, "18:00", "23:59") },
  "4": { atendimento: mkPeriodo(true, "08:00", "18:00"), plantao: mkPeriodo(true, "18:00", "23:59") },
  "5": { atendimento: mkPeriodo(true, "08:00", "18:00"), plantao: mkPeriodo(true, "18:00", "23:59") },
  "6": { atendimento: mkPeriodo(false, "", ""), plantao: mkPeriodo(true, "12:00", "23:59") },
};

export const DISTRIBUICAO_TIPOS = [
  { value: "manual", label: "Manual" },
  { value: "round_robin", label: "Round Robin" },
  { value: "balanceada", label: "Balanceada" },
] as const;

export const FLUXO_TIPOS = [
  { value: "opcoes", label: "Opções" },
  { value: "texto_livre", label: "Texto Livre" },
  { value: "cnpj", label: "CNPJ" },
] as const;

export const CAMPO_DESTINO_OPCOES = [
  { value: "nome_cliente", label: "Nome do Cliente" },
  { value: "setor_id", label: "Setor" },
  { value: "cnpj", label: "CNPJ" },
] as const;
