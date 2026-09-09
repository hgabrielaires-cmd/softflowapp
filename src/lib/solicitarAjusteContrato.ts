// ─── Fluxo de ajuste de contrato pendente de assinatura ───────────────────
import { supabase } from "@/integrations/supabase/client";
import { getInstanciaDoUsuario } from "@/lib/getInstanciaDoUsuario";

export const STATUS_PEDIDO_AJUSTE = "Aguardando Ajuste Vendedor";
export const STATUS_CONTRATO_AJUSTE = "Aguardando Ajuste";
export const STATUS_CONTRATO_ATUALIZADO = "Atualizado Vendedor";

export interface SolicitarAjusteParams {
  contratoId: string;
  pedidoId: string | null;
  numeroContrato: string;
  clienteNome: string;
  vendedorId: string | null;
  motivo: string;
  solicitanteId: string;
}

/**
 * Marca o contrato como "Aguardando Ajuste" e devolve o pedido ao vendedor.
 * O link ZapSign existente NÃO é cancelado aqui — ele só é substituído
 * quando um novo contrato for gerado.
 */
export async function solicitarAjusteContrato(
  p: SolicitarAjusteParams,
): Promise<{ ok: boolean; error?: string }> {
  try {
    if (!p.motivo.trim()) return { ok: false, error: "Informe o motivo do ajuste" };

    const { error: errContrato } = await supabase
      .from("contratos")
      .update({ status: STATUS_CONTRATO_AJUSTE })
      .eq("id", p.contratoId);
    if (errContrato) return { ok: false, error: errContrato.message };

    if (p.pedidoId) {
      const { error: errPedido } = await supabase
        .from("pedidos")
        .update({ status_pedido: STATUS_PEDIDO_AJUSTE })
        .eq("id", p.pedidoId);
      if (errPedido) return { ok: false, error: errPedido.message };
    }

    // Histórico (auditoria)
    await supabase.from("audit_logs").insert({
      user_id: p.solicitanteId,
      action: "ajuste_contrato_solicitado",
      entity_type: "contratos",
      entity_id: p.contratoId,
      details: {
        motivo: p.motivo,
        numero: p.numeroContrato,
        pedido_id: p.pedidoId,
        cliente: p.clienteNome,
        status_anterior: "Ativo",
      },
    });

    // Notificação interna para o vendedor
    if (p.vendedorId) {
      await supabase.from("notificacoes").insert({
        titulo: "⚠️ Contrato aguardando ajuste",
        mensagem: `O contrato ${p.numeroContrato} (${p.clienteNome}) precisa de ajuste: ${p.motivo}`,
        tipo: "alerta",
        destinatario_user_id: p.vendedorId,
        criado_por: p.solicitanteId,
        metadata: { link: "/pedidos", contrato_id: p.contratoId, pedido_id: p.pedidoId },
      });

      // WhatsApp (best-effort — não bloqueia o fluxo)
      try {
        const { data: vendedor } = await supabase
          .from("profiles")
          .select("telefone, full_name")
          .eq("user_id", p.vendedorId)
          .maybeSingle();

        const { data: whatsConfig } = await supabase
          .from("integracoes_config")
          .select("ativo")
          .eq("nome", "whatsapp")
          .maybeSingle();

        if (vendedor?.telefone && whatsConfig?.ativo) {
          const { instancia } = await getInstanciaDoUsuario(p.vendedorId);
          let numero = vendedor.telefone.replace(/\D/g, "");
          if (numero.startsWith("0")) numero = "55" + numero.substring(1);
          if (!numero.startsWith("55")) numero = "55" + numero;

          await supabase.functions.invoke("evolution-api", {
            body: {
              action: "send_text",
              instance_name: instancia,
              number: numero,
              text: `⚠️ *Contrato aguardando ajuste*\n\nContrato: *${p.numeroContrato}*\nCliente: *${p.clienteNome}*\n\nMotivo: ${p.motivo}\n\nAcesse a tela de Pedidos para editar e reenviar.`,
            },
          });
        }
      } catch (e) {
        console.warn("Falha ao notificar vendedor por WhatsApp:", e);
      }
    }

    return { ok: true };
  } catch (err: any) {
    console.error("Erro ao solicitar ajuste de contrato:", err);
    return { ok: false, error: err?.message || "Erro desconhecido" };
  }
}
