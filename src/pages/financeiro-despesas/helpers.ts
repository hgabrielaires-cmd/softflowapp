// ─── Helpers puros do módulo Despesas ─────────────────────────────────────

import { addDays, addMonths, addWeeks, format, parseISO } from "date-fns";
import type { DespesaFiltros, DespesaRegistro, ParcelaPreview, RateioLinha, RecorrenciaPeriodo } from "./types";
import { FILTRO_TODOS } from "./constants";

export function hojeISO(): string {
  return format(new Date(), "yyyy-MM-dd");
}

// ─── Anexo ────────────────────────────────────────────────────────────────

export const ANEXO_MAX_MB = 10;
export const ANEXO_TIPOS_ACEITOS = [
  "application/pdf",
  "image/png",
  "image/jpeg",
  "image/webp",
];
export const ANEXO_ACCEPT = ".pdf,.png,.jpg,.jpeg,.webp";

/** Remove caracteres perigosos (path traversal) do nome do arquivo. */
export function sanitizeFileName(nome: string): string {
  const base = nome.split(/[\\/]/).pop() || "arquivo";
  return (
    base
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .replace(/[^a-zA-Z0-9._-]/g, "_")
      .replace(/_{2,}/g, "_")
      .slice(-120) || "arquivo"
  );
}

/** Retorna a mensagem de erro do anexo, ou null se estiver válido. */
export function validarAnexo(file: File): string | null {
  if (!ANEXO_TIPOS_ACEITOS.includes(file.type)) {
    return "Formato não suportado. Envie PDF, PNG, JPG ou WEBP.";
  }
  if (file.size > ANEXO_MAX_MB * 1024 * 1024) {
    return `O arquivo deve ter no máximo ${ANEXO_MAX_MB} MB.`;
  }
  return null;
}


export function parseValor(valor: string): number {
  const normalized = valor.replace(/\./g, "").replace(",", ".").replace(/[^\d.-]/g, "");
  const n = Number(normalized);
  return Number.isFinite(n) ? n : 0;
}

export function formatBRL(valor: number): string {
  return valor.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

export function formatDataBR(iso: string): string {
  if (!iso) return "—";
  try {
    return format(parseISO(iso), "dd/MM/yyyy");
  } catch {
    return iso;
  }
}

/** Avança uma data conforme o período de recorrência. */
export function avancarPeriodo(base: Date, periodo: RecorrenciaPeriodo, indice: number): Date {
  switch (periodo) {
    case "semanal":
      return addWeeks(base, indice);
    case "quinzenal":
      return addDays(base, 15 * indice);
    case "mensal":
      return addMonths(base, indice);
    case "bimestral":
      return addMonths(base, 2 * indice);
    case "trimestral":
      return addMonths(base, 3 * indice);
    case "semestral":
      return addMonths(base, 6 * indice);
    case "anual":
      return addMonths(base, 12 * indice);
    default:
      return base;
  }
}

/** Gera a prévia das parcelas a partir do 1º vencimento. */
export function gerarParcelas(
  primeiroVencimento: string,
  periodo: RecorrenciaPeriodo,
  vezes: number,
  valor: number,
): ParcelaPreview[] {
  if (!primeiroVencimento || vezes < 1) return [];
  const base = parseISO(primeiroVencimento);
  return Array.from({ length: vezes }, (_, i) => ({
    numero: i + 1,
    data_vencimento: format(avancarPeriodo(base, periodo, i), "yyyy-MM-dd"),
    valor,
  }));
}

/** Distribui igualmente 100% entre as linhas, ajustando a sobra na última. */
export function distribuirRateio(linhas: RateioLinha[]): RateioLinha[] {
  const n = linhas.length;
  if (n === 0) return linhas;
  const base = Math.floor((100 / n) * 100) / 100;
  return linhas.map((l, i) => ({
    ...l,
    percentual: i === n - 1 ? Number((100 - base * (n - 1)).toFixed(2)) : base,
  }));
}

export function totalRateio(linhas: RateioLinha[]): number {
  return Number(linhas.reduce((acc, l) => acc + (Number(l.percentual) || 0), 0).toFixed(2));
}

export function rateioValido(ratear: boolean, linhas: RateioLinha[]): boolean {
  if (!ratear) return true;
  if (linhas.some((l) => !l.centro_custo_id)) return false;
  return totalRateio(linhas) === 100;
}

/** Variante do badge de status considerando vencimento em aberto. */
export function statusBadgeVariant(d: DespesaRegistro): "default" | "secondary" | "destructive" | "outline" | "warning" {
  if (d.status === "pago") return "default";
  if (d.status === "cancelado") return "outline";
  return d.data_vencimento < hojeISO() ? "destructive" : "warning";
}

/** true quando a parcela está em aberto e já passou do vencimento. */
export function despesaVencida(d: DespesaRegistro): boolean {
  return d.status === "aberto" && d.data_vencimento < hojeISO();
}

/** Classe do badge de status: verde para pago, vermelho para vencido, laranja para em aberto. */
export function statusBadgeClass(d: DespesaRegistro): string {
  if (d.status === "pago") return "bg-paid text-paid-foreground hover:bg-paid/90 border-transparent";
  if (despesaVencida(d)) return "bg-destructive text-destructive-foreground hover:bg-destructive/90 border-transparent";
  return "bg-warning text-warning-foreground hover:bg-warning/90 border-transparent";
}

/** Aplica os filtros da lista de despesas (client-side). */
export function aplicarFiltrosDespesas(
  despesas: DespesaRegistro[],
  f: DespesaFiltros,
): DespesaRegistro[] {
  const busca = f.busca.trim().toLowerCase();
  return despesas.filter((d) => {
    const dataBase = f.base_data === "emissao" ? d.data_emissao : d.data_vencimento;
    if (f.data_inicio && dataBase < f.data_inicio) return false;
    if (f.data_fim && dataBase > f.data_fim) return false;
    if (f.fornecedor_id !== FILTRO_TODOS && d.fornecedor_id !== f.fornecedor_id) return false;
    if (f.filial_id !== FILTRO_TODOS && d.filial_id !== f.filial_id) return false;
    if (f.plano_conta_id !== FILTRO_TODOS && d.plano_conta_id !== f.plano_conta_id) return false;
    if (f.forma_pagamento_id !== FILTRO_TODOS && d.forma_pagamento_id !== f.forma_pagamento_id) return false;
    if (f.status !== FILTRO_TODOS && d.status !== f.status) return false;
    if (
      f.centro_custo_id !== FILTRO_TODOS &&
      !(d.fin_despesa_rateios || []).some((r) => r.centro_custo_id === f.centro_custo_id)
    ) {
      return false;
    }
    if (busca) {
      const alvo = `${d.fornecedores?.nome_fantasia || ""} ${d.descricao || ""}`.toLowerCase();
      if (!alvo.includes(busca)) return false;
    }
    return true;
  });
}

// ─── Auditoria ────────────────────────────────────────────────────────────

export function formatDataHoraBR(iso: string): string {
  return new Date(iso).toLocaleString("pt-BR", { dateStyle: "short", timeStyle: "short" });
}

export function acaoAuditoriaLabel(action: string): string {
  switch (action) {
    case "despesa_created": return "Inclusão";
    case "despesa_updated": return "Edição";
    case "despesa_deleted": return "Exclusão";
    default: return action;
  }
}

export function acaoBadgeVariant(action: string): "default" | "secondary" | "destructive" | "outline" {
  if (action === "despesa_deleted") return "destructive";
  if (action === "despesa_created") return "default";
  return "secondary";
}

interface AuditoriaLookups {
  fornecedores: { id: string; nome_fantasia: string }[];
  planoContas: { id: string; codigo: string; nome: string }[];
  formasPagamento: { id: string; nome: string }[];
  contas: { id: string; nome: string }[];
  centrosCusto: { id: string; nome: string }[];
}

/** Converte um valor bruto do audit_logs em texto legível (resolve ids e formatos). */
export function formatValorAuditoria(campo: string, valor: unknown, l: AuditoriaLookups): string {
  if (valor === null || valor === undefined || valor === "") return "—";
  switch (campo) {
    case "valor":
      return formatBRL(Number(valor));
    case "data_vencimento":
    case "data_emissao":
      return formatDataBR(String(valor));
    case "fornecedor_id":
      return l.fornecedores.find((f) => f.id === valor)?.nome_fantasia || String(valor);
    case "plano_conta_id": {
      const p = l.planoContas.find((x) => x.id === valor);
      return p ? `${p.codigo} — ${p.nome}` : String(valor);
    }
    case "forma_pagamento_id":
      return l.formasPagamento.find((x) => x.id === valor)?.nome || String(valor);
    case "conta_financeira_id":
      return l.contas.find((x) => x.id === valor)?.nome || String(valor);
    case "centro_custo_id":
      return l.centrosCusto.find((x) => x.id === valor)?.nome || String(valor);
    default:
      return typeof valor === "object" ? JSON.stringify(valor) : String(valor);
  }
}

// ─── Período padrão: mês atual ────────────────────────────────────────────

export function periodoMesAtual(): { data_inicio: string; data_fim: string } {
  const hoje = new Date();
  const ano = hoje.getFullYear();
  const mes = hoje.getMonth();
  const iso = (d: Date) =>
    `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
  return {
    data_inicio: iso(new Date(ano, mes, 1)),
    data_fim: iso(new Date(ano, mes + 1, 0)),
  };
}
