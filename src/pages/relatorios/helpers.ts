/** Helpers da auditoria geral do sistema (relatórios). */

export const MODULO_LABELS: Record<string, string> = {
  fin_despesas: "Despesas",
  fin_movimentacoes: "Movimentações financeiras",
  clientes: "Clientes",
  contratos: "Contratos",
  faturas: "Faturas",
  user_roles: "Perfis de usuário",
  auth: "Autenticação",
};

export function moduloLabel(entity: string): string {
  return MODULO_LABELS[entity] || entity;
}

export type TipoAcao = "criacao" | "edicao" | "exclusao" | "outro";

export function tipoAcao(action: string): TipoAcao {
  if (/(_deleted|_removed|delete)$/.test(action)) return "exclusao";
  if (/(_created|_added|create)$/.test(action)) return "criacao";
  if (/(_updated|_changed|update)$/.test(action)) return "edicao";
  return "outro";
}

export function acaoLabel(action: string): string {
  switch (tipoAcao(action)) {
    case "exclusao": return "Exclusão";
    case "criacao": return "Inclusão";
    case "edicao": return "Edição";
    default: return action;
  }
}

export function acaoVariant(action: string): "default" | "secondary" | "destructive" | "outline" {
  const t = tipoAcao(action);
  if (t === "exclusao") return "destructive";
  if (t === "criacao") return "default";
  if (t === "edicao") return "secondary";
  return "outline";
}

export function formatDataHora(iso: string): string {
  return new Date(iso).toLocaleString("pt-BR", { dateStyle: "short", timeStyle: "short" });
}

/** Resumo curto e legível dos detalhes do evento. */
export function resumoDetalhes(details: Record<string, unknown> | null): string {
  if (!details) return "—";
  const d = details as Record<string, any>;
  if (d.changes && typeof d.changes === "object") {
    const campos = Object.keys(d.changes);
    return `${campos.length} campo(s): ${campos.slice(0, 4).join(", ")}${campos.length > 4 ? "…" : ""}`;
  }
  const partes = [d.nome_fantasia, d.numero, d.numero_fatura, d.descricao, d.role, d.email]
    .filter((v) => typeof v === "string" && v.trim().length > 0);
  if (d.valor != null) {
    partes.push(Number(d.valor).toLocaleString("pt-BR", { style: "currency", currency: "BRL" }));
  }
  return partes.length ? partes.join(" · ") : "—";
}
