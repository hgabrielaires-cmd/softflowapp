// ─── Actions hook for activity-level execution ──────────────────────────
import { useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import type { AtividadeExecucao } from "./types";

export function usePainelAtividadeActions() {
  const queryClient = useQueryClient();

  function invalidateExecucao() {
    queryClient.invalidateQueries({ queryKey: ["painel_atividade_execucao"] });
  }

  /** Iniciar execução de uma atividade */
  async function iniciarAtividade(cardId: string, atividadeId: string, etapaId: string | null): Promise<boolean> {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) { toast.error("Não autenticado."); return false; }

      // Defensive: validate card exists
      const { data: card } = await supabase.from("painel_atendimento").select("id").eq("id", cardId).maybeSingle();
      if (!card) { toast.error("Card do projeto não encontrado."); return false; }

      // Defensive: validate atividade exists
      const { data: atividade } = await supabase.from("jornada_atividades").select("id, etapa_id").eq("id", atividadeId).maybeSingle();
      if (!atividade) { toast.error("Atividade não encontrada."); return false; }

      // Defensive: validate etapa is active if provided
      if (etapaId) {
        const { data: etapa } = await supabase.from("painel_etapas").select("id, ativo").eq("id", etapaId).maybeSingle();
        if (!etapa) { toast.error("Etapa não encontrada."); return false; }
        if (!etapa.ativo) { toast.error("Etapa inativa. Não é possível iniciar atividade."); return false; }
      }

      const now = new Date().toISOString();
      const { error } = await supabase
        .from("painel_atividade_execucao")
        .upsert(
          {
            card_id: cardId,
            atividade_id: atividadeId,
            etapa_id: etapaId,
            status: "em_andamento",
            iniciado_em: now,
            iniciado_por: user.id,
            updated_at: now,
          },
          { onConflict: "card_id,atividade_id" }
        );
      if (error) throw error;

      invalidateExecucao();
      toast.success("Atividade iniciada!");
      return true;
    } catch (err: any) {
      toast.error("Erro ao iniciar atividade: " + (err.message || ""));
      return false;
    }
  }

  /** Concluir execução de uma atividade */
  async function concluirAtividade(
    cardId: string,
    atividadeId: string,
    etapaId: string | null,
    horasEstimadas: number
  ): Promise<boolean> {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) { toast.error("Não autenticado."); return false; }

      // Defensive: validate card exists
      const { data: card } = await supabase.from("painel_atendimento").select("id").eq("id", cardId).maybeSingle();
      if (!card) { toast.error("Card do projeto não encontrado."); return false; }

      // Defensive: validate atividade exists
      const { data: atividade } = await supabase.from("jornada_atividades").select("id").eq("id", atividadeId).maybeSingle();
      if (!atividade) { toast.error("Atividade não encontrada."); return false; }

      // Buscar registro existente para calcular atraso
      const { data: existing } = await supabase
        .from("painel_atividade_execucao")
        .select("iniciado_em, status")
        .eq("card_id", cardId)
        .eq("atividade_id", atividadeId)
        .maybeSingle();

      // Defensive: can only conclude an activity that is em_andamento
      if (!existing || existing.status !== "em_andamento") {
        toast.error("Atividade precisa estar em andamento para ser concluída.");
        return false;
      }

      const now = new Date();
      let emAtraso = false;

      if (existing.iniciado_em && horasEstimadas > 0) {
        const inicio = new Date(existing.iniciado_em).getTime();
        const limiteMs = inicio + horasEstimadas * 60 * 60 * 1000;
        emAtraso = now.getTime() > limiteMs;
      }

      const { error } = await supabase
        .from("painel_atividade_execucao")
        .upsert(
          {
            card_id: cardId,
            atividade_id: atividadeId,
            etapa_id: etapaId,
            status: "concluida",
            concluido_em: now.toISOString(),
            concluido_por: user.id,
            finalizado_em_atraso: emAtraso,
            updated_at: now.toISOString(),
          },
          { onConflict: "card_id,atividade_id" }
        );
      if (error) throw error;

      invalidateExecucao();
      toast.success("Atividade concluída!");
      return true;
    } catch (err: any) {
      toast.error("Erro ao concluir atividade: " + (err.message || ""));
      return false;
    }
  }

  /** Obter status de uma atividade para um card */
  function getStatusAtividade(
    execucaoMap: Record<string, AtividadeExecucao[]>,
    cardId: string,
    atividadeId: string
  ): AtividadeExecucao | null {
    const list = execucaoMap[cardId];
    if (!list) return null;
    return list.find(e => e.atividade_id === atividadeId) || null;
  }

  /** Verificar se todas as atividades de uma etapa estão concluídas */
  function todasAtividadesConcluidas(
    execucaoMap: Record<string, AtividadeExecucao[]>,
    cardId: string,
    atividadeIds: string[]
  ): boolean {
    if (atividadeIds.length === 0) return true;
    const list = execucaoMap[cardId] || [];
    return atividadeIds.every(aid =>
      list.some(e => e.atividade_id === aid && e.status === "concluida")
    );
  }

  return {
    iniciarAtividade,
    concluirAtividade,
    getStatusAtividade,
    todasAtividadesConcluidas,
  };
}
