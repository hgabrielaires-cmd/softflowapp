// ─── Hook: persistence logic for Pedidos ──────────────────────────────────
import { useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { dispararAutomacaoPedidoStatus } from "@/lib/automacoes";
import { toast } from "sonner";
import type { Database } from "@/integrations/supabase/types";
import type { FormState, PedidoWithJoins, DraftComentario } from "./types";
import {
  buildPedidoPayload,
  checkDescontoAprovacao,
  checkDescontoValoresMudaram,
  buildSolicitacaoDescontoPayload,
  applyFinanceiroReset,
  type PedidoComputedValues,
} from "./helpers";

type PedidoInsert = Database["public"]["Tables"]["pedidos"]["Insert"];

export interface PedidoSaveParams {
  form: FormState;
  computed: PedidoComputedValues;
  vendedorId: string;
  filialId: string;
  descontoAtivo: boolean;
  editingPedido: PedidoWithJoins | null;
  /** Called to persist draft comments for a given pedido id */
  salvarDraftComentarios: (pedidoId: string) => Promise<void>;
}

export interface PedidoSaveResult {
  success: boolean;
}

/**
 * Encapsulates all persistence branches for creating/updating a pedido,
 * including discount-approval workflow and automation triggers.
 */
export function usePedidoSave() {
  const savePedido = useCallback(async (params: PedidoSaveParams): Promise<PedidoSaveResult> => {
    const {
      form,
      computed,
      vendedorId,
      filialId,
      descontoAtivo,
      editingPedido,
      salvarDraftComentarios,
    } = params;

    // ── Fetch vendor discount limits ──────────────────────────────────
    const { data: vendedorProfile } = await supabase
      .from("profiles")
      .select("desconto_limite_implantacao, desconto_limite_mensalidade")
      .eq("user_id", vendedorId)
      .maybeSingle();

    const limiteImp = vendedorProfile?.desconto_limite_implantacao ?? 100;
    const limiteMens = vendedorProfile?.desconto_limite_mensalidade ?? 100;

    const { descontoImpPerc, descontoMensPerc, precisaAprovacao } = checkDescontoAprovacao(
      form,
      descontoAtivo,
      computed.valorImplantacaoOriginal,
      computed.valorMensalidadeOriginal,
      limiteImp,
      limiteMens,
    );

    const payload = buildPedidoPayload(form, computed, vendedorId, filialId);

    // ── EDIT branches ─────────────────────────────────────────────────
    if (editingPedido) {
      const isReprovado = editingPedido.financeiro_status === "Reprovado";
      const wasAwaitingDesconto = editingPedido.status_pedido === "Aguardando Aprovação de Desconto";
      const wasDescontoAprovado = editingPedido.status_pedido === "Desconto Aprovado";

      const descontoValoresMudaram = checkDescontoValoresMudaram(form, editingPedido);
      const descontoJaAprovadoSemMudanca = wasDescontoAprovado && precisaAprovacao && !descontoValoresMudaram;

      if (precisaAprovacao && !descontoJaAprovadoSemMudanca) {
        // Branch 1: discount exceeds limit → send for approval
        applyFinanceiroReset(payload, "Aguardando Aprovação de Desconto");
        const { error } = await supabase.from("pedidos").update(payload).eq("id", editingPedido.id);
        if (error) throw error;
        dispararAutomacaoPedidoStatus(editingPedido.id, editingPedido.status_pedido, "Aguardando Aprovação de Desconto", form.tipo_pedido);
        const solPayload = buildSolicitacaoDescontoPayload(form, { pedido_id: editingPedido.id, vendedor_id: vendedorId, descontoImpPerc, descontoMensPerc });
        await supabase.from("solicitacoes_desconto").upsert({ ...solPayload, aprovado_por: null, aprovado_em: null, motivo_reprovacao: null }, { onConflict: "pedido_id" });
        await salvarDraftComentarios(editingPedido.id);
        toast.warning("Desconto acima do limite! Solicitação de aprovação enviada ao gestor.");
      } else if (descontoJaAprovadoSemMudanca) {
        // Branch 2: discount already approved, values unchanged
        const { error } = await supabase.from("pedidos").update(payload).eq("id", editingPedido.id);
        if (error) throw error;
        await salvarDraftComentarios(editingPedido.id);
        toast.success("Pedido atualizado com sucesso!");
      } else if (isReprovado || wasAwaitingDesconto) {
        // Branch 3: re-submit to financial
        applyFinanceiroReset(payload, "Aguardando Financeiro");
        const { error } = await supabase.from("pedidos").update(payload).eq("id", editingPedido.id);
        if (error) throw error;
        dispararAutomacaoPedidoStatus(editingPedido.id, editingPedido.status_pedido, "Aguardando Financeiro", form.tipo_pedido);
        toast.success(isReprovado ? "Pedido reenviado para o financeiro!" : "Pedido enviado para o financeiro!");
        await salvarDraftComentarios(editingPedido.id);
      } else {
        // Branch 4: simple update
        const { error } = await supabase.from("pedidos").update(payload).eq("id", editingPedido.id);
        if (error) throw error;
        await salvarDraftComentarios(editingPedido.id);
        toast.success("Pedido atualizado com sucesso!");
      }
    } else {
      // ── CREATE branches ───────────────────────────────────────────────
      if (precisaAprovacao) {
        const insertPayload = { ...payload, status_pedido: "Aguardando Aprovação de Desconto", financeiro_status: "Aguardando", contrato_liberado: false };
        const { data: novoPedido, error } = await supabase.from("pedidos").insert(insertPayload).select().single();
        if (error) throw error;
        dispararAutomacaoPedidoStatus(novoPedido.id, "Novo", "Aguardando Aprovação de Desconto", form.tipo_pedido);
        await salvarDraftComentarios(novoPedido.id);
        const solPayload = buildSolicitacaoDescontoPayload(form, { pedido_id: novoPedido.id, vendedor_id: vendedorId, descontoImpPerc, descontoMensPerc });
        const { error: solError } = await supabase.from("solicitacoes_desconto").insert(solPayload);
        if (solError) {
          console.error("Erro ao criar solicitação de desconto:", solError);
          toast.error("Pedido criado, mas houve erro ao enviar a solicitação de desconto. Contate o administrador.");
        }
        toast.warning("Desconto acima do seu limite! Solicitação enviada ao gestor de descontos para aprovação.");
      } else {
        const insertPayload = { ...payload, status_pedido: "Aguardando Financeiro", financeiro_status: "Aguardando", contrato_liberado: false };
        const { data: novoPedido2, error } = await supabase.from("pedidos").insert(insertPayload).select().single();
        if (error) throw error;
        await salvarDraftComentarios(novoPedido2.id);
        toast.success("Pedido criado com sucesso!");
      }
    }

    return { success: true };
  }, []);

  return { savePedido };
}
