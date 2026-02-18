import { ReactNode, useState } from "react";
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
    groupLabel: "Pedidos",
    groupIcon: <ShoppingCart className="h-4 w-4" />,
    roles: ["admin", "financeiro", "vendedor"],
    items: [
      { icon: <ListOrdered className="h-4 w-4" />, label: "Lista de Pedidos", to: "/pedidos" },
      { icon: <PlusCircle className="h-4 w-4" />, label: "Criar Pedido", to: "/pedidos/novo" },
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
                  <p className="text-sidebar-foreground/50 text-xs truncate">
                    {roles.map((r) => ROLE_LABELS[r]).join(", ") || "Sem cargo"}
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
            <Button variant="ghost" size="icon" className="h-8 w-8 relative">
              <Bell className="h-4 w-4" />
            </Button>
            <Avatar className="h-8 w-8 cursor-pointer">
              <AvatarFallback className="bg-primary text-primary-foreground text-xs font-bold">
                {initials}
              </AvatarFallback>
            </Avatar>
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
