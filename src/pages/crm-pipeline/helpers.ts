import type { CrmOportunidade } from "./types";

export function formatValor(valor: number): string {
  return new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(valor);
}

export function getTempoDesdeCreacao(oportunidade: CrmOportunidade): string {
  const diff = Date.now() - new Date(oportunidade.created_at).getTime();
  const dias = Math.floor(diff / (1000 * 60 * 60 * 24));
  if (dias === 0) return "Hoje";
  if (dias === 1) return "1 dia";
  return `${dias} dias`;
}

export function totalValorEtapa(oportunidades: CrmOportunidade[]): number {
  return oportunidades.reduce((sum, o) => sum + (o.valor || 0), 0);
}
