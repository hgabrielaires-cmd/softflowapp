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
    // ── Autenticação ──
    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return new Response(JSON.stringify({ error: "Não autorizado" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const anonClient = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_ANON_KEY")!,
      { global: { headers: { Authorization: authHeader } } }
    );

    const token = authHeader.replace("Bearer ", "");
    const { data: claimsData, error: claimsError } = await anonClient.auth.getClaims(token);
    if (claimsError || !claimsData?.claims) {
      return new Response(JSON.stringify({ error: "Token inválido" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Service role client para operações privilegiadas
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

    const buffer = await fileData.arrayBuffer();
    const bytes = new Uint8Array(buffer);

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
 */
function extractTextFromDocxBytes(bytes: Uint8Array): string {
  const decoder = new TextDecoder("utf-8", { fatal: false });
  const textContent = decoder.decode(bytes);

  const wTags = textContent.match(/<w:t[^>]*>([^<]*)<\/w:t>/g) || [];
  const xmlText = wTags.map((tag) => {
    const content = tag.replace(/<[^>]+>/g, "");
    return content;
  }).join(" ");

  return xmlText + " " + textContent;
}
