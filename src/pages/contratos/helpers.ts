// ─── Pure helpers for Contratos module ───────────────────────────────────
import React from "react";

export function fmtBRL(v: number): string {
  return v.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}
