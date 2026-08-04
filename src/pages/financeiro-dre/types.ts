// ─── Types do módulo DRE ──────────────────────────────────────────────────

export type PeriodoKey = "hoje" | "semana" | "mes" | "mes_passado" | "custom";

export interface DrePeriodo {
  inicio: string;
  fim: string;
}

export interface PlanoConta {
  id: string;
  codigo: string;
  nome: string;
  tipo: string;
  parent_id: string | null;
  nivel: number | null;
}

/** Lançamento normalizado (despesa paga ou saída/entrada do livro caixa). */
export interface DreLancamento {
  id: string;
  data: string;
  valor: number;
  descricao: string | null;
  plano_conta_id: string | null;
  plano_codigo: string | null;
  plano_nome: string | null;
  conta_financeira_id: string | null;
  conta_nome: string | null;
  anexo_url: string | null;
  fornecedor: string | null;
  cnpj_cpf: string | null;
  origem_tipo: string;
}

export interface DreSaldoConta {
  id: string;
  nome: string;
  saldo: number;
}

export interface DreGrupoReceita {
  chave: string;
  label: string;
  total: number;
  lancamentos: DreLancamento[];
}

export interface DreSubgrupo {
  id: string;
  codigo: string;
  nome: string;
  total: number;
  lancamentos: DreLancamento[];
}

export interface DreGrupoDespesa {
  id: string;
  codigo: string;
  nome: string;
  total: number;
  subgrupos: DreSubgrupo[];
}
