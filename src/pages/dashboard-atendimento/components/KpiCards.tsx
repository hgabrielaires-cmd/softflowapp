import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Ticket, AlertTriangle, CheckCircle2, Clock } from "lucide-react";
import type { DashKpi } from "../types";

interface Props {
  kpis: DashKpi | undefined;
  loading: boolean;
}

export function KpiCards({ kpis, loading }: Props) {
  const items = [
    {
      label: "Tickets Abertos",
      value: kpis?.totalAbertos ?? 0,
      icon: Ticket,
      iconClass: "text-[hsl(var(--accent-emerald))]",
      bgClass: "bg-[hsl(var(--accent-emerald-light))]",
    },
    {
      label: "SLA Vencido",
      value: kpis?.slaVencido ?? 0,
      icon: AlertTriangle,
      iconClass: "text-destructive",
      bgClass: "bg-red-50",
      badge: true,
    },
    {
      label: "Resolvidos Hoje",
      value: kpis?.resolvidosHoje ?? 0,
      icon: CheckCircle2,
      iconClass: "text-emerald-600",
      bgClass: "bg-emerald-50",
    },
    {
      label: "Tempo Médio Resolução",
      value: kpis?.tempoMedioResolucao ? `${kpis.tempoMedioResolucao}h` : "0h",
      icon: Clock,
      iconClass: "text-[hsl(var(--accent-emerald))]",
      bgClass: "bg-[hsl(var(--accent-emerald-light))]",
      isText: true,
    },
  ];

  return (
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
      {items.map((item) => (
        <Card key={item.label} className="relative overflow-hidden">
          <CardContent className="p-4 flex items-center gap-3">
            <div className={`p-2.5 rounded-lg ${item.bgClass}`}>
              <item.icon className={`h-5 w-5 ${item.iconClass}`} />
            </div>
            <div className="min-w-0">
              <p className="text-xs text-muted-foreground truncate">{item.label}</p>
              <div className="flex items-center gap-2">
                <span className="text-2xl font-bold text-foreground">
                  {loading ? "..." : item.isText ? item.value : item.value}
                </span>
                {item.badge && !loading && (kpis?.slaVencido ?? 0) > 0 && (
                  <Badge variant="destructive" className="text-[10px] px-1.5 py-0 animate-pulse">
                    {kpis?.slaVencido}
                  </Badge>
                )}
              </div>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
