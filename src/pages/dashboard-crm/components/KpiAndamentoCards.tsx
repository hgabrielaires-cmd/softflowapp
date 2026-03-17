import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Briefcase, CalendarClock, CalendarCheck2, CalendarX } from "lucide-react";
import type { KpiAndamento as KpiType } from "../types";
import { formatValor } from "../helpers";

export function KpiAndamentoCards({ data, isLoading }: { data?: KpiType; isLoading: boolean }) {
  if (isLoading) {
    return (
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {[1, 2, 3, 4].map(i => (
          <Card key={i}><CardContent className="p-4"><Skeleton className="h-16" /></CardContent></Card>
        ))}
      </div>
    );
  }
  if (!data) return null;

  const cards = [
    {
      icon: Briefcase, iconBg: "bg-primary/10", iconColor: "text-primary",
      label: "Em Andamento", value: data.totalAndamento.toString(),
      sub: formatValor(data.valorTotalPipeline),
    },
    {
      icon: CalendarClock, iconBg: "bg-blue-500/10", iconColor: "text-blue-600",
      label: "Previsão Este Mês", value: data.previsaoEsteMes.toString(),
      sub: formatValor(data.valorPrevisaoEsteMes),
    },
    {
      icon: CalendarCheck2, iconBg: "bg-emerald-500/10", iconColor: "text-emerald-600",
      label: "Previsão Próx. Mês", value: data.previsaoProximoMes.toString(),
      sub: formatValor(data.valorPrevisaoProximoMes),
    },
    {
      icon: CalendarX, iconBg: "bg-amber-500/10", iconColor: "text-amber-600",
      label: "Sem Previsão", value: data.semPrevisao.toString(),
      sub: `${data.semPrevisao} oportunidade${data.semPrevisao !== 1 ? "s" : ""}`,
    },
  ];

  return (
    <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
      {cards.map(c => (
        <Card key={c.label} className="border-none shadow-card">
          <CardContent className="p-4">
            <div className="flex items-center gap-2 mb-2">
              <div className={`p-1.5 rounded-lg ${c.iconBg}`}>
                <c.icon className={`h-4 w-4 ${c.iconColor}`} />
              </div>
              <span className="text-xs text-muted-foreground font-medium">{c.label}</span>
            </div>
            <p className="text-2xl font-bold text-foreground">{c.value}</p>
            <p className="text-xs text-muted-foreground mt-0.5">{c.sub}</p>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
