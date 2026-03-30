import { useRef, useEffect, useState, useMemo, useCallback, ReactNode } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/context/AuthContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Send, Lock, MessageSquare, Download, FileText, FileSpreadsheet, File as FileIcon, Search, X, ChevronUp, ChevronDown, ArrowLeft, LogOut } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { ChatConversa, ChatMensagem, STATUS_COLORS, STATUS_LABELS, ChatStatus } from "../types";
import { formatarTelefone } from "../helpers";
import { format } from "date-fns";
import ChatInputArea from "./ChatInputArea";
import { toast } from "sonner";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";

function getDocIcon(nome: string | null) {
  if (!nome) return <FileIcon className="h-4 w-4" />;
  const ext = nome.split(".").pop()?.toLowerCase();
  if (ext === "pdf") return <FileText className="h-4 w-4 text-destructive" />;
  if (ext === "xls" || ext === "xlsx") return <FileSpreadsheet className="h-4 w-4 text-green-600" />;
  if (ext === "doc" || ext === "docx") return <FileText className="h-4 w-4 text-blue-600" />;
  return <FileIcon className="h-4 w-4 text-muted-foreground" />;
}

function highlightTexto(texto: string, termo: string): ReactNode {
  if (!termo.trim()) return texto;
  const escaped = termo.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const regex = new RegExp(`(${escaped})`, "gi");
  const parts = texto.split(regex);
  return parts.map((part, i) =>
    regex.test(part) ? (
      <mark key={i} className="bg-yellow-300 rounded px-0.5">{part}</mark>
    ) : (
      part
    )
  );
}

interface Props {
  conversa: ChatConversa | null;
  mensagens: ChatMensagem[];
  userId: string | null;
  userName: string;
  onSend: (texto: string, tipo?: string) => void;
  onSendMedia: (file: File, caption: string) => Promise<void>;
  onIniciarAtendimento: () => void;
  onEncerrar: () => void;
  onTransferir: () => void;
  onLeaveConversation?: () => void;
  isLoading?: boolean;
}

export default function ChatMessageArea({
  conversa, mensagens, userId, userName,
  onSend, onSendMedia, onIniciarAtendimento, onEncerrar, onTransferir, onLeaveConversation, isLoading,
}: Props) {
  const { profile } = useAuth();
  const qc = useQueryClient();
  // Check if user is a collaborator on this conversation
  const { data: ehColaborador } = useQuery({
    queryKey: ["chat-colaborador", conversa?.id, userId],
    queryFn: async () => {
      if (!conversa?.id || !userId) return false;
      const { data } = await supabase
        .from("chat_conversa_atendentes")
        .select("id")
        .eq("conversa_id", conversa.id)
        .eq("user_id", userId)
        .maybeSingle();
      return !!data;
    },
    enabled: !!conversa?.id && !!userId,
  });

  const [modoNota, setModoNota] = useState(false);
  const [imagemFull, setImagemFull] = useState<string | null>(null);
  const scrollRef = useRef<HTMLDivElement>(null);

  // Search state
  const [buscaAtiva, setBuscaAtiva] = useState(false);
  const [termoBusca, setTermoBusca] = useState("");
  const [resultadoIndex, setResultadoIndex] = useState(0);
  const buscaInputRef = useRef<HTMLInputElement>(null);

  const mensagensFiltradas = useMemo(() => {
    if (!termoBusca.trim()) return [];
    const termo = termoBusca.toLowerCase();
    return mensagens
      .map((msg, index) => ({ msg, index }))
      .filter(({ msg }) => msg.conteudo?.toLowerCase().includes(termo));
  }, [mensagens, termoBusca]);

  // Reset search when conversation changes
  useEffect(() => {
    setBuscaAtiva(false);
    setTermoBusca("");
    setResultadoIndex(0);
  }, [conversa?.id]);

  // Reset index when results change
  useEffect(() => {
    setResultadoIndex(0);
  }, [mensagensFiltradas.length]);

  // Scroll to matched message
  useEffect(() => {
    if (mensagensFiltradas.length > 0 && buscaAtiva) {
      const match = mensagensFiltradas[resultadoIndex];
      if (match) {
        const el = document.getElementById(`msg-${match.msg.id}`);
        el?.scrollIntoView({ behavior: "smooth", block: "center" });
      }
    }
  }, [resultadoIndex, mensagensFiltradas, buscaAtiva]);

  // Focus search input when activated
  useEffect(() => {
    if (buscaAtiva) buscaInputRef.current?.focus();
  }, [buscaAtiva]);

  // Scroll to bottom on new messages (only when search is not active)
  useEffect(() => {
    if (!buscaAtiva && scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [mensagens, buscaAtiva]);

  const fecharBusca = useCallback(() => {
    setBuscaAtiva(false);
    setTermoBusca("");
    setResultadoIndex(0);
  }, []);

  const navAnterior = useCallback(() => {
    setResultadoIndex((i) => (i > 0 ? i - 1 : mensagensFiltradas.length - 1));
  }, [mensagensFiltradas.length]);

  const navProximo = useCallback(() => {
    setResultadoIndex((i) => (i < mensagensFiltradas.length - 1 ? i + 1 : 0));
  }, [mensagensFiltradas.length]);

  const handleSearchKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (e.key === "Escape") fecharBusca();
      if (e.key === "Enter" && !e.shiftKey) {
        e.preventDefault();
        e.shiftKey ? navAnterior() : navProximo();
      }
      if (e.key === "ArrowUp") { e.preventDefault(); navAnterior(); }
      if (e.key === "ArrowDown") { e.preventDefault(); navProximo(); }
    },
    [fecharBusca, navAnterior, navProximo]
  );

  // Check if a message is the currently highlighted search result
  const currentMatchId = mensagensFiltradas[resultadoIndex]?.msg.id ?? null;

  if (!conversa) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center gap-3 text-muted-foreground bg-muted/20">
        <MessageSquare className="h-16 w-16 opacity-20" />
        <p className="text-lg font-medium">Selecione uma conversa</p>
        <p className="text-sm">Escolha uma conversa na lista ao lado para iniciar</p>
      </div>
    );
  }

  const podeComentar = conversa.status === "em_atendimento" && (conversa.atendente_id === userId || !!ehColaborador);
  const podeIniciar = conversa.status === "aguardando" || conversa.status === "bot";
  const isColaboradorNaoResponsavel = !!ehColaborador && conversa.atendente_id !== userId;
  const termoAtivo = buscaAtiva && termoBusca.trim().length > 0;

  async function handleSairConversa() {
    if (!conversa || !userId) return;
    try {
      const { error } = await (supabase as any)
        .from("chat_conversa_atendentes")
        .delete()
        .eq("conversa_id", conversa.id)
        .eq("user_id", userId);
      if (error) throw error;
      const meuNome = (profile as any)?.full_name || "Atendente";
      await supabase.from("chat_mensagens").insert({
        conversa_id: conversa.id,
        tipo: "sistema",
        conteudo: `${meuNome} saiu da conversa`,
        remetente: "sistema",
      });
      toast.success("Você saiu da conversa");
      qc.invalidateQueries({ queryKey: ["chat-conversa-atendentes", conversa.id] });
      qc.invalidateQueries({ queryKey: ["chat-mensagens"] });
      qc.invalidateQueries({ queryKey: ["chat-conversas"] });
      qc.invalidateQueries({ queryKey: ["chat-colaborador"] });
      onLeaveConversation?.();
    } catch (e: any) {
      toast.error("Erro ao sair: " + e.message);
    }
  }

  return (
    <div className="flex-1 flex flex-col bg-background min-w-0">
      {/* Header */}
      {buscaAtiva ? (
        <div className="border-b border-border px-3 py-2.5 flex items-center gap-2 bg-card">
          <Button size="icon" variant="ghost" className="h-8 w-8 flex-shrink-0" onClick={fecharBusca}>
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <div className="relative flex-1">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              ref={buscaInputRef}
              value={termoBusca}
              onChange={(e) => setTermoBusca(e.target.value)}
              onKeyDown={handleSearchKeyDown}
              placeholder="Buscar nas mensagens..."
              className="pl-8 h-8 text-sm"
            />
          </div>
          {termoAtivo && (
            <span className="text-xs text-muted-foreground whitespace-nowrap min-w-[50px] text-center">
              {mensagensFiltradas.length > 0
                ? `${resultadoIndex + 1}/${mensagensFiltradas.length}`
                : "0/0"}
            </span>
          )}
          <div className="flex items-center gap-0.5">
            <Button size="icon" variant="ghost" className="h-7 w-7" onClick={navAnterior} disabled={mensagensFiltradas.length === 0}>
              <ChevronUp className="h-4 w-4" />
            </Button>
            <Button size="icon" variant="ghost" className="h-7 w-7" onClick={navProximo} disabled={mensagensFiltradas.length === 0}>
              <ChevronDown className="h-4 w-4" />
            </Button>
          </div>
          <Button size="icon" variant="ghost" className="h-7 w-7 flex-shrink-0" onClick={fecharBusca}>
            <X className="h-4 w-4" />
          </Button>
        </div>
      ) : (
        <div className="border-b border-border px-4 py-3 flex items-center justify-between bg-card">
          <div className="flex items-center gap-3 min-w-0">
            <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center text-sm font-semibold text-primary flex-shrink-0">
              {(conversa.nome_cliente || "?")[0].toUpperCase()}
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-2">
                <h3 className="font-semibold text-foreground truncate">
                  {conversa.nome_cliente || "Cliente"}
                </h3>
                <span className={cn("w-2 h-2 rounded-full", STATUS_COLORS[conversa.status as ChatStatus])} />
                <span className="text-xs text-muted-foreground">
                  {STATUS_LABELS[conversa.status as ChatStatus]}
                </span>
              </div>
              <div className="flex items-center gap-2 text-xs text-muted-foreground">
                <span>{formatarTelefone(conversa.numero_cliente)}</span>
                {conversa.protocolo && <span>• {conversa.protocolo}</span>}
                {conversa.setor && (
                  <Badge variant="outline" className="text-[10px] px-1 py-0 h-4">
                    {(conversa.setor as any)?.nome}
                  </Badge>
                )}
              </div>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Button size="icon" variant="ghost" className="h-8 w-8" onClick={() => setBuscaAtiva(true)} title="Buscar mensagens">
              <Search className="h-4 w-4" />
            </Button>
            {podeIniciar && (
              <Button size="sm" onClick={onIniciarAtendimento} disabled={isLoading}>
                {isLoading ? "Iniciando..." : "Iniciar Atendimento"}
              </Button>
            )}
            {conversa.status === "em_atendimento" && (
              <>
                {isColaboradorNaoResponsavel && (
                  <AlertDialog>
                    <AlertDialogTrigger asChild>
                      <Button size="sm" variant="outline" className="text-destructive border-destructive/30 hover:bg-destructive/10 gap-1">
                        <LogOut className="h-3.5 w-3.5" /> Sair
                      </Button>
                    </AlertDialogTrigger>
                    <AlertDialogContent>
                      <AlertDialogHeader>
                        <AlertDialogTitle>Sair da conversa?</AlertDialogTitle>
                        <AlertDialogDescription>
                          Deseja sair desta conversa? Ela continuará ativa para os outros atendentes.
                        </AlertDialogDescription>
                      </AlertDialogHeader>
                      <AlertDialogFooter>
                        <AlertDialogCancel>Cancelar</AlertDialogCancel>
                        <AlertDialogAction
                          onClick={handleSairConversa}
                          className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                        >
                          Sair
                        </AlertDialogAction>
                      </AlertDialogFooter>
                    </AlertDialogContent>
                  </AlertDialog>
                )}
                {!isColaboradorNaoResponsavel && (
                  <Button size="sm" variant="outline" onClick={onTransferir}>Transferir</Button>
                )}
                <Button size="sm" variant="destructive" onClick={onEncerrar}>Encerrar</Button>
              </>
            )}
          </div>
        </div>
      )}

      {/* Messages */}
      <div ref={scrollRef} className="flex-1 overflow-y-auto p-4 space-y-3">
        {mensagens.map((msg) => {
          const isAtendente = msg.remetente === "atendente";
          const isBot = msg.remetente === "bot";
          const isSistema = msg.remetente === "sistema";
          const isNota = msg.tipo === "nota_interna";
          const hora = msg.created_at ? format(new Date(msg.created_at), "HH:mm") : "";
          const isCurrentMatch = currentMatchId === msg.id;

          const renderConteudo = (texto: string | null, className?: string) => {
            if (!texto) return null;
            return (
              <p className={cn("text-sm whitespace-pre-wrap", className)}>
                {termoAtivo ? highlightTexto(texto, termoBusca) : texto}
              </p>
            );
          };

          if (isSistema || msg.tipo === "sistema") {
            return (
              <div key={msg.id} id={`msg-${msg.id}`} className="flex justify-center">
                <span className="text-xs text-muted-foreground bg-muted/50 px-3 py-1 rounded-full">
                  {msg.conteudo} • {hora}
                </span>
              </div>
            );
          }

          if (isNota) {
            return (
              <div key={msg.id} id={`msg-${msg.id}`} className={cn("flex justify-center", isCurrentMatch && "ring-2 ring-yellow-400 rounded-lg")}>
                <div className="bg-yellow-50 border border-yellow-200 rounded-lg px-4 py-2 max-w-[70%]">
                  <div className="flex items-center gap-1 text-xs text-yellow-700 mb-1">
                    <Lock className="h-3 w-3" />
                    <span className="font-medium">Nota interna</span>
                    <span>• {(msg.atendente as any)?.full_name || "Atendente"} • {hora}</span>
                  </div>
                  {renderConteudo(msg.conteudo, "text-yellow-900")}
                </div>
              </div>
            );
          }

          if (isBot) {
            return (
              <div key={msg.id} id={`msg-${msg.id}`} className={cn("flex justify-center", isCurrentMatch && "ring-2 ring-yellow-400 rounded-lg")}>
                <div className="bg-purple-50 border border-purple-200 rounded-lg px-4 py-2 max-w-[70%]">
                  <div className="text-xs text-purple-600 mb-1">🤖 Bot • {hora}</div>
                  {renderConteudo(msg.conteudo, "text-purple-900 italic")}
                </div>
              </div>
            );
          }

          return (
            <div key={msg.id} id={`msg-${msg.id}`} className={cn("flex", isAtendente ? "justify-end" : "justify-start")}>
              <div className={cn(
                "max-w-[70%] rounded-2xl px-4 py-2",
                isAtendente
                  ? "bg-[hsl(var(--primary))] text-primary-foreground rounded-br-md"
                  : "bg-muted text-foreground rounded-bl-md",
                isCurrentMatch && "ring-2 ring-yellow-400"
              )}>
                {msg.tipo === "imagem" && msg.media_url && (
                  <img
                    src={msg.media_url} alt=""
                    className="rounded-lg max-w-full max-h-60 mb-1 cursor-pointer hover:opacity-90 transition-opacity"
                    onClick={() => setImagemFull(msg.media_url)}
                  />
                )}
                {msg.tipo === "audio" && msg.media_url && (
                  <audio controls src={msg.media_url} className="max-w-full mb-1" />
                )}
                {msg.tipo === "video" && msg.media_url && (
                  <video controls className="rounded-lg max-w-full mb-1" style={{ maxHeight: "300px" }}>
                    <source src={msg.media_url} type={msg.media_tipo || "video/mp4"} />
                    Seu navegador não suporta vídeo.
                  </video>
                )}
                {msg.tipo === "documento" && msg.media_url && (
                  <a href={msg.media_url} target="_blank" rel="noreferrer"
                    className="flex items-center gap-2 text-xs mb-1 p-2 rounded bg-background/10 hover:bg-background/20 transition-colors">
                    {getDocIcon(msg.media_nome)}
                    <span className="truncate flex-1">{msg.media_nome || "Documento"}</span>
                    <Download className="h-3 w-3 flex-shrink-0" />
                  </a>
                )}
                {renderConteudo(msg.conteudo)}
                <p className={cn(
                  "text-[10px] mt-1",
                  isAtendente ? "text-primary-foreground/70" : "text-muted-foreground"
                )}>
                  {isAtendente && (msg.atendente as any)?.full_name && (
                    <span>{(msg.atendente as any).full_name} • </span>
                  )}
                  {hora}
                </p>
              </div>
            </div>
          );
        })}
      </div>

      {/* Fullscreen image overlay */}
      {imagemFull && (
        <div className="fixed inset-0 z-50 bg-black/80 flex items-center justify-center cursor-pointer" onClick={() => setImagemFull(null)}>
          <img src={imagemFull} alt="" className="max-w-[90vw] max-h-[90vh] rounded-lg" />
        </div>
      )}

      {/* Input */}
      {(podeComentar || podeIniciar) && conversa.status !== "encerrado" && (
        <div>
          {!podeComentar && podeIniciar ? (
            <div className="border-t border-border p-3 bg-card">
              <p className="text-sm text-center text-muted-foreground">Inicie o atendimento para responder</p>
            </div>
          ) : (
            <ChatInputArea
              onSend={onSend}
              onSendMedia={onSendMedia}
              modoNota={modoNota}
              setModoNota={setModoNota}
              userId={userId}
              userName={userName}
              conversaId={conversa.id}
              protocolo={conversa.protocolo}
              nomeCliente={conversa.nome_cliente}
            />
          )}
        </div>
      )}
    </div>
  );
}
