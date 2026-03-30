import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { ScrollArea } from "@/components/ui/scroll-area";
import { UserAvatar } from "@/components/UserAvatar";
import { Users, Plus, X, LogOut } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/context/AuthContext";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { resolvePresencaStatus } from "@/lib/presenca";
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

interface Props {
  conversaId: string;
  atendenteId: string | null;
  onLeaveConversation?: () => void;
}

export default function ChatAtendentesCard({ conversaId, atendenteId, onLeaveConversation }: Props) {
  const { user, profile } = useAuth();
  const qc = useQueryClient();
  const [popoverOpen, setPopoverOpen] = useState(false);
  const [sairDialogOpen, setSairDialogOpen] = useState(false);

  // Check if current user is a collaborator (not the main atendente)
  const meuColab = colaboradores.find((c: any) => c.user_id === user?.id);
  const isColaborador = !!meuColab && atendenteId !== user?.id;

  // Fetch the main atendente
  const { data: mainAtendente } = useQuery({
    queryKey: ["chat-main-atendente", atendenteId],
    queryFn: async () => {
      if (!atendenteId) return null;
      const { data } = await supabase
        .from("profiles")
        .select("user_id, full_name, avatar_url")
        .eq("user_id", atendenteId)
        .single();
      return data;
    },
    enabled: !!atendenteId,
  });

  // Fetch collaborators
  const { data: colaboradores = [] } = useQuery({
    queryKey: ["chat-conversa-atendentes", conversaId],
    queryFn: async () => {
      const { data } = await (supabase as any)
        .from("chat_conversa_atendentes")
        .select("id, user_id, convidado_por, entrou_em, profile:profiles!chat_conversa_atendentes_user_id_fkey(user_id, full_name, avatar_url)")
        .eq("conversa_id", conversaId)
        .order("entrou_em", { ascending: true });
      return data || [];
    },
    enabled: !!conversaId,
  });

  // Fetch available agents (for invite popover)
  const { data: agentesDisponiveis = [] } = useQuery({
    queryKey: ["chat-agentes-disponiveis"],
    queryFn: async () => {
      const { data } = await supabase
        .from("profiles")
        .select("user_id, full_name, avatar_url, is_atendente_chat");
      return (data || []).filter((p: any) => p.is_atendente_chat === true)
        .sort((a: any, b: any) => (a.full_name || "").localeCompare(b.full_name || ""));
    },
    enabled: popoverOpen,
  });

  // Fetch presence for popover
  const { data: presencas = [] } = useQuery({
    queryKey: ["chat-agentes-presenca"],
    queryFn: async () => {
      const { data } = await supabase
        .from("atendente_presenca")
        .select("user_id, status, last_heartbeat");
      return data || [];
    },
    enabled: popoverOpen,
    refetchInterval: 30000,
  });

  // Build list of all agents already in conversation
  const idsNaConversa = new Set<string>();
  if (atendenteId) idsNaConversa.add(atendenteId);
  colaboradores.forEach((c: any) => idsNaConversa.add(c.user_id));

  const agentesParaConvidar = agentesDisponiveis.filter(
    (a: any) => !idsNaConversa.has(a.user_id)
  );

  function getPresencaStatus(userId: string) {
    const p = presencas.find((pr: any) => pr.user_id === userId);
    return resolvePresencaStatus(p?.status, p?.last_heartbeat);
  }

  function presencaColor(status: string) {
    if (status === "online") return "bg-green-500";
    if (status === "pausa") return "bg-yellow-500";
    return "bg-muted-foreground/40";
  }

  async function sairDaConversa() {
    if (!meuColab || !user) return;
    try {
      const { error } = await (supabase as any)
        .from("chat_conversa_atendentes")
        .delete()
        .eq("id", meuColab.id);
      if (error) throw error;

      const meuNome = (profile as any)?.full_name || "Atendente";

      await supabase.from("chat_mensagens").insert({
        conversa_id: conversaId,
        tipo: "sistema",
        conteudo: `${meuNome} saiu da conversa`,
        remetente: "sistema",
      });

      toast.success("Você saiu da conversa");
      qc.invalidateQueries({ queryKey: ["chat-conversa-atendentes", conversaId] });
      qc.invalidateQueries({ queryKey: ["chat-mensagens"] });
      qc.invalidateQueries({ queryKey: ["chat-conversas"] });
      setSairDialogOpen(false);
      onLeaveConversation?.();
    } catch (e: any) {
      toast.error("Erro ao sair: " + e.message);
    }
  }

  async function convidarAtendente(agente: any) {
    try {
      const { error } = await (supabase as any)
        .from("chat_conversa_atendentes")
        .insert({
          conversa_id: conversaId,
          user_id: agente.user_id,
          convidado_por: user?.id,
        });
      if (error) throw error;

      const nomeConvidador = (profile as any)?.full_name || "Atendente";
      const nomeConvidado = agente.full_name || "Atendente";

      // System message
      await supabase.from("chat_mensagens").insert({
        conversa_id: conversaId,
        tipo: "sistema",
        conteudo: `${nomeConvidador} convidou ${nomeConvidado} para esta conversa`,
        remetente: "sistema",
      });

      // Internal chat notification to the invited agent
      try {
        const { data: dmId } = await supabase.rpc("criar_conversa_direta", {
          p_target_user_id: agente.user_id,
        });
        if (dmId) {
          await (supabase as any).from("chat_interno_mensagens").insert({
            conversa_id: dmId,
            user_id: user?.id,
            conteudo: `Você foi adicionado como colaborador em uma conversa de chat. Acesse a aba "Meus" no Chat para visualizar.`,
          });
        }
      } catch {
        // silent - notification is best-effort
      }

      toast.success(`${nomeConvidado} convidado!`);
      qc.invalidateQueries({ queryKey: ["chat-conversa-atendentes", conversaId] });
      qc.invalidateQueries({ queryKey: ["chat-mensagens"] });
      setPopoverOpen(false);
    } catch (e: any) {
      toast.error("Erro ao convidar: " + e.message);
    }
  }

  async function removerColaborador(colab: any) {
    try {
      const { error } = await (supabase as any)
        .from("chat_conversa_atendentes")
        .delete()
        .eq("id", colab.id);
      if (error) throw error;

      const nomeRemovido = colab.profile?.full_name || "Atendente";

      await supabase.from("chat_mensagens").insert({
        conversa_id: conversaId,
        tipo: "sistema",
        conteudo: `${nomeRemovido} saiu da conversa`,
        remetente: "sistema",
      });

      toast.success(`${nomeRemovido} removido`);
      qc.invalidateQueries({ queryKey: ["chat-conversa-atendentes", conversaId] });
      qc.invalidateQueries({ queryKey: ["chat-mensagens"] });
    } catch (e: any) {
      toast.error("Erro ao remover: " + e.message);
    }
  }

  return (
    <Card className="shadow-none border">
      <CardHeader className="p-3 pb-1">
        <CardTitle className="text-sm flex items-center gap-1.5">
          <Users className="h-4 w-4" /> Atendentes
        </CardTitle>
      </CardHeader>
      <CardContent className="p-3 pt-0 space-y-2">
        {/* Main atendente */}
        {mainAtendente && (
          <div className="flex items-center gap-2 text-xs">
            <UserAvatar
              fullName={mainAtendente.full_name || ""}
              avatarUrl={mainAtendente.avatar_url}
              className="h-6 w-6 text-[10px]"
            />
            <span className="flex-1 truncate font-medium">{mainAtendente.full_name}</span>
            <span className="text-[10px] text-muted-foreground">Responsável</span>
          </div>
        )}

        {/* Collaborators */}
        {colaboradores.map((colab: any) => (
          <div key={colab.id} className="flex items-center gap-2 text-xs">
            <UserAvatar
              fullName={colab.profile?.full_name || ""}
              avatarUrl={colab.profile?.avatar_url}
              className="h-6 w-6 text-[10px]"
            />
            <span className="flex-1 truncate">{colab.profile?.full_name || "—"}</span>
            {colab.user_id !== user?.id && (
              <Button
                variant="ghost"
                size="sm"
                className="h-5 w-5 p-0 text-muted-foreground hover:text-destructive"
                onClick={() => removerColaborador(colab)}
              >
                <X className="h-3 w-3" />
              </Button>
            )}
          </div>
        ))}

        {/* Invite button */}
        <Popover open={popoverOpen} onOpenChange={setPopoverOpen}>
          <PopoverTrigger asChild>
            <Button variant="outline" size="sm" className="w-full h-7 text-xs gap-1">
              <Plus className="h-3 w-3" /> Convidar
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-64 p-0" align="start">
            <ScrollArea className="max-h-60">
              <div className="p-2 space-y-1">
                {agentesParaConvidar.length === 0 ? (
                  <p className="text-xs text-muted-foreground text-center py-2">
                    Nenhum atendente disponível
                  </p>
                ) : (
                  agentesParaConvidar.map((agente: any) => {
                    const status = getPresencaStatus(agente.user_id);
                    return (
                      <button
                        key={agente.user_id}
                        className="w-full flex items-center gap-2 px-2 py-1.5 rounded-md hover:bg-accent text-left text-xs transition-colors"
                        onClick={() => convidarAtendente(agente)}
                      >
                        <div className="relative">
                          <UserAvatar
                            fullName={agente.full_name || ""}
                            avatarUrl={agente.avatar_url}
                            className="h-6 w-6 text-[10px]"
                          />
                          <span
                            className={cn(
                              "absolute -bottom-0.5 -right-0.5 h-2.5 w-2.5 rounded-full border-2 border-popover",
                              presencaColor(status)
                            )}
                          />
                        </div>
                        <span className="flex-1 truncate">{agente.full_name}</span>
                      </button>
                    );
                  })
                )}
              </div>
            </ScrollArea>
          </PopoverContent>
        </Popover>

        {/* Leave conversation button — only for collaborators */}
        {isColaborador && (
          <AlertDialog open={sairDialogOpen} onOpenChange={setSairDialogOpen}>
            <AlertDialogTrigger asChild>
              <Button
                variant="outline"
                size="sm"
                className="w-full h-7 text-xs gap-1 text-destructive border-destructive/30 hover:bg-destructive/10 hover:text-destructive"
              >
                <LogOut className="h-3 w-3" /> Sair da conversa
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
                  onClick={sairDaConversa}
                  className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                >
                  Sair
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        )}
      </CardContent>
    </Card>
  );
}
