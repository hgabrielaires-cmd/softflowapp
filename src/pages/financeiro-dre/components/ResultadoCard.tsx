import { Card } from "@/components/ui/card";
import { fmtCurrency, percentual } from "../helpers";

interface Props {
  totalReceitas: number;
  totalDespesas: number;
  totalSemCategoria: number;
}

export function ResultadoCard({ totalReceitas, totalDespesas, totalSemCategoria }: Props) {
  const resultado = totalReceitas - totalDespesas;
  const margem = percentual(resultado, totalReceitas);
  const positivo = resultado >= 0;

  return (
    <Card className="rounded-xl bg-primary p-5 text-primary-foreground">
      <p className="mb-4 text-sm font-semibold">📊 Resultado do período</p>
      <div className="space-y-2 text-sm">
        <div className="flex justify-between">
          <span className="opacity-80">Total Receitas</span>
          <span className="font-medium">{fmtCurrency(totalReceitas)}</span>
        </div>
        <div className="flex justify-between">
          <span className="opacity-80">Total Despesas</span>
          <span className="font-medium">-{fmtCurrency(totalDespesas)}</span>
        </div>
        <div className="my-2 border-t border-primary-foreground/20" />
        <div className="flex justify-between text-lg font-bold">
          <span>Resultado</span>
          <span>
            {fmtCurrency(resultado)} {positivo ? "🟢" : "🔴"}
          </span>
        </div>
        <div className="flex justify-between">
          <span className="opacity-80">Margem</span>
          <span className="font-medium">{margem.toFixed(1)}%</span>
        </div>
        {totalSemCategoria > 0 && (
          <div className="mt-3 rounded-lg bg-amber-500/20 p-3">
            <div className="flex justify-between text-sm font-semibold">
              <span>⚠️ Não categorizados</span>
              <span>{fmtCurrency(totalSemCategoria)}</span>
            </div>
            <p className="text-xs opacity-80">(incluído nas despesas apenas se categorizado)</p>
          </div>
        )}
      </div>
    </Card>
  );
}
