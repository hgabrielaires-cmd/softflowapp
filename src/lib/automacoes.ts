import { supabase } from "@/integrations/supabase/client";

/**
 * Dispara automações de pedido_status_change chamando a edge function processar-automacoes.
 * Fire-and-forget: não bloqueia o fluxo principal.
 */
export function dispararAutomacaoPedidoStatus(
  pedidoId: string,
  statusAnterior: string,
  statusNovo: string,
  tipoPedido?: string
) {
  // Fire and forget
  supabase.functions.invoke("processar-automacoes", {
    body: {
      evento: "pedido_status_change",
      pedido_id: pedidoId,
      status_anterior: statusAnterior,
      status_novo: statusNovo,
      tipo_pedido: tipoPedido || null,
    },
  }).then(({ error }) => {
    if (error) console.error("[Automação] Erro ao disparar:", error);
  }).catch((err) => {
    console.error("[Automação] Erro ao disparar:", err);
  });
}
