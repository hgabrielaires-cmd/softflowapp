import { ReactNode, useState, useEffect, useMemo } from "react";
import { APP_VERSION, APP_BUILD_DATE } from "@/lib/app-version";
import { useMenuPermissions } from "@/hooks/useMenuPermissions";
import iconSoftflow from "@/assets/icon-softflow.png";
import logoSoftflowBranca from "@/assets/logo-softflow-branca.png";
import { NavLink, useNavigate, useLocation } from "react-router-dom";
import { useAuth } from "@/context/AuthContext";
import {
  LayoutDashboard, Users, ShoppingCart, DollarSign, Calendar, Building2,
  ChevronLeft, ChevronRight, ChevronDown, LogOut, Bell, User, Menu,
  UserCheck, BookOpen, Headphones, Ticket, FileText, TrendingUp, TrendingDown,
  BarChart3, Plug, ListOrdered, Inbox, Percent, Check, X,
  Info, AlertTriangle, Zap, Globe, Wrench, Trash2, Eye, Heart, MessageSquare, Send,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem,
  DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { ClientePlanViewer } from "@/components/ClientePlanViewer";
import { UserAvatar } from "@/components/UserAvatar";
import { AppRole, ROLE_LABELS, Profile } from "@/lib/supabase-types";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";

// ─── Types ───────────────────────────────────────────────────────────────────

interface NavSubItem {
  icon: ReactNode;
  label: string;
  to: string;
  permKey?: string; // maps to role_permissions.permissao
  children?: NavSubItem[];
}

interface NavGroup {
  groupLabel: string;
  groupIcon: ReactNode;
  permKey?: string; // if set, group-level permission
  items: NavSubItem[];
}

// ─── Navigation Definition ───────────────────────────────────────────────────

const navGroups: NavGroup[] = [
  {
    groupLabel: "Dashboard",
    groupIcon: <LayoutDashboard className="h-4 w-4" />,
    permKey: "menu.dashboard",
    items: [
      { icon: <ShoppingCart className="h-4 w-4" />, label: "Dashboard Vendas", to: "/dashboard", permKey: "menu.dashboard_vendas" },
      { icon: <DollarSign className="h-4 w-4" />, label: "Dashboard Financeiro", to: "/dashboard-financeiro", permKey: "menu.dashboard_financeiro" },
      { icon: <Headphones className="h-4 w-4" />, label: "Dashboard Atendimento", to: "/dashboard-atendimento", permKey: "menu.dashboard_atendimento" },
    ],
  },
  {
    groupLabel: "Onboarding",
    groupIcon: <Headphones className="h-4 w-4" />,
    items: [
      { icon: <Calendar className="h-4 w-4" />, label: "Painel de Atendimento", to: "/fila-agendamento", permKey: "menu.painel_atendimento" },
      { icon: <Calendar className="h-4 w-4" />, label: "Agenda", to: "/agenda", permKey: "menu.agenda" },
      { icon: <Ticket className="h-4 w-4" />, label: "Tickets", to: "/tickets", permKey: "menu.tickets" },
    ],
  },
  {
    groupLabel: "Cadastros",
    groupIcon: <UserCheck className="h-4 w-4" />,
    items: [
      { icon: <UserCheck className="h-4 w-4" />, label: "Clientes", to: "/clientes", permKey: "menu.clientes" },
      { icon: <BookOpen className="h-4 w-4" />, label: "Planos", to: "/planos", permKey: "menu.planos" },
      { icon: <Building2 className="h-4 w-4" />, label: "Fornecedores", to: "/fornecedores", permKey: "menu.fornecedores" },
      { icon: <Wrench className="h-4 w-4" />, label: "Catálogo de Serviços", to: "/servicos", permKey: "menu.servicos" },
    ],
  },
  {
    groupLabel: "Vendas",
    groupIcon: <ShoppingCart className="h-4 w-4" />,
    items: [
      { icon: <ListOrdered className="h-4 w-4" />, label: "Pedidos", to: "/pedidos", permKey: "menu.pedidos" },
    ],
  },
  {
    groupLabel: "Financeiro",
    groupIcon: <DollarSign className="h-4 w-4" />,
    permKey: "menu.financeiro",
    items: [
      { icon: <Inbox className="h-4 w-4" />, label: "Fila do Financeiro", to: "/financeiro", permKey: "menu.fila_financeiro" },
      { icon: <FileText className="h-4 w-4" />, label: "Contratos", to: "/contratos", permKey: "menu.contratos" },
      { icon: <DollarSign className="h-4 w-4" />, label: "Faturamento", to: "/faturamento", permKey: "menu.faturamento" },
      { icon: <TrendingUp className="h-4 w-4" />, label: "Receitas", to: "/receitas", permKey: "menu.receitas" },
      { icon: <TrendingDown className="h-4 w-4" />, label: "Despesas", to: "/despesas", permKey: "menu.despesas" },
      { icon: <BarChart3 className="h-4 w-4" />, label: "DRE", to: "/dre", permKey: "menu.dre" },
    ],
  },
  {
    groupLabel: "Parâmetros",
    groupIcon: <Building2 className="h-4 w-4" />,
    items: [
      { icon: <Building2 className="h-4 w-4" />, label: "Filiais", to: "/filiais", permKey: "menu.filiais" },
      { icon: <Users className="h-4 w-4" />, label: "Usuários", to: "/usuarios", permKey: "menu.usuarios" },
      { icon: <Globe className="h-4 w-4" />, label: "Perfis de Usuário", to: "/perfis-usuario", permKey: "menu.perfis_usuario" },
      { icon: <FileText className="h-4 w-4" />, label: "Modelos de Documentos", to: "/modelos-contrato", permKey: "menu.modelos_contrato" },
      { icon: <Headphones className="h-4 w-4" />, label: "Onboarding", to: "#helpdesk", children: [
        { icon: <ListOrdered className="h-4 w-4" />, label: "Jornadas de Implantação", to: "/jornadas", permKey: "menu.jornadas" },
        { icon: <Headphones className="h-4 w-4" />, label: "Mesas de Atendimento", to: "/mesas-atendimento", permKey: "menu.mesas_atendimento" },
        { icon: <ListOrdered className="h-4 w-4" />, label: "Etapas", to: "/etapas-painel", permKey: "menu.etapas_painel" },
      ] },
      { icon: <UserCheck className="h-4 w-4" />, label: "CRM", to: "#crm", children: [
        { icon: <ListOrdered className="h-4 w-4" />, label: "Segmentos", to: "/segmentos", permKey: "menu.segmentos" },
      ] },
      { icon: <Zap className="h-4 w-4" />, label: "Automações", to: "/automacoes", permKey: "menu.automacoes" },
      { icon: <Bell className="h-4 w-4" />, label: "Notificações", to: "/notificacoes", permKey: "menu.notificacoes" },
      { icon: <Plug className="h-4 w-4" />, label: "Integrações", to: "/integracoes", permKey: "menu.integracoes" },
      { icon: <Building2 className="h-4 w-4" />, label: "Setores", to: "/setores", permKey: "menu.setores" },
    ],
  },
];

// ─── Helpers ─────────────────────────────────────────────────────────────────

/** permissions = null means unrestricted (admin) */
function itemVisible(item: NavSubItem, permissions: Set<string> | null): boolean {
  if (permissions === null) return true; // admin
  if (item.children) {
    // Parent with children: visible if any child is visible
    return item.children.some((c) => itemVisible(c, permissions));
  }
  if (!item.permKey) return true;
  return permissions.has(item.permKey);
}

function visibleItemsInGroup(group: NavGroup, permissions: Set<string> | null): NavSubItem[] {
  return group.items.filter((item) => itemVisible(item, permissions));
}

function groupVisible(group: NavGroup, permissions: Set<string> | null): boolean {
  if (permissions === null) return true; // admin
  // Check group-level perm if set
  if (group.permKey && !permissions.has(group.permKey)) {
    // Even if group perm is off, show group if any child item has permission
    const visibleItems = visibleItemsInGroup(group, permissions);
    return visibleItems.length > 0;
  }
  const visibleItems = visibleItemsInGroup(group, permissions);
  return visibleItems.length > 0;
}

function isItemOrChildActive(item: NavSubItem, pathname: string): boolean {
  if (item.children) {
    return item.children.some((c) => pathname === c.to || pathname.startsWith(c.to + "/"));
  }
  return pathname === item.to || pathname.startsWith(item.to + "/");
}

// ─── Sidebar Component ────────────────────────────────────────────────────────

interface SidebarProps {
  collapsed: boolean;
  profile: Profile | null;
  permissions: Set<string> | null;
  initials: string;
  onNavigate: (path: string) => void;
  onSignOut: () => void;
  onMobileClose?: () => void;
}

function Sidebar({ collapsed, profile, permissions, initials, onNavigate, onSignOut, onMobileClose }: SidebarProps) {
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
          <button onClick={() => onNavigate("/dashboard")} className="focus:outline-none">
            <img src={iconSoftflow} alt="Softflow" className="h-10 w-10 object-contain" loading="eager" fetchPriority="high" decoding="async" style={{ filter: 'brightness(0) invert(1)' }} />
          </button>
        ) : (
          <button onClick={() => onNavigate("/dashboard")} className="focus:outline-none mx-auto">
            <img src={logoSoftflowBranca} alt="Softflow" className="h-24 object-contain" loading="eager" fetchPriority="high" decoding="async" />
          </button>
        )}
      </div>

      <nav className="flex-1 px-2 py-3 space-y-0.5 overflow-y-auto [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
        {navGroups.map((group) => {
          if (!groupVisible(group, permissions)) return null;
          const items = visibleItemsInGroup(group, permissions);
          if (items.length === 0) return null;

          const isGroupActive = items.some((item) => isItemOrChildActive(item, location.pathname));
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
                    if (item.children) {
                      const visibleChildren = item.children.filter((c) => itemVisible(c, permissions));
                      const childActive = visibleChildren.some((c) => location.pathname === c.to || location.pathname.startsWith(c.to + "/"));
                      const subKey = `sub_${item.label}`;
                      const isSubOpen = openGroups[subKey] ?? false;
                      return (
                        <Collapsible key={item.to} open={isSubOpen} onOpenChange={() => toggleGroup(subKey)}>
                          <CollapsibleTrigger asChild>
                            <button className={cn("flex items-center justify-between w-full pl-8 pr-3 py-2 rounded-lg text-sm font-medium transition-all duration-150",
                              childActive ? "text-sidebar-primary-foreground" : "text-sidebar-foreground/80 hover:bg-sidebar-accent hover:text-sidebar-accent-foreground"
                            )}>
                              <div className="flex items-center gap-3">
                                <span className="flex-shrink-0 opacity-70">{item.icon}</span>
                                <span>{item.label}</span>
                              </div>
                              <ChevronDown className={cn("h-3 w-3 transition-transform duration-200 text-sidebar-foreground/40", isSubOpen && "rotate-180")} />
                            </button>
                          </CollapsibleTrigger>
                          <CollapsibleContent className="space-y-0.5 overflow-hidden data-[state=closed]:animate-accordion-up data-[state=open]:animate-accordion-down">
                            {visibleChildren.map((child) => {
                              const cActive = location.pathname === child.to || location.pathname.startsWith(child.to + "/");
                              return (
                                <NavLink key={child.to} to={child.to} onClick={onMobileClose}
                                  className={cn("flex items-center gap-3 pl-12 pr-3 py-1.5 rounded-lg text-sm transition-all duration-150",
                                    cActive ? "bg-sidebar-primary text-sidebar-primary-foreground" : "text-sidebar-foreground/70 hover:bg-sidebar-accent hover:text-sidebar-accent-foreground"
                                  )}>
                                  <span className="flex-shrink-0 opacity-70">{child.icon}</span>
                                  <span>{child.label}</span>
                                </NavLink>
                              );
                            })}
                          </CollapsibleContent>
                        </Collapsible>
                      );
                    }
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
                {profile?.avatar_url && <AvatarImage src={profile.avatar_url} alt={profile.full_name} />}
                <AvatarFallback className="bg-sidebar-primary text-sidebar-primary-foreground text-xs font-bold">{initials}</AvatarFallback>
              </Avatar>
              {!collapsed && (
                <div className="text-left overflow-hidden flex-1">
                  <p className="text-sidebar-foreground text-sm font-medium truncate leading-tight">{profile?.full_name || "Usuário"}</p>
                  <p className="text-sidebar-foreground/40 text-[10px] truncate leading-tight mt-0.5">
                    v{APP_VERSION} • {new Date(APP_BUILD_DATE).toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit", year: "numeric", hour: "2-digit", minute: "2-digit" })}
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
  pedidos?: { cliente_id?: string; clientes?: { nome_fantasia: string } | null; valor_implantacao_final?: number; valor_mensalidade_final?: number } | null;
  profiles?: { full_name: string } | null;
}

interface Notificacao {
  id: string;
  titulo: string;
  mensagem: string;
  tipo: string;
  created_at: string;
  criado_por: string;
  metadata?: { card_id?: string; comentario_id?: string } | null;
}

const TIPO_ICON: Record<string, ReactNode> = {
  info: <Info className="h-4 w-4 text-primary" />,
  aviso: <AlertTriangle className="h-4 w-4 text-warning" />,
  urgente: <Zap className="h-4 w-4 text-destructive" />,
};

function NotificationBell({ profile, roles }: { profile: Profile | null; roles: AppRole[] }) {
  const navigate = useNavigate();
  const [solicitacoes, setSolicitacoes] = useState<SolicitacaoDesconto[]>([]);
  const [notificacoes, setNotificacoes] = useState<Notificacao[]>([]);
  const [lidasIds, setLidasIds] = useState<Set<string>>(new Set());
  const [open, setOpen] = useState(false);
  const [processingId, setProcessingId] = useState<string | null>(null);
  const [motivoReprova, setMotivoReprova] = useState<Record<string, string>>({});
  const [selectedNotif, setSelectedNotif] = useState<Notificacao | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [replyText, setReplyText] = useState("");
  const [sendingReply, setSendingReply] = useState(false);
  const [criadoPorProfiles, setCriadoPorProfiles] = useState<Record<string, { full_name: string; avatar_url: string | null }>>({});
  const [notifLiked, setNotifLiked] = useState(false);
  const [likesUsers, setLikesUsers] = useState<{ name: string; avatar: string | null }[]>([]);
  const [viewingPedidoData, setViewingPedidoData] = useState<any>(null);
  const [viewingPedidoSol, setViewingPedidoSol] = useState<SolicitacaoDesconto | null>(null);
  const [loadingPedido, setLoadingPedido] = useState(false);

  const isAdmin = roles.includes("admin");
  const isGestor = isAdmin || (profile as any)?.gestor_desconto === true;

  async function loadSolicitacoes() {
    if (!isGestor) return;
    const { data } = await supabase
      .from("solicitacoes_desconto")
      .select("*, pedidos(cliente_id, plano_id, filial_id, valor_implantacao_final, valor_mensalidade_final, modulos_adicionais, clientes(nome_fantasia))")
      .eq("status", "Aguardando")
      .order("created_at", { ascending: false });

    // Load all custos (plan + modules) in a single query for efficiency
    const { data: allCustos } = await supabase.from("custos").select("plano_id, modulo_id, preco_fornecedor, taxa_boleto, imposto_valor, imposto_tipo, imposto_base, despesas_adicionais");

    // Load filial_parametros for margem_venda_ideal
    const { data: allFilialParams } = await supabase.from("filial_parametros").select("filial_id, margem_venda_ideal");
    const margemIdealPorFilial: Record<string, number> = {};
    (allFilialParams || []).forEach((fp: any) => {
      margemIdealPorFilial[fp.filial_id] = Number(fp.margem_venda_ideal) || 0;
    });
    const custoPorPlano: Record<string, any> = {};
    const custoPorModulo: Record<string, any> = {};
    (allCustos || []).forEach((c: any) => {
      if (c.plano_id) custoPorPlano[c.plano_id] = c;
      if (c.modulo_id) custoPorModulo[c.modulo_id] = c;
    });

    const enriched = await Promise.all((data || []).map(async (sol: any) => {
      const { data: prof } = await supabase.from("profiles").select("full_name").eq("user_id", sol.vendedor_id).single();

      // Calcular margem bruta e markup sobre a MENSALIDADE (plano + módulos)
      let margemBruta: number | null = null;
      let markup: number | null = null;
      let lucroBrutoVal: number | null = null;
      const planoId = (sol.pedidos as any)?.plano_id;
      const mensFinal = Number((sol.pedidos as any)?.valor_mensalidade_final) || 0;

      if (mensFinal > 0) {
        let custoTotalSemImposto = 0;
        let impostoTotal = 0;

        // Custo do plano
        const custoPlano = planoId ? custoPorPlano[planoId] : null;
        if (custoPlano) {
          custoTotalSemImposto += (Number(custoPlano.preco_fornecedor) || 0) + (Number(custoPlano.taxa_boleto) || 0) + (Number(custoPlano.despesas_adicionais) || 0);
        }

        // Custo dos módulos adicionais
        const mods = (sol.pedidos as any)?.modulos_adicionais || [];
        const modsList = typeof mods === "string" ? JSON.parse(mods) : mods;
        if (Array.isArray(modsList)) {
          for (const mod of modsList) {
            const custoMod = mod.modulo_id ? custoPorModulo[mod.modulo_id] : null;
            if (custoMod) {
              const qty = mod.quantidade || 1;
              custoTotalSemImposto += (Number(custoMod.preco_fornecedor) || 0) * qty;
              // Imposto por módulo (se sobre compra)
              if (custoMod.imposto_tipo === "%" && custoMod.imposto_base === "compra") {
                impostoTotal += (Number(custoMod.preco_fornecedor) || 0) * qty * ((Number(custoMod.imposto_valor) || 0) / 100);
              }
            }
          }
        }

        // Imposto sobre venda (aplica-se ao total da mensalidade)
        if (custoPlano?.imposto_tipo === "%" && custoPlano?.imposto_base === "venda") {
          impostoTotal += mensFinal * ((Number(custoPlano.imposto_valor) || 0) / 100);
        } else if (custoPlano?.imposto_tipo === "%" && custoPlano?.imposto_base === "compra") {
          impostoTotal += (Number(custoPlano.preco_fornecedor) || 0) * ((Number(custoPlano.imposto_valor) || 0) / 100);
        } else if (custoPlano) {
          impostoTotal += Number(custoPlano.imposto_valor) || 0;
        }

        const custoFinal = custoTotalSemImposto + impostoTotal;
        const lucroBruto = mensFinal - custoFinal;
        margemBruta = (lucroBruto / mensFinal) * 100;
        markup = custoFinal > 0 ? ((mensFinal / custoFinal) - 1) * 100 : 0;
        lucroBrutoVal = lucroBruto;
      }

      const filialId = (sol.pedidos as any)?.filial_id;
      const margemIdeal = filialId ? (margemIdealPorFilial[filialId] ?? null) : null;

      return { ...sol, profiles: prof, _margemBruta: margemBruta, _markup: markup, _lucroBruto: lucroBrutoVal, _margemIdeal: margemIdeal };
    }));
    setSolicitacoes(enriched as SolicitacaoDesconto[]);
  }

  async function loadPedidoDetails(pedidoId: string, sol: SolicitacaoDesconto) {
    setLoadingPedido(true);
    try {
      const { data } = await supabase
        .from("pedidos")
        .select("*, clientes(nome_fantasia), planos(nome), filiais:filial_id(nome)")
        .eq("id", pedidoId)
        .single();
      if (data) {
        setViewingPedidoData(data);
        setViewingPedidoSol(sol);
      }
    } catch (err) {
      console.error("Erro ao carregar pedido:", err);
    }
    setLoadingPedido(false);
  }

  async function loadNotificacoes() {
    if (!profile?.user_id) return;
    // Fetch user roles for role-based notifications
    const { data: userRolesData } = await supabase.from("user_roles").select("role").eq("user_id", profile.user_id);
    const myRoles = (userRolesData || []).map((r: any) => r.role as string);

    // Build query filtering only notifications meant for this user
    let query = supabase.from("notificacoes").select("*").order("created_at", { ascending: false }).limit(50);

    // Filter: destinatario_user_id = me OR destinatario_role in my roles OR both null (broadcast)
    const orFilters = [`destinatario_user_id.eq.${profile.user_id}`];
    if (myRoles.length > 0) {
      orFilters.push(`destinatario_role.in.(${myRoles.join(",")})`);
    }
    // Broadcast (both null) - use and() inside or()
    orFilters.push(`and(destinatario_user_id.is.null,destinatario_role.is.null)`);
    query = query.or(orFilters.join(","));

    const { data } = await query;
    const notifs = (data || []) as Notificacao[];
    const { data: lidas } = await supabase.from("notificacoes_lidas").select("notificacao_id").eq("user_id", profile.user_id);
    const lidasSet = new Set((lidas || []).map((l: any) => l.notificacao_id));
    setLidasIds(lidasSet);
    setNotificacoes(notifs);

    // Fetch profiles for criado_por
    const criadoPorIds = [...new Set(notifs.map(n => n.criado_por).filter(Boolean))];
    if (criadoPorIds.length > 0) {
      const { data: profs } = await supabase.from("profiles").select("user_id, full_name, avatar_url").in("user_id", criadoPorIds);
      const map: Record<string, { full_name: string; avatar_url: string | null }> = {};
      (profs || []).forEach((p: any) => { map[p.user_id] = { full_name: p.full_name, avatar_url: p.avatar_url }; });
      setCriadoPorProfiles(map);
    }
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

  async function deletarNotificacao(notifId: string) {
    setDeletingId(notifId);
    // Delete read records first, then the notification itself
    if (profile?.user_id) {
      await supabase.from("notificacoes_lidas").delete().eq("notificacao_id", notifId).eq("user_id", profile.user_id);
    }
    await supabase.from("notificacoes").delete().eq("id", notifId);
    setNotificacoes((prev) => prev.filter((n) => n.id !== notifId));
    setDeletingId(null);
    if (selectedNotif?.id === notifId) setSelectedNotif(null);
    toast.success("Notificação removida");
  }

  useEffect(() => {
    if (profile) { loadSolicitacoes(); loadNotificacoes(); }
    // Auto-refresh every 60 seconds
    const interval = setInterval(() => {
      if (profile) { loadSolicitacoes(); loadNotificacoes(); }
    }, 60000);
    return () => clearInterval(interval);
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
    <>
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
              const clienteId = (sol.pedidos as any)?.cliente_id;
              const vendNome = (sol.profiles as any)?.full_name || "—";
              const impFinal = (sol.pedidos as any)?.valor_implantacao_final;
              const mensFinal = (sol.pedidos as any)?.valor_mensalidade_final;
              return (
                <div key={sol.id} className="px-4 py-3 border-b border-border space-y-2">
                  <div className="flex items-start justify-between">
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-sm">{clienteNome}</p>
                      <p className="text-xs text-muted-foreground">Vendedor: {vendNome}</p>
                      <div className="text-xs text-muted-foreground mt-1 space-y-0.5">
                        {sol.desconto_implantacao_valor > 0 && <p>Implantação: {sol.desconto_implantacao_tipo === "%" ? `${sol.desconto_implantacao_percentual?.toFixed(1)}%` : `R$ ${sol.desconto_implantacao_valor}`} de desconto {impFinal != null && `→ R$ ${impFinal.toFixed(2)}`}</p>}
                        {sol.desconto_mensalidade_valor > 0 && <p>Mensalidade: {sol.desconto_mensalidade_tipo === "%" ? `${sol.desconto_mensalidade_percentual?.toFixed(1)}%` : `R$ ${sol.desconto_mensalidade_valor}`} de desconto {mensFinal != null && `→ R$ ${mensFinal.toFixed(2)}`}</p>}
                        {(sol as any)._margemBruta != null && (() => {
                          const margemIdeal = (sol as any)._margemIdeal;
                          const margem = (sol as any)._margemBruta;
                          const isAbaixoIdeal = margemIdeal != null && margem < margemIdeal;
                          return (
                            <div className="mt-1 pt-1 border-t border-border/50 flex gap-3 flex-wrap">
                              <p className={cn("font-medium", margem < 0 || isAbaixoIdeal ? "text-destructive" : "text-emerald-600")}>
                                Margem: {margem.toFixed(1)}%
                              </p>
                              <p className="text-muted-foreground">
                                Markup: {(sol as any)._markup?.toFixed(1)}%
                              </p>
                              <p className="text-muted-foreground">
                                Lucro: R$ {((sol as any)._lucroBruto ?? 0).toFixed(2)}
                              </p>
                            </div>
                          );
                        })()}
                      </div>
                    </div>
                    <div className="flex items-center gap-1 shrink-0">
                      <button
                        className="p-1 rounded hover:bg-muted/60 text-muted-foreground hover:text-foreground transition-colors"
                        title="Visualizar pedido"
                        onClick={(e) => { e.stopPropagation(); loadPedidoDetails(sol.pedido_id, sol); }}
                        disabled={loadingPedido}
                      >
                        <Eye className="h-3.5 w-3.5" />
                      </button>
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
                  onClick={() => { marcarLida(n.id); setSelectedNotif(n); loadNotifLikes(n); }}>
                  <div className="flex items-start gap-2.5">
                    <div className="mt-0.5 flex-shrink-0">
                      {criadoPorProfiles[n.criado_por]?.avatar_url || criadoPorProfiles[n.criado_por]?.full_name ? (
                        <UserAvatar avatarUrl={criadoPorProfiles[n.criado_por]?.avatar_url} fullName={criadoPorProfiles[n.criado_por]?.full_name} size="sm" />
                      ) : (
                        TIPO_ICON[n.tipo] || TIPO_ICON.info
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <p className={cn("text-sm truncate", !lida ? "font-semibold" : "font-medium")}>{n.titulo}</p>
                        {!lida && <span className="h-2 w-2 rounded-full bg-primary flex-shrink-0" />}
                      </div>
                      <p className="text-xs text-muted-foreground mt-0.5 line-clamp-2">{n.mensagem}</p>
                    </div>
                    <button
                      className="mt-0.5 flex-shrink-0 text-muted-foreground hover:text-destructive transition-colors p-1 rounded"
                      title="Excluir notificação"
                      onClick={(e) => { e.stopPropagation(); deletarNotificacao(n.id); }}
                      disabled={deletingId === n.id}
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
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

    {/* Dialog de mensagem completa */}
    <Dialog open={!!selectedNotif} onOpenChange={(v) => { if (!v) { setSelectedNotif(null); setReplyText(""); setNotifLiked(false); setLikesUsers([]); } }}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-base">
            {selectedNotif && (TIPO_ICON[selectedNotif.tipo] || TIPO_ICON.info)}
            {selectedNotif?.titulo}
          </DialogTitle>
        </DialogHeader>

        {/* Author info with avatar */}
        {selectedNotif && criadoPorProfiles[selectedNotif.criado_por] && (
          <div className="flex items-center gap-2.5 pb-2 border-b border-border">
            <UserAvatar
              avatarUrl={criadoPorProfiles[selectedNotif.criado_por].avatar_url}
              fullName={criadoPorProfiles[selectedNotif.criado_por].full_name}
              size="md"
            />
            <div>
              <p className="text-sm font-semibold">{criadoPorProfiles[selectedNotif.criado_por].full_name}</p>
              <p className="text-[11px] text-muted-foreground">
                {selectedNotif.created_at && new Date(selectedNotif.created_at).toLocaleString("pt-BR")}
              </p>
            </div>
          </div>
        )}

        <div className="text-sm text-foreground whitespace-pre-wrap leading-relaxed">
          {selectedNotif?.mensagem}
        </div>

        {/* Reply area — only for comment-related notifications (with card_id + comentario_id) */}
        {selectedNotif?.metadata?.card_id && selectedNotif?.metadata?.comentario_id && (
          <div className="space-y-2 border-t border-border pt-3 mt-1">
            <div className="flex gap-2">
              <input
                type="text"
                placeholder="Escreva uma resposta..."
                className="flex-1 text-sm border border-border rounded-lg px-3 py-2 bg-background focus:outline-none focus:ring-1 focus:ring-primary"
                value={replyText}
                onChange={(e) => setReplyText(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" && !e.shiftKey && replyText.trim()) {
                    e.preventDefault();
                    handleNotifReply();
                  }
                }}
              />
              <Button
                size="sm"
                className="gap-1"
                disabled={!replyText.trim() || sendingReply}
                onClick={handleNotifReply}
              >
                <Send className="h-3.5 w-3.5" />
              </Button>
            </div>
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                className={cn("gap-1.5 text-xs transition-colors", notifLiked && "text-red-500 border-red-200 bg-red-50 hover:bg-red-100 hover:text-red-600")}
                onClick={() => handleNotifLike()}
              >
                <Heart className={cn("h-3.5 w-3.5", notifLiked && "fill-red-500")} />
                {notifLiked ? "Curtido" : "Curtir"}
              </Button>
              {/* Liked-by avatars */}
              {likesUsers.length > 0 && (
                <div className="flex items-center gap-1.5">
                  <div className="flex -space-x-1.5">
                    {likesUsers.slice(0, 3).map((u, i) => (
                      <div key={i} className="h-5 w-5 rounded-full border-2 border-background overflow-hidden">
                        <UserAvatar avatarUrl={u.avatar} fullName={u.name} size="xs" />
                      </div>
                    ))}
                  </div>
                  <span className="text-[10px] text-muted-foreground">
                    Curtido por {likesUsers.map(u => u.name.split(" ")[0]).slice(0, 2).join(", ")}
                    {likesUsers.length > 2 && ` +${likesUsers.length - 2}`}
                  </span>
                </div>
              )}
            </div>
          </div>
        )}

        <div className="flex items-center justify-end mt-2">
          <div className="flex items-center gap-2">
            {selectedNotif?.metadata?.card_id && (
              <Button
                variant="outline"
                size="sm"
                className="gap-1.5"
                onClick={() => {
                  const cardId = selectedNotif.metadata?.card_id;
                  setSelectedNotif(null);
                  setOpen(false);
                  navigate(`/painel-atendimento?card=${cardId}`);
                }}
              >
                <Eye className="h-3.5 w-3.5" /> Visualizar
              </Button>
            )}
            <Button
              variant="outline"
              size="sm"
              className="gap-1.5 text-destructive hover:text-destructive"
              onClick={() => selectedNotif && deletarNotificacao(selectedNotif.id)}
              disabled={deletingId === selectedNotif?.id}
            >
              <Trash2 className="h-3.5 w-3.5" /> Excluir
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>

    {/* Dialog Visualizar Pedido (from discount approval) */}
    <Dialog open={!!viewingPedidoData} onOpenChange={(v) => { if (!v) { setViewingPedidoData(null); setViewingPedidoSol(null); } }}>
      <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Eye className="h-4 w-4" /> Visualizar Pedido
            {viewingPedidoData?.numero_exibicao && <span className="ml-auto font-mono text-sm text-primary">{viewingPedidoData.numero_exibicao}</span>}
          </DialogTitle>
        </DialogHeader>
        {viewingPedidoData && (() => {
          const vp = viewingPedidoData;
          const fmtBRL = (v: number) => v?.toLocaleString("pt-BR", { style: "currency", currency: "BRL" }) || "R$ 0,00";
          const impFinal = vp.valor_implantacao_final ?? vp.valor_implantacao;
          const mensFinal = vp.valor_mensalidade_final ?? vp.valor_mensalidade;
          const adicionais = (vp.modulos_adicionais || []) as any[];
          const sol = viewingPedidoSol;
          return (
            <div className="space-y-4 text-sm">
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-0.5">
                  <p className="text-xs text-muted-foreground">Cliente</p>
                  <p className="font-medium">{vp.clientes?.nome_fantasia || "—"}</p>
                </div>
                <div className="space-y-0.5">
                  <p className="text-xs text-muted-foreground">Plano</p>
                  <p className="font-medium">{vp.planos?.nome || "—"}</p>
                </div>
                <div className="space-y-0.5">
                  <p className="text-xs text-muted-foreground">Filial</p>
                  <p>{vp.filiais?.nome || "—"}</p>
                </div>
                <div className="space-y-0.5">
                  <p className="text-xs text-muted-foreground">Vendedor</p>
                  <p>{(sol?.profiles as any)?.full_name || "—"}</p>
                </div>
                <div className="space-y-0.5">
                  <p className="text-xs text-muted-foreground">Tipo</p>
                  <p>{vp.tipo_pedido || "Novo"}</p>
                </div>
                <div className="space-y-0.5">
                  <p className="text-xs text-muted-foreground">Data</p>
                  <p>{new Date(vp.created_at).toLocaleDateString("pt-BR")}</p>
                </div>
              </div>

              {/* Itens do Pedido */}
              {(vp.tipo_pedido === "Novo" || vp.tipo_pedido === "Upgrade") && vp.planos?.nome && (
                <div className="border-t border-border pt-3 space-y-2">
                  <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">📋 Itens do Pedido</p>
                  <div className="bg-muted/50 rounded-md p-2.5 space-y-1">
                    <p className="text-xs font-medium">{vp.tipo_pedido === "Upgrade" ? "⬆️ Upgrade de Plano" : "📦 Plano Contratado"}</p>
                    <p className="text-sm font-semibold">{vp.planos?.nome}</p>
                    <div className="flex gap-4 text-xs text-muted-foreground">
                      <span>Impl: <span className="font-mono">{fmtBRL(vp.valor_implantacao_original ?? vp.valor_implantacao)}</span></span>
                      <span>Mens: <span className="font-mono">{fmtBRL(vp.valor_mensalidade_original ?? vp.valor_mensalidade)}</span></span>
                    </div>
                  </div>
                </div>
              )}

              {/* Módulos Adicionais */}
              {adicionais.length > 0 && (
                <div className="bg-muted/50 rounded-md p-2.5 space-y-1.5">
                  <p className="text-xs font-medium">➕ Módulos Adicionais</p>
                  {adicionais.map((m: any) => (
                    <div key={m.modulo_id} className="flex justify-between text-xs">
                      <span>{m.nome} {m.quantidade > 1 ? `(x${m.quantidade})` : ""}</span>
                      <div className="flex gap-3 font-mono text-muted-foreground">
                        <span>Impl: {fmtBRL(m.valor_implantacao_modulo * m.quantidade)}</span>
                        <span>Mens: {fmtBRL(m.valor_mensalidade_modulo * m.quantidade)}</span>
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {/* Serviços OA */}
              {vp.tipo_pedido === "OA" && (() => {
                const servicos = (vp.servicos_pedido || []) as any[];
                if (servicos.length === 0) return null;
                return (
                  <div className="bg-muted/50 rounded-md p-2.5 space-y-1.5">
                    <p className="text-xs font-medium">🔧 Serviços (OA)</p>
                    {servicos.map((s: any, idx: number) => (
                      <div key={idx} className="flex justify-between text-xs">
                        <span>{s.nome} — {s.quantidade}x {s.unidade_medida || "un."}</span>
                        <span className="font-mono text-muted-foreground">{fmtBRL(s.valor_unitario * s.quantidade)}</span>
                      </div>
                    ))}
                  </div>
                );
              })()}

              {/* Desconto aplicado pelo vendedor */}
              {sol && (sol.desconto_implantacao_valor > 0 || sol.desconto_mensalidade_valor > 0) && (
                <div className="border-t border-border pt-3 space-y-1.5">
                  <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide flex items-center gap-1.5">
                    <Percent className="h-3 w-3" /> Desconto Solicitado pelo Vendedor
                  </p>
                  <div className="bg-amber-50 border border-amber-200 rounded-md p-2.5 space-y-1">
                    {sol.desconto_implantacao_valor > 0 && (
                      <div className="flex justify-between text-xs">
                        <span className="text-muted-foreground">Implantação</span>
                        <span className="font-medium">
                          {sol.desconto_implantacao_tipo === "%" ? `${sol.desconto_implantacao_percentual?.toFixed(1)}%` : `R$ ${sol.desconto_implantacao_valor.toFixed(2)}`} de desconto
                          {" → "}<span className="font-mono font-semibold">{fmtBRL(impFinal)}</span>
                        </span>
                      </div>
                    )}
                    {sol.desconto_mensalidade_valor > 0 && (
                      <div className="flex justify-between text-xs">
                        <span className="text-muted-foreground">Mensalidade</span>
                        <span className="font-medium">
                          {sol.desconto_mensalidade_tipo === "%" ? `${sol.desconto_mensalidade_percentual?.toFixed(1)}%` : `R$ ${sol.desconto_mensalidade_valor.toFixed(2)}`} de desconto
                          {" → "}<span className="font-mono font-semibold">{fmtBRL(mensFinal)}</span>
                        </span>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* Valores finais */}
              <div className="border-t border-border pt-3 grid grid-cols-3 gap-3">
                <div className="space-y-0.5">
                  <p className="text-xs text-muted-foreground">Implantação</p>
                  <p className="font-mono font-semibold">{fmtBRL(impFinal)}</p>
                </div>
                <div className="space-y-0.5">
                  <p className="text-xs text-muted-foreground">Mensalidade</p>
                  <p className="font-mono font-semibold">{fmtBRL(mensFinal)}</p>
                </div>
                <div className="space-y-0.5">
                  <p className="text-xs text-muted-foreground">Total</p>
                  <p className="font-mono font-bold text-primary">{fmtBRL(vp.valor_total)}</p>
                </div>
              </div>

              {/* Motivo desconto */}
              {vp.motivo_desconto && (
                <div className="border-t border-border pt-3 space-y-0.5">
                  <p className="text-xs text-muted-foreground">Motivo do Desconto</p>
                  <p className="text-xs">{vp.motivo_desconto}</p>
                </div>
              )}

              {/* Observações */}
              {vp.observacoes && (
                <div className="border-t border-border pt-3 space-y-0.5">
                  <p className="text-xs text-muted-foreground">Observações</p>
                  <p className="text-xs">{vp.observacoes}</p>
                </div>
              )}
            </div>
          );
        })()}
        <div className="flex justify-end pt-2">
          <Button variant="outline" size="sm" onClick={() => { setViewingPedidoData(null); setViewingPedidoSol(null); }}>Fechar</Button>
        </div>
      </DialogContent>
    </Dialog>
    </>
  );

  async function handleNotifReply() {
    if (!selectedNotif?.metadata?.card_id || !selectedNotif?.metadata?.comentario_id || !replyText.trim() || !profile) return;
    setSendingReply(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const cardId = selectedNotif.metadata.card_id;
      const parentId = selectedNotif.metadata.comentario_id;
      const texto = replyText.trim();

      // Insert the reply comment
      const { data: insertedComment } = await supabase.from("painel_comentarios").insert({
        card_id: cardId,
        parent_id: parentId,
        criado_por: user.id,
        texto,
      }).select("id").single();

      // Notify the original commenter
      const { data: parentComment } = await supabase
        .from("painel_comentarios")
        .select("criado_por")
        .eq("id", parentId)
        .single();

      if (parentComment && parentComment.criado_por !== user.id) {
        // Get client name for context
        const { data: card } = await supabase
          .from("painel_atendimento")
          .select("cliente_id, clientes(nome_fantasia)")
          .eq("id", cardId)
          .single();

        const clienteNome = (card as any)?.clientes?.nome_fantasia || "projeto";
        const meuNome = profile.full_name?.split(" ")[0] || "Alguém";

        // Find original commenter's user_id (profile.id -> user_id)
        const { data: autorProfile } = await supabase
          .from("profiles")
          .select("user_id")
          .eq("id", parentComment.criado_por)
          .single();

        if (autorProfile?.user_id) {
          await supabase.from("notificacoes").insert({
            titulo: `💬 ${meuNome} respondeu seu comentário`,
            mensagem: `${meuNome} respondeu seu comentário no projeto ${clienteNome}: "${texto.slice(0, 100)}${texto.length > 100 ? "..." : ""}"`,
            tipo: "info",
            criado_por: user.id,
            destinatario_user_id: autorProfile.user_id,
            metadata: { card_id: cardId, comentario_id: insertedComment?.id || parentId },
          });
        }
      }

      toast.success("Resposta enviada!");
      setReplyText("");
    } catch {
      toast.error("Erro ao enviar resposta");
    } finally {
      setSendingReply(false);
    }
  }

  async function loadNotifLikes(notif: Notificacao) {
    if (!notif.metadata?.comentario_id || !profile?.user_id) {
      setNotifLiked(false);
      setLikesUsers([]);
      return;
    }
    const { data: allLikes } = await supabase
      .from("painel_curtidas")
      .select("user_id")
      .eq("comentario_id", notif.metadata.comentario_id);
    const likeUserIds = (allLikes || []).map((l: any) => l.user_id);
    setNotifLiked(likeUserIds.includes(profile.user_id));
    if (likeUserIds.length > 0) {
      const { data: profs } = await supabase.from("profiles").select("user_id, full_name, avatar_url").in("user_id", likeUserIds);
      setLikesUsers((profs || []).map((p: any) => ({ name: p.full_name, avatar: p.avatar_url })));
    } else {
      setLikesUsers([]);
    }
  }

  async function handleNotifLike() {
    if (!selectedNotif?.metadata?.comentario_id || !profile) return;
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;
      const { data: existing } = await supabase
        .from("painel_curtidas")
        .select("id")
        .eq("comentario_id", selectedNotif.metadata.comentario_id)
        .eq("user_id", user.id)
        .maybeSingle();
      if (existing) {
        await supabase.from("painel_curtidas").delete().eq("id", existing.id);
        setNotifLiked(false);
        setLikesUsers(prev => prev.filter(u => u.name !== profile.full_name));
        toast.success("Curtida removida");
      } else {
        await supabase.from("painel_curtidas").insert({ comentario_id: selectedNotif.metadata.comentario_id, user_id: user.id });
        setNotifLiked(true);
        setLikesUsers(prev => [...prev, { name: profile.full_name || "Você", avatar: profile.avatar_url || null }]);
        toast.success("Comentário curtido!");
      }
    } catch {
      toast.error("Erro ao curtir");
    }
  }
}

// ─── AppLayout ────────────────────────────────────────────────────────────────

interface AppLayoutProps {
  children: ReactNode;
}

export function AppLayout({ children }: AppLayoutProps) {
  const { profile, roles, signOut } = useAuth();
  const { permissions } = useMenuPermissions(roles);
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
        <Sidebar collapsed={collapsed} profile={profile} permissions={permissions} initials={initials} onNavigate={navigate} onSignOut={handleSignOut} />
      </aside>

      {/* Mobile Drawer */}
      {mobileOpen && (
        <div className="fixed inset-0 z-50 lg:hidden">
          <div className="fixed inset-0 bg-black/50" onClick={() => setMobileOpen(false)} />
          <div className="fixed left-0 top-0 h-full w-64 bg-sidebar border-r border-sidebar-border z-50">
            <Sidebar collapsed={false} profile={profile} permissions={permissions} initials={initials} onNavigate={(p) => { navigate(p); setMobileOpen(false); }} onSignOut={handleSignOut} onMobileClose={() => setMobileOpen(false)} />
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
                  {profile?.avatar_url && <AvatarImage src={profile.avatar_url} alt={profile.full_name} />}
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
