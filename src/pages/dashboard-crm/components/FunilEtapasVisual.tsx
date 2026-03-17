import { Skeleton } from "@/components/ui/skeleton";
import { ArrowRight } from "lucide-react";
import type { EtapaFunil } from "../types";
import { formatValor } from "../helpers";

export function FunilEtapasVisual({ data, isLoading }: { data?: EtapaFunil[]; isLoading: boolean }) {
  if (isLoading) {
    return (
      <div className="flex gap-2 overflow-x-auto py-2">
        {[1, 2, 3, 4].map(i => <Skeleton key={i} className="h-24 min-w-[160px]" />)}
      </div>
    );
  }

  const items = data || [];
  if (items.length === 0) return <p className="text-xs text-muted-foreground text-center py-4">Nenhuma etapa</p>;
  const maxQtd = Math.max(...items.map(e => e.quantidade), 1);

  return (
    <div className="flex gap-1.5 overflow-x-auto pb-1">
      {items.map((etapa, i) => (
        <div key={etapa.id} className="flex items-center gap-1">
          <div
            className="min-w-[140px] rounded-xl p-3 border transition-transform hover:scale-[1.02]"
            style={{
              borderColor: etapa.cor + "60",
              background: `linear-gradient(135deg, ${etapa.cor}15, ${etapa.cor}08)`,
            }}
          >
            <div className="flex items-center gap-1.5 mb-2">
              <span className="h-2.5 w-2.5 rounded-full shrink-0" style={{ backgroundColor: etapa.cor }} />
              <span className="text-xs font-semibold truncate">{etapa.nome}</span>
            </div>
            <p className="text-xl font-bold text-foreground">{etapa.quantidade}</p>
            <p className="text-[10px] text-muted-foreground">{formatValor(etapa.valorTotal)}</p>
            <div className="mt-2 h-1.5 rounded-full bg-muted overflow-hidden">
              <div
                className="h-full rounded-full transition-all"
                style={{ width: `${(etapa.quantidade / maxQtd) * 100}%`, backgroundColor: etapa.cor }}
              />
            </div>
          </div>
          {i < items.length - 1 && <ArrowRight className="h-4 w-4 text-muted-foreground/50 shrink-0" />}
        </div>
      ))}
    </div>
  );
}
