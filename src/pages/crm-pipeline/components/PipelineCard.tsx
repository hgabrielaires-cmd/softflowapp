import { Badge } from "@/components/ui/badge";
import { User, Building2, Clock, DollarSign, AlertTriangle, ListChecks } from "lucide-react";
import type { CrmOportunidade, CrmEtapaSimples } from "../types";
import { formatValor, getTempoDesdeCreacao } from "../helpers";

interface PipelineCardProps {
  oportunidade: CrmOportunidade;
  etapa?: CrmEtapaSimples;
  onDragStart: (id: string) => void;
  onClick: (oportunidade: CrmOportunidade) => void;
}

export function PipelineCard({ oportunidade, etapa, onDragStart, onClick }: PipelineCardProps) {
  const tarefaStatus = oportunidade.tarefas_status || "sem_tarefa";

  return (
    <div
      draggable
      onDragStart={() => onDragStart(oportunidade.id)}
      onClick={() => onClick(oportunidade)}
      className="bg-card rounded-lg border border-border/50 shadow-[0_2px_8px_-2px_rgba(0,0,0,0.12)] cursor-pointer hover:shadow-[0_4px_16px_-4px_rgba(0,0,0,0.18)] transition-all duration-150 border-t-[3px]"
      style={{ borderTopColor: etapa?.cor || "hsl(var(--muted))" }}
    >
      <div className="p-3 space-y-2">
        {/* Title */}
        <p className="font-semibold text-sm text-foreground leading-tight truncate">
          {oportunidade.titulo}
        </p>

        {/* Task status indicator */}
        {tarefaStatus !== "ok" && (
          <div className="flex items-center gap-1.5">
            {tarefaStatus === "sem_tarefa" && (
              <>
                <ListChecks className="h-3.5 w-3.5 text-amber-500 shrink-0" />
                <span className="text-[10px] text-amber-600">Sem tarefas</span>
              </>
            )}
            {tarefaStatus === "vencida" && (
              <>
                <AlertTriangle className="h-3.5 w-3.5 text-destructive shrink-0" />
                <span className="text-[10px] text-destructive">Tarefa vencida</span>
              </>
            )}
          </div>
        )}

        {/* Client */}
        {oportunidade.clientes && (
          <div className="flex items-center gap-1 text-[11px] text-muted-foreground">
            <Building2 className="h-3 w-3" />
            <span className="truncate">{oportunidade.clientes.apelido || oportunidade.clientes.nome_fantasia}</span>
          </div>
        )}

        {/* Value */}
        {oportunidade.valor > 0 && (
          <div className="flex items-center gap-1 text-[11px] font-semibold text-emerald-600">
            <DollarSign className="h-3 w-3" />
            {formatValor(oportunidade.valor)}
          </div>
        )}

        {/* Origin badge */}
        {oportunidade.origem && (
          <Badge variant="outline" className="text-[10px] px-1.5 py-0">
            {oportunidade.origem}
          </Badge>
        )}

        {/* Footer */}
        <div className="flex items-center justify-between pt-1 border-t border-border/40">
          <div className="flex items-center gap-1 text-[11px] text-muted-foreground">
            <User className="h-3 w-3" />
            <span className="truncate">
              {oportunidade.profiles?.full_name?.split(" ")[0] || "Sem responsável"}
            </span>
          </div>
          <div className="flex items-center gap-1 text-[10px] text-muted-foreground">
            <Clock className="h-3 w-3" />
            {getTempoDesdeCreacao(oportunidade)}
          </div>
        </div>
      </div>
    </div>
  );
}
