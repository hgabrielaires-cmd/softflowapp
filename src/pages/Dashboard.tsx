import { useEffect, useState, useMemo } from "react";
import { useAuth } from "@/context/AuthContext";
import { AppLayout } from "@/components/AppLayout";
import { supabase } from "@/integrations/supabase/client";
import {
  ShoppingCart,
  DollarSign,
  TrendingUp,
  TrendingDown,
  ArrowUpRight,
  ChevronLeft,
  ChevronRight,
  Building2,
  UserCircle,
  FileSignature,
  Clock,
  Percent,
  Package,
  Copy,
  Check,
  X,
  Eye,
  EyeOff,
  Loader2,
} from "lucide-react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { useUserFiliais } from "@/hooks/useUserFiliais";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
} from "@/components/ui/chart";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, PieChart, Pie, Cell } from "recharts";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";

const MONTH_NAMES = [
  "Janeiro", "Fevereiro", "Março", "Abril", "Maio", "Junho",
  "Julho", "Agosto", "Setembro", "Outubro", "Novembro", "Dezembro",
];

const PIE_COLORS = [
  "#3b82f6",
  "#10b981",
  "#f59e0b",
  "#ef4444",
  "#8b5cf6",
  "#06b6d4",
  "#f97316",
  "#ec4899",
  "#14b8a6",
  "#ef4444",
];

interface VendedorOption {
  user_id: string;
  full_name: string;
}

interface PedidoRow {
  id: string;
  valor_total: number;
  valor_implantacao_final: number;
  valor_mensalidade_final: number;
  desconto_implantacao_valor: number;
  desconto_mensalidade_valor: number;
  desconto_implantacao_tipo: string;
  desconto_mensalidade_tipo: string;
  valor_implantacao_original: number;
  valor_mensalidade_original: number;
  financeiro_status: string;
  tipo_pedido: string;
  plano_id: string;
  contrato_id: string | null;
  modulos_adicionais: any;
  cliente_id: string;
  plano_origem_id: string | null;
  comissao_implantacao_valor: number;
  comissao_mensalidade_valor: number;
  cliente_nome: string;
  desconto_aprovado_por_nome: string | null;
  status_pedido: string;
  numero_exibicao: string;
  created_at: string;
  motivo_cancelamento: string | null;
}

interface PlanoInfo {
  id: string;
  nome: string;
}

interface ContratoInfo {
  id: string;
  numero_exibicao: string;
  cliente_nome: string;
  zapsign_status: string | null;
  sign_url: string | null;
  contrato_status: string;
}

type DialogType = "pedidos" | "upsell" | "upgrade" | "contratos" | "descontos" | "plano" | "tipo" | "cancelados" | null;

export default function Dashboard() {
  const { profile, roles, isAdmin, user } = useAuth();
  const firstName = profile?.full_name?.split(" ")[0] || "usuário";
  const { filiaisDoUsuario, filialPadraoId, isGlobal } = useUserFiliais();

  const isOnlyVendedor = !isAdmin && !roles.includes("financeiro") && (profile as any)?.is_vendedor === true;

  const [filialId, setFilialId] = useState<string>("");
  const [vendedorId, setVendedorId] = useState<string>("");
  const [vendedores, setVendedores] = useState<VendedorOption[]>([]);
  const [loadingVendedores, setLoadingVendedores] = useState(false);

  const now = new Date();
  const [mes, setMes] = useState(now.getMonth());
  const [ano, setAno] = useState(now.getFullYear());

  const [pedidos, setPedidos] = useState<PedidoRow[]>([]);
  const [planos, setPlanos] = useState<PlanoInfo[]>([]);
  const [contratosInfo, setContratosInfo] = useState<ContratoInfo[]>([]);
  const [loading, setLoading] = useState(true);

  // Dialog state
  const [dialogOpen, setDialogOpen] = useState(false);
  const [dialogType, setDialogType] = useState<DialogType>(null);
  const [dialogFilter, setDialogFilter] = useState<string>("");
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [expandedPedidos, setExpandedPedidos] = useState<Set<string>>(new Set());

  // Inicializa filial padrão
  useEffect(() => {
    if (!filialId) {
      if (profile?.filial_favorita_id) {
        setFilialId(profile.filial_favorita_id);
      } else {
        setFilialId("todas");
      }
    }
  }, [filialPadraoId, profile?.filial_favorita_id]);

  useEffect(() => {
    if (isOnlyVendedor && user) {
      setVendedorId(user.id);
    }
  }, [isOnlyVendedor, user]);

  // Buscar vendedores
  useEffect(() => {
    if (isOnlyVendedor) return;

    async function fetchVendedores() {
      setLoadingVendedores(true);

      let query = supabase
        .from("profiles")
        .select("user_id, full_name")
        .eq("active", true)
        .eq("is_vendedor", true)
        .order("full_name");

      if (filialId && filialId !== "todas") {
        const { data: ufData } = await supabase
          .from("usuario_filiais")
          .select("user_id")
          .eq("filial_id", filialId);

        const ufUserIds = (ufData || []).map((u: any) => u.user_id);

        const { data: profileFilial } = await supabase
          .from("profiles")
          .select("user_id")
          .eq("filial_id", filialId)
          .eq("active", true)
          .eq("is_vendedor", true);

        const profileUserIds = (profileFilial || []).map((p: any) => p.user_id);

        const { data: globalVendedores } = await supabase
          .from("profiles")
          .select("user_id")
          .eq("active", true)
          .eq("is_vendedor", true)
          .eq("acesso_global", true);

        const globalUserIds = (globalVendedores || []).map((p: any) => p.user_id);

        const allFilialUserIds = [...new Set([...ufUserIds, ...profileUserIds, ...globalUserIds])];

        if (allFilialUserIds.length === 0) {
          setVendedores([]);
          setVendedorId("todos");
          setLoadingVendedores(false);
          return;
        }

        query = supabase
          .from("profiles")
          .select("user_id, full_name")
          .eq("active", true)
          .eq("is_vendedor", true)
          .in("user_id", allFilialUserIds)
          .order("full_name");
      }

      const { data } = await query;
      setVendedores((data || []) as VendedorOption[]);
      setVendedorId("todos");
      setLoadingVendedores(false);
    }

    if (filialId) fetchVendedores();
  }, [filialId, isOnlyVendedor]);

  function prevMes() {
    if (mes === 0) { setMes(11); setAno(a => a - 1); }
    else setMes(m => m - 1);
  }
  function nextMes() {
    const currentMes = now.getMonth();
    const currentAno = now.getFullYear();
    if (ano > currentAno || (ano === currentAno && mes >= currentMes)) return;
    if (mes === 11) { setMes(0); setAno(a => a + 1); }
    else setMes(m => m + 1);
  }

  const isCurrentMonth = mes === now.getMonth() && ano === now.getFullYear();

  // Fetch all data
  useEffect(() => {
    async function fetchData() {
      setLoading(true);

      const start = new Date(ano, mes, 1);
      start.setHours(0, 0, 0, 0);
      const end = new Date(ano, mes + 1, 0, 23, 59, 59);

      // Pedidos with client name
      let pedidoQuery = supabase
        .from("pedidos")
        .select("id, valor_total, valor_implantacao_final, valor_mensalidade_final, desconto_implantacao_valor, desconto_mensalidade_valor, desconto_implantacao_tipo, desconto_mensalidade_tipo, valor_implantacao_original, valor_mensalidade_original, financeiro_status, tipo_pedido, plano_id, contrato_id, modulos_adicionais, cliente_id, comissao_implantacao_valor, comissao_mensalidade_valor, status_pedido, numero_exibicao, created_at, clientes(nome_fantasia)")
        .gte("created_at", start.toISOString())
        .lte("created_at", end.toISOString());

      if (filialId && filialId !== "todas") {
        pedidoQuery = pedidoQuery.eq("filial_id", filialId);
      }
      if (isOnlyVendedor && user) {
        pedidoQuery = pedidoQuery.eq("vendedor_id", user.id);
      } else if (vendedorId && vendedorId !== "todos") {
        pedidoQuery = pedidoQuery.eq("vendedor_id", vendedorId);
      }

      const { data: pedidosData } = await pedidoQuery;
      let mappedPedidos = (pedidosData || []).map((p: any) => ({
        ...p,
        cliente_nome: p.clientes?.nome_fantasia || "Cliente",
        desconto_aprovado_por_nome: null as string | null,
        plano_origem_id: null as string | null,
      })) as PedidoRow[];

      // Fetch old plan for upgrade pedidos via contrato
      const upgradeContratoIds = mappedPedidos
        .filter(p => p.tipo_pedido === "Upgrade" && p.contrato_id)
        .map(p => p.contrato_id!);
      if (upgradeContratoIds.length > 0) {
        const { data: upgradeContratos } = await supabase
          .from("contratos")
          .select("id, plano_id")
          .in("id", upgradeContratoIds);
        if (upgradeContratos) {
          const contratoPlanoMap = new Map(upgradeContratos.map((c: any) => [c.id, c.plano_id]));
          mappedPedidos.forEach(p => {
            if (p.tipo_pedido === "Upgrade" && p.contrato_id) {
              p.plano_origem_id = contratoPlanoMap.get(p.contrato_id) || null;
            }
          });
        }
      }

      // Fetch discount approvals for pedidos with discounts
      const pedidoIds = mappedPedidos
        .filter(p => (p.desconto_implantacao_valor || 0) > 0 || (p.desconto_mensalidade_valor || 0) > 0)
        .map(p => p.id);

      if (pedidoIds.length > 0) {
        const { data: solicitacoes } = await supabase
          .from("solicitacoes_desconto")
          .select("pedido_id, aprovado_por, status")
          .in("pedido_id", pedidoIds)
          .eq("status", "Aprovado");

        if (solicitacoes && solicitacoes.length > 0) {
          const approverIds = [...new Set(solicitacoes.map((s: any) => s.aprovado_por).filter(Boolean))];
          let approverMap = new Map<string, string>();
          if (approverIds.length > 0) {
            const { data: approverProfiles } = await supabase
              .from("profiles")
              .select("user_id, full_name")
              .in("user_id", approverIds);
            (approverProfiles || []).forEach((ap: any) => approverMap.set(ap.user_id, ap.full_name));
          }
          solicitacoes.forEach((s: any) => {
            const pedido = mappedPedidos.find(p => p.id === s.pedido_id);
            if (pedido && s.aprovado_por) {
              pedido.desconto_aprovado_por_nome = approverMap.get(s.aprovado_por) || null;
            }
          });
        }
      }

      setPedidos(mappedPedidos);

      // Planos
      const { data: planosData } = await supabase
        .from("planos")
        .select("id, nome");
      setPlanos((planosData || []) as PlanoInfo[]);

      // Contratos with ZapSign and client info
      // Buscar contratos por AMBOS: pedidos.contrato_id e contratos.pedido_id
      const contratoIdsFromPedidos = mappedPedidos
        .filter(p => p.contrato_id)
        .map(p => p.contrato_id!);

      const pedidoIdsDoMes = mappedPedidos.map(p => p.id);

      // Buscar contratos vinculados via pedido_id
      let contratosViaPedidoId: any[] = [];
      if (pedidoIdsDoMes.length > 0) {
        const { data } = await supabase
          .from("contratos")
          .select("id, numero_exibicao, cliente_id, status, clientes(nome_fantasia)")
          .in("pedido_id", pedidoIdsDoMes);
        contratosViaPedidoId = data || [];
      }

      // Buscar contratos vinculados via contrato_id do pedido
      let contratosViaContratoId: any[] = [];
      if (contratoIdsFromPedidos.length > 0) {
        const { data } = await supabase
          .from("contratos")
          .select("id, numero_exibicao, cliente_id, status, clientes(nome_fantasia)")
          .in("id", contratoIdsFromPedidos);
        contratosViaContratoId = data || [];
      }

      // Unificar sem duplicatas
      const allContratosMap = new Map<string, any>();
      [...contratosViaPedidoId, ...contratosViaContratoId].forEach((c: any) => {
        allContratosMap.set(c.id, c);
      });
      const allContratoIds = [...allContratosMap.keys()];

      if (allContratoIds.length > 0) {
        const { data: zapsignData } = await supabase
          .from("contratos_zapsign")
          .select("contrato_id, status, sign_url")
          .in("contrato_id", allContratoIds);

        const zapsignMap = new Map((zapsignData || []).map((z: any) => [z.contrato_id, z]));

        const mapped: ContratoInfo[] = [...allContratosMap.values()].map((c: any) => {
          const zap = zapsignMap.get(c.id);
          return {
            id: c.id,
            numero_exibicao: c.numero_exibicao,
            cliente_nome: c.clientes?.nome_fantasia || "Cliente",
            zapsign_status: zap?.status || null,
            sign_url: zap?.sign_url || null,
            contrato_status: c.status || "Ativo",
          };
        });
        setContratosInfo(mapped);
      } else {
        setContratosInfo([]);
      }

      setLoading(false);
    }

    if (filialId || isOnlyVendedor) fetchData();
  }, [filialId, vendedorId, mes, ano, isOnlyVendedor, user]);

  // Computed stats
  const stats = useMemo(() => {
    // Separar cancelados dos ativos
    const canceladosPedidos = pedidos.filter(p => p.status_pedido === "Cancelado");
    const canceladosPedidosCount = canceladosPedidos.length;
    const canceladosPedidosValor = canceladosPedidos.reduce((s, p) => s + (p.valor_total || 0), 0);

    // Pedidos ativos (excluindo cancelados) para todos os KPIs principais
    const activePedidos = pedidos.filter(p => p.status_pedido !== "Cancelado");

    const totalPedidos = activePedidos.length;
    const vendasTotal = activePedidos.reduce((s, p) => s + (p.valor_total || 0), 0);
    const valorImplantacao = activePedidos.reduce((s, p) => s + (p.valor_implantacao_final || 0), 0);
    const valorMensal = activePedidos.reduce((s, p) => s + (p.valor_mensalidade_final || 0), 0);

    let descontosTotal = 0;
    activePedidos.forEach(p => {
      if (p.desconto_implantacao_tipo === "R$") {
        descontosTotal += p.desconto_implantacao_valor || 0;
      } else if (p.desconto_implantacao_tipo === "%" && p.valor_implantacao_original > 0) {
        descontosTotal += (p.valor_implantacao_original * (p.desconto_implantacao_valor || 0)) / 100;
      }
      if (p.desconto_mensalidade_tipo === "R$") {
        descontosTotal += p.desconto_mensalidade_valor || 0;
      } else if (p.desconto_mensalidade_tipo === "%" && p.valor_mensalidade_original > 0) {
        descontosTotal += (p.valor_mensalidade_original * (p.desconto_mensalidade_valor || 0)) / 100;
      }
    });

    const upsellPedidos = activePedidos.filter(p => p.tipo_pedido === "Aditivo");
    const upsellCount = upsellPedidos.length;
    const upsellValor = upsellPedidos.reduce((s, p) => s + (p.valor_total || 0), 0);

    const upgradePedidos = activePedidos.filter(p => p.tipo_pedido === "Upgrade");
    const upgradeCount = upgradePedidos.length;
    const upgradeValor = upgradePedidos.reduce((s, p) => s + (p.valor_total || 0), 0);

    const assinados = contratosInfo.filter(c => c.zapsign_status === "Assinado" && c.contrato_status !== "Encerrado").length;
    const cancelados = contratosInfo.filter(c => c.contrato_status === "Encerrado").length;
    const pendentes = contratosInfo.filter(c => c.contrato_status !== "Encerrado" && (!c.zapsign_status || c.zapsign_status !== "Assinado")).length;

    const vendasPorPlano: Record<string, { nome: string; count: number; valor: number; clientes: string[] }> = {};
    activePedidos
      .filter(p => p.tipo_pedido === "Novo" || p.tipo_pedido === "Upgrade")
      .forEach(p => {
      const plano = planos.find(pl => pl.id === p.plano_id);
      const nome = plano?.nome || "Sem plano";
      const key = p.plano_id || "sem";
      if (!vendasPorPlano[key]) {
        vendasPorPlano[key] = { nome, count: 0, valor: 0, clientes: [] };
      }
      vendasPorPlano[key].count++;
      vendasPorPlano[key].valor += p.valor_total || 0;
      if (!vendasPorPlano[key].clientes.includes(p.cliente_nome)) {
        vendasPorPlano[key].clientes.push(p.cliente_nome);
      }
    });
    const vendasPorPlanoArr = Object.values(vendasPorPlano)
      .sort((a, b) => b.count - a.count);

    const porTipo: Record<string, { count: number; clientes: string[] }> = {};
    activePedidos.forEach(p => {
      const tipo = p.tipo_pedido || "Outro";
      if (!porTipo[tipo]) {
        porTipo[tipo] = { count: 0, clientes: [] };
      }
      porTipo[tipo].count++;
      if (!porTipo[tipo].clientes.includes(p.cliente_nome)) {
        porTipo[tipo].clientes.push(p.cliente_nome);
      }
    });
    const porTipoArr = Object.entries(porTipo)
      .map(([key, val]) => ({ name: traduzirTipo(key), originalKey: key, value: val.count, clientes: val.clientes }))
      .sort((a, b) => b.value - a.value);

    const comissaoImplantacao = activePedidos.reduce((s, p) => s + (p.comissao_implantacao_valor || 0), 0);
    const comissaoMensalidade = activePedidos.reduce((s, p) => s + (p.comissao_mensalidade_valor || 0), 0);

    return {
      totalPedidos,
      vendasTotal,
      valorImplantacao,
      valorMensal,
      descontosTotal,
      upsellCount,
      upsellValor,
      upgradeCount,
      upgradeValor,
      canceladosPedidosCount,
      canceladosPedidosValor,
      assinados,
      cancelados,
      pendentes,
      vendasPorPlanoArr,
      porTipoArr,
      comissaoImplantacao,
      comissaoMensalidade,
    };
  }, [pedidos, planos, contratosInfo]);

  function traduzirTipo(tipo: string) {
    const map: Record<string, string> = {
      "Novo": "Novos",
      "Upgrade": "Upgrades",
      "Aditivo": "Módulos Adicionais",
      "OA": "Ordem de Atendimento",
      "Serviço": "Serviços",
    };
    return map[tipo] || tipo;
  }

  function getTipoLabel(tipo: string) {
    const map: Record<string, { label: string; color: string }> = {
      "Novo": { label: "Cliente Novo", color: "bg-green-100 text-green-700" },
      "Upgrade": { label: "Upgrade", color: "bg-blue-100 text-blue-700" },
      "Aditivo": { label: "Módulo Adicional", color: "bg-purple-100 text-purple-700" },
      "OA": { label: "OA", color: "bg-amber-100 text-amber-700" },
      "Serviço": { label: "Serviço", color: "bg-cyan-100 text-cyan-700" },
    };
    return map[tipo] || { label: tipo, color: "bg-muted text-muted-foreground" };
  }

  function fmtBRL(v: number) {
    return v.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
  }

  function openDialog(type: DialogType, filter = "") {
    setDialogType(type);
    setDialogFilter(filter);
    setDialogOpen(true);
    setExpandedPedidos(new Set());
  }

  function toggleExpand(id: string) {
    setExpandedPedidos(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  function getPlanoNome(planoId: string) {
    return planos.find(pl => pl.id === planoId)?.nome || "Sem plano";
  }

  function getModulosTexto(modulos: any) {
    if (!modulos || !Array.isArray(modulos) || modulos.length === 0) return null;
    return modulos.map((m: any) => m.nome || m.modulo_nome || "Módulo").join(", ");
  }

  async function copyToClipboard(text: string, id: string) {
    await navigator.clipboard.writeText(text);
    setCopiedId(id);
    toast.success("Link copiado!");
    setTimeout(() => setCopiedId(null), 2000);
  }

  // Get filtered pedidos for dialog
  const dialogPedidos = useMemo(() => {
    if (dialogType === "pedidos") return pedidos.filter(p => p.status_pedido !== "Cancelado");
    if (dialogType === "upsell") return pedidos.filter(p => p.tipo_pedido === "Aditivo");
    if (dialogType === "upgrade") return pedidos.filter(p => p.tipo_pedido === "Upgrade");
    if (dialogType === "cancelados") return pedidos.filter(p => p.status_pedido === "Cancelado");
    if (dialogType === "descontos") return pedidos.filter(p => {
      const hasDescImpl = (p.desconto_implantacao_valor || 0) > 0;
      const hasDescMens = (p.desconto_mensalidade_valor || 0) > 0;
      return hasDescImpl || hasDescMens;
    });
    if (dialogType === "plano") {
      return pedidos.filter(p => {
        // Only count actual plan sales (Novo/Upgrade), not Aditivo/OA
        if (p.tipo_pedido !== "Novo" && p.tipo_pedido !== "Upgrade") return false;
        const pNome = planos.find(pl => pl.id === p.plano_id)?.nome || "Sem plano";
        return pNome === dialogFilter;
      });
    }
    if (dialogType === "tipo") {
      // dialogFilter is the translated name, need original
      const reverseMap: Record<string, string> = {
        "Novos": "Novo",
        "Upgrades": "Upgrade",
        "Módulos Adicionais": "Aditivo",
        "Ordem de Atendimento": "OA",
        "Serviços": "Serviço",
      };
      const original = reverseMap[dialogFilter] || dialogFilter;
      return pedidos.filter(p => p.tipo_pedido === original);
    }
    return [];
  }, [dialogType, dialogFilter, pedidos, planos]);

  const dialogTitle = useMemo(() => {
    if (dialogType === "pedidos") return "💙 Pedidos no Mês";
    if (dialogType === "upsell") return "🤝 Upsell (Módulo Adicional)";
    if (dialogType === "upgrade") return "⬆️ Upgrades";
    if (dialogType === "contratos") return "✍️ Contratos";
    if (dialogType === "descontos") return "⚠️ Descontos Aplicados";
    if (dialogType === "cancelados") return "🚫 Pedidos Cancelados";
    if (dialogType === "plano") return `📦 Vendas — ${dialogFilter}`;
    if (dialogType === "tipo") return `📊 Vendas — ${dialogFilter}`;
    return "";
  }, [dialogType, dialogFilter]);

  const canSeeAllFiliais = filiaisDoUsuario.length > 1;

  const chartConfigPlano = useMemo(() => {
    const config: Record<string, { label: string; color: string }> = {};
    stats.vendasPorPlanoArr.forEach((p, i) => {
      config[`plano_${i}`] = { label: p.nome, color: PIE_COLORS[i % PIE_COLORS.length] };
    });
    return config;
  }, [stats.vendasPorPlanoArr]);

  const chartConfigTipo = useMemo(() => {
    const config: Record<string, { label: string; color: string }> = {};
    stats.porTipoArr.forEach((t, i) => {
      config[t.name] = { label: t.name, color: PIE_COLORS[i % PIE_COLORS.length] };
    });
    return config;
  }, [stats.porTipoArr]);

  return (
    <AppLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <h1 className="text-2xl font-bold text-foreground">
              Olá, {firstName} 👋
            </h1>
            <p className="text-muted-foreground text-sm mt-0.5">
              Dashboard Vendas
            </p>
          </div>
        </div>

        {/* Filtros */}
        <div className="flex flex-col sm:flex-row gap-3 items-start sm:items-center flex-wrap">
          <div className="flex items-center gap-2">
            <Building2 className="h-4 w-4 text-muted-foreground shrink-0" />
            {canSeeAllFiliais ? (
              <Select value={filialId} onValueChange={setFilialId}>
                <SelectTrigger className="w-52">
                  <SelectValue placeholder="Selecionar filial..." />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="todas">🌐 Todas as filiais</SelectItem>
                  {filiaisDoUsuario.map(f => (
                    <SelectItem key={f.id} value={f.id}>{f.nome}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            ) : (
              <span className="text-sm font-medium text-foreground bg-muted px-3 py-2 rounded-lg border border-border">
                {filiaisDoUsuario.find(f => f.id === filialId)?.nome || "—"}
              </span>
            )}
          </div>

          <div className="flex items-center gap-2">
            <UserCircle className="h-4 w-4 text-muted-foreground shrink-0" />
            {isOnlyVendedor ? (
              <span className="text-sm font-medium text-foreground bg-muted px-3 py-2 rounded-lg border border-border">
                {profile?.full_name || "—"}
              </span>
            ) : (
              <Select value={vendedorId} onValueChange={setVendedorId} disabled={loadingVendedores}>
                <SelectTrigger className="w-52">
                  <SelectValue placeholder="Selecionar vendedor..." />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="todos">👥 Todos os vendedores</SelectItem>
                  {vendedores.map(v => (
                    <SelectItem key={v.user_id} value={v.user_id}>{v.full_name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
          </div>

          <div className="flex items-center gap-1 ml-auto">
            <Button variant="outline" size="icon" className="h-9 w-9" onClick={prevMes}>
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <div className="min-w-[140px] text-center">
              <span className="text-sm font-semibold text-foreground">
                {MONTH_NAMES[mes]} {ano}
              </span>
            </div>
            <Button
              variant="outline"
              size="icon"
              className="h-9 w-9"
              onClick={nextMes}
              disabled={isCurrentMonth}
            >
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        </div>

        {/* KPI Cards - Row 1 */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <KPICard
            label="💙 Pedidos no Mês"
            value={loading ? "..." : stats.totalPedidos.toString()}
            icon={ShoppingCart}
            color="text-primary bg-primary/10"
            loading={loading}
            onClick={() => openDialog("pedidos")}
          />
          <KPICard
            label="💰 Vendas Total"
            value={loading ? "..." : fmtBRL(stats.vendasTotal)}
            icon={DollarSign}
            color="text-chart-2 bg-chart-2/10"
            loading={loading}
          />
          <KPICard
            label="💵 Valor Implantação"
            value={loading ? "..." : fmtBRL(stats.valorImplantacao)}
            icon={TrendingUp}
            color="text-chart-1 bg-chart-1/10"
            loading={loading}
          />
          <KPICard
            label="🔄 Valor Mensal"
            value={loading ? "..." : fmtBRL(stats.valorMensal)}
            icon={DollarSign}
            color="text-chart-3 bg-chart-3/10"
            loading={loading}
          />
        </div>

        {/* KPI Cards - Row 2 */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          <KPICard
            label="⚠️ Descontos Aplicados"
            value={loading ? "..." : fmtBRL(stats.descontosTotal)}
            icon={Percent}
            color="text-destructive bg-destructive/10"
            loading={loading}
            onClick={() => openDialog("descontos")}
          />
          <KPICard
            label="🪙 Comissão Prevista Implantação"
            value={loading ? "..." : fmtBRL(stats.comissaoImplantacao)}
            icon={DollarSign}
            color="text-chart-1 bg-chart-1/10"
            loading={loading}
          />
          <KPICard
            label="🪙 Comissão Prevista Mensalidade"
            value={loading ? "..." : fmtBRL(stats.comissaoMensalidade)}
            icon={DollarSign}
            color="text-chart-2 bg-chart-2/10"
            loading={loading}
          />
        </div>

        {/* KPI Cards - Row 3 */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
          <KPICard
            label="🚫 Cancelados"
            value={loading ? "..." : `${stats.canceladosPedidosCount}`}
            subtitle={loading ? undefined : fmtBRL(stats.canceladosPedidosValor)}
            icon={X}
            color="text-destructive bg-destructive/10"
            loading={loading}
            onClick={() => openDialog("cancelados")}
          />
          <KPICard
            label="🤝 Upsell (Mód. Adicional)"
            value={loading ? "..." : `${stats.upsellCount}`}
            subtitle={loading ? undefined : fmtBRL(stats.upsellValor)}
            icon={ArrowUpRight}
            color="text-chart-4 bg-chart-4/10"
            loading={loading}
            onClick={() => openDialog("upsell")}
          />
          <KPICard
            label="⬆️ Upgrades"
            value={loading ? "..." : `${stats.upgradeCount}`}
            subtitle={loading ? undefined : fmtBRL(stats.upgradeValor)}
            icon={TrendingUp}
            color="text-chart-5 bg-chart-5/10"
            loading={loading}
            onClick={() => openDialog("upgrade")}
          />
          <div
            className="bg-card rounded-xl p-5 shadow-card border border-border cursor-pointer hover:shadow-md transition-shadow"
            onClick={() => openDialog("contratos")}
          >
            <div className="flex items-center justify-between mb-3">
              <span className="text-xs font-medium text-muted-foreground">✍️ Contratos</span>
              <div className="h-9 w-9 rounded-lg flex items-center justify-center text-primary bg-primary/10">
                <FileSignature className="h-4 w-4" />
              </div>
            </div>
            <div className={`transition-opacity ${loading ? "opacity-40" : ""}`}>
              <div className="flex items-center justify-between gap-2">
                <div className="text-center min-w-0 flex-1">
                  <p className="text-xl font-bold text-chart-1">{loading ? "..." : stats.assinados}</p>
                  <p className="text-[10px] text-muted-foreground leading-tight">Assinados</p>
                </div>
                <div className="h-8 w-px bg-border shrink-0" />
                <div className="text-center min-w-0 flex-1">
                  <p className="text-xl font-bold text-amber-500">{loading ? "..." : stats.pendentes}</p>
                  <p className="text-[10px] text-muted-foreground leading-tight">Pendentes</p>
                </div>
                {stats.cancelados > 0 && (
                  <>
                    <div className="h-8 w-px bg-border shrink-0" />
                    <div className="text-center min-w-0 flex-1">
                      <p className="text-xl font-bold text-destructive">{loading ? "..." : stats.cancelados}</p>
                      <p className="text-[10px] text-muted-foreground leading-tight">Cancelados</p>
                    </div>
                  </>
                )}
              </div>
            </div>
            <p className="text-xs text-muted-foreground mt-2">Contratos</p>
          </div>
        </div>

        {/* Charts */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {/* Venda por Plano */}
          <Card className="shadow-md">
            <CardHeader className="pb-2">
              <CardTitle className="text-base font-semibold flex items-center gap-2">
                <Package className="h-4 w-4 text-primary" />
                Venda por Plano
              </CardTitle>
            </CardHeader>
            <CardContent>
              {loading ? (
                <div className="h-64 flex items-center justify-center text-muted-foreground text-sm"><Loader2 className="h-6 w-6 animate-spin text-primary" /></div>
              ) : stats.vendasPorPlanoArr.length === 0 ? (
                <div className="h-64 flex items-center justify-center text-muted-foreground text-sm">Sem dados no período</div>
              ) : (
                <ChartContainer config={chartConfigPlano} className="h-64 w-full">
                  <BarChart
                    data={stats.vendasPorPlanoArr}
                    layout="vertical"
                    margin={{ left: 0, right: 16, top: 8, bottom: 8 }}
                    onClick={(data) => {
                      if (data?.activePayload?.[0]?.payload?.nome) {
                        openDialog("plano", data.activePayload[0].payload.nome);
                      }
                    }}
                    style={{ cursor: "pointer" }}
                  >
                    <CartesianGrid strokeDasharray="3 3" horizontal={false} />
                    <XAxis type="number" tickFormatter={(v) => v.toString()} />
                    <YAxis type="category" dataKey="nome" width={120} tick={{ fontSize: 12 }} />
                    <ChartTooltip
                      content={
                        <ChartTooltipContent
                          formatter={(value, name, item) => (
                            <span>{value} pedido(s) — {fmtBRL(item.payload.valor)}</span>
                          )}
                        />
                      }
                    />
                    <Bar dataKey="count" radius={[0, 4, 4, 0]} fill="hsl(var(--primary))">
                      {stats.vendasPorPlanoArr.map((_, i) => (
                        <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} />
                      ))}
                    </Bar>
                  </BarChart>
                </ChartContainer>
              )}
            </CardContent>
          </Card>

          {/* Vendidos por Tipo */}
          <Card className="shadow-md">
            <CardHeader className="pb-2">
              <CardTitle className="text-base font-semibold flex items-center gap-2">
                <TrendingUp className="h-4 w-4 text-primary" />
                Vendas por Tipo
              </CardTitle>
            </CardHeader>
            <CardContent>
              {loading ? (
                <div className="h-64 flex items-center justify-center text-muted-foreground text-sm"><Loader2 className="h-6 w-6 animate-spin text-primary" /></div>
              ) : stats.porTipoArr.length === 0 ? (
                <div className="h-64 flex items-center justify-center text-muted-foreground text-sm">Sem dados no período</div>
              ) : (
                <div className="h-64 flex items-center justify-center">
                  <ChartContainer config={chartConfigTipo} className="h-64 w-full">
                    <PieChart>
                      <ChartTooltip content={<ChartTooltipContent />} />
                      <Pie
                        data={stats.porTipoArr}
                        dataKey="value"
                        nameKey="name"
                        cx="50%"
                        cy="50%"
                        outerRadius={90}
                        innerRadius={45}
                        strokeWidth={2}
                        label={({ name, value }) => `${name}: ${value}`}
                        onClick={(data) => {
                          if (data?.name) {
                            openDialog("tipo", data.name);
                          }
                        }}
                        style={{ cursor: "pointer" }}
                      >
                        {stats.porTipoArr.map((_, i) => (
                          <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} />
                        ))}
                      </Pie>
                    </PieChart>
                  </ChartContainer>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Dialog for details */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] flex flex-col overflow-hidden">
          <DialogHeader className="flex-shrink-0">
            <DialogTitle className="text-lg">{dialogTitle}</DialogTitle>
          </DialogHeader>
          <div className="flex-1 -mx-6 px-6 min-h-0 overflow-y-auto">
            {dialogType === "contratos" ? (
              <div className="space-y-2 pb-4">
                {contratosInfo.length === 0 ? (
                  <p className="text-sm text-muted-foreground text-center py-8">Nenhum contrato no período</p>
                ) : (
                  contratosInfo.map((c) => (
                    <div key={c.id} className="flex items-center justify-between p-3 rounded-lg border border-border bg-muted/30">
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-foreground truncate">{c.cliente_nome}</p>
                        <p className="text-xs text-muted-foreground">Contrato {c.numero_exibicao}</p>
                      </div>
                     <div className="flex items-center gap-2 ml-3">
                        {c.contrato_status === "Encerrado" ? (
                          <Badge variant="destructive" className="hover:bg-destructive">
                            ❌ Cancelado
                          </Badge>
                        ) : c.zapsign_status === "Assinado" ? (
                          <Badge variant="default" className="bg-green-100 text-green-700 border-green-200 hover:bg-green-100">
                            ✅ Assinado
                          </Badge>
                        ) : (
                          <>
                            <Badge variant="outline" className="bg-amber-50 text-amber-700 border-amber-200">
                              ⏳ {c.zapsign_status || "Pendente"}
                            </Badge>
                            {c.sign_url && (
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-8 w-8"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  copyToClipboard(c.sign_url!, c.id);
                                }}
                                title="Copiar link de assinatura"
                              >
                                {copiedId === c.id ? (
                                  <Check className="h-4 w-4 text-green-600" />
                                ) : (
                                  <Copy className="h-4 w-4" />
                                )}
                              </Button>
                            )}
                          </>
                        )}
                      </div>
                    </div>
                  ))
                )}
              </div>
            ) : dialogType === "descontos" ? (
              <div className="space-y-2 pb-4">
                {dialogPedidos.length === 0 ? (
                  <p className="text-sm text-muted-foreground text-center py-8">Nenhum desconto no período</p>
                ) : (
                  dialogPedidos.map((p) => {
                    const descImpl = p.desconto_implantacao_tipo === "%" 
                      ? `${p.desconto_implantacao_valor}% (${fmtBRL((p.valor_implantacao_original * (p.desconto_implantacao_valor || 0)) / 100)})`
                      : fmtBRL(p.desconto_implantacao_valor || 0);
                    const descMens = p.desconto_mensalidade_tipo === "%"
                      ? `${p.desconto_mensalidade_valor}% (${fmtBRL((p.valor_mensalidade_original * (p.desconto_mensalidade_valor || 0)) / 100)})`
                      : fmtBRL(p.desconto_mensalidade_valor || 0);
                    const isExpanded = expandedPedidos.has(p.id);
                    const planoNome = getPlanoNome(p.plano_id);
                    const modulosTexto = getModulosTexto(p.modulos_adicionais);
                    return (
                      <div key={p.id} className="rounded-lg border border-border bg-muted/30 overflow-hidden">
                        <div className="flex items-center justify-between p-3 gap-3">
                          <div className="flex-1 min-w-0 space-y-1">
                            <div className="flex items-center gap-2">
                              <p className="text-sm font-medium text-foreground truncate">{p.cliente_nome}</p>
                              <span className="text-[10px] text-muted-foreground shrink-0">#{p.numero_exibicao}</span>
                            </div>
                            <div className="flex flex-wrap items-center gap-3">
                              {(p.desconto_implantacao_valor || 0) > 0 && (
                                <span className="text-xs text-muted-foreground">
                                  Impl: <span className="line-through opacity-60">{fmtBRL(p.valor_implantacao_original)}</span> → <span className="font-medium text-foreground">{fmtBRL(p.valor_implantacao_final)}</span>
                                  <span className="font-medium text-destructive ml-1">(-{descImpl})</span>
                                </span>
                              )}
                              {(p.desconto_mensalidade_valor || 0) > 0 && (
                                <span className="text-xs text-muted-foreground">
                                  Mens: <span className="line-through opacity-60">{fmtBRL(p.valor_mensalidade_original)}</span> → <span className="font-medium text-foreground">{fmtBRL(p.valor_mensalidade_final)}</span>
                                  <span className="font-medium text-destructive ml-1">(-{descMens})</span>
                                </span>
                              )}
                            </div>
                            {p.desconto_aprovado_por_nome && (
                              <p className="text-xs text-muted-foreground">
                                ✅ Aprovado por: <span className="font-medium text-foreground">{p.desconto_aprovado_por_nome}</span>
                              </p>
                            )}
                          </div>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-7 w-7 shrink-0"
                            onClick={(e) => { e.stopPropagation(); toggleExpand(p.id); }}
                            title="Ver detalhes"
                          >
                            {isExpanded ? <EyeOff className="h-3.5 w-3.5" /> : <Eye className="h-3.5 w-3.5" />}
                          </Button>
                        </div>
                        {isExpanded && (
                          <div className="px-3 pb-3 pt-0 border-t border-border/50 bg-muted/50 space-y-1">
                            <p className="text-xs text-muted-foreground">
                              📦 Plano: <span className="font-medium text-foreground">{planoNome}</span>
                            </p>
                            <p className="text-xs text-muted-foreground">
                              💵 Impl: <span className="font-medium text-foreground">{fmtBRL(p.valor_implantacao_final)}</span> | Mens: <span className="font-medium text-foreground">{fmtBRL(p.valor_mensalidade_final)}</span>
                            </p>
                            {modulosTexto && (
                              <p className="text-xs text-muted-foreground">
                                🧩 Módulos: <span className="font-medium text-foreground">{modulosTexto}</span>
                              </p>
                            )}
                          </div>
                        )}
                      </div>
                    );
                  })
                )}
              </div>
            ) : (
              <div className="space-y-2 pb-4">
                {dialogPedidos.length === 0 ? (
                  <p className="text-sm text-muted-foreground text-center py-8">Nenhum pedido encontrado</p>
                ) : (
                  dialogPedidos.map((p) => {
                    const tipoInfo = getTipoLabel(p.tipo_pedido);
                    const isExpanded = expandedPedidos.has(p.id);
                    const planoNome = getPlanoNome(p.plano_id);
                    const modulosTexto = getModulosTexto(p.modulos_adicionais);
                    return (
                      <div key={p.id} className="rounded-lg border border-border bg-muted/30 overflow-hidden">
                        <div className="flex items-center justify-between p-3 gap-3">
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2">
                              <p className="text-sm font-medium text-foreground truncate">{p.cliente_nome}</p>
                              <span className="text-[10px] text-muted-foreground shrink-0">#{p.numero_exibicao}</span>
                            </div>
                            <p className="text-[10px] text-muted-foreground mt-0.5">
                              {new Date(p.created_at).toLocaleDateString("pt-BR")} às {new Date(p.created_at).toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" })}
                            </p>
                            <div className="flex items-center gap-3 mt-1">
                              <span className="text-xs text-muted-foreground">
                                Impl: <span className="font-medium text-foreground">{fmtBRL(p.valor_implantacao_final)}</span>
                              </span>
                              <span className="text-xs text-muted-foreground">
                                Mens: <span className="font-medium text-foreground">{fmtBRL(p.valor_mensalidade_final)}</span>
                              </span>
                            </div>
                          </div>
                          <div className="flex items-center gap-2 shrink-0">
                            <Badge variant="outline" className={`${tipoInfo.color} text-[11px]`}>
                              {tipoInfo.label}
                            </Badge>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-7 w-7"
                              onClick={(e) => { e.stopPropagation(); toggleExpand(p.id); }}
                              title="Ver detalhes"
                            >
                              {isExpanded ? <EyeOff className="h-3.5 w-3.5" /> : <Eye className="h-3.5 w-3.5" />}
                            </Button>
                          </div>
                        </div>
                        {isExpanded && (
                          <div className="px-3 pb-3 pt-0 border-t border-border/50 bg-muted/50 space-y-1">
                            {dialogType === "upsell" ? (
                              // Upsell: show only additional modules sold
                              <>
                                {Array.isArray(p.modulos_adicionais) && p.modulos_adicionais.length > 0 ? (
                                  p.modulos_adicionais.map((m: any, i: number) => (
                                    <div key={i} className="text-xs text-muted-foreground flex items-center gap-2">
                                      <span>🧩 <span className="font-medium text-foreground">{m.nome || m.modulo_nome || "Módulo"}</span></span>
                                      {(m.quantidade || m.qty) && <span>Qtd: <span className="font-medium text-foreground">{m.quantidade || m.qty}</span></span>}
                                      {(m.valor_implantacao != null || m.valor_mensalidade != null) && (
                                        <span>
                                          {m.valor_implantacao != null && <>Impl: <span className="font-medium text-foreground">{fmtBRL(m.valor_implantacao)}</span> </>}
                                          {m.valor_mensalidade != null && <>Mens: <span className="font-medium text-foreground">{fmtBRL(m.valor_mensalidade)}</span></>}
                                        </span>
                                      )}
                                    </div>
                                  ))
                                ) : (
                                  <p className="text-xs text-muted-foreground">Sem módulos adicionais registrados</p>
                                )}
                              </>
                            ) : dialogType === "upgrade" ? (
                              // Upgrade: show old plan → new plan
                              <p className="text-xs text-muted-foreground flex items-center gap-1.5 flex-wrap">
                                ⬆️ <span className="line-through opacity-60">{p.plano_origem_id ? getPlanoNome(p.plano_origem_id) : "—"}</span>
                                <span>→</span>
                                <span className="font-medium text-foreground">{planoNome}</span>
                              </p>
                            ) : (
                              // Other types: show plan + modules
                              <>
                                <p className="text-xs text-muted-foreground">
                                  📦 Plano: <span className="font-medium text-foreground">{planoNome}</span>
                                </p>
                                {modulosTexto && (
                                  <p className="text-xs text-muted-foreground">
                                    🧩 Módulos Adicionais: <span className="font-medium text-foreground">{modulosTexto}</span>
                                  </p>
                                )}
                                {p.tipo_pedido === "OA" && (
                                  <p className="text-xs text-muted-foreground">
                                    📋 Tipo: <span className="font-medium text-foreground">Ordem de Atendimento</span>
                                  </p>
                                )}
                              </>
                            )}
                          </div>
                        )}
                      </div>
                    );
                  })
                )}
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </AppLayout>
  );
}

function KPICard({
  label,
  value,
  subtitle,
  icon: Icon,
  color,
  loading,
  onClick,
}: {
  label: string;
  value: string;
  subtitle?: string;
  icon: React.ComponentType<{ className?: string }>;
  color: string;
  loading: boolean;
  onClick?: () => void;
}) {
  return (
    <div
      className={`bg-card rounded-xl p-5 shadow-card border border-border ${onClick ? "cursor-pointer hover:shadow-md transition-shadow" : ""}`}
      onClick={onClick}
    >
      <div className="flex items-center justify-between mb-3">
        <div className={`h-9 w-9 rounded-lg flex items-center justify-center ${color}`}>
          {loading ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <Icon className="h-4 w-4" />
          )}
        </div>
      </div>
      <p className={`text-2xl font-bold text-foreground transition-opacity ${loading ? "opacity-40" : ""}`}>
        {value}
      </p>
      {subtitle && (
        <p className={`text-sm font-medium text-muted-foreground transition-opacity ${loading ? "opacity-40" : ""}`}>
          {subtitle}
        </p>
      )}
      <p className="text-xs text-muted-foreground mt-1">{label}</p>
    </div>
  );
}
