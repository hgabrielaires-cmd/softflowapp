export interface MetaVariavel {
  posicao: number;
  label: string;
  campo: string;
  exemplo: string;
}

export interface MetaVariavelContexto {
  contato?: { nome?: string | null; telefone?: string | null } | null;
  cliente?: { nome_fantasia?: string | null; cnpj_cpf?: string | null } | null;
  usuario?: { nome?: string | null; cargo?: string | null } | null;
}

export const META_VAR_REGEX = /\{\{(\d+)\}\}/g;

export interface CampoMeta {
  campo: string;
  label: string;
  exemplo: string;
  grupo: string;
}

export const META_CAMPOS: CampoMeta[] = [
  { campo: "contato.nome", label: "Nome do contato", exemplo: "João Silva", grupo: "Dados do contato" },
  { campo: "contato.empresa", label: "Nome da empresa", exemplo: "Auto Peças Silva", grupo: "Dados do contato" },
  { campo: "contato.telefone", label: "Telefone", exemplo: "(84) 99999-0000", grupo: "Dados do contato" },
  { campo: "usuario.nome", label: "Nome do técnico", exemplo: "Carlos", grupo: "Dados do usuário logado" },
  { campo: "usuario.cargo", label: "Cargo do técnico", exemplo: "Suporte Técnico", grupo: "Dados do usuário logado" },
  { campo: "saudacao_horario", label: "Bom dia/tarde/noite", exemplo: "bom dia", grupo: "Data e hora" },
  { campo: "data_atual", label: "Data de hoje", exemplo: "11/08/2026", grupo: "Data e hora" },
  { campo: "hora_atual", label: "Hora atual", exemplo: "14:30", grupo: "Data e hora" },
  { campo: "cliente.nome_fantasia", label: "Nome da empresa (cliente)", exemplo: "Auto Peças Silva", grupo: "Dados do cliente" },
  { campo: "cliente.cnpj", label: "CNPJ", exemplo: "12.345.678/0001-90", grupo: "Dados do cliente" },
  { campo: "custom", label: "Texto fixo", exemplo: "", grupo: "Personalizado" },
];

export const META_CAMPOS_GRUPOS = Array.from(new Set(META_CAMPOS.map((c) => c.grupo)));

export function getCampoMeta(campo: string): CampoMeta | undefined {
  return META_CAMPOS.find((c) => c.campo === campo);
}

/** Extrai as posições de variáveis {{N}} presentes no conteúdo, ordenadas. */
export function extrairPosicoes(conteudo: string): number[] {
  const encontrados = [...String(conteudo || "").matchAll(META_VAR_REGEX)].map((m) => Number(m[1]));
  const total = encontrados.length ? Math.max(...encontrados) : 0;
  return Array.from({ length: total }, (_, i) => i + 1);
}

/** Mantém o mapeamento sincronizado com as variáveis presentes no conteúdo. */
export function sincronizarVariaveis(conteudo: string, atuais: MetaVariavel[]): MetaVariavel[] {
  return extrairPosicoes(conteudo).map((posicao) => {
    const existente = atuais.find((v) => v.posicao === posicao);
    if (existente) return existente;
    return { posicao, label: "", campo: "custom", exemplo: "" };
  });
}

export function saudacaoHorario(d = new Date()) {
  const h = d.getHours();
  if (h < 12) return "bom dia";
  if (h < 18) return "boa tarde";
  return "boa noite";
}

/** Substitui {{N}} pelos exemplos definidos no mapeamento. */
export function previewComExemplos(conteudo: string, variaveis: MetaVariavel[]) {
  return String(conteudo || "").replace(META_VAR_REGEX, (_m, n) => {
    const v = variaveis.find((x) => x.posicao === Number(n));
    return v?.exemplo?.trim() || `{{${n}}}`;
  });
}

/** Resolve os valores reais das variáveis com base no contexto do envio. */
export function resolverVariaveis(variaveis: MetaVariavel[], ctx: MetaVariavelContexto): string[] {
  const agora = new Date();
  const ordenadas = [...variaveis].sort((a, b) => a.posicao - b.posicao);
  return ordenadas.map((v) => {
    switch (v.campo) {
      case "contato.nome":
        return ctx.contato?.nome || ctx.cliente?.nome_fantasia || "";
      case "contato.empresa":
      case "cliente.nome_fantasia":
        return ctx.cliente?.nome_fantasia || "";
      case "contato.telefone":
        return ctx.contato?.telefone || "";
      case "cliente.cnpj":
        return ctx.cliente?.cnpj_cpf || "";
      case "usuario.nome":
        return ctx.usuario?.nome || "";
      case "usuario.cargo":
        return ctx.usuario?.cargo || "";
      case "saudacao_horario":
        return saudacaoHorario(agora);
      case "data_atual":
        return agora.toLocaleDateString("pt-BR");
      case "hora_atual":
        return agora.toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" });
      case "custom":
      default:
        return v.exemplo || "";
    }
  });
}
