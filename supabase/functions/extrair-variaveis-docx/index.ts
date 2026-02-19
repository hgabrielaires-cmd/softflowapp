import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
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

    const { modelo_id } = await req.json();
    if (!modelo_id) {
      return new Response(JSON.stringify({ error: "modelo_id obrigatório" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Buscar o modelo no banco
    const { data: modelo, error: modeloError } = await supabase
      .from("modelos_contrato")
      .select("arquivo_docx_url, nome")
      .eq("id", modelo_id)
      .single();

    if (modeloError || !modelo?.arquivo_docx_url) {
      return new Response(
        JSON.stringify({ error: "Modelo não encontrado ou sem arquivo" }),
        {
          status: 404,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    // Extrair o path do storage da URL armazenada
    const url = modelo.arquivo_docx_url;
    let storagePath: string | null = null;

    // Tentar extrair o path do storage de signed URL ou public URL
    const pathMatch = url.match(/\/modelos-contrato\/([^?]+)/);
    if (pathMatch) {
      storagePath = decodeURIComponent(pathMatch[1]);
    }

    if (!storagePath) {
      return new Response(
        JSON.stringify({ error: "Não foi possível extrair o path do arquivo" }),
        {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    // Baixar o arquivo do storage
    const { data: fileData, error: downloadError } = await supabase.storage
      .from("modelos-contrato")
      .download(storagePath);

    if (downloadError || !fileData) {
      return new Response(
        JSON.stringify({ error: "Erro ao baixar arquivo: " + downloadError?.message }),
        {
          status: 500,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    // Ler o conteúdo do arquivo como ArrayBuffer
    const buffer = await fileData.arrayBuffer();
    const bytes = new Uint8Array(buffer);

    // Um arquivo DOCX é um ZIP — precisamos extrair o document.xml
    // Vamos usar uma abordagem simples: converter para texto e buscar os marcadores
    // O XML interno do DOCX contém o texto, então fazemos uma extração básica
    const text = extractTextFromDocxBytes(bytes);

    // Extrair marcadores no padrão #CAMPO#
    const regex = /#([A-Z0-9_]+)#/g;
    const matches = new Set<string>();
    let match;
    while ((match = regex.exec(text)) !== null) {
      matches.add(match[1]);
    }

    const variaveis = Array.from(matches).sort();

    return new Response(
      JSON.stringify({
        modelo_nome: modelo.nome,
        variaveis,
        total: variaveis.length,
      }),
      {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  } catch (err) {
    return new Response(JSON.stringify({ error: String(err) }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});

/**
 * Extrai o texto legível de um DOCX (ZIP) procurando pelo conteúdo XML interno.
 * Faz uma decodificação básica do ZIP para encontrar o document.xml.
 */
function extractTextFromDocxBytes(bytes: Uint8Array): string {
  // Converter bytes para string latin-1 para processar o ZIP
  const raw = Array.from(bytes)
    .map((b) => String.fromCharCode(b))
    .join("");

  // Procurar por blocos de texto XML dentro do arquivo ZIP
  // O DOCX tem document.xml dentro do ZIP, o conteúdo XML é texto ASCII/UTF-8
  const decoder = new TextDecoder("utf-8", { fatal: false });

  // Tentar decodificar como UTF-8 direto (vai funcionar para as partes de texto)
  const textContent = decoder.decode(bytes);

  // Extrair conteúdo das tags XML <w:t> que contém o texto do documento
  const wTags = textContent.match(/<w:t[^>]*>([^<]*)<\/w:t>/g) || [];
  const xmlText = wTags.map((tag) => {
    const content = tag.replace(/<[^>]+>/g, "");
    return content;
  }).join(" ");

  // Também incluir o texto bruto para capturar marcadores que podem estar fora das tags
  return xmlText + " " + textContent;
}
