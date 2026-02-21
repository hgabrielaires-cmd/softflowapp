import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Auth check
    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_ANON_KEY")!,
      { global: { headers: { Authorization: authHeader } } }
    );

    const token = authHeader.replace("Bearer ", "");
    const { data: claimsData, error: claimsError } = await supabase.auth.getClaims(token);
    if (claimsError || !claimsData?.claims) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { action, server_url, api_key, instance_name, number, text } = await req.json();

    if (!server_url || !api_key) {
      return new Response(JSON.stringify({ error: "server_url e api_key são obrigatórios" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Auto-fix: if user typed https:// for a non-443 port, switch to http://
    let normalizedUrl = server_url.replace(/\/+$/, "");
    try {
      const parsed = new URL(normalizedUrl);
      if (parsed.protocol === "https:" && parsed.port && parsed.port !== "443") {
        normalizedUrl = normalizedUrl.replace(/^https:/, "http:");
      }
    } catch { /* keep as-is */ }
    const baseUrl = normalizedUrl;

    const headers = {
      "Content-Type": "application/json",
      apikey: api_key,
    };

    let result: any;

    switch (action) {
      case "create_instance": {
        const res = await fetch(`${baseUrl}/instance/create`, {
          method: "POST",
          headers,
          body: JSON.stringify({
            instanceName: instance_name || "Softflow_WhatsApp",
            integration: "WHATSAPP-BAILEYS",
            qrcode: true,
            rejectCall: false,
            groupsIgnore: true,
            alwaysOnline: false,
            readMessages: false,
            readStatus: false,
            syncFullHistory: false,
          }),
        });
        result = await res.json();
        if (!res.ok) {
          return new Response(JSON.stringify({ error: "Erro ao criar instância", details: result }), {
            status: res.status,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          });
        }
        break;
      }

      case "connect": {
        const name = instance_name || "Softflow_WhatsApp";
        const res = await fetch(`${baseUrl}/instance/connect/${name}`, {
          method: "GET",
          headers,
        });
        result = await res.json();
        if (!res.ok) {
          return new Response(JSON.stringify({ error: "Erro ao conectar instância", details: result }), {
            status: res.status,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          });
        }
        break;
      }

      case "connection_state": {
        const name = instance_name || "Softflow_WhatsApp";
        const res = await fetch(`${baseUrl}/instance/connectionState/${name}`, {
          method: "GET",
          headers,
        });
        result = await res.json();
        if (!res.ok) {
          return new Response(JSON.stringify({ error: "Erro ao verificar estado", details: result }), {
            status: res.status,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          });
        }
        break;
      }

      case "fetch_instances": {
        const res = await fetch(`${baseUrl}/instance/fetchInstances`, {
          method: "GET",
          headers,
        });
        result = await res.json();
        if (!res.ok) {
          return new Response(JSON.stringify({ error: "Erro ao buscar instâncias", details: result }), {
            status: res.status,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          });
        }
        break;
      }

      case "send_text": {
        if (!number || !text) {
          return new Response(JSON.stringify({ error: "number e text são obrigatórios" }), {
            status: 400,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          });
        }
        const name = instance_name || "Softflow_WhatsApp";
        // Format number: remove non-digits, ensure country code
        let formattedNumber = number.replace(/\D/g, "");
        if (formattedNumber.startsWith("0")) formattedNumber = "55" + formattedNumber.substring(1);
        if (!formattedNumber.startsWith("55")) formattedNumber = "55" + formattedNumber;

        const res = await fetch(`${baseUrl}/message/sendText/${name}`, {
          method: "POST",
          headers,
          body: JSON.stringify({
            number: formattedNumber,
            text: text,
          }),
        });
        result = await res.json();
        if (!res.ok) {
          return new Response(JSON.stringify({ error: "Erro ao enviar mensagem", details: result }), {
            status: res.status,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          });
        }
        break;
      }

      default:
        return new Response(JSON.stringify({ error: "Ação inválida" }), {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
    }

    return new Response(JSON.stringify(result), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Erro desconhecido";
    console.error("Evolution API error:", msg);
    return new Response(JSON.stringify({ error: msg }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
