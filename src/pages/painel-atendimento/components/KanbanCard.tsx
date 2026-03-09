import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Clock, Building2, User, AlertTriangle, PauseCircle, Ban } from "lucide-react";
import { cn } from "@/lib/utils";
import type { PainelCard, PainelEtapa } from "../types";
import { TIPO_ICONS, TIPO_COLORS } from "../constants";
import { PRIORIDADE_DISPLAY } from "../types";
import {
  getTempoNaEtapa, isInicioAtrasado, getTempoRestante, getTempoAtraso,
  isEtapaSlaAtrasado, getTempoExcedidoSla, calcProgress,
} from "../helpers";

interface KanbanCardProps {
  card: PainelCard;
  etapas: PainelEtapa[];
  jornadaSlaMap: Record<string, Record<string, number>>;
  totalChecklistPorPlano: Record<string, number>;
  cardProgressMap: Record<string, number>;
  cardApontamentosMap: Record<string, string[]>;
  pedidoPrioridadeMap: Record<string, string>;
  responsaveis: any[];
  onDragStart: (cardId: string) => void;
  onClick: (card: PainelCard) => void;
}

export function KanbanCard({
  card, etapas, jornadaSlaMap, totalChecklistPorPlano, cardProgressMap,
  cardApontamentosMap, pedidoPrioridadeMap, responsaveis,
  onDragStart, onClick,
}: KanbanCardProps) {
  const progress = calcProgress(card, totalChecklistPorPlano, cardProgressMap);
  const etapa = etapas.find((e) => e.id === card.etapa_id);

  return (
    <div
      draggable
      onDragStart={() => onDragStart(card.id)}
      onClick={() => onClick(card)}
      className="bg-card rounded-lg border border-border/50 shadow-[0_2px_8px_-2px_rgba(0,0,0,0.12)] cursor-pointer hover:shadow-[0_4px_16px_-4px_rgba(0,0,0,0.18)] transition-all duration-150 border-t-[3px]"
      style={{ borderTopColor: etapa?.cor || 'hsl(var(--muted))' }}
    >
      <div className="p-3 space-y-2.5">
        {/* Header + Progress */}
        <div>
          <div className="flex items-start justify-between gap-2">
            <p className="font-semibold text-sm text-foreground leading-tight truncate flex-1">
              {card.clientes?.nome_fantasia || "Cliente"}
            </p>
            <span className="text-[10px] text-muted-foreground font-mono shrink-0">
              {card.contratos?.numero_exibicao}
            </span>
          </div>
          <div className="flex items-center gap-2 mt-1.5">
            <Progress value={progress} className="h-1.5 flex-1" />
            <span className="text-[10px] font-semibold text-muted-foreground shrink-0">{progress}%</span>
          </div>
        </div>

        {/* Status tags */}
        <div className="flex items-center gap-1.5 flex-wrap">
          {(card as any).status_projeto === "recusado" && (
            <Badge className="text-[10px] px-1.5 py-0 gap-1 bg-red-100 text-red-700 border-red-200" variant="outline">
              <Ban className="h-2.5 w-2.5" />
              Recusado
            </Badge>
          )}
          {card.pausado && (card as any).status_projeto !== "recusado" && (
            <Badge className="text-[10px] px-1.5 py-0 gap-1 bg-amber-100 text-amber-700 border-amber-200" variant="outline">
              <PauseCircle className="h-2.5 w-2.5" />
              Pausado
            </Badge>
          )}
          {!card.pausado && isInicioAtrasado(card, etapas) && (
            <Badge variant="destructive" className="text-[10px] px-1.5 py-0 gap-1">
              <AlertTriangle className="h-2.5 w-2.5" />
              Atrasada {getTempoAtraso(card, etapas)}
            </Badge>
          )}
          {!card.pausado && isEtapaSlaAtrasado(card, jornadaSlaMap, etapas) && (
            <Badge variant="destructive" className="text-[10px] px-1.5 py-0 gap-1">
              <Clock className="h-2.5 w-2.5" />
              SLA {getTempoExcedidoSla(card, jornadaSlaMap, etapas)}
            </Badge>
          )}
        </div>

        {/* Type + Priority */}
        <div className="flex items-center gap-1.5 flex-wrap">
          <Badge variant="outline" className={cn("text-[10px] px-1.5 py-0 gap-1", TIPO_COLORS[card.tipo_operacao] || "")}>
            {TIPO_ICONS[card.tipo_operacao]}
            {card.tipo_operacao}
          </Badge>
          {(() => {
            const pri = card.pedido_id ? pedidoPrioridadeMap[card.pedido_id] : null;
            if (!pri || pri === "normal") return null;
            const display = PRIORIDADE_DISPLAY[pri];
            if (!display) return null;
            return (
              <Badge variant="outline" className={cn("text-[10px] px-1.5 py-0 gap-1", display.className)}>
                {display.emoji} {display.label}
              </Badge>
            );
          })()}
        </div>

        {/* Info row */}
        <div className="flex items-center gap-3 text-[11px] text-muted-foreground">
          <span className="flex items-center gap-1">
            <Building2 className="h-3 w-3" />
            {card.filiais?.nome || "—"}
          </span>
        </div>

        {/* Countdown SLA */}
        {(() => {
          const tempo = getTempoRestante(card, etapas);
          return tempo ? (
            <div className="flex items-center gap-1 text-[10px] text-amber-600 font-medium">
              <Clock className="h-2.5 w-2.5" />
              Vence em {tempo}h
            </div>
          ) : null;
        })()}

        {/* Footer */}
        <div className="flex items-center justify-between pt-1 border-t border-border/40">
          <div className="flex items-center gap-1.5 flex-wrap">
            {card.pausado ? (
              <Badge variant="secondary" className="text-[10px] px-1.5 py-0 gap-1">
                <User className="h-2.5 w-2.5" />
                {(() => {
                  const pausadoPorProf = responsaveis.find((r: any) => r.id === card.pausado_por || r.user_id === card.pausado_por);
                  const pausadoPorNome = (pausadoPorProf as any)?.full_name?.split(" ")[0] || "";
                  const apontados = cardApontamentosMap[card.id] || [];
                  const parts = [pausadoPorNome, ...apontados].filter(Boolean);
                  return parts.length > 0 ? parts.join(", ") : "—";
                })()}
              </Badge>
            ) : (
              <Badge variant="secondary" className="text-[10px] px-1.5 py-0 gap-1">
                <User className="h-2.5 w-2.5" />
                {(() => {
                  const respNome = card.profiles?.full_name?.split(" ")[0] || "";
                  const apontados = cardApontamentosMap[card.id] || [];
                  if (respNome && apontados.length > 0) return `${respNome}, ${apontados.join(", ")}`;
                  if (respNome) return respNome;
                  if (apontados.length > 0) return apontados.join(", ");
                  return "Sem responsável";
                })()}
              </Badge>
            )}
          </div>
          <div className="flex items-center gap-2">
            <div className="flex items-center gap-1 text-[10px] text-muted-foreground" title="Tempo nesta etapa">
              <Clock className="h-3 w-3" />
              {getTempoNaEtapa(card)}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
