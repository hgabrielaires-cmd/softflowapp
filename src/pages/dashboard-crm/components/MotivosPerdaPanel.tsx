import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip } from "recharts";
import { CircleSlash } from "lucide-react";
import type { MotivoPerda } from "../types";

const COLORS = ["#EF4444", "#F97316", "#F59E0B", "#8B5CF6", "#6366F1", "#3B82F6", "#14B8A6"];

export function MotivosPerdaPanel({ data, isLoading }: { data?: MotivoPerda[]; isLoading: boolean }) {
  if (isLoading) {
    return (
      <Card className="border-none shadow-card h-full">
        <CardHeader className="pb-2"><CardTitle className="text-sm">Motivos de Perda</CardTitle></CardHeader>
        <CardContent><Skeleton className="h-48" /></CardContent>
      </Card>
    );
  }

  const items = data || [];
  const total = items.reduce((s, m) => s + m.quantidade, 0);

  return (
    <Card className="border-none shadow-card h-full">
      <CardHeader className="pb-2">
        <div className="flex items-center gap-2">
          <CircleSlash className="h-4 w-4 text-red-500" />
          <CardTitle className="text-sm">Motivos de Perda</CardTitle>
        </div>
      </CardHeader>
      <CardContent>
        {items.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-8 text-muted-foreground">
            <span className="text-3xl mb-2">🎉</span>
            <p className="text-sm">Nenhuma perda no período!</p>
          </div>
        ) : (
          <div className="flex items-start gap-4">
            <div className="relative w-36 h-36 shrink-0">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={items}
                    dataKey="quantidade"
                    nameKey="motivo"
                    cx="50%"
                    cy="50%"
                    innerRadius={35}
                    outerRadius={60}
                    paddingAngle={2}
                  >
                    {items.map((_, i) => (
                      <Cell key={i} fill={COLORS[i % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip formatter={(val: number) => [`${val}`, "Qtd"]} />
                </PieChart>
              </ResponsiveContainer>
              <div className="absolute inset-0 flex items-center justify-center">
                <span className="text-lg font-bold text-foreground">{total}</span>
              </div>
            </div>
            <div className="flex-1 space-y-1.5">
              {items.map((m, i) => (
                <div key={m.motivo} className="flex items-center gap-2 text-xs">
                  <span className="h-2.5 w-2.5 rounded-full shrink-0" style={{ backgroundColor: COLORS[i % COLORS.length] }} />
                  <span className="flex-1 truncate">{m.motivo}</span>
                  <span className="text-muted-foreground">{m.quantidade}</span>
                  <span className="font-semibold w-10 text-right">{m.percentual.toFixed(0)}%</span>
                </div>
              ))}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
