// ─── Constants for Configurar Faturamento ─────────────────────────────────

import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import type { ConfigFaturamentoForm } from "./types";

export const PARCELAS_OPTIONS = [1, 2, 3, 4, 6] as const;

export const FORMAS_PAGAMENTO_CONFIG = [
  { value: "Boleto", label: "Boleto" },
  { value: "Pix", label: "Pix" },
  { value: "Ambos", label: "Boleto + Pix" },
] as const;

export const DIAS_VENCIMENTO = Array.from({ length: 28 }, (_, i) => i + 1);

export function defaultConfigForm(): ConfigFaturamentoForm {
  const now = new Date();
  const mesInicio = now.getDate() > 15 ? now.getMonth() + 2 : now.getMonth() + 1;
  const anoInicio = mesInicio > 12 ? now.getFullYear() + 1 : now.getFullYear();

  return {
    valor_implantacao: 0,
    parcelas_implantacao: 1,
    valor_mensalidade: 0,
    dia_vencimento: 10,
    forma_pagamento: "Boleto",
    mes_inicio: mesInicio > 12 ? mesInicio - 12 : mesInicio,
    ano_inicio: anoInicio,
    modulos: [],
    oa_descricao: "",
    oa_valor: 0,
    oa_mes_referencia: now.getMonth() + 1,
    oa_ano_referencia: now.getFullYear(),
    oa_observacao: "",
    email_cobranca: "",
    whatsapp_cobranca: "",
    observacoes: "",
  };
}

export function getMesLabel(mes: number, ano: number): string {
  const d = new Date(ano, mes - 1, 1);
  return format(d, "MMMM/yyyy", { locale: ptBR });
}
