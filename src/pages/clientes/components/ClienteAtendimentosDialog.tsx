import { useState, useEffect, useRef, useMemo } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Headset, Eye, Loader2, MessageSquare, Search, X, Ticket, PhoneOutgoing, PhoneIncoming, Star } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { format } from "date-fns";
import { cn } from "@/lib/utils";
import type { Cliente } from "@/lib/supabase-types";

interface Props {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  cliente: Cliente | null;
}

interface Conversa {
  id: string;
  protocolo: string | null;
  created_at: string;
  status: string | null;
  titulo_atendimento: string | null;
  tempo_atendimento_segundos: number | null;
  iniciado_em: string | null;
  atendimento_iniciado_em: string | null;
  nome_cliente: string | null;
  nps_nota: number | null;
  atendente: { full_name: string; setor_id?: string | null } | null;
  setor: { nome: string } | null;
  ticket: { numero_exibicao: string } | null;
}

interface Mensagem {
  id: string;
  conteudo: string | null;
  remetente: string | null;
  tipo: string | null;
  created_at: string | null;
  atendente: { full_name: string } | null;
}

const STATUS_BADGE: Record<string, { class: string; label: string }> = {
  em_atendimento: { class: "bg-blue-100 text-blue-700 dark:bg-blue-900 dark:text-blue-300", label: "Em atendimento" },
  encerrado: { class: "bg-muted text-muted-foreground", label: "Encerrado" },
  aguardando: { class: "bg-yellow-100 text-yellow-700 dark:bg-yellow-900 dark:text-yellow-300", label: "Na fila" },
};

function formatDuracao(s: number | null) {
  if (!s) return "—";
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  if (h > 0) return `${h}h ${m}min`;
  return `${m}min`;
}

function HighlightText({ text, term }: { text: string; term: string }) {
  if (!term.trim()) return <>{text}</>;
  const regex = new RegExp(`(${term.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")})`, "gi");
  const parts = text.split(regex);
  return (
    <>
      {parts.map((part, i) =>
        regex.test(part) ? (
          <mark key={i} className="bg-yellow-200 text-yellow-900 rounded-sm px-0.5">{part}</mark>
        ) : (
          <span key={i}>{part}</span>
        )
      )}
    </>
  );
}

export function ClienteAtendimentosDialog({ open, onOpenChange, cliente }: Props) {
  const [conversas, setConversas] = useState<Conversa[]>([]);
  const [loading, setLoading] = useState(false);
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const perPage = 10;
  const [setoresMap, setSetoresMap] = useState<Record<string, string>>({});

  const [mensagensOpen, setMensagensOpen] = useState(false);
  const [mensagens, setMensagens] = useState<Mensagem[]>([]);
  const [loadingMsg, setLoadingMsg] = useState(false);
  const [conversaSel, setConversaSel] = useState<Conversa | null>(null);

  // Search
  const [buscaAberta, setBuscaAberta] = useState(false);
  const [buscaTermo, setBuscaTermo] = useState("");

  // Scroll ref
  const msgEndRef = useRef<HTMLDivElement>(null);

  const mensagensFiltradas = useMemo(() => {
    if (!buscaTermo.trim()) return mensagens;
    const lower = buscaTermo.toLowerCase();
    return mensagens.filter((m) => m.conteudo?.toLowerCase().includes(lower));
  }, [mensagens, buscaTermo]);

  // Auto-scroll to bottom
  useEffect(() => {
    if (mensagensFiltradas.length > 0 && !loadingMsg) {
      setTimeout(() => msgEndRef.current?.scrollIntoView({ behavior: "smooth" }), 100);
    }
  }, [mensagensFiltradas, loadingMsg]);

  // Reset search on close
  useEffect(() => {
    if (!mensagensOpen) {
      setBuscaAberta(false);
      setBuscaTermo("");
    }
  }, [mensagensOpen]);

  // Load setores map for fallback
  useEffect(() => {
    if (open) {
      supabase
        .from("setores")
        .select("id, nome")
        .then(({ data }) => {
          const map: Record<string, string> = {};
          (data || []).forEach((s: any) => { map[s.id] = s.nome; });
          setSetoresMap(map);
        });
    }
  }, [open]);

  useEffect(() => {
    if (!open || !cliente?.id) {
      setConversas([]);
      setPage(1);
      setTotal(0);
      return;
    }
    fetchConversas();
  }, [open, cliente?.id, page]);

  async function fetchConversas() {
    if (!cliente?.id) return;
    setLoading(true);
    try {
      const { count } = await supabase
        .from("chat_conversas")
        .select("id", { count: "exact", head: true })
        .eq("cliente_id", cliente.id);
      setTotal(count || 0);

      const { data } = await supabase
        .from("chat_conversas")
        .select("id, protocolo, created_at, status, titulo_atendimento, tempo_atendimento_segundos, iniciado_em, atendimento_iniciado_em, nome_cliente, nps_nota, atendente:profiles!chat_conversas_atendente_id_fkey(full_name, setor_id), setor:setores!chat_conversas_setor_id_fkey(nome), ticket:tickets!chat_conversas_ticket_id_fkey(numero_exibicao)")
        .eq("cliente_id", cliente.id)
        .order("created_at", { ascending: false })
        .limit(limit);
      setConversas((data as any) || []);
    } finally {
      setLoading(false);
    }
  }

  async function abrirMensagens(conv: Conversa) {
    setConversaSel(conv);
    setMensagensOpen(true);
    setLoadingMsg(true);
    try {
      const { data } = await supabase
        .from("chat_mensagens")
        .select("id, conteudo, remetente, tipo, created_at, atendente:profiles!chat_mensagens_atendente_id_fkey(full_name)")
        .eq("conversa_id", conv.id)
        .order("created_at", { ascending: true })
        .limit(1000);
      setMensagens((data as any) || []);
    } finally {
      setLoadingMsg(false);
    }
  }

  const badgeFn = (status: string | null) => {
    const s = STATUS_BADGE[status || ""] || { class: "bg-muted text-muted-foreground", label: status || "—" };
    return <Badge className={cn("text-[10px] border-0", s.class)}>{s.label}</Badge>;
  };

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="max-w-6xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Headset className="h-4 w-4" />
              Atendimentos — {cliente?.nome_fantasia}
            </DialogTitle>
          </DialogHeader>

          {loading && conversas.length === 0 ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
            </div>
          ) : conversas.length === 0 ? (
            <div className="text-center py-12 space-y-2">
              <MessageSquare className="h-8 w-8 mx-auto text-muted-foreground/40" />
              <p className="text-sm text-muted-foreground">Nenhum atendimento registrado para este cliente.</p>
            </div>
          ) : (
            <div className="space-y-3">
              <div className="rounded-lg border border-border overflow-hidden">
                <table className="w-full text-sm">
                  <thead>
                     <tr className="bg-muted/50 text-xs text-muted-foreground">
                       <th className="text-left px-3 py-2 font-medium">Protocolo</th>
                       <th className="text-left px-3 py-2 font-medium">Data</th>
                       <th className="text-left px-3 py-2 font-medium">Solicitante</th>
                       <th className="text-left px-3 py-2 font-medium">Atendente</th>
                       <th className="text-left px-3 py-2 font-medium">Setor</th>
                       <th className="text-left px-3 py-2 font-medium">Tipo</th>
                       <th className="text-left px-3 py-2 font-medium">Ticket</th>
                       <th className="text-left px-3 py-2 font-medium">Status</th>
                       <th className="text-center px-3 py-2 font-medium">NPS</th>
                       <th className="text-left px-3 py-2 font-medium">Duração</th>
                       <th className="text-center px-3 py-2 font-medium w-16">Ações</th>
                     </tr>
                  </thead>
                  <tbody className="divide-y divide-border">
                    {conversas.map((c) => {
                      // Tipo: Ativo = Nova Conversa (atendimento_iniciado_em ≈ created_at), Receptivo = fluxo bot
                      const isAtivo = (() => {
                        if (!c.atendimento_iniciado_em) return false;
                        const diff = Math.abs(new Date(c.created_at).getTime() - new Date(c.atendimento_iniciado_em).getTime());
                        return diff < 10000; // < 10s = ativo (conversa já iniciou com atendente)
                      })();

                      // Setor: preferir o da conversa, fallback para setor do atendente
                      const setorNome = (c.setor as any)?.nome
                        || ((c.atendente as any)?.setor_id ? setoresMap[(c.atendente as any).setor_id] : null)
                        || "—";

                      const ticketNum = (c.ticket as any)?.numero_exibicao || null;

                      return (
                        <tr key={c.id} className="hover:bg-muted/30 transition-colors">
                          <td className="px-3 py-2 font-mono text-xs">{c.protocolo || "—"}</td>
                          <td className="px-3 py-2 text-xs">{format(new Date(c.created_at), "dd/MM/yyyy HH:mm")}</td>
                          <td className="px-3 py-2 text-xs">{c.nome_cliente || "—"}</td>
                          <td className="px-3 py-2 text-xs">{(c.atendente as any)?.full_name || "—"}</td>
                          <td className="px-3 py-2 text-xs">{setorNome}</td>
                          <td className="px-3 py-2">
                            {isAtivo ? (
                              <Badge className="text-[10px] border-0 bg-blue-100 text-blue-700 dark:bg-blue-900 dark:text-blue-300 gap-0.5">
                                <PhoneOutgoing className="h-2.5 w-2.5" /> Ativo
                              </Badge>
                            ) : (
                              <Badge className="text-[10px] border-0 bg-green-100 text-green-700 dark:bg-green-900 dark:text-green-300 gap-0.5">
                                <PhoneIncoming className="h-2.5 w-2.5" /> Receptivo
                              </Badge>
                            )}
                          </td>
                          <td className="px-3 py-2 text-xs font-mono">
                            {ticketNum ? (
                              <Badge variant="outline" className="text-[10px] gap-0.5">
                                <Ticket className="h-2.5 w-2.5" /> {ticketNum}
                              </Badge>
                            ) : "—"}
                          </td>
                          <td className="px-3 py-2">{badgeFn(c.status)}</td>
                          <td className="px-3 py-2 text-center">
                            {c.nps_nota ? (
                              <div className="flex items-center justify-center gap-0.5">
                                {[1, 2, 3, 4, 5].map((s) => (
                                  <Star
                                    key={s}
                                    className={cn(
                                      "h-3 w-3",
                                      s <= c.nps_nota! ? "fill-yellow-400 text-yellow-400" : "text-muted-foreground/30"
                                    )}
                                  />
                                ))}
                              </div>
                            ) : (
                              <span className="text-xs text-muted-foreground">—</span>
                            )}
                          </td>
                          <td className="px-3 py-2 text-xs">{formatDuracao(c.tempo_atendimento_segundos)}</td>
                          <td className="px-3 py-2 text-center">
                            <Button variant="ghost" size="icon" className="h-7 w-7" title="Ver mensagens" onClick={() => abrirMensagens(c)}>
                              <Eye className="h-3.5 w-3.5" />
                            </Button>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>

              {conversas.length < total && (
                <div className="text-center">
                  <Button variant="outline" size="sm" onClick={() => setLimit((l) => l + 10)} disabled={loading}>
                    {loading ? <Loader2 className="h-3 w-3 animate-spin mr-1" /> : null}
                    Ver mais ({total - conversas.length} restantes)
                  </Button>
                </div>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Dialog de mensagens */}
      <Dialog open={mensagensOpen} onOpenChange={setMensagensOpen}>
        <DialogContent className="max-w-2xl max-h-[85vh] flex flex-col">
          <DialogHeader>
            <div className="flex items-center justify-between gap-2">
              <DialogTitle className="flex items-center gap-2 text-sm">
                <MessageSquare className="h-4 w-4" />
                Atendimento {conversaSel?.protocolo || ""}
              </DialogTitle>
              <Button
                variant={buscaAberta ? "secondary" : "ghost"}
                size="icon"
                className="h-7 w-7 shrink-0"
                title="Buscar mensagens"
                onClick={() => {
                  setBuscaAberta((v) => !v);
                  if (buscaAberta) setBuscaTermo("");
                }}
              >
                <Search className="h-3.5 w-3.5" />
              </Button>
            </div>
            {conversaSel?.titulo_atendimento && (
              <p className="text-xs text-muted-foreground italic">"{conversaSel.titulo_atendimento}"</p>
            )}
            {buscaAberta && (
              <div className="relative mt-2">
                <Search className="absolute left-2.5 top-2.5 h-3.5 w-3.5 text-muted-foreground" />
                <Input
                  placeholder="Buscar nas mensagens..."
                  value={buscaTermo}
                  onChange={(e) => setBuscaTermo(e.target.value)}
                  className="pl-8 pr-8 h-9 text-xs"
                  autoFocus
                />
                {buscaTermo && (
                  <button
                    className="absolute right-2.5 top-2.5 text-muted-foreground hover:text-foreground"
                    onClick={() => setBuscaTermo("")}
                  >
                    <X className="h-3.5 w-3.5" />
                  </button>
                )}
              </div>
            )}
            {buscaTermo.trim() && (
              <p className="text-xs text-muted-foreground mt-1">
                {mensagensFiltradas.length > 0
                  ? `${mensagensFiltradas.length} mensagem(ns) encontrada(s)`
                  : `Nenhuma mensagem encontrada para "${buscaTermo}"`}
              </p>
            )}
          </DialogHeader>

          {loadingMsg ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
            </div>
          ) : mensagensFiltradas.length === 0 && !buscaTermo.trim() ? (
            <p className="text-sm text-muted-foreground text-center py-8">Nenhuma mensagem encontrada.</p>
          ) : mensagensFiltradas.length === 0 && buscaTermo.trim() ? (
            <p className="text-sm text-muted-foreground text-center py-8">
              Nenhuma mensagem encontrada para "{buscaTermo}"
            </p>
          ) : (
            <div className="flex-1 overflow-y-auto max-h-[60vh] pr-2">
              <div className="space-y-2 py-2">
                {mensagensFiltradas.map((m) => {
                  const isSistema = m.remetente === "sistema" || m.tipo === "sistema";
                  const isAtendente = m.remetente === "atendente";
                  const isBot = m.remetente === "bot" || m.tipo === "bot";

                  if (isSistema) {
                    return (
                      <div key={m.id} className="text-center">
                        <span className="text-[10px] text-muted-foreground italic bg-muted/50 px-2 py-0.5 rounded-full">
                          {buscaTermo ? <HighlightText text={m.conteudo || ""} term={buscaTermo} /> : m.conteudo}
                          {m.created_at && ` • ${format(new Date(m.created_at), "HH:mm")}`}
                        </span>
                      </div>
                    );
                  }

                  return (
                    <div key={m.id} className={cn("flex", isAtendente || isBot ? "justify-end" : "justify-start")}>
                      <div className={cn(
                        "max-w-[75%] rounded-lg px-3 py-2 text-xs",
                        isAtendente || isBot
                          ? "bg-primary/10 text-foreground"
                          : "bg-muted text-foreground"
                      )}>
                        <p className="font-medium text-[10px] text-muted-foreground mb-0.5">
                          {isAtendente ? ((m.atendente as any)?.full_name || "Atendente") : isBot ? "🤖 Bot" : "Cliente"}
                        </p>
                        <p className="whitespace-pre-wrap break-words">
                          {buscaTermo ? <HighlightText text={m.conteudo || ""} term={buscaTermo} /> : m.conteudo}
                        </p>
                        {m.created_at && (
                          <p className="text-[10px] text-muted-foreground/70 mt-1 text-right">
                            {format(new Date(m.created_at), "dd/MM HH:mm")}
                          </p>
                        )}
                      </div>
                    </div>
                  );
                })}
                <div ref={msgEndRef} />
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </>
  );
}
