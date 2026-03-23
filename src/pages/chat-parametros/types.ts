export interface PeriodoHorario {
  ativo: boolean;
  inicio: string;
  fim: string;
}

export interface DiaHorario {
  atendimento: PeriodoHorario;
  plantao: PeriodoHorario;
}

export type HorariosPorDia = Record<string, DiaHorario>;

export interface ChatConfiguracao {
  id: string;
  filial_id: string | null;
  ativo: boolean | null;
  horario_inicio: string | null;
  horario_fim: string | null;
  dias_semana: number[] | null;
  horarios_por_dia: HorariosPorDia | null;
  mensagem_boas_vindas: string | null;
  mensagem_fora_horario: string | null;
  mensagem_aguardando: string | null;
  mensagem_encerramento: string | null;
  mensagem_nps: string | null;
  mensagem_plantao: string | null;
  distribuicao_tipo: string | null;
  max_conversas_por_atendente: number | null;
  tempo_espera_estimado: string | null;
  created_at: string | null;
}

export interface ChatBotFluxo {
  id: string;
  filial_id: string | null;
  ordem: number;
  pergunta: string;
  tipo: string | null;
  opcoes: BotOpcao[] | null;
  campo_destino: string | null;
  ativo: boolean | null;
  created_at: string | null;
}

export interface BotOpcao {
  numero: number;
  texto: string;
  setor_id?: string;
}

export interface ChatRespostaRapida {
  id: string;
  filial_id: string | null;
  setor_id: string | null;
  atalho: string;
  conteudo: string;
  ativo: boolean | null;
  created_at: string | null;
  setor?: { id: string; nome: string } | null;
}
