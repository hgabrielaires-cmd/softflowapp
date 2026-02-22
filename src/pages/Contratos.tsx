import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { AppLayout } from "@/components/AppLayout";
import { useAuth } from "@/context/AuthContext";
import { Filial } from "@/lib/supabase-types";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  FileText,
  Eye,
  Filter,
  Loader2,
  FileCheck,
  XCircle,
  MoreHorizontal,
  FilePen,
  FileOutput,
  Download,
  CheckCircle2,
  Send,
  FileDown,
  RefreshCw,
  ClipboardCopy,
  ExternalLink,
  MinusCircle
} from "lucide-react";
import { toast } from "sonner";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";

interface ModuloAdicionadoItem {
  modulo_id: string;
  nome: string;
  quantidade: number;
  valor_implantacao_modulo: number;
  valor_mensalidade_modulo: number;
}

interface Contrato {
  id: string;
  numero_exibicao: string;
  numero_registro: number;
  cliente_id: string;
  plano_id: string | null;
  pedido_id: string | null;
  tipo: string;
  status: string;
  contrato_origem_id: string | null;
  created_at: string;
  updated_at: string;
  pdf_url: string | null;
  status_geracao: string | null;
  clientes?: {
    nome_fantasia: string;
    filial_id: string | null;
    razao_social: string | null;
    cnpj_cpf: string;
    inscricao_estadual: string | null;
    cidade: string | null;
    uf: string | null;
    cep: string | null;
    logradouro: string | null;
    numero: string | null;
    complemento: string | null;
    bairro: string | null;
    telefone: string | null;
    email: string | null;
  } | null;
  planos?: { nome: string; descricao: string | null; valor_mensalidade_padrao: number } | null;
  pedidos?: {
    status_pedido: string;
    contrato_liberado: boolean;
    financeiro_status: string;
    valor_implantacao_final: number;
    valor_mensalidade_final: number;
    valor_implantacao_original: number;
    valor_mensalidade_original: number;
    valor_total: number;
    desconto_implantacao_tipo: string;
    desconto_implantacao_valor: number;
    desconto_mensalidade_tipo: string;
    desconto_mensalidade_valor: number;
    modulos_adicionais: ModuloAdicionadoItem[] | null;
    observacoes: string | null;
    pagamento_mensalidade_observacao: string | null;
    pagamento_implantacao_observacao: string | null;
    pagamento_mensalidade_forma: string | null;
    pagamento_mensalidade_parcelas: number | null;
    filial_id: string;
    vendedor_id: string;
    tipo_pedido?: string;
  } | null;
}

interface ZapSignRecord {
  contrato_id: string;
  zapsign_doc_token: string;
  status: string;
  signers: { name: string; email: string; token: string; status: string; sign_url: string; signed_at?: string }[];
  sign_url: string | null;
}

function fmtBRL(v: number) {
  return v.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

export default function Contratos() {
  const { isAdmin, roles, profile } = useAuth();
  const isFinanceiro = roles.includes("financeiro");
  const canManage = isAdmin || isFinanceiro;

  const [contratos, setContratos] = useState<Contrato[]>([]);
  const [filiais, setFiliais] = useState<Filial[]>([]);
  const [filialParametros, setFilialParametros] = useState<Record<string, any>>({});
  const [loading, setLoading] = useState(true);
  const [filterFilial, setFilterFilial] = useState("all");
  const [filterStatus, setFilterStatus] = useState("all");
  const [filterDe, setFilterDe] = useState("");
  const [filterAte, setFilterAte] = useState("");

  const [selected, setSelected] = useState<Contrato | null>(null);
  const [openDetail, setOpenDetail] = useState(false);
  const [openEncerrar, setOpenEncerrar] = useState(false);
  const [processando, setProcessando] = useState(false);
  const [gerando, setGerando] = useState(false);
  const [gerarSignedUrl, setGerarSignedUrl] = useState<string | null>(null);
  const [zapsignRecords, setZapsignRecords] = useState<Record<string, ZapSignRecord>>({});
  const [enviandoZapsign, setEnviandoZapsign] = useState(false);
  const [openZapsignDetail, setOpenZapsignDetail] = useState(false);
  const [zapsignDetailContrato, setZapsignDetailContrato] = useState<Contrato | null>(null);
  const [reenviandoWhatsapp, setReenviandoWhatsapp] = useState(false);
  const [linkedMessageTemplate, setLinkedMessageTemplate] = useState<{ conteudo: string } | null>(null);

  // ── ZapSign + WhatsApp animated popup state ──
  const [openZapsignPopup, setOpenZapsignPopup] = useState(false);
  const [zapsignPopupStep, setZapsignPopupStep] = useState<"gerando" | "zapsign" | "whatsapp" | "done" | "erro">("zapsign");
  const [zapsignPopupMsgIndex, setZapsignPopupMsgIndex] = useState(0);
  const [zapsignPopupContrato, setZapsignPopupContrato] = useState<Contrato | null>(null);
  const [zapsignPopupError, setZapsignPopupError] = useState<string | null>(null);

  const ZAPSIGN_MSGS = [
    "🚀 Rumo à ativação",
    "⚡ O Softflow não para",
    "🏁 Pé no acelerador",
    "📂 Burocracia zero",
    "✨ Quase lá",
  ];

  const WHATSAPP_MSGS = [
    "📲 Conectando ao WhatsApp...",
    "⚡ Softflow em ação!",
    "✅ Quase pronto!",
    "💬 Disparando notificação automática...",
    "🤖 O Flowy robô do Softflow está enviando a mensagem de confirmação para o WhatsApp agora.",
  ];

  const GERAR_MSGS_CONTRATO = [
    "Ajustando os detalhes finais…",
    "Quase lá… deixando tudo redondo pra você!",
    "Montando seu contrato sob medida…",
    "Organizando tudo para assinatura…",
    "Preparando seu Termo de Aceite 💙",
  ];

  const GERAR_MSGS_OA = [
    "Montando sua Ordem de Atendimento…",
    "Ajustando os serviços…",
    "Quase lá… finalizando sua OA!",
    "Organizando tudo pra você 💙",
    "Preparando sua OA sob medida…",
  ];

  // (old gerarStatus effect removed - now unified in zapsignPopup)

  // ZapSign popup message cycling
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

  // Contatos do cliente selecionado (para Termo de Aceite)
  const [contatosCliente, setContatosCliente] = useState<{ nome: string; telefone: string | null; decisor: boolean; ativo: boolean }[]>([]);
  const [enviandoWhatsapp, setEnviandoWhatsapp] = useState(false);

  async function syncZapsignStatuses(pendentes: any[], currentMap: Record<string, ZapSignRecord>) {
    const updatedMap = { ...currentMap };
    for (const zRec of pendentes) {
      try {
        const { data } = await supabase.functions.invoke("zapsign", {
          body: { action: "status", contrato_id: zRec.contrato_id },
        });
        if (data?.success && data.status !== zRec.status) {
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

  async function loadData() {
    setLoading(true);
    const [{ data: contratosData, error: contratosError }, { data: filiaisData }, { data: paramsData }] = await Promise.all([
      supabase
        .from("contratos")
        .select(`
          *,
          clientes(nome_fantasia, filial_id, razao_social, cnpj_cpf, inscricao_estadual, cidade, uf, cep, logradouro, numero, complemento, bairro, telefone, email),
          planos(nome, descricao, valor_mensalidade_padrao),
          pedidos(
            status_pedido, contrato_liberado, financeiro_status,
            valor_implantacao_final, valor_mensalidade_final,
            valor_implantacao_original, valor_mensalidade_original,
            valor_total, desconto_implantacao_tipo, desconto_implantacao_valor,
            desconto_mensalidade_tipo, desconto_mensalidade_valor,
            modulos_adicionais, observacoes,
            pagamento_mensalidade_observacao, pagamento_mensalidade_forma,
            pagamento_mensalidade_parcelas, pagamento_implantacao_observacao,
            filial_id, vendedor_id, tipo_pedido
          )
        `)
        .order("numero_registro", { ascending: false }),
      supabase.from("filiais").select("*").eq("ativa", true).order("nome"),
      supabase.from("filial_parametros").select("*"),
    ]);
    if (contratosError) {
      toast.error("Erro ao carregar contratos: " + contratosError.message);
    }
    setContratos((contratosData || []) as unknown as Contrato[]);
    setFiliais((filiaisData || []) as Filial[]);
    // Indexar parâmetros por filial_id
    const paramsMap: Record<string, any> = {};
    (paramsData || []).forEach((p: any) => { paramsMap[p.filial_id] = p; });
    setFilialParametros(paramsMap);
    setLoading(false);

    // Carregar registros ZapSign
    const { data: zapsignData } = await supabase
      .from("contratos_zapsign")
      .select("*");
    const zMap: Record<string, ZapSignRecord> = {};
    (zapsignData || []).forEach((z: any) => { zMap[z.contrato_id] = z as ZapSignRecord; });
    setZapsignRecords(zMap);

    // Sincronizar status dos contratos pendentes com ZapSign
    const pendentes = (zapsignData || []).filter(
      (z: any) => z.status === "Enviado" || z.status === "Pendente"
    );
    if (pendentes.length > 0) {
      syncZapsignStatuses(pendentes, zMap);
    }
  }

  useEffect(() => {
    loadData();
  }, []);

  async function loadContatosCliente(clienteId: string) {
    const { data } = await supabase
      .from("cliente_contatos")
      .select("nome, telefone, decisor, ativo")
      .eq("cliente_id", clienteId)
      .eq("ativo", true);
    setContatosCliente((data || []) as { nome: string; telefone: string | null; decisor: boolean; ativo: boolean }[]);
  }

  async function handleOpenDetail(contrato: Contrato) {
    setSelected(contrato);
    setOpenDetail(true);
    setLinkedMessageTemplate(null);
    if (contrato.cliente_id) loadContatosCliente(contrato.cliente_id);
    // Load linked message template via document_template based on contract type
    const tipoTemplate = contrato.tipo === "OA" ? "ORDEM_ATENDIMENTO" : "CONTRATO_BASE";
    try {
      const { data: docTemplate } = await supabase
        .from("document_templates")
        .select("message_template_id")
        .eq("tipo", tipoTemplate)
        .eq("ativo", true)
        .not("message_template_id", "is", null)
        .limit(1)
        .maybeSingle();
      if (docTemplate?.message_template_id) {
        const { data: msgTemplate } = await supabase
          .from("message_templates")
          .select("conteudo")
          .eq("id", docTemplate.message_template_id)
          .single();
        if (msgTemplate) setLinkedMessageTemplate(msgTemplate);
      }
    } catch { /* fallback to hardcoded */ }
  }

  const filtered = contratos.filter((c) => {
    if (filterFilial !== "all" && c.clientes?.filial_id !== filterFilial) return false;
    if (filterStatus !== "all" && c.status !== filterStatus) return false;
    if (filterDe && c.created_at < filterDe) return false;
    if (filterAte && c.created_at > filterAte + "T23:59:59") return false;
    return true;
  });

  const ativos = filtered.filter((c) => c.status === "Ativo").length;

  async function handleEncerrar() {
    if (!selected) return;
    setProcessando(true);
    const { error } = await supabase
      .from("contratos")
      .update({ status: "Encerrado" })
      .eq("id", selected.id);
    setProcessando(false);
    if (error) { toast.error("Erro ao encerrar contrato: " + error.message); return; }
    toast.success("Contrato encerrado.");
    setOpenEncerrar(false);
    setOpenDetail(false);
    loadData();
  }

  // ── Gerar Contrato + Auto ZapSign + WhatsApp ─────────────────────────────────
  async function handleGerarContrato(contrato: Contrato) {
    // Carregar contatos do cliente para WhatsApp (buscar direto para usar localmente)
    const { data: contatosFetched } = await supabase
      .from("cliente_contatos")
      .select("nome, telefone, decisor, ativo, email")
      .eq("cliente_id", contrato.cliente_id)
      .eq("ativo", true);
    const contatosLocais = (contatosFetched || []) as { nome: string; telefone: string | null; decisor: boolean; ativo: boolean; email: string | null }[];
    setContatosCliente(contatosLocais);

    // Abrir popup unificada com step "gerando"
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

      // Atualizar estado local
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

      // Atualizar registros locais
      setZapsignRecords((prev) => ({
        ...prev,
        [contrato.id]: {
          contrato_id: contrato.id,
          zapsign_doc_token: zData.doc_token,
          status: "Enviado",
          signers: zData.signers || [],
          sign_url: zData.signers?.[0]?.sign_url || null,
        },
      }));

      // PASSO 3: Auto enviar WhatsApp
      setZapsignPopupStep("whatsapp");
      setZapsignPopupMsgIndex(0);

      try {
        // Carregar linked message template
        const docTemplateType = contrato.tipo === "OA" ? "OA" : contrato.tipo === "Termo Aditivo" ? "ADITIVO" : "CONTRATO_BASE";
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
        const mensagem = gerarTermoAceite(updatedContrato, signUrl);

        // Buscar config WhatsApp
        const { data: config } = await supabase
          .from("integracoes_config")
          .select("server_url, token, ativo")
          .eq("nome", "whatsapp")
          .single();

        if (!config?.ativo || !config?.server_url || !config?.token) {
          setZapsignPopupStep("done");
          setEnviandoZapsign(false);
          toast.info("ZapSign enviado! WhatsApp não está configurado.");
          return;
        }

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
            server_url: config.server_url,
            api_key: config.token,
            number: decisorContato.telefone,
            text: mensagem,
          },
        });

        if (whatsError) throw whatsError;

        setZapsignPopupStep("done");
      } catch (whatsErr: any) {
        console.error("Erro WhatsApp:", whatsErr);
        setZapsignPopupStep("done");
        toast.warning("ZapSign enviado! Falha ao enviar WhatsApp: " + (whatsErr.message || ""));
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

  // ── Baixar Contrato (gera nova signed URL) ─────────────────────────────────
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
      // Fetch as blob to force download (cross-origin URLs ignore the download attribute)
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

  // (handleEnviarZapSign removed - now integrated into handleGerarContrato)

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

  function getZapSignStatusBadge(status: string | undefined) {
    if (!status) return null;
    if (status === "Assinado")
      return (
        <Badge className="bg-emerald-100 text-emerald-700 border-emerald-200 hover:bg-emerald-100 text-xs flex items-center gap-1 w-fit">
          <CheckCircle2 className="h-3 w-3" />
          Assinado
        </Badge>
      );
    if (status === "Recusado")
      return (
        <Badge className="bg-red-100 text-red-700 border-red-200 hover:bg-red-100 text-xs flex items-center gap-1 w-fit">
          <XCircle className="h-3 w-3" />
          Recusado
        </Badge>
      );
    if (status === "Enviado" || status === "Pendente")
      return (
        <div className="flex flex-col gap-0.5 w-fit">
          <Badge className="bg-amber-100 text-amber-700 border-amber-200 hover:bg-amber-100 text-xs flex items-center gap-1 w-fit">
            <Send className="h-3 w-3" />
            Enviado
          </Badge>
          <span className="text-[10px] text-amber-600 text-center w-full">Aguardando assinatura</span>
        </div>
      );
    return <Badge variant="secondary" className="text-xs w-fit">{status}</Badge>;
  }

  function getStatusBadge(status: string) {
    if (status === "Ativo")
      return (
        <Badge className="bg-emerald-100 text-emerald-700 border-emerald-200 hover:bg-emerald-100 dark:bg-emerald-900/30 dark:text-emerald-400 text-xs flex items-center gap-1 w-fit">
          <CheckCircle2 className="h-3 w-3" />
          Ativo
        </Badge>
      );
    return (
      <Badge variant="secondary" className="text-xs flex items-center gap-1 w-fit">
        <MinusCircle className="h-3 w-3" />
        Encerrado
      </Badge>
    );
  }

  function getStatusGeracaoBadge(statusGeracao: string | null) {
    if (statusGeracao === "Gerado")
      return (
        <Badge className="bg-blue-100 text-blue-700 border-blue-200 hover:bg-blue-100 text-xs flex items-center gap-1 w-fit">
          <CheckCircle2 className="h-3 w-3" />
          Gerado
        </Badge>
      );
    return (
      <Badge variant="secondary" className="text-xs w-fit">
        Pendente
      </Badge>
    );
  }

  function getTipoBadge(tipo: string) {
    if (tipo === "Base")
      return (
        <Badge className="bg-primary/10 text-primary border-primary/20 hover:bg-primary/10 text-xs flex items-center gap-1 w-fit">
          Base
        </Badge>
      );
    if (tipo === "Upgrade")
      return (
        <Badge className="bg-violet-100 text-violet-700 border-violet-200 hover:bg-violet-100 dark:bg-violet-900/30 dark:text-violet-400 text-xs flex items-center gap-1 w-fit">
          Upgrade
        </Badge>
      );
    if (tipo === "Aditivo")
      return (
        <Badge className="bg-indigo-100 text-indigo-700 border-indigo-200 hover:bg-indigo-100 dark:bg-indigo-900/30 dark:text-indigo-400 text-xs flex items-center gap-1 w-fit">
          <FilePen className="h-3 w-3" /> Aditivo
        </Badge>
      );
    if (tipo === "OA")
      return (
        <Badge className="bg-teal-100 text-teal-700 border-teal-200 hover:bg-teal-100 dark:bg-teal-900/30 dark:text-teal-400 text-xs flex items-center gap-1 w-fit">
          <FileOutput className="h-3 w-3" /> OA
        </Badge>
      );
    if (tipo === "Downgrade")
      return (
        <Badge className="bg-amber-100 text-amber-700 border-amber-200 hover:bg-amber-100 dark:bg-amber-900/30 dark:text-amber-400 text-xs flex items-center gap-1 w-fit">
          Downgrade
        </Badge>
      );
    return <Badge variant="outline" className="text-xs w-fit">{tipo}</Badge>;
  }

  function getPedidoStatusBadges(contrato: Contrato) {
    if (!contrato.pedidos) return <span className="text-xs text-muted-foreground">—</span>;
    return (
      <div className="flex flex-col gap-1">
        {contrato.pedidos.financeiro_status === "Aprovado" && (
          <Badge className="bg-emerald-100 text-emerald-700 border-emerald-200 hover:bg-emerald-100 text-xs flex items-center gap-1 w-fit">
            <CheckCircle2 className="h-3 w-3" />
            Aprovado
          </Badge>
        )}
        {contrato.pedidos.contrato_liberado && (
          <Badge className="bg-blue-100 text-blue-700 border-blue-200 hover:bg-blue-100 text-xs flex items-center gap-1 w-fit">
            <CheckCircle2 className="h-3 w-3" />
            Liberado
          </Badge>
        )}
      </div>
    );
  }

  // ── Enviar WhatsApp via Evolution API (teste) ──
  async function handleEnviarWhatsapp(mensagem: string) {
    const decisor = contatosCliente.find(c => c.decisor) || contatosCliente[0];
    if (!decisor?.telefone) {
      toast.error("Decisor não possui telefone cadastrado");
      return;
    }

    setEnviandoWhatsapp(true);
    try {
      // Buscar config da integração WhatsApp
      const { data: config } = await supabase
        .from("integracoes_config")
        .select("server_url, token, ativo")
        .eq("nome", "whatsapp")
        .single();

      if (!config?.ativo || !config?.server_url || !config?.token) {
        toast.error("Integração WhatsApp não está configurada ou ativa");
        setEnviandoWhatsapp(false);
        return;
      }

      const { data, error } = await supabase.functions.invoke("evolution-api", {
        body: {
          action: "send_text",
          server_url: config.server_url,
          api_key: config.token,
          number: decisor.telefone,
          text: mensagem,
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

  // ── Reenviar WhatsApp (para casos de falha no envio automático) ──
  async function handleReenviarWhatsapp(contrato: Contrato) {
    setReenviandoWhatsapp(true);
    try {
      // Carregar contatos do cliente
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

      // Buscar sign_url do ZapSign
      const zRec = zapsignRecords[contrato.id];
      const signUrl = zRec?.signers?.[0]?.sign_url || "";

      const mensagem = gerarTermoAceite(contrato, signUrl);

      // Buscar config WhatsApp
      const { data: config } = await supabase
        .from("integracoes_config")
        .select("server_url, token, ativo")
        .eq("nome", "whatsapp")
        .single();

      if (!config?.ativo || !config?.server_url || !config?.token) {
        toast.error("Integração WhatsApp não está configurada ou ativa");
        setReenviandoWhatsapp(false);
        return;
      }

      const { error } = await supabase.functions.invoke("evolution-api", {
        body: {
          action: "send_text",
          server_url: config.server_url,
          api_key: config.token,
          number: decisor.telefone,
          text: mensagem,
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

  // ── Gerador de Termo de Aceite ──────────────────────────────────────────────
  function gerarTermoAceite(contrato: Contrato, linkAssinatura?: string): string {
    const pedido = contrato.pedidos;
    const plano = contrato.planos;
    const nomeUsuario = profile?.full_name || "{nome_usuario}";
    const nomeFantasia = contrato.clientes?.nome_fantasia || "{nome_fantasia}";
    const razaoSocial = contrato.clientes?.razao_social || "{razao_social}";
    const nomePlano = plano?.nome || "{plano}";
    const descricaoPlano = plano?.descricao || "";
    const modulosTexto = descricaoPlano
      ? descricaoPlano.split(",").map((m: string) => `• ${m.trim()}`).join("\n")
      : "";
    const valorMensBase = fmtBRL(plano?.valor_mensalidade_padrao ?? 0);
    const adicionais = (pedido?.modulos_adicionais || []) as ModuloAdicionadoItem[];
    const totalAdicionais = adicionais.reduce((s, m) => s + m.valor_mensalidade_modulo * m.quantidade, 0);
    const adicionaisTexto = adicionais.length > 0
      ? adicionais.map(m => `✔️ ${m.nome} (${m.quantidade}x ${fmtBRL(m.valor_mensalidade_modulo)}) - ${fmtBRL(m.valor_mensalidade_modulo * m.quantidade)}`).join("\n")
      : "";

    const impFinal = pedido?.valor_implantacao_final ?? 0;
    const mensFinal = pedido?.valor_mensalidade_final ?? 0;

    // Parâmetros da filial do pedido
    const filialId = pedido?.filial_id || "";
    const params = filialParametros[filialId] || {};
    const regrasMens = pedido?.pagamento_mensalidade_observacao || params.regras_padrao_mensalidade || "";
    const regrasImpl = pedido?.pagamento_implantacao_observacao || params.regras_padrao_implantacao || "";
    const parcelasCartao = params.parcelas_maximas_cartao;
    const pixDesconto = params.pix_desconto_percentual;

    // Nome do decisor
    const decisor = contatosCliente.find(c => c.decisor) || contatosCliente[0];
    const nomeDecisor = decisor?.nome || "{nome_decisor}";

    // Se há template vinculado, usa ele com substituição de variáveis
    if (linkedMessageTemplate) {
      const formasPagamento = parcelasCartao || pixDesconto > 0
        ? `Formas disponíveis:${parcelasCartao ? `\n- Até ${parcelasCartao}x no cartão sem juros` : ""}${pixDesconto > 0 ? `\n- PIX ${pixDesconto}% desconto` : ""}`
        : "";
      const adicionaisBlock = adicionais.length > 0
        ? `🔘 *ADICIONAIS*\n\n${adicionaisTexto}\n\nTotal adicionais: ${fmtBRL(totalAdicionais)}`
        : "";

      return linkedMessageTemplate.conteudo
        .replace(/\{contato\.nome\}/g, nomeDecisor)
        .replace(/\{cliente\.nome_fantasia\}/g, nomeFantasia)
        .replace(/\{cliente\.razao_social\}/g, razaoSocial)
        .replace(/\{contrato\.numero\}/g, contrato.numero_exibicao)
        .replace(/\{plano\.nome\}/g, nomePlano)
        .replace(/\{plano\.modulos\}/g, modulosTexto)
        .replace(/\{plano\.valor_base\}/g, valorMensBase)
        .replace(/\{modulos\.adicionais\}/g, adicionaisBlock)
        .replace(/\{valores\.implantacao\}/g, fmtBRL(impFinal))
        .replace(/\{valores\.mensalidade\}/g, fmtBRL(mensFinal))
        .replace(/\{regras\.mensalidade\}/g, regrasMens)
        .replace(/\{regras\.implantacao\}/g, regrasImpl)
        .replace(/\{formas\.pagamento\}/g, formasPagamento)
        .replace(/\{link_assinatura\}/g, linkAssinatura || "{link_assinatura}")
        .replace(/\{empresa\.nome\}/g, "Softplus Tecnologia")
        .replace(/\{vendedor\.nome\}/g, nomeUsuario)
        .replace(/\{usuario\.nome\}/g, nomeUsuario);
    }

    // Fallback hardcoded
    return `Olá ${nomeDecisor}, bom dia!

Tudo bem?

Me chamo *${nomeUsuario}*, sou do financeiro da Softplus Tecnologia. 

Primeiro queria agradecer por ter escolhido nosso sistema para auxiliar nos processos da *${nomeFantasia}*. 

Saiba que vamos nos empenhar ao máximo para que tudo corra como o esperado. ☺️💙

Passando para alinhar o que ficou acertado com nossa equipe:

☑️ *Módulos Contratados*

Plano ${nomePlano}${modulosTexto ? "\n" + modulosTexto : ""}

Valor base do plano: ${valorMensBase}${adicionais.length > 0 ? `\n\n🔘 *ADICIONAIS*\n\n${adicionaisTexto}\n\nTotal adicionais: ${fmtBRL(totalAdicionais)}` : ""}

*MENSALIDADE TOTAL*

*${fmtBRL(mensFinal)}*

Valor pré-pago.${regrasMens ? "\n" + regrasMens : ""}

*IMPLANTAÇÃO E TREINAMENTO*

*${fmtBRL(impFinal)}*${regrasImpl ? "\n" + regrasImpl : ""}${parcelasCartao || pixDesconto > 0 ? `\n\nFormas disponíveis:${parcelasCartao ? `\n- Até ${parcelasCartao}x no cartão sem juros` : ""}${pixDesconto > 0 ? `\n- PIX ${pixDesconto}% desconto` : ""}` : ""}

✍️ *TERMO DE ACEITE:*

${linkAssinatura || "{link_assinatura}"}

Implantação confirmada para:

{datas_implantacao}

Os boletos referentes à implantação e primeira mensalidade foram enviados por e-mail.

Caso prefira, posso encaminhar novamente.

Estou à disposição.`;
  }

  return (
    <AppLayout>
      <div className="space-y-5">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-foreground">Contratos</h1>
            <p className="text-sm text-muted-foreground">Gestão e visualização de contratos ativos</p>
          </div>
          <div className="flex items-center gap-2 bg-emerald-50 border border-emerald-200 rounded-lg px-3 py-1.5">
            <FileCheck className="h-4 w-4 text-emerald-600" />
            <span className="text-sm font-semibold text-emerald-700">
              {ativos} ativo{ativos !== 1 ? "s" : ""}
            </span>
          </div>
        </div>

        {/* Filters */}
        <div className="bg-card border border-border rounded-xl p-4 space-y-3">
          <div className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
            <Filter className="h-4 w-4" /> Filtros
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-4 gap-3">
            <Select value={filterFilial} onValueChange={setFilterFilial}>
              <SelectTrigger>
                <SelectValue placeholder="Todas as filiais" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todas as filiais</SelectItem>
                {filiais.map((f) => (
                  <SelectItem key={f.id} value={f.id}>
                    {f.nome}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select value={filterStatus} onValueChange={setFilterStatus}>
              <SelectTrigger>
                <SelectValue placeholder="Todos os status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos os status</SelectItem>
                <SelectItem value="Ativo">Ativo</SelectItem>
                <SelectItem value="Encerrado">Encerrado</SelectItem>
              </SelectContent>
            </Select>
            <Input
              type="date"
              value={filterDe}
              onChange={(e) => setFilterDe(e.target.value)}
              title="Data inicial"
            />
            <Input
              type="date"
              value={filterAte}
              onChange={(e) => setFilterAte(e.target.value)}
              title="Data final"
            />
          </div>
        </div>

        {/* Table */}
        <div className="bg-card rounded-xl border border-border shadow-card overflow-hidden">
          <Table>
            <TableHeader>
              <TableRow className="bg-muted/50">
                <TableHead>Nº Contrato</TableHead>
                <TableHead>Cliente</TableHead>
                <TableHead>Plano</TableHead>
                <TableHead>Tipo</TableHead>
                <TableHead>Contrato</TableHead>
                <TableHead>Pedido</TableHead>
                <TableHead>Doc.</TableHead>
                <TableHead>Assinatura</TableHead>
                <TableHead>Data</TableHead>
                <TableHead className="text-right">Ações</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading ? (
                <TableRow>
                  <TableCell colSpan={10} className="text-center py-12">
                    <Loader2 className="h-6 w-6 animate-spin mx-auto text-muted-foreground" />
                  </TableCell>
                </TableRow>
              ) : filtered.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={10} className="text-center py-16 text-muted-foreground">
                    <FileText className="h-8 w-8 mx-auto mb-2 opacity-30" />
                    Nenhum contrato encontrado
                  </TableCell>
                </TableRow>
              ) : (
                filtered.map((contrato) => (
                  <TableRow key={contrato.id}>
                    <TableCell className="font-mono font-semibold text-sm">
                      {contrato.numero_exibicao || `#${contrato.numero_registro}`}
                    </TableCell>
                    <TableCell className="font-medium">
                      {contrato.clientes?.nome_fantasia || "—"}
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground">
                      {contrato.planos?.nome || "—"}
                    </TableCell>
                    <TableCell>
                      <div className="flex flex-col gap-0.5">
                        {getTipoBadge(contrato.tipo)}
                        {contrato.tipo === "Aditivo" && contrato.pedidos?.tipo_pedido && (
                          <span className="text-[10px] text-muted-foreground pl-0.5">
                            {contrato.pedidos.tipo_pedido === "Upgrade" ? "↑ Upgrade" : contrato.pedidos.tipo_pedido === "Aditivo" ? "＋ Módulos Adicionais" : ""}
                          </span>
                        )}
                      </div>
                    </TableCell>
                    <TableCell>{getStatusBadge(contrato.status)}</TableCell>
                    <TableCell>{getPedidoStatusBadges(contrato)}</TableCell>
                    <TableCell>{getStatusGeracaoBadge(contrato.status_geracao)}</TableCell>
                    <TableCell>{getZapSignStatusBadge(zapsignRecords[contrato.id]?.status)}</TableCell>
                    <TableCell className="text-sm text-muted-foreground">
                      {format(new Date(contrato.created_at), "dd/MM/yyyy", { locale: ptBR })}
                    </TableCell>
                    <TableCell className="text-right">
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="icon" className="h-7 w-7">
                            <MoreHorizontal className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end" className="w-48 bg-card border border-border shadow-lg z-50">
                          <DropdownMenuItem
                            className="cursor-pointer"
                            onClick={() => handleOpenDetail(contrato)}
                          >
                            <Eye className="h-4 w-4 mr-2" />
                            Visualizar
                          </DropdownMenuItem>
                          <DropdownMenuItem
                            className="cursor-pointer"
                            onClick={() => handleGerarContrato(contrato)}
                            disabled={gerando}
                          >
                            {gerando ? (
                              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                            ) : (
                              <FileOutput className="h-4 w-4 mr-2" />
                            )}
                            {contrato.tipo === "OA"
                              ? (contrato.status_geracao === "Gerado" ? "Regerar OA" : "Gerar OA")
                              : (contrato.status_geracao === "Gerado" ? "Regerar Contrato" : "Gerar Contrato")}
                          </DropdownMenuItem>
                          {contrato.status_geracao === "Gerado" && contrato.pdf_url && (
                            <DropdownMenuItem
                              className="cursor-pointer"
                              onClick={() => handleBaixarContrato(contrato)}
                              disabled={gerando}
                            >
                              <Download className="h-4 w-4 mr-2" />
                              {contrato.tipo === "OA" ? "Baixar OA" : "Baixar Contrato"}
                            </DropdownMenuItem>
                          )}
                          {canManage && zapsignRecords[contrato.id] && (
                            <>
                              <DropdownMenuSeparator />
                              <DropdownMenuItem
                                className="cursor-pointer"
                                onClick={() => {
                                  setZapsignDetailContrato(contrato);
                                  setOpenZapsignDetail(true);
                                }}
                              >
                                <ExternalLink className="h-4 w-4 mr-2" />
                                Ver ZapSign
                              </DropdownMenuItem>
                              <DropdownMenuItem
                                className="cursor-pointer"
                                onClick={() => handleAtualizarStatusZapSign(contrato.id)}
                              >
                                <RefreshCw className="h-4 w-4 mr-2" />
                                Atualizar Status
                              </DropdownMenuItem>
                            </>
                          )}
                          {canManage && (
                            <DropdownMenuItem
                              className="cursor-pointer"
                              onClick={() => toast.info("Edição de contrato em desenvolvimento.")}
                            >
                              <FilePen className="h-4 w-4 mr-2" />
                              Editar
                            </DropdownMenuItem>
                          )}
                          {canManage && contrato.status === "Ativo" && (
                            <>
                              <DropdownMenuSeparator />
                              <DropdownMenuItem
                                className="cursor-pointer text-destructive focus:text-destructive"
                                onClick={() => { setSelected(contrato); setOpenEncerrar(true); }}
                              >
                                <XCircle className="h-4 w-4 mr-2" />
                                Cancelar Contrato
                              </DropdownMenuItem>
                            </>
                          )}
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>
      </div>

      {/* Detail Dialog */}
      {selected && (
        <Dialog open={openDetail} onOpenChange={setOpenDetail}>
          <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto" aria-describedby="contrato-desc">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <FileCheck className="h-5 w-5 text-emerald-600" />
                Contrato {selected.numero_exibicao || `#${selected.numero_registro}`}
              </DialogTitle>
              <DialogDescription id="contrato-desc">
                Detalhes completos do contrato selecionado.
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-5 text-sm">
              {/* Dados básicos */}
              <div className="grid grid-cols-2 gap-x-4 gap-y-3">
                <div>
                  <p className="text-muted-foreground text-xs">Número</p>
                  <p className="font-mono font-semibold">
                    {selected.numero_exibicao || `#${selected.numero_registro}`}
                  </p>
                </div>
                <div>
                  <p className="text-muted-foreground text-xs">Status</p>
                  {getStatusBadge(selected.status)}
                </div>
                <div>
                  <p className="text-muted-foreground text-xs">Cliente</p>
                  <p className="font-semibold">{selected.clientes?.nome_fantasia || "—"}</p>
                </div>
                <div>
                  <p className="text-muted-foreground text-xs">Plano</p>
                  <p className="font-semibold">{selected.planos?.nome || "—"}</p>
                </div>
                <div>
                  <p className="text-muted-foreground text-xs">Tipo</p>
                  {getTipoBadge(selected.tipo)}
                </div>
                <div>
                  <p className="text-muted-foreground text-xs">Data de criação</p>
                  <p>
                    {format(new Date(selected.created_at), "dd/MM/yyyy HH:mm", { locale: ptBR })}
                  </p>
                </div>
              </div>

              {/* Dados do pedido vinculado */}
              {selected.pedidos && (() => {
                const p = selected.pedidos!;
                const adicionais = (p.modulos_adicionais || []) as ModuloAdicionadoItem[];
                const hasDescImp = p.desconto_implantacao_valor > 0;
                const hasDescMens = p.desconto_mensalidade_valor > 0;

                return (
                  <div className="border-t border-border pt-4 space-y-4">
                    <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Valores do Pedido</p>

                    {/* Valores */}
                    <div className="grid grid-cols-2 gap-3">
                      <div className="rounded-lg bg-muted/40 p-3 space-y-0.5">
                        <p className="text-xs text-muted-foreground">Implantação</p>
                        {hasDescImp && (
                          <p className="text-xs line-through text-muted-foreground">{fmtBRL(p.valor_implantacao_original)}</p>
                        )}
                        <p className="font-semibold text-foreground">{fmtBRL(p.valor_implantacao_final)}</p>
                        {hasDescImp && (
                          <p className="text-xs text-emerald-600">
                            Desconto: {p.desconto_implantacao_tipo === "%" ? `${p.desconto_implantacao_valor}%` : fmtBRL(p.desconto_implantacao_valor)}
                          </p>
                        )}
                      </div>
                      <div className="rounded-lg bg-muted/40 p-3 space-y-0.5">
                        <p className="text-xs text-muted-foreground">Mensalidade</p>
                        {hasDescMens && (
                          <p className="text-xs line-through text-muted-foreground">{fmtBRL(p.valor_mensalidade_original)}</p>
                        )}
                        <p className="font-semibold text-foreground">{fmtBRL(p.valor_mensalidade_final)}</p>
                        {hasDescMens && (
                          <p className="text-xs text-emerald-600">
                            Desconto: {p.desconto_mensalidade_tipo === "%" ? `${p.desconto_mensalidade_valor}%` : fmtBRL(p.desconto_mensalidade_valor)}
                          </p>
                        )}
                      </div>
                    </div>

                    <div className="rounded-lg border border-border bg-muted/20 p-3 flex items-center justify-between">
                      <span className="text-xs text-muted-foreground font-medium">Valor Total</span>
                      <span className="font-bold text-foreground">{fmtBRL(p.valor_total)}</span>
                    </div>

                    {/* Módulos adicionais */}
                    {adicionais.length > 0 && (
                      <div className="space-y-2">
                        <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Módulos Adicionais</p>
                        <div className="rounded-lg border border-border divide-y divide-border">
                          {adicionais.map((m, i) => (
                            <div key={i} className="flex items-center justify-between px-3 py-2 text-xs">
                              <span className="text-foreground">{m.nome} <span className="text-muted-foreground">× {m.quantidade}</span></span>
                              <span className="font-medium">{fmtBRL(m.valor_mensalidade_modulo * m.quantidade)}/mês</span>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Observações */}
                    {p.observacoes && (
                      <div className="space-y-1">
                        <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Observações</p>
                        <p className="text-xs text-foreground bg-muted/40 rounded-lg p-3">{p.observacoes}</p>
                      </div>
                    )}

                    {/* Status do pedido */}
                    <div className="flex flex-wrap gap-1.5">
                      {p.financeiro_status === "Aprovado" && (
                        <Badge className="bg-emerald-100 text-emerald-700 border-emerald-200 hover:bg-emerald-100 text-xs">
                          ✓ Aprovado Financeiro
                        </Badge>
                      )}
                      {p.contrato_liberado ? (
                        <Badge className="bg-blue-100 text-blue-700 border-blue-200 hover:bg-blue-100 text-xs">
                          Contrato Liberado
                        </Badge>
                      ) : (
                        <Badge variant="secondary" className="text-xs">
                          Contrato Pendente
                        </Badge>
                      )}
                    </div>
                  </div>
                );
              })()}

              {/* Mensagem — Termo de Aceite / OA — apenas admin/financeiro */}
              {canManage && selected.pedidos && (() => {
                const zRec = zapsignRecords[selected.id];
                const linkAssinatura = zRec?.signers?.[1]?.sign_url || zRec?.signers?.[0]?.sign_url || undefined;
                const mensagem = gerarTermoAceite(selected, linkAssinatura);
                const isOA = selected.tipo === "OA";
                const msgLabel = isOA ? "Mensagem — Ordem de Atendimento" : "Mensagem — Termo de Aceite";
                return (
                  <div className="border-t border-border pt-4 space-y-2">
                    <div className="flex items-center justify-between">
                      <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">{msgLabel}</p>
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        className="h-6 px-2 text-xs gap-1"
                        onClick={() => {
                          navigator.clipboard.writeText(mensagem);
                          toast.success("Mensagem copiada!");
                        }}
                      >
                        📋 Copiar
                      </Button>
                    </div>
                    <div className="rounded-lg border border-border bg-muted/40 p-3 max-h-64 overflow-y-auto">
                      <pre className="text-xs whitespace-pre-wrap font-sans text-foreground leading-relaxed">{mensagem}</pre>
                    </div>
                    {!linkAssinatura && (
                      <p className="text-xs text-muted-foreground">
                        💡 Envie o contrato para assinatura eletrônica para preencher automaticamente o <code className="bg-muted px-1 rounded">{"{link_assinatura}"}</code>. Substitua <code className="bg-muted px-1 rounded">{"{datas_implantacao}"}</code> antes de enviar.
                      </p>
                    )}
                    {linkAssinatura && (
                      <p className="text-xs text-muted-foreground">
                        ✅ Link de assinatura preenchido automaticamente. Substitua <code className="bg-muted px-1 rounded">{"{datas_implantacao}"}</code> antes de enviar.
                      </p>
                    )}
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      className="w-full gap-2 mt-2"
                      disabled={enviandoWhatsapp}
                      onClick={() => handleEnviarWhatsapp(mensagem)}
                    >
                      {enviandoWhatsapp ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
                      {enviandoWhatsapp ? "Enviando..." : "Enviar WhatsApp"}
                    </Button>
                  </div>
                );
              })()}

              {/* Ações de Contrato */}
              <div className="border-t border-border pt-4 space-y-3">
                <div className="flex items-center justify-between">
                  <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">{selected.tipo === "OA" ? "Documento da OA" : "Documento do Contrato"}</p>
                  {getStatusGeracaoBadge(selected.status_geracao)}
                </div>

                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    className="flex-1"
                    onClick={() => handleGerarContrato(selected)}
                    disabled={gerando}
                  >
                    {gerando ? (
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    ) : (
                      <FileOutput className="h-4 w-4 mr-2" />
                    )}
                    {selected.tipo === "OA"
                      ? (selected.status_geracao === "Gerado" ? "Regerar OA" : "Gerar OA")
                      : (selected.status_geracao === "Gerado" ? "Regerar Contrato" : "Gerar Contrato")}
                  </Button>

                  {selected.status_geracao === "Gerado" && selected.pdf_url && (
                    <Button
                      variant="default"
                      className="flex-1"
                      onClick={() => handleBaixarContrato(selected)}
                      disabled={gerando}
                    >
                      {gerando ? (
                        <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      ) : (
                        <Download className="h-4 w-4 mr-2" />
                      )}
                      {selected.tipo === "OA" ? "Baixar OA" : "Baixar Contrato"}
                    </Button>
                  )}
                </div>

                {selected.status_geracao === "Gerado" && (
                  <p className="text-xs text-muted-foreground">
                    💡 {selected.tipo === "OA" ? "OA gerada" : "Contrato gerado"} em PDF e pronto para download.
                  </p>
                )}
              </div>

              {/* Cancelar */}
              {canManage && selected.status === "Ativo" && (
                <div className="flex gap-2 pt-2 border-t border-border">
                  <Button
                    variant="destructive"
                    className="flex-1"
                    onClick={() => { setOpenDetail(false); setOpenEncerrar(true); }}
                  >
                    <XCircle className="h-4 w-4 mr-2" />
                    Cancelar Contrato
                  </Button>
                </div>
              )}
            </div>
          </DialogContent>
        </Dialog>
      )}

      {/* Encerrar AlertDialog */}
      <AlertDialog open={openEncerrar} onOpenChange={setOpenEncerrar}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Cancelar contrato?</AlertDialogTitle>
            <AlertDialogDescription>
              Esta ação cancelará o contrato{" "}
              <strong>{selected?.numero_exibicao}</strong> do cliente{" "}
              <strong>{selected?.clientes?.nome_fantasia}</strong>. Esta ação não pode
              ser desfeita.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Voltar</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              onClick={handleEncerrar}
              disabled={processando}
            >
              {processando ? (
                <Loader2 className="h-4 w-4 animate-spin mr-2" />
              ) : null}
              Confirmar Cancelamento
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* (Old generation popup removed - now unified in ZapSign popup below) */}

      {/* ZapSign Detail Dialog */}
      {zapsignDetailContrato && zapsignRecords[zapsignDetailContrato.id] && (
        <Dialog open={openZapsignDetail} onOpenChange={setOpenZapsignDetail}>
          <DialogContent className="max-w-md" aria-describedby="zapsign-desc">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2 text-base">
                <Send className="h-5 w-5 text-primary" />
                ZapSign — {zapsignDetailContrato.numero_exibicao}
              </DialogTitle>
              <DialogDescription id="zapsign-desc" className="sr-only">
                Detalhes da assinatura no ZapSign
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">Status</span>
                {getZapSignStatusBadge(zapsignRecords[zapsignDetailContrato.id].status)}
              </div>

              <div className="space-y-2">
                <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Signatários</p>
                {zapsignRecords[zapsignDetailContrato.id].signers.map((signer, i) => (
                  <div key={i} className="rounded-lg border border-border p-3 space-y-1">
                    <span className="text-sm font-medium">{signer.name}</span>
                    {signer.email && <p className="text-xs text-muted-foreground">{signer.email}</p>}
                    {signer.sign_url && (
                      <div className="flex gap-1 pt-1">
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-6 px-2 text-xs gap-1"
                          onClick={() => {
                            navigator.clipboard.writeText(signer.sign_url);
                            toast.success("Link copiado!");
                          }}
                        >
                          <ClipboardCopy className="h-3 w-3" />
                          Copiar Link
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-6 px-2 text-xs gap-1"
                          onClick={() => window.open(signer.sign_url, "_blank")}
                        >
                          <ExternalLink className="h-3 w-3" />
                          Abrir
                        </Button>
                      </div>
                    )}
                    <div className="pt-1">
                      {(() => {
                        const s = signer.status?.toLowerCase();
                        if (s === "signed")
                          return <Badge className="bg-emerald-100 text-emerald-700 border-emerald-200 hover:bg-emerald-100 text-xs">Assinado</Badge>;
                        if (s === "refused" || s === "canceled")
                          return <Badge className="bg-red-100 text-red-700 border-red-200 hover:bg-red-100 text-xs">Recusado</Badge>;
                        return <Badge className="bg-amber-100 text-amber-700 border-amber-200 hover:bg-amber-100 text-xs">Aguardando assinatura</Badge>;
                      })()}
                    </div>
                  </div>
                ))}
              </div>

              <div className="flex gap-2 pt-2">
                <Button
                  variant="outline"
                  className="flex-1 gap-1"
                  onClick={() => handleAtualizarStatusZapSign(zapsignDetailContrato.id)}
                >
                  <RefreshCw className="h-4 w-4" />
                  Atualizar Status
                </Button>
                <Button
                  variant="outline"
                  className="flex-1 gap-1"
                  disabled={reenviandoWhatsapp}
                  onClick={() => handleReenviarWhatsapp(zapsignDetailContrato)}
                >
                  {reenviandoWhatsapp ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
                  Reenviar WhatsApp
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      )}

      {/* ── Popup ZapSign + WhatsApp Animada ──────────────────────────── */}
      <Dialog
        open={openZapsignPopup}
        onOpenChange={(open) => {
          if (zapsignPopupStep === "done" || zapsignPopupStep === "erro") setOpenZapsignPopup(open);
        }}
      >
        <DialogContent className="max-w-sm" aria-describedby="zapsign-popup-desc" onPointerDownOutside={(e) => {
          if (zapsignPopupStep !== "done" && zapsignPopupStep !== "erro") e.preventDefault();
        }} onEscapeKeyDown={(e) => {
          if (zapsignPopupStep !== "done" && zapsignPopupStep !== "erro") e.preventDefault();
        }}>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-base">
              {zapsignPopupStep === "gerando" ? (
                <FileOutput className="h-5 w-5 text-primary" />
              ) : (
                <Send className="h-5 w-5 text-primary" />
              )}
              {zapsignPopupStep === "gerando"
                ? (zapsignPopupContrato?.tipo === "OA" ? "Gerando OA" : "Gerando Contrato")
                : zapsignPopupStep === "whatsapp" ? "Enviando WhatsApp"
                : zapsignPopupStep === "done" ? "Tudo pronto!"
                : zapsignPopupStep === "erro" ? "Erro"
                : "Enviando para ZapSign"}
            </DialogTitle>
            <DialogDescription id="zapsign-popup-desc" className="sr-only">
              Progresso da geração, envio para assinatura e notificação
            </DialogDescription>
          </DialogHeader>

          <div className="py-6 flex flex-col items-center gap-5">
            {/* Passo 0: Gerando PDF */}
            {zapsignPopupStep === "gerando" && (
              <div className="flex flex-col items-center gap-4 animate-fade-in">
                <div className="relative flex items-center justify-center">
                  <span className="absolute inline-flex h-20 w-20 rounded-full bg-primary/10 animate-ping" />
                  <span className="absolute inline-flex h-14 w-14 rounded-full bg-primary/20 animate-ping [animation-delay:0.3s]" />
                  <div className="relative flex items-center justify-center h-16 w-16 rounded-full bg-primary/15 border-2 border-primary/30">
                    <Loader2 className="h-7 w-7 text-primary animate-spin" />
                  </div>
                </div>
                <div className="text-center space-y-1">
                  <p className="font-semibold text-foreground">
                    {zapsignPopupContrato?.tipo === "OA" ? "Gerando OA…" : "Gerando contrato…"}
                  </p>
                  <p className="text-sm text-muted-foreground transition-all duration-500 min-h-[1.5rem]">
                    {(zapsignPopupContrato?.tipo === "OA" ? GERAR_MSGS_OA : GERAR_MSGS_CONTRATO)[zapsignPopupMsgIndex]}
                  </p>
                </div>
              </div>
            )}

            {/* Passo 1: ZapSign */}
            {zapsignPopupStep === "zapsign" && (
              <div className="flex flex-col items-center gap-4 animate-fade-in">
                <div className="relative flex items-center justify-center">
                  <span className="absolute inline-flex h-20 w-20 rounded-full bg-primary/10 animate-ping" />
                  <span className="absolute inline-flex h-14 w-14 rounded-full bg-primary/20 animate-ping [animation-delay:0.3s]" />
                  <div className="relative flex items-center justify-center h-16 w-16 rounded-full bg-primary/15 border-2 border-primary/30">
                    <Loader2 className="h-7 w-7 text-primary animate-spin" />
                  </div>
                </div>
                <div className="text-center space-y-1">
                  <p className="font-semibold text-foreground">Enviando para ZapSign…</p>
                  <p className="text-sm text-muted-foreground transition-all duration-500 min-h-[1.5rem]">
                    {ZAPSIGN_MSGS[zapsignPopupMsgIndex]}
                  </p>
                </div>
              </div>
            )}

            {/* Passo 2: WhatsApp */}
            {zapsignPopupStep === "whatsapp" && (
              <div className="flex flex-col items-center gap-4 animate-fade-in">
                <div className="relative flex items-center justify-center">
                  <span className="absolute inline-flex h-20 w-20 rounded-full bg-emerald-500/10 animate-ping" />
                  <span className="absolute inline-flex h-14 w-14 rounded-full bg-emerald-500/20 animate-ping [animation-delay:0.3s]" />
                  <div className="relative flex items-center justify-center h-16 w-16 rounded-full bg-emerald-50 dark:bg-emerald-900/20 border-2 border-emerald-300 dark:border-emerald-700">
                    <Loader2 className="h-7 w-7 text-emerald-600 dark:text-emerald-400 animate-spin" />
                  </div>
                </div>
                <div className="text-center space-y-1">
                  <p className="font-semibold text-foreground">Disparando WhatsApp…</p>
                  <p className="text-sm text-muted-foreground transition-all duration-500 min-h-[2.5rem]">
                    {WHATSAPP_MSGS[zapsignPopupMsgIndex]}
                  </p>
                </div>
              </div>
            )}

            {/* Concluído */}
            {zapsignPopupStep === "done" && (
              <div className="flex flex-col items-center gap-4 animate-fade-in">
                <div className="relative flex items-center justify-center">
                  <span className="absolute inline-flex h-20 w-20 rounded-full bg-emerald-500/10" />
                  <div className="relative flex items-center justify-center h-16 w-16 rounded-full bg-emerald-50 dark:bg-emerald-900/20 border-2 border-emerald-300 dark:border-emerald-700">
                    <CheckCircle2 className="h-8 w-8 text-emerald-600 dark:text-emerald-400" />
                  </div>
                </div>
                <div className="text-center space-y-2">
                  <p className="font-semibold text-foreground text-base">
                    ✅ Tudo pronto!
                  </p>
                  <p className="text-sm text-muted-foreground leading-relaxed">
                    🤖 O Flowy acabou de disparar a mensagem no WhatsApp do cliente!
                  </p>
                </div>

                <Button
                  className="w-full gap-2 mt-2"
                  onClick={() => setOpenZapsignPopup(false)}
                >
                  <CheckCircle2 className="h-4 w-4" />
                  Fechar
                </Button>
              </div>
            )}

            {/* Erro */}
            {zapsignPopupStep === "erro" && (
              <div className="flex flex-col items-center gap-4 animate-fade-in">
                <div className="flex items-center justify-center h-16 w-16 rounded-full bg-destructive/10 border-2 border-destructive/30">
                  <XCircle className="h-8 w-8 text-destructive" />
                </div>
                <div className="text-center space-y-1">
                  <p className="font-semibold text-foreground">Falha no envio</p>
                  <p className="text-xs text-muted-foreground">
                    {zapsignPopupError || "Erro inesperado. Tente novamente."}
                  </p>
                </div>
                <Button
                  className="w-full"
                  variant="outline"
                  onClick={() => setOpenZapsignPopup(false)}
                >
                  Fechar
                </Button>
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </AppLayout>
  );
}

