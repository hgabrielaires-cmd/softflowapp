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
import { Loader2, Shield, Save, LayoutDashboard, Users, ShoppingCart, FileText, DollarSign, Building2, Bell, BookOpen, Plug, Settings } from "lucide-react";
import { toast } from "sonner";

interface RolePermission {
  id: string;
  role: string;
  permissao: string;
  ativo: boolean;
}

const PERMISSION_LABELS: Record<string, { label: string; description: string; icon: React.ReactNode; group: string }> = {
  "menu.dashboard": { label: "Dashboard", description: "Acesso ao painel principal", icon: <LayoutDashboard className="h-4 w-4" />, group: "Menus" },
  "menu.clientes": { label: "Clientes", description: "Cadastro e gestão de clientes", icon: <Users className="h-4 w-4" />, group: "Menus" },
  "menu.pedidos": { label: "Pedidos", description: "Gestão de pedidos de venda", icon: <ShoppingCart className="h-4 w-4" />, group: "Menus" },
  "menu.contratos": { label: "Contratos", description: "Visualização e geração de contratos", icon: <FileText className="h-4 w-4" />, group: "Menus" },
  "menu.modelos_contrato": { label: "Modelos de Contrato", description: "Gerenciar templates HTML de contratos", icon: <FileText className="h-4 w-4" />, group: "Menus" },
  "menu.planos": { label: "Planos", description: "Cadastro e gestão de planos", icon: <BookOpen className="h-4 w-4" />, group: "Menus" },
  "menu.modulos": { label: "Módulos", description: "Gestão de módulos do sistema", icon: <Settings className="h-4 w-4" />, group: "Menus" },
  "menu.financeiro": { label: "Financeiro", description: "Fila do financeiro, receitas, despesas, DRE", icon: <DollarSign className="h-4 w-4" />, group: "Menus" },
  "menu.usuarios": { label: "Usuários", description: "Gerenciar contas de usuários", icon: <Users className="h-4 w-4" />, group: "Menus" },
  "menu.filiais": { label: "Filiais", description: "Gerenciar filiais do sistema", icon: <Building2 className="h-4 w-4" />, group: "Menus" },
  "menu.notificacoes": { label: "Notificações", description: "Gerenciar notificações do sistema", icon: <Bell className="h-4 w-4" />, group: "Menus" },
  "menu.perfil": { label: "Meu Perfil", description: "Acesso ao perfil pessoal", icon: <Users className="h-4 w-4" />, group: "Menus" },
  "acao.aprovar_pedido": { label: "Aprovar Pedido", description: "Permite aprovar/reprovar pedidos no financeiro", icon: <ShoppingCart className="h-4 w-4" />, group: "Ações" },
  "acao.gerar_contrato": { label: "Gerar Contrato", description: "Permite gerar contratos em PDF", icon: <FileText className="h-4 w-4" />, group: "Ações" },
  "acao.gerenciar_desconto": { label: "Gerenciar Desconto", description: "Permite aprovar/reprovar solicitações de desconto", icon: <DollarSign className="h-4 w-4" />, group: "Ações" },
  "acao.editar_config_projeto": { label: "Editar Config. Projeto", description: "Permite editar técnico e tipo de atendimento após etapa de agendamento", icon: <Settings className="h-4 w-4" />, group: "Ações" },
  "acao.pausar_projeto": { label: "Pausar Projeto", description: "Permite pausar projetos no painel de atendimento", icon: <Settings className="h-4 w-4" />, group: "Ações" },
  "acao.recusar_projeto": { label: "Recusar Projeto", description: "Permite recusar projetos no painel de atendimento", icon: <Settings className="h-4 w-4" />, group: "Ações" },
  "acao.gerenciar_apontamento": { label: "Gerenciar Apontamento", description: "Permite trocar ou remover apontamentos de usuários", icon: <Users className="h-4 w-4" />, group: "Ações" },
  "acao.cadastro_retroativo": { label: "Cadastro Retroativo", description: "Permite cadastrar contratos retroativos sem automação", icon: <FileText className="h-4 w-4" />, group: "Ações" },
  "acao.importar_clientes": { label: "Importar Clientes", description: "Permite importar lista de clientes via planilha", icon: <Users className="h-4 w-4" />, group: "Ações" },
  "acao.voltar_etapa": { label: "Voltar Etapa", description: "Permite mover cards para etapas anteriores no painel de atendimento", icon: <Settings className="h-4 w-4" />, group: "Ações" },
  "acao.editar_checklist": { label: "Editar Checklist", description: "Permite editar itens do checklist da etapa no painel de atendimento", icon: <Settings className="h-4 w-4" />, group: "Ações" },
  "acao.enviar_espelho_whatsapp": { label: "Enviar Espelho WhatsApp", description: "Permite enviar espelho do pedido via WhatsApp", icon: <Settings className="h-4 w-4" />, group: "Ações" },
};

const ROLES: AppRole[] = ["admin", "financeiro", "vendedor", "operacional", "tecnico"];

export default function PerfisUsuario() {
  const { isAdmin } = useAuth();
  const [permissions, setPermissions] = useState<RolePermission[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [changes, setChanges] = useState<Record<string, boolean>>({});
  const [activeTab, setActiveTab] = useState<string>("admin");

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
    // Admin role cannot be changed
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

  const menuPerms = Object.entries(PERMISSION_LABELS).filter(([, v]) => v.group === "Menus");
  const actionPerms = Object.entries(PERMISSION_LABELS).filter(([, v]) => v.group === "Ações");

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
        {/* Header */}
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

                  {/* Menus */}
                  <Card>
                    <CardHeader className="pb-3">
                      <CardTitle className="text-base flex items-center gap-2">
                        <LayoutDashboard className="h-4 w-4 text-primary" />
                        Acesso aos Menus
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="divide-y divide-border">
                        {menuPerms.map(([key, meta]) => {
                          const perm = rolePerms.find(p => p.permissao === key);
                          if (!perm) return null;
                          const isActive = getEffectiveValue(perm.id, perm.ativo);
                          const isChanged = changes[perm.id] !== undefined;

                          return (
                            <div key={key} className="flex items-center justify-between py-3 first:pt-0 last:pb-0">
                              <div className="flex items-center gap-3">
                                <span className="text-muted-foreground">{meta.icon}</span>
                                <div>
                                  <p className="text-sm font-medium text-foreground">{meta.label}</p>
                                  <p className="text-xs text-muted-foreground">{meta.description}</p>
                                </div>
                              </div>
                              <div className="flex items-center gap-2">
                                {isChanged && (
                                  <Badge variant="outline" className="text-[10px] bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-900/20 dark:text-amber-400 dark:border-amber-800">
                                    Alterado
                                  </Badge>
                                )}
                                <Switch
                                  checked={isActive}
                                  onCheckedChange={() => togglePermission(perm.id, perm.ativo)}
                                  disabled={isAdminRole}
                                />
                              </div>
                            </div>
                          );
                        })}
                      </div>
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
                        {actionPerms.map(([key, meta]) => {
                          const perm = rolePerms.find(p => p.permissao === key);
                          if (!perm) return null;
                          const isActive = getEffectiveValue(perm.id, perm.ativo);
                          const isChanged = changes[perm.id] !== undefined;

                          return (
                            <div key={key} className="flex items-center justify-between py-3 first:pt-0 last:pb-0">
                              <div className="flex items-center gap-3">
                                <span className="text-muted-foreground">{meta.icon}</span>
                                <div>
                                  <p className="text-sm font-medium text-foreground">{meta.label}</p>
                                  <p className="text-xs text-muted-foreground">{meta.description}</p>
                                </div>
                              </div>
                              <div className="flex items-center gap-2">
                                {isChanged && (
                                  <Badge variant="outline" className="text-[10px] bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-900/20 dark:text-amber-400 dark:border-amber-800">
                                    Alterado
                                  </Badge>
                                )}
                                <Switch
                                  checked={isActive}
                                  onCheckedChange={() => togglePermission(perm.id, perm.ativo)}
                                  disabled={isAdminRole}
                                />
                              </div>
                            </div>
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
