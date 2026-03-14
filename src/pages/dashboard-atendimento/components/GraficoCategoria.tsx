import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ChartContainer, ChartTooltip, ChartTooltipContent } from "@/components/ui/chart";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid } from "recharts";
import type { TicketPorCategoria } from "../types";

interface Props {
  data: TicketPorCategoria[] | undefined;
  loading: boolean;
}

const chartConfig = {
  total: { label: "Tickets", color: "hsl(210, 90%, 45%)" },
};

export function GraficoCategoria({ data, loading }: Props) {
  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-sm font-semibold">Tickets por Mesa (30 dias)</CardTitle>
      </CardHeader>
      <CardContent className="pt-0">
        {loading && <p className="text-sm text-muted-foreground">Carregando...</p>}
        {!loading && (data ?? []).length === 0 && (
          <p className="text-sm text-muted-foreground">Sem dados no período</p>
        )}
        {!loading && (data ?? []).length > 0 && (
          <ChartContainer config={chartConfig} className="h-[200px] w-full">
            <BarChart data={data} margin={{ top: 5, right: 5, bottom: 5, left: 0 }}>
              <CartesianGrid strokeDasharray="3 3" vertical={false} />
              <XAxis dataKey="categoria" tick={{ fontSize: 11 }} />
              <YAxis tick={{ fontSize: 11 }} allowDecimals={false} />
              <ChartTooltip content={<ChartTooltipContent />} />
              <Bar dataKey="total" fill="hsl(210, 90%, 45%)" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ChartContainer>
        )}
      </CardContent>
    </Card>
  );
}
