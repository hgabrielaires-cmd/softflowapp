import { useAuth } from "@/context/AuthContext";
import { AppLayout } from "@/components/AppLayout";
import { ROLE_LABELS, ROLE_COLORS, AppRole } from "@/lib/supabase-types";
import {
  ShoppingCart,
  DollarSign,
  Calendar,
  Users,
  TrendingUp,
  Clock,
} from "lucide-react";

const stats = [
  { label: "Pedidos este mês", value: "—", icon: ShoppingCart, color: "text-blue-600 bg-blue-50" },
  { label: "Faturamento", value: "—", icon: DollarSign, color: "text-emerald bg-emerald-light" },
  { label: "Agendamentos", value: "—", icon: Calendar, color: "text-orange-600 bg-orange-50" },
  { label: "Usuários ativos", value: "—", icon: Users, color: "text-purple-600 bg-purple-50" },
];

export default function Dashboard() {
  const { profile, roles } = useAuth();
  const firstName = profile?.full_name?.split(" ")[0] || "usuário";

  return (
    <AppLayout>
      <div className="space-y-6">
        {/* Welcome */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-foreground">
              Olá, {firstName} 👋
            </h1>
            <p className="text-muted-foreground text-sm mt-0.5">
              Bem-vindo ao portal interno da Softplus Tecnologia
            </p>
          </div>
          <div className="flex gap-2">
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

        {/* Stats */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {stats.map((stat) => {
            const Icon = stat.icon;
            return (
              <div
                key={stat.label}
                className="bg-card rounded-xl p-5 shadow-card border border-border"
              >
                <div className="flex items-center justify-between mb-3">
                  <div className={`h-9 w-9 rounded-lg flex items-center justify-center ${stat.color}`}>
                    <Icon className="h-4 w-4" />
                  </div>
                  <TrendingUp className="h-4 w-4 text-muted-foreground" />
                </div>
                <p className="text-2xl font-bold text-foreground">{stat.value}</p>
                <p className="text-xs text-muted-foreground mt-1">{stat.label}</p>
              </div>
            );
          })}
        </div>

        {/* Info card */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          <div className="bg-card rounded-xl p-6 border border-border shadow-card">
            <div className="flex items-center gap-2 mb-4">
              <Clock className="h-5 w-5 text-emerald" />
              <h3 className="font-semibold text-foreground">Próximas etapas</h3>
            </div>
            <div className="space-y-3">
              {[
                { label: "Módulo 1", desc: "Base de usuários e permissões", done: true },
                { label: "Módulo 2", desc: "Pedidos de venda", done: false },
                { label: "Módulo 3", desc: "Aprovação financeira e contratos", done: false },
                { label: "Módulo 4", desc: "Comissões automáticas", done: false },
                { label: "Módulo 5", desc: "Agenda operacional", done: false },
              ].map((item) => (
                <div key={item.label} className="flex items-center gap-3">
                  <div className={`h-5 w-5 rounded-full border-2 flex items-center justify-center flex-shrink-0 ${
                    item.done
                      ? "border-emerald bg-emerald"
                      : "border-border bg-background"
                  }`}>
                    {item.done && <span className="text-white text-xs">✓</span>}
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
            <p className="text-blue-200 text-sm leading-relaxed mb-4">
              Esta é a base do portal interno da Softplus. Os módulos serão adicionados progressivamente conforme o planejamento.
            </p>
            <div className="grid grid-cols-2 gap-2">
              {[
                "Pedidos de venda",
                "Aprovação financeira",
                "Comissão automática",
                "Agenda operacional",
              ].map((feat) => (
                <div key={feat} className="text-xs bg-white/10 rounded-lg px-3 py-2 text-blue-100">
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
