// ─── Pure helpers for Pedidos module ──────────────────────────────────────

export function fmtBRL(v: number): string {
  return v.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

export function applyDesconto(original: number, tipo: "R$" | "%", valor: number): number {
  const raw = tipo === "%" ? original - (original * valor / 100) : original - valor;
  return Math.max(0, raw);
}

export function applyAcrescimo(original: number, tipo: "R$" | "%", valor: number): number {
  return tipo === "%" ? original + (original * valor / 100) : original + valor;
}
