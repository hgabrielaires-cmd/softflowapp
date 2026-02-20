import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

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

    const body = await req.json();
    const { contrato_id, action, pdf_base64 } = body;
    const BROWSERLESS_API_KEY = Deno.env.get("BROWSERLESS_API_KEY");

    if (!contrato_id) {
      return new Response(JSON.stringify({ error: "contrato_id obrigatório" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // ── ACTION: upload ── Client sends generated PDF base64 for storage
    if (action === "upload" && pdf_base64) {
      const pdfBytes = Uint8Array.from(atob(pdf_base64), (c) => c.charCodeAt(0));
      const outputPath = `${contrato_id}.pdf`;

      const { error: uploadError } = await supabase.storage
        .from("contratos-pdf")
        .upload(outputPath, pdfBytes, {
          contentType: "application/pdf",
          upsert: true,
        });

      if (uploadError) {
        return new Response(
          JSON.stringify({ error: "Erro ao salvar PDF: " + uploadError.message }),
          { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      const { data: signedData } = await supabase.storage
        .from("contratos-pdf")
        .createSignedUrl(outputPath, 3600);

      await supabase
        .from("contratos")
        .update({ pdf_url: outputPath, status_geracao: "Gerado" })
        .eq("id", contrato_id);

      return new Response(
        JSON.stringify({
          success: true,
          signed_url: signedData?.signedUrl || null,
          storage_path: outputPath,
        }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // ── ACTION: render (default) ── Return rendered HTML with variables substituted
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
    let template: any = null;
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

    if (!template) {
      return new Response(
        JSON.stringify({ error: "Nenhum modelo de contrato ativo encontrado para esta filial." }),
        { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // 5b. Se usa cláusulas, buscar template_clauses e montar HTML
    let templateHtml = template.conteudo_html || "";
    if (template.usa_clausulas) {
      const { data: templateClauses } = await supabase
        .from("template_clauses")
        .select("*")
        .eq("template_id", template.id)
        .eq("ativo", true)
        .order("ordem");

      if (templateClauses && templateClauses.length > 0) {
        templateHtml = templateClauses
          .map((c: any, i: number) => {
            const titulo = `<p style="margin-top:20px;margin-bottom:8px;"><strong>CLÁUSULA ${i + 1}ª - ${(c.titulo || "").toUpperCase()}</strong></p>`;
            return titulo + "\n" + (c.conteudo_html || "");
          })
          .join("\n\n");
      }
    }

    if (!templateHtml) {
      return new Response(
        JSON.stringify({ error: "Modelo de contrato sem conteúdo." }),
        { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // 6. Montar dados de variáveis
    const fmtBRL = (v: number) =>
      (v ?? 0).toLocaleString("pt-BR", { style: "currency", currency: "BRL" });

    const modulos = (pedido?.modulos_adicionais || []) as any[];

    // Módulos inclusos: extrair da descrição do plano (separado por vírgula)
    const planoDescricao = plano?.descricao || "";
    const modulosInclusosLista = planoDescricao
      ? "<ul style=\"margin:4px 0;padding-left:18px;\">" + planoDescricao.split(",").map((item: string) => item.trim()).filter((item: string) => item.length > 0).map((item: string) => `<li>${item}</li>`).join("") + "</ul>"
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
            <th style="border:1px solid #ccc;padding:6px;text-align:right;">Valor Unit.</th>
            <th style="border:1px solid #ccc;padding:6px;text-align:right;">Mensalidade</th>
          </tr></thead>
          <tbody>${modulos.map((m: any) => `<tr>
            <td style="border:1px solid #ccc;padding:6px;">${m.nome}</td>
            <td style="border:1px solid #ccc;padding:6px;text-align:center;">${m.quantidade}x</td>
            <td style="border:1px solid #ccc;padding:6px;text-align:right;">${fmtBRL(m.valor_implantacao_modulo * m.quantidade)}</td>
            <td style="border:1px solid #ccc;padding:6px;text-align:right;">${fmtBRL(m.valor_mensalidade_modulo)}</td>
            <td style="border:1px solid #ccc;padding:6px;text-align:right;">${fmtBRL(m.valor_mensalidade_modulo * m.quantidade)}</td>
          </tr>`).join("")}</tbody>
        </table>`
      : "";

    const implOriginal = pedido?.valor_implantacao_original ?? 0;
    const implFinal = pedido?.valor_implantacao_final ?? 0;
    const implDesconto = implOriginal - implFinal;
    const mensOriginal = pedido?.valor_mensalidade_original ?? 0;
    const mensFinal = pedido?.valor_mensalidade_final ?? 0;
    const mensDesconto = mensOriginal - mensFinal;
    const totalGeral = pedido?.valor_total ?? 0;

    const enderecoCliente = [
      cliente?.logradouro,
      cliente?.numero ? `, ${cliente.numero}` : "",
      cliente?.complemento ? ` - ${cliente.complemento}` : "",
      cliente?.bairro ? ` - ${cliente.bairro}` : "",
      cliente?.cidade && cliente?.uf ? ` - ${cliente.cidade}/${cliente.uf}` : "",
      cliente?.cep ? ` - CEP ${cliente.cep}` : "",
    ].join("");

    const enderecoFilial = filial ? [
      filial.logradouro,
      filial.numero ? `, ${filial.numero}` : "",
      filial.complemento ? ` - ${filial.complemento}` : "",
      filial.bairro ? ` - ${filial.bairro}` : "",
      filial.cidade && filial.uf ? ` - ${filial.cidade}/${filial.uf}` : "",
      filial.cep ? ` - CEP ${filial.cep}` : "",
    ].join("") : "";

    const meses = ["janeiro","fevereiro","março","abril","maio","junho","julho","agosto","setembro","outubro","novembro","dezembro"];
    const agora = new Date();
    const dataAtual = `${String(agora.getDate()).padStart(2,"0")}/${String(agora.getMonth()+1).padStart(2,"0")}/${agora.getFullYear()}`;
    const dataExtenso = `${agora.getDate()} de ${meses[agora.getMonth()]} de ${agora.getFullYear()}`;

    const logoUrl = template.logo_url || filial?.logo_url || "";

    const formaImplantacao = pedido?.pagamento_implantacao_forma || "";
    const parcelasImplantacao = pedido?.pagamento_implantacao_parcelas;
    const formaMensalidade = pedido?.pagamento_mensalidade_forma || "";
    const parcelasMensalidade = pedido?.pagamento_mensalidade_parcelas;

    const dados: Record<string, string> = {
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
      "contato.nome_decisor": decisor?.nome || "",
      "contato.telefone_decisor": decisor?.telefone || "",
      "contato.email_decisor": decisor?.email || "",
      "contrato.numero": contrato.numero_exibicao || "",
      "contrato.status": contrato.status || "",
      "plano.nome": plano?.nome || "",
      "plano.valor_mensalidade": fmtBRL(plano?.valor_mensalidade_padrao ?? 0),
      "modulos.inclusos_lista": modulosInclusosLista,
      "modulos.adicionais_lista": modulosAdicionaisLista,
      "modulos.tabela_detalhada": modulosTabelaDetalhada,
      "valores.implantacao.original": fmtBRL(implOriginal),
      "valores.implantacao.desconto": fmtBRL(implDesconto),
      "valores.implantacao.final": fmtBRL(implFinal),
      "valores.mensalidade.original": fmtBRL(mensOriginal),
      "valores.mensalidade.desconto": fmtBRL(mensDesconto),
      "valores.mensalidade.final": fmtBRL(mensFinal),
      "valores.total_geral": fmtBRL(totalGeral),
      "valores.total_extenso": valorPorExtenso(totalGeral),
      "pagamento.implantacao.forma": formaImplantacao,
      "pagamento.implantacao.parcelas": parcelasImplantacao ? `${parcelasImplantacao}x` : "",
      "pagamento.mensalidade.forma": formaMensalidade,
      "pagamento.mensalidade.parcelas": parcelasMensalidade ? `${parcelasMensalidade}x` : "",
      "pagamento.observacoes": pedido?.pagamento_mensalidade_observacao || pedido?.pagamento_implantacao_observacao || "",
      "data.atual": dataAtual,
      "data.atual_extenso": dataExtenso,
      "logo.url": logoUrl,
      "empresa.logo": logoUrl,
      "filial.nome": filial?.nome || "",
      "filial.razao_social": filial?.razao_social || "",
      "filial.responsavel": filial?.responsavel || "",
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
    let htmlFinal = templateHtml;

    // Forçar quebra de página antes do ANEXO I
    htmlFinal = htmlFinal.replace(
      /((?:<[^>]*>)*ANEXO\s+I\s*[-–—]\s*ESPECIFICA)/gi,
      '<div style="page-break-before:always;"></div>$1'
    );

    htmlFinal = htmlFinal.replace(/\{\{([^}]+)\}\}/g, (match: string, key: string) => {
      const trimmedKey = key.trim();
      if (trimmedKey === "modulos.tabela_detalhada" && !dados[trimmedKey]) return "";
      const value = dados[trimmedKey];
      if (value === undefined) return match;
      return value;
    });

    // Se action === "generate", gerar PDF via Browserless
    if (action === "generate") {
      if (!BROWSERLESS_API_KEY) {
        return new Response(
          JSON.stringify({ error: "BROWSERLESS_API_KEY não configurada" }),
          { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      // Envolver HTML em documento completo com estilos A4
      const fullHtml = `<!DOCTYPE html>
<html><head><meta charset="UTF-8">
<style>
  @page { size: A4; margin: 18mm 14mm 18mm 14mm; }
  body { margin: 0; padding: 0; font-family: Arial, sans-serif; font-size: 10.5pt; line-height: 1.35; color: #000; }
  table { border-collapse: collapse; page-break-inside: avoid; }
  img { max-width: 100%; }
  p { margin: 2px 0; }
  h1, h2, h3, h4, h5, h6 { margin: 6px 0 2px 0; }
  ul, ol { margin: 2px 0; padding-left: 18px; page-break-inside: avoid; }
  li { margin: 1px 0; }
  div { margin: 0; }
  hr { margin: 4px 0; }
  /* Manter anexo/seções técnicas juntas na mesma página */
  table + table { page-break-before: avoid; }
  p + table { page-break-between: avoid; }
  strong { page-break-after: avoid; }
</style>
</head><body>${htmlFinal}</body></html>`;

      // Chamar Browserless PDF API
      const browserlessUrl = `https://production-sfo.browserless.io/pdf?token=${BROWSERLESS_API_KEY}`;
      const pdfResponse = await fetch(browserlessUrl, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          html: fullHtml,
          options: {
            format: "A4",
            printBackground: true,
            margin: { top: "0px", right: "0px", bottom: "0px", left: "0px" },
          },
          gotoOptions: { waitUntil: "networkidle0", timeout: 30000 },
        }),
      });

      if (!pdfResponse.ok) {
        const errText = await pdfResponse.text();
        console.error("Browserless error:", pdfResponse.status, errText);
        return new Response(
          JSON.stringify({ error: `Erro ao gerar PDF: ${pdfResponse.status} - ${errText}` }),
          { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      const pdfBuffer = await pdfResponse.arrayBuffer();
      const pdfBytes = new Uint8Array(pdfBuffer);
      const outputPath = `${contrato_id}.pdf`;

      // Upload para storage
      const { error: uploadError } = await supabase.storage
        .from("contratos-pdf")
        .upload(outputPath, pdfBytes, {
          contentType: "application/pdf",
          upsert: true,
        });

      if (uploadError) {
        return new Response(
          JSON.stringify({ error: "Erro ao salvar PDF: " + uploadError.message }),
          { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      const { data: signedData } = await supabase.storage
        .from("contratos-pdf")
        .createSignedUrl(outputPath, 3600);

      await supabase
        .from("contratos")
        .update({ pdf_url: outputPath, status_geracao: "Gerado" })
        .eq("id", contrato_id);

      return new Response(
        JSON.stringify({
          success: true,
          signed_url: signedData?.signedUrl || null,
          storage_path: outputPath,
        }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Default: retornar HTML renderizado (para preview)
    return new Response(
      JSON.stringify({
        success: true,
        html: htmlFinal,
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
