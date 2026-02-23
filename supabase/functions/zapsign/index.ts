import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const ZAPSIGN_API = "https://api.zapsign.com.br/api/v1";

/**
 * Faz uma requisição autenticada à API da ZapSign usando token direto.
 */
async function zapsignFetch(url: string, options: RequestInit = {}): Promise<Response> {
  const token = Deno.env.get("ZAPSIGN_API_TOKEN")?.trim();
  if (!token) {
    throw new Error("ZAPSIGN_API_TOKEN não configurado");
  }

  const headers = {
    ...options.headers as Record<string, string>,
    "Authorization": `Bearer ${token}`,
    "Content-Type": "application/json",
  };

  return await fetch(url, { ...options, headers });
}

// ── Edge Function principal ──

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
    const { action, contrato_id, doc_token } = body;

    // ── ACTION: send ── Enviar PDF para ZapSign
    if (action === "send") {
      if (!contrato_id) {
        return new Response(
          JSON.stringify({ error: "contrato_id obrigatório" }),
          { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      // Buscar contrato com dados do cliente
      const { data: contrato, error: contratoError } = await supabase
        .from("contratos")
        .select(`
          *,
          clientes(nome_fantasia, razao_social, cnpj_cpf, email),
          pedidos(filial_id)
        `)
        .eq("id", contrato_id)
        .single();

      if (contratoError || !contrato) {
        return new Response(
          JSON.stringify({ error: "Contrato não encontrado" }),
          { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      if (!contrato.pdf_url) {
        return new Response(
          JSON.stringify({ error: "Contrato ainda não tem PDF gerado. Gere o PDF primeiro." }),
          { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      // Buscar contato decisor do cliente
      const { data: contatos } = await supabase
        .from("cliente_contatos")
        .select("nome, email, decisor, ativo")
        .eq("cliente_id", contrato.cliente_id)
        .eq("ativo", true);

      const decisor = (contatos || []).find((c: any) => c.decisor) || (contatos || [])[0];

      // Gerar signed URL do PDF
      const { data: signedData, error: signedError } = await supabase.storage
        .from("contratos-pdf")
        .createSignedUrl(contrato.pdf_url, 3600);

      if (signedError || !signedData?.signedUrl) {
        return new Response(
          JSON.stringify({ error: "Erro ao gerar URL do PDF" }),
          { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      // Buscar filial para dados da contratada
      const filialId = (contrato as any).pedidos?.filial_id || (contrato as any).clientes?.filial_id;
      let filialNome = "";
      if (filialId) {
        const { data: filial } = await supabase.from("filiais").select("nome, responsavel").eq("id", filialId).maybeSingle();
        filialNome = filial?.responsavel || filial?.nome || "";
      }

      // Montar signatários
      const signers: any[] = [];

      // Signatário 1: Representante da contratada (filial)
      if (filialNome) {
        signers.push({
          name: filialNome,
          email: "",
          send_automatic_email: false,
          lock_name: true,
          lock_email: false,
        });
      }

      // Signatário 2: Decisor/cliente
      if (decisor) {
        signers.push({
          name: decisor.nome || (contrato as any).clientes?.nome_fantasia || "Cliente",
          email: decisor.email || (contrato as any).clientes?.email || "",
          send_automatic_email: !!decisor.email,
          lock_name: true,
          lock_email: false,
        });
      } else {
        signers.push({
          name: (contrato as any).clientes?.nome_fantasia || "Cliente",
          email: (contrato as any).clientes?.email || "",
          send_automatic_email: !!(contrato as any).clientes?.email,
          lock_name: true,
          lock_email: false,
        });
      }

      // Enviar para ZapSign
      const docName = `Contrato ${contrato.numero_exibicao} - ${(contrato as any).clientes?.nome_fantasia || ""}`;

      const zapsignEmail = Deno.env.get("ZAPSIGN_EMAIL")?.trim() || "";

      const zapsignPayload = {
        name: docName,
        url_pdf: signedData.signedUrl,
        external_id: contrato.id,
        created_by: zapsignEmail,
        signers,
        lang: "pt-br",
        send_automatic_email: false,
        disable_signer_emails: false,
        sandbox: false,
      };

      console.log("=== ZAPSIGN REQUEST ===");
      console.log("URL:", `${ZAPSIGN_API}/docs/`);
      console.log("Method: POST");
      console.log("Headers: Authorization: Bearer [REDACTED], Content-Type: application/json");
      console.log("Body:", JSON.stringify(zapsignPayload, null, 2));

      const zapsignResponse = await zapsignFetch(`${ZAPSIGN_API}/docs/`, {
        method: "POST",
        body: JSON.stringify(zapsignPayload),
      });

      console.log("=== ZAPSIGN RESPONSE ===");
      console.log("Status:", zapsignResponse.status);
      console.log("Status Text:", zapsignResponse.statusText);
      console.log("Headers:", JSON.stringify(Object.fromEntries(zapsignResponse.headers.entries())));

      const zapsignResponseText = await zapsignResponse.text();
      let zapsignData: any;
      try {
        zapsignData = JSON.parse(zapsignResponseText);
      } catch {
        console.error("ZapSign retornou resposta não-JSON:", zapsignResponse.status, zapsignResponseText);
        return new Response(
          JSON.stringify({ error: `Erro ZapSign (${zapsignResponse.status}): ${zapsignResponseText.substring(0, 200)}` }),
          { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      if (!zapsignResponse.ok) {
        console.error("ZapSign error:", zapsignResponse.status, JSON.stringify(zapsignData));
        return new Response(
          JSON.stringify({ error: `Erro ZapSign: ${JSON.stringify(zapsignData)}` }),
          { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      // Extrair dados dos signatários retornados
      let returnedSigners = (zapsignData.signers || []).map((s: any) => ({
        name: s.name,
        email: s.email,
        token: s.token,
        status: s.status,
        sign_url: `https://app.zapsign.co/verificar/${s.token}`,
      }));

      // Auto-assinar o primeiro signatário (representante da empresa)
      if (returnedSigners.length > 0) {
        const companySignerToken = returnedSigners[0].token;
        const userToken = Deno.env.get("ZAPSIGN_USER_TOKEN")?.trim();

        if (userToken) {
          console.log("Auto-assinando representante da empresa...");
          try {
            const autoSignResponse = await zapsignFetch(`${ZAPSIGN_API}/sign/`, {
              method: "POST",
              body: JSON.stringify({
                user_token: userToken,
                signer_tokens: [companySignerToken],
              }),
            });

            const autoSignText = await autoSignResponse.text();
            console.log("Auto-sign response:", autoSignResponse.status, autoSignText);

            if (autoSignResponse.ok) {
              // Atualizar status do signatário da empresa
              returnedSigners = returnedSigners.map((s: any, i: number) =>
                i === 0 ? { ...s, status: "signed" } : s
              );
            } else {
              console.warn("Falha ao auto-assinar:", autoSignText);
            }
          } catch (autoSignErr) {
            console.error("Erro ao auto-assinar:", autoSignErr);
          }
        } else {
          console.warn("ZAPSIGN_USER_TOKEN não configurado - assinatura automática da empresa não será realizada");
        }
      }

      // Salvar no banco
      const { error: insertError } = await supabase
        .from("contratos_zapsign")
        .upsert({
          contrato_id: contrato.id,
          zapsign_doc_token: zapsignData.token,
          zapsign_doc_id: zapsignData.open_id?.toString() || null,
          status: "Enviado",
          signers: returnedSigners,
          sign_url: returnedSigners[0]?.sign_url || null,
        }, { onConflict: "contrato_id" });

      if (insertError) {
        console.error("Erro ao salvar no banco:", insertError);
        return new Response(
          JSON.stringify({ error: "Documento enviado ao ZapSign mas erro ao salvar no banco: " + insertError.message }),
          { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      return new Response(
        JSON.stringify({
          success: true,
          doc_token: zapsignData.token,
          signers: returnedSigners,
        }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // ── ACTION: status ── Consultar status do documento no ZapSign
    if (action === "status") {
      if (!doc_token && !contrato_id) {
        return new Response(
          JSON.stringify({ error: "doc_token ou contrato_id obrigatório" }),
          { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      let token = doc_token;
      if (!token && contrato_id) {
        const { data: zapsignRecord } = await supabase
          .from("contratos_zapsign")
          .select("zapsign_doc_token")
          .eq("contrato_id", contrato_id)
          .maybeSingle();
        token = zapsignRecord?.zapsign_doc_token;
      }

      if (!token) {
        return new Response(
          JSON.stringify({ error: "Documento não encontrado no ZapSign" }),
          { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      const zapsignResponse = await zapsignFetch(`${ZAPSIGN_API}/docs/${token}/`, {
        method: "GET",
      });

      const zapsignStatusText = await zapsignResponse.text();
      if (!zapsignResponse.ok) {
        console.error("ZapSign status error:", zapsignResponse.status, zapsignStatusText);
        return new Response(
          JSON.stringify({ error: `Erro ao consultar ZapSign: ${zapsignResponse.status}` }),
          { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      let zapsignData: any;
      try {
        zapsignData = JSON.parse(zapsignStatusText);
      } catch {
        return new Response(
          JSON.stringify({ error: `Resposta inválida da ZapSign: ${zapsignStatusText.substring(0, 200)}` }),
          { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      // Mapear status do ZapSign
      let mappedStatus = "Enviado";
      if (zapsignData.status === "signed") mappedStatus = "Assinado";
      else if (zapsignData.status === "canceled" || zapsignData.status === "refused") mappedStatus = "Recusado";
      else if (zapsignData.status === "pending") mappedStatus = "Pendente";

      const returnedSigners = (zapsignData.signers || []).map((s: any) => ({
        name: s.name,
        email: s.email,
        token: s.token,
        status: s.status,
        sign_url: `https://app.zapsign.co/verificar/${s.token}`,
        signed_at: s.signed_at || null,
      }));

      // Atualizar no banco
      if (contrato_id) {
        await supabase
          .from("contratos_zapsign")
          .update({
            status: mappedStatus,
            signers: returnedSigners,
          })
          .eq("contrato_id", contrato_id);
      }

      return new Response(
        JSON.stringify({
          success: true,
          status: mappedStatus,
          zapsign_status: zapsignData.status,
          signers: returnedSigners,
        }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    return new Response(
      JSON.stringify({ error: "action inválida. Use 'send' ou 'status'." }),
      { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (err) {
    console.error("Erro geral ZapSign:", err);
    return new Response(
      JSON.stringify({ error: String(err) }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
