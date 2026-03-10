// ─── Helpers for Clientes module ─────────────────────────────────────────

import { format } from "date-fns";
import { ptBR } from "date-fns/locale";

export function fmtBRL(v: number) {
  return (v ?? 0).toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

export function fmtDate(d: string) {
  return format(new Date(d), "dd/MM/yyyy", { locale: ptBR });
}

export function fmtDateTime(d: string) {
  return format(new Date(d), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR });
}
