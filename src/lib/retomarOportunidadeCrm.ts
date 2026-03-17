import { supabase } from "@/integrations/supabase/client";

/**
 * Quando um contrato ou pedido é cancelado, retoma automaticamente
 * a oportunidade CRM vinculada (se existir) para "aberta" (em andamento),
 * registrando o evento na timeline.
 *
 * Fire-and-forget seguro — não bloqueia o fluxo principal.
 */
export async function retomarOportunidadePorPedido(
  pedidoId: string,
  contexto: {
    numero?: string; // ex: "PED-2026-0012" ou "2026-0045"
    tipo: "pedido" | "contrato";
  }
) {
  try {
    // 1. Buscar oportunidade vinculada ao pedido
    const { data: oportunidade, error: fetchErr } = await supabase
      .from("crm_oportunidades")
      .select("id, status, etapa_id, funil_id")
      .eq("pedido_id", pedidoId)
      .maybeSingle();

    if (fetchErr || !oportunidade) return;

    // Só reverte se estiver como "ganho" (já convertida)
    if (oportunidade.status !== "ganho") return;

    // 2. Reverter para "aberta"
    const { error: updateErr } = await supabase
      .from("crm_oportunidades")
      .update({
        status: "aberta",
        data_fechamento: null,
        pedido_id: null,
      } as any)
      .eq("id", oportunidade.id);

    if (updateErr) {
      console.error("[CRM Retomada] Erro ao reverter oportunidade:", updateErr);
      return;
    }

    // 3. Obter usuário logado
    const { data: { user } } = await supabase.auth.getUser();

    const agora = new Date();
    const dataStr = agora.toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit", year: "numeric" });
    const horaStr = agora.toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" });
    const label = contexto.tipo === "contrato" ? "Contrato" : "Pedido";
    const ref = contexto.numero ? ` ${contexto.numero}` : "";

    // 4. Registrar na timeline
    await (supabase as any).from("crm_historico").insert({
      oportunidade_id: oportunidade.id,
      tipo: "revertido",
      descricao: `🔄 Oportunidade retomada automaticamente — ${label}${ref} cancelado em ${dataStr} às ${horaStr}. Aguardando ação do vendedor.`,
      user_id: user?.id || null,
    });
  } catch (err) {
    console.error("[CRM Retomada] Erro inesperado:", err);
  }
}
