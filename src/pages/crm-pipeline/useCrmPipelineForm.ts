import { useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import type { CrmOportunidade } from "./types";

interface OportunidadeInput {
  funil_id: string;
  etapa_id: string;
  titulo: string;
  cliente_id?: string | null;
  contato_id?: string | null;
  responsavel_id?: string | null;
  valor?: number;
  observacoes?: string | null;
  origem?: string | null;
  data_previsao_fechamento?: string | null;
  campos_personalizados?: Record<string, string>;
}

export function useCrmPipelineForm(funilId?: string) {
  const queryClient = useQueryClient();
  const invalidate = () => queryClient.invalidateQueries({ queryKey: ["crm_oportunidades", funilId] });

  const createMutation = useMutation({
    mutationFn: async (input: OportunidadeInput) => {
      const { error } = await supabase.from("crm_oportunidades").insert({
        funil_id: input.funil_id,
        etapa_id: input.etapa_id,
        titulo: input.titulo,
        cliente_id: input.cliente_id || null,
        contato_id: input.contato_id || null,
        responsavel_id: input.responsavel_id || null,
        valor: input.valor || 0,
        observacoes: input.observacoes || null,
        origem: input.origem || null,
        data_previsao_fechamento: input.data_previsao_fechamento || null,
        campos_personalizados: input.campos_personalizados || {},
      });
      if (error) throw error;
    },
    onSuccess: () => { toast.success("Oportunidade criada!"); invalidate(); },
    onError: () => toast.error("Erro ao criar oportunidade"),
  });

  const updateMutation = useMutation({
    mutationFn: async ({ id, ...rest }: Partial<CrmOportunidade> & { id: string }) => {
      const { error } = await supabase.from("crm_oportunidades").update(rest).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => { toast.success("Oportunidade atualizada!"); invalidate(); },
    onError: () => toast.error("Erro ao atualizar oportunidade"),
  });

  const moveToEtapaMutation = useMutation({
    mutationFn: async ({ id, etapa_id }: { id: string; etapa_id: string }) => {
      const { error } = await supabase.from("crm_oportunidades").update({ etapa_id }).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => invalidate(),
    onError: () => toast.error("Erro ao mover oportunidade"),
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("crm_oportunidades").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => { toast.success("Oportunidade removida!"); invalidate(); },
    onError: () => toast.error("Erro ao remover oportunidade"),
  });

  const changeStatusMutation = useMutation({
    mutationFn: async ({ id, status, motivo_perda }: { id: string; status: string; motivo_perda?: string }) => {
      const update: Record<string, unknown> = { status };
      if (motivo_perda) update.motivo_perda = motivo_perda;
      const { error } = await supabase.from("crm_oportunidades").update(update).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => { toast.success("Status atualizado!"); invalidate(); },
    onError: () => toast.error("Erro ao atualizar status"),
  });

  return { createMutation, updateMutation, moveToEtapaMutation, deleteMutation, changeStatusMutation };
}
