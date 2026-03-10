// ─── Constants for Clientes module ──────────────────────────────────────

import type { ClienteFormState, ContatoFormState } from "./types";

export const ITEMS_PER_PAGE = 15;

export const UF_LIST = [
  "AC","AL","AP","AM","BA","CE","DF","ES","GO","MA","MT","MS","MG",
  "PA","PB","PR","PE","PI","RJ","RN","RS","RO","RR","SC","SP","SE","TO",
];

export const emptyForm: ClienteFormState = {
  nome_fantasia: "",
  razao_social: "",
  apelido: "",
  cnpj_cpf: "",
  inscricao_estadual: "",
  ie_isento: false,
  responsavel_nome: "",
  contato_nome: "",
  telefone: "",
  email: "",
  cidade: "",
  uf: "",
  cep: "",
  logradouro: "",
  numero: "",
  complemento: "",
  bairro: "",
  filial_id: "",
  ativo: true,
};

export const emptyContatoForm: ContatoFormState = {
  nome: "",
  cargo: "",
  telefone: "",
  email: "",
  decisor: false,
  ativo: true,
};

export const TIPO_PEDIDO_COLORS: Record<string, string> = {
  Novo: "bg-blue-100 text-blue-700",
  Upgrade: "bg-green-100 text-green-700",
  Aditivo: "bg-purple-100 text-purple-700",
};
