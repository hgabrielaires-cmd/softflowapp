// ─── Helpers puros do módulo DRE ──────────────────────────────────────────

import { ORIGEM_RECEITA_LABELS } from "./constants";
import type {
  DreGrupoDespesa,
  DreGrupoReceita,
  DreLancamento,
  DrePeriodo,
  PeriodoKey,
  PlanoConta,
} from "./types";

export function fmtCurrency(v: number): string {
  return Number(v || 0).toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

export function fmtDate(iso: string): string {
  const [y, m, d] = String(iso).slice(0, 10).split("-");
  return `${d}/${m}/${y}`;
}

export function toISO(d: Date): string {
  return new Date(d.getFullYear(), d.getMonth(), d.getDate()).toISOString().slice(0, 10);
}

export function hojeISO(): string {
  return toISO(new Date());
}

export function periodoPreset(key: PeriodoKey): DrePeriodo {
  const h = new Date();
  switch (key) {
    case "hoje":
      return { inicio: toISO(h), fim: toISO(h) };
    case "semana": {
      const ini = new Date(h.getFullYear(), h.getMonth(), h.getDate() - h.getDay());
      const fim = new Date(ini.getFullYear(), ini.getMonth(), ini.getDate() + 6);
      return { inicio: toISO(ini), fim: toISO(fim) };
    }
    case "mes_passado": {
      const ini = new Date(h.getFullYear(), h.getMonth() - 1, 1);
      const fim = new Date(h.getFullYear(), h.getMonth(), 0);
      return { inicio: toISO(ini), fim: toISO(fim) };
    }
    case "mes":
    case "custom":
    default:
      return {
        inicio: toISO(new Date(h.getFullYear(), h.getMonth(), 1)),
        fim: toISO(new Date(h.getFullYear(), h.getMonth() + 1, 0)),
      };
  }
}

export function labelReceita(origem: string | null): string {
  const key = String(origem ?? "manual");
  return ORIGEM_RECEITA_LABELS[key] ?? key;
}

export function agruparReceitas(lancamentos: DreLancamento[]): DreGrupoReceita[] {
  const mapa = new Map<string, DreGrupoReceita>();
  lancamentos.forEach((l) => {
    const chave = String(l.origem_tipo ?? "manual");
    const atual = mapa.get(chave) ?? { chave, label: labelReceita(chave), total: 0, lancamentos: [] };
    atual.total += Number(l.valor || 0);
    atual.lancamentos.push(l);
    mapa.set(chave, atual);
  });
  return [...mapa.values()].sort((a, b) => b.total - a.total);
}

/** Agrupa despesas por grupo pai (nível 1) e subcategoria do plano de contas. */
export function agruparDespesas(
  lancamentos: DreLancamento[],
  planos: PlanoConta[],
): { grupos: DreGrupoDespesa[]; semCategoria: DreLancamento[]; totalCategorizado: number; totalSemCategoria: number } {
  const porId = new Map(planos.map((p) => [p.id, p]));
  const grupos = new Map<string, DreGrupoDespesa>();
  const semCategoria: DreLancamento[] = [];

  const raizDe = (p: PlanoConta): PlanoConta => {
    let atual = p;
    let guard = 0;
    while (atual.parent_id && porId.has(atual.parent_id) && guard < 10) {
      atual = porId.get(atual.parent_id)!;
      guard += 1;
    }
    return atual;
  };

  lancamentos.forEach((l) => {
    const plano = l.plano_conta_id ? porId.get(l.plano_conta_id) : undefined;
    if (!plano) {
      semCategoria.push(l);
      return;
    }
    const raiz = raizDe(plano);
    const grupo =
      grupos.get(raiz.id) ?? { id: raiz.id, codigo: raiz.codigo, nome: raiz.nome, total: 0, subgrupos: [] };
    grupo.total += Number(l.valor || 0);

    let sub = grupo.subgrupos.find((s) => s.id === plano.id);
    if (!sub) {
      sub = { id: plano.id, codigo: plano.codigo, nome: plano.nome, total: 0, lancamentos: [] };
      grupo.subgrupos.push(sub);
    }
    sub.total += Number(l.valor || 0);
    sub.lancamentos.push(l);
    grupos.set(raiz.id, grupo);
  });

  const lista = [...grupos.values()].sort((a, b) => b.total - a.total);
  lista.forEach((g) => g.subgrupos.sort((a, b) => b.total - a.total));

  const totalCategorizado = lista.reduce((s, g) => s + g.total, 0);
  const totalSemCategoria = semCategoria.reduce((s, l) => s + Number(l.valor || 0), 0);

  return { grupos: lista, semCategoria, totalCategorizado, totalSemCategoria };
}

export function percentual(valor: number, total: number): number {
  if (!total) return 0;
  return (valor / total) * 100;
}

export function exportarCSV(nome: string, lancamentos: DreLancamento[]) {
  const head = ["Data", "Fornecedor", "Descricao", "Valor", "Plano", "Origem"];
  const linhas = lancamentos.map((l) => [
    fmtDate(l.data),
    l.fornecedor ?? "",
    (l.descricao ?? "").replace(/;/g, ","),
    Number(l.valor || 0).toFixed(2).replace(".", ","),
    [l.plano_codigo, l.plano_nome].filter(Boolean).join(" — "),
    l.origem_tipo,
  ]);
  const csv = [head, ...linhas].map((r) => r.join(";")).join("\n");
  const blob = new Blob(["\uFEFF" + csv], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `${nome.replace(/[^\w.-]+/g, "_")}.csv`;
  a.click();
  URL.revokeObjectURL(url);
}
