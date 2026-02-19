import { ReactNode, useState, useEffect } from "react";
import iconSoftflow from "@/assets/icon-softflow.png";
import logoSoftflowBranca from "@/assets/logo-softflow-branca.png";
import { NavLink, useNavigate, useLocation } from "react-router-dom";
import { useAuth } from "@/context/AuthContext";
import {
  LayoutDashboard, Users, ShoppingCart, DollarSign, Calendar, Building2,
  ChevronLeft, ChevronRight, ChevronDown, LogOut, Bell, User, Menu,
  UserCheck, BookOpen, Headphones, Ticket, FileText, TrendingUp, TrendingDown,
  BarChart3, Plug, ListOrdered, Inbox, Percent, Check, X,
  Info, AlertTriangle, Zap, Globe,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem,
  DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger,
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
  roles?: AppRole[];
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
      { icon: <BookOpen className="h-4 w-4" />, label: "Planos", to: "/planos", roles: ["admin"] },
      { icon: <Building2 className="h-4 w-4" />, label: "Fornecedores", to: "/fornecedores", roles: ["admin", "financeiro"] },
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
      { icon: <Users className="h-4 w-4" />, label: "Usuários", to: "/usuarios" },
      { icon: <Globe className="h-4 w-4" />, label: "Perfis de Usuário", to: "/perfis-usuario" },
      { icon: <FileText className="h-4 w-4" />, label: "Modelos de Contrato", to: "/modelos-contrato" },
      { icon: <Bell className="h-4 w-4" />, label: "Notificações", to: "/notificacoes" },
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
      <div className={cn("flex items-center gap-3 px-4 py-5 border-b border-sidebar-border flex-shrink-0", collapsed && "justify-center px-2")}>
        {collapsed ? (
          <img src={iconSoftflow} alt="Softflow" className="h-8 w-8 object-contain" style={{ filter: 'brightness(0) invert(1)' }} />
        ) : (
          <img src={logoSoftflowBranca} alt="Softflow" className="h-12 object-contain mx-auto" />
        )}
      </div>

      <nav className="flex-1 px-2 py-3 space-y-0.5 overflow-y-auto">
        {navGroups.map((group) => {
          if (!groupVisible(group, roles)) return null;
          const items = visibleItemsInGroup(group, roles);
          if (items.length === 0) return null;

          const isGroupActive = items.some((item) => location.pathname === item.to || location.pathname.startsWith(item.to + "/"));
          const isOpen = openGroups[group.groupLabel] ?? false;

          if (collapsed) {
            return (
              <div key={group.groupLabel} className="space-y-0.5">
                {items.map((item) => {
                  const active = location.pathname === item.to || location.pathname.startsWith(item.to + "/");
                  return (
                    <NavLink key={item.to} to={item.to} onClick={onMobileClose} title={item.label}
                      className={cn("flex items-center justify-center p-2 rounded-lg transition-all duration-150",
                        active ? "bg-sidebar-primary text-sidebar-primary-foreground" : "text-sidebar-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground"
                      )}>
                      <span className="flex-shrink-0">{item.icon}</span>
                    </NavLink>
                  );
                })}
                <div className="border-b border-sidebar-border/30 my-1" />
              </div>
            );
          }

          return (
            <Collapsible key={group.groupLabel} open={isOpen} onOpenChange={() => toggleGroup(group.groupLabel)}>
              <CollapsibleTrigger asChild>
                <button className={cn("flex items-center justify-between w-full px-3 py-2 rounded-lg text-xs font-semibold uppercase tracking-wider transition-all duration-150 select-none",
                  isGroupActive ? "text-sidebar-primary-foreground/90" : "text-sidebar-foreground/50 hover:text-sidebar-foreground/80"
                )}>
                  <div className="flex items-center gap-2">
                    <span className={cn("flex-shrink-0", isGroupActive ? "text-sidebar-primary-foreground/90" : "text-sidebar-foreground/40")}>
                      {group.groupIcon}
                    </span>
                    <span>{group.groupLabel}</span>
                  </div>
                  <ChevronDown className={cn("h-3 w-3 transition-transform duration-200 text-sidebar-foreground/40", isOpen && "rotate-180")} />
                </button>
              </CollapsibleTrigger>
              <CollapsibleContent className="space-y-0.5 overflow-hidden data-[state=closed]:animate-accordion-up data-[state=open]:animate-accordion-down">
                <div className="pt-0.5 pb-1 space-y-0.5">
                  {items.map((item) => {
                    const active = location.pathname === item.to || location.pathname.startsWith(item.to + "/");
                    return (
                      <NavLink key={item.to} to={item.to} onClick={onMobileClose}
                        className={cn("flex items-center gap-3 pl-8 pr-3 py-2 rounded-lg text-sm font-medium transition-all duration-150",
                          active ? "bg-sidebar-primary text-sidebar-primary-foreground" : "text-sidebar-foreground/80 hover:bg-sidebar-accent hover:text-sidebar-accent-foreground"
                        )}>
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

      <div className={cn("border-t border-sidebar-border p-3 flex-shrink-0", collapsed ? "flex justify-center" : "")}>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button className={cn("flex items-center gap-3 rounded-lg p-2 w-full hover:bg-sidebar-accent transition-colors", collapsed && "w-auto justify-center")}>
              <Avatar className="h-8 w-8 flex-shrink-0">
                <AvatarFallback className="bg-sidebar-primary text-sidebar-primary-foreground text-xs font-bold">{initials}</AvatarFallback>
              </Avatar>
              {!collapsed && (
                <div className="text-left overflow-hidden flex-1">
                  <p className="text-sidebar-foreground text-sm font-medium truncate leading-tight">{profile?.full_name || "Usuário"}</p>
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
            <DropdownMenuItem onClick={() => onNavigate("/perfil")}><User className="mr-2 h-4 w-4" />Meu perfil</DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={onSignOut} className="text-destructive focus:text-destructive"><LogOut className="mr-2 h-4 w-4" />Sair</DropdownMenuItem>
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

interface Notificacao {
  id: string;
  titulo: string;
  mensagem: string;
  tipo: string;
  created_at: string;
}

const TIPO_ICON: Record<string, ReactNode> = {
  info: <Info className="h-4 w-4 text-primary" />,
  aviso: <AlertTriangle className="h-4 w-4 text-warning" />,
  urgente: <Zap className="h-4 w-4 text-destructive" />,
};

function NotificationBell({ profile, roles }: { profile: Profile | null; roles: AppRole[] }) {
  const [solicitacoes, setSolicitacoes] = useState<SolicitacaoDesconto[]>([]);
  const [notificacoes, setNotificacoes] = useState<Notificacao[]>([]);
  const [lidasIds, setLidasIds] = useState<Set<string>>(new Set());
  const [open, setOpen] = useState(false);
  const [processingId, setProcessingId] = useState<string | null>(null);
  const [motivoReprova, setMotivoReprova] = useState<Record<string, string>>({});

  const isAdmin = roles.includes("admin");
  const isGestor = isAdmin || (profile as any)?.gestor_desconto === true;

  async function loadSolicitacoes() {
    if (!isGestor) return;
    const { data } = await supabase
      .from("solicitacoes_desconto")
      .select("*, pedidos(valor_implantacao_final, valor_mensalidade_final, clientes(nome_fantasia))")
      .eq("status", "Aguardando")
      .order("created_at", { ascending: false });

    const enriched = await Promise.all((data || []).map(async (sol: any) => {
      const { data: prof } = await supabase.from("profiles").select("full_name").eq("user_id", sol.vendedor_id).single();
      return { ...sol, profiles: prof };
    }));
    setSolicitacoes(enriched as SolicitacaoDesconto[]);
  }

  async function loadNotificacoes() {
    if (!profile?.user_id) return;
    const { data } = await supabase.from("notificacoes").select("*").order("created_at", { ascending: false }).limit(20);
    setNotificacoes((data || []) as Notificacao[]);
    const { data: lidas } = await supabase.from("notificacoes_lidas").select("notificacao_id").eq("user_id", profile.user_id);
    setLidasIds(new Set((lidas || []).map((l: any) => l.notificacao_id)));
  }

  async function marcarLida(notificacaoId: string) {
    if (!profile?.user_id || lidasIds.has(notificacaoId)) return;
    await supabase.from("notificacoes_lidas").insert({ notificacao_id: notificacaoId, user_id: profile.user_id });
    setLidasIds((prev) => new Set([...prev, notificacaoId]));
  }

  async function marcarTodasLidas() {
    for (const n of notificacoes.filter((n) => !lidasIds.has(n.id))) {
      await marcarLida(n.id);
    }
  }

  useEffect(() => {
    if (profile) { loadSolicitacoes(); loadNotificacoes(); }
  }, [profile]);

  async function handleAprovar(sol: SolicitacaoDesconto) {
    setProcessingId(sol.id);
    await supabase.from("solicitacoes_desconto").update({ status: "Aprovado", aprovado_por: profile?.user_id, aprovado_em: new Date().toISOString() }).eq("id", sol.id);
    await supabase.from("pedidos").update({ status_pedido: "Aguardando Financeiro" }).eq("id", sol.pedido_id);
    toast.success("Desconto aprovado! Pedido liberado para o financeiro.");
    setProcessingId(null);
    loadSolicitacoes();
  }

  async function handleReprovar(sol: SolicitacaoDesconto) {
    const motivo = motivoReprova[sol.id] || "";
    setProcessingId(sol.id);
    await supabase.from("solicitacoes_desconto").update({ status: "Reprovado", aprovado_por: profile?.user_id, aprovado_em: new Date().toISOString(), motivo_reprovacao: motivo || null }).eq("id", sol.id);
    await supabase.from("pedidos").update({ status_pedido: "Reprovado Financeiro", financeiro_status: "Reprovado", financeiro_motivo: motivo ? `Desconto reprovado: ${motivo}` : "Desconto reprovado pelo gestor" }).eq("id", sol.pedido_id);
    toast.error("Desconto reprovado. Vendedor notificado.");
    setProcessingId(null);
    setMotivoReprova((prev) => { const n = { ...prev }; delete n[sol.id]; return n; });
    loadSolicitacoes();
  }

  const naoLidasCount = notificacoes.filter((n) => !lidasIds.has(n.id)).length;
  const totalBadge = solicitacoes.length + naoLidasCount;

  return (
    <DropdownMenu open={open} onOpenChange={(v) => { setOpen(v); if (v) { loadSolicitacoes(); loadNotificacoes(); } }}>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="icon" className="h-8 w-8 relative">
          <Bell className="h-4 w-4" />
          {totalBadge > 0 && (
            <span className="absolute -top-0.5 -right-0.5 h-4 w-4 rounded-full bg-destructive text-destructive-foreground text-[10px] font-bold flex items-center justify-center">
              {totalBadge > 9 ? "9+" : totalBadge}
            </span>
          )}
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-96 p-0 max-h-[80vh] overflow-y-auto">
        <div className="px-4 py-3 border-b border-border flex items-center gap-2">
          <Bell className="h-4 w-4 text-primary" />
          <p className="font-semibold text-sm">Notificações</p>
          {totalBadge > 0 && (
            <span className="ml-auto text-xs bg-destructive text-destructive-foreground rounded-full px-2 py-0.5 font-medium">
              {totalBadge} nova{totalBadge > 1 ? "s" : ""}
            </span>
          )}
        </div>

        {/* Aprovações de desconto — apenas gestores */}
        {isGestor && solicitacoes.length > 0 && (
          <div>
            <div className="px-4 py-2 bg-muted/40 border-b border-border">
              <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide flex items-center gap-1.5">
                <Percent className="h-3 w-3" /> Aprovações de Desconto
                <span className="bg-destructive text-destructive-foreground rounded-full px-1.5 py-0.5 text-[10px] font-bold ml-1">{solicitacoes.length}</span>
              </p>
            </div>
            {solicitacoes.map((sol) => {
              const clienteNome = (sol.pedidos as any)?.clientes?.nome_fantasia || "—";
              const vendNome = (sol.profiles as any)?.full_name || "—";
              const impFinal = (sol.pedidos as any)?.valor_implantacao_final;
              const mensFinal = (sol.pedidos as any)?.valor_mensalidade_final;
              return (
                <div key={sol.id} className="px-4 py-3 border-b border-border space-y-2">
                  <div>
                    <p className="font-medium text-sm">{clienteNome}</p>
                    <p className="text-xs text-muted-foreground">Vendedor: {vendNome}</p>
                    <div className="text-xs text-muted-foreground mt-1 space-y-0.5">
                      {sol.desconto_implantacao_valor > 0 && <p>Implantação: {sol.desconto_implantacao_tipo === "%" ? `${sol.desconto_implantacao_percentual?.toFixed(1)}%` : `R$ ${sol.desconto_implantacao_valor}`} de desconto {impFinal != null && `→ R$ ${impFinal.toFixed(2)}`}</p>}
                      {sol.desconto_mensalidade_valor > 0 && <p>Mensalidade: {sol.desconto_mensalidade_tipo === "%" ? `${sol.desconto_mensalidade_percentual?.toFixed(1)}%` : `R$ ${sol.desconto_mensalidade_valor}`} de desconto {mensFinal != null && `→ R$ ${mensFinal.toFixed(2)}`}</p>}
                    </div>
                  </div>
                  <input type="text" placeholder="Motivo (opcional)" className="w-full text-xs border border-border rounded px-2 py-1 bg-background"
                    value={motivoReprova[sol.id] || ""} onChange={(e) => setMotivoReprova((p) => ({ ...p, [sol.id]: e.target.value }))} />
                  <div className="flex gap-2">
                    <button className="flex-1 flex items-center justify-center gap-1 text-xs font-medium bg-success hover:bg-success/90 text-success-foreground rounded px-3 py-1.5 transition-colors disabled:opacity-50"
                      onClick={() => handleAprovar(sol)} disabled={processingId === sol.id}>
                      <Check className="h-3 w-3" /> Aprovar
                    </button>
                    <button className="flex-1 flex items-center justify-center gap-1 text-xs font-medium bg-destructive hover:bg-destructive/90 text-destructive-foreground rounded px-3 py-1.5 transition-colors disabled:opacity-50"
                      onClick={() => handleReprovar(sol)} disabled={processingId === sol.id}>
                      <X className="h-3 w-3" /> Reprovar
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* Notificações gerais */}
        {notificacoes.length > 0 && (
          <div>
            <div className="px-4 py-2 bg-muted/40 border-b border-border flex items-center justify-between">
              <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide flex items-center gap-1.5">
                <Globe className="h-3 w-3" /> Comunicados
              </p>
              {naoLidasCount > 0 && (
                <button onClick={marcarTodasLidas} className="text-xs text-primary hover:underline">Marcar todas como lidas</button>
              )}
            </div>
            {notificacoes.map((n) => {
              const lida = lidasIds.has(n.id);
              return (
                <div key={n.id}
                  className={cn("px-4 py-3 border-b border-border cursor-pointer hover:bg-muted/30 transition-colors", !lida && "bg-primary/5")}
                  onClick={() => marcarLida(n.id)}>
                  <div className="flex items-start gap-2.5">
                    <div className="mt-0.5 flex-shrink-0">{TIPO_ICON[n.tipo] || TIPO_ICON.info}</div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <p className={cn("text-sm truncate", !lida ? "font-semibold" : "font-medium")}>{n.titulo}</p>
                        {!lida && <span className="h-2 w-2 rounded-full bg-primary flex-shrink-0" />}
                      </div>
                      <p className="text-xs text-muted-foreground mt-0.5 line-clamp-2">{n.mensagem}</p>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {solicitacoes.length === 0 && notificacoes.length === 0 && (
          <div className="px-4 py-10 text-center text-sm text-muted-foreground">
            <Bell className="h-8 w-8 mx-auto mb-2 opacity-30" />
            Nenhuma notificação
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
    navigate("/login");
  }

  return (
    <div className="flex min-h-screen bg-background">
      {/* Desktop Sidebar */}
      <aside className={cn(
        "hidden lg:flex flex-col flex-shrink-0 bg-sidebar border-r border-sidebar-border transition-all duration-300",
        collapsed ? "w-14" : "w-60"
      )}>
        <Sidebar collapsed={collapsed} profile={profile} roles={roles} initials={initials} onNavigate={navigate} onSignOut={handleSignOut} />
      </aside>

      {/* Mobile Drawer */}
      {mobileOpen && (
        <div className="fixed inset-0 z-50 lg:hidden">
          <div className="fixed inset-0 bg-black/50" onClick={() => setMobileOpen(false)} />
          <div className="fixed left-0 top-0 h-full w-64 bg-sidebar border-r border-sidebar-border z-50">
            <Sidebar collapsed={false} profile={profile} roles={roles} initials={initials} onNavigate={(p) => { navigate(p); setMobileOpen(false); }} onSignOut={handleSignOut} onMobileClose={() => setMobileOpen(false)} />
          </div>
        </div>
      )}

      {/* Main Content */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Topbar */}
        <header className="h-12 border-b border-border bg-background/95 backdrop-blur sticky top-0 z-30 flex items-center px-4 gap-3">
          <Button variant="ghost" size="icon" className="h-8 w-8 lg:flex hidden" onClick={() => setCollapsed((c) => !c)}>
            {collapsed ? <ChevronRight className="h-4 w-4" /> : <ChevronLeft className="h-4 w-4" />}
          </Button>
          <Button variant="ghost" size="icon" className="h-8 w-8 lg:hidden" onClick={() => setMobileOpen(true)}>
            <Menu className="h-4 w-4" />
          </Button>

          <div className="flex-1" />

          <NotificationBell profile={profile} roles={roles} />

          {/* Avatar com menu de perfil/sair */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button className="flex items-center gap-2 rounded-full hover:bg-accent transition-colors p-0.5 focus:outline-none focus-visible:ring-2 focus-visible:ring-ring">
                <Avatar className="h-8 w-8">
                  <AvatarFallback className="bg-primary text-primary-foreground text-xs font-bold">{initials}</AvatarFallback>
                </Avatar>
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-52">
              <DropdownMenuLabel className="font-normal">
                <p className="font-semibold text-sm truncate">{profile?.full_name || "Usuário"}</p>
                <p className="text-xs text-muted-foreground truncate">{roles.map((r) => ROLE_LABELS[r]).join(", ") || "—"}</p>
              </DropdownMenuLabel>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={() => navigate("/perfil")}><User className="mr-2 h-4 w-4" />Meu perfil</DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={handleSignOut} className="text-destructive focus:text-destructive"><LogOut className="mr-2 h-4 w-4" />Sair</DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </header>

        {/* Page Content */}
        <main className="flex-1 p-4 sm:p-6 overflow-auto">
          {children}
        </main>
      </div>
    </div>
  );
}
