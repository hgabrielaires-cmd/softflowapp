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
} from "lucide-react";
import { toast } from "sonner";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import html2canvas from "html2canvas";
import { jsPDF } from "jspdf";

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
  } | null;
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
  const [openGerarPopup, setOpenGerarPopup] = useState(false);
  const [gerarStatus, setGerarStatus] = useState<"gerando" | "concluido" | "erro">("gerando");
  const [gerarSignedUrl, setGerarSignedUrl] = useState<string | null>(null);
  const [gerarContratoAlvo, setGerarContratoAlvo] = useState<Contrato | null>(null);
  const [gerarMsgIndex, setGerarMsgIndex] = useState(0);

  const GERAR_MSGS = [
    "Ajustando os detalhes finais…",
    "Quase lá… deixando tudo redondo pra você!",
    "Montando seu contrato sob medida…",
    "Organizando tudo para assinatura…",
    "Preparando seu Termo de Aceite 💙",
  ];

  useEffect(() => {
    if (gerarStatus !== "gerando") return;
    setGerarMsgIndex(0);
    const interval = setInterval(() => {
      setGerarMsgIndex((prev) => (prev + 1) % GERAR_MSGS.length);
    }, 2000);
    return () => clearInterval(interval);
  }, [gerarStatus]);

  // Contatos do cliente selecionado (para Termo de Aceite)
  const [contatosCliente, setContatosCliente] = useState<{ nome: string; decisor: boolean; ativo: boolean }[]>([]);

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
            filial_id, vendedor_id
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
  }

  useEffect(() => {
    loadData();
  }, []);

  async function loadContatosCliente(clienteId: string) {
    const { data } = await supabase
      .from("cliente_contatos")
      .select("nome, decisor, ativo")
      .eq("cliente_id", clienteId)
      .eq("ativo", true);
    setContatosCliente((data || []) as { nome: string; decisor: boolean; ativo: boolean }[]);
  }

  function handleOpenDetail(contrato: Contrato) {
    setSelected(contrato);
    setOpenDetail(true);
    if (contrato.cliente_id) loadContatosCliente(contrato.cliente_id);
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

  // ── Gerar Contrato ─────────────────────────────────────────────────────────
  async function handleGerarContrato(contrato: Contrato) {
    setGerarContratoAlvo(contrato);
    setGerarStatus("gerando");
    setGerarSignedUrl(null);
    setOpenGerarPopup(true);
    setGerando(true);

    try {
      // 1. Buscar HTML renderizado do backend
      const { data, error } = await supabase.functions.invoke("gerar-contrato-pdf", {
        body: { contrato_id: contrato.id, action: "render" },
      });

      if (error || data?.error || !data?.html) {
        toast.error(data?.error || "Erro ao buscar modelo de contrato");
        setGerarStatus("erro");
        return;
      }

      // 2. Renderizar HTML em container oculto
      const A4_WIDTH_PX = 794;
      const A4_HEIGHT_PX = 1123;
      const MARGIN_BOTTOM_PX = 40;
      const container = document.createElement("div");
      container.style.cssText = `position:fixed;left:-9999px;top:0;width:${A4_WIDTH_PX}px;background:white;padding:76px 56px;box-sizing:border-box;font-family:Arial,sans-serif;font-size:12pt;line-height:1.5;color:#000;`;
      container.innerHTML = data.html;
      document.body.appendChild(container);

      // Aguardar imagens carregarem (com timeout de 5s e crossOrigin)
      const images = container.querySelectorAll("img");
      images.forEach((img) => { img.crossOrigin = "anonymous"; });
      await Promise.all(
        Array.from(images).map(
          (img) =>
            new Promise<void>((resolve) => {
              if (img.complete) return resolve();
              const timeout = setTimeout(() => resolve(), 5000);
              img.onload = () => { clearTimeout(timeout); resolve(); };
              img.onerror = () => { clearTimeout(timeout); resolve(); };
            })
        )
      );

      // 3. Capturar TODO o conteúdo em um único canvas (evita inconsistências)
      const scale = 2;
      const fullCanvas = await html2canvas(container, {
        scale,
        useCORS: true,
        allowTaint: true,
        backgroundColor: "#ffffff",
        width: A4_WIDTH_PX,
        windowWidth: A4_WIDTH_PX,
      });

      // 4. Encontrar pontos seguros de quebra usando posições de elementos
      const safePageHeight = A4_HEIGHT_PX - MARGIN_BOTTOM_PX;
      const totalHeight = container.scrollHeight;
      const containerRect = container.getBoundingClientRect();

      const blockSelectors = "p, h1, h2, h3, h4, h5, h6, table, tr, section, hr, img, ul, ol, blockquote, li";
      const blocks = container.querySelectorAll(blockSelectors);

      // Coletar tops e bottoms de elementos significativos (altura > 20px)
      const edges: { top: number; bottom: number }[] = [];
      blocks.forEach((el) => {
        const rect = el.getBoundingClientRect();
        const elHeight = rect.height;
        if (elHeight < 20) return; // Ignorar elementos muito pequenos
        const top = Math.round(rect.top - containerRect.top);
        const bottom = Math.round(rect.bottom - containerRect.top);
        if (top > 0 && top < totalHeight) {
          edges.push({ top, bottom });
        }
      });
      // Remover duplicatas e ordenar
      const uniqueTops = Array.from(new Set(edges.map((e) => e.top))).sort((a, b) => a - b);
      const edgeMap = new Map<number, number>();
      edges.forEach((e) => {
        const existing = edgeMap.get(e.top);
        if (!existing || e.bottom > existing) edgeMap.set(e.top, e.bottom);
      });

      // Construir breakpoints com look-ahead
      const breakPoints: number[] = [0];

      while (breakPoints[breakPoints.length - 1] < totalHeight) {
        const pageStart = breakPoints[breakPoints.length - 1];
        const maxEnd = pageStart + safePageHeight;

        if (maxEnd >= totalHeight) {
          breakPoints.push(totalHeight);
          break;
        }

        // Encontrar o último "top" de elemento que cabe inteiro na página
        let bestBreak = -1;
        for (let i = uniqueTops.length - 1; i >= 0; i--) {
          const t = uniqueTops[i];
          if (t > maxEnd) continue;
          if (t <= pageStart + 100) break; // Margem de segurança no topo
          const bottom = edgeMap.get(t) || t;
          // Se o elemento cruza o limite, cortar ANTES dele
          if (bottom > maxEnd) {
            bestBreak = t;
            break;
          }
          // Elemento cabe inteiro - cortar logo APÓS ele
          bestBreak = bottom;
          break;
        }

        // Se não encontrou um bom corte, forçar avanço
        if (bestBreak <= pageStart + 200) {
          bestBreak = maxEnd;
        }

        breakPoints.push(bestBreak);
      }

      document.body.removeChild(container);

      // 5. Fatiar o canvas único e montar PDF
      const pdf = new jsPDF("p", "mm", "a4");
      const marginMM = 10;
      const imgWidthMM = 210 - marginMM * 2; // 190mm úteis
      const pageHeightMM = 297;
      const canvasWidth = fullCanvas.width;

      for (let i = 0; i < breakPoints.length - 1; i++) {
        if (i > 0) pdf.addPage();

        const sliceTop = breakPoints[i];
        const sliceBottom = breakPoints[i + 1];
        const sliceHeight = sliceBottom - sliceTop;

        // Criar canvas da fatia a partir do canvas completo
        const sliceCanvas = document.createElement("canvas");
        sliceCanvas.width = canvasWidth;
        sliceCanvas.height = Math.round(sliceHeight * scale);
        const ctx = sliceCanvas.getContext("2d");
        if (ctx) {
          ctx.drawImage(
            fullCanvas,
            0, Math.round(sliceTop * scale),
            canvasWidth, Math.round(sliceHeight * scale),
            0, 0,
            canvasWidth, Math.round(sliceHeight * scale)
          );
        }

        const sliceHeightMM = (sliceHeight / A4_WIDTH_PX) * imgWidthMM;
        const adjustedHeightMM = Math.min(sliceHeightMM, pageHeightMM - marginMM * 2);
        pdf.addImage(sliceCanvas.toDataURL("image/jpeg", 0.95), "JPEG", marginMM, marginMM, imgWidthMM, adjustedHeightMM);
      }

      // 4. Converter PDF para base64 e enviar ao backend para upload
      const pdfBase64 = pdf.output("datauristring").split(",")[1];

      const { data: uploadData, error: uploadError } = await supabase.functions.invoke(
        "gerar-contrato-pdf",
        { body: { contrato_id: contrato.id, action: "upload", pdf_base64: pdfBase64 } }
      );

      if (uploadError || uploadData?.error) {
        toast.error("Erro ao salvar PDF");
        setGerarStatus("erro");
        return;
      }

      // 5. Atualizar estado local
      const updatedContrato = {
        ...contrato,
        status_geracao: "Gerado",
        pdf_url: uploadData.storage_path,
      };
      setContratos((prev) =>
        prev.map((c) => (c.id === contrato.id ? updatedContrato : c))
      );
      if (selected?.id === contrato.id) {
        setSelected(updatedContrato);
      }

      setGerarSignedUrl(uploadData.signed_url || null);
      setGerarContratoAlvo(updatedContrato);
      setGerarStatus("concluido");
    } catch (err) {
      console.error("Erro ao gerar contrato:", err);
      setGerarStatus("erro");
    } finally {
      setGerando(false);
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

  function getStatusBadge(status: string) {
    if (status === "Ativo")
      return (
        <Badge className="bg-emerald-100 text-emerald-700 border-emerald-200 hover:bg-emerald-100 dark:bg-emerald-900/30 dark:text-emerald-400">
          Ativo
        </Badge>
      );
    return <Badge variant="secondary">Encerrado</Badge>;
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
        <Badge className="bg-primary/10 text-primary border-primary/20 hover:bg-primary/10">
          Base
        </Badge>
      );
    if (tipo === "Upgrade")
      return (
        <Badge className="bg-violet-100 text-violet-700 border-violet-200 hover:bg-violet-100 dark:bg-violet-900/30 dark:text-violet-400">
          Upgrade
        </Badge>
      );
    if (tipo === "Downgrade")
      return (
        <Badge className="bg-amber-100 text-amber-700 border-amber-200 hover:bg-amber-100 dark:bg-amber-900/30 dark:text-amber-400">
          Downgrade
        </Badge>
      );
    return <Badge variant="outline">{tipo}</Badge>;
  }

  function getPedidoStatusBadges(contrato: Contrato) {
    if (!contrato.pedidos) return <span className="text-xs text-muted-foreground">—</span>;
    return (
      <div className="flex flex-col gap-1">
        {contrato.pedidos.financeiro_status === "Aprovado" && (
          <Badge className="bg-emerald-100 text-emerald-700 border-emerald-200 hover:bg-emerald-100 text-xs w-fit">
            ✓ Aprovado
          </Badge>
        )}
        {contrato.pedidos.contrato_liberado && (
          <Badge className="bg-blue-100 text-blue-700 border-blue-200 hover:bg-blue-100 text-xs w-fit">
            Liberado
          </Badge>
        )}
      </div>
    );
  }

  // ── Gerador de Termo de Aceite ──────────────────────────────────────────────
  function gerarTermoAceite(contrato: Contrato): string {
    const pedido = contrato.pedidos;
    const plano = contrato.planos;
    const nomeUsuario = profile?.full_name || "{nome_usuario}";
    const nomeFantasia = contrato.clientes?.nome_fantasia || "{nome_fantasia}";
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

{link_assinatura}

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
                <TableHead>Data</TableHead>
                <TableHead className="text-right">Ações</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading ? (
                <TableRow>
                  <TableCell colSpan={9} className="text-center py-12">
                    <Loader2 className="h-6 w-6 animate-spin mx-auto text-muted-foreground" />
                  </TableCell>
                </TableRow>
              ) : filtered.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={9} className="text-center py-16 text-muted-foreground">
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
                    <TableCell>{getTipoBadge(contrato.tipo)}</TableCell>
                    <TableCell>{getStatusBadge(contrato.status)}</TableCell>
                    <TableCell>{getPedidoStatusBadges(contrato)}</TableCell>
                    <TableCell>{getStatusGeracaoBadge(contrato.status_geracao)}</TableCell>
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
                            {contrato.status_geracao === "Gerado" ? "Regerar Contrato" : "Gerar Contrato"}
                          </DropdownMenuItem>
                          {contrato.status_geracao === "Gerado" && contrato.pdf_url && (
                            <DropdownMenuItem
                              className="cursor-pointer"
                              onClick={() => handleBaixarContrato(contrato)}
                              disabled={gerando}
                            >
                              <Download className="h-4 w-4 mr-2" />
                              Baixar Contrato
                            </DropdownMenuItem>
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

              {/* Termo de Aceite — apenas admin/financeiro */}
              {canManage && selected.pedidos && (() => {
                const mensagem = gerarTermoAceite(selected);
                return (
                  <div className="border-t border-border pt-4 space-y-2">
                    <div className="flex items-center justify-between">
                      <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Mensagem — Termo de Aceite</p>
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
                    <p className="text-xs text-muted-foreground">
                      💡 Substitua <code className="bg-muted px-1 rounded">{"{link_assinatura}"}</code> e <code className="bg-muted px-1 rounded">{"{datas_implantacao}"}</code> antes de enviar.
                    </p>
                  </div>
                );
              })()}

              {/* Ações de Contrato */}
              <div className="border-t border-border pt-4 space-y-3">
                <div className="flex items-center justify-between">
                  <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Documento do Contrato</p>
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
                    {selected.status_geracao === "Gerado" ? "Regerar Contrato" : "Gerar Contrato"}
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
                      Baixar Contrato
                    </Button>
                  )}
                </div>

                {selected.status_geracao === "Gerado" && (
                  <p className="text-xs text-muted-foreground">
                    💡 Contrato gerado em PDF e pronto para download.
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

      {/* ── Popup de Geração de Contrato ─────────────────────────────────── */}
      <Dialog
        open={openGerarPopup}
        onOpenChange={(open) => {
          if (!gerando) setOpenGerarPopup(open);
        }}
      >
        <DialogContent className="max-w-sm" aria-describedby="gerar-desc">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-base">
              <FileOutput className="h-5 w-5 text-primary" />
              Gerar Contrato
            </DialogTitle>
            <DialogDescription id="gerar-desc" className="sr-only">
              Status da geração do contrato
            </DialogDescription>
          </DialogHeader>

          <div className="py-6 flex flex-col items-center gap-5">
            {/* Estado: Gerando */}
            {gerarStatus === "gerando" && (
              <div className="flex flex-col items-center gap-4 animate-fade-in">
                <div className="relative flex items-center justify-center">
                  <span className="absolute inline-flex h-20 w-20 rounded-full bg-primary/10 animate-ping" />
                  <span className="absolute inline-flex h-14 w-14 rounded-full bg-primary/20 animate-ping [animation-delay:0.3s]" />
                  <div className="relative flex items-center justify-center h-16 w-16 rounded-full bg-primary/15 border-2 border-primary/30">
                    <Loader2 className="h-7 w-7 text-primary animate-spin" />
                  </div>
                </div>
                <div className="text-center space-y-1">
                  <p className="font-semibold text-foreground">Gerando contrato…</p>
                  <p className="text-xs text-muted-foreground transition-all duration-500">
                    {GERAR_MSGS[gerarMsgIndex]}
                  </p>
                </div>
              </div>
            )}

            {/* Estado: Concluído */}
            {gerarStatus === "concluido" && (
              <div className="flex flex-col items-center gap-4 animate-fade-in">
                <div className="relative flex items-center justify-center">
                  <span className="absolute inline-flex h-20 w-20 rounded-full bg-emerald-500/10" />
                  <div className="relative flex items-center justify-center h-16 w-16 rounded-full bg-emerald-50 dark:bg-emerald-900/20 border-2 border-emerald-300 dark:border-emerald-700">
                    <CheckCircle2 className="h-8 w-8 text-emerald-600 dark:text-emerald-400" />
                  </div>
                </div>
                <div className="text-center space-y-1">
                  <p className="font-semibold text-foreground">Contrato gerado!</p>
                  <p className="text-xs text-muted-foreground">
                    {gerarContratoAlvo?.numero_exibicao || `#${gerarContratoAlvo?.numero_registro}`} · {gerarContratoAlvo?.clientes?.nome_fantasia}
                  </p>
                </div>

                <div className="w-full space-y-2 pt-1">
                  <Button
                    className="w-full gap-2"
                    onClick={async () => {
                      const url = gerarSignedUrl || null;
                      const fileName = `contrato-${gerarContratoAlvo?.numero_exibicao || gerarContratoAlvo?.numero_registro}.pdf`;
                      if (url) {
                        const response = await fetch(url);
                        const blob = await response.blob();
                        const objectUrl = URL.createObjectURL(blob);
                        const a = document.createElement("a");
                        a.href = objectUrl;
                        a.download = fileName;
                        document.body.appendChild(a);
                        a.click();
                        document.body.removeChild(a);
                        URL.revokeObjectURL(objectUrl);
                      } else if (gerarContratoAlvo?.pdf_url) {
                        await handleBaixarContrato(gerarContratoAlvo);
                      }
                    }}
                  >
                    <FileDown className="h-4 w-4" />
                    Baixar PDF
                  </Button>

                  <Button
                    variant="outline"
                    className="w-full gap-2 relative"
                    disabled
                    title="Integração em construção"
                  >
                    <Send className="h-4 w-4" />
                    Enviar para ZapSign
                    <span className="absolute -top-2 -right-2 bg-amber-400 text-amber-900 text-[10px] font-bold px-1.5 py-0.5 rounded-full leading-none">
                      Em breve
                    </span>
                  </Button>
                </div>

                <button
                  className="text-xs text-muted-foreground underline underline-offset-2 hover:text-foreground transition-colors mt-1"
                  onClick={() => setOpenGerarPopup(false)}
                >
                  Fechar
                </button>
              </div>
            )}

            {/* Estado: Erro */}
            {gerarStatus === "erro" && (
              <div className="flex flex-col items-center gap-4 animate-fade-in">
                <div className="flex items-center justify-center h-16 w-16 rounded-full bg-destructive/10 border-2 border-destructive/30">
                  <XCircle className="h-8 w-8 text-destructive" />
                </div>
                <div className="text-center space-y-1">
                  <p className="font-semibold text-foreground">Falha na geração</p>
                  <p className="text-xs text-muted-foreground">
                    Verifique se há um modelo de contrato ativo configurado e tente novamente.
                  </p>
                </div>
                <div className="w-full space-y-2">
                  <Button
                    className="w-full"
                    variant="outline"
                    onClick={() => {
                      setOpenGerarPopup(false);
                      if (gerarContratoAlvo) handleGerarContrato(gerarContratoAlvo);
                    }}
                  >
                    Tentar novamente
                  </Button>
                  <Button
                    className="w-full"
                    variant="ghost"
                    onClick={() => setOpenGerarPopup(false)}
                  >
                    Fechar
                  </Button>
                </div>
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </AppLayout>
  );
}

