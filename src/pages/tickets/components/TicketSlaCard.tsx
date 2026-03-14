import { cn } from "@/lib/utils";
import { calcSla } from "../helpers";
import { Progress } from "@/components/ui/progress";
import { Clock } from "lucide-react";

interface Props {
  slaDeadline: string | null;
  slaHoras: number;
}

export function TicketSlaCard({ slaDeadline, slaHoras }: Props) {
  const sla = calcSla(slaDeadline, slaHoras);

  const progressColor =
    sla.color === "green" ? "[&>div]:bg-emerald-500" :
    sla.color === "yellow" ? "[&>div]:bg-amber-500" :
    "[&>div]:bg-red-500";

  const statusLabel = sla.vencido ? "Vencido" : sla.color === "red" ? "Em risco" : "No prazo";
  const statusColor = sla.vencido ? "text-red-600" : sla.color === "red" ? "text-red-600" : sla.color === "yellow" ? "text-amber-600" : "text-emerald-600";

  return (
    <div className="bg-card rounded-xl border p-4 space-y-3">
      <div className="flex items-center gap-2">
        <Clock className="h-4 w-4 text-muted-foreground" />
        <span className="text-sm font-semibold">SLA</span>
      </div>

      <Progress value={sla.percent} className={cn("h-2", progressColor)} />

      <div className="flex items-center justify-between">
        <span className={cn("text-sm font-medium", sla.vencido && "animate-pulse", statusColor)}>
          {sla.remaining}
        </span>
        <span className={cn("text-xs font-medium", statusColor)}>{statusLabel}</span>
      </div>

      {slaDeadline && (
        <p className="text-xs text-muted-foreground">
          Limite: {new Date(slaDeadline).toLocaleString("pt-BR")}
        </p>
      )}
    </div>
  );
}
