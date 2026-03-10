// ─── Helpers for JornadaImplantacao module ────────────────────────────────

import type { LocalEtapa, LocalAtividade } from "./types";

/** Format decimal hours to "h:mm" string, e.g. 1.5 → "1:30" */
export function formatHorasMinutos(decimalHoras: number): string {
  const h = Math.floor(decimalHoras);
  const m = Math.round((decimalHoras - h) * 60);
  return `${h}:${m.toString().padStart(2, "0")}`;
}

/** Calculate total minutes from all atividades across etapas */
export function calcTotalMinutos(etapas: LocalEtapa[]): number {
  return etapas.reduce(
    (sum, e) => sum + e.atividades.reduce((s, a) => s + a.horas_estimadas * 60, 0),
    0,
  );
}

/** Resolve vinculo label from lookup arrays */
export function getVinculoLabel(
  tipo: string,
  id: string,
  planos: { id: string; nome: string }[],
  modulos: { id: string; nome: string }[],
  servicos: { id: string; nome: string }[],
): string {
  if (tipo === "plano") return planos.find((p) => p.id === id)?.nome || id;
  if (tipo === "modulo") return modulos.find((m) => m.id === id)?.nome || id;
  if (tipo === "servico") return servicos.find((s) => s.id === id)?.nome || id;
  return id;
}

/** Return vinculo items list based on type */
export function getVinculoItems(
  tipo: string,
  planos: { id: string; nome: string }[],
  modulos: { id: string; nome: string }[],
  servicos: { id: string; nome: string }[],
): { id: string; nome: string }[] {
  if (tipo === "plano") return planos.map((p) => ({ id: p.id, nome: p.nome }));
  if (tipo === "modulo") return modulos.map((m) => ({ id: m.id, nome: m.nome }));
  if (tipo === "servico") return servicos.map((s) => ({ id: s.id, nome: s.nome }));
  return [];
}

/** Map raw Supabase etapa+atividades response to LocalEtapa[] */
export function mapEtapasToLocal(etapasData: any[]): LocalEtapa[] {
  return (etapasData || []).map((e: any) => ({
    tempId: crypto.randomUUID(),
    id: e.id,
    nome: e.nome,
    descricao: e.descricao || "",
    mesa_atendimento_id: e.mesa_atendimento_id || "",
    permite_clonar: e.permite_clonar || false,
    ordem: e.ordem,
    atividades: (e.jornada_atividades || [])
      .sort((a: any, b: any) => a.ordem - b.ordem)
      .map((a: any): LocalAtividade => ({
        tempId: crypto.randomUUID(),
        id: a.id,
        nome: a.nome,
        descricao: a.descricao || "",
        horas_estimadas: a.horas_estimadas,
        checklist: Array.isArray(a.checklist) ? a.checklist : [],
        tipo_responsabilidade: a.tipo_responsabilidade,
        mesa_atendimento_id: a.mesa_atendimento_id || "",
        ordem: a.ordem,
      })),
  }));
}

/** Parse "h:mm" text to decimal hours */
export function parseHorasText(text: string): { decimal: number; formatted: string } {
  const parts = text.split(":");
  const hours = parseInt(parts[0] || "0", 10) || 0;
  const mins = Math.min(59, parseInt(parts[1] || "0", 10) || 0);
  const decimal = Math.round((hours + mins / 60) * 100) / 100;
  const formatted = `${hours}:${mins.toString().padStart(2, "0")}`;
  return { decimal, formatted };
}

/** Format decimal hours to "h:mm" for the horas input display */
export function decimalToHorasText(decimal: number): string {
  const h = Math.floor(decimal);
  const m = Math.round((decimal - h) * 60);
  return `${h}:${m.toString().padStart(2, "0")}`;
}
