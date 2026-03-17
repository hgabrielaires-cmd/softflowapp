import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { CalendarDays, AlertTriangle, CheckCircle2, Ban } from "lucide-react";
import type { TarefasAnalise as TarefasType } from "../types";

export function AnaliseTarefasPanel({ data, isLoading }: { data?: TarefasType; isLoading: boolean }) {
  if (isLoading) {
    return (
      <Card className="border-none shadow-card h-full">
        <CardHeader className="pb-2"><CardTitle className="text-sm">Análise de Tarefas</CardTitle></CardHeader>
        <CardContent><Skeleton className="h-48" /></CardContent>
      </Card>
    );
  }
  if (!data) return null;

  const miniCards = [
    { icon: CalendarDays, label: "Agendadas", value: data.agendadas, color: "text-blue-600", bg: "bg-blue-500/10" },
    { icon: AlertTriangle, label: "Atrasadas", value: data.atrasadas, color: "text-red-600", bg: "bg-red-500/10", badge: data.diasMedioAtraso > 0 ? `~${data.diasMedioAtraso}d` : undefined },
    { icon: CheckCircle2, label: "Concluídas", value: data.concluidas, color: "text-emerald-600", bg: "bg-emerald-500/10" },
    { icon: Ban, label: "Sem Tarefa", value: data.semTarefa, color: "text-amber-600", bg: "bg-amber-500/10" },
  ];

  return (
    <Card className="border-none shadow-card h-full">
      <CardHeader className="pb-2">
        <CardTitle className="text-sm">📋 Análise de Tarefas</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid grid-cols-2 gap-2">
          {miniCards.map(c => (
            <div key={c.label} className={`rounded-lg p-3 ${c.bg}`}>
              <div className="flex items-center gap-1.5">
                <c.icon className={`h-3.5 w-3.5 ${c.color}`} />
                <span className="text-[10px] text-muted-foreground">{c.label}</span>
              </div>
              <div className="flex items-center gap-1.5 mt-1">
                <span className="text-lg font-bold text-foreground">{c.value}</span>
                {c.badge && <Badge variant="destructive" className="text-[9px] h-4">{c.badge}</Badge>}
              </div>
            </div>
          ))}
        </div>

        {data.porEtapa.length > 0 && (
          <div>
            <p className="text-xs font-semibold text-muted-foreground mb-1.5">Por Etapa do Funil</p>
            <div className="max-h-36 overflow-y-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="text-[10px] h-7">Etapa</TableHead>
                    <TableHead className="text-[10px] h-7 text-center">📅</TableHead>
                    <TableHead className="text-[10px] h-7 text-center">⚠️</TableHead>
                    <TableHead className="text-[10px] h-7 text-center">🚫</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {data.porEtapa.map(e => (
                    <TableRow key={e.etapa_id} className={e.atrasadas > 0 ? "bg-red-50 dark:bg-red-950/20" : ""}>
                      <TableCell className="text-xs py-1.5">{e.etapa_nome}</TableCell>
                      <TableCell className="text-xs text-center py-1.5">{e.agendadas}</TableCell>
                      <TableCell className="text-xs text-center py-1.5 font-semibold text-red-600">{e.atrasadas || "-"}</TableCell>
                      <TableCell className="text-xs text-center py-1.5">{e.semTarefa || "-"}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
