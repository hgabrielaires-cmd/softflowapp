// ─── Resolver genérico de cobrança (Asaas | Sicredi) ──────────────────────
//
// Fonte única de verdade para "como o cliente paga esta fatura".
// Prioridade: se a fatura tem boleto_nosso_numero (Sicredi), usa os campos
// boleto_*. Caso contrário, cai nos campos asaas_* (comportamento atual).

export interface FaturaCobrancaFields {
  // Sicredi
  boleto_nosso_numero?: string | null;
  boleto_linha_digitavel?: string | null;
  boleto_codigo_barras?: string | null;
  boleto_pdf_url?: string | null;
  boleto_pix_qrcode?: string | null;
  // Asaas
  asaas_payment_id?: string | null;
  asaas_url?: string | null;
  asaas_bank_slip_url?: string | null;
  asaas_barcode?: string | null;
  asaas_pix_qrcode?: string | null;
  asaas_pix_image?: string | null;
}

export interface CobrancaFatura {
  gateway: "asaas" | "sicredi" | null;
  /** PDF/página do boleto (Sicredi: PDF no storage; Asaas: bankSlipUrl) */
  pdfUrl: string | null;
  /** Link genérico de pagamento (Asaas: invoiceUrl; Sicredi: o próprio PDF) */
  paymentUrl: string | null;
  linhaDigitavel: string | null;
  codigoBarras: string | null;
  pixCopiaECola: string | null;
  /** QR Code em base64 — só o Asaas fornece; Sicredi entrega só o copia-e-cola */
  pixImage: string | null;
}

export function getCobrancaFatura(fatura: FaturaCobrancaFields | null | undefined): CobrancaFatura {
  const empty: CobrancaFatura = {
    gateway: null,
    pdfUrl: null,
    paymentUrl: null,
    linhaDigitavel: null,
    codigoBarras: null,
    pixCopiaECola: null,
    pixImage: null,
  };
  if (!fatura) return empty;

  // ── Sicredi ──
  if (fatura.boleto_nosso_numero) {
    const pdf = fatura.boleto_pdf_url || null;
    return {
      gateway: "sicredi",
      pdfUrl: pdf,
      paymentUrl: pdf,
      linhaDigitavel: fatura.boleto_linha_digitavel || null,
      codigoBarras: fatura.boleto_codigo_barras || null,
      pixCopiaECola: fatura.boleto_pix_qrcode || null,
      pixImage: null,
    };
  }

  // ── Asaas ──
  // asaas_barcode = identificationField (linha digitável, 47 dígitos)
  // asaas_bank_slip_url = PDF/visualização do boleto
  // asaas_url = invoiceUrl (página de pagamento) — fallback de PDF
  // asaas_pix_qrcode = payload copia-e-cola / asaas_pix_image = base64 do QR
  const hasAsaas =
    fatura.asaas_payment_id ||
    fatura.asaas_url ||
    fatura.asaas_bank_slip_url ||
    fatura.asaas_barcode ||
    fatura.asaas_pix_qrcode;
  if (!hasAsaas) return empty;

  return {
    gateway: "asaas",
    pdfUrl: fatura.asaas_bank_slip_url || fatura.asaas_url || null,
    paymentUrl: fatura.asaas_url || fatura.asaas_bank_slip_url || null,
    linhaDigitavel: fatura.asaas_barcode || null,
    codigoBarras: fatura.asaas_barcode || null,
    pixCopiaECola: fatura.asaas_pix_qrcode || null,
    pixImage: fatura.asaas_pix_image || null,
  };
}

/** true se há qualquer meio de pagamento disponível para o cliente */
export function temCobranca(c: CobrancaFatura): boolean {
  return !!(c.pdfUrl || c.paymentUrl || c.linhaDigitavel || c.codigoBarras || c.pixCopiaECola || c.pixImage);
}
