import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Ticket, TicketStatus } from "../types";
import { TICKET_STATUS_COLORS, TICKET_PRIORIDADE_COLORS, TICKET_STATUSES } from "../constants";
import { formatDateTime } from "../helpers";
import { TicketSlaCard } from "./TicketSlaCard";
import { TicketTimeline } from "./TicketTimeline";
import { TicketNovaResposta } from "./TicketNovaResposta";
import { UserAvatar } from "@/components/UserAvatar";
import {
  useTicketDetail, useTicketComentarios, useTicketAnexos,
  useTicketVinculos, useTicketSeguidoresByTicket, useProfiles,
} from "../useTicketsQueries";
import {
  useUpdateTicketStatus, useAddTicketComment, useUpdateTicketResponsavel,
  useAddTicketSeguidor, useRemoveTicketSeguidor,
} from "../useTicketsForm";
import { useAuth } from "@/context/AuthContext";
import { cn } from "@/lib/utils";
import {
  Maximize2, X, Building2, FileText, Headphones, Calendar,
  User, Plus, Trash2, Link2, Paperclip, Download, Edit2,
} from "lucide-react";
import { Textarea } from "@/components/ui/textarea";

interface Props {
  ticketId: string | null;
  open: boolean;
  onClose: () => void;
}

export function TicketDetailDrawer({ ticketId, open, onClose }: Props) {
  const { user } = useAuth();
  const userId = user?.id || "";

  const { data: ticket } = useTicketDetail(ticketId);
  const { data: comentarios = [] } = useTicketComentarios(ticketId);
  const { data: anexos = [] } = useTicketAnexos(ticketId);
  const { data: vinculos = [] } = useTicketVinculos(ticketId);
  const { data: seguidores = [] } = useTicketSeguidoresByTicket(ticketId);
  const { data: profiles = [] } = useProfiles();

  const updateStatus = useUpdateTicketStatus();
  const addComment = useAddTicketComment();
  const updateResponsavel = useUpdateTicketResponsavel();
  const addSeguidor = useAddTicketSeguidor();
  const removeSeguidor = useRemoveTicketSeguidor();

  const [editingDesc, setEditingDesc] = useState(false);
  const [descDraft, setDescDraft] = useState("");
  const [expanded, setExpanded] = useState(false);

  if (!ticket) return null;

  const handleStatusChange = (newStatus: string) => {
    if (newStatus === ticket.status) return;
    updateStatus.mutate({
      ticketId: ticket.id,
      newStatus: newStatus as TicketStatus,
      oldStatus: ticket.status,
      userId,
    });
  };

  const handleResponsavelChange = (newId: string) => {
    const prof = profiles.find((p) => p.user_id === newId);
    if (!prof) return;
    updateResponsavel.mutate({
      ticketId: ticket.id,
      responsavelId: newId,
      userId,
      responsavelNome: prof.full_name,
    });
  };

  return (
    <Sheet open={open} onOpenChange={(v) => !v && onClose()}>
      <SheetContent
        side="right"
        className={cn("p-0 flex flex-col sm:max-w-none transition-all", expanded ? "w-full sm:w-[90vw]" : "w-full sm:w-[55vw]")}
      >
        {/* Header */}
        <SheetHeader className="px-4 py-3 border-b shrink-0">
          <div className="flex items-center gap-2 flex-wrap">
            <SheetTitle className="text-base font-bold flex items-center gap-2">
              <span className="text-muted-foreground font-mono">#{ticket.numero_exibicao}</span>
              {ticket.titulo}
            </SheetTitle>
            <Select value={ticket.status} onValueChange={handleStatusChange}>
              <SelectTrigger className={cn("h-6 w-auto text-xs border-0", TICKET_STATUS_COLORS[ticket.status as TicketStatus])}>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {TICKET_STATUSES.map((s) => (
                  <SelectItem key={s} value={s}>{s}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Badge className={cn("text-[10px]", TICKET_PRIORIDADE_COLORS[ticket.prioridade])}>
              {ticket.prioridade}
            </Badge>
            <div className="ml-auto flex items-center gap-1">
              <Button variant="ghost" size="icon" className="h-7 w-7"
                onClick={() => { navigate(`/tickets?id=${ticket.id}`); }}>
                <Maximize2 className="h-4 w-4" />
              </Button>
              <Button variant="ghost" size="icon" className="h-7 w-7" onClick={onClose}>
                <X className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </SheetHeader>

        {/* Body: two columns */}
        <div className="flex flex-1 overflow-hidden">
          {/* Left column 65% */}
          <ScrollArea className="flex-1 basis-[65%] p-4">
            <div className="space-y-4">
              {/* Description */}
              <div>
                <div className="flex items-center gap-2 mb-2">
                  <h4 className="text-sm font-semibold">Descrição</h4>
                  <Button variant="ghost" size="icon" className="h-5 w-5"
                    onClick={() => { setEditingDesc(!editingDesc); setDescDraft(ticket.descricao_html); }}>
                    <Edit2 className="h-3 w-3" />
                  </Button>
                </div>
                {editingDesc ? (
                  <div className="space-y-2">
                    <Textarea value={descDraft} onChange={(e) => setDescDraft(e.target.value)} className="min-h-[120px]" />
                    <div className="flex gap-2">
                      <Button size="sm" onClick={() => setEditingDesc(false)}>Salvar</Button>
                      <Button variant="outline" size="sm" onClick={() => setEditingDesc(false)}>Cancelar</Button>
                    </div>
                  </div>
                ) : (
                  <div className="text-sm whitespace-pre-wrap bg-muted/30 rounded-lg p-3 min-h-[60px]">
                    {ticket.descricao_html || "Sem descrição."}
                  </div>
                )}
              </div>

              {/* Timeline */}
              <TicketTimeline comentarios={comentarios} />

              {/* Nova resposta */}
              <TicketNovaResposta
                isLoading={addComment.isPending}
                onSubmit={(conteudo, visibilidade) =>
                  addComment.mutate({ ticketId: ticket.id, userId, conteudo, visibilidade })
                }
              />
            </div>
          </ScrollArea>

          {/* Right column 35% */}
          <ScrollArea className="basis-[35%] border-l p-4">
            <div className="space-y-4">
              {/* SLA */}
              <TicketSlaCard slaDeadline={ticket.sla_deadline} slaHoras={ticket.sla_horas} />

              {/* Details */}
              <div className="bg-card rounded-xl border p-4 space-y-3">
                <h4 className="text-sm font-semibold">Detalhes</h4>
                <div className="space-y-2 text-xs">
                  {ticket.clientes && (
                    <div className="flex items-center gap-2">
                      <Building2 className="h-3 w-3 text-muted-foreground" />
                      <span className="text-muted-foreground">Cliente:</span>
                      <span className="font-medium">{ticket.clientes.nome_fantasia}</span>
                    </div>
                  )}
                  <div className="flex items-center gap-2">
                    <Headphones className="h-3 w-3 text-muted-foreground" />
                    <span className="text-muted-foreground">Mesa:</span>
                    <span className="font-medium">{ticket.mesa}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <User className="h-3 w-3 text-muted-foreground" />
                    <span className="text-muted-foreground">Responsável:</span>
                    <Select value={ticket.responsavel_id || "__none__"} onValueChange={(v) => v !== "__none__" && handleResponsavelChange(v)}>
                      <SelectTrigger className="h-6 text-xs w-auto border-0 p-0">
                        <SelectValue placeholder="Selecionar" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="__none__">Nenhum</SelectItem>
                        {profiles.map((p) => (
                          <SelectItem key={p.user_id} value={p.user_id}>
                            <div className="flex items-center gap-2">
                              <UserAvatar avatarUrl={p.avatar_url} fullName={p.full_name} size="xs" />
                              {p.full_name}
                            </div>
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="flex items-center gap-2">
                    <Calendar className="h-3 w-3 text-muted-foreground" />
                    <span className="text-muted-foreground">Aberto em:</span>
                    <span>{formatDateTime(ticket.created_at)}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Calendar className="h-3 w-3 text-muted-foreground" />
                    <span className="text-muted-foreground">Atualizado:</span>
                    <span>{formatDateTime(ticket.updated_at)}</span>
                  </div>
                </div>
              </div>

              {/* Seguidores */}
              <div className="bg-card rounded-xl border p-4 space-y-2">
                <div className="flex items-center justify-between">
                  <h4 className="text-sm font-semibold">Seguidores</h4>
                  <Select onValueChange={(v) => addSeguidor.mutate({ ticketId: ticket.id, userId: v })}>
                    <SelectTrigger className="h-6 w-6 border-0 p-0">
                      <Plus className="h-3 w-3" />
                    </SelectTrigger>
                    <SelectContent>
                      {profiles
                        .filter((p) => !seguidores.some((s) => s.user_id === p.user_id))
                        .map((p) => (
                          <SelectItem key={p.user_id} value={p.user_id}>{p.full_name}</SelectItem>
                        ))}
                    </SelectContent>
                  </Select>
                </div>
                {seguidores.map((s) => (
                  <div key={s.id} className="flex items-center gap-2 text-xs">
                    <UserAvatar avatarUrl={s.profile?.avatar_url} fullName={s.profile?.full_name} size="xs" />
                    <span className="flex-1">{s.profile?.full_name}</span>
                    <Button variant="ghost" size="icon" className="h-5 w-5"
                      onClick={() => removeSeguidor.mutate({ ticketId: ticket.id, userId: s.user_id })}>
                      <Trash2 className="h-3 w-3 text-destructive" />
                    </Button>
                  </div>
                ))}
              </div>

              {/* Vinculos */}
              <div className="bg-card rounded-xl border p-4 space-y-2">
                <h4 className="text-sm font-semibold flex items-center gap-1">
                  <Link2 className="h-3 w-3" /> Relacionados
                </h4>
                {vinculos.map((v) => (
                  <div key={v.id} className="text-xs flex items-center gap-2">
                    <span className="font-mono text-muted-foreground">#{v.ticket_vinculado?.numero_exibicao}</span>
                    <span className="truncate flex-1">{v.ticket_vinculado?.titulo}</span>
                    <Badge variant="outline" className="text-[9px]">{v.ticket_vinculado?.status}</Badge>
                  </div>
                ))}
                {vinculos.length === 0 && <p className="text-xs text-muted-foreground">Nenhum vínculo.</p>}
              </div>

              {/* Anexos */}
              <div className="bg-card rounded-xl border p-4 space-y-2">
                <h4 className="text-sm font-semibold flex items-center gap-1">
                  <Paperclip className="h-3 w-3" /> Anexos
                </h4>
                {anexos.map((a) => (
                  <div key={a.id} className="text-xs flex items-center gap-2">
                    <FileText className="h-3 w-3 text-muted-foreground" />
                    <span className="truncate flex-1">{a.nome}</span>
                    <a href={a.url} target="_blank" rel="noreferrer">
                      <Download className="h-3 w-3" />
                    </a>
                  </div>
                ))}
                {anexos.length === 0 && <p className="text-xs text-muted-foreground">Nenhum anexo.</p>}
              </div>
            </div>
          </ScrollArea>
        </div>
      </SheetContent>
    </Sheet>
  );
}
