export interface CrmOportunidade {
  id: string;
  funil_id: string;
  etapa_id: string;
  cliente_id: string | null;
  contato_id: string | null;
  responsavel_id: string | null;
  titulo: string;
  valor: number;
  observacoes: string | null;
  campos_personalizados: Record<string, string>;
  origem: string | null;
  data_previsao_fechamento: string | null;
  motivo_perda: string | null;
  segmento_ids: string[] | null;
  classificacao: number;
  status: string;
  ordem: number;
  created_at: string;
  updated_at: string;
  data_fechamento?: string | null;
  pedido_id?: string | null;
  conversa_id?: string | null;
  // Joins
  clientes?: { nome_fantasia: string; apelido?: string | null; filial_id?: string | null } | null;
  profiles?: { full_name: string } | null;
  // Task status
  tarefas_status?: "sem_tarefa" | "vencida" | "ok";
  // Product totals (after discount)
  total_implantacao?: number;
  total_mensalidade?: number;
}

export interface CrmFunilSimples {
  id: string;
  nome: string;
  ordem: number;
  ativo: boolean;
  exibe_cliente: boolean;
}

export interface CrmEtapaSimples {
  id: string;
  funil_id: string;
  nome: string;
  cor: string;
  ordem: number;
  ativo: boolean;
}
