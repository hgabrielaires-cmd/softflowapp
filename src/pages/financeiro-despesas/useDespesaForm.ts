import { useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { DESPESAS_ANEXOS_BUCKET } from "./constants";
import { parseValor, sanitizeFileName, validarAnexo } from "./helpers";
import type { DespesaWizardState, FornecedorRapidoForm } from "./types";


interface SalvarDespesaArgs {
  state: DespesaWizardState;
  anexo: File | null;
  userId: string | null;
}

/**
 * Mutations do módulo Despesas: cadastro rápido de fornecedor e
 * gravação do lançamento (com parcelas e rateio).
 */
export function useDespesaForm() {
  const queryClient = useQueryClient();

  const criarFornecedorMut = useMutation({
    mutationFn: async (form: FornecedorRapidoForm) => {
      const { data, error } = await supabase
        .from("fornecedores")
        .insert({
          nome_fantasia: form.nome_fantasia.trim(),
          razao_social: form.nome_fantasia.trim(),
          cnpj_cpf: form.cnpj_cpf.trim(),
          telefone: form.telefone.trim() || null,
          ativo: true,
        })
        .select("id, nome_fantasia, razao_social, cnpj_cpf")
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      toast.success("Fornecedor cadastrado!");
      queryClient.invalidateQueries({ queryKey: ["despesas_fornecedores_options"] });
    },
    onError: (e: Error) => toast.error(e.message || "Erro ao cadastrar fornecedor"),
  });

  const salvarDespesaMut = useMutation({
    mutationFn: async ({ state, anexo, userId }: SalvarDespesaArgs) => {
      const valor = parseValor(state.valor);
      if (valor <= 0) throw new Error("Informe um valor maior que zero.");
      if (!state.fornecedor_id || !state.plano_conta_id || !state.forma_pagamento_id || !state.conta_financeira_id) {
        throw new Error("Preencha fornecedor, plano de contas, forma de pagamento e conta financeira.");
      }

      let anexoUrl: string | null = null;
      if (anexo) {
        const erroAnexo = validarAnexo(anexo);
        if (erroAnexo) throw new Error(erroAnexo);
        const path = `despesas/${crypto.randomUUID()}-${sanitizeFileName(anexo.name)}`;
        const { error: upErr } = await supabase.storage
          .from(DESPESAS_ANEXOS_BUCKET)
          .upload(path, anexo, { contentType: anexo.type, upsert: false });
        if (upErr) throw new Error("Não foi possível enviar o anexo. Tente novamente.");
        anexoUrl = path;
      }


      const grupoId = crypto.randomUUID();
      const parcelas =
        state.recorrente && state.parcelas.length > 0
          ? state.parcelas
          : [{ numero: 1, data_vencimento: state.data_vencimento, valor }];

      const rows = parcelas.map((p) => ({
        grupo_id: grupoId,
        fornecedor_id: state.fornecedor_id,
        plano_conta_id: state.plano_conta_id,
        forma_pagamento_id: state.forma_pagamento_id,
        conta_financeira_id: state.conta_financeira_id,
        valor: p.valor,
        data_emissao: state.data_emissao,
        data_vencimento: p.data_vencimento,
        codigo_barras: state.codigo_barras.trim() || null,
        descricao: state.descricao.trim() || null,
        anexo_url: anexoUrl,
        recorrente: state.recorrente,
        recorrencia_periodo: state.recorrente ? state.periodo : null,
        recorrencia_vezes: state.recorrente ? state.vezes : null,
        parcela_numero: p.numero,
        parcela_total: parcelas.length,
        created_by: userId,
      }));

      const { data: inseridas, error } = await supabase
        .from("fin_despesas")
        .insert(rows)
        .select("id");
      if (error) throw error;

      const rateios = state.ratear
        ? state.rateios
        : state.rateios.length > 0
          ? [{ centro_custo_id: state.rateios[0].centro_custo_id, percentual: 100 }]
          : [];

      if (rateios.length > 0 && inseridas) {
        const rateioRows = inseridas.flatMap((d) =>
          rateios
            .filter((r) => r.centro_custo_id)
            .map((r) => ({
              despesa_id: d.id,
              centro_custo_id: r.centro_custo_id,
              percentual: r.percentual,
            })),
        );
        if (rateioRows.length > 0) {
          const { error: rErr } = await supabase.from("fin_despesa_rateios").insert(rateioRows);
          if (rErr) throw rErr;
        }
      }
    },
    onSuccess: () => {
      toast.success("Lançamento salvo com sucesso!");
      queryClient.invalidateQueries({ queryKey: ["fin_despesas"] });
    },
    onError: (e: Error) => toast.error(e.message || "Erro ao salvar lançamento"),
  });

  return { criarFornecedorMut, salvarDespesaMut };
}
