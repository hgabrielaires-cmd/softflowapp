import { useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

type FinTable =
  | "fin_plano_contas"
  | "fin_centros_custo"
  | "fin_formas_pagamento"
  | "fin_contas_financeiras";

/**
 * Mutations genéricas de CRUD para os cadastros de parâmetros financeiros.
 * Mantém o padrão de hooks use<Modulo>Form do SoftFlow.
 */
export function useFinanceiroParametrosForm(table: FinTable, label: string) {
  const queryClient = useQueryClient();
  const invalidate = () => queryClient.invalidateQueries({ queryKey: [table] });

  const createMut = useMutation({
    mutationFn: async (payload: Record<string, unknown>) => {
      const { error } = await supabase.from(table).insert(payload as never);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success(`${label} criado(a) com sucesso!`);
      invalidate();
    },
    onError: (e: Error) => toast.error(e.message || `Erro ao criar ${label.toLowerCase()}`),
  });

  const updateMut = useMutation({
    mutationFn: async ({ id, payload }: { id: string; payload: Record<string, unknown> }) => {
      const { error } = await supabase.from(table).update(payload as never).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success(`${label} atualizado(a) com sucesso!`);
      invalidate();
    },
    onError: (e: Error) => toast.error(e.message || `Erro ao atualizar ${label.toLowerCase()}`),
  });

  const toggleMut = useMutation({
    mutationFn: async ({ id, ativo }: { id: string; ativo: boolean }) => {
      const { error } = await supabase.from(table).update({ ativo } as never).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => invalidate(),
    onError: () => toast.error(`Erro ao alterar situação`),
  });

  const deleteMut = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from(table).delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success(`${label} removido(a)!`);
      invalidate();
    },
    onError: (e: Error) => toast.error(e.message || `Erro ao remover ${label.toLowerCase()}`),
  });

  return { createMut, updateMut, toggleMut, deleteMut };
}
