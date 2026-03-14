import { cn } from "@/lib/utils";
import { TicketStatus, Ticket, TicketSeguidor } from "../types";
import { TICKET_STATUS_BG } from "../constants";
import { TicketKanbanCard } from "./TicketKanbanCard";
import { Droppable } from "@hello-pangea/dnd";
import { ScrollArea } from "@/components/ui/scroll-area";

interface Props {
  status: TicketStatus;
  tickets: Ticket[];
  seguidoresMap: Record<string, TicketSeguidor[]>;
  anexosMap: Record<string, number>;
  onCardClick: (ticket: Ticket) => void;
}

export function TicketKanbanColumn({ status, tickets, seguidoresMap, anexosMap, onCardClick }: Props) {
  return (
    <div className={cn("flex flex-col min-w-[260px] w-[260px] rounded-xl border", TICKET_STATUS_BG[status])}>
      {/* Column header */}
      <div className="px-3 py-2 border-b flex items-center justify-between shrink-0">
        <span className="text-sm font-semibold">{status}</span>
        <span className="text-xs text-muted-foreground bg-background/60 rounded-full px-2 py-0.5">
          {tickets.length}
        </span>
      </div>

      {/* Cards */}
      <Droppable droppableId={status}>
        {(provided) => (
          <div
            ref={provided.innerRef}
            {...provided.droppableProps}
            className="flex-1 overflow-y-auto p-2 space-y-2 min-h-[100px]"
            style={{ maxHeight: "calc(100vh - 220px)" }}
          >
            {tickets.map((ticket, index) => (
              <TicketKanbanCard
                key={ticket.id}
                ticket={ticket}
                index={index}
                seguidores={seguidoresMap[ticket.id] || []}
                anexosCount={anexosMap[ticket.id] || 0}
                onClick={() => onCardClick(ticket)}
              />
            ))}
            {provided.placeholder}
          </div>
        )}
      </Droppable>
    </div>
  );
}
