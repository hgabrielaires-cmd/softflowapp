import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { AlertTriangle, Eye, Clock } from "lucide-react";
import type { TicketAlerta } from "../types";

interface Props {
  alertas: TicketAlerta[] | undefined;
  loading: boolean;
  onVerTicket: (id: string) => void;
}

export function AlertasPanel({ alertas, loading, onVerTicket }: Props) {
  const items = alertas ?? [];

  return (
    <Card className="h-full">
      <CardHeader className="pb-3">
        <CardTitle className="text-sm font-semibold flex items-center gap-2">
          <AlertTriangle className="h-4 w-4 text-amber-500" />
          Requer Atenção
          {items.length > 0 && (
            <Badge variant="destructive" className="text-[10px] px-1.5 py-0">
              {items.length}
            </Badge>
          )}
        </CardTitle>
      </CardHeader>
      <CardContent className="p-0">
        <ScrollArea className="h-[340px] px-4 pb-4">
          {loading && <p className="text-sm text-muted-foreground p-2">Carregando...</p>}
          {!loading && items.length === 0 && (
            <p className="text-sm text-muted-foreground p-2">Nenhum alerta no momento 🎉</p>
          )}
          <div className="space-y-2">
            {items.map((a) => (
              <div
                key={a.id}
                className={`rounded-lg border p-3 flex items-start gap-3 ${
                  a.tipo === "sla_vencido"
                    ? "border-destructive/30 bg-red-50/50"
                    : "border-amber-300/50 bg-amber-50/50"
                }`}
              >
                <Clock className={`h-4 w-4 mt-0.5 shrink-0 ${
                  a.tipo === "sla_vencido" ? "text-destructive" : "text-amber-600"
                }`} />
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-semibold truncate">{a.numero_exibicao}</p>
                  <p className="text-xs text-muted-foreground truncate">{a.titulo}</p>
                  <p className={`text-[10px] font-medium mt-0.5 ${
                    a.tipo === "sla_vencido" ? "text-destructive" : "text-amber-600"
                  }`}>
                    {a.detalhe}
                  </p>
                </div>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-7 w-7 shrink-0"
                  onClick={() => onVerTicket(a.id)}
                >
                  <Eye className="h-3.5 w-3.5" />
                </Button>
              </div>
            ))}
          </div>
        </ScrollArea>
      </CardContent>
    </Card>
  );
}
