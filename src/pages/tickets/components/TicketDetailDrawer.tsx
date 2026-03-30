import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Input } from "@/components/ui/input";
import ChatHistoricoDrawer from "@/pages/chat/components/ChatHistoricoDrawer";
import { Ticket, TicketStatus } from "../types";
import { TICKET_STATUS_COLORS, TICKET_PRIORIDADE_COLORS, TICKET_STATUSES } from "../constants";
import { formatDateTime } from "../helpers";
import { TicketSlaCard } from "./TicketSlaCard";
import { TicketTimeline } from "./TicketTimeline";
import { TicketNovaResposta } from "./TicketNovaResposta";
import { ResolucaoDialog } from "./ResolucaoDialog";
import { PausarTicketDialog } from "./PausarTicketDialog";
import { UserAvatar } from "@/components/UserAvatar";
import {
  useTicketDetail, useTicketComentarios, useTicketAnexos,
  useTicketVinculos, useTicketSeguidoresByTicket, useProfiles,
  useTicketCurtidas, useClienteContatos, useTicketAgendamentos,
  useClienteTicketsHistorico,
} from "../useTicketsQueries";
import {
  useUpdateTicketStatus, useAddTicketComment, useUpdateTicketResponsavel,
  useAddTicketSeguidor, useRemoveTicketSeguidor, useToggleTicketCurtida,
  useReplyTicketComment, useAddTicketAgendamento, useRemoveTicketAgendamento,
  useCloseTicketWithResolution, usePausarTicket,
} from "../useTicketsForm";
import { useAuth } from "@/context/AuthContext";
import { useCrudPermissions } from "@/hooks/useCrudPermissions";
import { cn } from "@/lib/utils";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import {
  Maximize2, X, Building2, FileText, Headphones, Calendar as CalendarIcon,
  User, Plus, Link2, Paperclip, Download, Edit2, MessageSquare, Eye,
  ChevronDown, Phone, Mail, Star, CalendarDays, Clock, Trash2,
  Play, PauseCircle, CheckCircle, Upload, Loader2,
} from "lucide-react";
import { Textarea } from "@/components/ui/textarea";
import { format, isSameDay } from "date-fns";
import { ptBR } from "date-fns/locale";

interface Props {
  ticketId: string | null;
  open: boolean;
  onClose: () => void;
  onSelectTicket?: (ticketId: string) => void;
}

export function TicketDetailDrawer({ ticketId, open, onClose, onSelectTicket }: Props) {
  const { user, roles } = useAuth();
  const userId = user?.id || "";
  const { canEditar } = useCrudPermissions("tickets", roles);
  const queryClient = useQueryClient();
  const { data: ticket } = useTicketDetail(ticketId);
  const { data: comentarios = [] } = useTicketComentarios(ticketId);
  const { data: curtidas = [] } = useTicketCurtidas(ticketId);
  const { data: anexos = [] } = useTicketAnexos(ticketId);
  const { data: vinculos = [] } = useTicketVinculos(ticketId);
  const { data: seguidores = [] } = useTicketSeguidoresByTicket(ticketId);
  const { data: profiles = [] } = useProfiles();
  const { data: contatos = [] } = useClienteContatos(ticket?.cliente_id ?? null);
  const { data: agendamentos = [] } = useTicketAgendamentos(ticketId);
  const { data: historico = [] } = useClienteTicketsHistorico(ticket?.cliente_id ?? null, ticketId);

  // Fetch ALL linked chat conversations for current ticket
  const { data: linkedConversas = [] } = useQuery({
    queryKey: ["ticket-linked-conversas", ticketId],
    queryFn: async () => {
      if (!ticketId) return [];
      const { data } = await supabase
        .from("chat_conversas")
        .select("id, protocolo, created_at, numero_cliente, nome_cliente, status, atendente:profiles!chat_conversas_atendente_id_fkey(full_name), cliente:clientes!chat_conversas_cliente_id_fkey(nome_fantasia)")
        .eq("ticket_id", ticketId)
        .order("created_at", { ascending: false });
      return data || [];
    },
    enabled: !!ticketId,
  });

  // All linked conversations (multiple possible)

  // Fetch linked chat conversations for historico tickets
  const historicoTicketIds = historico.map((h: any) => h.id).filter(Boolean);
  const { data: historicoConversas = [] } = useQuery({
    queryKey: ["historico-linked-conversas", historicoTicketIds],
    queryFn: async () => {
      if (historicoTicketIds.length === 0) return [];
      const { data } = await supabase
        .from("chat_conversas")
        .select("id, protocolo, ticket_id, created_at")
        .in("ticket_id", historicoTicketIds);
      return data || [];
    },
    enabled: historicoTicketIds.length > 0,
  });

  const historicoConversasMap: Record<string, any> = {};
  (historicoConversas as any[]).forEach((c: any) => {
    if (c.ticket_id) historicoConversasMap[c.ticket_id] = c;
  });

  const updateStatus = useUpdateTicketStatus();
  const addComment = useAddTicketComment();
  const updateResponsavel = useUpdateTicketResponsavel();
  const addSeguidor = useAddTicketSeguidor();
  const removeSeguidor = useRemoveTicketSeguidor();
  const toggleCurtida = useToggleTicketCurtida();
  const replyComment = useReplyTicketComment();
  const addAgendamento = useAddTicketAgendamento();
  const removeAgendamento = useRemoveTicketAgendamento();
  const closeTicket = useCloseTicketWithResolution();
  const pausarTicket = usePausarTicket();

  const [editingDesc, setEditingDesc] = useState(false);
  const [descDraft, setDescDraft] = useState("");
  const [expanded, setExpanded] = useState(false);
  const [agendaPopoverOpen, setAgendaPopoverOpen] = useState(false);
  const [novaAgendaData, setNovaAgendaData] = useState<Date | undefined>(undefined);
  const [novaAgendaHora, setNovaAgendaHora] = useState("");
  const [showPausarDialog, setShowPausarDialog] = useState(false);
  const [showResolucaoDialog, setShowResolucaoDialog] = useState(false);
  const [resolucaoText, setResolucaoText] = useState("");
  const [uploadingAnexo, setUploadingAnexo] = useState(false);
  const [viewingConversaId, setViewingConversaId] = useState<string | null>(null);
  const [viewingConversaProtocolo, setViewingConversaProtocolo] = useState<string>("");
  const [viewingConversaData, setViewingConversaData] = useState<string>("");

  const mentionUsers = profiles.map((p) => ({ id: p.user_id, user_id: p.user_id, full_name: p.full_name }));

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
    <>
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
                onClick={() => setExpanded(!expanded)}>
                <Maximize2 className="h-4 w-4" />
              </Button>
              <Button variant="ghost" size="icon" className="h-7 w-7" onClick={onClose}>
                <X className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </SheetHeader>

        {/* Action Buttons */}
        {canEditar && (
          <div className="px-4 py-2 border-b shrink-0 flex items-center gap-2 flex-wrap">
            {ticket.status === "Aberto" && (
              <Button
                size="sm"
                className="h-7 text-xs gap-1 bg-emerald-600 hover:bg-emerald-700 text-white"
                onClick={() => updateStatus.mutate({ ticketId: ticket.id, newStatus: "Em Andamento", oldStatus: ticket.status, userId })}
              >
                <Play className="h-3 w-3" /> Iniciar Atendimento
              </Button>
            )}
            {(ticket.status === "Aberto" || ticket.status === "Em Andamento") && (
              <Button
                size="sm"
                variant="outline"
                className="h-7 text-xs gap-1 border-amber-300 text-amber-700 hover:bg-amber-50"
                onClick={() => setShowPausarDialog(true)}
              >
                <PauseCircle className="h-3 w-3" /> Pausar
              </Button>
            )}
            {ticket.status !== "Resolvido" && ticket.status !== "Fechado" && (
              <Button
                size="sm"
                variant="outline"
                className="h-7 text-xs gap-1 border-emerald-300 text-emerald-700 hover:bg-emerald-50"
                onClick={() => { setResolucaoText(""); setShowResolucaoDialog(true); }}
              >
                <CheckCircle className="h-3 w-3" /> Fechar Ticket
              </Button>
            )}
            {ticket.status === "Aguardando Cliente" && (
              <Button
                size="sm"
                className="h-7 text-xs gap-1 bg-blue-600 hover:bg-blue-700 text-white"
                onClick={() => updateStatus.mutate({ ticketId: ticket.id, newStatus: "Em Andamento", oldStatus: ticket.status, userId })}
              >
                <Play className="h-3 w-3" /> Retomar Atendimento
              </Button>
            )}
          </div>
        )}

        {/* Body: two columns */}
        <div className="flex flex-1 overflow-hidden">
          {/* Left column 65% */}
          <ScrollArea className="flex-1 basis-[65%] p-4">
            <Tabs defaultValue="descricao" className="w-full">
              <TabsList className="w-full mb-3">
                <TabsTrigger value="descricao" className="flex-1 gap-1.5">
                  <FileText className="h-3.5 w-3.5" /> Descrição
                </TabsTrigger>
                <TabsTrigger value="comunicacao" className="flex-1 gap-1.5">
                  <MessageSquare className="h-3.5 w-3.5" /> Comunicação
                  {comentarios.length > 0 && (
                    <Badge variant="secondary" className="h-4 min-w-4 px-1 text-[10px]">{comentarios.length}</Badge>
                  )}
                </TabsTrigger>
                {ticket.cliente_id && (
                  <TabsTrigger value="historico" className="flex-1 gap-1.5">
                    <Clock className="h-3.5 w-3.5" /> Histórico
                    {historico.length > 0 && (
                      <Badge variant="secondary" className="h-4 min-w-4 px-1 text-[10px]">{historico.length}</Badge>
                    )}
                  </TabsTrigger>
                )}
              </TabsList>

              <TabsContent value="descricao" className="space-y-4 mt-0">
                {/* Título */}
                <div>
                  <h4 className="text-sm font-semibold mb-1">Título</h4>
                  <div className="text-sm bg-muted/30 rounded-lg p-3">
                    {ticket.titulo || "Sem título"}
                  </div>
                </div>

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
              </TabsContent>

              <TabsContent value="comunicacao" className="space-y-4 mt-0">
                {/* Timeline */}
                <TicketTimeline
                  comentarios={comentarios}
                  curtidas={curtidas}
                  users={mentionUsers}
                  currentUserId={userId}
                  onToggleLike={(comentarioId, liked) => toggleCurtida.mutate({ comentarioId, userId, liked })}
                  onReply={(parentId, conteudo, visibilidade) => replyComment.mutate({ ticketId: ticket.id, userId, conteudo, visibilidade, parentId })}
                />

                {/* Nova resposta */}
                <TicketNovaResposta
                  isLoading={addComment.isPending}
                  users={mentionUsers}
                  onSubmit={(conteudo, visibilidade, mentionedUserIds, anexos) =>
                    addComment.mutate({
                      ticketId: ticket.id,
                      userId,
                      conteudo,
                      visibilidade,
                      mentionedUserIds,
                      ticketNumero: ticket.numero_exibicao,
                      anexos,
                    })
                  }
                />
              </TabsContent>

              {ticket.cliente_id && (
                <TabsContent value="historico" className="space-y-2 mt-0">
                  {/* Current ticket linked conversation */}
                  {linkedConversa && (
                    <div className="border rounded-lg p-3 bg-primary/5 border-primary/20">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <MessageSquare className="h-3.5 w-3.5 text-primary" />
                          <span className="text-xs font-medium">Conversa de origem</span>
                          <span className="font-mono text-xs text-primary">#{linkedConversa.protocolo}</span>
                        </div>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-6 w-6"
                          title="Visualizar conversa"
                          onClick={() => {
                            setViewingConversaId(linkedConversa.id);
                            setViewingConversaProtocolo(linkedConversa.protocolo || "");
                            setViewingConversaData(linkedConversa.created_at || "");
                          }}
                        >
                          <Eye className="h-3.5 w-3.5 text-primary" />
                        </Button>
                      </div>
                      <p className="text-[10px] text-muted-foreground mt-1">
                        {linkedConversa.created_at && format(new Date(linkedConversa.created_at), "dd/MM/yyyy HH:mm", { locale: ptBR })}
                      </p>
                    </div>
                  )}

                  {historico.length === 0 && !linkedConversa ? (
                    <p className="text-sm text-muted-foreground text-center py-8">Nenhum ticket anterior para este cliente.</p>
                  ) : (
                    historico.map((h: any) => {
                      const hConversa = historicoConversasMap[h.id];
                      return (
                        <div
                          key={h.id}
                          className="border rounded-lg p-3 hover:bg-accent/50 transition-colors cursor-pointer"
                          onClick={() => onSelectTicket?.(h.id)}
                        >
                          <div className="flex items-center gap-2 mb-1 flex-wrap">
                            <span className="font-mono text-xs text-muted-foreground">#{h.numero_exibicao}</span>
                            <Badge variant="outline" className={cn("text-[10px]", TICKET_STATUS_COLORS[h.status as TicketStatus])}>
                              {h.status}
                            </Badge>
                            <Badge className={cn("text-[10px]", TICKET_PRIORIDADE_COLORS[h.prioridade])}>
                              {h.prioridade}
                            </Badge>
                            {h.origem === "chat" && hConversa && (
                              <>
                                <span className="text-[10px] text-muted-foreground">•</span>
                                <span className="font-mono text-[10px] text-primary">#{hConversa.protocolo}</span>
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  className="h-5 w-5"
                                  title="Visualizar conversa"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    setViewingConversaId(hConversa.id);
                                    setViewingConversaProtocolo(hConversa.protocolo || "");
                                    setViewingConversaData(hConversa.created_at || "");
                                  }}
                                >
                                  <Eye className="h-3 w-3 text-primary" />
                                </Button>
                              </>
                            )}
                          </div>
                          <p className="text-sm font-medium truncate">{h.titulo}</p>
                          <div className="flex items-center gap-2 mt-1 flex-wrap">
                            <Badge variant="secondary" className="text-[10px]">
                              <Headphones className="h-2.5 w-2.5 mr-0.5" /> {h.mesa}
                            </Badge>
                            {h.helpdesk_tipos_atendimento?.nome && (
                              <Badge variant="outline" className="text-[10px]">
                                {(h.helpdesk_tipos_atendimento as any).nome}
                              </Badge>
                            )}
                            {(h.tags as string[] || []).map((tag: string) => (
                              <Badge key={tag} className="bg-blue-500/10 text-blue-600 border-blue-200 text-[9px]">{tag}</Badge>
                            ))}
                          </div>
                          <p className="text-[10px] text-muted-foreground mt-1">
                            {format(new Date(h.created_at), "dd/MM/yyyy HH:mm", { locale: ptBR })}
                          </p>
                        </div>
                      );
                    })
                  )}
                </TabsContent>
              )}
            </Tabs>
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
                    <CalendarIcon className="h-3 w-3 text-muted-foreground" />
                    <span className="text-muted-foreground">Aberto em:</span>
                    <span>{formatDateTime(ticket.created_at)}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <CalendarIcon className="h-3 w-3 text-muted-foreground" />
                    <span className="text-muted-foreground">Atualizado:</span>
                    <span>{formatDateTime(ticket.updated_at)}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <MessageSquare className="h-3 w-3 text-muted-foreground" />
                    <span className="text-muted-foreground">Origem:</span>
                    <Badge variant="outline" className={cn(
                      "text-[10px] h-4",
                      (ticket as any).origem === "chat" ? "border-primary text-primary" : "border-muted-foreground text-muted-foreground"
                    )}>
                      {(ticket as any).origem === "chat" ? "Chat" : "Avulso"}
                    </Badge>
                  </div>
                </div>
              </div>

              {/* Contatos do Cliente */}
              {ticket.cliente_id && (
                <Collapsible>
                  <div className="bg-card rounded-xl border">
                    <CollapsibleTrigger className="w-full flex items-center justify-between p-4">
                      <h4 className="text-sm font-semibold flex items-center gap-1.5">
                        <Phone className="h-3 w-3" /> Contatos ({contatos.length})
                      </h4>
                      <ChevronDown className="h-4 w-4 text-muted-foreground transition-transform data-[state=open]:rotate-180" />
                    </CollapsibleTrigger>
                    <CollapsibleContent>
                      <div className="px-4 pb-4 space-y-2">
                        {contatos.length === 0 && <p className="text-xs text-muted-foreground">Nenhum contato cadastrado.</p>}
                        {contatos.map((ct: any) => (
                          <div key={ct.id} className="flex items-start gap-2 text-xs border-t pt-2 first:border-0 first:pt-0">
                            <div className="flex-1 space-y-0.5">
                              <div className="flex items-center gap-1.5 font-medium">
                                {ct.nome}
                                {ct.decisor && <Star className="h-3 w-3 text-amber-500 fill-amber-500" />}
                              </div>
                              {ct.cargo && <p className="text-muted-foreground">{ct.cargo}</p>}
                              {ct.telefone && (
                                <div className="flex items-center gap-1 text-muted-foreground">
                                  <Phone className="h-2.5 w-2.5" /> {ct.telefone}
                                </div>
                              )}
                              {ct.email && (
                                <div className="flex items-center gap-1 text-muted-foreground">
                                  <Mail className="h-2.5 w-2.5" /> {ct.email}
                                </div>
                              )}
                            </div>
                          </div>
                        ))}
                      </div>
                    </CollapsibleContent>
                  </div>
                </Collapsible>
              )}

              {/* Conversas WhatsApp */}
              <div className="bg-card rounded-xl border p-4 space-y-3">
                <h4 className="text-sm font-semibold flex items-center gap-1.5">
                  <MessageSquare className="h-3.5 w-3.5" /> Conversas WhatsApp ({linkedConversas.length})
                </h4>
                {linkedConversas.length > 0 ? (
                  <div className="space-y-2">
                    {linkedConversas.map((conv: any) => (
                      <div key={conv.id} className="flex items-center justify-between text-xs bg-muted/30 rounded-lg p-2.5">
                        <div className="flex-1 min-w-0 space-y-0.5">
                          <div className="flex items-center gap-1.5">
                            <span className="font-mono text-primary">#{conv.protocolo}</span>
                            <Badge variant="outline" className="text-[9px] h-3.5 px-1">{conv.status}</Badge>
                          </div>
                          <p className="text-muted-foreground truncate">
                            {conv.nome_cliente || conv.numero_cliente}
                            {(conv.cliente as any)?.nome_fantasia && ` — ${(conv.cliente as any).nome_fantasia}`}
                          </p>
                          {(conv.atendente as any)?.full_name && (
                            <p className="text-muted-foreground text-[10px]">
                              Atendente: {(conv.atendente as any).full_name}
                            </p>
                          )}
                          <p className="text-muted-foreground text-[10px]">
                            {conv.created_at && format(new Date(conv.created_at), "dd/MM/yyyy HH:mm", { locale: ptBR })}
                          </p>
                        </div>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-7 w-7 flex-shrink-0"
                          title="Visualizar conversa"
                          onClick={() => {
                            setViewingConversaId(conv.id);
                            setViewingConversaProtocolo(conv.protocolo || "");
                            setViewingConversaData(conv.created_at || "");
                          }}
                        >
                          <Eye className="h-3.5 w-3.5 text-primary" />
                        </Button>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-xs text-muted-foreground">Nenhuma conversa vinculada a este ticket.</p>
                )}
              </div>

              {/* Agenda */}
              <div className="bg-card rounded-xl border p-4 space-y-3">
                <div className="flex items-center justify-between">
                  <h4 className="text-sm font-semibold flex items-center gap-1.5">
                    <CalendarDays className="h-3.5 w-3.5" /> Agenda ({agendamentos.length})
                  </h4>
                  {canEditar && (
                    <Popover open={agendaPopoverOpen} onOpenChange={setAgendaPopoverOpen}>
                      <PopoverTrigger asChild>
                        <Button variant="ghost" size="icon" className="h-6 w-6">
                          <Plus className="h-3 w-3" />
                        </Button>
                      </PopoverTrigger>
                      <PopoverContent className="w-auto p-0" align="end">
                        <div className="p-3 space-y-3">
                          <Calendar
                            mode="single"
                            selected={novaAgendaData}
                            onSelect={setNovaAgendaData}
                            locale={ptBR}
                            disabled={{ before: new Date() }}
                            className="p-3 pointer-events-auto"
                          />
                          <div className="flex items-center gap-2 px-1">
                            <Clock className="h-3.5 w-3.5 text-muted-foreground" />
                            <Input
                              type="time"
                              value={novaAgendaHora}
                              onChange={(e) => setNovaAgendaHora(e.target.value)}
                              className="h-7 text-xs flex-1"
                              placeholder="HH:mm"
                            />
                          </div>
                          <div className="flex justify-end">
                            <Button
                              size="sm"
                              disabled={!novaAgendaData || addAgendamento.isPending}
                              onClick={() => {
                                if (!novaAgendaData) return;
                                addAgendamento.mutate({
                                  ticketId: ticket.id,
                                  data: format(novaAgendaData, "yyyy-MM-dd"),
                                  horaInicio: novaAgendaHora || null,
                                  titulo: ticket.titulo,
                                  userId,
                                });
                                setNovaAgendaData(undefined);
                                setNovaAgendaHora("");
                                setAgendaPopoverOpen(false);
                              }}
                            >
                              Adicionar
                            </Button>
                          </div>
                        </div>
                      </PopoverContent>
                    </Popover>
                  )}
                </div>
                {agendamentos.length > 0 ? (
                  <div className="space-y-1">
                    {agendamentos.map((ag) => (
                      <div key={ag.id} className="flex items-center justify-between text-xs bg-muted/50 rounded px-2 py-1.5">
                        <div className="flex items-center gap-1.5">
                          <CalendarDays className="h-3 w-3 text-primary" />
                          <span className="font-medium">
                            {format(new Date(ag.data + "T12:00:00"), "dd/MM/yyyy (EEEE)", { locale: ptBR })}
                          </span>
                          {ag.hora_inicio && (
                            <Badge variant="outline" className="text-[10px] font-mono">
                              <Clock className="h-2.5 w-2.5 mr-0.5" />
                              {ag.hora_inicio.slice(0, 5)}
                            </Badge>
                          )}
                        </div>
                        {canEditar && (
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-5 w-5"
                            onClick={() => removeAgendamento.mutate({ agendamentoId: ag.id })}
                          >
                            <Trash2 className="h-3 w-3 text-destructive" />
                          </Button>
                        )}
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-xs text-muted-foreground">Nenhum agendamento.</p>
                )}
              </div>

              {/* Seguidores */}
              <div className="bg-card rounded-xl border p-4 space-y-3">
                <div className="flex items-center justify-between">
                  <h4 className="text-sm font-semibold">Seguidores ({seguidores.length})</h4>
                  <Select onValueChange={(v) => addSeguidor.mutate({ ticketId: ticket.id, userId: v })}>
                    <SelectTrigger className="h-6 w-6 border-0 p-0">
                      <Plus className="h-3 w-3" />
                    </SelectTrigger>
                    <SelectContent>
                      {profiles
                        .filter((p) => !seguidores.some((s) => s.user_id === p.user_id))
                        .map((p) => (
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
                {seguidores.length > 0 && (
                  <div className="flex flex-wrap gap-2">
                    {seguidores.map((s) => (
                      <div key={s.id} className="group relative flex items-center gap-1.5 bg-muted/50 rounded-full pl-1 pr-2 py-1">
                        <UserAvatar avatarUrl={s.profile?.avatar_url} fullName={s.profile?.full_name} size="xs" />
                        <span className="text-[11px] font-medium">{s.profile?.full_name}</span>
                        <button
                          className="ml-0.5 opacity-0 group-hover:opacity-100 transition-opacity"
                          onClick={() => removeSeguidor.mutate({ ticketId: ticket.id, userId: s.user_id })}
                        >
                          <X className="h-3 w-3 text-destructive" />
                        </button>
                      </div>
                    ))}
                  </div>
                )}
                {seguidores.length === 0 && <p className="text-xs text-muted-foreground">Nenhum seguidor.</p>}
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
                <div className="flex items-center justify-between">
                  <h4 className="text-sm font-semibold flex items-center gap-1">
                    <Paperclip className="h-3 w-3" /> Anexos
                  </h4>
                  {canEditar && (
                    <>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-6 w-6"
                        disabled={uploadingAnexo}
                        onClick={() => {
                          const input = document.createElement("input");
                          input.type = "file";
                          input.onchange = async (e) => {
                            const file = (e.target as HTMLInputElement).files?.[0];
                            if (!file) return;
                            if (file.size > 10 * 1024 * 1024) {
                              toast.error("Arquivo excede o limite de 10MB.");
                              return;
                            }
                            setUploadingAnexo(true);
                            try {
                              const arquivo_base64 = await new Promise<string>((resolve, reject) => {
                                const reader = new FileReader();
                                reader.onload = () => resolve((reader.result as string).split(",")[1]);
                                reader.onerror = () => reject(new Error("Erro ao ler arquivo"));
                                reader.readAsDataURL(file);
                              });

                              const { data: r2Data, error: r2Error } = await supabase.functions.invoke("r2-upload", {
                                body: {
                                  arquivo_base64,
                                  nome_arquivo: file.name,
                                  mime_type: file.type,
                                  pasta: "tickets",
                                },
                              });

                              if (r2Error) throw new Error(r2Error.message || "Erro no upload");
                              if (!r2Data?.sucesso) throw new Error(r2Data?.erro || "Erro no upload R2");

                              await supabase.from("ticket_anexos").insert({
                                ticket_id: ticket.id,
                                nome: file.name,
                                url: r2Data.url,
                              });

                              queryClient.invalidateQueries({ queryKey: ["ticket_anexos", ticket.id] });
                              toast.success("Anexo enviado!");
                            } catch (err: any) {
                              toast.error("Erro ao enviar anexo");
                              console.error(err);
                            } finally {
                              setUploadingAnexo(false);
                            }
                          };
                          input.click();
                        }}
                      >
                        {uploadingAnexo ? <Loader2 className="h-3 w-3 animate-spin" /> : <Upload className="h-3 w-3" />}
                      </Button>
                    </>
                  )}
                </div>
                {anexos.map((a) => (
                  <div key={a.id} className="text-xs flex items-center gap-2">
                    <FileText className="h-3 w-3 text-muted-foreground" />
                    <span className="truncate flex-1">{a.nome}</span>
                    <a
                      href={a.url}
                      download={a.nome}
                      target="_blank"
                      rel="noreferrer"
                      onClick={async (e) => {
                        e.preventDefault();
                        try {
                          const key = new URL(a.url).pathname.replace(/^\//, "");
                          const { data, error } = await supabase.functions.invoke("r2-download", {
                            body: { key, filename: a.nome },
                            responseType: "blob",
                          } as any);

                          if (error) throw error;
                          const blob = data as Blob;
                          const url = URL.createObjectURL(blob);
                          const link = document.createElement("a");
                          link.href = url;
                          link.download = a.nome;
                          link.click();
                          URL.revokeObjectURL(url);
                        } catch {
                          toast.error("Erro ao baixar anexo");
                        }
                      }}
                    >
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

    {/* Pausar Dialog */}
    <PausarTicketDialog
      open={showPausarDialog}
      onOpenChange={setShowPausarDialog}
      loading={pausarTicket.isPending}
      onConfirm={(motivo, tipo) => {
        pausarTicket.mutate({ ticketId: ticket.id, userId, motivo, tipo });
      }}
    />

    {/* Resolução Dialog */}
    <ResolucaoDialog
      open={showResolucaoDialog}
      onOpenChange={setShowResolucaoDialog}
      resolucao={resolucaoText}
      setResolucao={setResolucaoText}
      loading={closeTicket.isPending}
      onConfirm={() => {
        closeTicket.mutate({
          ticketId: ticket.id,
          newStatus: "Resolvido",
          oldStatus: ticket.status,
          userId,
          resolucao: resolucaoText,
        }, {
          onSuccess: () => {
            setShowResolucaoDialog(false);
            setResolucaoText("");
            onClose();
          },
        });
      }}
    />
    <ChatHistoricoDrawer
      conversaId={viewingConversaId}
      open={!!viewingConversaId}
      onClose={() => setViewingConversaId(null)}
      protocolo={viewingConversaProtocolo}
      data={viewingConversaData}
    />
    </>
  );
}
