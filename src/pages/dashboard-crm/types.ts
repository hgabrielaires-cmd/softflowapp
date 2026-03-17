export interface PeriodoFiltro {
  tipo: "mes_atual" | "mes_anterior" | "30d" | "60d" | "90d" | "personalizado";
  inicio: string;
  fim: string;
}

export interface KpiFinalizadas {
  totalFinalizadas: number;
  ganhas: number;
  perdidas: number;
  taxaGanho: number;
  valorImplantacao: number;
  valorMensalidade: number;
  ticketMedio: number;
  // Comparativo período anterior
  valorImplantacaoAnterior: number;
  valorMensalidadeAnterior: number;
  ticketMedioAnterior: number;
  taxaConversaoAnterior: number;
  ganhasAnterior: number;
  perdidasAnterior: number;
}

export interface VendedorRanking {
  user_id: string;
  full_name: string;
  avatar_url: string | null;
  negocios: number;
  valorTotal: number;
}

export interface MotivoPerda {
  motivo: string;
  quantidade: number;
  percentual: number;
}

export interface KpiAndamento {
  totalAndamento: number;
  valorTotalPipeline: number;
  previsaoEsteMes: number;
  valorPrevisaoEsteMes: number;
  previsaoProximoMes: number;
  valorPrevisaoProximoMes: number;
  semPrevisao: number;
}

export interface EtapaFunil {
  id: string;
  nome: string;
  cor: string;
  quantidade: number;
  valorTotal: number;
  percentual: number;
}

export interface TarefasAnalise {
  agendadas: number;
  atrasadas: number;
  diasMedioAtraso: number;
  concluidas: number;
  semTarefa: number;
  porEtapa: {
    etapa_id: string;
    etapa_nome: string;
    agendadas: number;
    atrasadas: number;
    semTarefa: number;
  }[];
}

export interface AlertaAtencao {
  oportunidade_id: string;
  titulo: string;
  cliente_nome: string | null;
  etapa_nome: string;
  responsavel_nome: string | null;
  ultimo_contato: string | null;
  tipo: "sem_interacao" | "tarefa_atrasada" | "previsao_vencida";
  dias: number;
}

export interface ComparativoSemana {
  label: string;
  ganhas: number;
  perdidas: number;
}
