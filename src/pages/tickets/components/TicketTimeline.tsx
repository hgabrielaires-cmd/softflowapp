import { useState } from "react";
import { cn } from "@/lib/utils";
import { TicketComentario, TicketCurtida } from "../types";
import { formatRelativeTime } from "../helpers";
import { UserAvatar } from "@/components/UserAvatar";
import { renderMentionText } from "@/components/MentionInput";
import { Lock, ArrowRightLeft, MessageSquare, Info, Heart, Reply, Send, Paperclip, Download } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { supabase } from "@/integrations/supabase/client";

interface MentionUser {
  id: string;
  user_id: string;
  full_name: string;
}

interface Props {
  comentarios: TicketComentario[];
  curtidas: TicketCurtida[];
  users?: MentionUser[];
  currentUserId: string;
  onToggleLike: (comentarioId: string, liked: boolean) => void;
  onReply: (parentId: string, conteudo: string, visibilidade: "publico" | "interno") => void;
}

export function TicketTimeline({ comentarios, curtidas, users = [], currentUserId, onToggleLike, onReply }: Props) {
  const [replyingTo, setReplyingTo] = useState<string | null>(null);
  const [replyText, setReplyText] = useState("");

  // Separate root comments and replies
  const rootComments = comentarios.filter((c) => !c.parent_id);
  const repliesMap: Record<string, TicketComentario[]> = {};
  comentarios.filter((c) => c.parent_id).forEach((c) => {
    if (!repliesMap[c.parent_id!]) repliesMap[c.parent_id!] = [];
    repliesMap[c.parent_id!].push(c);
  });

  const getLikesForComment = (commentId: string) => curtidas.filter((c) => c.comentario_id === commentId);
  const isLikedByMe = (commentId: string) => curtidas.some((c) => c.comentario_id === commentId && c.user_id === currentUserId);

  const handleReplySubmit = (parentId: string, parentVisibilidade: string) => {
    if (!replyText.trim()) return;
    onReply(parentId, replyText.trim(), parentVisibilidade as "publico" | "interno");
    setReplyText("");
    setReplyingTo(null);
  };

  const renderComment = (c: TicketComentario, isReply = false) => {
    const isComment = c.tipo === "comentario";
    const isInternal = c.visibilidade === "interno";
    const isSystem = c.tipo === "sistema" || c.tipo === "status_change" || c.tipo === "responsavel_change";
    const likes = getLikesForComment(c.id);
    const liked = isLikedByMe(c.id);
    const replies = repliesMap[c.id] || [];

    return (
      <div key={c.id} className={cn("space-y-1", isReply && "ml-6 border-l-2 border-muted pl-3")}>
        <div
          className={cn(
            "rounded-lg p-3 text-sm",
            isComment && !isInternal && "bg-card border-l-4 border-l-[hsl(var(--sidebar-primary))]",
            isComment && isInternal && "bg-amber-50 border-l-4 border-l-amber-400",
            isSystem && "bg-transparent text-muted-foreground"
          )}
        >
          <div className="flex items-center gap-2 mb-1">
            {c.profile && (
              <UserAvatar avatarUrl={c.profile.avatar_url} fullName={c.profile.full_name} size="xs" />
            )}
            <span className="font-medium text-xs">{c.profile?.full_name || "Sistema"}</span>
            {isInternal && <Lock className="h-3 w-3 text-amber-600" />}
            {c.tipo === "status_change" && <ArrowRightLeft className="h-3 w-3" />}
            {c.tipo === "comentario" && <MessageSquare className="h-3 w-3" />}
            {c.tipo === "sistema" && <Info className="h-3 w-3" />}
            <span className="text-[10px] text-muted-foreground ml-auto">
              {formatRelativeTime(c.created_at)}
            </span>
          </div>
          <p className="whitespace-pre-wrap">
            {isComment && users.length > 0 ? renderMentionText(c.conteudo, users) : c.conteudo}
          </p>

          {/* Anexos */}
          {isComment && Array.isArray(c.anexos) && c.anexos.length > 0 && (
            <div className="flex flex-wrap gap-1.5 mt-2">
              {c.anexos.map((a, i) => (
                <button
                  key={i}
                  className="inline-flex items-center gap-1 text-[11px] bg-muted hover:bg-muted/80 px-2 py-1 rounded transition-colors"
                  title={a.nome}
                  onClick={async () => {
                    try {
                      const key = new URL(a.url).pathname.replace(/^\//, "");
                      const { data } = await supabase.functions.invoke("r2-download", { body: { key, filename: a.nome } });
                      if (data?.signedUrl) { window.open(data.signedUrl, "_blank"); }
                      else { window.open(a.url, "_blank"); }
                    } catch { window.open(a.url, "_blank"); }
                  }}
                >
                  <Paperclip className="h-3 w-3 shrink-0" />
                  <span className="max-w-[140px] truncate">{a.nome}</span>
                  <Download className="h-3 w-3 shrink-0 text-muted-foreground" />
                </button>
              ))}
            </div>
          )}

          {/* Actions: Like + Reply */}
          {isComment && (
            <div className="flex items-center gap-3 mt-2">
              <button
                className={cn("flex items-center gap-1 text-[11px] transition-colors", liked ? "text-red-500" : "text-muted-foreground hover:text-red-500")}
                onClick={() => onToggleLike(c.id, liked)}
              >
                <Heart className={cn("h-3 w-3", liked && "fill-current")} />
                {likes.length > 0 && <span>{likes.length}</span>}
              </button>
              <button
                className="flex items-center gap-1 text-[11px] text-muted-foreground hover:text-foreground transition-colors"
                onClick={() => setReplyingTo(replyingTo === c.id ? null : c.id)}
              >
                <Reply className="h-3 w-3" />
                Responder
                {replies.length > 0 && <span className="text-muted-foreground">({replies.length})</span>}
              </button>
            </div>
          )}
        </div>

        {/* Replies */}
        {replies.length > 0 && (
          <div className="space-y-1">
            {replies.map((r) => renderComment(r, true))}
          </div>
        )}

        {/* Reply input */}
        {replyingTo === c.id && (
          <div className="ml-6 flex gap-2 items-end">
            <Textarea
              value={replyText}
              onChange={(e) => setReplyText(e.target.value)}
              placeholder="Digite sua resposta..."
              className="min-h-[40px] text-xs flex-1"
            />
            <Button size="icon" className="h-8 w-8 shrink-0" onClick={() => handleReplySubmit(c.id, c.visibilidade)} disabled={!replyText.trim()}>
              <Send className="h-3.5 w-3.5" />
            </Button>
          </div>
        )}
      </div>
    );
  };

  return (
    <div className="space-y-3">
      <h4 className="text-sm font-semibold">Timeline de Atividades</h4>
      {comentarios.length === 0 && (
        <p className="text-sm text-muted-foreground">Nenhuma atividade registrada.</p>
      )}
      {rootComments.map((c) => renderComment(c))}
    </div>
  );
}
