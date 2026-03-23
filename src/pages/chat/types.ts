export interface ChatConversa {
  id: string;
  protocolo: string | null;
  canal: string | null;
  status: string | null;
  numero_cliente: string;
  nome_cliente: string | null;
  setor_id: string | null;
  atendente_id: string | null;
  cliente_id: string | null;
  contato_id: string | null;
  filial_id: string | null;
  tags: string[] | null;
  canal_instancia: string | null;
  bot_estado: any;
  iniciado_em: string | null;
  atendimento_iniciado_em: string | null;
  encerrado_em: string | null;
  tempo_espera_segundos: number | null;
  tempo_atendimento_segundos: number | null;
  nps_enviado: boolean | null;
  nps_nota: number | null;
  nps_comentario: string | null;
  created_at: string | null;
  updated_at: string | null;
  // Joined fields
  setor?: { id: string; nome: string } | null;
  atendente?: { user_id: string; full_name: string | null; avatar_url: string | null } | null;
  cliente?: { id: string; nome_fantasia: string; cnpj_cpf: string } | null;
  ultima_mensagem?: ChatMensagem | null;
  mensagens_nao_lidas?: number;
}

export interface ChatMensagem {
  id: string;
  conversa_id: string | null;
  tipo: string | null;
  conteudo: string | null;
  media_url: string | null;
  media_tipo: string | null;
  media_nome: string | null;
  remetente: string | null;
  atendente_id: string | null;
  evolution_message_id: string | null;
  lida: boolean | null;
  created_at: string | null;
  atendente?: { user_id: string; full_name: string | null; avatar_url: string | null } | null;
}

export interface ChatFila {
  id: string;
  conversa_id: string | null;
  setor_id: string | null;
  filial_id: string | null;
  posicao: number | null;
  atribuido_a: string | null;
  status: string | null;
  created_at: string | null;
}

export interface ChatConfiguracao {
  id: string;
  filial_id: string | null;
  ativo: boolean | null;
  horario_inicio: string | null;
  horario_fim: string | null;
  dias_semana: number[] | null;
  mensagem_boas_vindas: string | null;
  mensagem_fora_horario: string | null;
  mensagem_aguardando: string | null;
  mensagem_encerramento: string | null;
  mensagem_nps: string | null;
  distribuicao_tipo: string | null;
  max_conversas_por_atendente: number | null;
  tempo_espera_estimado: string | null;
}

export interface ChatBotFluxo {
  id: string;
  filial_id: string | null;
  ordem: number;
  pergunta: string;
  tipo: string | null;
  opcoes: any;
  campo_destino: string | null;
  ativo: boolean | null;
}

export interface ChatRespostaRapida {
  id: string;
  filial_id: string | null;
  setor_id: string | null;
  atalho: string;
  conteudo: string;
  ativo: boolean | null;
}

export type ChatStatus = "bot" | "aguardando" | "em_atendimento" | "encerrado" | "fora_horario";

export const STATUS_LABELS: Record<ChatStatus, string> = {
  bot: "Bot",
  aguardando: "Aguardando",
  em_atendimento: "Em atendimento",
  encerrado: "Encerrado",
  fora_horario: "Fora do horário",
};

export const STATUS_COLORS: Record<ChatStatus, string> = {
  bot: "bg-purple-500",
  aguardando: "bg-yellow-500",
  em_atendimento: "bg-blue-500",
  encerrado: "bg-gray-400",
  fora_horario: "bg-gray-300",
};
