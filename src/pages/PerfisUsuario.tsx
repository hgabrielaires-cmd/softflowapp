import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { AppLayout } from "@/components/AppLayout";
import { useAuth } from "@/context/AuthContext";
import { AppRole, ROLE_LABELS, ROLE_COLORS } from "@/lib/supabase-types";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import {
  Loader2, Shield, Save, LayoutDashboard, Users, ShoppingCart, FileText,
  DollarSign, Building2, Bell, BookOpen, Plug, Settings, ChevronDown,
  Headphones, Calendar, Ticket, Wrench, ListOrdered, Inbox, TrendingUp,
  TrendingDown, BarChart3, Globe, UserCheck, Plus, Pencil, Trash2, RefreshCw,
} from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

interface RolePermission {
  id: string;
  role: string;
  permissao: string;
  ativo: boolean;
}

// Hierarchical menu definition
interface MenuNode {
  key: string;
  label: string;
  description: string;
  icon: React.ReactNode;
  children?: MenuNode[];
}

// CRUD sub-permissions factory
function crudChildren(module: string): MenuNode[] {
  return [
    { key: `crud.${module}.incluir`, label: "Incluir", description: "Permissão para incluir registros", icon: <Plus className="h-4 w-4" /> },
    { key: `crud.${module}.editar`, label: "Editar", description: "Permissão para editar registros", icon: <Pencil className="h-4 w-4" /> },
    { key: `crud.${module}.excluir`, label: "Excluir", description: "Permissão para excluir registros", icon: <Trash2 className="h-4 w-4" /> },
  ];
}

const MENU_TREE: MenuNode[] = [
  {
    key: "menu.dashboard", label: "Dashboard", description: "Acesso ao painel principal",
    icon: <LayoutDashboard className="h-4 w-4" />,
    children: [
      { key: "menu.dashboard_vendas", label: "Dashboard Vendas", description: "Painel de vendas e comissões", icon: <ShoppingCart className="h-4 w-4" /> },
      { key: "menu.dashboard_financeiro", label: "Dashboard Financeiro", description: "Painel financeiro geral", icon: <DollarSign className="h-4 w-4" /> },
      { key: "menu.dashboard_atendimento", label: "Dashboard Atendimento", description: "Painel de atendimento e SLA", icon: <Headphones className="h-4 w-4" /> },
    ],
  },
  {
    key: "menu.clientes", label: "Clientes", description: "Cadastro e gestão de clientes",
    icon: <UserCheck className="h-4 w-4" />,
    children: crudChildren("clientes"),
  },
  {
    key: "menu.pedidos", label: "Pedidos", description: "Gestão de pedidos de venda",
    icon: <ShoppingCart className="h-4 w-4" />,
    children: crudChildren("pedidos"),
  },
  {
    key: "menu.financeiro", label: "Financeiro", description: "Módulo financeiro completo",
    icon: <DollarSign className="h-4 w-4" />,
    children: [
      { key: "menu.fila_financeiro", label: "Fila do Financeiro", description: "Aprovação e análise financeira", icon: <Inbox className="h-4 w-4" /> },
      { key: "menu.contratos", label: "Contratos", description: "Visualização e geração de contratos", icon: <FileText className="h-4 w-4" />, children: crudChildren("contratos") },
      { key: "menu.receitas", label: "Receitas", description: "Lançamento e controle de receitas", icon: <TrendingUp className="h-4 w-4" /> },
      { key: "menu.despesas", label: "Despesas", description: "Lançamento e controle de despesas", icon: <TrendingDown className="h-4 w-4" /> },
      { key: "menu.dre", label: "DRE", description: "Demonstrativo de Resultado do Exercício", icon: <BarChart3 className="h-4 w-4" /> },
    ],
  },
  {
    key: "menu.planos", label: "Planos", description: "Cadastro e gestão de planos",
    icon: <BookOpen className="h-4 w-4" />,
    children: crudChildren("planos"),
  },
  {
    key: "menu.modulos", label: "Módulos", description: "Gestão de módulos do sistema",
    icon: <Settings className="h-4 w-4" />,
    children: crudChildren("modulos"),
  },
  {
    key: "menu.perfil", label: "Meu Perfil", description: "Acesso ao perfil pessoal",
    icon: <Users className="h-4 w-4" />,
  },
  {
    key: "menu.usuarios", label: "Usuários", description: "Gerenciar contas de usuários",
    icon: <Users className="h-4 w-4" />,
    children: crudChildren("usuarios"),
  },
  {
    key: "menu.filiais", label: "Filiais", description: "Gerenciar filiais do sistema",
    icon: <Building2 className="h-4 w-4" />,
    children: crudChildren("filiais"),
  },
  {
    key: "menu.modelos_contrato", label: "Modelos de Documentos", description: "Gerenciar templates de contratos",
    icon: <FileText className="h-4 w-4" />,
    children: crudChildren("modelos_contrato"),
  },
  {
    key: "menu.notificacoes", label: "Notificações", description: "Gerenciar notificações do sistema",
    icon: <Bell className="h-4 w-4" />,
  },
  // Onboarding group
  {
    key: "menu.painel_atendimento", label: "Painel de Atendimento", description: "Painel kanban de atendimento",
    icon: <Headphones className="h-4 w-4" />,
  },
  {
    key: "menu.agenda", label: "Agenda", description: "Calendário de agendamentos",
    icon: <Calendar className="h-4 w-4" />,
  },
  {
    key: "menu.tickets", label: "Tickets", description: "Gestão de tickets de suporte",
    icon: <Ticket className="h-4 w-4" />,
  },
  // Cadastros extras
  {
    key: "menu.fornecedores", label: "Fornecedores", description: "Cadastro de fornecedores",
    icon: <Building2 className="h-4 w-4" />,
    children: crudChildren("fornecedores"),
  },
  {
    key: "menu.servicos", label: "Catálogo de Serviços", description: "Cadastro de serviços avulsos",
    icon: <Wrench className="h-4 w-4" />,
    children: crudChildren("servicos"),
  },
  // Parâmetros extras
  {
    key: "menu.perfis_usuario", label: "Perfis de Usuário", description: "Gerenciar permissões por perfil",
    icon: <Globe className="h-4 w-4" />,
  },
  {
    key: "menu.jornadas", label: "Jornadas de Implantação", description: "Configurar jornadas de onboarding",
    icon: <ListOrdered className="h-4 w-4" />,
  },
  {
    key: "menu.mesas_atendimento", label: "Mesas de Atendimento", description: "Configurar mesas de trabalho",
    icon: <Headphones className="h-4 w-4" />,
  },
  {
    key: "menu.etapas_painel", label: "Etapas do Painel", description: "Configurar etapas do kanban",
    icon: <ListOrdered className="h-4 w-4" />,
  },
  {
    key: "menu.segmentos", label: "Segmentos", description: "Gerenciar segmentos de clientes",
    icon: <UserCheck className="h-4 w-4" />,
    children: crudChildren("segmentos"),
  },
  {
    key: "menu.integracoes", label: "Integrações", description: "Configurar integrações externas",
    icon: <Plug className="h-4 w-4" />,
  },
  {
    key: "menu.setores", label: "Setores", description: "Gerenciar setores vinculados aos templates de mensagens",
    icon: <Building2 className="h-4 w-4" />,
  },
];

// Group menus into sections for display
interface MenuSection {
  title: string;
  icon: React.ReactNode;
  items: MenuNode[];
}

const MENU_SECTIONS: MenuSection[] = [
  {
    title: "Dashboard",
    icon: <LayoutDashboard className="h-4 w-4" />,
    items: MENU_TREE.filter(m => m.key === "menu.dashboard"),
  },
  {
    title: "Onboarding",
    icon: <Headphones className="h-4 w-4" />,
    items: MENU_TREE.filter(m => ["menu.painel_atendimento", "menu.agenda", "menu.tickets"].includes(m.key)),
  },
  {
    title: "Cadastros",
    icon: <UserCheck className="h-4 w-4" />,
    items: MENU_TREE.filter(m => ["menu.clientes", "menu.planos", "menu.modulos", "menu.fornecedores", "menu.servicos"].includes(m.key)),
  },
  {
    title: "Vendas",
    icon: <ShoppingCart className="h-4 w-4" />,
    items: MENU_TREE.filter(m => m.key === "menu.pedidos"),
  },
  {
    title: "Financeiro",
    icon: <DollarSign className="h-4 w-4" />,
    items: MENU_TREE.filter(m => m.key === "menu.financeiro"),
  },
  {
    title: "Parâmetros",
    icon: <Building2 className="h-4 w-4" />,
    items: MENU_TREE.filter(m =>
      ["menu.filiais", "menu.usuarios", "menu.perfis_usuario", "menu.modelos_contrato",
       "menu.notificacoes", "menu.integracoes", "menu.setores", "menu.jornadas", "menu.mesas_atendimento",
       "menu.etapas_painel", "menu.segmentos"].includes(m.key)
    ),
  },
  {
    title: "Pessoal",
    icon: <Users className="h-4 w-4" />,
    items: MENU_TREE.filter(m => m.key === "menu.perfil"),
  },
];

const ACTION_PERMS: { key: string; label: string; description: string; icon: React.ReactNode }[] = [
  { key: "acao.aprovar_pedido", label: "Aprovar Pedido", description: "Permite aprovar/reprovar pedidos no financeiro", icon: <ShoppingCart className="h-4 w-4" /> },
  { key: "acao.gerar_contrato", label: "Gerar Contrato", description: "Permite gerar contratos em PDF", icon: <FileText className="h-4 w-4" /> },
  { key: "acao.gerenciar_desconto", label: "Gerenciar Desconto", description: "Permite aprovar/reprovar solicitações de desconto", icon: <DollarSign className="h-4 w-4" /> },
  { key: "acao.editar_config_projeto", label: "Editar Config. Projeto", description: "Permite editar técnico e tipo de atendimento após etapa de agendamento", icon: <Settings className="h-4 w-4" /> },
  { key: "acao.pausar_projeto", label: "Pausar Projeto", description: "Permite pausar projetos no painel de atendimento", icon: <Settings className="h-4 w-4" /> },
  { key: "acao.recusar_projeto", label: "Recusar Projeto", description: "Permite recusar projetos no painel de atendimento", icon: <Settings className="h-4 w-4" /> },
  { key: "acao.gerenciar_apontamento", label: "Gerenciar Apontamento", description: "Permite trocar ou remover apontamentos de usuários", icon: <Users className="h-4 w-4" /> },
  { key: "acao.cadastro_retroativo", label: "Cadastro Retroativo", description: "Permite cadastrar contratos retroativos sem automação", icon: <FileText className="h-4 w-4" /> },
  { key: "acao.importar_clientes", label: "Importar Clientes", description: "Permite importar lista de clientes via planilha", icon: <Users className="h-4 w-4" /> },
  { key: "acao.voltar_etapa", label: "Voltar Etapa", description: "Permite mover cards para etapas anteriores no painel de atendimento", icon: <Settings className="h-4 w-4" /> },
  { key: "acao.editar_checklist", label: "Editar Checklist", description: "Permite editar itens do checklist da etapa no painel de atendimento", icon: <Settings className="h-4 w-4" /> },
  { key: "acao.enviar_espelho_whatsapp", label: "Enviar Espelho WhatsApp", description: "Permite enviar espelho do pedido via WhatsApp", icon: <Settings className="h-4 w-4" /> },
  { key: "acao.visualiza_seguidores_projeto", label: "Visualizar Seguidores", description: "Permite visualizar os seguidores de um projeto no painel de atendimento", icon: <Users className="h-4 w-4" /> },
  { key: "acao.regerar_contrato", label: "Regerar Contrato", description: "Permite regerar contratos já enviados para ZapSign", icon: <FileText className="h-4 w-4" /> },
  { key: "acao.ver_historico_clientes", label: "Ver Histórico Contratual", description: "Permite visualizar o histórico contratual no cadastro do cliente", icon: <FileText className="h-4 w-4" /> },
];

const ROLES: AppRole[] = ["admin", "gestor", "financeiro", "vendedor", "operacional", "tecnico"];

// ─── Permission Row Component ───────────────────────────────────────────────

function PermissionRow({
  label, description, icon, perm, isAdminRole, isChanged, isActive,
  onToggle, indent = false,
}: {
  label: string; description: string; icon: React.ReactNode;
  perm: RolePermission | undefined; isAdminRole: boolean;
  isChanged: boolean; isActive: boolean;
  onToggle: () => void; indent?: boolean;
}) {
  if (!perm) return null;
  return (
    <div className={cn(
      "flex items-center justify-between py-2.5",
      indent && "pl-8 border-l-2 border-muted ml-4"
    )}>
      <div className="flex items-center gap-3">
        <span className="text-muted-foreground">{icon}</span>
        <div>
          <p className={cn("text-sm font-medium text-foreground", indent && "text-[13px]")}>{label}</p>
          <p className="text-xs text-muted-foreground">{description}</p>
        </div>
      </div>
      <div className="flex items-center gap-2">
        {isChanged && (
          <Badge variant="outline" className="text-[10px] bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-900/20 dark:text-amber-400 dark:border-amber-800">
            Alterado
          </Badge>
        )}
        <Switch checked={isActive} onCheckedChange={onToggle} disabled={isAdminRole} />
      </div>
    </div>
  );
}

// ─── Main Component ─────────────────────────────────────────────────────────

export default function PerfisUsuario() {
  const { isAdmin } = useAuth();
  const [permissions, setPermissions] = useState<RolePermission[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [changes, setChanges] = useState<Record<string, boolean>>({});
  const [activeTab, setActiveTab] = useState<string>("admin");
  const [openSections, setOpenSections] = useState<Record<string, boolean>>({});

  async function loadPermissions() {
    setLoading(true);
    const { data, error } = await supabase
      .from("role_permissions")
      .select("*")
      .order("role")
      .order("permissao");
    if (error) { toast.error("Erro ao carregar permissões"); setLoading(false); return; }
    setPermissions((data || []) as RolePermission[]);
    setChanges({});
    setLoading(false);
  }

  useEffect(() => { loadPermissions(); }, []);

  function togglePermission(id: string, currentValue: boolean) {
    const perm = permissions.find(p => p.id === id);
    if (perm?.role === "admin") {
      toast.error("Permissões do Administrador não podem ser alteradas");
      return;
    }
    setChanges(prev => ({ ...prev, [id]: !(prev[id] ?? currentValue) }));
  }

  function getEffectiveValue(id: string, originalValue: boolean): boolean {
    return changes[id] ?? originalValue;
  }

  const hasChanges = Object.keys(changes).length > 0;

  async function handleSave() {
    setSaving(true);
    const updates = Object.entries(changes).map(([id, ativo]) =>
      supabase.from("role_permissions").update({ ativo }).eq("id", id)
    );
    const results = await Promise.all(updates);
    const hasError = results.some(r => r.error);
    if (hasError) {
      toast.error("Erro ao salvar algumas permissões");
    } else {
      toast.success("Permissões atualizadas com sucesso!");
    }
    setSaving(false);
    loadPermissions();
  }

  function getRolePermissions(role: string) {
    return permissions.filter(p => p.role === role);
  }

  function toggleSection(key: string) {
    setOpenSections(prev => ({ ...prev, [key]: !prev[key] }));
  }

  if (!isAdmin) {
    return (
      <AppLayout>
        <div className="flex items-center justify-center h-64 text-muted-foreground">
          Acesso restrito a administradores.
        </div>
      </AppLayout>
    );
  }

  return (
    <AppLayout>
      <div className="space-y-5">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-foreground flex items-center gap-2">
              <Shield className="h-6 w-6 text-primary" />
              Perfis de Usuário
            </h1>
            <p className="text-sm text-muted-foreground">
              Configure as permissões de acesso para cada perfil do sistema
            </p>
          </div>
          {hasChanges && (
            <Button onClick={handleSave} disabled={saving} className="gap-2">
              {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
              Salvar Alterações
            </Button>
          )}
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-20">
            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
          </div>
        ) : (
          <Tabs value={activeTab} onValueChange={setActiveTab}>
            <TabsList className="mb-4">
              {ROLES.map(role => (
                <TabsTrigger key={role} value={role} className="gap-2">
                  <Badge variant="outline" className={`text-[10px] px-1.5 py-0 ${ROLE_COLORS[role]}`}>
                    {ROLE_LABELS[role]}
                  </Badge>
                </TabsTrigger>
              ))}
            </TabsList>

            {ROLES.map(role => {
              const rolePerms = getRolePermissions(role);
              const isAdminRole = role === "admin";

              return (
                <TabsContent key={role} value={role} className="space-y-4">
                  {isAdminRole && (
                    <div className="bg-muted/50 border border-border rounded-lg px-4 py-3 text-sm text-muted-foreground flex items-center gap-2">
                      <Shield className="h-4 w-4 text-primary" />
                      O perfil Administrador possui acesso total ao sistema e suas permissões não podem ser alteradas.
                    </div>
                  )}

                  {/* Menus por Seção */}
                  <Card>
                    <CardHeader className="pb-3">
                      <CardTitle className="text-base flex items-center gap-2">
                        <LayoutDashboard className="h-4 w-4 text-primary" />
                        Acesso aos Menus
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-1">
                      {MENU_SECTIONS.map(section => {
                        const sectionKey = `${role}_${section.title}`;
                        const isOpen = openSections[sectionKey] ?? false;
                        
                        // Check if any items in this section exist as permissions
                        const hasItems = section.items.some(item => {
                          const hasPerm = rolePerms.some(p => p.permissao === item.key);
                          const hasChildPerm = item.children?.some(c => rolePerms.some(p => p.permissao === c.key));
                          return hasPerm || hasChildPerm;
                        });
                        if (!hasItems) return null;

                        return (
                          <Collapsible key={sectionKey} open={isOpen} onOpenChange={() => toggleSection(sectionKey)}>
                            <CollapsibleTrigger asChild>
                              <button className="flex items-center justify-between w-full px-3 py-2.5 rounded-lg text-sm font-semibold hover:bg-muted/50 transition-colors">
                                <div className="flex items-center gap-2 text-foreground">
                                  <span className="text-primary">{section.icon}</span>
                                  {section.title}
                                </div>
                                <ChevronDown className={cn("h-4 w-4 text-muted-foreground transition-transform", isOpen && "rotate-180")} />
                              </button>
                            </CollapsibleTrigger>
                            <CollapsibleContent>
                              <div className="divide-y divide-border/50 px-2 pb-2">
                                {section.items.map(item => {
                                  const perm = rolePerms.find(p => p.permissao === item.key);
                                  if (!perm) return null;
                                  const isActive = getEffectiveValue(perm.id, perm.ativo);
                                  const isChanged = changes[perm.id] !== undefined;

                                  return (
                                    <div key={item.key}>
                                      <PermissionRow
                                        label={item.label}
                                        description={item.description}
                                        icon={item.icon}
                                        perm={perm}
                                        isAdminRole={isAdminRole}
                                        isChanged={isChanged}
                                        isActive={isActive}
                                        onToggle={() => togglePermission(perm.id, perm.ativo)}
                                      />
                                      {/* Submenus */}
                                      {item.children && isActive && (
                                        <div className="space-y-0">
                                          {item.children.map(child => {
                                            const childPerm = rolePerms.find(p => p.permissao === child.key);
                                            if (!childPerm) return null;
                                            const childActive = getEffectiveValue(childPerm.id, childPerm.ativo);
                                            const childChanged = changes[childPerm.id] !== undefined;

                                            return (
                                              <div key={child.key}>
                                                <PermissionRow
                                                  label={child.label}
                                                  description={child.description}
                                                  icon={child.icon}
                                                  perm={childPerm}
                                                  isAdminRole={isAdminRole}
                                                  isChanged={childChanged}
                                                  isActive={childActive}
                                                  onToggle={() => togglePermission(childPerm.id, childPerm.ativo)}
                                                  indent
                                                />
                                                {/* CRUD sub-permissions */}
                                                {child.children && childActive && (
                                                  <div className="space-y-0">
                                                    {child.children.map(grandchild => {
                                                      const gcPerm = rolePerms.find(p => p.permissao === grandchild.key);
                                                      if (!gcPerm) return null;
                                                      const gcActive = getEffectiveValue(gcPerm.id, gcPerm.ativo);
                                                      const gcChanged = changes[gcPerm.id] !== undefined;
                                                      return (
                                                        <PermissionRow
                                                          key={grandchild.key}
                                                          label={grandchild.label}
                                                          description={grandchild.description}
                                                          icon={grandchild.icon}
                                                          perm={gcPerm}
                                                          isAdminRole={isAdminRole}
                                                          isChanged={gcChanged}
                                                          isActive={gcActive}
                                                          onToggle={() => togglePermission(gcPerm.id, gcPerm.ativo)}
                                                          indent
                                                        />
                                                      );
                                                    })}
                                                  </div>
                                                )}
                                              </div>
                                            );
                                          })}
                                        </div>
                                      )}
                                    </div>
                                  );
                                })}
                              </div>
                            </CollapsibleContent>
                          </Collapsible>
                        );
                      })}
                    </CardContent>
                  </Card>

                  {/* Ações */}
                  <Card>
                    <CardHeader className="pb-3">
                      <CardTitle className="text-base flex items-center gap-2">
                        <Settings className="h-4 w-4 text-primary" />
                        Ações Especiais
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="divide-y divide-border">
                        {ACTION_PERMS.map(action => {
                          const perm = rolePerms.find(p => p.permissao === action.key);
                          if (!perm) return null;
                          const isActive = getEffectiveValue(perm.id, perm.ativo);
                          const isChanged = changes[perm.id] !== undefined;

                          return (
                            <PermissionRow
                              key={action.key}
                              label={action.label}
                              description={action.description}
                              icon={action.icon}
                              perm={perm}
                              isAdminRole={isAdminRole}
                              isChanged={isChanged}
                              isActive={isActive}
                              onToggle={() => togglePermission(perm.id, perm.ativo)}
                            />
                          );
                        })}
                      </div>
                    </CardContent>
                  </Card>
                </TabsContent>
              );
            })}
          </Tabs>
        )}
      </div>
    </AppLayout>
  );
}
