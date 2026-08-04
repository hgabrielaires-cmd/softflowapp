import { Card } from "@/components/ui/card";
import { fmtCurrency, fmtDate, percentual } from "../helpers";
import type { DreGrupoReceita, DreSaldoConta } from "../types";

interface Props {
  saldos: DreSaldoConta[];
  grupos: DreGrupoReceita[];
  totalReceitas: number;
  hoje: string;
  onSelectGrupo: (g: DreGrupoReceita) => void;
}

export function ReceitasCard({ saldos, grupos, totalReceitas, hoje, onSelectGrupo }: Props) {
  const totalDisponivel = saldos.reduce((s, c) => s + c.saldo, 0);

  return (
    <Card className="rounded-xl border-l-4 border-l-green-500 p-4 space-y-4">
      <h2 className="text-lg font-semibold text-foreground">Receitas</h2>

      <div className="rounded-xl border border-green-500/60 bg-green-500/5 p-4">
        <p className="mb-2 text-sm font-semibold">🏦 Saldo Atual — {fmtDate(hoje)}</p>
        <div className="space-y-1 text-sm">
          {saldos.map((c) => (
            <div key={c.id} className="flex items-center justify-between">
              <span className="text-muted-foreground">{c.nome}</span>
              <span className={c.saldo >= 0 ? "font-medium text-green-600" : "font-medium text-red-600"}>
                {fmtCurrency(c.saldo)} {c.saldo >= 0 ? "🟢" : "🔴"}
              </span>
            </div>
          ))}
          {saldos.length === 0 && <p className="text-muted-foreground">Nenhuma conta ativa.</p>}
        </div>
        <div className="mt-2 flex items-center justify-between border-t border-border pt-2 text-sm font-bold">
          <span>Total disponível</span>
          <span className={totalDisponivel >= 0 ? "text-green-600" : "text-red-600"}>{fmtCurrency(totalDisponivel)}</span>
        </div>
      </div>

      <div className="space-y-2">
        <p className="text-sm font-semibold">📥 Entradas do período</p>
        {grupos.length === 0 && <p className="text-sm text-muted-foreground">Nenhuma entrada no período.</p>}
        {grupos.map((g) => {
          const pct = percentual(g.total, totalReceitas);
          return (
            <button
              key={g.chave}
              onClick={() => onSelectGrupo(g)}
              className="w-full rounded-lg px-2 py-2 text-left transition-colors hover:bg-muted/60"
            >
              <div className="flex items-center justify-between text-sm">
                <span>{g.label}</span>
                <span className="font-medium">
                  {fmtCurrency(g.total)} <span className="text-muted-foreground">{pct.toFixed(0)}%</span>
                </span>
              </div>
              <div className="mt-1 h-1.5 w-full overflow-hidden rounded-full bg-muted">
                <div className="h-full rounded-full bg-green-500 transition-all" style={{ width: `${pct}%` }} />
              </div>
            </button>
          );
        })}
      </div>

      <div className="flex items-center justify-between border-t border-border pt-3 text-base font-bold">
        <span>Total Receitas</span>
        <span className="text-green-600">{fmtCurrency(totalReceitas)}</span>
      </div>
    </Card>
  );
}
