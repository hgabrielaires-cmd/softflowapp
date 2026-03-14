import { cn } from "@/lib/utils";
import { TicketComentario } from "../types";
import { formatRelativeTime } from "../helpers";
import { UserAvatar } from "@/components/UserAvatar";
import { Lock, ArrowRightLeft, MessageSquare, Info } from "lucide-react";

interface Props {
  comentarios: TicketComentario[];
}

export function TicketTimeline({ comentarios }: Props) {
  return (
    <div className="space-y-3">
      <h4 className="text-sm font-semibold">Timeline de Atividades</h4>
      {comentarios.length === 0 && (
        <p className="text-sm text-muted-foreground">Nenhuma atividade registrada.</p>
      )}
      {comentarios.map((c) => {
        const isComment = c.tipo === "comentario";
        const isInternal = c.visibilidade === "interno";
        const isSystem = c.tipo === "sistema" || c.tipo === "status_change" || c.tipo === "responsavel_change";

        return (
          <div
            key={c.id}
            className={cn(
              "rounded-lg p-3 text-sm",
              isComment && !isInternal && "bg-card border-l-4 border-l-[hsl(var(--sidebar-primary))]",
              isComment && isInternal && "bg-amber-50 border-l-4 border-l-amber-400",
              isSystem && "bg-transparent text-muted-foreground"
            )}
          >
            <div className="flex items-center gap-2 mb-1">
              {c.profile && (
                <UserAvatar
                  avatarUrl={c.profile.avatar_url}
                  fullName={c.profile.full_name}
                  size="xs"
                />
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
            <p className="whitespace-pre-wrap">{c.conteudo}</p>
          </div>
        );
      })}
    </div>
  );
}
