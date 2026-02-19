import { ReactNode, useState, useEffect } from "react";
import iconSoftflow from "@/assets/icon-softflow.png";
import logoSoftflowBranca from "@/assets/logo-softflow-branca.png";
import { NavLink, useNavigate, useLocation } from "react-router-dom";
import { useAuth } from "@/context/AuthContext";
import {
  LayoutDashboard,
  Users,
  ShoppingCart,
  DollarSign,
  Calendar,
  Building2,
  ChevronLeft,
  ChevronRight,
  ChevronDown,
  LogOut,
  Bell,
  User,
  Menu,
  UserCheck,
  BookOpen,
  Headphones,
  Ticket,
  FileText,
  TrendingUp,
  TrendingDown,
  BarChart3,
  Plug,
  ListOrdered,
  PlusCircle,
  Inbox,
  Percent,
  Check,
  X,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { AppRole, ROLE_LABELS, Profile } from "@/lib/supabase-types";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";

// ─── Types ───────────────────────────────────────────────────────────────────

interface NavSubItem {
  icon: ReactNode;
  label: string;
  to: string;
  roles?: AppRole[];
}

interface NavGroup {
  groupLabel: string;
  groupIcon: ReactNode;
  roles?: AppRole[]; // if set, entire group is hidden for roles NOT in list
  items: NavSubItem[];
}

// ─── Navigation Definition ───────────────────────────────────────────────────

const navGroups: NavGroup[] = [
  {
    groupLabel: "Dashboard",
    groupIcon: <LayoutDashboard className="h-4 w-4" />,
    items: [
      { icon: <LayoutDashboard className="h-4 w-4" />, label: "Dashboard Geral", to: "/dashboard" },
    ],
  },
  {
    groupLabel: "Helpdesk",
    groupIcon: <Headphones className="h-4 w-4" />,
    items: [
      { icon: <Calendar className="h-4 w-4" />, label: "Agenda Operacional", to: "/agenda" },
      { icon: <Ticket className="h-4 w-4" />, label: "Tickets", to: "/tickets" },
    ],
  },
  {
    groupLabel: "Cadastros",
    groupIcon: <UserCheck className="h-4 w-4" />,
    items: [
      { icon: <UserCheck className="h-4 w-4" />, label: "Clientes", to: "/clientes" },
      { icon: <Users className="h-4 w-4" />, label: "Usuários", to: "/usuarios", roles: ["admin"] },
      { icon: <BookOpen className="h-4 w-4" />, label: "Planos", to: "/planos", roles: ["admin"] },
    ],
  },
  {
    groupLabel: "Vendas",
    groupIcon: <ShoppingCart className="h-4 w-4" />,
    roles: ["admin", "financeiro", "vendedor"],
    items: [
      { icon: <ListOrdered className="h-4 w-4" />, label: "Pedidos", to: "/pedidos" },
    ],
  },
  {
    groupLabel: "Financeiro",
    groupIcon: <DollarSign className="h-4 w-4" />,
    roles: ["admin", "financeiro", "vendedor"],
    items: [
      { icon: <Inbox className="h-4 w-4" />, label: "Fila do Financeiro", to: "/financeiro", roles: ["admin", "financeiro"] },
      { icon: <FileText className="h-4 w-4" />, label: "Contratos", to: "/contratos" },
      { icon: <TrendingUp className="h-4 w-4" />, label: "Receitas", to: "/receitas" },
      { icon: <TrendingDown className="h-4 w-4" />, label: "Despesas", to: "/despesas", roles: ["admin", "financeiro"] },
      { icon: <BarChart3 className="h-4 w-4" />, label: "DRE", to: "/dre", roles: ["admin", "financeiro"] },
    ],
  },
  {
    groupLabel: "Parâmetros",
    groupIcon: <Building2 className="h-4 w-4" />,
    roles: ["admin"],
    items: [
      { icon: <Building2 className="h-4 w-4" />, label: "Filiais", to: "/filiais" },
      { icon: <Plug className="h-4 w-4" />, label: "Integrações", to: "/integracoes" },
    ],
  },
];

// ─── Helpers ─────────────────────────────────────────────────────────────────

function groupVisible(group: NavGroup, roles: AppRole[]): boolean {
  if (!group.roles) return true;
  return group.roles.some((r) => roles.includes(r));
}

function itemVisible(item: NavSubItem, roles: AppRole[]): boolean {
  if (!item.roles) return true;
  return item.roles.some((r) => roles.includes(r));
}

function visibleItemsInGroup(group: NavGroup, roles: AppRole[]): NavSubItem[] {
  return group.items.filter((item) => itemVisible(item, roles));
}

// ─── Sidebar Component ────────────────────────────────────────────────────────

interface SidebarProps {
  collapsed: boolean;
  profile: Profile | null;
  roles: AppRole[];
  initials: string;
  onNavigate: (path: string) => void;
  onSignOut: () => void;
  onMobileClose?: () => void;
}

function Sidebar({ collapsed, profile, roles, initials, onNavigate, onSignOut, onMobileClose }: SidebarProps) {
  const location = useLocation();

  // Determine which groups start open (the one containing the active route)
  const initialOpen = navGroups.reduce<Record<string, boolean>>((acc, group) => {
    const hasActive = group.items.some((item) => location.pathname === item.to || location.pathname.startsWith(item.to + "/"));
    acc[group.groupLabel] = hasActive;
    return acc;
  }, {});

  const [openGroups, setOpenGroups] = useState<Record<string, boolean>>(initialOpen);

  function toggleGroup(label: string) {
    setOpenGroups((prev) => ({ ...prev, [label]: !prev[label] }));
  }

  return (
    <div className="flex flex-col h-full">
      {/* Logo */}
      <div className={cn(
        "flex items-center gap-3 px-4 py-5 border-b border-sidebar-border flex-shrink-0",
        collapsed && "justify-center px-2"
      )}>
        {collapsed ? (
          <img src={iconSoftflow} alt="Softflow" className="h-8 w-8 object-contain" style={{ filter: 'brightness(0) invert(1)' }} />
        ) : (
          <img src={logoSoftflowBranca} alt="Softflow" className="h-12 object-contain mx-auto" />
        )}
      </div>

      {/* Nav */}
      <nav className="flex-1 px-2 py-3 space-y-0.5 overflow-y-auto">
        {navGroups.map((group) => {
          if (!groupVisible(group, roles)) return null;
          const items = visibleItemsInGroup(group, roles);
          if (items.length === 0) return null;

          const isGroupActive = items.some(
            (item) => location.pathname === item.to || location.pathname.startsWith(item.to + "/")
          );
          const isOpen = openGroups[group.groupLabel] ?? false;

          if (collapsed) {
            // In collapsed mode: just show icons for each item
            return (
              <div key={group.groupLabel} className="space-y-0.5">
                {items.map((item) => {
                  const active = location.pathname === item.to || location.pathname.startsWith(item.to + "/");
                  return (
                    <NavLink
                      key={item.to}
                      to={item.to}
                      onClick={onMobileClose}
                      title={item.label}
                      className={cn(
                        "flex items-center justify-center p-2 rounded-lg transition-all duration-150",
                        active
                          ? "bg-sidebar-primary text-sidebar-primary-foreground"
                          : "text-sidebar-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground"
                      )}
                    >
                      <span className="flex-shrink-0">{item.icon}</span>
                    </NavLink>
                  );
                })}
                <div className="border-b border-sidebar-border/30 my-1" />
              </div>
            );
          }

          // Expanded: collapsible group
          return (
            <Collapsible key={group.groupLabel} open={isOpen} onOpenChange={() => toggleGroup(group.groupLabel)}>
              <CollapsibleTrigger asChild>
                <button
                  className={cn(
                    "flex items-center justify-between w-full px-3 py-2 rounded-lg text-xs font-semibold uppercase tracking-wider transition-all duration-150 select-none",
                    isGroupActive
                      ? "text-sidebar-primary-foreground/90"
                      : "text-sidebar-foreground/50 hover:text-sidebar-foreground/80"
                  )}
                >
                  <div className="flex items-center gap-2">
                    <span className={cn("flex-shrink-0", isGroupActive ? "text-sidebar-primary-foreground/90" : "text-sidebar-foreground/40")}>
                      {group.groupIcon}
                    </span>
                    <span>{group.groupLabel}</span>
                  </div>
                  <ChevronDown
                    className={cn(
                      "h-3 w-3 transition-transform duration-200 text-sidebar-foreground/40",
                      isOpen && "rotate-180"
                    )}
                  />
                </button>
              </CollapsibleTrigger>

              <CollapsibleContent className="space-y-0.5 overflow-hidden data-[state=closed]:animate-accordion-up data-[state=open]:animate-accordion-down">
                <div className="pt-0.5 pb-1 space-y-0.5">
                  {items.map((item) => {
                    const active = location.pathname === item.to || location.pathname.startsWith(item.to + "/");
                    return (
                      <NavLink
                        key={item.to}
                        to={item.to}
                        onClick={onMobileClose}
                        className={cn(
                          "flex items-center gap-3 pl-8 pr-3 py-2 rounded-lg text-sm font-medium transition-all duration-150",
                          active
                            ? "bg-sidebar-primary text-sidebar-primary-foreground"
                            : "text-sidebar-foreground/80 hover:bg-sidebar-accent hover:text-sidebar-accent-foreground"
                        )}
                      >
                        <span className="flex-shrink-0 opacity-70">{item.icon}</span>
                        <span>{item.label}</span>
                      </NavLink>
                    );
                  })}
                </div>
              </CollapsibleContent>
            </Collapsible>
          );
        })}
      </nav>

      {/* User info */}
      <div className={cn(
        "border-t border-sidebar-border p-3 flex-shrink-0",
        collapsed ? "flex justify-center" : ""
      )}>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button className={cn(
              "flex items-center gap-3 rounded-lg p-2 w-full hover:bg-sidebar-accent transition-colors",
              collapsed && "w-auto justify-center"
            )}>
              <Avatar className="h-8 w-8 flex-shrink-0">
                <AvatarFallback className="bg-sidebar-primary text-sidebar-primary-foreground text-xs font-bold">
                  {initials}
                </AvatarFallback>
              </Avatar>
              {!collapsed && (
                <div className="text-left overflow-hidden flex-1">
                  <p className="text-sidebar-foreground text-sm font-medium truncate leading-tight">
                    {profile?.full_name || "Usuário"}
                  </p>
                </div>
              )}
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" side="top" className="w-52">
            <DropdownMenuLabel className="font-normal">
              <p className="font-semibold text-sm">{profile?.full_name}</p>
              <p className="text-xs text-muted-foreground">{profile?.email}</p>
            </DropdownMenuLabel>
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={() => onNavigate("/perfil")}>
              <User className="mr-2 h-4 w-4" />
              Meu perfil
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={onSignOut} className="text-destructive focus:text-destructive">
              <LogOut className="mr-2 h-4 w-4" />
              Sair
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </div>
  );
}

// ─── Notification Bell ────────────────────────────────────────────────────────

interface SolicitacaoDesconto {
  id: string;
  pedido_id: string;
  vendedor_id: string;
  desconto_implantacao_percentual: number;
  desconto_mensalidade_percentual: number;
  desconto_implantacao_tipo: string;
  desconto_implantacao_valor: number;
  desconto_mensalidade_tipo: string;
  desconto_mensalidade_valor: number;
  status: string;
  observacoes: string | null;
  created_at: string;
  pedidos?: { clientes?: { nome_fantasia: string } | null; valor_implantacao_final?: number; valor_mensalidade_final?: number } | null;
  profiles?: { full_name: string } | null;
}

function NotificationBell({ profile }: { profile: Profile | null }) {
  const [solicitacoes, setSolicitacoes] = useState<SolicitacaoDesconto[]>([]);
  const [open, setOpen] = useState(false);
  const [processingId, setProcessingId] = useState<string | null>(null);
  const [motivoReprova, setMotivoReprova] = useState<Record<string, string>>({});

  const isGestor = (profile as any)?.gestor_desconto === true;

  async function loadSolicitacoes() {
    if (!isGestor && !(profile as any)?.gestor_desconto) return;
    const { data } = await supabase
      .from("solicitacoes_desconto")
      .select("*, pedidos(valor_implantacao_final, valor_mensalidade_final, clientes(nome_fantasia))")
      .eq("status", "Aguardando")
      .order("created_at", { ascending: false });

    // Enrich with vendor name
    const enriched = await Promise.all((data || []).map(async (sol: any) => {
      const { data: prof } = await supabase
        .from("profiles")
        .select("full_name")
        .eq("user_id", sol.vendedor_id)
        .single();
      return { ...sol, profiles: prof };
    }));
    setSolicitacoes(enriched as SolicitacaoDesconto[]);
  }

  useEffect(() => {
    if (profile) loadSolicitacoes();
  }, [profile]);

  async function handleAprovar(sol: SolicitacaoDesconto) {
    setProcessingId(sol.id);
    // Atualizar solicitação
    await supabase.from("solicitacoes_desconto").update({
      status: "Aprovado",
      aprovado_por: profile?.user_id,
      aprovado_em: new Date().toISOString(),
    }).eq("id", sol.id);
    // Liberar pedido para o financeiro
    await supabase.from("pedidos").update({
      status_pedido: "Aguardando Financeiro",
    }).eq("id", sol.pedido_id);
    toast.success("Desconto aprovado! Pedido liberado para o financeiro.");
    setProcessingId(null);
    loadSolicitacoes();
  }

  async function handleReprovar(sol: SolicitacaoDesconto) {
    const motivo = motivoReprova[sol.id] || "";
    setProcessingId(sol.id);
    await supabase.from("solicitacoes_desconto").update({
      status: "Reprovado",
      aprovado_por: profile?.user_id,
      aprovado_em: new Date().toISOString(),
      motivo_reprovacao: motivo || null,
    }).eq("id", sol.id);
    // Voltar pedido para reprovado
    await supabase.from("pedidos").update({
      status_pedido: "Reprovado Financeiro",
      financeiro_status: "Reprovado",
      financeiro_motivo: motivo ? `Desconto reprovado: ${motivo}` : "Desconto reprovado pelo gestor",
    }).eq("id", sol.pedido_id);
    toast.error("Desconto reprovado. Vendedor notificado.");
    setProcessingId(null);
    setMotivoReprova((prev) => { const n = { ...prev }; delete n[sol.id]; return n; });
    loadSolicitacoes();
  }

  if (!isGestor) {
    return (
      <Button variant="ghost" size="icon" className="h-8 w-8 relative">
        <Bell className="h-4 w-4" />
      </Button>
    );
  }

  return (
    <DropdownMenu open={open} onOpenChange={(v) => { setOpen(v); if (v) loadSolicitacoes(); }}>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="icon" className="h-8 w-8 relative">
          <Bell className="h-4 w-4" />
          {solicitacoes.length > 0 && (
            <span className="absolute -top-0.5 -right-0.5 h-4 w-4 rounded-full bg-destructive text-destructive-foreground text-[10px] font-bold flex items-center justify-center">
              {solicitacoes.length > 9 ? "9+" : solicitacoes.length}
            </span>
          )}
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-96 p-0 max-h-[80vh] overflow-y-auto">
        <div className="px-4 py-3 border-b border-border flex items-center gap-2">
          <Percent className="h-4 w-4 text-primary" />
          <p className="font-semibold text-sm">Aprovações de Desconto</p>
          {solicitacoes.length > 0 && (
            <span className="ml-auto text-xs bg-destructive text-destructive-foreground rounded-full px-2 py-0.5 font-medium">
              {solicitacoes.length} pendente{solicitacoes.length > 1 ? "s" : ""}
            </span>
          )}
        </div>
        {solicitacoes.length === 0 ? (
          <div className="px-4 py-8 text-center text-sm text-muted-foreground">
            <Bell className="h-8 w-8 mx-auto mb-2 opacity-30" />
            Nenhuma aprovação pendente
          </div>
        ) : (
          <div className="divide-y divide-border">
            {solicitacoes.map((sol) => {
              const cliente = (sol.pedidos as any)?.clientes?.nome_fantasia || "—";
              const vendedor = (sol as any).profiles?.full_name || "—";
              const isProcessing = processingId === sol.id;
              return (
                <div key={sol.id} className="p-4 space-y-3">
                  <div>
                    <p className="text-sm font-semibold text-foreground">{cliente}</p>
                    <p className="text-xs text-muted-foreground">Vendedor: {vendedor}</p>
                  </div>
                  <div className="grid grid-cols-2 gap-2 text-xs bg-muted rounded-lg p-2.5">
                    {sol.desconto_implantacao_percentual > 0 && (
                      <div>
                        <p className="text-muted-foreground">Implantação</p>
                        <p className="font-semibold text-foreground">{sol.desconto_implantacao_tipo === "%" ? `${sol.desconto_implantacao_percentual.toFixed(1)}%` : `R$ ${sol.desconto_implantacao_valor}`}</p>
                        <p className="text-muted-foreground">({sol.desconto_implantacao_percentual.toFixed(1)}% do valor)</p>
                      </div>
                    )}
                    {sol.desconto_mensalidade_percentual > 0 && (
                      <div>
                        <p className="text-muted-foreground">Mensalidade</p>
                        <p className="font-semibold text-foreground">{sol.desconto_mensalidade_tipo === "%" ? `${sol.desconto_mensalidade_percentual.toFixed(1)}%` : `R$ ${sol.desconto_mensalidade_valor}`}</p>
                        <p className="text-muted-foreground">({sol.desconto_mensalidade_percentual.toFixed(1)}% do valor)</p>
                      </div>
                    )}
                  </div>
                  <div className="space-y-2">
                    <textarea
                      className="w-full text-xs rounded-md border border-input bg-background px-2.5 py-1.5 resize-none focus:outline-none focus:ring-1 focus:ring-ring"
                      rows={2}
                      placeholder="Motivo (opcional para reprovação)..."
                      value={motivoReprova[sol.id] || ""}
                      onChange={(e) => setMotivoReprova((prev) => ({ ...prev, [sol.id]: e.target.value }))}
                    />
                    <div className="flex gap-2">
                      <Button
                        size="sm"
                        className="flex-1 h-7 text-xs bg-emerald-600 hover:bg-emerald-700 text-white"
                        disabled={isProcessing}
                        onClick={() => handleAprovar(sol)}
                      >
                        <Check className="h-3 w-3 mr-1" /> Aprovar
                      </Button>
                      <Button
                        size="sm"
                        variant="destructive"
                        className="flex-1 h-7 text-xs"
                        disabled={isProcessing}
                        onClick={() => handleReprovar(sol)}
                      >
                        <X className="h-3 w-3 mr-1" /> Reprovar
                      </Button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

// ─── AppLayout ────────────────────────────────────────────────────────────────

interface AppLayoutProps {
  children: ReactNode;
}

export function AppLayout({ children }: AppLayoutProps) {
  const { profile, roles, signOut } = useAuth();
  const navigate = useNavigate();
  const [collapsed, setCollapsed] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);

  const initials = profile?.full_name
    ? profile.full_name.split(" ").map((n) => n[0]).join("").slice(0, 2).toUpperCase()
    : "??";

  async function handleSignOut() {
    await signOut();
    toast.success("Sessão encerrada com sucesso");
  }

  return (
    <div className="flex min-h-screen bg-background">
      {/* Desktop Sidebar */}
      <aside
        className={cn(
          "hidden lg:flex flex-col transition-all duration-300 flex-shrink-0 relative",
          collapsed ? "w-16" : "w-60"
        )}
        style={{ background: 'hsl(var(--sidebar-background))' }}
      >
        <Sidebar
          collapsed={collapsed}
          profile={profile}
          roles={roles}
          initials={initials}
          onNavigate={navigate}
          onSignOut={handleSignOut}
        />
        {/* Collapse toggle */}
        <button
          onClick={() => setCollapsed(!collapsed)}
          className="absolute right-0 top-1/2 -translate-y-1/2 translate-x-full h-6 w-4 flex items-center justify-center rounded-r-md text-sidebar-foreground/60 hover:text-sidebar-foreground transition-colors z-10"
          style={{ background: 'hsl(var(--sidebar-border))' }}
        >
          {collapsed ? <ChevronRight className="h-3 w-3" /> : <ChevronLeft className="h-3 w-3" />}
        </button>
      </aside>

      {/* Mobile sidebar overlay */}
      {mobileOpen && (
        <div className="lg:hidden fixed inset-0 z-50 flex">
          <div className="fixed inset-0 bg-black/50" onClick={() => setMobileOpen(false)} />
          <aside className="relative w-64 flex flex-col z-50" style={{ background: 'hsl(var(--sidebar-background))' }}>
            <Sidebar
              collapsed={false}
              profile={profile}
              roles={roles}
              initials={initials}
              onNavigate={navigate}
              onSignOut={handleSignOut}
              onMobileClose={() => setMobileOpen(false)}
            />
          </aside>
        </div>
      )}

      {/* Main content */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Header */}
        <header className="h-14 border-b border-border bg-card flex items-center justify-between px-4 lg:px-6 flex-shrink-0">
          <div className="flex items-center gap-3">
            <Button
              variant="ghost"
              size="icon"
              className="lg:hidden h-8 w-8"
              onClick={() => setMobileOpen(true)}
            >
              <Menu className="h-4 w-4" />
            </Button>
          </div>

          <div className="flex items-center gap-2">
            <NotificationBell profile={profile} />
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Avatar className="h-8 w-8 cursor-pointer">
                  <AvatarFallback className="bg-primary text-primary-foreground text-xs font-bold">
                    {initials}
                  </AvatarFallback>
                </Avatar>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-52">
                <DropdownMenuLabel className="font-normal">
                  <p className="font-semibold text-sm">{profile?.full_name}</p>
                  <p className="text-xs text-muted-foreground">{profile?.email}</p>
                </DropdownMenuLabel>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={() => navigate("/perfil")}>
                  <User className="mr-2 h-4 w-4" />
                  Meu perfil
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={handleSignOut} className="text-destructive focus:text-destructive">
                  <LogOut className="mr-2 h-4 w-4" />
                  Sair
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </header>

        {/* Page content */}
        <main className="flex-1 overflow-auto p-4 lg:p-6">
          {children}
        </main>
      </div>
    </div>
  );
}
