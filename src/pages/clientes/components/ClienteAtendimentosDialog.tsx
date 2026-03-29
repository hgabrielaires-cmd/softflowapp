import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Headset, Eye, Loader2, MessageSquare, X } from "lucide-react";
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
  atendente: { full_name: string } | null;
  setor: { nome: string } | null;
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

export function ClienteAtendimentosDialog({ open, onOpenChange, cliente }: Props) {
  const [conversas, setConversas] = useState<Conversa[]>([]);
  const [loading, setLoading] = useState(false);
  const [limit, setLimit] = useState(10);
  const [total, setTotal] = useState(0);

  // Mensagens dialog
  const [mensagensOpen, setMensagensOpen] = useState(false);
  const [mensagens, setMensagens] = useState<Mensagem[]>([]);
  const [loadingMsg, setLoadingMsg] = useState(false);
  const [conversaSel, setConversaSel] = useState<Conversa | null>(null);

  useEffect(() => {
    if (!open || !cliente?.id) {
      setConversas([]);
      setLimit(10);
      setTotal(0);
      return;
    }
    fetchConversas();
  }, [open, cliente?.id, limit]);

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
        .select("id, protocolo, created_at, status, titulo_atendimento, tempo_atendimento_segundos, atendente:profiles!chat_conversas_atendente_id_fkey(full_name), setor:setores!chat_conversas_setor_id_fkey(nome)")
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

  const badge = (status: string | null) => {
    const s = STATUS_BADGE[status || ""] || { class: "bg-muted text-muted-foreground", label: status || "—" };
    return <Badge className={cn("text-[10px] border-0", s.class)}>{s.label}</Badge>;
  };

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
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
                      <th className="text-left px-3 py-2 font-medium">Atendente</th>
                      <th className="text-left px-3 py-2 font-medium">Setor</th>
                      <th className="text-left px-3 py-2 font-medium">Status</th>
                      <th className="text-left px-3 py-2 font-medium">Duração</th>
                      <th className="text-center px-3 py-2 font-medium w-16">Ações</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border">
                    {conversas.map((c) => (
                      <tr key={c.id} className="hover:bg-muted/30 transition-colors">
                        <td className="px-3 py-2 font-mono text-xs">{c.protocolo || "—"}</td>
                        <td className="px-3 py-2 text-xs">{format(new Date(c.created_at), "dd/MM/yyyy HH:mm")}</td>
                        <td className="px-3 py-2 text-xs">{(c.atendente as any)?.full_name || "—"}</td>
                        <td className="px-3 py-2 text-xs">{(c.setor as any)?.nome || "—"}</td>
                        <td className="px-3 py-2">{badge(c.status)}</td>
                        <td className="px-3 py-2 text-xs">{formatDuracao(c.tempo_atendimento_segundos)}</td>
                        <td className="px-3 py-2 text-center">
                          <Button variant="ghost" size="icon" className="h-7 w-7" title="Ver mensagens" onClick={() => abrirMensagens(c)}>
                            <Eye className="h-3.5 w-3.5" />
                          </Button>
                        </td>
                      </tr>
                    ))}
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
            <DialogTitle className="flex items-center gap-2 text-sm">
              <MessageSquare className="h-4 w-4" />
              Atendimento {conversaSel?.protocolo || ""}
            </DialogTitle>
            {conversaSel?.titulo_atendimento && (
              <p className="text-xs text-muted-foreground italic">"{conversaSel.titulo_atendimento}"</p>
            )}
          </DialogHeader>

          {loadingMsg ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
            </div>
          ) : mensagens.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-8">Nenhuma mensagem encontrada.</p>
          ) : (
            <ScrollArea className="flex-1 max-h-[60vh] pr-2">
              <div className="space-y-2 py-2">
                {mensagens.map((m) => {
                  const isSistema = m.remetente === "sistema" || m.tipo === "sistema";
                  const isAtendente = m.remetente === "atendente";
                  const isBot = m.remetente === "bot" || m.tipo === "bot";

                  if (isSistema) {
                    return (
                      <div key={m.id} className="text-center">
                        <span className="text-[10px] text-muted-foreground italic bg-muted/50 px-2 py-0.5 rounded-full">
                          {m.conteudo}
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
                        <p className="whitespace-pre-wrap break-words">{m.conteudo}</p>
                        {m.created_at && (
                          <p className="text-[10px] text-muted-foreground/70 mt-1 text-right">
                            {format(new Date(m.created_at), "dd/MM HH:mm")}
                          </p>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </ScrollArea>
          )}
        </DialogContent>
      </Dialog>
    </>
  );
}
