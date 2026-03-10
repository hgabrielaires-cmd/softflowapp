// ─── Types for JornadaImplantacao module ─────────────────────────────────

import type { ChecklistItem } from "@/lib/supabase-types";

export interface LocalAtividade {
  tempId: string;
  id?: string;
  nome: string;
  descricao: string;
  horas_estimadas: number;
  checklist: ChecklistItem[];
  tipo_responsabilidade: string;
  mesa_atendimento_id: string;
  ordem: number;
}

export interface LocalEtapa {
  tempId: string;
  id?: string;
  nome: string;
  descricao: string;
  mesa_atendimento_id: string;
  permite_clonar: boolean;
  ordem: number;
  atividades: LocalAtividade[];
}

export interface JornadaFormState {
  nome: string;
  descricao: string;
  filial_id: string;
  vinculo_tipo: string;
  vinculo_id: string;
}

export interface EtapaFormState {
  nome: string;
  descricao: string;
  mesa_atendimento_id: string;
  permite_clonar: boolean;
}

export interface AtividadeFormState {
  nome: string;
  descricao: string;
  horas_estimadas: number;
  checklist: ChecklistItem[];
  tipo_responsabilidade: string;
  mesa_atendimento_id: string;
}
