import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import type { Contrato, ZapSignRecord } from "./types";
import { ZAPSIGN_MSGS, WHATSAPP_MSGS, GERAR_MSGS_CONTRATO, GERAR_MSGS_OA } from "./constants";
import { gerarTermoAceite, type GerarTermoAceiteContext } from "./helpers";

export type ZapsignPopupStep = "gerando" | "zapsign" | "whatsapp" | "done" | "erro" | "whatsapp_erro";

interface UseContratoGeracaoZapsignParams {
  selected: Contrato | null;
  setSelected: React.Dispatch<React.SetStateAction<Contrato | null>>;
  contratos: Contrato[];
  setContratos: React.Dispatch<React.SetStateAction<Contrato[]>>;
  setContatosCliente: React.Dispatch<React.SetStateAction<{ nome: string; telefone: string | null; decisor: boolean; ativo: boolean }[]>>;
  setLinkedMessageTemplate: React.Dispatch<React.SetStateAction<{ conteudo: string } | null>>;
  buildTermoCtx: () => GerarTermoAceiteContext;
}

export function useContratoGeracaoZapsign({
  selected,
  setSelected,
  contratos,
  setContratos,
  setContatosCliente,
  setLinkedMessageTemplate,
  buildTermoCtx,
}: UseContratoGeracaoZapsignParams) {
  // ── ZapSign records ──
  const [zapsignRecords, setZapsignRecords] = useState<Record<string, ZapSignRecord>>({});
  const [gerando, setGerando] = useState(false);
  const [gerarSignedUrl, setGerarSignedUrl] = useState<string | null>(null);
  const [enviandoZapsign, setEnviandoZapsign] = useState(false);
  const [reenviandoWhatsapp, setReenviandoWhatsapp] = useState(false);
  const [enviandoWhatsapp, setEnviandoWhatsapp] = useState(false);
  const [syncingStatuses, setSyncingStatuses] = useState(false);

  // ── ZapSign detail dialog state ──
  const [openZapsignDetail, setOpenZapsignDetail] = useState(false);
  const [zapsignDetailContrato, setZapsignDetailContrato] = useState<Contrato | null>(null);

  // ── ZapSign popup state ──
  const [openZapsignPopup, setOpenZapsignPopup] = useState(false);
  const [zapsignPopupStep, setZapsignPopupStep] = useState<ZapsignPopupStep>("zapsign");
  const [zapsignPopupMsgIndex, setZapsignPopupMsgIndex] = useState(0);
  const [zapsignPopupContrato, setZapsignPopupContrato] = useState<Contrato | null>(null);
  const [zapsignPopupError, setZapsignPopupError] = useState<string | null>(null);

  // ── Message cycling effect ──
  useEffect(() => {
    if (!openZapsignPopup || zapsignPopupStep === "done" || zapsignPopupStep === "erro") return;
    setZapsignPopupMsgIndex(0);
    const msgs = zapsignPopupStep === "gerando"
      ? (zapsignPopupContrato?.tipo === "OA" ? GERAR_MSGS_OA : GERAR_MSGS_CONTRATO)
      : zapsignPopupStep === "zapsign" ? ZAPSIGN_MSGS : WHATSAPP_MSGS;
    const interval = setInterval(() => {
      setZapsignPopupMsgIndex((prev) => (prev + 1) % msgs.length);
    }, 2000);
    return () => clearInterval(interval);
  }, [openZapsignPopup, zapsignPopupStep]);

  // ── Sync ZapSign statuses ──
  async function syncZapsignStatuses(pendentes: any[], currentMap: Record<string, ZapSignRecord>) {
    const updatedMap = { ...currentMap };
    for (const zRec of pendentes) {
      try {
        const { data } = await supabase.functions.invoke("zapsign", {
          body: { action: "status", contrato_id: zRec.contrato_id },
        });
        if (data?.skippable) {
          updatedMap[zRec.contrato_id] = {
            ...updatedMap[zRec.contrato_id],
            status: "Token Inválido",
          };
        } else if (data?.success && data.status !== zRec.status) {
          updatedMap[zRec.contrato_id] = {
            ...updatedMap[zRec.contrato_id],
            status: data.status,
            signers: data.signers,
          };
        }
      } catch {
        // silently skip
      }
    }
    setZapsignRecords(updatedMap);
  }

  // ── Load ZapSign records ──
  async function loadZapsignRecords() {
    const { data: zapsignData } = await supabase
      .from("contratos_zapsign")
      .select("*");
    const zMap: Record<string, ZapSignRecord> = {};
    (zapsignData || []).forEach((z: any) => { zMap[z.contrato_id] = z as ZapSignRecord; });
    setZapsignRecords(zMap);

    const pendentes = (zapsignData || []).filter(
      (z: any) => z.status === "Enviado" || z.status === "Pendente"
    );
    if (pendentes.length > 0) {
      syncZapsignStatuses(pendentes, zMap);
    }
  }

  // ── Sync all statuses button ──
  async function handleSyncAllStatuses() {
    setSyncingStatuses(true);
    try {
      const { data: zapsignData } = await supabase.from("contratos_zapsign").select("*");
      const zMap: Record<string, ZapSignRecord> = {};
      (zapsignData || []).forEach((z: any) => { zMap[z.contrato_id] = z as ZapSignRecord; });
      const pendentes = (zapsignData || []).filter(
        (z: any) => z.status === "Enviado" || z.status === "Pendente"
      );
      if (pendentes.length > 0) {
        await syncZapsignStatuses(pendentes, zMap);
        toast.success("Status das assinaturas atualizados!");
      } else {
        setZapsignRecords(zMap);
        toast.info("Nenhum contrato pendente de assinatura.");
      }
    } catch {
      toast.error("Erro ao sincronizar status.");
    } finally {
      setSyncingStatuses(false);
    }
  }

  // ── handleGerarContrato (3 steps: PDF → ZapSign → WhatsApp) ──
  async function handleGerarContrato(contrato: Contrato) {
    const { data: contatosFetched } = await supabase
      .from("cliente_contatos")
      .select("nome, telefone, decisor, ativo, email")
      .eq("cliente_id", contrato.cliente_id)
      .eq("ativo", true);
    const contatosLocais = (contatosFetched || []) as { nome: string; telefone: string | null; decisor: boolean; ativo: boolean; email: string | null }[];
    setContatosCliente(contatosLocais);

    setZapsignPopupContrato(contrato);
    setZapsignPopupStep("gerando");
    setZapsignPopupMsgIndex(0);
    setZapsignPopupError(null);
    setOpenZapsignPopup(true);
    setGerando(true);

    try {
      // PASSO 1: Gerar PDF
      const { data, error } = await supabase.functions.invoke("gerar-contrato-pdf", {
        body: { contrato_id: contrato.id, action: "generate", tipo_documento: contrato.tipo },
      });

      if (error || data?.error || !data?.success) {
        setZapsignPopupStep("erro");
        setZapsignPopupError(data?.error || "Erro ao gerar contrato");
        setGerando(false);
        return;
      }

      const updatedContrato = {
        ...contrato,
        status_geracao: "Gerado",
        pdf_url: data.storage_path,
      };
      setContratos((prev) =>
        prev.map((c) => (c.id === contrato.id ? updatedContrato : c))
      );
      if (selected?.id === contrato.id) {
        setSelected(updatedContrato);
      }
      setGerarSignedUrl(data.signed_url || null);
      setZapsignPopupContrato(updatedContrato);
      setGerando(false);

      // PASSO 2: Auto enviar para ZapSign
      setZapsignPopupStep("zapsign");
      setZapsignPopupMsgIndex(0);
      setEnviandoZapsign(true);

      const { data: zData, error: zError } = await supabase.functions.invoke("zapsign", {
        body: { action: "send", contrato_id: contrato.id },
      });
      if (zError || zData?.error) {
        setZapsignPopupStep("erro");
        setZapsignPopupError(zData?.error || "Erro ao enviar para ZapSign");
        setEnviandoZapsign(false);
        return;
      }

      setZapsignRecords((prev) => ({
        ...prev,
        [contrato.id]: {
          contrato_id: contrato.id,
          zapsign_doc_token: zData.doc_token,
          status: "Enviado",
          signers: zData.signers || [],
          sign_url: zData.signers?.[zData.signers.length - 1]?.sign_url || null,
        },
      }));

      const contratoSemPdf = { ...updatedContrato, pdf_url: null };
      setContratos((prev) =>
        prev.map((c) => (c.id === contrato.id ? contratoSemPdf : c))
      );
      if (selected?.id === contrato.id) {
        setSelected(contratoSemPdf);
      }
      setZapsignPopupContrato(contratoSemPdf);

      // PASSO 3: Auto enviar WhatsApp
      setZapsignPopupStep("whatsapp");
      setZapsignPopupMsgIndex(0);

      try {
        const docTemplateType = contrato.tipo === "OA" ? "ORDEM_ATENDIMENTO"
          : contrato.tipo === "Aditivo"
            ? (contrato.pedidos?.tipo_pedido === "Upgrade" ? "ADITIVO_UPGRADE" : "ADITIVO_MODULO")
            : contrato.tipo === "Cancelamento" ? "CANCELAMENTO"
            : "CONTRATO_BASE";
        const { data: docTemplate } = await supabase
          .from("document_templates")
          .select("message_template_id")
          .eq("tipo", docTemplateType)
          .eq("ativo", true)
          .limit(1)
          .maybeSingle();

        let msgTemplate: { conteudo: string } | null = null;
        if (docTemplate?.message_template_id) {
          const { data: mt } = await supabase
            .from("message_templates")
            .select("conteudo")
            .eq("id", docTemplate.message_template_id)
            .maybeSingle();
          msgTemplate = mt;
        }
        if (msgTemplate) setLinkedMessageTemplate(msgTemplate);

        const signUrl = zData.signers?.[0]?.sign_url || "";
        const mensagem = gerarTermoAceite(updatedContrato, buildTermoCtx(), signUrl, msgTemplate || undefined, contatosLocais);

        const decisorContato = contatosLocais.find(c => c.decisor) || contatosLocais[0];
        if (!decisorContato?.telefone) {
          setZapsignPopupStep("done");
          setEnviandoZapsign(false);
          toast.info("ZapSign enviado! Decisor sem telefone para WhatsApp.");
          return;
        }

        const { error: whatsError } = await supabase.functions.invoke("evolution-api", {
          body: {
            action: "send_text",
            number: decisorContato.telefone,
            text: mensagem,
            template_id: docTemplate?.message_template_id || undefined,
          },
        });

        if (whatsError) throw whatsError;

        setZapsignPopupStep("done");
      } catch (whatsErr: any) {
        console.error("Erro WhatsApp:", whatsErr);
        setZapsignPopupError("Contrato gerado e enviado para ZapSign, mas o WhatsApp não foi disparado: " + (whatsErr.message || "Erro de conexão"));
        setZapsignPopupStep("whatsapp_erro");
      }
    } catch (err) {
      console.error("Erro no fluxo:", err);
      setZapsignPopupStep("erro");
      setZapsignPopupError("Erro inesperado no processo. Tente novamente.");
    } finally {
      setGerando(false);
      setEnviandoZapsign(false);
    }
  }

  // ── Baixar Contrato ──
  async function handleBaixarContrato(contrato: Contrato) {
    if (!contrato.pdf_url) return;
    setGerando(true);
    try {
      const { data, error } = await supabase.storage
        .from("contratos-pdf")
        .createSignedUrl(contrato.pdf_url, 3600);
      if (error || !data?.signedUrl) {
        toast.error("Erro ao gerar link de download.");
        return;
      }
      const response = await fetch(data.signedUrl);
      const blob = await response.blob();
      const objectUrl = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = objectUrl;
      a.download = `contrato-${contrato.numero_exibicao || contrato.numero_registro}.pdf`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(objectUrl);
    } finally {
      setGerando(false);
    }
  }

  // ── Atualizar status ZapSign individual ──
  async function handleAtualizarStatusZapSign(contratoId: string) {
    try {
      const { data, error } = await supabase.functions.invoke("zapsign", {
        body: { action: "status", contrato_id: contratoId },
      });
      if (error || data?.error) {
        toast.error(data?.error || "Erro ao consultar status");
        return;
      }
      setZapsignRecords((prev) => ({
        ...prev,
        [contratoId]: {
          ...prev[contratoId],
          status: data.status,
          signers: data.signers || prev[contratoId]?.signers || [],
        },
      }));
      toast.success(`Status atualizado: ${data.status}`);
    } catch (err) {
      console.error("Erro ao atualizar status:", err);
      toast.error("Erro ao consultar ZapSign");
    }
  }

  // ── Enviar WhatsApp (manual) ──
  async function handleEnviarWhatsapp(mensagem: string, contatosCliente: { nome: string; telefone: string | null; decisor: boolean; ativo: boolean }[], selectedContrato: Contrato | null) {
    const decisor = contatosCliente.find(c => c.decisor) || contatosCliente[0];
    if (!decisor?.telefone) {
      toast.error("Decisor não possui telefone cadastrado");
      return;
    }

    setEnviandoWhatsapp(true);
    try {
      const selContrato = selectedContrato;
      const docType = selContrato?.tipo === "OA" ? "ORDEM_ATENDIMENTO"
        : selContrato?.tipo === "Aditivo"
          ? (selContrato?.pedidos?.tipo_pedido === "Upgrade" ? "ADITIVO_UPGRADE" : "ADITIVO_MODULO")
          : selContrato?.tipo === "Cancelamento" ? "CANCELAMENTO"
          : "CONTRATO_BASE";
      const { data: docTplEnvio } = await supabase
        .from("document_templates")
        .select("message_template_id")
        .eq("tipo", docType)
        .eq("ativo", true)
        .not("message_template_id", "is", null)
        .limit(1)
        .maybeSingle();

      const { data, error } = await supabase.functions.invoke("evolution-api", {
        body: {
          action: "send_text",
          number: decisor.telefone,
          text: mensagem,
          template_id: docTplEnvio?.message_template_id || undefined,
        },
      });

      if (error) throw error;
      if (data?.error) throw new Error(data.error);

      toast.success(`Mensagem enviada para ${decisor.nome} (${decisor.telefone})`);
    } catch (err: any) {
      toast.error("Erro ao enviar WhatsApp: " + (err.message || "Erro desconhecido"));
    } finally {
      setEnviandoWhatsapp(false);
    }
  }

  // ── Reenviar WhatsApp ──
  async function handleReenviarWhatsapp(contrato: Contrato) {
    setReenviandoWhatsapp(true);
    try {
      const { data: contatos } = await supabase
        .from("cliente_contatos")
        .select("nome, email, telefone, decisor, ativo")
        .eq("cliente_id", contrato.cliente_id)
        .eq("ativo", true);

      const decisor = (contatos || []).find(c => c.decisor) || (contatos || [])[0];
      if (!decisor?.telefone) {
        toast.error("Decisor não possui telefone cadastrado");
        setReenviandoWhatsapp(false);
        return;
      }

      const zRec = zapsignRecords[contrato.id];
      const signUrl = zRec?.signers?.[0]?.sign_url || "";

      const docTemplateType = contrato.tipo === "OA" ? "OA"
        : contrato.tipo === "Aditivo"
          ? (contrato.pedidos?.tipo_pedido === "Upgrade" ? "ADITIVO_UPGRADE" : "ADITIVO_MODULO")
          : contrato.tipo === "Cancelamento" ? "CANCELAMENTO"
          : "CONTRATO_BASE";
      const { data: docTpl } = await supabase
        .from("document_templates")
        .select("message_template_id")
        .eq("tipo", docTemplateType)
        .eq("ativo", true)
        .not("message_template_id", "is", null)
        .limit(1)
        .maybeSingle();

      const mensagem = gerarTermoAceite(contrato, buildTermoCtx(), signUrl, undefined, (contatos || []) as any);

      const { error } = await supabase.functions.invoke("evolution-api", {
        body: {
          action: "send_text",
          number: decisor.telefone,
          text: mensagem,
          template_id: docTpl?.message_template_id || undefined,
        },
      });

      if (error) throw error;
      toast.success(`WhatsApp reenviado para ${decisor.nome} (${decisor.telefone})`);
    } catch (err: any) {
      toast.error("Erro ao reenviar WhatsApp: " + (err.message || "Erro desconhecido"));
    } finally {
      setReenviandoWhatsapp(false);
    }
  }

  return {
    // ZapSign records
    zapsignRecords,
    setZapsignRecords,
    gerando,
    gerarSignedUrl,
    enviandoZapsign,
    reenviandoWhatsapp,
    enviandoWhatsapp,
    syncingStatuses,
    // ZapSign detail
    openZapsignDetail,
    setOpenZapsignDetail,
    zapsignDetailContrato,
    setZapsignDetailContrato,
    // ZapSign popup
    openZapsignPopup,
    setOpenZapsignPopup,
    zapsignPopupStep,
    zapsignPopupMsgIndex,
    zapsignPopupContrato,
    zapsignPopupError,
    // Actions
    loadZapsignRecords,
    handleSyncAllStatuses,
    handleGerarContrato,
    handleBaixarContrato,
    handleAtualizarStatusZapSign,
    handleEnviarWhatsapp,
    handleReenviarWhatsapp,
  };
}
