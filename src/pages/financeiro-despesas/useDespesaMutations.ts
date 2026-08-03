import { useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { parseValor } from "./helpers";
import type { DespesaEditState, DespesaRegistro, EscopoParcelas } from "./types";

interface EditarArgs {
  despesa: DespesaRegistro;
  state: DespesaEditState;
  escopo: EscopoParcelas;
}

interface ExcluirArgs {
  despesa: DespesaRegistro;
  escopo: EscopoParcelas;
}

/** Retorna os ids alcançados pelo escopo escolhido (esta parcela x esta e futuras). */
async function idsDoEscopo(despesa: DespesaRegistro, escopo: EscopoParcelas) {
  if (escopo === "parcela" || despesa.parcela_total <= 1) return [despesa.id];
  const { data, error } = await supabase
    .from("fin_despesas")
    .select("id")
    .eq("grupo_id", despesa.grupo_id)
    .gte("parcela_numero", despesa.parcela_numero);
  if (error) throw new Error("Não foi possível carregar as parcelas do lançamento.");
  return (data || []).map((d) => d.id);
}

/** Edição e exclusão de despesas (respeitando RLS de admin/financeiro/gestor). */
export function useDespesaMutations() {
  const queryClient = useQueryClient();
  const invalidate = () => queryClient.invalidateQueries({ queryKey: ["fin_despesas"] });

  const editarDespesaMut = useMutation({
    mutationFn: async ({ despesa, state, escopo }: EditarArgs) => {
      const valor = parseValor(state.valor);
      if (valor <= 0) throw new Error("Informe um valor maior que zero.");
      if (!state.fornecedor_id || !state.plano_conta_id || !state.forma_pagamento_id || !state.conta_financeira_id) {
        throw new Error("Preencha fornecedor, plano de contas, forma de pagamento e conta financeira.");
      }
      if (!state.data_vencimento || !state.data_emissao) {
        throw new Error("Informe as datas de emissão e vencimento.");
      }

      const ids = await idsDoEscopo(despesa, escopo);

      // Campos aplicáveis a todo o escopo
      const comuns = {
        fornecedor_id: state.fornecedor_id,
        plano_conta_id: state.plano_conta_id,
        forma_pagamento_id: state.forma_pagamento_id,
        conta_financeira_id: state.conta_financeira_id,
        valor,
        descricao: state.descricao.trim() || null,
        status: state.status,
      };

      const { error } = await supabase.from("fin_despesas").update(comuns).in("id", ids);
      if (error) throw new Error("Não foi possível salvar as alterações. Verifique suas permissões.");

      // Datas só fazem sentido na parcela editada
      const { error: dErr } = await supabase
        .from("fin_despesas")
        .update({ data_emissao: state.data_emissao, data_vencimento: state.data_vencimento })
        .eq("id", despesa.id);
      if (dErr) throw new Error("Não foi possível atualizar as datas do lançamento.");

      return ids.length;
    },
    onSuccess: (qtd) => {
      toast.success(qtd > 1 ? `${qtd} parcelas atualizadas!` : "Lançamento atualizado!");
      invalidate();
    },
    onError: (e: Error) => toast.error(e.message || "Erro ao atualizar lançamento"),
  });

  const excluirDespesaMut = useMutation({
    mutationFn: async ({ despesa, escopo }: ExcluirArgs) => {
      const ids = await idsDoEscopo(despesa, escopo);
      const { error } = await supabase.from("fin_despesas").delete().in("id", ids);
      if (error) throw new Error("Não foi possível excluir. Verifique suas permissões.");
      return ids.length;
    },
    onSuccess: (qtd) => {
      toast.success(qtd > 1 ? `${qtd} parcelas excluídas!` : "Lançamento excluído!");
      invalidate();
    },
    onError: (e: Error) => toast.error(e.message || "Erro ao excluir lançamento"),
  });

  const quitarDespesaMut = useMutation({
    mutationFn: async (args: {
      despesa: DespesaRegistro;
      data_pagamento: string;
      juros_percentual: number;
      juros_valor: number;
      plano_conta_juros_id: string | null;
      valor_pago: number;
      conta_financeira_id: string;
    }) => {
      if (!args.data_pagamento) throw new Error("Informe a data do pagamento.");
      if (args.juros_valor > 0 && !args.plano_conta_juros_id) {
        throw new Error("Selecione o plano de contas dos juros.");
      }
      if (!args.conta_financeira_id) throw new Error("Selecione a conta financeira do pagamento.");
      const { error } = await supabase
        .from("fin_despesas")
        .update({
          status: "pago",
          data_pagamento: args.data_pagamento,
          valor_pago: args.valor_pago,
          juros_percentual: args.juros_percentual,
          juros_valor: args.juros_valor,
          plano_conta_juros_id: args.plano_conta_juros_id,
          conta_financeira_id: args.conta_financeira_id,
        })
        .eq("id", args.despesa.id);
      if (error) throw new Error("Não foi possível quitar a despesa. Verifique suas permissões.");
    },
    onSuccess: async (_r, args) => {
      toast.success("Pagamento confirmado!");
      queryClient.setQueryData<DespesaRegistro[]>(["fin_despesas"], (old) =>
        (old || []).map((d) =>
          d.id === args.despesa.id
            ? {
                ...d,
                status: "pago",
                data_pagamento: args.data_pagamento,
                valor_pago: args.valor_pago,
                juros_percentual: args.juros_percentual,
                juros_valor: args.juros_valor,
                plano_conta_juros_id: args.plano_conta_juros_id,
                conta_financeira_id: args.conta_financeira_id,
              }
            : d,
        ),
      );
      await queryClient.refetchQueries({ queryKey: ["fin_despesas"] });
    },
    onError: (e: Error) => toast.error(e.message || "Erro ao quitar despesa"),
  });

  return { editarDespesaMut, excluirDespesaMut, quitarDespesaMut };
}
