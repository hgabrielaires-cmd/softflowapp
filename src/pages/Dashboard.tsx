import { useEffect, useState } from "react";
import { useAuth } from "@/context/AuthContext";
import { AppLayout } from "@/components/AppLayout";
import { ROLE_LABELS, ROLE_COLORS, AppRole, Filial } from "@/lib/supabase-types";
import { supabase } from "@/integrations/supabase/client";
import {
  ShoppingCart,
  DollarSign,
  TrendingUp,
  Users,
  ChevronLeft,
  ChevronRight,
  Building2,
} from "lucide-react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Button } from "@/components/ui/button";

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

export default function Dashboard() {
  const { profile, roles, isAdmin } = useAuth();
  const firstName = profile?.full_name?.split(" ")[0] || "usuário";

  // Verifica se pode ver todas as filiais (admin ou financeiro)
  const canSeeAllFiliais = isAdmin || roles.includes("financeiro");

  const [filiais, setFiliais] = useState<Filial[]>([]);
  const [filialId, setFilialId] = useState<string>("");

  // Filtro de mês/ano
  const now = new Date();
  const [mes, setMes] = useState(now.getMonth()); // 0-11
  const [ano, setAno] = useState(now.getFullYear());

  const [stats, setStats] = useState<DashboardStats>({
    totalPedidos: 0,
    valorTotal: 0,
    comissaoTotal: 0,
    pedidosAprovados: 0,
  });
  const [loadingStats, setLoadingStats] = useState(true);

  // Carrega filiais e define filial padrão
  useEffect(() => {
    async function init() {
      // Busca filial favorita do perfil
      const favoritaId = (profile as any)?.filial_favorita_id || profile?.filial_id || "";

      if (canSeeAllFiliais) {
        const { data } = await supabase
          .from("filiais")
          .select("*")
          .eq("ativa", true)
          .order("nome");
        if (data) setFiliais(data as Filial[]);
        setFilialId(favoritaId || "todas");
      } else {
        // Usuário restrito: usa a filial vinculada ao perfil
        setFilialId(favoritaId || profile?.filial_id || "");
      }
    }
    if (profile) init();
  }, [profile, canSeeAllFiliais]);

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

    if (filialId !== "" || !canSeeAllFiliais) fetchStats();
  }, [filialId, mes, ano, canSeeAllFiliais]);

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

  const filialAtual =
    filialId === "todas"
      ? "Todas as filiais"
      : filiais.find(f => f.id === filialId)?.nome || profile?.filial_id
        ? filiais.find(f => f.id === (filialId || profile?.filial_id))?.nome
        : "—";

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
              Bem-vindo ao Softflow Desk Suite
            </p>
          </div>
          <div className="flex gap-2 flex-wrap">
            {roles.map((role) => (
              <span
                key={role}
                className={`px-2.5 py-1 rounded-md text-xs font-medium border ${ROLE_COLORS[role as AppRole]}`}
              >
                {ROLE_LABELS[role as AppRole]}
              </span>
            ))}
          </div>
        </div>

        {/* Filtros */}
        <div className="flex flex-col sm:flex-row gap-3 items-start sm:items-center">

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
                  {filiais.map(f => (
                    <SelectItem key={f.id} value={f.id}>{f.nome}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            ) : (
              <span className="text-sm font-medium text-foreground bg-muted px-3 py-2 rounded-lg border border-border">
                {filialAtual || "—"}
              </span>
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
