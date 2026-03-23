import { useRef, useEffect, useState } from "react";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Send, Paperclip, Zap, Lock, MessageSquare } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { ChatConversa, ChatMensagem, STATUS_COLORS, STATUS_LABELS, ChatStatus } from "../types";
import { formatarTelefone } from "../helpers";
import { format } from "date-fns";

interface Props {
  conversa: ChatConversa | null;
  mensagens: ChatMensagem[];
  userId: string | null;
  userName: string;
  onSend: (texto: string, tipo?: string) => void;
  onIniciarAtendimento: () => void;
  onEncerrar: () => void;
  onTransferir: () => void;
  isLoading?: boolean;
}

export default function ChatMessageArea({
  conversa, mensagens, userId, userName,
  onSend, onIniciarAtendimento, onEncerrar, onTransferir, isLoading,
}: Props) {
  const [texto, setTexto] = useState("");
  const [modoNota, setModoNota] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [mensagens]);

  if (!conversa) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center gap-3 text-muted-foreground bg-muted/20">
        <MessageSquare className="h-16 w-16 opacity-20" />
        <p className="text-lg font-medium">Selecione uma conversa</p>
        <p className="text-sm">Escolha uma conversa na lista ao lado para iniciar</p>
      </div>
    );
  }

  const podeComentar =
    conversa.status === "em_atendimento" && conversa.atendente_id === userId;
  const podeIniciar =
    conversa.status === "aguardando" || conversa.status === "bot";

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!texto.trim()) return;
    onSend(texto.trim(), modoNota ? "nota_interna" : "texto");
    setTexto("");
    setModoNota(false);
  }

  return (
    <div className="flex-1 flex flex-col bg-background min-w-0">
      {/* Header */}
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
          {podeIniciar && (
            <Button size="sm" onClick={onIniciarAtendimento}>
              Iniciar Atendimento
            </Button>
          )}
          {conversa.status === "em_atendimento" && (
            <>
              <Button size="sm" variant="outline" onClick={onTransferir}>
                Transferir
              </Button>
              <Button size="sm" variant="destructive" onClick={onEncerrar}>
                Encerrar
              </Button>
            </>
          )}
        </div>
      </div>

      {/* Messages */}
      <div ref={scrollRef} className="flex-1 overflow-y-auto p-4 space-y-3">
        {mensagens.map((msg) => {
          const isCliente = msg.remetente === "cliente";
          const isAtendente = msg.remetente === "atendente";
          const isBot = msg.remetente === "bot";
          const isSistema = msg.remetente === "sistema";
          const isNota = msg.tipo === "nota_interna";
          const hora = msg.created_at ? format(new Date(msg.created_at), "HH:mm") : "";

          if (isSistema || msg.tipo === "sistema") {
            return (
              <div key={msg.id} className="flex justify-center">
                <span className="text-xs text-muted-foreground bg-muted/50 px-3 py-1 rounded-full">
                  {msg.conteudo} • {hora}
                </span>
              </div>
            );
          }

          if (isNota) {
            return (
              <div key={msg.id} className="flex justify-center">
                <div className="bg-yellow-50 border border-yellow-200 rounded-lg px-4 py-2 max-w-[70%]">
                  <div className="flex items-center gap-1 text-xs text-yellow-700 mb-1">
                    <Lock className="h-3 w-3" />
                    <span className="font-medium">Nota interna</span>
                    <span>• {(msg.atendente as any)?.full_name || "Atendente"} • {hora}</span>
                  </div>
                  <p className="text-sm text-yellow-900">{msg.conteudo}</p>
                </div>
              </div>
            );
          }

          if (isBot) {
            return (
              <div key={msg.id} className="flex justify-center">
                <div className="bg-purple-50 border border-purple-200 rounded-lg px-4 py-2 max-w-[70%]">
                  <div className="text-xs text-purple-600 mb-1">🤖 Bot • {hora}</div>
                  <p className="text-sm text-purple-900 italic whitespace-pre-wrap">{msg.conteudo}</p>
                </div>
              </div>
            );
          }

          return (
            <div key={msg.id} className={cn("flex", isAtendente ? "justify-end" : "justify-start")}>
              <div className={cn(
                "max-w-[70%] rounded-2xl px-4 py-2",
                isAtendente
                  ? "bg-[hsl(var(--primary))] text-primary-foreground rounded-br-md"
                  : "bg-muted text-foreground rounded-bl-md"
              )}>
                {/* Media */}
                {msg.tipo === "imagem" && msg.media_url && (
                  <img src={msg.media_url} alt="" className="rounded-lg max-w-full max-h-60 mb-1" />
                )}
                {msg.tipo === "audio" && msg.media_url && (
                  <audio controls src={msg.media_url} className="max-w-full mb-1" />
                )}
                {msg.tipo === "documento" && msg.media_url && (
                  <a href={msg.media_url} target="_blank" rel="noreferrer"
                    className="flex items-center gap-2 text-xs underline mb-1">
                    📄 {msg.media_nome || "Documento"}
                  </a>
                )}
                {msg.conteudo && (
                  <p className="text-sm whitespace-pre-wrap">{msg.conteudo}</p>
                )}
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

      {/* Input */}
      {(podeComentar || podeIniciar) && conversa.status !== "encerrado" && (
        <div className="border-t border-border p-3 bg-card">
          {!podeComentar && podeIniciar ? (
            <p className="text-sm text-center text-muted-foreground">
              Inicie o atendimento para responder
            </p>
          ) : (
            <>
              <div className="flex items-center gap-2 mb-2">
                <Button variant="ghost" size="sm" className="h-7 text-xs gap-1" disabled>
                  <Paperclip className="h-3 w-3" /> Mídia
                </Button>
                <Button
                  variant={modoNota ? "secondary" : "ghost"}
                  size="sm"
                  className="h-7 text-xs gap-1"
                  onClick={() => setModoNota(!modoNota)}
                >
                  <Lock className="h-3 w-3" /> Nota interna
                </Button>
              </div>
              <form onSubmit={handleSubmit} className="flex items-center gap-2">
                <Input
                  placeholder={modoNota ? "Nota interna (não enviada ao cliente)..." : "Digite sua mensagem..."}
                  value={texto}
                  onChange={(e) => setTexto(e.target.value)}
                  className={cn("flex-1", modoNota && "border-yellow-400 bg-yellow-50")}
                />
                <Button type="submit" size="icon" disabled={!texto.trim()}>
                  <Send className="h-4 w-4" />
                </Button>
              </form>
            </>
          )}
        </div>
      )}
    </div>
  );
}
