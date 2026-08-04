import { useMemo, useState } from "react";
import { AppLayout } from "@/components/AppLayout";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Loader2, Plus } from "lucide-react";
import { ContaSaldoCard } from "./components/ContaSaldoCard";
import { ExtratoTable } from "./components/ExtratoTable";
import { MovimentacaoDrawer } from "./components/MovimentacaoDrawer";
import { TODAS, hojeISO } from "./constants";
import { montarExtrato } from "./helpers";
import {
  useContasAtivasQuery,
  useExtratoQuery,
  useFiliaisContasQuery,
  usePlanoContasLancamentoQuery,
  useSaldosContasQuery,
} from "./useContasFinanceirasQueries";
import type { ExtratoFiltros, Movimentacao } from "./types";

function toISO(d: Date) {
  return new Date(d.getFullYear(), d.getMonth(), d.getDate()).toISOString().slice(0, 10);
}

function inicioMesISO() {
  const h = new Date();
  return toISO(new Date(h.getFullYear(), h.getMonth(), 1));
}

type PresetKey = "hoje" | "ontem" | "mes" | "mes_passado" | "ano";

function periodoPreset(key: PresetKey) {
  const h = new Date();
  switch (key) {
    case "hoje":
      return { data_inicio: toISO(h), data_fim: toISO(h) };
    case "ontem": {
      const o = new Date(h.getFullYear(), h.getMonth(), h.getDate() - 1);
      return { data_inicio: toISO(o), data_fim: toISO(o) };
    }
    case "mes_passado": {
      const ini = new Date(h.getFullYear(), h.getMonth() - 1, 1);
      const fim = new Date(h.getFullYear(), h.getMonth(), 0);
      return { data_inicio: toISO(ini), data_fim: toISO(fim) };
    }
    case "ano":
      return { data_inicio: toISO(new Date(h.getFullYear(), 0, 1)), data_fim: toISO(new Date(h.getFullYear(), 11, 31)) };
    case "mes":
    default:
      return { data_inicio: inicioMesISO(), data_fim: toISO(new Date(h.getFullYear(), h.getMonth() + 1, 0)) };
  }
}

const PRESETS: { key: PresetKey; label: string }[] = [
  { key: "hoje", label: "Hoje" },
  { key: "ontem", label: "Ontem" },
  { key: "mes", label: "Mês atual" },
  { key: "mes_passado", label: "Mês passado" },
  { key: "ano", label: "Esse ano" },
];

export default function ContasFinanceiras() {
  const [filialFiltro, setFilialFiltro] = useState(TODAS);
  const [preset, setPreset] = useState<PresetKey | null>("mes");
  const [filtros, setFiltros] = useState<ExtratoFiltros>({
    conta_id: TODAS,
    filial_id: TODAS,
    ...periodoPreset("mes"),
    tipo: TODAS,
  });
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [editando, setEditando] = useState<Movimentacao | null>(null);

  const { data: contas = [], isLoading: loadingContas } = useContasAtivasQuery(filialFiltro);
  const { data: saldos = [], isLoading: loadingSaldos } = useSaldosContasQuery(contas);
  const { data: planos = [] } = usePlanoContasLancamentoQuery();
  const { data: filiais = [] } = useFiliaisContasQuery();
  const { data: extrato, isLoading: loadingExtrato } = useExtratoQuery({ ...filtros, filial_id: filialFiltro });

  const linhas = useMemo(
    () =>
      montarExtrato(
        extrato?.movimentacoes ?? [],
        filtros.conta_id === TODAS ? null : filtros.conta_id,
        extrato?.saldoAnterior ?? 0,
      ),
    [extrato, filtros.conta_id],
  );

  function abrirNova() {
    setEditando(null);
    setDrawerOpen(true);
  }

  function abrirEdicao(m: Movimentacao) {
    setEditando(m);
    setDrawerOpen(true);
  }

  return (
    <AppLayout>
      <div className="space-y-6">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h1 className="text-2xl font-bold text-foreground">Contas Financeiras</h1>
            <p className="text-sm text-muted-foreground">Livro caixa com saldo corrente por conta</p>
          </div>
          <div className="flex items-center gap-2">
            <Select value={filialFiltro} onValueChange={setFilialFiltro}>
              <SelectTrigger className="w-[200px]"><SelectValue placeholder="Filial" /></SelectTrigger>
              <SelectContent>
                <SelectItem value={TODAS}>Todas as filiais</SelectItem>
                {filiais.map((f) => <SelectItem key={f.id} value={f.id}>{f.nome}</SelectItem>)}
              </SelectContent>
            </Select>
            <Button onClick={abrirNova} disabled={contas.length === 0}>
              <Plus className="h-4 w-4 mr-1" /> Nova Movimentação
            </Button>
          </div>
        </div>

        {loadingContas || loadingSaldos ? (
          <div className="flex justify-center py-10"><Loader2 className="h-6 w-6 animate-spin text-muted-foreground" /></div>
        ) : saldos.length === 0 ? (
          <Card className="rounded-xl p-6 text-sm text-muted-foreground text-center">
            Nenhuma conta financeira ativa cadastrada.
          </Card>
        ) : (
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {saldos.map((c) => (
              <ContaSaldoCard
                key={c.id}
                conta={c}
                selecionada={filtros.conta_id === c.id}
                onSelect={(id) => setFiltros((f) => ({ ...f, conta_id: f.conta_id === id ? TODAS : id }))}
              />
            ))}
          </div>
        )}

        <Card className="rounded-xl p-4 space-y-4">
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            <div className="space-y-1.5">
              <Label className="text-xs">Conta</Label>
              <Select value={filtros.conta_id} onValueChange={(v) => setFiltros({ ...filtros, conta_id: v })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value={TODAS}>Todas as contas</SelectItem>
                  {contas.map((c) => <SelectItem key={c.id} value={c.id}>{c.nome}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">Data início</Label>
              <Input type="date" value={filtros.data_inicio} onChange={(e) => setFiltros({ ...filtros, data_inicio: e.target.value })} />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">Data fim</Label>
              <Input type="date" value={filtros.data_fim} onChange={(e) => setFiltros({ ...filtros, data_fim: e.target.value })} />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">Tipo</Label>
              <Select value={filtros.tipo} onValueChange={(v) => setFiltros({ ...filtros, tipo: v })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value={TODAS}>Todos</SelectItem>
                  <SelectItem value="entrada">Entrada</SelectItem>
                  <SelectItem value="saida">Saída</SelectItem>
                  <SelectItem value="transferencia">Transferência</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          {loadingExtrato ? (
            <div className="flex justify-center py-10"><Loader2 className="h-6 w-6 animate-spin text-muted-foreground" /></div>
          ) : (
            <ExtratoTable
              linhas={linhas}
              saldoAnterior={extrato?.saldoAnterior ?? 0}
              contaId={filtros.conta_id}
              onSelect={abrirEdicao}
            />
          )}
        </Card>
      </div>

      <MovimentacaoDrawer
        open={drawerOpen}
        onOpenChange={setDrawerOpen}
        contas={contas}
        planos={planos}
        movimentacao={editando}
        contaPadrao={filtros.conta_id === TODAS ? undefined : filtros.conta_id}
      />
    </AppLayout>
  );
}
