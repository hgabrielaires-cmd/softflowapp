// ─── Helpers puros do módulo Parâmetros Financeiros ───────────────────────

import type {
  PlanoConta,
  PlanoContaNode,
  PlanoContaFormState,
  CentroCustoFormState,
  FormaPagamentoFormState,
  ContaFinanceiraFormState,
} from "./types";
import { NO_FILIAL, NO_PARENT } from "./constants";

export function fmtCurrency(val: number): string {
  return val.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

/** Monta a árvore de plano de contas (nível/subnível) a partir da lista flat. */
export function buildPlanoContasTree(contas: PlanoConta[]): PlanoContaNode[] {
  const map = new Map<string, PlanoContaNode>();
  contas.forEach((c) => map.set(c.id, { ...c, children: [] }));
  const roots: PlanoContaNode[] = [];
  map.forEach((node) => {
    if (node.parent_id && map.has(node.parent_id)) {
      map.get(node.parent_id)!.children.push(node);
    } else {
      roots.push(node);
    }
  });
  const sortRec = (nodes: PlanoContaNode[]) => {
    nodes.sort((a, b) => a.codigo.localeCompare(b.codigo, "pt-BR", { numeric: true }));
    nodes.forEach((n) => sortRec(n.children));
  };
  sortRec(roots);
  return roots;
}

/** Ids do nó e de todos os descendentes — usado para evitar ciclos no seletor de pai. */
export function collectDescendantIds(contas: PlanoConta[], id: string): Set<string> {
  const result = new Set<string>([id]);
  let changed = true;
  while (changed) {
    changed = false;
    contas.forEach((c) => {
      if (c.parent_id && result.has(c.parent_id) && !result.has(c.id)) {
        result.add(c.id);
        changed = true;
      }
    });
  }
  return result;
}

// ─── Validações ───────────────────────────────────────────────────────────

export function validatePlanoContaForm(f: PlanoContaFormState): string | null {
  if (!f.codigo.trim()) return "Informe o código da conta";
  if (!f.nome.trim()) return "Informe o nome da conta";
  return null;
}

export function validateCentroCustoForm(f: CentroCustoFormState): string | null {
  if (!f.nome.trim()) return "Informe o nome do centro de custo";
  return null;
}

export function validateFormaPagamentoForm(f: FormaPagamentoFormState): string | null {
  if (!f.nome.trim()) return "Informe o nome da forma de pagamento";
  return null;
}

export function validateContaFinanceiraForm(f: ContaFinanceiraFormState): string | null {
  if (!f.nome.trim()) return "Informe o nome da conta financeira";
  return null;
}

// ─── Payload builders ─────────────────────────────────────────────────────

export function buildPlanoContaPayload(f: PlanoContaFormState, contas: PlanoConta[]) {
  const parentId = f.parent_id === NO_PARENT ? null : f.parent_id;
  const parent = parentId ? contas.find((c) => c.id === parentId) : null;
  return {
    parent_id: parentId,
    codigo: f.codigo.trim(),
    nome: f.nome.trim(),
    tipo: parent ? parent.tipo : f.tipo,
    nivel: parent ? parent.nivel + 1 : 1,
    aceita_lancamento: f.aceita_lancamento,
    ativo: f.ativo,
  };
}

export function buildCentroCustoPayload(f: CentroCustoFormState) {
  return {
    codigo: f.codigo.trim() || null,
    nome: f.nome.trim(),
    descricao: f.descricao.trim() || null,
    filial_id: f.filial_id === NO_FILIAL ? null : f.filial_id,
    ativo: f.ativo,
  };
}

export function buildFormaPagamentoPayload(f: FormaPagamentoFormState) {
  return {
    nome: f.nome.trim(),
    tipo: f.tipo,
    exige_conta: f.exige_conta,
    ativo: f.ativo,
  };
}

export function buildContaFinanceiraPayload(f: ContaFinanceiraFormState) {
  return {
    nome: f.nome.trim(),
    tipo: f.tipo,
    banco: f.banco.trim() || null,
    agencia: f.agencia.trim() || null,
    numero_conta: f.numero_conta.trim() || null,
    saldo_inicial: Number(f.saldo_inicial) || 0,
    filial_id: f.filial_id === NO_FILIAL ? null : f.filial_id,
    ativo: f.ativo,
  };
}

// ─── Form population ──────────────────────────────────────────────────────

export function planoContaToForm(c: PlanoConta): PlanoContaFormState {
  return {
    parent_id: c.parent_id || NO_PARENT,
    codigo: c.codigo,
    nome: c.nome,
    tipo: c.tipo,
    aceita_lancamento: c.aceita_lancamento,
    ativo: c.ativo,
  };
}
