import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import ChatHistoricoDrawer from "@/pages/chat/components/ChatHistoricoDrawer";
import {
  Plus, TrendingDown, TrendingUp, RotateCcw, ListChecks, Package, Pencil, Clock, MessageSquare, Eye,
} from "lucide-react";

interface TimelineEvent {
  id: string;
  tipo: string;
  descricao: string;
  created_at: string;
  user_id: string | null;
  user_name?: string;
}

interface Props {
  oportunidadeId: string;
}

const ICON_MAP: Record<string, { icon: typeof Plus; color: string }> = {
  criacao: { icon: Plus, color: "text-blue-500" },
  status_alterado: { icon: TrendingDown, color: "text-destructive" },
  ganho: { icon: TrendingUp, color: "text-emerald-500" },
  revertido: { icon: RotateCcw, color: "text-amber-500" },
  tarefa: { icon: ListChecks, color: "text-primary" },
  produto: { icon: Package, color: "text-purple-500" },
  campo_alterado: { icon: Pencil, color: "text-muted-foreground" },
};

export function OportunidadeTimeline({ oportunidadeId }: Props) {
  const [viewingConversaId, setViewingConversaId] = useState<string | null>(null);
  const [viewingProtocolo, setViewingProtocolo] = useState<string | undefined>();

  const { data: eventos = [], isLoading } = useQuery({
    queryKey: ["crm_timeline", oportunidadeId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("crm_historico")
        .select("id, tipo, descricao, created_at, user_id")
        .eq("oportunidade_id", oportunidadeId)
        .order("created_at", { ascending: true });
      if (error) throw error;

      const userIds = [...new Set((data || []).map(e => e.user_id).filter(Boolean))] as string[];
      let profilesMap: Record<string, string> = {};
      if (userIds.length > 0) {
        const { data: profiles } = await supabase
          .from("profiles")
          .select("user_id, full_name")
          .in("user_id", userIds);
        if (profiles) {
          profilesMap = Object.fromEntries(profiles.map(p => [p.user_id, p.full_name]));
        }
      }

      return (data || []).map((e) => ({
        ...e,
        user_name: e.user_id ? profilesMap[e.user_id] || "Usuário" : "Sistema",
      })) as TimelineEvent[];
    },
  });

  // Fetch linked conversation
  const { data: linkedConversa } = useQuery({
    queryKey: ["crm-linked-conversa", oportunidadeId],
    queryFn: async () => {
      const { data: oport } = await supabase
        .from("crm_oportunidades")
        .select("conversa_id")
        .eq("id", oportunidadeId)
        .single();
      if (!oport?.conversa_id) return null;
      const { data: conv } = await supabase
        .from("chat_conversas")
        .select("id, protocolo, created_at, status")
        .eq("id", oport.conversa_id)
        .single();
      return conv;
    },
  });

  if (isLoading) {
    return (
      <div className="space-y-4 pt-4">
        {[1, 2, 3].map(i => <Skeleton key={i} className="h-16 rounded-lg" />)}
      </div>
    );
  }

  if (eventos.length === 0) {
    return (
      <div className="flex items-center justify-center h-64 text-muted-foreground">
        <div className="text-center space-y-2">
          <Clock className="h-10 w-10 mx-auto opacity-40" />
          <p className="text-sm">Nenhum evento registrado.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="pt-4 pb-8 px-2">
      {/* Linked conversation card */}
      {linkedConversa && (
        <div className="mb-4 rounded-lg border border-border bg-muted/30 p-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <MessageSquare className="h-4 w-4 text-primary" />
              <span className="text-sm font-semibold">Conversa de origem</span>
            </div>
            <button
              className="text-muted-foreground hover:text-primary transition-colors"
              title="Visualizar conversa"
              onClick={() => {
                setViewingConversaId(linkedConversa.id);
                setViewingProtocolo(linkedConversa.protocolo || undefined);
              }}
            >
              <Eye className="h-4 w-4" />
            </button>
          </div>
          <div className="mt-1.5 flex items-center gap-3 text-xs">
            <span className="font-mono font-medium">{linkedConversa.protocolo || "—"}</span>
            <Badge variant="outline" className="text-[10px] h-4">{linkedConversa.status}</Badge>
            {linkedConversa.created_at && (
              <span className="text-muted-foreground">
                {new Date(linkedConversa.created_at).toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit" })}{" "}
                {new Date(linkedConversa.created_at).toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" })}
              </span>
            )}
          </div>
        </div>
      )}

      <div className="relative">
        {/* Vertical line */}
        <div className="absolute left-5 top-0 bottom-0 w-0.5 bg-border" />

        <div className="space-y-0">
          {eventos.map((evento, idx) => {
            const config = ICON_MAP[evento.tipo] || ICON_MAP.campo_alterado;
            const Icon = config.icon;
            const dt = new Date(evento.created_at);
            const dateStr = dt.toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit", year: "numeric" });
            const timeStr = dt.toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" });

            return (
              <div key={evento.id} className="relative flex gap-4 pb-6">
                {/* Step number + icon */}
                <div className="relative z-10 flex flex-col items-center">
                  <div className="flex items-center justify-center h-10 w-10 rounded-full bg-background border-2 border-border shadow-sm">
                    <Icon className={`h-4 w-4 ${config.color}`} />
                  </div>
                  <span className="text-[10px] font-bold text-muted-foreground mt-0.5">
                    #{idx + 1}
                  </span>
                </div>

                {/* Content */}
                <div className="flex-1 pt-1 min-w-0">
                  <p className="text-sm text-foreground leading-snug">{evento.descricao}</p>
                  <div className="flex items-center gap-2 mt-1.5">
                    <span className="text-[11px] text-muted-foreground font-medium">
                      {evento.user_name}
                    </span>
                    <span className="text-[10px] text-muted-foreground">
                      {dateStr} às {timeStr}
                    </span>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      <ChatHistoricoDrawer
        conversaId={viewingConversaId}
        open={!!viewingConversaId}
        onClose={() => setViewingConversaId(null)}
        protocolo={viewingProtocolo}
      />
    </div>
  );
}
