import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useChatMensagens } from "../useChatQueries";
import { STATUS_LABELS, ChatStatus } from "../types";
import { format } from "date-fns";
import { cn } from "@/lib/utils";
import { Lock } from "lucide-react";

interface Props {
  conversaId: string | null;
  open: boolean;
  onClose: () => void;
  protocolo?: string;
  data?: string;
}

export default function ChatHistoricoDrawer({ conversaId, open, onClose, protocolo, data }: Props) {
  const { data: mensagens = [] } = useChatMensagens(open ? conversaId : null);

  return (
    <Sheet open={open} onOpenChange={onClose}>
      <SheetContent className="w-[40vw] min-w-[360px] sm:max-w-none p-0">
        <SheetHeader className="p-4 border-b border-border">
          <SheetTitle className="text-sm flex items-center gap-2">
            Histórico — {protocolo || "Conversa"}
            {data && <span className="text-xs text-muted-foreground font-normal">{format(new Date(data), "dd/MM/yyyy HH:mm")}</span>}
          </SheetTitle>
        </SheetHeader>
        <ScrollArea className="h-[calc(100vh-5rem)] p-4">
          <div className="space-y-3">
            {mensagens.length === 0 && (
              <p className="text-sm text-muted-foreground text-center py-8">Sem mensagens</p>
            )}
            {(mensagens as any[]).map((msg) => {
              const isCliente = msg.remetente === "cliente";
              const isAtendente = msg.remetente === "atendente";
              const isSistema = msg.remetente === "sistema" || msg.tipo === "sistema";
              const isNota = msg.tipo === "nota_interna";
              const isBot = msg.remetente === "bot";
              const hora = msg.created_at ? format(new Date(msg.created_at), "HH:mm") : "";

              if (isSistema) {
                return (
                  <div key={msg.id} className="flex justify-center">
                    <span className="text-xs text-muted-foreground bg-muted/50 px-3 py-1 rounded-full">{msg.conteudo} • {hora}</span>
                  </div>
                );
              }

              if (isNota) {
                return (
                  <div key={msg.id} className="flex justify-center">
                    <div className="bg-yellow-50 border border-yellow-200 rounded-lg px-3 py-1.5 max-w-[80%]">
                      <div className="flex items-center gap-1 text-xs text-yellow-700 mb-0.5">
                        <Lock className="h-3 w-3" />
                        <span className="font-medium">Nota interna • {hora}</span>
                      </div>
                      <p className="text-sm text-yellow-900">{msg.conteudo}</p>
                    </div>
                  </div>
                );
              }

              if (isBot) {
                return (
                  <div key={msg.id} className="flex justify-center">
                    <div className="bg-purple-50 border border-purple-200 rounded-lg px-3 py-1.5 max-w-[80%]">
                      <div className="text-xs text-purple-600 mb-0.5">🤖 Bot • {hora}</div>
                      <p className="text-sm text-purple-900 italic whitespace-pre-wrap">{msg.conteudo}</p>
                    </div>
                  </div>
                );
              }

              return (
                <div key={msg.id} className={cn("flex", isAtendente ? "justify-end" : "justify-start")}>
                  <div className={cn(
                    "max-w-[80%] rounded-2xl px-3 py-1.5",
                    isAtendente
                      ? "bg-[hsl(var(--primary))] text-primary-foreground rounded-br-md"
                      : "bg-muted text-foreground rounded-bl-md"
                  )}>
                    {msg.tipo === "imagem" && msg.media_url && <img src={msg.media_url} alt="" className="rounded-lg max-w-full max-h-40 mb-1" />}
                    {msg.tipo === "audio" && msg.media_url && <audio controls src={msg.media_url} className="max-w-full mb-1" />}
                    {msg.tipo === "documento" && msg.media_url && (
                      <a href={msg.media_url} target="_blank" rel="noreferrer" className="text-xs underline mb-1 block">📄 {msg.media_nome || "Documento"}</a>
                    )}
                    {msg.conteudo && <p className="text-sm whitespace-pre-wrap">{msg.conteudo}</p>}
                    <p className={cn("text-[10px] mt-0.5", isAtendente ? "text-primary-foreground/70" : "text-muted-foreground")}>
                      {isAtendente && msg.atendente?.full_name && <span>{msg.atendente.full_name} • </span>}
                      {hora}
                    </p>
                  </div>
                </div>
              );
            })}
          </div>
        </ScrollArea>
      </SheetContent>
    </Sheet>
  );
}
