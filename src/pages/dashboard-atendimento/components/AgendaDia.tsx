import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Calendar, Clock } from "lucide-react";

interface Agendamento {
  id: string;
  titulo: string | null;
  data: string;
  hora_inicio: string | null;
  hora_fim: string | null;
  origem: string;
}

interface Props {
  agendamentos: Agendamento[] | undefined;
  loading: boolean;
}

export function AgendaDia({ agendamentos, loading }: Props) {
  const items = agendamentos ?? [];

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-sm font-semibold flex items-center gap-2">
          <Calendar className="h-4 w-4 text-[hsl(var(--accent-emerald))]" />
          Agenda do Dia
        </CardTitle>
      </CardHeader>
      <CardContent className="pt-0">
        {loading && <p className="text-sm text-muted-foreground">Carregando...</p>}
        {!loading && items.length === 0 && (
          <p className="text-sm text-muted-foreground">Nenhum compromisso hoje</p>
        )}
        <div className="space-y-2">
          {items.map((ag) => (
            <div key={ag.id} className="flex items-center gap-3 rounded-lg border p-2.5">
              <Clock className="h-4 w-4 text-muted-foreground shrink-0" />
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium truncate">{ag.titulo || "Sem título"}</p>
                <p className="text-xs text-muted-foreground">
                  {ag.hora_inicio?.slice(0, 5) || "--:--"}
                  {ag.hora_fim ? ` - ${ag.hora_fim.slice(0, 5)}` : ""}
                  {" · "}
                  {ag.origem === "ticket" ? "Ticket" : "Atendimento"}
                </p>
              </div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
