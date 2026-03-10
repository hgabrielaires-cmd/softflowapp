// ─── Constants for JornadaImplantacao module ─────────────────────────────

import type { JornadaFormState, EtapaFormState, AtividadeFormState } from "./types";

export const emptyJornadaForm: JornadaFormState = {
  nome: "",
  descricao: "",
  filial_id: "",
  vinculo_tipo: "",
  vinculo_id: "",
};

export const emptyEtapaForm: EtapaFormState = {
  nome: "",
  descricao: "",
  mesa_atendimento_id: "",
  permite_clonar: false,
};

export const emptyAtividadeForm: AtividadeFormState = {
  nome: "",
  descricao: "",
  horas_estimadas: 0,
  checklist: [],
  tipo_responsabilidade: "Interna",
  mesa_atendimento_id: "",
};
