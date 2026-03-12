import { useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

// ─── Funis ───────────────────────────────────────────────────────────────────

export function useCreateFunil() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (data: { nome: string; descricao?: string; ordem: number; exibe_cliente?: boolean }) => {
      const { error } = await supabase.from("crm_funis").insert(data);
      if (error) throw error;
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["crm_funis"] }); toast.success("Funil criado"); },
    onError: () => toast.error("Erro ao criar funil"),
  });
}

export function useUpdateFunil() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, ...data }: { id: string; nome?: string; descricao?: string | null; ativo?: boolean; ordem?: number }) => {
      const { error } = await supabase.from("crm_funis").update({ ...data, updated_at: new Date().toISOString() }).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["crm_funis"] }); toast.success("Funil atualizado"); },
    onError: () => toast.error("Erro ao atualizar funil"),
  });
}

export function useDeleteFunil() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("crm_funis").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["crm_funis"] }); toast.success("Funil removido"); },
    onError: () => toast.error("Erro ao remover funil"),
  });
}

// ─── Etapas ──────────────────────────────────────────────────────────────────

export function useCreateEtapa() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (data: { funil_id: string; nome: string; cor: string; ordem: number }) => {
      const { error } = await supabase.from("crm_etapas").insert(data);
      if (error) throw error;
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["crm_etapas"] }); toast.success("Etapa criada"); },
    onError: () => toast.error("Erro ao criar etapa"),
  });
}

export function useUpdateEtapa() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, ...data }: { id: string; nome?: string; cor?: string; ativo?: boolean; ordem?: number }) => {
      const { error } = await supabase.from("crm_etapas").update({ ...data, updated_at: new Date().toISOString() }).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["crm_etapas"] }); toast.success("Etapa atualizada"); },
    onError: () => toast.error("Erro ao atualizar etapa"),
  });
}

export function useDeleteEtapa() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("crm_etapas").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["crm_etapas"] }); toast.success("Etapa removida"); },
    onError: () => toast.error("Erro ao remover etapa"),
  });
}

// ─── Campos Personalizados ───────────────────────────────────────────────────

export function useCreateCampo() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (data: { nome: string; tipo: string; opcoes: string[]; obrigatorio: boolean; ordem: number }) => {
      const { error } = await supabase.from("crm_campos_personalizados").insert({
        ...data,
        opcoes: data.opcoes as any,
      });
      if (error) throw error;
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["crm_campos_personalizados"] }); toast.success("Campo criado"); },
    onError: () => toast.error("Erro ao criar campo"),
  });
}

export function useUpdateCampo() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, ...data }: { id: string; nome?: string; tipo?: string; opcoes?: string[]; obrigatorio?: boolean; ativo?: boolean; ordem?: number }) => {
      const updateData: any = { ...data, updated_at: new Date().toISOString() };
      if (data.opcoes) updateData.opcoes = data.opcoes;
      const { error } = await supabase.from("crm_campos_personalizados").update(updateData).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["crm_campos_personalizados"] }); toast.success("Campo atualizado"); },
    onError: () => toast.error("Erro ao atualizar campo"),
  });
}

export function useDeleteCampo() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("crm_campos_personalizados").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["crm_campos_personalizados"] }); toast.success("Campo removido"); },
    onError: () => toast.error("Erro ao remover campo"),
  });
}
