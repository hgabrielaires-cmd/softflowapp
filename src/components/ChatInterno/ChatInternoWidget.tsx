import { useState, useRef, useEffect, useCallback, useMemo } from "react";
import { MessageSquare, X, ArrowLeft, Send, Users, UsersRound, Plus } from "lucide-react";
import { cn } from "@/lib/utils";
import { resolvePresencaStatus } from "@/lib/presenca";
import { useAuth } from "@/context/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { useConversasInternas, ConversaInterna } from "@/hooks/useConversasInternas";
import { useMensagensInternas } from "@/hooks/useMensagensInternas";
import { useNaoLidasInternas } from "@/hooks/useNaoLidasInternas";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Checkbox } from "@/components/ui/checkbox";
import { ScrollArea } from "@/components/ui/scroll-area";
import { toast } from "sonner";
import { format } from "date-fns";

function getInitials(name: string) {
  return name.split(" ").map((n) => n[0]).join("").slice(0, 2).toUpperCase();
}

function playNotificationSound() {
  try {
    const audioCtx = new (window.AudioContext || (window as any).webkitAudioContext)();
    const oscillator = audioCtx.createOscillator();
    const gainNode = audioCtx.createGain();
    oscillator.connect(gainNode);
    gainNode.connect(audioCtx.destination);
    oscillator.frequency.value = 880;
    gainNode.gain.setValueAtTime(0.1, audioCtx.currentTime);
    gainNode.gain.exponentialRampToValueAtTime(0.001, audioCtx.currentTime + 0.2);
    oscillator.start(audioCtx.currentTime);
    oscillator.stop(audioCtx.currentTime + 0.2);
  } catch {
    // ignore audio errors
  }
}

export function ChatInternoWidget() {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [open, setOpen] = useState(false);
  const [activeConversaId, setActiveConversaId] = useState<string | null>(null);
  const [activeConversaName, setActiveConversaName] = useState("");
  const [msgInput, setMsgInput] = useState("");
  const [sending, setSending] = useState(false);
  const [novoGrupoOpen, setNovoGrupoOpen] = useState(false);
  const [novoGrupoNome, setNovoGrupoNome] = useState("");
  const [novoGrupoSelecionados, setNovoGrupoSelecionados] = useState<string[]>([]);
  const [presenceNow, setPresenceNow] = useState(() => Date.now());
  const scrollRef = useRef<HTMLDivElement>(null);
  const activeConversaIdRef = useRef<string | null>(null);
  const originalTitleRef = useRef(document.title);

  // Keep ref in sync
  useEffect(() => { activeConversaIdRef.current = activeConversaId; }, [activeConversaId]);

  const { data: conversas = [], refetch: refetchConversas } = useConversasInternas();
  const { data: mensagens = [] } = useMensagensInternas(activeConversaId);
  const { data: naoLidas = 0 } = useNaoLidasInternas();

  // ── Title blinking when unread messages ──
  useEffect(() => {
    if (naoLidas > 0 && !open) {
      let showOriginal = false;
      const interval = setInterval(() => {
        document.title = showOriginal ? originalTitleRef.current : "💬 Nova mensagem";
        showOriginal = !showOriginal;
      }, 1000);
      return () => {
        clearInterval(interval);
        document.title = originalTitleRef.current;
      };
    } else {
      document.title = originalTitleRef.current;
    }
  }, [naoLidas, open]);

  // ── Global realtime listener for notifications ──
  useEffect(() => {
    if (!user) return;

    const channel = supabase
      .channel("chat-interno-global-notif")
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "chat_interno_mensagens",
        },
        (payload) => {
          const newMsg = payload.new as any;
          // Only notify if it's not from us and not the active conversation
          if (newMsg.user_id !== user.id && newMsg.conversa_id !== activeConversaIdRef.current) {
            playNotificationSound();
          }
          // Refresh queries
          queryClient.invalidateQueries({ queryKey: ["chat-interno-nao-lidas"] });
          queryClient.invalidateQueries({ queryKey: ["chat-interno-conversas"] });
        }
      )
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [user, queryClient]);

  // Team list
  const { data: equipe = [] } = useQuery({
    queryKey: ["chat-interno-equipe"],
    queryFn: async () => {
      const { data } = await supabase
        .from("profiles")
        .select("user_id, full_name, avatar_url")
        .eq("active", true)
        .order("full_name");
      return data || [];
    },
  });

  // Presence data
  const { data: presencas = [] } = useQuery({
    queryKey: ["chat-interno-presencas"],
    refetchInterval: 30_000,
    queryFn: async () => {
      const { data } = await supabase.from("atendente_presenca").select("user_id, status, last_heartbeat");
      return data || [];
    },
  });

  // Realtime subscription for instant presence updates
  useEffect(() => {
    const channel = supabase
      .channel('presenca-updates-chat')
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'atendente_presenca',
      }, () => {
        queryClient.invalidateQueries({ queryKey: ['chat-interno-presencas'] });
      })
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [queryClient]);

  useEffect(() => {
    const timer = window.setInterval(() => {
      setPresenceNow(Date.now());
    }, 15_000);

    return () => window.clearInterval(timer);
  }, []);

  const presencaMap = useMemo(
    () => new Map(presencas.map((p) => [p.user_id, p])),
    [presencas]
  );

  // Scroll to bottom when messages change
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [mensagens]);

  // Mark messages as read when opening a conversation
  const markAsRead = useCallback(async (conversaId: string) => {
    if (!user) return;
    const { data: msgs } = await supabase
      .from("chat_interno_mensagens")
      .select("id")
      .eq("conversa_id", conversaId)
      .neq("user_id", user.id);

    if (!msgs?.length) return;

    const { data: existing } = await supabase
      .from("chat_interno_leituras")
      .select("mensagem_id")
      .eq("user_id", user.id)
      .in("mensagem_id", msgs.map((m) => m.id));

    const existingSet = new Set(existing?.map((e) => e.mensagem_id) || []);
    const toInsert = msgs.filter((m) => !existingSet.has(m.id)).map((m) => ({
      mensagem_id: m.id,
      user_id: user.id,
    }));

    if (toInsert.length > 0) {
      await supabase.from("chat_interno_leituras").insert(toInsert);
      queryClient.invalidateQueries({ queryKey: ["chat-interno-nao-lidas"] });
      queryClient.invalidateQueries({ queryKey: ["chat-interno-conversas"] });
    }
  }, [user, queryClient]);

  const openConversa = useCallback((c: ConversaInterna) => {
    const name = c.tipo === "direto" ? (c.outro_participante?.full_name || "Conversa") : (c.nome || "Grupo");
    setActiveConversaId(c.id);
    setActiveConversaName(name);
    markAsRead(c.id);
  }, [markAsRead]);

  // Start or open DM with a user (uses SECURITY DEFINER function)
  const startDm = useCallback(async (targetUserId: string, targetName: string) => {
    if (!user) return;

    const { data, error } = await supabase.rpc("criar_conversa_direta", {
      p_target_user_id: targetUserId,
    });

    if (error || !data) {
      console.error("Erro ao criar conversa direta:", error);
      toast.error("Erro ao criar conversa");
      return;
    }

    refetchConversas();
    setActiveConversaId(data);
    setActiveConversaName(targetName);
    markAsRead(data);
  }, [user, markAsRead, refetchConversas]);

  // Create group (uses SECURITY DEFINER function)
  const criarGrupo = useCallback(async () => {
    if (!user || !novoGrupoNome.trim() || novoGrupoSelecionados.length === 0) {
      toast.error("Preencha o nome e selecione participantes");
      return;
    }

    const { data, error } = await supabase.rpc("criar_conversa_grupo", {
      p_nome: novoGrupoNome.trim(),
      p_participantes: novoGrupoSelecionados,
    });

    if (error || !data) {
      console.error("Erro ao criar grupo:", error);
      toast.error("Erro ao criar grupo");
      return;
    }

    setNovoGrupoOpen(false);
    setNovoGrupoNome("");
    setNovoGrupoSelecionados([]);
    refetchConversas();
    toast.success("Grupo criado!");
  }, [user, novoGrupoNome, novoGrupoSelecionados, refetchConversas]);

  // Send message
  const sendMessage = useCallback(async () => {
    if (!user || !activeConversaId || !msgInput.trim() || sending) return;
    setSending(true);
    try {
      const { error: msgError } = await supabase.from("chat_interno_mensagens").insert({
        conversa_id: activeConversaId,
        user_id: user.id,
        conteudo: msgInput.trim(),
      });
      if (msgError) {
        console.error("Erro ao inserir mensagem:", msgError);
        toast.error("Erro ao enviar mensagem");
        return;
      }
      await supabase.from("chat_interno_conversas").update({ updated_at: new Date().toISOString() }).eq("id", activeConversaId);
      setMsgInput("");
    } catch (err) {
      console.error("Erro inesperado ao enviar:", err);
      toast.error("Erro ao enviar mensagem");
    } finally {
      setSending(false);
    }
  }, [user, activeConversaId, msgInput, sending]);

  const getStatusColor = (userId: string) => {
    void presenceNow;
    const p = presencaMap.get(userId);
    const status = resolvePresencaStatus(p?.status, p?.last_heartbeat);
    if (status === "online") return "bg-green-500";
    if (status === "pausa") return "bg-yellow-500";
    return "bg-muted";
  };

  if (!user) return null;

  return (
    <>
      {/* Floating Button */}
      <button
        onClick={() => setOpen(!open)}
        className={cn(
          "fixed bottom-6 right-6 z-50 h-12 w-12 rounded-full shadow-lg flex items-center justify-center transition-all",
          "bg-primary text-primary-foreground hover:bg-primary/90"
        )}
      >
        {open ? <X className="h-5 w-5" /> : <MessageSquare className="h-5 w-5" />}
        {!open && naoLidas > 0 && (
          <span className="absolute -top-1 -right-1 h-5 min-w-5 px-1 rounded-full bg-destructive text-destructive-foreground text-xs flex items-center justify-center font-bold">
            {naoLidas > 99 ? "99+" : naoLidas}
          </span>
        )}
      </button>

      {/* Chat Popup */}
      {open && (
        <div className="fixed bottom-20 right-6 z-50 w-80 h-[28rem] bg-card border border-border rounded-xl shadow-2xl flex flex-col overflow-hidden">
          {activeConversaId ? (
            <div className="flex flex-col h-full">
              <div className="flex items-center gap-2 px-3 py-2 border-b border-border bg-muted/50">
                <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => setActiveConversaId(null)}>
                  <ArrowLeft className="h-4 w-4" />
                </Button>
                <span className="font-semibold text-sm truncate flex-1">{activeConversaName}</span>
              </div>

              <ScrollArea className="flex-1 px-3 py-2" ref={scrollRef}>
                <div className="space-y-2">
                  {mensagens.map((m) => {
                    const isMe = m.user_id === user.id;
                    return (
                      <div key={m.id} className={cn("flex gap-2", isMe && "flex-row-reverse")}>
                        {!isMe && (
                          <Avatar className="h-6 w-6 flex-shrink-0">
                            {m.remetente_avatar && <AvatarImage src={m.remetente_avatar} />}
                            <AvatarFallback className="text-[10px] bg-muted">{getInitials(m.remetente_nome || "U")}</AvatarFallback>
                          </Avatar>
                        )}
                        <div className={cn(
                          "max-w-[75%] rounded-lg px-2.5 py-1.5 text-xs",
                          isMe ? "bg-primary text-primary-foreground" : "bg-muted"
                        )}>
                          {!isMe && <p className="font-semibold text-[10px] mb-0.5 opacity-70">{m.remetente_nome}</p>}
                          <p className="whitespace-pre-wrap break-words">{m.conteudo}</p>
                          <p className={cn("text-[9px] mt-0.5", isMe ? "text-primary-foreground/60" : "text-muted-foreground")}>
                            {format(new Date(m.created_at), "HH:mm")}
                          </p>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </ScrollArea>

              <div className="flex items-center gap-1.5 px-2 py-2 border-t border-border">
                <Input
                  placeholder="Mensagem..."
                  value={msgInput}
                  onChange={(e) => setMsgInput(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && !e.shiftKey && sendMessage()}
                  className="h-8 text-xs"
                />
                <Button size="icon" className="h-8 w-8 flex-shrink-0" onClick={sendMessage} disabled={sending || !msgInput.trim()}>
                  <Send className="h-3.5 w-3.5" />
                </Button>
              </div>
            </div>
          ) : (
            <Tabs defaultValue="conversas" className="flex flex-col h-full">
              <TabsList className="grid grid-cols-3 mx-2 mt-2 h-8">
                <TabsTrigger value="conversas" className="text-xs">Conversas</TabsTrigger>
                <TabsTrigger value="equipe" className="text-xs">Equipe</TabsTrigger>
                <TabsTrigger value="grupos" className="text-xs">Grupos</TabsTrigger>
              </TabsList>

              <TabsContent value="conversas" className="flex-1 overflow-hidden m-0">
                <ScrollArea className="h-full">
                  <div className="p-1.5 space-y-0.5">
                    {conversas.length === 0 && (
                      <p className="text-xs text-muted-foreground text-center py-8">Nenhuma conversa ainda</p>
                    )}
                    {conversas.map((c) => {
                      const name = c.tipo === "direto" ? (c.outro_participante?.full_name || "Conversa") : (c.nome || "Grupo");
                      const avatarUrl = c.tipo === "direto" ? c.outro_participante?.avatar_url : null;
                      return (
                        <button
                          key={c.id}
                          onClick={() => openConversa(c)}
                          className="flex items-center gap-2.5 w-full px-2 py-2 rounded-lg hover:bg-accent transition-colors text-left"
                        >
                          <Avatar className="h-8 w-8 flex-shrink-0">
                            {avatarUrl && <AvatarImage src={avatarUrl} />}
                            <AvatarFallback className="text-xs bg-muted">
                              {c.tipo === "grupo" ? <UsersRound className="h-4 w-4" /> : getInitials(name)}
                            </AvatarFallback>
                          </Avatar>
                          <div className="flex-1 min-w-0">
                            <p className="text-xs font-semibold truncate">{name}</p>
                            {c.ultima_mensagem && (
                              <p className="text-[10px] text-muted-foreground truncate">{c.ultima_mensagem}</p>
                            )}
                          </div>
                          {c.nao_lidas > 0 && (
                            <Badge variant="destructive" className="text-[10px] h-4 min-w-4 px-1 justify-center">
                              {c.nao_lidas}
                            </Badge>
                          )}
                        </button>
                      );
                    })}
                  </div>
                </ScrollArea>
              </TabsContent>

              <TabsContent value="equipe" className="flex-1 overflow-hidden m-0">
                <ScrollArea className="h-full">
                  <div className="p-1.5 space-y-0.5">
                    {equipe.filter((u) => u.user_id !== user.id).map((u) => (
                      <button
                        key={u.user_id}
                        onClick={() => startDm(u.user_id, u.full_name)}
                        className="flex items-center gap-2.5 w-full px-2 py-2 rounded-lg hover:bg-accent transition-colors text-left"
                      >
                        <div className="relative">
                          <Avatar className="h-8 w-8">
                            {u.avatar_url && <AvatarImage src={u.avatar_url} />}
                            <AvatarFallback className="text-xs bg-muted">{getInitials(u.full_name)}</AvatarFallback>
                          </Avatar>
                          <span className={cn("absolute bottom-0 right-0 h-2.5 w-2.5 rounded-full border-2 border-card", getStatusColor(u.user_id))} />
                        </div>
                        <span className="text-xs font-medium truncate">{u.full_name}</span>
                      </button>
                    ))}
                  </div>
                </ScrollArea>
              </TabsContent>

              <TabsContent value="grupos" className="flex-1 overflow-hidden m-0">
                <ScrollArea className="h-full">
                  <div className="p-1.5 space-y-0.5">
                    <Button variant="outline" size="sm" className="w-full text-xs mb-1" onClick={() => setNovoGrupoOpen(true)}>
                      <Plus className="h-3 w-3 mr-1" /> Novo Grupo
                    </Button>
                    {conversas.filter((c) => c.tipo === "grupo").map((c) => (
                      <button
                        key={c.id}
                        onClick={() => openConversa(c)}
                        className="flex items-center gap-2.5 w-full px-2 py-2 rounded-lg hover:bg-accent transition-colors text-left"
                      >
                        <Avatar className="h-8 w-8 flex-shrink-0">
                          <AvatarFallback className="text-xs bg-muted"><UsersRound className="h-4 w-4" /></AvatarFallback>
                        </Avatar>
                        <div className="flex-1 min-w-0">
                          <p className="text-xs font-semibold truncate">{c.nome || "Grupo"}</p>
                          {c.ultima_mensagem && (
                            <p className="text-[10px] text-muted-foreground truncate">{c.ultima_mensagem}</p>
                          )}
                        </div>
                        {c.nao_lidas > 0 && (
                          <Badge variant="destructive" className="text-[10px] h-4 min-w-4 px-1 justify-center">
                            {c.nao_lidas}
                          </Badge>
                        )}
                      </button>
                    ))}
                  </div>
                </ScrollArea>
              </TabsContent>
            </Tabs>
          )}
        </div>
      )}

      {/* New Group Dialog */}
      <Dialog open={novoGrupoOpen} onOpenChange={setNovoGrupoOpen}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>Novo Grupo</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <Input
              placeholder="Nome do grupo"
              value={novoGrupoNome}
              onChange={(e) => setNovoGrupoNome(e.target.value)}
              className="text-sm"
            />
            <div className="text-xs font-medium text-muted-foreground">Participantes:</div>
            <ScrollArea className="h-48 border rounded-lg p-2">
              {equipe.filter((u) => u.user_id !== user.id).map((u) => (
                <label key={u.user_id} className="flex items-center gap-2 py-1.5 px-1 hover:bg-accent rounded cursor-pointer">
                  <Checkbox
                    checked={novoGrupoSelecionados.includes(u.user_id)}
                    onCheckedChange={(checked) => {
                      setNovoGrupoSelecionados((prev) =>
                        checked ? [...prev, u.user_id] : prev.filter((id) => id !== u.user_id)
                      );
                    }}
                  />
                  <Avatar className="h-6 w-6">
                    {u.avatar_url && <AvatarImage src={u.avatar_url} />}
                    <AvatarFallback className="text-[10px] bg-muted">{getInitials(u.full_name)}</AvatarFallback>
                  </Avatar>
                  <span className="text-xs">{u.full_name}</span>
                </label>
              ))}
            </ScrollArea>
          </div>
          <DialogFooter>
            <Button size="sm" onClick={criarGrupo} disabled={!novoGrupoNome.trim() || novoGrupoSelecionados.length === 0}>
              Criar Grupo
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
