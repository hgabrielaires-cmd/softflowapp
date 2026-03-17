import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from "recharts";
import { BarChart3 } from "lucide-react";
import type { ComparativoSemana } from "../types";
import { COR_GANHO, COR_PERDIDO } from "../constants";

interface Props {
  data?: { atual: ComparativoSemana[]; anterior: ComparativoSemana[] };
  isLoading: boolean;
}

function CustomTooltip({ active, payload, label }: any) {
  if (!active || !payload?.length) return null;
  return (
    <div className="bg-popover border border-border rounded-lg shadow-lg p-3 text-xs">
      <p className="font-semibold mb-1">{label}</p>
      {payload.map((p: any) => (
        <div key={p.dataKey} className="flex items-center gap-2">
          <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: p.color }} />
          <span className="text-muted-foreground">{p.name}:</span>
          <span className="font-bold">{p.value}</span>
        </div>
      ))}
    </div>
  );
}

export function ComparativoPeriodoChart({ data, isLoading }: Props) {
  if (isLoading) {
    return (
      <Card className="border-none shadow-card">
        <CardHeader className="pb-2"><CardTitle className="text-sm">Comparativo</CardTitle></CardHeader>
        <CardContent><Skeleton className="h-56" /></CardContent>
      </Card>
    );
  }

  const atual = data?.atual || [];
  if (atual.length === 0) {
    return (
      <Card className="border-none shadow-card">
        <CardHeader className="pb-2">
          <div className="flex items-center gap-2">
            <BarChart3 className="h-4 w-4 text-primary" />
            <CardTitle className="text-sm">Comparativo por Semana</CardTitle>
          </div>
        </CardHeader>
        <CardContent>
          <p className="text-xs text-muted-foreground text-center py-8">Sem dados no período</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="border-none shadow-card">
      <CardHeader className="pb-2">
        <div className="flex items-center gap-2">
          <BarChart3 className="h-4 w-4 text-primary" />
          <CardTitle className="text-sm">Comparativo por Semana</CardTitle>
        </div>
      </CardHeader>
      <CardContent>
        <div className="h-56">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={atual} barGap={2} barSize={28}>
              <CartesianGrid strokeDasharray="3 3" className="opacity-30" />
              <XAxis dataKey="label" tick={{ fontSize: 11 }} />
              <YAxis tick={{ fontSize: 11 }} allowDecimals={false} domain={[0, 'auto']} />
              <Tooltip content={<CustomTooltip />} />
              <Legend wrapperStyle={{ fontSize: 11 }} />
              <Bar dataKey="ganhas" name="Ganhas" fill={COR_GANHO} radius={[4, 4, 0, 0]} minPointSize={3} />
              <Bar dataKey="perdidas" name="Perdidas" fill={COR_PERDIDO} radius={[4, 4, 0, 0]} minPointSize={3} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </CardContent>
    </Card>
  );
}
