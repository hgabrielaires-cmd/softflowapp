import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

function contentDisposition(filename: string) {
  const fallback = filename.replace(/[^a-zA-Z0-9._-]/g, "_") || "download";
  return `attachment; filename=\"${fallback}\"; filename*=UTF-8''${encodeURIComponent(filename)}`;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    if (req.method !== "POST") {
      return new Response(JSON.stringify({ sucesso: false, erro: "Método não permitido" }), {
        status: 405,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return new Response(JSON.stringify({ sucesso: false, erro: "Não autorizado" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseAnonKey = Deno.env.get("SUPABASE_ANON_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseAnonKey, {
      global: { headers: { Authorization: authHeader } },
    });

    const token = authHeader.replace("Bearer ", "");
    const { data: claimsData, error: claimsError } = await supabase.auth.getClaims(token);
    if (claimsError || !claimsData?.claims) {
      return new Response(JSON.stringify({ sucesso: false, erro: "Token inválido" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { key, filename } = await req.json();

    if (!key || typeof key !== "string") {
      return new Response(JSON.stringify({ sucesso: false, erro: "Campo obrigatório: key" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (!["tickets/", "clientes/", "pedidos/"].some((p) => key.startsWith(p))) {
      return new Response(JSON.stringify({ sucesso: false, erro: "Key inválida" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { data: r2Config, error: r2Error } = await supabase
      .from("r2_config")
      .select("public_url, endpoint")
      .eq("ativo", true)
      .limit(1)
      .single();

    if (r2Error || !r2Config) {
      return new Response(JSON.stringify({ sucesso: false, erro: "Cloudflare R2 não configurado ou inativo" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const origin = (r2Config.public_url || r2Config.endpoint || "").replace(/\/$/, "");
    if (!origin) {
      return new Response(JSON.stringify({ sucesso: false, erro: "URL pública do R2 não configurada" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const url = `${origin}/${key}`;
    const res = await fetch(url);
    if (!res.ok) {
      const errTxt = await res.text();
      console.error("r2-download upstream error:", res.status, errTxt);
      return new Response(JSON.stringify({ sucesso: false, erro: `Erro ao baixar arquivo: ${res.status}` }), {
        status: 502,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const name = typeof filename === "string" && filename.trim() ? filename.trim() : key.split("/").pop() || "download";

    return new Response(res.body, {
      status: 200,
      headers: {
        ...corsHeaders,
        "Content-Type": res.headers.get("content-type") || "application/octet-stream",
        "Content-Disposition": contentDisposition(name),
        "Cache-Control": "private, max-age=0, must-revalidate",
      },
    });
  } catch (err: any) {
    console.error("r2-download error:", err);
    return new Response(JSON.stringify({ sucesso: false, erro: err.message || "Erro interno" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
