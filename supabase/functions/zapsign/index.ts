import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const ZAPSIGN_API = "https://api.zapsign.com.br/api/v1";

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const ZAPSIGN_API_TOKEN = Deno.env.get("ZAPSIGN_API_TOKEN")?.trim();
    console.log("ZAPSIGN_API_TOKEN loaded:", ZAPSIGN_API_TOKEN ? `${ZAPSIGN_API_TOKEN.substring(0, 6)}...${ZAPSIGN_API_TOKEN.substring(ZAPSIGN_API_TOKEN.length - 4)} (len=${ZAPSIGN_API_TOKEN.length})` : "NOT SET");
    if (!ZAPSIGN_API_TOKEN) {
      return new Response(
        JSON.stringify({ error: "ZAPSIGN_API_TOKEN não configurado" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

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

      const zapsignPayload = {
        name: docName,
        url_pdf: signedData.signedUrl,
        external_id: contrato.id,
        signers,
        lang: "pt-br",
        send_automatic_email: false,
        disable_signer_emails: false,
      };

      console.log("Enviando para ZapSign:", JSON.stringify({ name: docName, signers_count: signers.length }));

      const zapsignResponse = await fetch(`${ZAPSIGN_API}/docs/`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Token ${ZAPSIGN_API_TOKEN}`,
        },
        body: JSON.stringify(zapsignPayload),
      });

      const zapsignData = await zapsignResponse.json();

      if (!zapsignResponse.ok) {
        console.error("ZapSign error:", zapsignResponse.status, JSON.stringify(zapsignData));
        return new Response(
          JSON.stringify({ error: `Erro ZapSign: ${JSON.stringify(zapsignData)}` }),
          { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      // Extrair dados dos signatários retornados
      const returnedSigners = (zapsignData.signers || []).map((s: any) => ({
        name: s.name,
        email: s.email,
        token: s.token,
        status: s.status,
        sign_url: `https://app.zapsign.co/verificar/${s.token}`,
      }));

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

      const zapsignResponse = await fetch(
        `${ZAPSIGN_API}/docs/${token}/`,
        {
          method: "GET",
          headers: { "Authorization": `Token ${ZAPSIGN_API_TOKEN}` },
        }
      );

      if (!zapsignResponse.ok) {
        const errText = await zapsignResponse.text();
        console.error("ZapSign status error:", zapsignResponse.status, errText);
        return new Response(
          JSON.stringify({ error: `Erro ao consultar ZapSign: ${zapsignResponse.status}` }),
          { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      const zapsignData = await zapsignResponse.json();

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
