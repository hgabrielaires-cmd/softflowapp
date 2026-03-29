import { cn } from "@/lib/utils";
import { Ticket, TicketSeguidor } from "../types";
import { TICKET_PRIORIDADE_COLORS } from "../constants";
import { calcSla, formatDate } from "../helpers";
import { UserAvatar } from "@/components/UserAvatar";
import { Badge } from "@/components/ui/badge";
import { Paperclip, Building2, MessageSquare } from "lucide-react";
import { Draggable } from "@hello-pangea/dnd";

interface Props {
  ticket: Ticket;
  index: number;
  seguidores: TicketSeguidor[];
  anexosCount: number;
  onClick: () => void;
}

export function TicketKanbanCard({ ticket, index, seguidores, anexosCount, onClick }: Props) {
  const sla = calcSla(ticket.sla_deadline, ticket.sla_horas);

  const slaColorClass =
    sla.color === "green" ? "text-emerald-600" :
    sla.color === "yellow" ? "text-amber-600" :
    "text-red-600";

  return (
    <Draggable draggableId={ticket.id} index={index}>
      {(provided, snapshot) => (
        <div
          ref={provided.innerRef}
          {...provided.draggableProps}
          {...provided.dragHandleProps}
          onClick={onClick}
          className={cn(
            "bg-card rounded-xl border p-3 cursor-pointer hover:shadow-md transition-shadow space-y-2",
            snapshot.isDragging && "shadow-lg ring-2 ring-primary/20"
          )}
        >
          {/* Header: number + priority */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-1.5">
              <span className="text-xs text-muted-foreground font-mono">
                #{ticket.numero_exibicao}
              </span>
              {(ticket as any).origem === "chat" && (
                <span title="Origem: Chat"><MessageSquare className="h-3 w-3 text-primary" /></span>
              )}
            </div>
            <Badge className={cn("text-[10px] px-1.5 py-0", TICKET_PRIORIDADE_COLORS[ticket.prioridade])}>
              {ticket.prioridade}
            </Badge>
          </div>

          {/* Title */}
          <p className="text-sm font-semibold leading-tight line-clamp-2">{ticket.titulo}</p>

          {/* Client */}
          {ticket.clientes && (
            <div className="flex items-center gap-1 text-xs text-muted-foreground">
              <Building2 className="h-3 w-3 shrink-0" />
              <span className="truncate">{ticket.clientes.nome_fantasia}</span>
            </div>
          )}

          {/* Footer: date, SLA, attachments, avatar, followers */}
          <div className="flex items-center justify-between pt-1 border-t border-border/50">
            <div className="flex items-center gap-2">
              <span className="text-[10px] text-muted-foreground">{formatDate(ticket.created_at)}</span>
              <span className={cn("text-[10px] font-medium", slaColorClass, sla.vencido && "animate-pulse")}>
                {sla.remaining}
              </span>
              {anexosCount > 0 && (
                <Paperclip className="h-3 w-3 text-muted-foreground" />
              )}
            </div>

            <div className="flex items-center gap-1">
              {/* Followers mini avatars */}
              {seguidores.slice(0, 3).map((s) => (
                <UserAvatar
                  key={s.user_id}
                  avatarUrl={s.profile?.avatar_url}
                  fullName={s.profile?.full_name}
                  size="xs"
                />
              ))}
              {seguidores.length > 3 && (
                <span className="text-[9px] text-muted-foreground">+{seguidores.length - 3}</span>
              )}

              {/* Responsável */}
              {ticket.responsavel && (
                <UserAvatar
                  avatarUrl={ticket.responsavel.avatar_url}
                  fullName={ticket.responsavel.full_name}
                  size="sm"
                  className="ml-1 ring-2 ring-background"
                />
              )}
            </div>
          </div>
        </div>
      )}
    </Draggable>
  );
}
