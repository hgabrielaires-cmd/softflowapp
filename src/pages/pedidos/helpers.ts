// ─── Pure helpers for Pedidos module ──────────────────────────────────────

import type { FormState } from "./types";
import type { Database } from "@/integrations/supabase/types";

type PedidoInsert = Database["public"]["Tables"]["pedidos"]["Insert"];

export function fmtBRL(v: number): string {
  return v.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

export function applyDesconto(original: number, tipo: "R$" | "%", valor: number): number {
  const raw = tipo === "%" ? original - (original * valor / 100) : original - valor;
  return Math.max(0, raw);
}

export function applyAcrescimo(original: number, tipo: "R$" | "%", valor: number): number {
  return tipo === "%" ? original + (original * valor / 100) : original + valor;
}

// ─── Validation ───────────────────────────────────────────────────────────

export function validatePedidoForm(form: FormState): string | null {
  if (!form.cliente_id) return "Selecione um cliente";
  if (form.tipo_pedido === "OA") {
    if (form.servicos_pedido.length === 0) return "Adicione pelo menos um serviço";
    if (!form.tipo_atendimento) return "Selecione o tipo de atendimento (Interno/Externo)";
  } else {
    if (!form.plano_id) return "Selecione um plano";
  }
  if (!form.pagamento_implantacao_forma) return "Selecione a forma de pagamento da implantação";
  return null;
}

// ─── Payload builder ──────────────────────────────────────────────────────

export interface PedidoComputedValues {
  valorImplantacaoOriginal: number;
  valorMensalidadeOriginal: number;
  valorImplantacaoFinal: number;
  valorMensalidadeFinal: number;
  valorTotal: number;
  comissaoPercentualLegado: number;
  comissaoValorTotal: number;
  comissaoImpPerc: number;
  comissaoImpValor: number;
  comissaoMensPerc: number;
  comissaoMensValor: number;
  comissaoServPerc: number;
  comissaoServValor: number;
}

export function buildPedidoPayload(
  form: FormState,
  computed: PedidoComputedValues,
  vendedorId: string,
  filialId: string,
): PedidoInsert {
  return {
    cliente_id: form.cliente_id,
    plano_id: form.plano_id,
    filial_id: filialId,
    vendedor_id: vendedorId,
    valor_implantacao: computed.valorImplantacaoFinal,
    valor_mensalidade: computed.valorMensalidadeFinal,
    valor_total: computed.valorTotal,
    comissao_percentual: computed.comissaoPercentualLegado,
    comissao_valor: computed.comissaoValorTotal,
    observacoes: form.observacoes || null,
    motivo_desconto: form.motivo_desconto || null,
    valor_implantacao_original: computed.valorImplantacaoOriginal,
    valor_mensalidade_original: computed.valorMensalidadeOriginal,
    desconto_implantacao_tipo: form.desconto_implantacao_tipo,
    desconto_implantacao_valor: parseFloat(form.desconto_implantacao_valor) || 0,
    valor_implantacao_final: computed.valorImplantacaoFinal,
    desconto_mensalidade_tipo: form.desconto_mensalidade_tipo,
    desconto_mensalidade_valor: parseFloat(form.desconto_mensalidade_valor) || 0,
    valor_mensalidade_final: computed.valorMensalidadeFinal,
    acrescimo_implantacao_tipo: form.acrescimo_implantacao_tipo,
    acrescimo_implantacao_valor: parseFloat(form.acrescimo_implantacao_valor) || 0,
    acrescimo_mensalidade_tipo: form.acrescimo_mensalidade_tipo,
    acrescimo_mensalidade_valor: parseFloat(form.acrescimo_mensalidade_valor) || 0,
    modulos_adicionais: form.modulos_adicionais as unknown as Database["public"]["Tables"]["pedidos"]["Insert"]["modulos_adicionais"],
    servicos_pedido: form.servicos_pedido as unknown as Database["public"]["Tables"]["pedidos"]["Insert"]["servicos_pedido"],
    tipo_pedido: form.tipo_pedido,
    tipo_atendimento: form.tipo_pedido === "OA" ? form.tipo_atendimento : null,
    contrato_id: form.contrato_id || null,
    comissao_implantacao_percentual: computed.comissaoImpPerc,
    comissao_implantacao_valor: computed.comissaoImpValor,
    comissao_mensalidade_percentual: computed.comissaoMensPerc,
    comissao_mensalidade_valor: computed.comissaoMensValor,
    comissao_servico_percentual: computed.comissaoServPerc,
    comissao_servico_valor: computed.comissaoServValor,
    pagamento_mensalidade_forma: form.pagamento_mensalidade_tipo || null,
    pagamento_mensalidade_parcelas: null,
    pagamento_mensalidade_desconto_percentual: 0,
    pagamento_mensalidade_observacao: form.pagamento_mensalidade_observacao || null,
    pagamento_implantacao_forma: form.pagamento_implantacao_forma || null,
    pagamento_implantacao_parcelas: form.pagamento_implantacao_parcelas ? parseInt(form.pagamento_implantacao_parcelas) : null,
    pagamento_implantacao_desconto_percentual: parseFloat(form.pagamento_implantacao_desconto_percentual) || 0,
    pagamento_implantacao_observacao: form.pagamento_implantacao_observacao || null,
  };
}
