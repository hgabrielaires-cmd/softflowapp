import { useMemo, useState } from "react";
import { AppLayout } from "@/components/AppLayout";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Loader2, RefreshCw } from "lucide-react";
import { DespesasCard } from "./components/DespesasCard";
import { LancamentosDrawer } from "./components/LancamentosDrawer";
import { ReceitasCard } from "./components/ReceitasCard";
import { ResultadoCard } from "./components/ResultadoCard";
import { PERIODOS, TODAS } from "./constants";
import { agruparDespesas, agruparReceitas, fmtDate, hojeISO, periodoPreset } from "./helpers";
import { useDRE, useFiliaisDreQuery } from "./useDreQueries";
import type { DreLancamento, PeriodoKey } from "./types";

export default function DRE() {
  const [filialId, setFilialId] = useState(TODAS);
  const [periodoKey, setPeriodoKey] = useState<PeriodoKey>("mes");
  const [periodo, setPeriodo] = useState(periodoPreset("mes"));
  const [drawer, setDrawer] = useState<{ titulo: string; subtitulo: string; lancamentos: DreLancamento[] } | null>(null);

  const { data: filiais = [] } = useFiliaisDreQuery();
  const { saldos, planos, receitas, despesas, isLoading, isFetching, refetch } = useDRE(filialId, periodo);

  const gruposReceita = useMemo(() => agruparReceitas(receitas), [receitas]);
  const totalReceitas = useMemo(() => receitas.reduce((s, l) => s + Number(l.valor || 0), 0), [receitas]);
  const dadosDespesas = useMemo(() => agruparDespesas(despesas, planos), [despesas, planos]);

  const periodoLabel = `${fmtDate(periodo.inicio)} a ${fmtDate(periodo.fim)}`;

  function selecionarPeriodo(key: PeriodoKey) {
    setPeriodoKey(key);
    if (key !== "custom") setPeriodo(periodoPreset(key));
  }

  return (
    <AppLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold text-foreground">DRE — Demonstrativo de Resultado</h1>
          <p className="text-sm text-muted-foreground">Receitas, despesas e resultado do período</p>
        </div>

        <Card className="rounded-xl p-4">
          <div className="flex flex-wrap items-end gap-3">
            <div className="space-y-1.5">
              <Label className="text-xs">Filial</Label>
              <Select value={filialId} onValueChange={setFilialId}>
                <SelectTrigger className="w-[220px]"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value={TODAS}>Todas as filiais</SelectItem>
                  {filiais.map((f) => <SelectItem key={f.id} value={f.id}>{f.nome}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs">Período</Label>
              <div className="flex flex-wrap gap-2">
                {PERIODOS.map((p) => (
                  <Button
                    key={p.key}
                    size="sm"
                    variant={periodoKey === p.key ? "default" : "outline"}
                    onClick={() => selecionarPeriodo(p.key)}
                  >
                    {p.label}
                  </Button>
                ))}
              </div>
            </div>

            {periodoKey === "custom" && (
              <>
                <div className="space-y-1.5">
                  <Label className="text-xs">Data início</Label>
                  <Input type="date" value={periodo.inicio} onChange={(e) => setPeriodo({ ...periodo, inicio: e.target.value })} />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs">Data fim</Label>
                  <Input type="date" value={periodo.fim} onChange={(e) => setPeriodo({ ...periodo, fim: e.target.value })} />
                </div>
              </>
            )}

            <Button variant="outline" onClick={refetch} disabled={isFetching}>
              <RefreshCw className={`mr-1 h-4 w-4 ${isFetching ? "animate-spin" : ""}`} /> Atualizar
            </Button>
          </div>
        </Card>

        {isLoading ? (
          <div className="flex justify-center py-16"><Loader2 className="h-6 w-6 animate-spin text-muted-foreground" /></div>
        ) : (
          <div className="space-y-6">
            <ReceitasCard
              saldos={saldos}
              grupos={gruposReceita}
              totalReceitas={totalReceitas}
              hoje={hojeISO()}
              onSelectGrupo={(g) =>
                setDrawer({ titulo: g.label, subtitulo: periodoLabel, lancamentos: g.lancamentos })
              }
            />

            <DespesasCard
              grupos={dadosDespesas.grupos}
              totalDespesas={dadosDespesas.totalCategorizado}
              semCategoria={dadosDespesas.semCategoria}
              totalSemCategoria={dadosDespesas.totalSemCategoria}
              onSelectSub={(s) =>
                setDrawer({ titulo: `${s.codigo} — ${s.nome}`, subtitulo: periodoLabel, lancamentos: s.lancamentos })
              }
              onSelectSemCategoria={() =>
                setDrawer({ titulo: "Sem categoria", subtitulo: periodoLabel, lancamentos: dadosDespesas.semCategoria })
              }
            />

            <ResultadoCard
              totalReceitas={totalReceitas}
              totalDespesas={dadosDespesas.totalCategorizado}
              totalSemCategoria={dadosDespesas.totalSemCategoria}
            />
          </div>
        )}
      </div>

      <LancamentosDrawer
        open={!!drawer}
        onOpenChange={(v) => !v && setDrawer(null)}
        titulo={drawer?.titulo ?? ""}
        subtitulo={drawer?.subtitulo}
        lancamentos={drawer?.lancamentos ?? []}
      />
    </AppLayout>
  );
}
