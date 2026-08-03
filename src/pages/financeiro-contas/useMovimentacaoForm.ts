import { useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { buildMovimentacaoPayload, validateMovimentacaoForm } from "./helpers";
import type { MovimentacaoFormState } from "./types";

/** Criação, edição e exclusão de movimentações do livro caixa. */
export function useMovimentacaoForm() {
  const queryClient = useQueryClient();
  const invalidate = () => {
    queryClient.invalidateQueries({ queryKey: ["fin_movimentacoes"] });
    queryClient.invalidateQueries({ queryKey: ["fin_saldos_contas"] });
  };

  const criarMut = useMutation({
    mutationFn: async ({ form, filialId }: { form: MovimentacaoFormState; filialId: string | null }) => {
      const err = validateMovimentacaoForm(form);
      if (err) throw new Error(err);
      const { data: userRes } = await supabase.auth.getUser();
      const payload = {
        ...buildMovimentacaoPayload(form, filialId),
        origem: "manual",
        created_by: userRes.user?.id ?? null,
      };
      const { error } = await supabase.from("fin_movimentacoes").insert(payload);
      if (error) throw new Error("Não foi possível registrar a movimentação. Verifique suas permissões.");
    },
    onSuccess: () => {
      toast.success("Movimentação registrada!");
      invalidate();
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const editarMut = useMutation({
    mutationFn: async ({
      id,
      form,
      filialId,
      somenteTexto,
    }: {
      id: string;
      form: MovimentacaoFormState;
      filialId: string | null;
      somenteTexto: boolean;
    }) => {
      const err = validateMovimentacaoForm(form);
      if (err) throw new Error(err);
      const completo = buildMovimentacaoPayload(form, filialId);
      const payload = somenteTexto
        ? { descricao: completo.descricao, observacao: completo.observacao }
        : completo;
      const { error } = await supabase.from("fin_movimentacoes").update(payload).eq("id", id);
      if (error) throw new Error("Não foi possível salvar as alterações. Verifique suas permissões.");
    },
    onSuccess: () => {
      toast.success("Movimentação atualizada!");
      invalidate();
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const excluirMut = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("fin_movimentacoes").delete().eq("id", id);
      if (error) throw new Error("Não foi possível excluir a movimentação. Verifique suas permissões.");
    },
    onSuccess: () => {
      toast.success("Movimentação excluída!");
      invalidate();
    },
    onError: (e: Error) => toast.error(e.message),
  });

  return { criarMut, editarMut, excluirMut };
}
