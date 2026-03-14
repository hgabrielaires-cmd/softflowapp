import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import type { KanbanResumo } from "../types";

interface Props {
  data: KanbanResumo[] | undefined;
  loading: boolean;
}

export function KanbanMini({ data, loading }: Props) {
  const items = data ?? [];
  const total = items.reduce((s, i) => s + i.total, 0);

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-sm font-semibold">Resumo Kanban</CardTitle>
      </CardHeader>
      <CardContent className="pt-0">
        {loading && <p className="text-sm text-muted-foreground">Carregando...</p>}
        {!loading && (
          <div className="space-y-3">
            {items.map((item) => {
              const pct = total > 0 ? Math.round((item.total / total) * 100) : 0;
              return (
                <div key={item.status}>
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-xs font-medium">{item.status}</span>
                    <span className="text-xs font-bold">{item.total}</span>
                  </div>
                  <div className="h-2 rounded-full bg-muted overflow-hidden">
                    <div
                      className="h-full rounded-full transition-all"
                      style={{ width: `${pct}%`, backgroundColor: item.cor }}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
