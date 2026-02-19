import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { AppLayout } from "@/components/AppLayout";
import { useAuth } from "@/context/AuthContext";
import { Navigate } from "react-router-dom";
import { Profile, AppRole, ROLE_LABELS, Filial } from "@/lib/supabase-types";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { Plus, Search, UserX, UserCheck, Shield, Loader2, Mail, Pencil, ShieldCheck } from "lucide-react";
import { toast } from "sonner";
import { Switch } from "@/components/ui/switch";

interface UserWithRoles extends Profile {
  roles: AppRole[];
  filial_nome?: string;
}

const ALL_ROLES: AppRole[] = ["admin", "financeiro", "vendedor", "tecnico"];

export default function Usuarios() {
  const { isAdmin } = useAuth();
  const [users, setUsers] = useState<UserWithRoles[]>([]);
  const [filiais, setFiliais] = useState<Filial[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");

  // Create dialog
  const [openInvite, setOpenInvite] = useState(false);
  const [inviteEmail, setInviteEmail] = useState("");
  const [inviteName, setInviteName] = useState("");
  const [inviteRole, setInviteRole] = useState<AppRole>("vendedor");
  const [inviteFilialId, setInviteFilialId] = useState("");
  const [inviteComissaoImp, setInviteComissaoImp] = useState("5");
  const [inviteComissaoMens, setInviteComissaoMens] = useState("5");
  const [inviteDescontoLimiteImp, setInviteDescontoLimiteImp] = useState("0");
  const [inviteDescontoLimiteMens, setInviteDescontoLimiteMens] = useState("0");
  const [inviteGestorDesconto, setInviteGestorDesconto] = useState(false);
  const [inviting, setInviting] = useState(false);

  // Edit dialog
  const [openEdit, setOpenEdit] = useState(false);
  const [editingUser, setEditingUser] = useState<UserWithRoles | null>(null);
  const [editName, setEditName] = useState("");
  const [editRole, setEditRole] = useState<AppRole>("vendedor");
  const [editFilialId, setEditFilialId] = useState("");
  const [editComissaoImp, setEditComissaoImp] = useState("5");
  const [editComissaoMens, setEditComissaoMens] = useState("5");
  const [editDescontoLimiteImp, setEditDescontoLimiteImp] = useState("0");
  const [editDescontoLimiteMens, setEditDescontoLimiteMens] = useState("0");
  const [editGestorDesconto, setEditGestorDesconto] = useState(false);
  const [editActive, setEditActive] = useState(true);
  const [saving, setSaving] = useState(false);

  if (!isAdmin) return <Navigate to="/dashboard" replace />;

  async function loadFiliais() {
    const { data } = await supabase.from("filiais").select("*").eq("ativa", true).order("nome");
    if (data) setFiliais(data as Filial[]);
  }

  async function loadUsers() {
    setLoading(true);
    const { data: profiles, error } = await supabase
      .from("profiles")
      .select("*, filiais!profiles_filial_id_fkey(nome)")
      .order("full_name");

    if (error) { toast.error("Erro ao carregar usuários"); setLoading(false); return; }

    const { data: roleData } = await supabase.from("user_roles").select("*");

    const enriched: UserWithRoles[] = (profiles || []).map((p: any) => ({
      ...p,
      filial_nome: p.filiais?.nome || p.filial || null,
      roles: (roleData || []).filter((r) => r.user_id === p.user_id).map((r) => r.role as AppRole),
    }));

    setUsers(enriched);
    setLoading(false);
  }

  useEffect(() => {
    loadFiliais();
    loadUsers();
  }, []);

  // ── Create ──────────────────────────────────────────────
  async function handleInvite(e: React.FormEvent) {
    e.preventDefault();
    setInviting(true);
    try {
      const { data, error } = await supabase.auth.signUp({
        email: inviteEmail,
        password: Math.random().toString(36).slice(-12) + "Aa1!",
        options: { data: { full_name: inviteName } },
      });

      if (error) throw error;
      if (!data.user) throw new Error("Usuário não criado");

      await supabase.from("profiles").update({
        filial_id: (inviteFilialId && inviteFilialId !== "todas") ? inviteFilialId : null,
        comissao_percentual: parseFloat(inviteComissaoImp) || 5,
        comissao_implantacao_percentual: parseFloat(inviteComissaoImp) || 5,
        comissao_mensalidade_percentual: parseFloat(inviteComissaoMens) || 5,
        desconto_limite_implantacao: parseFloat(inviteDescontoLimiteImp) || 0,
        desconto_limite_mensalidade: parseFloat(inviteDescontoLimiteMens) || 0,
        gestor_desconto: inviteGestorDesconto,
      } as any).eq("user_id", data.user.id);

      await supabase.from("user_roles").insert({ user_id: data.user.id, role: inviteRole });

      toast.success(`Usuário ${inviteName} criado com sucesso!`);
      setOpenInvite(false);
      setInviteEmail(""); setInviteName(""); setInviteRole("vendedor"); setInviteFilialId(""); setInviteComissaoImp("5"); setInviteComissaoMens("5"); setInviteDescontoLimiteImp("0"); setInviteDescontoLimiteMens("0"); setInviteGestorDesconto(false);
      loadUsers();
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : "Erro ao criar usuário");
    }
    setInviting(false);
  }

  // ── Edit ────────────────────────────────────────────────
  function openEditDialog(user: UserWithRoles) {
    setEditingUser(user);
    setEditName(user.full_name);
    setEditRole(user.roles[0] || "vendedor");
    setEditFilialId(user.filial_id || "todas");
    setEditComissaoImp(((user as any).comissao_implantacao_percentual ?? user.comissao_percentual ?? 5).toString());
    setEditComissaoMens(((user as any).comissao_mensalidade_percentual ?? user.comissao_percentual ?? 5).toString());
    setEditDescontoLimiteImp(((user as any).desconto_limite_implantacao ?? 0).toString());
    setEditDescontoLimiteMens(((user as any).desconto_limite_mensalidade ?? 0).toString());
    setEditGestorDesconto((user as any).gestor_desconto ?? false);
    setEditActive(user.active);
    setOpenEdit(true);
  }

  async function handleEdit(e: React.FormEvent) {
    e.preventDefault();
    if (!editingUser) return;
    setSaving(true);
    try {
      // Update profile
      const { error: profileError } = await supabase.from("profiles").update({
        full_name: editName,
        filial_id: (editFilialId && editFilialId !== "todas") ? editFilialId : null,
        comissao_percentual: parseFloat(editComissaoImp) || 0,
        comissao_implantacao_percentual: parseFloat(editComissaoImp) || 0,
        comissao_mensalidade_percentual: parseFloat(editComissaoMens) || 0,
        desconto_limite_implantacao: parseFloat(editDescontoLimiteImp) || 0,
        desconto_limite_mensalidade: parseFloat(editDescontoLimiteMens) || 0,
        gestor_desconto: editGestorDesconto,
        active: editActive,
      } as any).eq("user_id", editingUser.user_id);

      if (profileError) throw profileError;

      // Update role: delete existing and insert new
      const { error: deleteError } = await supabase
        .from("user_roles")
        .delete()
        .eq("user_id", editingUser.user_id);
      if (deleteError) throw deleteError;

      const { error: insertError } = await supabase
        .from("user_roles")
        .insert({ user_id: editingUser.user_id, role: editRole });
      if (insertError) throw insertError;

      toast.success("Usuário atualizado com sucesso!");
      setOpenEdit(false);
      loadUsers();
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : "Erro ao atualizar usuário");
    }
    setSaving(false);
  }

  // ── Toggle active ────────────────────────────────────────
  async function toggleActive(user: UserWithRoles) {
    const { error } = await supabase.from("profiles").update({ active: !user.active }).eq("user_id", user.user_id);
    if (error) { toast.error("Erro ao atualizar usuário"); return; }
    toast.success(user.active ? "Usuário desativado" : "Usuário ativado");
    loadUsers();
  }

  const filtered = users.filter(
    (u) =>
      u.full_name.toLowerCase().includes(search.toLowerCase()) ||
      u.email.toLowerCase().includes(search.toLowerCase())
  );

  const FilialSelect = ({ value, onChange }: { value: string; onChange: (v: string) => void }) => (
    <Select value={value} onValueChange={onChange}>
      <SelectTrigger>
        <SelectValue placeholder="Selecione..." />
      </SelectTrigger>
      <SelectContent>
        <SelectItem value="todas">🌐 Todas as filiais</SelectItem>
        {filiais.map((f) => (
          <SelectItem key={f.id} value={f.id}>{f.nome}</SelectItem>
        ))}
      </SelectContent>
    </Select>
  );

  return (
    <AppLayout>
      <div className="space-y-5">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-foreground">Usuários</h1>
            <p className="text-sm text-muted-foreground">Gerencie os colaboradores e permissões</p>
          </div>

          <Button className="gap-2" onClick={() => setOpenInvite(true)}>
            <Plus className="h-4 w-4" />
            Novo usuário
          </Button>
        </div>

        {/* Search */}
        <div className="relative max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Buscar por nome ou e-mail..."
            className="pl-9"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>

        {/* Table */}
        <div className="bg-card rounded-xl border border-border shadow-card overflow-hidden">
          <Table>
            <TableHeader>
              <TableRow className="bg-muted/50">
                <TableHead>Nome</TableHead>
                <TableHead>E-mail</TableHead>
                <TableHead>Cargo</TableHead>
                <TableHead>Filial</TableHead>
                <TableHead>Comissão</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Ações</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading ? (
                <TableRow>
                  <TableCell colSpan={7} className="text-center py-12">
                    <Loader2 className="h-6 w-6 animate-spin mx-auto text-muted-foreground" />
                  </TableCell>
                </TableRow>
              ) : filtered.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={7} className="text-center py-12 text-muted-foreground">
                    Nenhum usuário encontrado
                  </TableCell>
                </TableRow>
              ) : (
                filtered.map((user) => (
                  <TableRow key={user.id}>
                    <TableCell className="font-medium">{user.full_name}</TableCell>
                    <TableCell className="text-muted-foreground text-sm">{user.email}</TableCell>
                    <TableCell>
                      <span className="text-sm">
                        {user.roles[0] ? ROLE_LABELS[user.roles[0]] : <span className="text-muted-foreground">—</span>}
                      </span>
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground">
                      {user.filial_id
                        ? (user.filial_nome || filiais.find(f => f.id === user.filial_id)?.nome || "—")
                        : <span className="text-xs text-primary font-medium">🌐 Todas</span>
                      }
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground">
                      {(user as any).comissao_implantacao_percentual != null
                        ? `Imp: ${(user as any).comissao_implantacao_percentual}% / Mens: ${(user as any).comissao_mensalidade_percentual ?? user.comissao_percentual ?? 0}%`
                        : user.comissao_percentual != null ? `${user.comissao_percentual}%` : "—"
                      }
                    </TableCell>
                    <TableCell>
                      <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${
                        user.active ? "bg-sky-100 text-sky-700" : "bg-gray-100 text-gray-500"
                      }`}>
                        {user.active ? "Ativo" : "Inativo"}
                      </span>
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex items-center justify-end gap-1">
                        {/* Edit */}
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-7 w-7"
                          onClick={() => openEditDialog(user)}
                          title="Editar usuário"
                        >
                          <Pencil className="h-3.5 w-3.5 text-muted-foreground" />
                        </Button>

                        {/* Toggle active */}
                        <AlertDialog>
                          <AlertDialogTrigger asChild>
                            <Button variant="ghost" size="icon" className="h-7 w-7" title={user.active ? "Desativar" : "Ativar"}>
                              {user.active ? (
                                <UserX className="h-4 w-4 text-muted-foreground" />
                              ) : (
                                <UserCheck className="h-4 w-4 text-primary" />
                              )}
                            </Button>
                          </AlertDialogTrigger>
                          <AlertDialogContent>
                            <AlertDialogHeader>
                              <AlertDialogTitle>
                                {user.active ? "Desativar usuário?" : "Reativar usuário?"}
                              </AlertDialogTitle>
                              <AlertDialogDescription>
                                {user.active
                                  ? `${user.full_name} perderá acesso ao sistema.`
                                  : `${user.full_name} terá acesso restaurado.`}
                              </AlertDialogDescription>
                            </AlertDialogHeader>
                            <AlertDialogFooter>
                              <AlertDialogCancel>Cancelar</AlertDialogCancel>
                              <AlertDialogAction onClick={() => toggleActive(user)}>
                                Confirmar
                              </AlertDialogAction>
                            </AlertDialogFooter>
                          </AlertDialogContent>
                        </AlertDialog>
                      </div>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
          {!loading && (
            <div className="px-4 py-3 border-t border-border text-xs text-muted-foreground flex items-center gap-1.5">
              <Shield className="h-3.5 w-3.5" />
              {filtered.length} usuário(s) encontrado(s)
            </div>
          )}
        </div>
      </div>

      {/* ── Create Dialog ── */}
      <Dialog open={openInvite} onOpenChange={setOpenInvite}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Criar novo usuário</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleInvite} className="space-y-4">
            <div className="space-y-1.5">
              <Label>Nome completo</Label>
              <Input
                placeholder="João da Silva"
                value={inviteName}
                onChange={(e) => setInviteName(e.target.value)}
                required
              />
            </div>
            <div className="space-y-1.5">
              <Label>E-mail</Label>
              <Input
                type="email"
                placeholder="joao@softplus.com.br"
                value={inviteEmail}
                onChange={(e) => setInviteEmail(e.target.value)}
                required
              />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label>Cargo</Label>
                <Select value={inviteRole} onValueChange={(v) => setInviteRole(v as AppRole)}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {ALL_ROLES.map((r) => (
                      <SelectItem key={r} value={r}>{ROLE_LABELS[r]}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label>Filial</Label>
                <FilialSelect value={inviteFilialId} onChange={setInviteFilialId} />
              </div>
            </div>
            <div className="rounded-lg border border-border p-3 space-y-3">
              <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Comissão</p>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label>Comissão implantação (%)</Label>
                  <Input
                    type="number" min="0" max="100" step="0.01" placeholder="5"
                    value={inviteComissaoImp}
                    onChange={(e) => setInviteComissaoImp(e.target.value)}
                  />
                </div>
                <div className="space-y-1.5">
                  <Label>Comissão mensalidade (%)</Label>
                  <Input
                    type="number" min="0" max="100" step="0.01" placeholder="5"
                    value={inviteComissaoMens}
                    onChange={(e) => setInviteComissaoMens(e.target.value)}
                  />
                </div>
              </div>
            </div>
            <div className="rounded-lg border border-border p-3 space-y-3">
              <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Limite de Desconto</p>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label>Desconto máx. implantação (%)</Label>
                  <Input
                    type="number" min="0" max="100" step="0.01" placeholder="0"
                    value={inviteDescontoLimiteImp}
                    onChange={(e) => setInviteDescontoLimiteImp(e.target.value)}
                  />
                </div>
                <div className="space-y-1.5">
                  <Label>Desconto máx. mensalidade (%)</Label>
                  <Input
                    type="number" min="0" max="100" step="0.01" placeholder="0"
                    value={inviteDescontoLimiteMens}
                    onChange={(e) => setInviteDescontoLimiteMens(e.target.value)}
                  />
                </div>
              </div>
              <div className="flex items-center justify-between pt-1">
                <div className="space-y-0.5">
                  <Label className="flex items-center gap-1.5 cursor-pointer">
                    <ShieldCheck className="h-4 w-4 text-primary" />
                    Gestor de desconto
                  </Label>
                  <p className="text-xs text-muted-foreground">Recebe notificações e aprova descontos acima do limite</p>
                </div>
                <Switch checked={inviteGestorDesconto} onCheckedChange={setInviteGestorDesconto} />
              </div>
            </div>
            <div className="flex justify-end gap-2 pt-2">
              <Button type="button" variant="outline" onClick={() => setOpenInvite(false)}>Cancelar</Button>
              <Button type="submit" disabled={inviting}>
                {inviting ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Mail className="h-4 w-4 mr-2" />}
                Criar usuário
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      {/* ── Edit Dialog ── */}
      <Dialog open={openEdit} onOpenChange={setOpenEdit}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Editar usuário</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleEdit} className="space-y-4">
            <div className="space-y-1.5">
              <Label>Nome completo</Label>
              <Input
                value={editName}
                onChange={(e) => setEditName(e.target.value)}
                required
              />
            </div>
            <div className="space-y-1.5">
              <Label>E-mail</Label>
              <Input value={editingUser?.email || ""} disabled className="bg-muted text-muted-foreground" />
            </div>

            {/* Permissões */}
            <div className="rounded-lg border border-border p-4 space-y-3">
              <p className="text-sm font-semibold text-foreground">Permissões de acesso</p>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label>Cargo</Label>
                  <Select value={editRole} onValueChange={(v) => setEditRole(v as AppRole)}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {ALL_ROLES.map((r) => (
                        <SelectItem key={r} value={r}>{ROLE_LABELS[r]}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1.5">
                  <Label>Filial</Label>
                  <FilialSelect value={editFilialId} onChange={setEditFilialId} />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label>Comissão implantação (%)</Label>
                  <Input
                    type="number" min="0" max="100" step="0.01"
                    value={editComissaoImp}
                    onChange={(e) => setEditComissaoImp(e.target.value)}
                  />
                </div>
                <div className="space-y-1.5">
                  <Label>Comissão mensalidade (%)</Label>
                  <Input
                    type="number" min="0" max="100" step="0.01"
                    value={editComissaoMens}
                    onChange={(e) => setEditComissaoMens(e.target.value)}
                  />
                </div>
              </div>
              <div className="border-t border-border pt-3 space-y-3">
                <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Limite de Desconto</p>
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1.5">
                    <Label>Desconto máx. implantação (%)</Label>
                    <Input
                      type="number" min="0" max="100" step="0.01"
                      value={editDescontoLimiteImp}
                      onChange={(e) => setEditDescontoLimiteImp(e.target.value)}
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label>Desconto máx. mensalidade (%)</Label>
                    <Input
                      type="number" min="0" max="100" step="0.01"
                      value={editDescontoLimiteMens}
                      onChange={(e) => setEditDescontoLimiteMens(e.target.value)}
                    />
                  </div>
                </div>
                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <Label className="flex items-center gap-1.5 cursor-pointer">
                      <ShieldCheck className="h-4 w-4 text-primary" />
                      Gestor de desconto
                    </Label>
                    <p className="text-xs text-muted-foreground">Aprova descontos acima do limite</p>
                  </div>
                  <Switch checked={editGestorDesconto} onCheckedChange={setEditGestorDesconto} />
                </div>
              </div>
              <div className="space-y-1.5">
                <Label>Status</Label>
                <Select value={editActive ? "ativo" : "inativo"} onValueChange={(v) => setEditActive(v === "ativo")}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="ativo">✅ Ativo</SelectItem>
                    <SelectItem value="inativo">⛔ Inativo</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-2">
              <Button type="button" variant="outline" onClick={() => setOpenEdit(false)}>Cancelar</Button>
              <Button type="submit" disabled={saving}>
                {saving && <Loader2 className="h-4 w-4 animate-spin mr-2" />}
                Salvar alterações
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </AppLayout>
  );
}
