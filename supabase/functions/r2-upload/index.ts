import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

// --- AWS Signature V4 helpers (native Deno crypto.subtle) ---

async function sha256(data: Uint8Array): Promise<string> {
  const hash = await crypto.subtle.digest("SHA-256", data);
  return [...new Uint8Array(hash)].map((b) => b.toString(16).padStart(2, "0")).join("");
}

async function hmac(key: Uint8Array, msg: string): Promise<Uint8Array> {
  const cryptoKey = await crypto.subtle.importKey("raw", key, { name: "HMAC", hash: "SHA-256" }, false, ["sign"]);
  const sig = await crypto.subtle.sign("HMAC", cryptoKey, new TextEncoder().encode(msg));
  return new Uint8Array(sig);
}

async function getSignatureKey(secretKey: string, dateStamp: string, region: string, service: string) {
  let k = await hmac(new TextEncoder().encode("AWS4" + secretKey), dateStamp);
  k = await hmac(k, region);
  k = await hmac(k, service);
  k = await hmac(k, "aws4_request");
  return k;
}

function toHex(buf: Uint8Array): string {
  return [...buf].map((b) => b.toString(16).padStart(2, "0")).join("");
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

    // Auth
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

    // Parse body
    const { arquivo_base64, nome_arquivo, mime_type, pasta } = await req.json();

    if (!arquivo_base64 || !nome_arquivo || !mime_type || !pasta) {
      return new Response(
        JSON.stringify({ sucesso: false, erro: "Campos obrigatórios: arquivo_base64, nome_arquivo, mime_type, pasta" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (!["tickets", "clientes", "pedidos"].includes(pasta)) {
      return new Response(
        JSON.stringify({ sucesso: false, erro: "Pasta deve ser 'tickets', 'clientes' ou 'pedidos'" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Fetch R2 credentials
    const { data: r2Config, error: r2Error } = await supabase
      .from("r2_config")
      .select("*")
      .eq("ativo", true)
      .limit(1)
      .single();

    if (r2Error || !r2Config) {
      return new Response(
        JSON.stringify({ sucesso: false, erro: "Cloudflare R2 não configurado ou inativo" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const { endpoint, access_key_id, secret_access_key, bucket_name, public_url } = r2Config;

    if (!endpoint || !access_key_id || !secret_access_key || !bucket_name) {
      return new Response(
        JSON.stringify({ sucesso: false, erro: "Credenciais R2 incompletas" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Decode file
    const binaryStr = atob(arquivo_base64);
    const fileBytes = new Uint8Array(binaryStr.length);
    for (let i = 0; i < binaryStr.length; i++) {
      fileBytes[i] = binaryStr.charCodeAt(i);
    }

    // Build object key
    const timestamp = Date.now();
    const objectKey = `${pasta}/${timestamp}_${nome_arquivo}`;

    // AWS Signature V4
    const host = new URL(endpoint).host;
    const region = "auto";
    const service = "s3";
    const now = new Date();
    const amzDate = now.toISOString().replace(/[-:]/g, "").replace(/\.\d+Z$/, "Z");
    const dateStamp = amzDate.slice(0, 8);

    const payloadHash = await sha256(fileBytes);

    const canonicalUri = `/${bucket_name}/${objectKey}`;
    const canonicalQuerystring = "";

    const signedHeaders = "content-type;host;x-amz-content-sha256;x-amz-date";
    const canonicalHeaders =
      `content-type:${mime_type}\n` +
      `host:${host}\n` +
      `x-amz-content-sha256:${payloadHash}\n` +
      `x-amz-date:${amzDate}\n`;

    const canonicalRequest = [
      "PUT",
      canonicalUri,
      canonicalQuerystring,
      canonicalHeaders,
      signedHeaders,
      payloadHash,
    ].join("\n");

    const credentialScope = `${dateStamp}/${region}/${service}/aws4_request`;
    const stringToSign = [
      "AWS4-HMAC-SHA256",
      amzDate,
      credentialScope,
      await sha256(new TextEncoder().encode(canonicalRequest)),
    ].join("\n");

    const signingKey = await getSignatureKey(secret_access_key, dateStamp, region, service);
    const signature = toHex(await hmac(signingKey, stringToSign));

    const authorizationHeader =
      `AWS4-HMAC-SHA256 Credential=${access_key_id}/${credentialScope}, SignedHeaders=${signedHeaders}, Signature=${signature}`;

    // Upload to R2
    const uploadUrl = `${endpoint.replace(/\/$/, "")}/${bucket_name}/${objectKey}`;

    const uploadRes = await fetch(uploadUrl, {
      method: "PUT",
      headers: {
        "Content-Type": mime_type,
        Host: host,
        "x-amz-date": amzDate,
        "x-amz-content-sha256": payloadHash,
        Authorization: authorizationHeader,
      },
      body: fileBytes,
    });

    if (!uploadRes.ok) {
      const errBody = await uploadRes.text();
      console.error("R2 upload error:", uploadRes.status, errBody);
      return new Response(
        JSON.stringify({ sucesso: false, erro: `Erro no upload R2: ${uploadRes.status}` }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Consume response body
    await uploadRes.text();

    const publicFileUrl = `${(public_url || endpoint).replace(/\/$/, "")}/${objectKey}`;

    return new Response(
      JSON.stringify({ sucesso: true, url: publicFileUrl }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (err: any) {
    console.error("r2-upload error:", err);
    return new Response(
      JSON.stringify({ sucesso: false, erro: err.message || "Erro interno" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
