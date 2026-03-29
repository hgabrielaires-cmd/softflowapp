import { useState, useMemo, useEffect } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { AppLayout } from "@/components/AppLayout";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { UserAvatar } from "@/components/UserAvatar";
import { useAuth } from "@/context/AuthContext";
import { useCreateTicket } from "./tickets/useTicketsForm";
import {
  useProfiles, useHelpdeskTipos, useHelpdeskModelos,
  useClienteTicketsAbertos, useClienteContratos, useClienteTicketsFechados,
} from "./tickets/useTicketsQueries";
import { TICKET_PRIORIDADES, TICKET_MESAS, TICKET_PRIORIDADE_COLORS, TICKET_PRIORIDADE_SLA, TICKET_MODOS } from "./tickets/constants";
import { TICKET_STATUS_COLORS } from "./tickets/constants";
import type { TicketFormData, TicketPrioridade, TicketMesa, TicketModo, TicketStatus } from "./tickets/types";
import { supabase } from "@/integrations/supabase/client";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { cn } from "@/lib/utils";
import { ArrowLeft, Clock, Trash2, Search, Eye, CalendarDays, Paperclip, X, Loader2, FileText } from "lucide-react";
import { isSameDay } from "date-fns";
import { toast } from "sonner";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";

function TagSuggestions({ input, existingTags, onSelect }: { input: string; existingTags: string[]; onSelect: (tag: string) => void }) {
  const { data: registeredTags = [] } = useQuery({
    queryKey: ["helpdesk_tags"],
    queryFn: async () => {
      const { data } = await supabase.from("helpdesk_tags").select("nome").eq("ativo", true).order("nome");
      return (data ?? []).map((t: any) => t.nome as string);
    },
  });

  const query = input.startsWith("#") ? input.toUpperCase() : `#${input.toUpperCase()}`;
  const filtered = registeredTags.filter((t) => typeof t === "string" && t.includes(query) && !existingTags.includes(t));

  if (filtered.length === 0) return null;

  return (
    <div className="absolute z-20 top-full left-0 right-0 bg-card border rounded-lg shadow-lg mt-1 max-h-32 overflow-y-auto">
      {filtered.map((tag) => (
        <button key={tag} className="w-full text-left px-3 py-1.5 text-xs hover:bg-muted" onClick={() => onSelect(tag)}>
          <Badge className="bg-blue-500 text-white text-[10px]">{tag}</Badge>
        </button>
      ))}
    </div>
  );
}

export default function TicketNovo() {
  const navigate = useNavigate();
  const location = useLocation();
  const { user, profile } = useAuth();
  const userId = user?.id || "";

  // Check if coming from chat
  const chatState = location.state as { fromChat?: boolean; conversaId?: string; clienteId?: string; clienteNome?: string } | null;
  const fromChat = chatState?.fromChat || false;

  const { data: profiles = [] } = useProfiles();
  const { data: tipos = [] } = useHelpdeskTipos();
  const { data: modelos = [] } = useHelpdeskModelos();
  const createTicket = useCreateTicket(fromChat ? undefined : () => navigate("/tickets"));

  // Form state
  const [titulo, setTitulo] = useState("");
  const [descricao, setDescricao] = useState("");
  const [clienteId, setClienteId] = useState<string | null>(chatState?.clienteId || null);
  const [clienteSearch, setClienteSearch] = useState(chatState?.clienteNome || "");
  const [contratoId, setContratoId] = useState<string | null>(null);
  const [mesa, setMesa] = useState<TicketMesa>("Suporte");
  const [modo, setModo] = useState<TicketModo | "">("");
  const [tipoAtendimentoId, setTipoAtendimentoId] = useState<string | null>(null);
  const [prioridade, setPrioridade] = useState<TicketPrioridade>("Média");
  const [responsavelId, setResponsavelId] = useState<string | null>(null);
  const [modeloId, setModeloId] = useState<string | null>(null);
  const [ticketPaiId, setTicketPaiId] = useState<string | null>(null);
  const [seguidores, setSeguidores] = useState<string[]>(userId ? [userId] : []);
  const [selfFollow, setSelfFollow] = useState(true);
  const [tags, setTags] = useState<string[]>([]);
  const [tagInput, setTagInput] = useState("");
  const [agendaDatas, setAgendaDatas] = useState<{ date: Date; hora: string }[]>([]);
  const [agendaOpen, setAgendaOpen] = useState(false);
  const [anexos, setAnexos] = useState<File[]>([]);
  const [uploading, setUploading] = useState(false);

  // SLA calculation
  const tipoSelecionado = tipos.find((t) => t.id === tipoAtendimentoId);
  const slaHoras = tipoSelecionado?.sla_horas ?? TICKET_PRIORIDADE_SLA[prioridade];

  // Client search
  const { data: clientes = [] } = useQuery({
    queryKey: ["clientes_search", clienteSearch],
    enabled: clienteSearch.length >= 2,
    queryFn: async () => {
      const { data } = await supabase
        .from("clientes")
        .select("id, nome_fantasia, cnpj_cpf")
        .or(`nome_fantasia.ilike.%${clienteSearch}%,cnpj_cpf.ilike.%${clienteSearch}%`)
        .eq("ativo", true)
        .limit(10);
      return data ?? [];
    },
  });

  const { data: clienteContratos = [] } = useClienteContratos(clienteId);
  const { data: clienteTickets = [] } = useClienteTicketsAbertos(clienteId);
  const { data: clienteTicketsFechados = [] } = useClienteTicketsFechados(clienteId);

  // Auto-select active contract considering upgrades
  useEffect(() => {
    if (clienteContratos.length > 0) {
      // Prioridade: último Upgrade ativo > Base ativo > primeiro ativo
      const upgrade = clienteContratos.find((c: any) => c.tipo === "Aditivo");
      const base = clienteContratos.find((c: any) => c.tipo === "Base");
      const selected = upgrade || base || clienteContratos[0];
      setContratoId((selected as any).id);
    } else {
      setContratoId(null);
    }
  }, [clienteContratos]);

  // Espelho do contrato (dialog)
  const [espelhoOpen, setEspelhoOpen] = useState(false);
  const { data: espelhoData } = useQuery({
    queryKey: ["espelho_contrato", contratoId],
    enabled: !!contratoId && espelhoOpen,
    queryFn: async () => {
      // Buscar pedido do contrato para pegar plano e módulos
      const { data: contrato } = await supabase
        .from("contratos")
        .select("id, numero_exibicao, tipo, plano_id, pedido_id, planos:plano_id(nome)")
        .eq("id", contratoId!)
        .single();
      if (!contrato) return null;

      // Módulos do pedido
      let modulos: { nome: string; quantidade: number }[] = [];
      if (contrato.pedido_id) {
        const { data: pedido } = await supabase
          .from("pedidos")
          .select("modulos_adicionais")
          .eq("id", contrato.pedido_id)
          .single();
        if (pedido?.modulos_adicionais && Array.isArray(pedido.modulos_adicionais)) {
          modulos = (pedido.modulos_adicionais as any[]).map((m: any) => ({
            nome: m.nome || "Módulo",
            quantidade: m.quantidade || 1,
          }));
        }
      }

      // Aditivos ativos vinculados
      const { data: aditivos } = await supabase
        .from("contratos")
        .select("id, numero_exibicao, tipo, planos:plano_id(nome), pedido_id")
        .eq("contrato_origem_id", contratoId!)
        .eq("status", "Ativo")
        .order("created_at", { ascending: false });

      // Módulos dos aditivos
      const aditivosComModulos = await Promise.all(
        (aditivos || []).map(async (ad: any) => {
          let mods: { nome: string; quantidade: number }[] = [];
          if (ad.pedido_id) {
            const { data: pedAd } = await supabase
              .from("pedidos")
              .select("modulos_adicionais")
              .eq("id", ad.pedido_id)
              .single();
            if (pedAd?.modulos_adicionais && Array.isArray(pedAd.modulos_adicionais)) {
              mods = (pedAd.modulos_adicionais as any[]).map((m: any) => ({
                nome: m.nome || "Módulo",
                quantidade: m.quantidade || 1,
              }));
            }
          }
          return { ...ad, modulos: mods };
        })
      );

      return {
        contrato,
        planoNome: (contrato.planos as any)?.nome || "—",
        modulos,
        aditivos: aditivosComModulos,
      };
    },
  });

  // Modelo apply
  useEffect(() => {
    if (!modeloId) return;
    const modelo = modelos.find((m) => m.id === modeloId);
    if (modelo) {
      if (modelo.titulo_padrao) setTitulo(modelo.titulo_padrao);
      if (modelo.corpo_html) setDescricao(modelo.corpo_html);
    }
  }, [modeloId, modelos]);

  // Self follow sync
  useEffect(() => {
    if (selfFollow && userId && !seguidores.includes(userId)) {
      setSeguidores((prev) => [...prev, userId]);
    } else if (!selfFollow && userId) {
      setSeguidores((prev) => prev.filter((id) => id !== userId));
    }
  }, [selfFollow, userId]);

  const handleSave = async () => {
    if (!modo) {
      toast.error("Selecione o Modo do ticket (Interno ou Externo).");
      return;
    }

    setUploading(true);
    try {
      // Upload files to R2
      const anexosUpload: { nome: string; url: string; tipo_mime: string; tamanho_bytes: number }[] = [];
      for (const file of anexos) {
        if (file.size > 10 * 1024 * 1024) {
          toast.error(`Arquivo "${file.name}" excede 10MB`);
          continue;
        }
        const base64 = await fileToBase64(file);
        const { data: r2Data, error: r2Error } = await supabase.functions.invoke("r2-upload", {
          body: { arquivo_base64: base64, nome_arquivo: file.name, mime_type: file.type, pasta: "tickets" },
        });
        if (r2Error || !r2Data?.url) {
          toast.error(`Erro ao enviar "${file.name}"`);
          continue;
        }
        anexosUpload.push({ nome: file.name, url: r2Data.url, tipo_mime: file.type, tamanho_bytes: file.size });
      }

      const data: TicketFormData = {
        titulo: titulo.trim() || "Ticket",
        descricao_html: descricao,
        cliente_id: clienteId,
        contrato_id: contratoId,
        mesa,
        modo,
        tipo_atendimento_id: tipoAtendimentoId,
        prioridade,
        responsavel_id: responsavelId,
        sla_horas: slaHoras,
        tags,
        previsao_entrega: null,
        ticket_pai_id: ticketPaiId,
        seguidores,
      };
      const agendamentos = agendaDatas.map((item) => ({
        data: format(item.date, "yyyy-MM-dd"),
        hora_inicio: item.hora || null,
      }));
      createTicket.mutate({ data, userId, agendamentos, anexos: anexosUpload, origem: fromChat ? "chat" : "avulso" }, {
        onSuccess: (ticket) => {
          if (fromChat && chatState?.conversaId && ticket) {
            navigate("/chat", {
              state: {
                ticketCreated: ticket,
                conversaId: chatState.conversaId,
              },
              replace: true,
            });
          }
        },
      });
    } catch {
      toast.error("Erro ao processar anexos.");
    } finally {
      setUploading(false);
    }
  };

  return (
    <AppLayout>
      <div className="flex flex-col h-full">
        {/* Header */}
        <div className="shrink-0 px-4 py-3 border-b flex items-center gap-3">
          <Button variant="ghost" size="icon" onClick={() => navigate("/tickets")}>
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <h1 className="text-lg font-bold">Novo Ticket</h1>
        </div>

        {/* Body: two columns */}
        <div className="flex-1 overflow-y-auto">
          <div className="flex flex-col lg:flex-row gap-4 p-4 min-h-full">
            {/* Left 60% */}
            <div className="flex-1 lg:basis-[60%] space-y-4">
              {/* Row 1: Nº + Modo */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label className="text-xs">Nº do Ticket</Label>
                  <Input disabled value="(gerado automaticamente)" className="bg-muted" />
                </div>
                <div>
                  <Label className="text-xs">Modo <span className="text-destructive">*</span></Label>
                  <Select value={modo || undefined} onValueChange={(v) => setModo(v as TicketModo)}>
                    <SelectTrigger><SelectValue placeholder="Selecionar modo" /></SelectTrigger>
                    <SelectContent>
                      {TICKET_MODOS.map((m) => (
                        <SelectItem key={m.value} value={m.value}>{m.label}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              {/* Row 2 */}
              <div className="grid grid-cols-2 gap-3">
                <div className="relative">
                  <Label className="text-xs">Cliente</Label>
                  <Input
                    value={clienteId ? clientes.find((c) => c.id === clienteId)?.nome_fantasia || clienteSearch : clienteSearch}
                    onChange={(e) => { setClienteSearch(e.target.value); setClienteId(null); }}
                    placeholder="Buscar por nome ou CNPJ"
                  />
                  {clienteSearch.length >= 2 && !clienteId && clientes.length > 0 && (
                    <div className="absolute z-10 top-full left-0 right-0 bg-card border rounded-lg shadow-lg mt-1 max-h-40 overflow-y-auto">
                      {clientes.map((c) => (
                        <button key={c.id} className="w-full text-left px-3 py-2 text-sm hover:bg-muted"
                          onClick={() => { setClienteId(c.id); setClienteSearch(c.nome_fantasia); }}>
                          {c.nome_fantasia} <span className="text-muted-foreground text-xs">({c.cnpj_cpf})</span>
                        </button>
                      ))}
                    </div>
                  )}
                </div>
                <div>
                  <Label className="text-xs">Contrato vinculado</Label>
                  <div className="flex items-center gap-1">
                    <Input
                      disabled
                      value={
                        contratoId
                          ? (() => {
                              const c = clienteContratos.find((ct: any) => ct.id === contratoId) as any;
                              return c ? `${c.numero_exibicao} - ${c.planos?.nome || c.tipo}` : "";
                            })()
                          : clienteId ? "Nenhum contrato ativo" : ""
                      }
                      placeholder="Selecione um cliente"
                      className="bg-muted text-xs flex-1"
                    />
                    {contratoId && (
                      <Button variant="ghost" size="icon" className="h-9 w-9 shrink-0" onClick={() => setEspelhoOpen(true)} title="Ver espelho do contrato">
                        <Eye className="h-4 w-4 text-primary" />
                      </Button>
                    )}
                  </div>
                </div>

                {/* Dialog espelho do contrato */}
                <Dialog open={espelhoOpen} onOpenChange={setEspelhoOpen}>
                  <DialogContent className="max-w-lg">
                    <DialogHeader>
                      <DialogTitle className="flex items-center gap-2 text-sm">
                        <Eye className="h-4 w-4 text-primary" />
                        Espelho do Contrato {espelhoData?.contrato?.numero_exibicao}
                      </DialogTitle>
                    </DialogHeader>
                    {espelhoData ? (
                      <div className="space-y-4 text-sm">
                        {/* Plano */}
                        <div>
                          <p className="font-semibold text-xs text-muted-foreground uppercase mb-1">Plano Contratado</p>
                          <Badge variant="secondary">{espelhoData.planoNome}</Badge>
                        </div>

                        {/* Módulos do contrato base */}
                        {espelhoData.modulos.length > 0 && (
                          <div>
                            <p className="font-semibold text-xs text-muted-foreground uppercase mb-1">Módulos Adicionais</p>
                            <ul className="space-y-1">
                              {espelhoData.modulos.map((m, i) => (
                                <li key={i} className="flex items-center gap-2 text-xs bg-muted/40 rounded px-2 py-1">
                                  <span className="flex-1">{m.nome}</span>
                                  <Badge variant="outline" className="text-[10px]">Qtd: {m.quantidade}</Badge>
                                </li>
                              ))}
                            </ul>
                          </div>
                        )}

                        {/* Aditivos */}
                        {espelhoData.aditivos.length > 0 && (
                          <div>
                            <p className="font-semibold text-xs text-muted-foreground uppercase mb-1">Aditivos Ativos</p>
                            <div className="space-y-2">
                              {espelhoData.aditivos.map((ad: any) => (
                                <div key={ad.id} className="border rounded-lg p-2">
                                  <div className="flex items-center gap-2 mb-1">
                                    <span className="font-mono text-xs text-muted-foreground">{ad.numero_exibicao}</span>
                                    <Badge variant="outline" className="text-[10px]">{ad.tipo}</Badge>
                                    {ad.planos?.nome && <Badge variant="secondary" className="text-[10px]">{ad.planos.nome}</Badge>}
                                  </div>
                                  {ad.modulos.length > 0 && (
                                    <ul className="ml-2 space-y-0.5">
                                      {ad.modulos.map((m: any, j: number) => (
                                        <li key={j} className="text-xs text-muted-foreground flex items-center gap-2">
                                          <span>• {m.nome}</span>
                                          <Badge variant="outline" className="text-[9px]">Qtd: {m.quantidade}</Badge>
                                        </li>
                                      ))}
                                    </ul>
                                  )}
                                </div>
                              ))}
                            </div>
                          </div>
                        )}

                        {espelhoData.modulos.length === 0 && espelhoData.aditivos.length === 0 && (
                          <p className="text-xs text-muted-foreground">Nenhum módulo adicional ou aditivo encontrado.</p>
                        )}
                      </div>
                    ) : (
                      <p className="text-sm text-muted-foreground">Carregando...</p>
                    )}
                  </DialogContent>
                </Dialog>
              </div>

              {/* Client tickets in progress */}
              {clienteId && clienteTickets.length > 0 && (
                <div className="bg-muted/30 rounded-lg p-3 space-y-1">
                  <p className="text-xs font-semibold text-muted-foreground">Tickets em aberto deste cliente</p>
                  {clienteTickets.map((t: any) => (
                    <div key={t.id} className="flex items-center gap-2 text-xs">
                      <span className="font-mono text-muted-foreground">#{t.numero_exibicao}</span>
                      <span className="truncate flex-1">{t.titulo}</span>
                      <Badge className={cn("text-[9px]", TICKET_STATUS_COLORS[t.status as TicketStatus])}>{t.status}</Badge>
                    </div>
                  ))}
                </div>
              )}

              {/* Client closed tickets history */}
              {clienteId && clienteTicketsFechados.length > 0 && (
                <div className="bg-emerald-50 dark:bg-emerald-950/20 border border-emerald-200 dark:border-emerald-800 rounded-lg p-3 space-y-1">
                  <p className="text-xs font-semibold text-emerald-700 dark:text-emerald-400">Histórico — Tickets fechados deste cliente</p>
                  {clienteTicketsFechados.map((t: any) => (
                    <div key={t.id} className="flex items-center gap-2 text-xs">
                      <span className="font-mono text-muted-foreground">#{t.numero_exibicao}</span>
                      <span className="truncate flex-1">{t.titulo}</span>
                      <Badge variant="secondary" className="text-[9px]">{t.mesa}</Badge>
                      {t.helpdesk_tipos_atendimento?.nome && (
                        <Badge variant="outline" className="text-[9px]">{(t.helpdesk_tipos_atendimento as any).nome}</Badge>
                      )}
                      {(t.tags as string[] || []).slice(0, 2).map((tag: string) => (
                        <Badge key={tag} className="bg-blue-500/10 text-blue-600 border-blue-200 text-[9px]">{tag}</Badge>
                      ))}
                      <Badge className={cn("text-[9px]", TICKET_STATUS_COLORS[t.status as TicketStatus])}>{t.status}</Badge>
                    </div>
                  ))}
                </div>
              )}

              {/* Row 3 */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label className="text-xs">Mesa</Label>
                  <Select value={mesa} onValueChange={(v) => setMesa(v as TicketMesa)}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {TICKET_MESAS.map((m) => <SelectItem key={m} value={m}>{m}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label className="text-xs">Tipo de Atendimento</Label>
                  <div className="flex items-center gap-2">
                    <Select value={tipoAtendimentoId || "__none__"} onValueChange={(v) => setTipoAtendimentoId(v === "__none__" ? null : v)}>
                      <SelectTrigger className="flex-1"><SelectValue placeholder="Selecionar" /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="__none__">Nenhum</SelectItem>
                        {tipos.filter((t) => t.ativo).map((t) => (
                          <SelectItem key={t.id} value={t.id}>{t.nome}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    {tipoSelecionado && (
                      <Badge variant="outline" className="text-xs shrink-0">
                        <Clock className="h-3 w-3 mr-1" /> SLA: {tipoSelecionado.sla_horas}h
                      </Badge>
                    )}
                  </div>
                </div>
              </div>

              {/* Row 4 */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label className="text-xs">Prioridade</Label>
                  <Select value={prioridade} onValueChange={(v) => setPrioridade(v as TicketPrioridade)}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {TICKET_PRIORIDADES.map((p) => (
                        <SelectItem key={p} value={p}>
                          <div className="flex items-center gap-2">
                            <Badge className={cn("text-[10px] px-1.5 py-0", TICKET_PRIORIDADE_COLORS[p])}>{p}</Badge>
                            <span className="text-xs text-muted-foreground">SLA: {TICKET_PRIORIDADE_SLA[p]}h</span>
                          </div>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label className="text-xs">Responsável</Label>
                  <Select value={responsavelId || "__none__"} onValueChange={(v) => setResponsavelId(v === "__none__" ? null : v)}>
                    <SelectTrigger><SelectValue placeholder="Selecionar" /></SelectTrigger>
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
              </div>

              {/* Row 5: Modelo */}
              <div>
                <Label className="text-xs">Modelo de Ticket</Label>
                <Select value={modeloId || "__none__"} onValueChange={(v) => setModeloId(v === "__none__" ? null : v)}>
                  <SelectTrigger><SelectValue placeholder="Selecionar modelo" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="__none__">Nenhum</SelectItem>
                    {modelos.filter((m: any) => m.ativo).map((m: any) => (
                      <SelectItem key={m.id} value={m.id}>{m.nome}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Row 6: Título */}
              <div>
                <Label className="text-xs">Título do Ticket</Label>
                <Input
                  value={titulo}
                  onChange={(e) => setTitulo(e.target.value)}
                  placeholder="Digite o título do ticket..."
                />
              </div>

              {/* Row 7: Descrição */}
              <div>
                <Label className="text-xs">Descrição</Label>
                <Textarea value={descricao} onChange={(e) => setDescricao(e.target.value)}
                  placeholder="Descreva o ticket..." className="min-h-[200px]" />
              </div>

              {/* Row 8: Anexos */}
              <div>
                <Label className="text-xs">Anexos</Label>
                <div className="mt-1 border border-dashed rounded-lg p-3 space-y-2">
                  <div className="flex items-center gap-2">
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => {
                        const input = document.createElement("input");
                        input.type = "file";
                        input.multiple = true;
                        input.accept = "*/*";
                        input.onchange = (e) => {
                          const files = (e.target as HTMLInputElement).files;
                          if (files) setAnexos((prev) => [...prev, ...Array.from(files)]);
                        };
                        input.click();
                      }}
                    >
                      <Paperclip className="h-3.5 w-3.5 mr-1.5" />
                      Adicionar arquivos
                    </Button>
                    <span className="text-xs text-muted-foreground">Máx. 10MB por arquivo</span>
                  </div>
                  {anexos.length > 0 && (
                    <div className="space-y-1">
                      {anexos.map((file, idx) => (
                        <div key={idx} className="flex items-center gap-2 text-xs bg-muted/50 rounded px-2 py-1.5">
                          <FileText className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
                          <span className="truncate flex-1">{file.name}</span>
                          <span className="text-muted-foreground shrink-0">
                            {(file.size / 1024).toFixed(0)}KB
                          </span>
                          <button
                            type="button"
                            onClick={() => setAnexos((prev) => prev.filter((_, i) => i !== idx))}
                            className="text-muted-foreground hover:text-destructive"
                          >
                            <X className="h-3.5 w-3.5" />
                          </button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Right 40% */}
            <div className="w-full lg:basis-[40%] space-y-4">
              {/* Vinculações */}
              <Card>
                <CardHeader className="py-3 px-4">
                  <CardTitle className="text-sm">Vinculações</CardTitle>
                </CardHeader>
                <CardContent className="px-4 pb-4 space-y-3">
                  <div>
                    <Label className="text-xs">Ticket pai</Label>
                    <Input placeholder="Buscar ticket..." value={ticketPaiId || ""} onChange={() => {}} disabled className="text-xs" />
                  </div>
                  {clienteId && clienteTickets.length > 0 && (
                    <div>
                      <p className="text-xs font-medium text-muted-foreground mb-1">Últimos tickets do cliente</p>
                      {clienteTickets.slice(0, 5).map((t: any) => (
                        <div key={t.id} className="flex items-center gap-2 text-xs py-1">
                          <span className="font-mono text-muted-foreground">#{t.numero_exibicao}</span>
                          <span className="truncate flex-1">{t.titulo}</span>
                          <Button variant="ghost" size="sm" className="h-5 text-[10px] px-2"
                            onClick={() => setTicketPaiId(t.id)}>Vincular</Button>
                        </div>
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>

              {/* Seguidores */}
              <Card>
                <CardHeader className="py-3 px-4">
                  <CardTitle className="text-sm">Seguidores</CardTitle>
                </CardHeader>
                <CardContent className="px-4 pb-4 space-y-2">
                  <div className="flex items-center gap-2">
                    <Checkbox id="self-follow" checked={selfFollow} onCheckedChange={(v) => setSelfFollow(!!v)} />
                    <Label htmlFor="self-follow" className="text-xs">Me adicionar como seguidor</Label>
                  </div>
                  <Select onValueChange={(v) => {
                    if (!seguidores.includes(v)) setSeguidores([...seguidores, v]);
                  }}>
                    <SelectTrigger className="h-8 text-xs"><SelectValue placeholder="Adicionar seguidor" /></SelectTrigger>
                    <SelectContent>
                      {profiles.filter((p) => !seguidores.includes(p.user_id)).map((p) => (
                        <SelectItem key={p.user_id} value={p.user_id}>{p.full_name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  {seguidores.map((uid) => {
                    const p = profiles.find((pr) => pr.user_id === uid);
                    return (
                      <div key={uid} className="flex items-center gap-2 text-xs">
                        <UserAvatar avatarUrl={p?.avatar_url} fullName={p?.full_name} size="xs" />
                        <span className="flex-1">{p?.full_name || uid}</span>
                        <Button variant="ghost" size="icon" className="h-5 w-5"
                          onClick={() => setSeguidores(seguidores.filter((s) => s !== uid))}>
                          <Trash2 className="h-3 w-3 text-destructive" />
                        </Button>
                      </div>
                    );
                  })}
                </CardContent>
              </Card>

              {/* Info adicional */}
              <Card>
                <CardHeader className="py-3 px-4">
                  <CardTitle className="text-sm">Informações adicionais</CardTitle>
                </CardHeader>
                <CardContent className="px-4 pb-4 space-y-3">
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <Label className="text-xs">Data de abertura</Label>
                      <Input disabled value={new Date().toLocaleDateString("pt-BR")} className="bg-muted text-xs" />
                    </div>
                    <div>
                      <Label className="text-xs">SLA</Label>
                      <Input disabled value={`${slaHoras}h`} className="bg-muted text-xs" />
                    </div>
                  </div>
                  <div>
                    <Label className="text-xs">Tags</Label>
                    <div className="flex flex-wrap gap-1.5 p-2 border rounded-md bg-background min-h-[38px] items-center">
                      {tags.map((tag) => (
                        <Badge key={tag} className="bg-blue-500 text-white hover:bg-blue-600 text-xs cursor-pointer gap-1"
                          onClick={() => setTags(tags.filter((t) => t !== tag))}>
                          {tag} <span className="ml-0.5">×</span>
                        </Badge>
                      ))}
                      <div className="relative flex-1 min-w-[120px]">
                        <input
                          value={tagInput}
                          onChange={(e) => setTagInput(e.target.value)}
                          onKeyDown={(e) => {
                            if (e.key === " " || e.key === "Enter") {
                              e.preventDefault();
                              const val = tagInput.trim();
                              if (val) {
                                const formatted = val.startsWith("#") ? val.toUpperCase() : `#${val.toUpperCase()}`;
                                if (!tags.includes(formatted)) setTags([...tags, formatted]);
                                setTagInput("");
                              }
                            }
                            if (e.key === "Backspace" && !tagInput && tags.length > 0) {
                              setTags(tags.slice(0, -1));
                            }
                          }}
                          placeholder={tags.length === 0 ? "#NFE, #NFCE..." : ""}
                          className="w-full bg-transparent outline-none text-xs h-6"
                        />
                        {tagInput.length >= 1 && (
                          <TagSuggestions
                            input={tagInput}
                            existingTags={tags}
                            onSelect={(tag) => {
                              if (!tags.includes(tag)) setTags([...tags, tag]);
                              setTagInput("");
                            }}
                          />
                        )}
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Agenda */}
              <Card>
                <CardHeader className="py-3 px-4">
                  <CardTitle className="text-sm flex items-center gap-2">
                    <CalendarDays className="h-4 w-4" />
                    Agenda
                    {agendaDatas.length > 0 && (
                      <Badge variant="secondary" className="text-[10px]">{agendaDatas.length} dia(s)</Badge>
                    )}
                  </CardTitle>
                </CardHeader>
                <CardContent className="px-4 pb-4 space-y-3">
                  <Popover open={agendaOpen} onOpenChange={setAgendaOpen}>
                    <PopoverTrigger asChild>
                      <Button variant="outline" size="sm" className="w-full h-8 text-xs gap-1.5">
                        <CalendarDays className="h-3.5 w-3.5" />
                        {agendaDatas.length > 0 ? `${agendaDatas.length} dia(s) selecionado(s)` : "Agendar compromissos"}
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0" align="start">
                      <div className="p-3 space-y-3">
                        <Calendar
                          mode="multiple"
                          selected={agendaDatas.map((item) => item.date)}
                          onSelect={(dates) => {
                            const newDates = (dates || []).map((d) => {
                              const existing = agendaDatas.find((item) => isSameDay(item.date, d));
                              return existing || { date: d, hora: "" };
                            });
                            setAgendaDatas(newDates);
                          }}
                          locale={ptBR}
                          disabled={{ before: new Date() }}
                          className={cn("p-3 pointer-events-auto")}
                        />
                        <div className="flex justify-end">
                          <Button size="sm" onClick={() => setAgendaOpen(false)}>Confirmar</Button>
                        </div>
                      </div>
                    </PopoverContent>
                  </Popover>

                  {agendaDatas.length > 0 && (
                    <div className="space-y-1">
                      {[...agendaDatas]
                        .sort((a, b) => a.date.getTime() - b.date.getTime())
                        .map((item, i) => (
                          <div key={i} className="flex items-center justify-between text-xs bg-muted/50 rounded px-2 py-1.5 gap-2">
                            <div className="flex items-center gap-1.5 flex-1 min-w-0">
                              <CalendarDays className="h-3 w-3 text-primary shrink-0" />
                              <span className="font-medium truncate">{format(item.date, "dd/MM/yyyy (EEEE)", { locale: ptBR })}</span>
                            </div>
                            <div className="flex items-center gap-1.5 shrink-0">
                              <Clock className="h-3 w-3 text-muted-foreground" />
                              <Input
                                type="time"
                                value={item.hora}
                                onChange={(e) => {
                                  const updated = agendaDatas.map((d) =>
                                    isSameDay(d.date, item.date) ? { ...d, hora: e.target.value } : d
                                  );
                                  setAgendaDatas(updated);
                                }}
                                className="h-6 w-[90px] text-xs px-1.5 py-0"
                                placeholder="HH:mm"
                              />
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-5 w-5"
                                onClick={() => setAgendaDatas(agendaDatas.filter((d) => !isSameDay(d.date, item.date)))}
                              >
                                <Trash2 className="h-3 w-3 text-destructive" />
                              </Button>
                            </div>
                          </div>
                        ))}
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="shrink-0 px-4 py-3 border-t flex items-center justify-between">
          <Button variant="outline" onClick={() => navigate("/tickets")}>Cancelar</Button>
          <Button onClick={handleSave} disabled={createTicket.isPending || uploading} className="bg-primary hover:bg-primary/90">
            {uploading ? (
              <><Loader2 className="h-4 w-4 mr-1.5 animate-spin" />Enviando anexos...</>
            ) : createTicket.isPending ? "Salvando..." : "Salvar Ticket"}
          </Button>
        </div>
      </div>
    </AppLayout>
  );
}

function fileToBase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const result = reader.result as string;
      resolve(result.split(",")[1]);
    };
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}
