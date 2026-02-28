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
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, PieChart, Pie, Cell, ResponsiveContainer } from "recharts";

const MONTH_NAMES = [
  "Janeiro", "Fevereiro", "Março", "Abril", "Maio", "Junho",
  "Julho", "Agosto", "Setembro", "Outubro", "Novembro", "Dezembro",
];

const PIE_COLORS = [
  "hsl(var(--primary))",
  "hsl(var(--chart-1))",
  "hsl(var(--chart-2))",
  "hsl(var(--chart-3))",
  "hsl(var(--chart-4))",
  "hsl(var(--chart-5))",
  "#6366f1",
  "#f59e0b",
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
}

interface PlanoInfo {
  id: string;
  nome: string;
}

interface ContratoZapsign {
  contrato_id: string;
  status: string;
}

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
  const [contratosZapsign, setContratosZapsign] = useState<ContratoZapsign[]>([]);
  const [loading, setLoading] = useState(true);

  // Inicializa filial padrão
  useEffect(() => {
    if (filialPadraoId && !filialId) {
      setFilialId(isGlobal ? (filialPadraoId || "todas") : filialPadraoId);
    } else if (isGlobal && !filialId) {
      setFilialId("todas");
    }
  }, [filialPadraoId, isGlobal]);

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

      // Pedidos
      let pedidoQuery = supabase
        .from("pedidos")
        .select("id, valor_total, valor_implantacao_final, valor_mensalidade_final, desconto_implantacao_valor, desconto_mensalidade_valor, desconto_implantacao_tipo, desconto_mensalidade_tipo, valor_implantacao_original, valor_mensalidade_original, financeiro_status, tipo_pedido, plano_id, contrato_id, modulos_adicionais, cliente_id")
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
      setPedidos((pedidosData || []) as PedidoRow[]);

      // Planos
      const { data: planosData } = await supabase
        .from("planos")
        .select("id, nome");
      setPlanos((planosData || []) as PlanoInfo[]);

      // Contratos ZapSign do período (via contratos criados no período)
      const contratoIds = (pedidosData || [])
        .filter((p: any) => p.contrato_id)
        .map((p: any) => p.contrato_id);

      if (contratoIds.length > 0) {
        const { data: zapsignData } = await supabase
          .from("contratos_zapsign")
          .select("contrato_id, status")
          .in("contrato_id", contratoIds);
        setContratosZapsign((zapsignData || []) as ContratoZapsign[]);
      } else {
        setContratosZapsign([]);
      }

      setLoading(false);
    }

    if (filialId || isOnlyVendedor) fetchData();
  }, [filialId, vendedorId, mes, ano, isOnlyVendedor, user]);

  // Computed stats
  const stats = useMemo(() => {
    const aprovados = pedidos.filter(p => p.financeiro_status === "Aprovado");

    const totalPedidos = pedidos.length;
    const vendasTotal = pedidos.reduce((s, p) => s + (p.valor_total || 0), 0);
    const valorImplantacao = pedidos.reduce((s, p) => s + (p.valor_implantacao_final || 0), 0);
    const valorMensal = pedidos.reduce((s, p) => s + (p.valor_mensalidade_final || 0), 0);

    // Descontos em valor real
    let descontosTotal = 0;
    pedidos.forEach(p => {
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

    // Upsell = Aditivo (módulo adicional para cliente existente)
    const upsellPedidos = pedidos.filter(p => p.tipo_pedido === "Aditivo");
    const upsellCount = upsellPedidos.length;
    const upsellValor = upsellPedidos.reduce((s, p) => s + (p.valor_total || 0), 0);

    // Upgrades
    const upgradePedidos = pedidos.filter(p => p.tipo_pedido === "Upgrade");
    const upgradeCount = upgradePedidos.length;
    const upgradeValor = upgradePedidos.reduce((s, p) => s + (p.valor_total || 0), 0);

    // Contratos
    const assinados = contratosZapsign.filter(c => c.status === "Assinado").length;
    const pendentes = contratosZapsign.filter(c => c.status !== "Assinado").length;

    // Vendas por plano
    const vendasPorPlano: Record<string, { nome: string; count: number; valor: number }> = {};
    pedidos.forEach(p => {
      const plano = planos.find(pl => pl.id === p.plano_id);
      const nome = plano?.nome || "Sem plano";
      if (!vendasPorPlano[p.plano_id || "sem"]) {
        vendasPorPlano[p.plano_id || "sem"] = { nome, count: 0, valor: 0 };
      }
      vendasPorPlano[p.plano_id || "sem"].count++;
      vendasPorPlano[p.plano_id || "sem"].valor += p.valor_total || 0;
    });
    const vendasPorPlanoArr = Object.values(vendasPorPlano)
      .sort((a, b) => b.count - a.count);

    // Vendidos por tipo (produtos/adicionais)
    const porTipo: Record<string, number> = {};
    pedidos.forEach(p => {
      const tipo = p.tipo_pedido || "Outro";
      porTipo[tipo] = (porTipo[tipo] || 0) + 1;
    });
    const porTipoArr = Object.entries(porTipo)
      .map(([name, value]) => ({ name: traduzirTipo(name), value }))
      .sort((a, b) => b.value - a.value);

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
      assinados,
      pendentes,
      vendasPorPlanoArr,
      porTipoArr,
    };
  }, [pedidos, planos, contratosZapsign]);

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

  function fmtBRL(v: number) {
    return v.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
  }

  const canSeeAllFiliais = isGlobal || isAdmin || roles.includes("financeiro");

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
            label="Pedidos no Mês"
            value={loading ? "..." : stats.totalPedidos.toString()}
            icon={ShoppingCart}
            color="text-primary bg-primary/10"
            loading={loading}
          />
          <KPICard
            label="Vendas Total"
            value={loading ? "..." : fmtBRL(stats.vendasTotal)}
            icon={DollarSign}
            color="text-chart-2 bg-chart-2/10"
            loading={loading}
          />
          <KPICard
            label="Valor Implantação"
            value={loading ? "..." : fmtBRL(stats.valorImplantacao)}
            icon={TrendingUp}
            color="text-chart-1 bg-chart-1/10"
            loading={loading}
          />
          <KPICard
            label="Valor Mensal"
            value={loading ? "..." : fmtBRL(stats.valorMensal)}
            icon={DollarSign}
            color="text-chart-3 bg-chart-3/10"
            loading={loading}
          />
        </div>

        {/* KPI Cards - Row 2 */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <KPICard
            label="Descontos Aplicados"
            value={loading ? "..." : fmtBRL(stats.descontosTotal)}
            icon={Percent}
            color="text-destructive bg-destructive/10"
            loading={loading}
          />
          <KPICard
            label="Upsell (Mód. Adicional)"
            value={loading ? "..." : `${stats.upsellCount}`}
            subtitle={loading ? undefined : fmtBRL(stats.upsellValor)}
            icon={ArrowUpRight}
            color="text-chart-4 bg-chart-4/10"
            loading={loading}
          />
          <KPICard
            label="Upgrades"
            value={loading ? "..." : `${stats.upgradeCount}`}
            subtitle={loading ? undefined : fmtBRL(stats.upgradeValor)}
            icon={TrendingUp}
            color="text-chart-5 bg-chart-5/10"
            loading={loading}
          />
          <div className="bg-card rounded-xl p-5 shadow-card border border-border">
            <div className="flex items-center justify-between mb-3">
              <div className="h-9 w-9 rounded-lg flex items-center justify-center text-primary bg-primary/10">
                <FileSignature className="h-4 w-4" />
              </div>
            </div>
            <div className={`transition-opacity ${loading ? "opacity-40" : ""}`}>
              <div className="flex items-center gap-3">
                <div className="text-center">
                  <p className="text-2xl font-bold text-chart-1">{loading ? "..." : stats.assinados}</p>
                  <p className="text-[10px] text-muted-foreground">Assinados</p>
                </div>
                <div className="h-8 w-px bg-border" />
                <div className="text-center">
                  <p className="text-2xl font-bold text-amber-500">{loading ? "..." : stats.pendentes}</p>
                  <p className="text-[10px] text-muted-foreground">Pendentes</p>
                </div>
              </div>
            </div>
            <p className="text-xs text-muted-foreground mt-2">Contratos</p>
          </div>
        </div>

        {/* Charts */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {/* Venda por Plano */}
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-base font-semibold flex items-center gap-2">
                <Package className="h-4 w-4 text-primary" />
                Venda por Plano
              </CardTitle>
            </CardHeader>
            <CardContent>
              {loading ? (
                <div className="h-64 flex items-center justify-center text-muted-foreground text-sm">Carregando...</div>
              ) : stats.vendasPorPlanoArr.length === 0 ? (
                <div className="h-64 flex items-center justify-center text-muted-foreground text-sm">Sem dados no período</div>
              ) : (
                <ChartContainer config={chartConfigPlano} className="h-64 w-full">
                  <BarChart data={stats.vendasPorPlanoArr} layout="vertical" margin={{ left: 0, right: 16, top: 8, bottom: 8 }}>
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
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-base font-semibold flex items-center gap-2">
                <TrendingUp className="h-4 w-4 text-primary" />
                Vendas por Tipo
              </CardTitle>
            </CardHeader>
            <CardContent>
              {loading ? (
                <div className="h-64 flex items-center justify-center text-muted-foreground text-sm">Carregando...</div>
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
}: {
  label: string;
  value: string;
  subtitle?: string;
  icon: React.ComponentType<{ className?: string }>;
  color: string;
  loading: boolean;
}) {
  return (
    <div className="bg-card rounded-xl p-5 shadow-card border border-border">
      <div className="flex items-center justify-between mb-3">
        <div className={`h-9 w-9 rounded-lg flex items-center justify-center ${color}`}>
          <Icon className="h-4 w-4" />
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
