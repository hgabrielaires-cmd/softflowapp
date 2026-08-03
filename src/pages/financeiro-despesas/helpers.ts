// ─── Helpers puros do módulo Despesas ─────────────────────────────────────

import { addDays, addMonths, addWeeks, format, parseISO } from "date-fns";
import type { ParcelaPreview, RateioLinha, RecorrenciaPeriodo } from "./types";

export function hojeISO(): string {
  return format(new Date(), "yyyy-MM-dd");
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
