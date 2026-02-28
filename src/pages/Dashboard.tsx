import { useEffect, useState } from "react";
import { useAuth } from "@/context/AuthContext";
import { AppLayout } from "@/components/AppLayout";
import { Filial } from "@/lib/supabase-types";
import { supabase } from "@/integrations/supabase/client";
import {
  ShoppingCart,
  DollarSign,
  TrendingUp,
  Users,
  ChevronLeft,
  ChevronRight,
  Building2,
  UserCircle,
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

const MONTH_NAMES = [
  "Janeiro", "Fevereiro", "Março", "Abril", "Maio", "Junho",
  "Julho", "Agosto", "Setembro", "Outubro", "Novembro", "Dezembro",
];

interface DashboardStats {
  totalPedidos: number;
  valorTotal: number;
  comissaoTotal: number;
  pedidosAprovados: number;
}

interface VendedorOption {
  user_id: string;
  full_name: string;
}

export default function Dashboard() {
  const { profile, roles, isAdmin, user } = useAuth();
  const firstName = profile?.full_name?.split(" ")[0] || "usuário";
  const { filiaisDoUsuario, filialPadraoId, isGlobal } = useUserFiliais();

  const isVendedor = roles.includes("vendedor") && !isAdmin && !roles.includes("financeiro");

  const [filialId, setFilialId] = useState<string>("");
  const [vendedorId, setVendedorId] = useState<string>("");
  const [vendedores, setVendedores] = useState<VendedorOption[]>([]);
  const [loadingVendedores, setLoadingVendedores] = useState(false);

  // Filtro de mês/ano
  const now = new Date();
  const [mes, setMes] = useState(now.getMonth());
  const [ano, setAno] = useState(now.getFullYear());

  const [stats, setStats] = useState<DashboardStats>({
    totalPedidos: 0,
    valorTotal: 0,
    comissaoTotal: 0,
    pedidosAprovados: 0,
  });
  const [loadingStats, setLoadingStats] = useState(true);

  // Inicializa filial padrão
  useEffect(() => {
    if (filialPadraoId && !filialId) {
      setFilialId(isGlobal ? (filialPadraoId || "todas") : filialPadraoId);
    } else if (isGlobal && !filialId) {
      setFilialId("todas");
    }
  }, [filialPadraoId, isGlobal]);

  // Vendedor: auto-selecionar próprio ID
  useEffect(() => {
    if (isVendedor && user) {
      setVendedorId(user.id);
    }
  }, [isVendedor, user]);

  // Buscar vendedores da filial selecionada (para admin/financeiro)
  useEffect(() => {
    if (isVendedor) return; // vendedor não precisa buscar lista

    async function fetchVendedores() {
      setLoadingVendedores(true);

      // Buscar user_ids com role vendedor
      const { data: vendedorRoles } = await supabase
        .from("user_roles")
        .select("user_id")
        .eq("role", "vendedor");

      if (!vendedorRoles || vendedorRoles.length === 0) {
        setVendedores([]);
        setLoadingVendedores(false);
        return;
      }

      const vendedorUserIds = vendedorRoles.map(r => r.user_id);

      // Buscar profiles desses vendedores filtrados pela filial
      let query = supabase
        .from("profiles")
        .select("user_id, full_name")
        .eq("active", true)
        .in("user_id", vendedorUserIds)
        .order("full_name");

      if (filialId && filialId !== "todas") {
        // Buscar vendedores vinculados à filial via usuario_filiais ou filial_id do profile
        const { data: ufData } = await supabase
          .from("usuario_filiais")
          .select("user_id")
          .eq("filial_id", filialId);

        const ufUserIds = (ufData || []).map((u: any) => u.user_id);

        // Também incluir vendedores com filial_id direto no profile
        const { data: profileFilial } = await supabase
          .from("profiles")
          .select("user_id")
          .eq("filial_id", filialId)
          .eq("active", true)
          .in("user_id", vendedorUserIds);

        const profileUserIds = (profileFilial || []).map((p: any) => p.user_id);

        const allFilialUserIds = [...new Set([...ufUserIds, ...profileUserIds])];
        const filteredIds = vendedorUserIds.filter(id => allFilialUserIds.includes(id));

        if (filteredIds.length === 0) {
          setVendedores([]);
          setVendedorId("todos");
          setLoadingVendedores(false);
          return;
        }

        query = supabase
          .from("profiles")
          .select("user_id, full_name")
          .eq("active", true)
          .in("user_id", filteredIds)
          .order("full_name");
      }

      const { data } = await query;
      setVendedores((data || []) as VendedorOption[]);
      setVendedorId("todos");
      setLoadingVendedores(false);
    }

    if (filialId) fetchVendedores();
  }, [filialId, isVendedor]);

  // Navega mês
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

  // Busca KPIs
  useEffect(() => {
    async function fetchStats() {
      setLoadingStats(true);

      const start = new Date(ano, mes, 1).toISOString();
      const end = new Date(ano, mes + 1, 0, 23, 59, 59).toISOString();

      let query = supabase
        .from("pedidos")
        .select("valor_total, comissao_valor, financeiro_status")
        .gte("created_at", start)
        .lte("created_at", end);

      if (filialId && filialId !== "todas") {
        query = query.eq("filial_id", filialId);
      }

      // Filtro de vendedor
      if (isVendedor && user) {
        query = query.eq("vendedor_id", user.id);
      } else if (vendedorId && vendedorId !== "todos") {
        query = query.eq("vendedor_id", vendedorId);
      }

      const { data } = await query;

      if (data) {
        const total = data.length;
        const valorTotal = data.reduce((s, p) => s + (p.valor_total || 0), 0);
        const comissaoTotal = data.reduce((s, p) => s + (p.comissao_valor || 0), 0);
        const aprovados = data.filter(p => p.financeiro_status === "Aprovado").length;
        setStats({ totalPedidos: total, valorTotal, comissaoTotal, pedidosAprovados: aprovados });
      } else {
        setStats({ totalPedidos: 0, valorTotal: 0, comissaoTotal: 0, pedidosAprovados: 0 });
      }
      setLoadingStats(false);
    }

    if (filialId || isVendedor) fetchStats();
  }, [filialId, vendedorId, mes, ano, isVendedor, user]);

  function fmtBRL(v: number) {
    return v.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
  }

  const cards = [
    {
      label: "Pedidos no mês",
      value: loadingStats ? "..." : stats.totalPedidos.toString(),
      icon: ShoppingCart,
      color: "text-primary bg-primary/10",
    },
    {
      label: "Valor total",
      value: loadingStats ? "..." : fmtBRL(stats.valorTotal),
      icon: DollarSign,
      color: "text-chart-2 bg-chart-2/10",
    },
    {
      label: "Pedidos aprovados",
      value: loadingStats ? "..." : stats.pedidosAprovados.toString(),
      icon: TrendingUp,
      color: "text-chart-1 bg-chart-1/10",
    },
    {
      label: "Comissão total",
      value: loadingStats ? "..." : fmtBRL(stats.comissaoTotal),
      icon: Users,
      color: "text-chart-3 bg-chart-3/10",
    },
  ];

  const canSeeAllFiliais = isGlobal || isAdmin || roles.includes("financeiro");

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

          {/* Filial */}
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

          {/* Vendedor */}
          <div className="flex items-center gap-2">
            <UserCircle className="h-4 w-4 text-muted-foreground shrink-0" />
            {isVendedor ? (
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

          {/* Navegação de mês */}
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

        {/* KPI Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {cards.map((card) => {
            const Icon = card.icon;
            return (
              <div
                key={card.label}
                className="bg-card rounded-xl p-5 shadow-card border border-border"
              >
                <div className="flex items-center justify-between mb-3">
                  <div className={`h-9 w-9 rounded-lg flex items-center justify-center ${card.color}`}>
                    <Icon className="h-4 w-4" />
                  </div>
                </div>
                <p className={`text-2xl font-bold text-foreground transition-opacity ${loadingStats ? "opacity-40" : ""}`}>
                  {card.value}
                </p>
                <p className="text-xs text-muted-foreground mt-1">{card.label}</p>
              </div>
            );
          })}
        </div>

        {/* Info card */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          <div className="bg-card rounded-xl p-6 border border-border shadow-card">
            <div className="flex items-center gap-2 mb-4">
              <TrendingUp className="h-5 w-5 text-primary" />
              <h3 className="font-semibold text-foreground">Módulos do sistema</h3>
            </div>
            <div className="space-y-3">
              {[
                { label: "Módulo 1", desc: "Base de usuários e permissões", done: true },
                { label: "Módulo 2", desc: "Pedidos de venda", done: true },
                { label: "Módulo 3", desc: "Aprovação financeira e contratos", done: false },
                { label: "Módulo 4", desc: "Comissões automáticas", done: false },
                { label: "Módulo 5", desc: "Agenda operacional", done: false },
              ].map((item) => (
                <div key={item.label} className="flex items-center gap-3">
                  <div className={`h-5 w-5 rounded-full border-2 flex items-center justify-center flex-shrink-0 ${
                    item.done ? "border-primary bg-primary" : "border-border bg-background"
                  }`}>
                    {item.done && <span className="text-primary-foreground text-xs">✓</span>}
                  </div>
                  <div>
                    <span className="text-sm font-medium text-foreground">{item.label}: </span>
                    <span className="text-sm text-muted-foreground">{item.desc}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="gradient-hero rounded-xl p-6 text-white">
            <h3 className="font-bold text-lg mb-2" style={{ fontFamily: 'Plus Jakarta Sans, sans-serif' }}>
              Sistema em construção
            </h3>
            <p className="text-sm leading-relaxed mb-4 text-white/70">
              Esta é a base do portal interno da Softflow. Os módulos serão adicionados progressivamente conforme o planejamento.
            </p>
            <div className="grid grid-cols-2 gap-2">
              {["Pedidos de venda", "Aprovação financeira", "Comissão automática", "Agenda operacional"].map((feat) => (
                <div key={feat} className="text-xs bg-white/10 rounded-lg px-3 py-2 text-white/80">
                  {feat}
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </AppLayout>
  );
}
