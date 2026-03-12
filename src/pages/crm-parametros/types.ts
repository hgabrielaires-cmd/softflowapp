export interface CrmFunil {
  id: string;
  nome: string;
  descricao: string | null;
  ativo: boolean;
  ordem: number;
  created_at: string;
  updated_at: string;
}

export interface CrmEtapa {
  id: string;
  funil_id: string;
  nome: string;
  cor: string;
  ordem: number;
  ativo: boolean;
  created_at: string;
  updated_at: string;
}

export interface CrmCampoPersonalizado {
  id: string;
  nome: string;
  tipo: string;
  opcoes: string[];
  obrigatorio: boolean;
  ativo: boolean;
  ordem: number;
  created_at: string;
  updated_at: string;
}
