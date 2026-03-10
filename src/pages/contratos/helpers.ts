// ─── Pure helpers for Contratos module ───────────────────────────────────

export function fmtBRL(v: number): string {
  return v.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}
