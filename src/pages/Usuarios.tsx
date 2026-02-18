import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { AppLayout } from "@/components/AppLayout";
import { useAuth } from "@/context/AuthContext";
import { Navigate } from "react-router-dom";
import { Profile, AppRole, ROLE_LABELS, ROLE_COLORS, Filial } from "@/lib/supabase-types";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
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
import { Plus, Search, UserX, UserCheck, Shield, Loader2, Mail } from "lucide-react";
import { toast } from "sonner";

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
  const [openInvite, setOpenInvite] = useState(false);

  // Invite form
  const [inviteEmail, setInviteEmail] = useState("");
  const [inviteName, setInviteName] = useState("");
  const [inviteRole, setInviteRole] = useState<AppRole>("vendedor");
  const [inviteFilialId, setInviteFilialId] = useState("");
  const [inviting, setInviting] = useState(false);

  if (!isAdmin) return <Navigate to="/dashboard" replace />;

  async function loadFiliais() {
    const { data } = await supabase.from("filiais").select("*").eq("ativa", true).order("nome");
    if (data) setFiliais(data as Filial[]);
  }

  async function loadUsers() {
    setLoading(true);
    const { data: profiles, error } = await supabase
      .from("profiles")
      .select("*, filiais(nome)")
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
        filial_id: inviteFilialId || null,
      }).eq("user_id", data.user.id);

      await supabase.from("user_roles").insert({ user_id: data.user.id, role: inviteRole });

      toast.success(`Usuário ${inviteName} criado com sucesso!`);
      setOpenInvite(false);
      setInviteEmail("");
      setInviteName("");
      setInviteRole("vendedor");
      setInviteFilialId("");
      loadUsers();
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : "Erro ao criar usuário");
    }
    setInviting(false);
  }

  async function toggleActive(user: UserWithRoles) {
    const { error } = await supabase.from("profiles").update({ active: !user.active }).eq("user_id", user.user_id);
    if (error) { toast.error("Erro ao atualizar usuário"); return; }
    toast.success(user.active ? "Usuário desativado" : "Usuário ativado");
    loadUsers();
  }

  async function changeRole(userId: string, newRole: AppRole) {
    await supabase.from("user_roles").delete().eq("user_id", userId);
    await supabase.from("user_roles").insert({ user_id: userId, role: newRole });
    toast.success("Cargo atualizado");
    loadUsers();
  }

  async function changeFilial(userId: string, filialId: string) {
    const { error } = await supabase.from("profiles")
      .update({ filial_id: filialId || null })
      .eq("user_id", userId);
    if (error) { toast.error("Erro ao atualizar filial"); return; }
    toast.success("Filial atualizada");
    loadUsers();
  }

  const filtered = users.filter(
    (u) =>
      u.full_name.toLowerCase().includes(search.toLowerCase()) ||
      u.email.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <AppLayout>
      <div className="space-y-5">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-foreground">Usuários</h1>
            <p className="text-sm text-muted-foreground">Gerencie os colaboradores e permissões</p>
          </div>

          <Dialog open={openInvite} onOpenChange={setOpenInvite}>
            <DialogTrigger asChild>
              <Button className="gap-2">
                <Plus className="h-4 w-4" />
                Novo usuário
              </Button>
            </DialogTrigger>
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
                    placeholder="joao@softflow.com.br"
                    value={inviteEmail}
                    onChange={(e) => setInviteEmail(e.target.value)}
                    required
                  />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1.5">
                    <Label>Cargo</Label>
                    <Select value={inviteRole} onValueChange={(v) => setInviteRole(v as AppRole)}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {ALL_ROLES.map((r) => (
                          <SelectItem key={r} value={r}>{ROLE_LABELS[r]}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-1.5">
                    <Label>Filial</Label>
                    <Select value={inviteFilialId} onValueChange={setInviteFilialId}>
                      <SelectTrigger>
                        <SelectValue placeholder="Selecione..." />
                      </SelectTrigger>
                      <SelectContent>
                        {filiais.map((f) => (
                          <SelectItem key={f.id} value={f.id}>{f.nome}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                <div className="flex justify-end gap-2 pt-2">
                  <Button type="button" variant="outline" onClick={() => setOpenInvite(false)}>
                    Cancelar
                  </Button>
                  <Button type="submit" disabled={inviting}>
                    {inviting ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Mail className="h-4 w-4 mr-2" />}
                    Criar usuário
                  </Button>
                </div>
              </form>
            </DialogContent>
          </Dialog>
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
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Ações</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading ? (
                <TableRow>
                  <TableCell colSpan={6} className="text-center py-12">
                    <Loader2 className="h-6 w-6 animate-spin mx-auto text-muted-foreground" />
                  </TableCell>
                </TableRow>
              ) : filtered.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={6} className="text-center py-12 text-muted-foreground">
                    Nenhum usuário encontrado
                  </TableCell>
                </TableRow>
              ) : (
                filtered.map((user) => (
                  <TableRow key={user.id}>
                    <TableCell className="font-medium">{user.full_name}</TableCell>
                    <TableCell className="text-muted-foreground text-sm">{user.email}</TableCell>
                    <TableCell>
                      <Select
                        value={user.roles[0] || ""}
                        onValueChange={(v) => changeRole(user.user_id, v as AppRole)}
                      >
                        <SelectTrigger className="w-32 h-7 text-xs">
                          <SelectValue placeholder="Sem cargo" />
                        </SelectTrigger>
                        <SelectContent>
                          {ALL_ROLES.map((r) => (
                            <SelectItem key={r} value={r} className="text-xs">
                              {ROLE_LABELS[r]}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </TableCell>
                    <TableCell>
                      <Select
                        value={user.filial_id || ""}
                        onValueChange={(v) => changeFilial(user.user_id, v)}
                      >
                        <SelectTrigger className="w-32 h-7 text-xs">
                          <SelectValue placeholder="—" />
                        </SelectTrigger>
                        <SelectContent>
                          {filiais.map((f) => (
                            <SelectItem key={f.id} value={f.id} className="text-xs">
                              {f.nome}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </TableCell>
                    <TableCell>
                      <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${
                        user.active
                          ? "bg-sky-100 text-sky-700"
                          : "bg-gray-100 text-gray-500"
                      }`}>
                        {user.active ? "Ativo" : "Inativo"}
                      </span>
                    </TableCell>
                    <TableCell className="text-right">
                      <AlertDialog>
                        <AlertDialogTrigger asChild>
                          <Button variant="ghost" size="icon" className="h-7 w-7">
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
    </AppLayout>
  );
}
