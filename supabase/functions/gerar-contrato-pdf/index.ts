import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { PDFDocument, StandardFonts, rgb, PageSizes } from "https://esm.sh/pdf-lib@1.17.1";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    const { contrato_id } = await req.json();
    if (!contrato_id) {
      return new Response(JSON.stringify({ error: "contrato_id obrigatório" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // 1. Buscar contrato com joins
    const { data: contrato, error: contratoError } = await supabase
      .from("contratos")
      .select(`
        *,
        clientes(
          id, nome_fantasia, razao_social, cnpj_cpf, inscricao_estadual,
          cidade, uf, cep, logradouro, numero, complemento, bairro,
          telefone, email, filial_id
        ),
        planos(id, nome, descricao, valor_mensalidade_padrao, valor_implantacao_padrao),
        pedidos(
          id, filial_id,
          valor_implantacao_final, valor_mensalidade_final, valor_total,
          valor_implantacao_original, valor_mensalidade_original,
          desconto_implantacao_tipo, desconto_implantacao_valor,
          desconto_mensalidade_tipo, desconto_mensalidade_valor,
          observacoes, pagamento_mensalidade_observacao, pagamento_mensalidade_forma,
          pagamento_mensalidade_parcelas, pagamento_implantacao_forma,
          pagamento_implantacao_parcelas, pagamento_implantacao_observacao,
          modulos_adicionais
        )
      `)
      .eq("id", contrato_id)
      .single();

    if (contratoError || !contrato) {
      return new Response(JSON.stringify({ error: "Contrato não encontrado: " + contratoError?.message }), {
        status: 404,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const cliente = (contrato as any).clientes;
    const plano = (contrato as any).planos;
    const pedido = (contrato as any).pedidos;

    // 2. Buscar contatos do cliente (decisor)
    const { data: contatos } = await supabase
      .from("cliente_contatos")
      .select("nome, telefone, email, decisor, ativo")
      .eq("cliente_id", contrato.cliente_id)
      .eq("ativo", true);

    const decisor = (contatos || []).find((c: any) => c.decisor) || (contatos || [])[0];

    // 3. Buscar filial
    const filialId = pedido?.filial_id || cliente?.filial_id;
    let filial: any = null;
    if (filialId) {
      const { data } = await supabase.from("filiais").select("*").eq("id", filialId).maybeSingle();
      filial = data;
    }

    // 4. Buscar módulos do plano
    let planoModulos: any[] = [];
    if (plano?.id) {
      const { data } = await supabase
        .from("plano_modulos")
        .select("*, modulos(nome)")
        .eq("plano_id", plano.id)
        .eq("incluso_no_plano", true)
        .order("ordem");
      planoModulos = data || [];
    }

    // 5. Buscar template HTML ativo (filial > global)
    let template = null;
    if (filialId) {
      const { data } = await supabase
        .from("document_templates")
        .select("*")
        .eq("filial_id", filialId)
        .eq("ativo", true)
        .eq("tipo", "CONTRATO_BASE")
        .maybeSingle();
      template = data;
    }
    if (!template) {
      const { data } = await supabase
        .from("document_templates")
        .select("*")
        .is("filial_id", null)
        .eq("ativo", true)
        .eq("tipo", "CONTRATO_BASE")
        .maybeSingle();
      template = data;
    }

    if (!template?.conteudo_html) {
      return new Response(
        JSON.stringify({ error: "Nenhum modelo de contrato HTML ativo encontrado para esta filial." }),
        { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // 6. Montar dados de variáveis
    const fmtBRL = (v: number) =>
      (v ?? 0).toLocaleString("pt-BR", { style: "currency", currency: "BRL" });

    const modulos = (pedido?.modulos_adicionais || []) as any[];

    const modulosInclusosLista = planoModulos.length > 0
      ? "<ul>" + planoModulos.map((pm: any) => `<li>${pm.modulos?.nome || "Módulo"}</li>`).join("") + "</ul>"
      : "<p>—</p>";

    const modulosAdicionaisLista = modulos.length > 0
      ? "<ul>" + modulos.map((m: any) => `<li>${m.nome} (${m.quantidade}x)</li>`).join("") + "</ul>"
      : "";

    const modulosTabelaDetalhada = modulos.length > 0
      ? `<table style="width:100%;border-collapse:collapse;margin:10px 0;">
          <thead><tr style="background:#f0f0f0;">
            <th style="border:1px solid #ccc;padding:6px;text-align:left;">Módulo</th>
            <th style="border:1px solid #ccc;padding:6px;text-align:center;">Qtd</th>
            <th style="border:1px solid #ccc;padding:6px;text-align:right;">Implantação</th>
            <th style="border:1px solid #ccc;padding:6px;text-align:right;">Mensalidade</th>
          </tr></thead>
          <tbody>${modulos.map((m: any) => `<tr>
            <td style="border:1px solid #ccc;padding:6px;">${m.nome}</td>
            <td style="border:1px solid #ccc;padding:6px;text-align:center;">${m.quantidade}x</td>
            <td style="border:1px solid #ccc;padding:6px;text-align:right;">${fmtBRL(m.valor_implantacao_modulo * m.quantidade)}</td>
            <td style="border:1px solid #ccc;padding:6px;text-align:right;">${fmtBRL(m.valor_mensalidade_modulo * m.quantidade)}</td>
          </tr>`).join("")}</tbody>
        </table>`
      : "";

    // Calcular descontos
    const implOriginal = pedido?.valor_implantacao_original ?? 0;
    const implFinal = pedido?.valor_implantacao_final ?? 0;
    const implDesconto = implOriginal - implFinal;
    const mensOriginal = pedido?.valor_mensalidade_original ?? 0;
    const mensFinal = pedido?.valor_mensalidade_final ?? 0;
    const mensDesconto = mensOriginal - mensFinal;
    const totalGeral = pedido?.valor_total ?? 0;

    // Endereço completo do cliente
    const enderecoCliente = [
      cliente?.logradouro,
      cliente?.numero ? `, ${cliente.numero}` : "",
      cliente?.complemento ? ` - ${cliente.complemento}` : "",
      cliente?.bairro ? ` - ${cliente.bairro}` : "",
      cliente?.cidade && cliente?.uf ? ` - ${cliente.cidade}/${cliente.uf}` : "",
      cliente?.cep ? ` - CEP ${cliente.cep}` : "",
    ].join("");

    // Endereço completo da filial
    const enderecoFilial = filial ? [
      filial.logradouro,
      filial.numero ? `, ${filial.numero}` : "",
      filial.complemento ? ` - ${filial.complemento}` : "",
      filial.bairro ? ` - ${filial.bairro}` : "",
      filial.cidade && filial.uf ? ` - ${filial.cidade}/${filial.uf}` : "",
      filial.cep ? ` - CEP ${filial.cep}` : "",
    ].join("") : "";

    // Data por extenso
    const meses = ["janeiro","fevereiro","março","abril","maio","junho","julho","agosto","setembro","outubro","novembro","dezembro"];
    const agora = new Date();
    const dataAtual = `${String(agora.getDate()).padStart(2,"0")}/${String(agora.getMonth()+1).padStart(2,"0")}/${agora.getFullYear()}`;
    const dataExtenso = `${agora.getDate()} de ${meses[agora.getMonth()]} de ${agora.getFullYear()}`;

    // Logo URL
    const logoUrl = template.logo_url || filial?.logo_url || "";

    // Forma de pagamento
    const formaImplantacao = pedido?.pagamento_implantacao_forma || "";
    const parcelasImplantacao = pedido?.pagamento_implantacao_parcelas;
    const formaMensalidade = pedido?.pagamento_mensalidade_forma || "";
    const parcelasMensalidade = pedido?.pagamento_mensalidade_parcelas;

    const dados: Record<string, string> = {
      // Cliente
      "cliente.razao_social": cliente?.razao_social || cliente?.nome_fantasia || "",
      "cliente.nome_fantasia": cliente?.nome_fantasia || "",
      "cliente.cnpj": cliente?.cnpj_cpf || "",
      "cliente.inscricao_estadual": cliente?.inscricao_estadual || "",
      "cliente.endereco_completo": enderecoCliente,
      "cliente.logradouro": cliente?.logradouro || "",
      "cliente.numero": cliente?.numero || "",
      "cliente.complemento": cliente?.complemento || "",
      "cliente.bairro": cliente?.bairro || "",
      "cliente.cidade": cliente?.cidade || "",
      "cliente.uf": cliente?.uf || "",
      "cliente.cep": cliente?.cep || "",
      "cliente.telefone": cliente?.telefone || "",
      "cliente.email": cliente?.email || "",
      // Contato
      "contato.nome_decisor": decisor?.nome || "",
      "contato.telefone_decisor": decisor?.telefone || "",
      "contato.email_decisor": decisor?.email || "",
      // Contrato
      "contrato.numero": contrato.numero_exibicao || "",
      "contrato.status": contrato.status || "",
      // Plano
      "plano.nome": plano?.nome || "",
      "plano.valor_mensalidade": fmtBRL(plano?.valor_mensalidade_padrao ?? 0),
      // Módulos
      "modulos.inclusos_lista": modulosInclusosLista,
      "modulos.adicionais_lista": modulosAdicionaisLista,
      "modulos.tabela_detalhada": modulosTabelaDetalhada,
      // Valores
      "valores.implantacao.original": fmtBRL(implOriginal),
      "valores.implantacao.desconto": fmtBRL(implDesconto),
      "valores.implantacao.final": fmtBRL(implFinal),
      "valores.mensalidade.original": fmtBRL(mensOriginal),
      "valores.mensalidade.desconto": fmtBRL(mensDesconto),
      "valores.mensalidade.final": fmtBRL(mensFinal),
      "valores.total_geral": fmtBRL(totalGeral),
      "valores.total_extenso": valorPorExtenso(totalGeral),
      // Pagamento
      "pagamento.implantacao.forma": formaImplantacao,
      "pagamento.implantacao.parcelas": parcelasImplantacao ? `${parcelasImplantacao}x` : "",
      "pagamento.mensalidade.forma": formaMensalidade,
      "pagamento.mensalidade.parcelas": parcelasMensalidade ? `${parcelasMensalidade}x` : "",
      "pagamento.observacoes": pedido?.pagamento_mensalidade_observacao || pedido?.pagamento_implantacao_observacao || "",
      // Sistema
      "data.atual": dataAtual,
      "data.atual_extenso": dataExtenso,
      "logo.url": logoUrl,
      // Filial
      "filial.nome": filial?.nome || "",
      "filial.cnpj": filial?.cnpj || "",
      "filial.inscricao_estadual": filial?.inscricao_estadual || "",
      "filial.logradouro": filial?.logradouro || "",
      "filial.numero": filial?.numero || "",
      "filial.complemento": filial?.complemento || "",
      "filial.bairro": filial?.bairro || "",
      "filial.cidade": filial?.cidade || "",
      "filial.uf": filial?.uf || "",
      "filial.cep": filial?.cep || "",
      "filial.endereco_completo": enderecoFilial,
      "filial.telefone": filial?.telefone || "",
      "filial.email": filial?.email || "",
    };

    // 7. Substituir variáveis no HTML
    let htmlFinal = template.conteudo_html;
    htmlFinal = htmlFinal.replace(/\{\{([^}]+)\}\}/g, (match: string, key: string) => {
      const trimmedKey = key.trim();
      if (trimmedKey === "modulos.tabela_detalhada" && !dados[trimmedKey]) return "";
      const value = dados[trimmedKey];
      if (value === undefined) return match;
      // logo.url: substituir por tag img se estiver como texto puro
      if (trimmedKey === "logo.url" && value) {
        return `<img src="${value}" alt="Logo" style="max-height: 80px; max-width: 200px;" />`;
      }
      return value;
    });

    // Corrigir double-wrapping de logo
    htmlFinal = htmlFinal.replace(/src="<img\s+src="([^"]+)"[^>]*\/?>"/gi, 'src="$1"');

    console.log("HTML final gerado, comprimento:", htmlFinal.length);

    // 8. Converter HTML para PDF usando pdf-lib (parser simples)
    const pdfBytes = await htmlToPdf(htmlFinal, logoUrl);

    // 9. Upload do PDF
    const outputPath = `${contrato_id}.pdf`;
    const { error: uploadError } = await supabase.storage
      .from("contratos-pdf")
      .upload(outputPath, pdfBytes, {
        contentType: "application/pdf",
        upsert: true,
      });

    if (uploadError) {
      return new Response(
        JSON.stringify({ error: "Erro ao salvar contrato gerado: " + uploadError.message }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // 10. Signed URL
    const { data: signedData, error: signedError } = await supabase.storage
      .from("contratos-pdf")
      .createSignedUrl(outputPath, 3600);

    if (signedError || !signedData) {
      return new Response(
        JSON.stringify({ error: "Erro ao gerar URL do contrato: " + signedError?.message }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // 11. Atualizar contrato
    const { error: updateError } = await supabase
      .from("contratos")
      .update({ pdf_url: outputPath, status_geracao: "Gerado" })
      .eq("id", contrato_id);

    if (updateError) {
      return new Response(
        JSON.stringify({ error: "Erro ao atualizar contrato: " + updateError.message }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    return new Response(
      JSON.stringify({
        success: true,
        signed_url: signedData.signedUrl,
        storage_path: outputPath,
      }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (err) {
    console.error("Erro geral:", err);
    return new Response(JSON.stringify({ error: String(err) }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});

// ─── HTML para PDF usando pdf-lib ────────────────────────────────────────────
async function htmlToPdf(html: string, logoUrl?: string): Promise<Uint8Array> {
  const pdfDoc = await PDFDocument.create();
  const font = await pdfDoc.embedFont(StandardFonts.Helvetica);
  const fontBold = await pdfDoc.embedFont(StandardFonts.HelveticaBold);

  const pageWidth = PageSizes.A4[0];
  const pageHeight = PageSizes.A4[1];
  const marginX = 50;
  const marginTop = 50;
  const marginBottom = 50;
  const maxWidth = pageWidth - marginX * 2;

  let page = pdfDoc.addPage(PageSizes.A4);
  let y = pageHeight - marginTop;

  // Embed logo if available
  let logoImage: any = null;
  if (logoUrl) {
    try {
      const response = await fetch(logoUrl);
      if (response.ok) {
        const logoBytes = new Uint8Array(await response.arrayBuffer());
        const contentType = response.headers.get("content-type") || "";
        if (contentType.includes("png")) {
          logoImage = await pdfDoc.embedPng(logoBytes);
        } else if (contentType.includes("jpeg") || contentType.includes("jpg")) {
          logoImage = await pdfDoc.embedJpg(logoBytes);
        }
      }
    } catch (e) {
      console.log("Não foi possível carregar logo:", e);
    }
  }

  // Draw logo at top if available
  if (logoImage) {
    const logoMaxH = 50;
    const logoMaxW = 150;
    const scale = Math.min(logoMaxW / logoImage.width, logoMaxH / logoImage.height, 1);
    const w = logoImage.width * scale;
    const h = logoImage.height * scale;
    page.drawImage(logoImage, {
      x: marginX,
      y: y - h,
      width: w,
      height: h,
    });
    y -= h + 15;
  }

  const sanitize = (t: string): string =>
    t.replace(/[^\x20-\x7E\xA0-\xFF]/g, (ch) => {
      const code = ch.charCodeAt(0);
      if (code === 0x2013 || code === 0x2014) return "-";
      if (code === 0x2018 || code === 0x2019) return "'";
      if (code === 0x201C || code === 0x201D) return '"';
      if (code === 0x2026) return "...";
      if (code === 0x2022 || code === 0x00B7) return "-";
      if (code === 0x21E8 || code === 0x2192) return "->";
      return "";
    });

  const wrapText = (text: string, f: typeof font, size: number, maxW: number): string[] => {
    if (!text) return [""];
    const words = text.split(" ");
    const lines: string[] = [];
    let current = "";
    for (const word of words) {
      const test = current ? current + " " + word : word;
      const w = f.widthOfTextAtSize(test, size);
      if (w > maxW && current) {
        lines.push(current);
        current = word;
      } else {
        current = test;
      }
    }
    if (current) lines.push(current);
    return lines.length > 0 ? lines : [""];
  };

  const checkPage = (needed: number) => {
    if (y - needed < marginBottom) {
      page = pdfDoc.addPage(PageSizes.A4);
      y = pageHeight - marginTop;
    }
  };

  const drawText = (text: string, size: number, bold = false, indent = 0) => {
    text = sanitize(text);
    const f = bold ? fontBold : font;
    const lineH = size * 1.4;
    const lines = wrapText(text, f, size, maxWidth - indent);
    for (const line of lines) {
      checkPage(lineH);
      page.drawText(line, {
        x: marginX + indent,
        y,
        size,
        font: f,
        color: rgb(0, 0, 0),
      });
      y -= lineH;
    }
  };

  // Strip HTML tags and convert to structured text blocks
  // Remove <img> tags (logo already drawn), <style> blocks
  let cleaned = html.replace(/<style[^>]*>[\s\S]*?<\/style>/gi, "");
  cleaned = cleaned.replace(/<img[^>]*>/gi, "");
  
  // Convert <br> to newlines
  cleaned = cleaned.replace(/<br\s*\/?>/gi, "\n");
  // Convert </p>, </div>, </tr>, </li>, </h1-6> to newlines
  cleaned = cleaned.replace(/<\/(p|div|tr|li|h[1-6])>/gi, "\n");
  // Convert <li> to bullet
  cleaned = cleaned.replace(/<li[^>]*>/gi, "  • ");
  // Convert <hr> to separator
  cleaned = cleaned.replace(/<hr[^>]*>/gi, "\n---\n");
  
  // Handle table cells - add spacing
  cleaned = cleaned.replace(/<\/td>/gi, "    ");
  cleaned = cleaned.replace(/<\/th>/gi, "    ");

  // Detect bold/header sections
  interface TextBlock {
    text: string;
    bold: boolean;
    heading: boolean;
    separator: boolean;
  }

  const blocks: TextBlock[] = [];
  
  // Split by headers first
  const parts = cleaned.split(/(<\/?(?:h[1-6]|strong|b|thead|th)[^>]*>)/gi);
  let isBold = false;
  let isHeading = false;
  
  for (const part of parts) {
    const lower = part.toLowerCase();
    if (lower.match(/^<(h[1-6]|strong|b|thead|th)\b/)) {
      isBold = true;
      isHeading = !!lower.match(/^<h[1-6]/);
      continue;
    }
    if (lower.match(/^<\/(h[1-6]|strong|b|thead|th)>/)) {
      isBold = false;
      isHeading = false;
      continue;
    }
    // Strip remaining HTML tags
    const stripped = part.replace(/<[^>]+>/g, "").trim();
    if (!stripped) continue;
    
    // Split by newlines
    const lines = stripped.split("\n");
    for (const line of lines) {
      const trimmed = line.trim();
      if (trimmed === "---") {
        blocks.push({ text: "", bold: false, heading: false, separator: true });
      } else if (trimmed) {
        blocks.push({ text: trimmed, bold: isBold, heading: isHeading, separator: false });
      } else {
        blocks.push({ text: "", bold: false, heading: false, separator: false });
      }
    }
  }

  // Render blocks
  for (const block of blocks) {
    if (block.separator) {
      checkPage(10);
      y -= 5;
      page.drawLine({
        start: { x: marginX, y },
        end: { x: pageWidth - marginX, y },
        thickness: 0.5,
        color: rgb(0.7, 0.7, 0.7),
      });
      y -= 10;
      continue;
    }
    if (!block.text) {
      y -= 6; // empty line spacing
      continue;
    }
    const fontSize = block.heading ? 13 : 10;
    const indent = block.text.startsWith("•") ? 10 : 0;
    drawText(block.text, fontSize, block.bold || block.heading, indent);
  }

  const pdfBytesOut = await pdfDoc.save();
  return new Uint8Array(pdfBytesOut);
}

// ─── Valor por extenso ───────────────────────────────────────────────────────
function valorPorExtenso(valor: number): string {
  const unidades = ["", "um", "dois", "três", "quatro", "cinco", "seis", "sete", "oito", "nove"];
  const especiais = ["dez", "onze", "doze", "treze", "quatorze", "quinze", "dezesseis", "dezessete", "dezoito", "dezenove"];
  const dezenas = ["", "", "vinte", "trinta", "quarenta", "cinquenta", "sessenta", "setenta", "oitenta", "noventa"];
  const centenas = ["", "cento", "duzentos", "trezentos", "quatrocentos", "quinhentos", "seiscentos", "setecentos", "oitocentos", "novecentos"];

  if (valor === 0) return "zero reais";

  const inteiro = Math.floor(valor);
  const centavos = Math.round((valor - inteiro) * 100);

  function porExtenso(n: number): string {
    if (n === 0) return "";
    if (n === 100) return "cem";
    if (n < 10) return unidades[n];
    if (n < 20) return especiais[n - 10];
    if (n < 100) {
      const d = Math.floor(n / 10);
      const u = n % 10;
      return dezenas[d] + (u > 0 ? " e " + unidades[u] : "");
    }
    if (n < 1000) {
      const c = Math.floor(n / 100);
      const resto = n % 100;
      return centenas[c] + (resto > 0 ? " e " + porExtenso(resto) : "");
    }
    if (n < 1000000) {
      const milhares = Math.floor(n / 1000);
      const resto = n % 1000;
      const milStr = milhares === 1 ? "mil" : porExtenso(milhares) + " mil";
      return milStr + (resto > 0 ? (resto < 100 ? " e " : " ") + porExtenso(resto) : "");
    }
    return String(n);
  }

  let resultado = porExtenso(inteiro) + (inteiro === 1 ? " real" : " reais");
  if (centavos > 0) {
    resultado += " e " + porExtenso(centavos) + (centavos === 1 ? " centavo" : " centavos");
  }
  return resultado;
}
