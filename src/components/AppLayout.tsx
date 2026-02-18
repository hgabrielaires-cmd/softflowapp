import { ReactNode, useState } from "react";
import iconSoftflow from "@/assets/icon-softflow.png";
import logoSoftflowBranca from "@/assets/logo-softflow-branca.png";
import { NavLink, useNavigate } from "react-router-dom";
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
  LogOut,
  Bell,
  User,
  Menu,
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
import { AppRole, ROLE_LABELS, Profile } from "@/lib/supabase-types";
import { toast } from "sonner";

interface NavItem {
  icon: ReactNode;
  label: string;
  to: string;
  roles?: AppRole[];
}

const navItems: NavItem[] = [
  { icon: <LayoutDashboard className="h-4 w-4" />, label: "Dashboard", to: "/dashboard" },
  { icon: <Users className="h-4 w-4" />, label: "Usuários", to: "/usuarios", roles: ["admin"] },
  { icon: <ShoppingCart className="h-4 w-4" />, label: "Pedidos", to: "/pedidos" },
  { icon: <DollarSign className="h-4 w-4" />, label: "Financeiro", to: "/financeiro", roles: ["admin", "financeiro"] },
  { icon: <Calendar className="h-4 w-4" />, label: "Agenda", to: "/agenda" },
  { icon: <Building2 className="h-4 w-4" />, label: "Filiais", to: "/filiais", roles: ["admin"] },
];

interface SidebarProps {
  collapsed: boolean;
  profile: Profile | null;
  roles: AppRole[];
  visibleItems: NavItem[];
  initials: string;
  onNavigate: (path: string) => void;
  onSignOut: () => void;
  onMobileClose?: () => void;
}

function Sidebar({ collapsed, profile, roles, visibleItems, initials, onNavigate, onSignOut, onMobileClose }: SidebarProps) {
  return (
    <div className="flex flex-col h-full">
      {/* Logo */}
      <div className={cn(
        "flex items-center gap-3 px-4 py-5 border-b border-sidebar-border",
        collapsed && "justify-center px-2"
      )}>
        {collapsed ? (
          <img src={iconSoftflow} alt="Softflow" className="h-8 w-8 object-contain" style={{ filter: 'brightness(0) invert(1)' }} />
        ) : (
          <img src={logoSoftflowBranca} alt="Softflow" className="h-8 object-contain" />
        )}
      </div>

      {/* Nav */}
      <nav className="flex-1 px-2 py-4 space-y-0.5 overflow-y-auto">
        {!collapsed && (
          <p className="text-sidebar-foreground/40 text-xs font-semibold uppercase tracking-wider px-3 mb-3">
            Menu
          </p>
        )}
        {visibleItems.map((item) => (
          <NavLink
            key={item.to}
            to={item.to}
            onClick={onMobileClose}
            className={({ isActive }) =>
              cn(
                "flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all duration-150",
                collapsed && "justify-center px-2",
                isActive
                  ? "bg-sidebar-primary text-sidebar-primary-foreground"
                  : "text-sidebar-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground"
              )
            }
            title={collapsed ? item.label : undefined}
          >
            <span className="flex-shrink-0">{item.icon}</span>
            {!collapsed && <span>{item.label}</span>}
          </NavLink>
        ))}
      </nav>

      {/* User info */}
      <div className={cn(
        "border-t border-sidebar-border p-3",
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

interface AppLayoutProps {
  children: ReactNode;
}

export function AppLayout({ children }: AppLayoutProps) {
  const { profile, roles, signOut } = useAuth();
  const navigate = useNavigate();
  const [collapsed, setCollapsed] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);

  const visibleItems = navItems.filter(
    (item) => !item.roles || item.roles.some((r) => roles.includes(r))
  );

  const initials = profile?.full_name
    ? profile.full_name.split(" ").map((n) => n[0]).join("").slice(0, 2).toUpperCase()
    : "??";

  async function handleSignOut() {
    try {
      await signOut();
      toast.success("Sessão encerrada com sucesso");
    } finally {
      navigate("/login");
    }
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
          visibleItems={visibleItems}
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
              visibleItems={visibleItems}
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
