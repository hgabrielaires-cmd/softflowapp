import { useState } from "react";
import { Card } from "@/components/ui/card";
import { ChevronRight, AlertTriangle } from "lucide-react";
import { fmtCurrency, percentual } from "../helpers";
import type { DreGrupoDespesa, DreLancamento, DreSubgrupo } from "../types";

interface Props {
  grupos: DreGrupoDespesa[];
  totalDespesas: number;
  semCategoria: DreLancamento[];
  totalSemCategoria: number;
  onSelectSub: (s: DreSubgrupo) => void;
  onSelectSemCategoria: () => void;
}

export function DespesasCard({
  grupos,
  totalDespesas,
  semCategoria,
  totalSemCategoria,
  onSelectSub,
  onSelectSemCategoria,
}: Props) {
  const [abertos, setAbertos] = useState<Record<string, boolean>>({});

  return (
    <Card className="rounded-xl border-l-4 border-l-red-500 p-4 space-y-3">
      <h2 className="text-lg font-semibold text-foreground">Despesas</h2>

      {grupos.length === 0 && <p className="text-sm text-muted-foreground">Nenhuma despesa no período.</p>}

      {grupos.map((g) => {
        const aberto = !!abertos[g.id];
        const pct = percentual(g.total, totalDespesas);
        return (
          <div key={g.id} className="rounded-lg border border-border">
            <button
              onClick={() => setAbertos((a) => ({ ...a, [g.id]: !aberto }))}
              className="flex w-full items-center gap-2 rounded-lg bg-muted/40 px-3 py-2 text-left transition-colors hover:bg-muted/70"
            >
              <ChevronRight
                className="h-4 w-4 shrink-0 transition-transform duration-200"
                style={{ transform: aberto ? "rotate(90deg)" : "none" }}
              />
              <span className="flex-1 text-sm font-semibold">
                {g.codigo} — {g.nome}
              </span>
              <span className="text-sm font-semibold text-red-600">{fmtCurrency(g.total)}</span>
              <span className="w-12 text-right text-xs text-muted-foreground">{pct.toFixed(0)}%</span>
            </button>

            {aberto && (
              <div className="space-y-1 p-2">
                {g.subgrupos.map((s) => {
                  const sp = percentual(s.total, totalDespesas);
                  return (
                    <button
                      key={s.id}
                      onClick={() => onSelectSub(s)}
                      className="w-full rounded-md py-1.5 pl-6 pr-2 text-left transition-colors hover:bg-muted/60"
                    >
                      <div className="flex items-center gap-3 text-sm">
                        <span className="flex-1">
                          {s.codigo} — {s.nome}
                        </span>
                        <span className="font-medium text-red-600">{fmtCurrency(s.total)}</span>
                        <span className="w-12 text-right text-xs text-muted-foreground">{sp.toFixed(0)}%</span>
                      </div>
                      <div className="ml-0 mt-1 h-1.5 w-full overflow-hidden rounded-full bg-muted">
                        <div className="h-full rounded-full bg-red-500 transition-all" style={{ width: `${sp}%` }} />
                      </div>
                    </button>
                  );
                })}
              </div>
            )}
          </div>
        );
      })}

      {semCategoria.length > 0 && (
        <button
          onClick={onSelectSemCategoria}
          className="w-full rounded-lg border border-amber-500/60 bg-amber-500/5 px-3 py-2 text-left transition-colors hover:bg-amber-500/10"
        >
          <div className="flex items-center gap-2 text-sm font-semibold">
            <AlertTriangle className="h-4 w-4 text-amber-500" />
            <span className="flex-1">Sem categoria</span>
            <span className="text-amber-600">{fmtCurrency(totalSemCategoria)}</span>
          </div>
          <p className="pl-6 text-xs text-muted-foreground">Clique para ver e categorizar</p>
        </button>
      )}

      <div className="flex items-center justify-between border-t border-border pt-3 text-base font-bold">
        <span>Total Despesas</span>
        <span className="text-red-600">{fmtCurrency(totalDespesas)}</span>
      </div>
    </Card>
  );
}
