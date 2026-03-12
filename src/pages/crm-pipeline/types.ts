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
  status: string;
  ordem: number;
  created_at: string;
  updated_at: string;
  // Joins
  clientes?: { nome_fantasia: string; apelido?: string | null } | null;
  profiles?: { full_name: string } | null;
}

export interface CrmFunilSimples {
  id: string;
  nome: string;
  ordem: number;
  ativo: boolean;
}

export interface CrmEtapaSimples {
  id: string;
  funil_id: string;
  nome: string;
  cor: string;
  ordem: number;
  ativo: boolean;
}
