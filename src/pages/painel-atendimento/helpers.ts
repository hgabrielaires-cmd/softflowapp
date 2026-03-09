import type { PainelCard, PainelEtapa } from "./types";

// ─── Time & SLA Helpers ─────────────────────────────────────────────────

export function getTempoNaEtapa(card: PainelCard): string {
  const entrada = new Date(card.updated_at).getTime();
  const agora = Date.now();
  const diffMs = agora - entrada;
  const dias = Math.floor(diffMs / (1000 * 60 * 60 * 24));
  const horas = Math.floor((diffMs % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
  const minutos = Math.floor((diffMs % (1000 * 60 * 60)) / (1000 * 60));
  if (dias > 0) return `${dias}d ${horas}h`;
  if (horas > 0) return `${horas}h ${minutos}m`;
  return `${minutos}m`;
}

export function isInicioAtrasado(card: PainelCard, etapas: PainelEtapa[]): boolean {
  if (card.iniciado_em) return false;
  const etapa = etapas.find((e) => e.id === card.etapa_id);
  if (!etapa?.controla_sla || !etapa.prazo_maximo_horas) return false;
  const criado = new Date(card.created_at).getTime();
  return (Date.now() - criado) / (1000 * 60 * 60) > etapa.prazo_maximo_horas;
}

export function getTempoRestante(card: PainelCard, etapas: PainelEtapa[]): string | null {
  if (card.iniciado_em) return null;
  const etapa = etapas.find((e) => e.id === card.etapa_id);
  if (!etapa?.controla_sla || !etapa.prazo_maximo_horas) return null;
  const criado = new Date(card.created_at).getTime();
  const limite = criado + etapa.prazo_maximo_horas * 60 * 60 * 1000;
  const restanteMs = limite - Date.now();
  if (restanteMs <= 0) return null;
  const horas = Math.floor(restanteMs / (1000 * 60 * 60));
  const minutos = Math.floor((restanteMs % (1000 * 60 * 60)) / (1000 * 60));
  return `${horas}:${String(minutos).padStart(2, "0")}`;
}

export function getTempoAtraso(card: PainelCard, etapas: PainelEtapa[]): string | null {
  if (card.iniciado_em) return null;
  const etapa = etapas.find((e) => e.id === card.etapa_id);
  if (!etapa?.controla_sla || !etapa.prazo_maximo_horas) return null;
  const criado = new Date(card.created_at).getTime();
  const limite = criado + etapa.prazo_maximo_horas * 60 * 60 * 1000;
  const atrasoMs = Date.now() - limite;
  if (atrasoMs <= 0) return null;
  const dias = Math.floor(atrasoMs / (1000 * 60 * 60 * 24));
  const horas = Math.floor((atrasoMs % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
  const minutos = Math.floor((atrasoMs % (1000 * 60 * 60)) / (1000 * 60));
  if (dias > 0) return `${dias}d ${horas}h`;
  return `${horas}:${String(minutos).padStart(2, "0")}h`;
}

export function getSlaEtapaForCard(
  card: PainelCard,
  jornadaSlaMap: Record<string, Record<string, number>>,
  etapas: PainelEtapa[]
): number | null {
  if (!card.plano_id) return null;
  const planoMap = jornadaSlaMap[card.plano_id];
  if (!planoMap) return null;
  const etapa = etapas.find((e) => e.id === card.etapa_id);
  if (!etapa) return null;
  return planoMap[etapa.nome] ?? null;
}

export function isEtapaSlaAtrasado(
  card: PainelCard,
  jornadaSlaMap: Record<string, Record<string, number>>,
  etapas: PainelEtapa[]
): boolean {
  if (!card.iniciado_em) return false;
  const sla = getSlaEtapaForCard(card, jornadaSlaMap, etapas);
  if (!sla || sla <= 0) return false;
  const inicio = new Date(card.iniciado_em).getTime();
  return Date.now() > inicio + sla * 60 * 60 * 1000;
}

export function getVencimentoSla(iniciado_em: string | null, sla: number | null): Date | null {
  if (!iniciado_em || !sla || sla <= 0) return null;
  return new Date(new Date(iniciado_em).getTime() + sla * 60 * 60 * 1000);
}

export function getTempoExcedidoSla(
  card: PainelCard,
  jornadaSlaMap: Record<string, Record<string, number>>,
  etapas: PainelEtapa[]
): string | null {
  if (!card.iniciado_em) return null;
  const sla = getSlaEtapaForCard(card, jornadaSlaMap, etapas);
  if (!sla || sla <= 0) return null;
  const inicio = new Date(card.iniciado_em).getTime();
  const atrasoMs = Date.now() - (inicio + sla * 60 * 60 * 1000);
  if (atrasoMs <= 0) return null;
  const dias = Math.floor(atrasoMs / (1000 * 60 * 60 * 24));
  const horas = Math.floor((atrasoMs % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
  const minutos = Math.floor((atrasoMs % (1000 * 60 * 60)) / (1000 * 60));
  if (dias > 0) return `${dias}d ${horas}h`;
  if (horas > 0) return `${horas}h ${minutos}m`;
  return `${minutos}m`;
}

export function formatSLA(horas: number): string {
  if (!horas) return "—";
  const h = Math.floor(horas);
  const m = Math.round((horas - h) * 60);
  return m > 0 ? `${h}h${m.toString().padStart(2, "0")}` : `${h}h`;
}

export function calcProgress(
  card: PainelCard,
  totalChecklistPorPlano: Record<string, number>,
  cardProgressMap: Record<string, number>
): number {
  if (!card.plano_id) return 0;
  const total = totalChecklistPorPlano[card.plano_id] || 0;
  if (total === 0) return 0;
  const concluidos = cardProgressMap[card.id] || 0;
  return Math.min(100, Math.round((concluidos / total) * 100));
}

export function isChecklistCompleto(
  checklistEtapa: any[],
  checklistProgresso: Record<string, { concluido: boolean }>
): boolean {
  if (checklistEtapa.length === 0) return true;
  let totalItens = 0;
  let totalConcluidos = 0;
  checklistEtapa.forEach((atividade: any) => {
    const items = Array.isArray(atividade.checklist) ? atividade.checklist : [];
    items.forEach((_: any, idx: number) => {
      totalItens++;
      const prog = checklistProgresso[`${atividade.id}_${idx}`];
      if (prog?.concluido) totalConcluidos++;
    });
  });
  return totalItens > 0 && totalConcluidos === totalItens;
}
