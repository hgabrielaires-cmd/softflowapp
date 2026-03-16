import { useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import type { CrmOportunidade } from "./types";

interface ContatoInput {
  id?: string;
  nome: string;
  telefone: string;
  cargo_id: string;
  email: string;
}

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
  segmento_ids?: string[];
  _contatos?: ContatoInput[];
}

async function saveContatos(oportunidadeId: string, contatos: ContatoInput[]) {
  // Delete existing contacts
  await supabase.from("crm_oportunidade_contatos").delete().eq("oportunidade_id", oportunidadeId);
  // Insert new ones
  if (contatos.length > 0) {
    const rows = contatos.map(c => ({
      oportunidade_id: oportunidadeId,
      nome: c.nome,
      telefone: c.telefone,
      cargo_id: c.cargo_id || null,
      email: c.email || null,
    }));
    const { error } = await supabase.from("crm_oportunidade_contatos").insert(rows);
    if (error) throw error;
  }
}

export function useCrmPipelineForm(funilId?: string) {
  const queryClient = useQueryClient();
  const invalidate = () => queryClient.invalidateQueries({ queryKey: ["crm_oportunidades", funilId] });

  const createMutation = useMutation({
    mutationFn: async (input: OportunidadeInput) => {
      const { _contatos, ...rest } = input;
      const { data, error } = await supabase.from("crm_oportunidades").insert({
        funil_id: rest.funil_id,
        etapa_id: rest.etapa_id,
        titulo: rest.titulo,
        cliente_id: rest.cliente_id || null,
        contato_id: rest.contato_id || null,
        responsavel_id: rest.responsavel_id || null,
        valor: rest.valor || 0,
        observacoes: rest.observacoes || null,
        origem: rest.origem || null,
        data_previsao_fechamento: rest.data_previsao_fechamento || null,
        campos_personalizados: rest.campos_personalizados || {},
        segmento_ids: rest.segmento_ids || [],
      }).select("*").single();
      if (error) throw error;
      if (_contatos && _contatos.length > 0 && data?.id) {
        await saveContatos(data.id, _contatos);
      }
      // Log creation in timeline
      if (data?.id) {
        const { data: { user } } = await supabase.auth.getUser();
        await (supabase as any).from("crm_historico").insert({
          oportunidade_id: data.id,
          tipo: "criacao",
          descricao: `Oportunidade "${rest.titulo}" criada`,
          user_id: user?.id || null,
        });
      }
      return data;
    },
    onSuccess: () => { toast.success("Oportunidade criada!"); invalidate(); },
    onError: () => toast.error("Erro ao criar oportunidade"),
  });

  const updateMutation = useMutation({
    mutationFn: async ({ id, _contatos, ...rest }: Partial<CrmOportunidade> & { id: string; _contatos?: ContatoInput[] }) => {
      const { error } = await supabase.from("crm_oportunidades").update(rest).eq("id", id);
      if (error) throw error;
      if (_contatos) {
        await saveContatos(id, _contatos);
      }
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
