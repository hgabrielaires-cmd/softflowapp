import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Eye } from "lucide-react";
import type { TicketAntigo } from "../types";

const PRIORIDADE_COLORS: Record<string, string> = {
  "Baixa": "bg-blue-100 text-blue-700",
  "Média": "bg-amber-100 text-amber-700",
  "Alta": "bg-orange-100 text-orange-700",
  "Crítica": "bg-red-100 text-red-700",
};

interface Props {
  tickets: TicketAntigo[] | undefined;
  loading: boolean;
  onVerTicket: (id: string) => void;
}

export function TicketsAntigos({ tickets, loading, onVerTicket }: Props) {
  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-sm font-semibold">Tickets Mais Antigos em Aberto</CardTitle>
      </CardHeader>
      <CardContent className="pt-0">
        {loading && <p className="text-sm text-muted-foreground">Carregando...</p>}
        {!loading && (tickets ?? []).length === 0 && (
          <p className="text-sm text-muted-foreground">Nenhum ticket aberto 🎉</p>
        )}
        <div className="space-y-2">
          {(tickets ?? []).map((t) => (
            <div key={t.id} className="flex items-center gap-3 rounded-lg border p-2.5">
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <span className="text-xs font-semibold text-muted-foreground">{t.numero_exibicao}</span>
                  <Badge variant="outline" className={`text-[10px] px-1.5 py-0 ${PRIORIDADE_COLORS[t.prioridade] || ""}`}>
                    {t.prioridade}
                  </Badge>
                </div>
                <p className="text-sm font-medium truncate">{t.titulo}</p>
                <p className="text-xs text-muted-foreground">
                  {t.cliente_nome || "Sem cliente"} · {t.dias_aberto}d aberto
                </p>
              </div>
              <Button variant="ghost" size="icon" className="h-7 w-7 shrink-0" onClick={() => onVerTicket(t.id)}>
                <Eye className="h-3.5 w-3.5" />
              </Button>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
