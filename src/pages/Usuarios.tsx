import { AppLayout } from "@/components/AppLayout";
import { useAuth } from "@/context/AuthContext";
import { Navigate } from "react-router-dom";
import { ROLE_LABELS } from "@/lib/supabase-types";
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
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Plus, Search, UserX, UserCheck, Users, Loader2, Mail, Pencil, ShieldCheck, Bell, KeyRound, Key, Send, MessageCircle, Globe, Wrench, ShoppingCart, Headphones, RefreshCw, Ban } from "lucide-react";
import { TablePagination } from "@/components/TablePagination";
import { Switch } from "@/components/ui/switch";
import { ALL_ROLES, TIPO_TECNICO_OPTIONS } from "./usuarios/constants";
import { useUsuariosQueries } from "./usuarios/useUsuariosQueries";
import { useUsuariosForm } from "./usuarios/useUsuariosForm";
import type { AppRole } from "@/lib/supabase-types";

export default function Usuarios() {
  const { isAdmin } = useAuth();
  const q = useUsuariosQueries();
  const f = useUsuariosForm({ refetchUsers: q.refetchUsers });

  if (!isAdmin) return <Navigate to="/dashboard" replace />;
  return (
    <AppLayout>
      <div className="space-y-5 w-full max-w-[1400px]">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-foreground">Usuários</h1>
            <p className="text-sm text-muted-foreground">Gerencie os colaboradores e permissões</p>
          </div>

          <Button className="gap-2" onClick={() => f.setOpenInvite(true)}>
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
            value={q.search}
            onChange={(e) => q.setSearch(e.target.value)}
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
              {q.loading ? (
                <TableRow>
                  <TableCell colSpan={7} className="text-center py-12">
                    <Loader2 className="h-6 w-6 animate-spin mx-auto text-muted-foreground" />
                  </TableCell>
                </TableRow>
              ) : q.filtered.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={7} className="text-center py-12 text-muted-foreground">
                    Nenhum usuário encontrado
                  </TableCell>
                </TableRow>
              ) : (
                q.filtered.slice((q.currentPage - 1) * q.ITEMS_PER_PAGE, q.currentPage * q.ITEMS_PER_PAGE).map((user) => (
                  <TableRow key={user.id}>
                    <TableCell className="font-medium">{user.full_name}</TableCell>
                    <TableCell className="text-muted-foreground text-sm">{user.email}</TableCell>
                    <TableCell>
                      <span className="text-sm">
                        {user.roles[0] ? ROLE_LABELS[user.roles[0]] : <span className="text-muted-foreground">—</span>}
                      </span>
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground">
                      {(user as any).acesso_global
                        ? <span className="text-xs text-primary font-medium">🌐 Global</span>
                        : (user.filiais_vinculadas && user.filiais_vinculadas.length > 0)
                          ? user.filiais_vinculadas.map((f) => f.nome).join(", ")
                          : <span className="text-xs text-muted-foreground">—</span>
                      }
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground">
                      {(user as any).is_vendedor
                        ? (user as any).comissao_implantacao_percentual != null
                          ? `Imp: ${(user as any).comissao_implantacao_percentual}% / Mens: ${(user as any).comissao_mensalidade_percentual ?? user.comissao_percentual ?? 0}% / Serv: ${(user as any).comissao_servico_percentual ?? 5}%`
                          : user.comissao_percentual != null ? `${user.comissao_percentual}%` : "—"
                        : <span className="text-xs text-muted-foreground">—</span>
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
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-7 w-7"
                          onClick={() => f.openEditDialog(user)}
                          title="Editar usuário"
                        >
                          <Pencil className="h-3.5 w-3.5 text-muted-foreground" />
                        </Button>

                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-7 w-7"
                          onClick={() => f.handleResetPassword(user)}
                          title="Redefinir senha por e-mail"
                        >
                          <Key className="h-3.5 w-3.5 text-muted-foreground" />
                        </Button>

                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-7 w-7"
                          onClick={() => f.handleReenviarBoasVindas(user)}
                          title="Reenviar boas-vindas (WhatsApp)"
                        >
                          <Send className="h-3.5 w-3.5 text-muted-foreground" />
                        </Button>

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
                              <AlertDialogAction onClick={() => f.toggleActive(user)}>
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
          <TablePagination
            currentPage={q.currentPage}
            totalPages={Math.ceil(q.filtered.length / q.ITEMS_PER_PAGE)}
            totalItems={q.filtered.length}
            itemsPerPage={q.ITEMS_PER_PAGE}
            onPageChange={q.setCurrentPage}
          />
        </div>
      </div>

      {/* ── Create Dialog ── */}
      <Dialog open={f.openInvite} onOpenChange={f.setOpenInvite}>
        <DialogContent className="max-w-xl flex flex-col max-h-[90vh]">
          <DialogHeader className="shrink-0">
            <DialogTitle>Criar novo usuário</DialogTitle>
          </DialogHeader>
          <form onSubmit={f.handleInvite} className="space-y-4 overflow-y-auto flex-1 pr-1">
            <div className="space-y-1.5">
              <Label>Nome completo</Label>
              <Input
                placeholder="João da Silva"
                value={f.inviteName}
                onChange={(e) => f.setInviteName(e.target.value)}
                required
              />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label>E-mail</Label>
                <Input
                  type="email"
                  placeholder="joao@softplus.com.br"
                  value={f.inviteEmail}
                  onChange={(e) => f.setInviteEmail(e.target.value)}
                  required
                />
              </div>
              <div className="space-y-1.5">
                <Label>Telefone</Label>
                <Input
                  type="tel"
                  placeholder="(11) 99999-9999"
                  value={f.inviteTelefone}
                  onChange={(e) => f.setInviteTelefone(e.target.value)}
                />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label>Cargo</Label>
                <Select value={f.inviteRole} onValueChange={(v) => f.setInviteRole(v as AppRole)}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {ALL_ROLES.map((r) => (
                      <SelectItem key={r} value={r}>{ROLE_LABELS[r]}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="rounded-lg border border-border p-3 space-y-3">
              <div className="flex items-center justify-between">
                <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Filiais de Acesso</p>
                <div className="flex items-center gap-2">
                  <Label className="text-xs text-muted-foreground flex items-center gap-1">
                    <Globe className="h-3.5 w-3.5" />
                    Acesso global
                  </Label>
                  <Switch checked={f.inviteAcessoGlobal} onCheckedChange={(v) => {
                    f.setInviteAcessoGlobal(v);
                    if (v) f.setInviteFilialIds([]);
                  }} />
                </div>
              </div>
              {!f.inviteAcessoGlobal && (
                <div className="space-y-2">
                  {q.filiais.map((f) => (
                    <div key={f.id} className="flex items-center justify-between rounded px-2 py-1.5 hover:bg-accent">
                      <span className="text-sm">{f.nome}</span>
                      <Switch
                        checked={f.inviteFilialIds.includes(fil.id)}
                        onCheckedChange={(checked) => {
                          if (checked) {
                            f.setInviteFilialIds((prev) => [...prev, fil.id]);
                          } else {
                            f.setInviteFilialIds((prev) => prev.filter((id) => id !== fil.id));
                          }
                        }}
                      />
                    </div>
                  ))}
                </div>
              )}
              {f.inviteAcessoGlobal && (
                <p className="text-xs text-muted-foreground">Este usuário terá acesso a todas as filiais.</p>
              )}
            </div>
            <div className="rounded-lg border border-border p-3 space-y-3">
              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label className="flex items-center gap-1.5 cursor-pointer text-sm font-medium">
                    <ShoppingCart className="h-4 w-4 text-primary" />
                    É Vendedor?
                  </Label>
                  <p className="text-xs text-muted-foreground">Este usuário realiza vendas e pode receber comissão</p>
                </div>
                <Switch checked={f.inviteIsVendedor} onCheckedChange={f.setInviteIsVendedor} />
              </div>
              {f.inviteIsVendedor && (
                <>
                  <div className="border-t border-border" />
                  <div className="flex items-center justify-between">
                    <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Comissão</p>
                    <div className="flex items-center gap-2">
                      <Label className="text-xs text-muted-foreground">Recebe comissão</Label>
                      <Switch checked={f.inviteRecebeComissao} onCheckedChange={f.setInviteRecebeComissao} />
                    </div>
                  </div>
                  {f.inviteRecebeComissao && (
                    <div className="grid grid-cols-3 gap-3">
                      <div className="space-y-1.5">
                        <Label className="text-xs">Implantação (%)</Label>
                        <Input
                          type="number" min="0" max="100" step="0.01" placeholder="5"
                          value={f.inviteComissaoImp}
                          onChange={(e) => f.setInviteComissaoImp(e.target.value)}
                        />
                      </div>
                      <div className="space-y-1.5">
                        <Label className="text-xs">Mensalidade (%)</Label>
                        <Input
                          type="number" min="0" max="100" step="0.01" placeholder="5"
                          value={f.inviteComissaoMens}
                          onChange={(e) => f.setInviteComissaoMens(e.target.value)}
                        />
                      </div>
                      <div className="space-y-1.5">
                        <Label className="text-xs">Serviço (%)</Label>
                        <Input
                          type="number" min="0" max="100" step="0.01" placeholder="5"
                          value={f.inviteComissaoServ}
                          onChange={(e) => f.setInviteComissaoServ(e.target.value)}
                        />
                      </div>
                    </div>
                  )}
                </>
              )}
            </div>
            <div className="rounded-lg border border-border p-3 space-y-3">
              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label className="flex items-center gap-1.5 cursor-pointer text-sm font-medium">
                    <Wrench className="h-4 w-4 text-primary" />
                    É Técnico?
                  </Label>
                  <p className="text-xs text-muted-foreground">Realiza atendimentos técnicos e pode ser apontado para agenda</p>
                </div>
                <Switch checked={f.inviteIsTecnico} onCheckedChange={f.setInviteIsTecnico} />
              </div>
              {f.inviteIsTecnico && (
                <div className="space-y-2 pl-2 border-l-2 border-primary/30">
                  <Label className="text-xs font-medium">Tipo de Atendimento</Label>
                  <div className="space-y-1.5">
                    {TIPO_TECNICO_OPTIONS.map((opt) => (
                      <div key={opt.value} className="flex items-center justify-between rounded px-2 py-1">
                        <span className="text-xs">{opt.label}</span>
                        <Switch
                          checked={f.inviteTipoTecnico === opt.value}
                          onCheckedChange={(checked) => { if (checked) f.setInviteTipoTecnico(opt.value); }}
                        />
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
            <div className="rounded-lg border border-border p-3 space-y-3">
              <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide flex items-center gap-1.5">
                <Headphones className="h-3.5 w-3.5" />
                Mesas de Atendimento
              </p>
              <div className="space-y-2">
                {q.mesasDisponiveis.map((m) => (
                  <div key={m.id} className="flex items-center justify-between rounded px-2 py-1.5 hover:bg-accent">
                    <span className="text-sm">{m.nome}</span>
                    <Switch
                       checked={f.inviteMesaIds.includes(m.id)}
                      onCheckedChange={(checked) => {
                        if (checked) f.setInviteMesaIds((prev) => [...prev, m.id]);
                        else f.setInviteMesaIds((prev) => prev.filter((id) => id !== m.id));
                      }}
                    />
                  </div>
                ))}
                {q.mesasDisponiveis.length === 0 && <p className="text-xs text-muted-foreground">Nenhuma mesa cadastrada.</p>}
              </div>
            </div>
            <div className="rounded-lg border border-border p-3 space-y-3">
              <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Limite de Desconto</p>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label>Desconto máx. implantação (%)</Label>
                  <Input
                    type="number" min="0" max="100" step="0.01" placeholder="0"
                    value={f.inviteDescontoLimiteImp}
                    onChange={(e) => f.setInviteDescontoLimiteImp(e.target.value)}
                  />
                </div>
                <div className="space-y-1.5">
                  <Label>Desconto máx. mensalidade (%)</Label>
                  <Input
                    type="number" min="0" max="100" step="0.01" placeholder="0"
                    value={f.inviteDescontoLimiteMens}
                    onChange={(e) => f.setInviteDescontoLimiteMens(e.target.value)}
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
                <Switch checked={f.inviteGestorDesconto} onCheckedChange={f.setInviteGestorDesconto} />
              </div>
              <div className="flex items-center justify-between pt-1">
                <div className="space-y-0.5">
                  <Label className="flex items-center gap-1.5 cursor-pointer">
                    <ShieldCheck className="h-4 w-4 text-amber-500" />
                    Permitir Cadastro CNPJ Duplicado
                  </Label>
                  <p className="text-xs text-muted-foreground">Permite cadastrar clientes com CNPJ já existente no módulo de Clientes</p>
                </div>
                <Switch checked={f.invitePermitirCnpjDuplicado} onCheckedChange={f.setInvitePermitirCnpjDuplicado} />
              </div>
            </div>
            <div className="flex justify-end gap-2 pt-2 shrink-0">
               <Button type="button" variant="outline" onClick={() => f.setOpenInvite(false)}>Cancelar</Button>
              <Button type="submit" disabled={f.inviting}>
                {f.inviting ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Mail className="h-4 w-4 mr-2" />}
                Criar usuário
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      {/* ── Edit Dialog ── */}
      <Dialog open={f.openEdit} onOpenChange={f.setOpenEdit}>
        <DialogContent className="max-w-xl flex flex-col max-h-[90vh]">
          <DialogHeader className="shrink-0">
            <DialogTitle>Editar usuário</DialogTitle>
          </DialogHeader>
          <form onSubmit={f.handleEdit} className="flex-1 overflow-hidden flex flex-col">
            <Tabs defaultValue="dados" className="flex-1 flex flex-col overflow-hidden">
              <TabsList className="shrink-0 mb-3">
                <TabsTrigger value="dados" className="gap-1.5">
                  <Users className="h-3.5 w-3.5" />
                  Dados
                </TabsTrigger>
                <TabsTrigger value="permissoes" className="gap-1.5">
                  <KeyRound className="h-3.5 w-3.5" />
                  Permissões Especiais
                </TabsTrigger>
                <TabsTrigger value="notificacoes" className="gap-1.5">
                  <Bell className="h-3.5 w-3.5" />
                  Notificações
                </TabsTrigger>
              </TabsList>

              <div className="flex-1 overflow-y-auto pr-1">
                {/* ── Tab Dados ── */}
                <TabsContent value="dados" className="space-y-4 mt-0">
                  <div className="space-y-1.5">
                    <Label>Nome completo</Label>
                    <Input
                      value={f.editName}
                      onChange={(e) => f.setEditName(e.target.value)}
                      required
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-1.5">
                      <Label>E-mail</Label>
                      <Input value={f.editingUser?.email || ""} disabled className="bg-muted text-muted-foreground" />
                    </div>
                    <div className="space-y-1.5">
                      <Label>Telefone</Label>
                      <Input
                        type="tel"
                        placeholder="(11) 99999-9999"
                        value={f.editTelefone}
                        onChange={(e) => f.setEditTelefone(e.target.value)}
                      />
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-1.5">
                      <Label>Cargo</Label>
                      <Select value={f.editRole} onValueChange={(v) => f.setEditRole(v as AppRole)}>
                        <SelectTrigger><SelectValue /></SelectTrigger>
                        <SelectContent>
                          {ALL_ROLES.map((r) => (
                            <SelectItem key={r} value={r}>{ROLE_LABELS[r]}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                  <div className="rounded-lg border border-border p-3 space-y-3">
                    <div className="flex items-center justify-between">
                      <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Filiais de Acesso</p>
                      <div className="flex items-center gap-2">
                        <Label className="text-xs text-muted-foreground flex items-center gap-1">
                          <Globe className="h-3.5 w-3.5" />
                          Acesso global
                        </Label>
                        <Switch checked={f.editAcessoGlobal} onCheckedChange={(v) => {
                          f.setEditAcessoGlobal(v);
                          if (v) f.setEditFilialIds([]);
                        }} />
                      </div>
                    </div>
                    {!f.editAcessoGlobal && (
                      <div className="space-y-2">
                        {q.filiais.map((fil) => (
                          <div key={fil.id} className="flex items-center justify-between rounded px-2 py-1.5 hover:bg-accent">
                            <span className="text-sm">{fil.nome}</span>
                            <Switch
                              checked={f.editFilialIds.includes(fil.id)}
                              onCheckedChange={(checked) => {
                                if (checked) {
                                  f.setEditFilialIds((prev) => [...prev, fil.id]);
                                } else {
                                  f.setEditFilialIds((prev) => prev.filter((id) => id !== fil.id));
                                }
                              }}
                            />
                          </div>
                        ))}
                      </div>
                    )}
                    {f.editAcessoGlobal && (
                      <p className="text-xs text-muted-foreground">Este usuário terá acesso a todas as filiais.</p>
                    )}
                  </div>
                  <div className="rounded-lg border border-border p-3 space-y-3">
                    <div className="flex items-center justify-between">
                      <div className="space-y-0.5">
                        <Label className="flex items-center gap-1.5 cursor-pointer text-sm font-medium">
                          <ShoppingCart className="h-4 w-4 text-primary" />
                          É Vendedor?
                        </Label>
                        <p className="text-xs text-muted-foreground">Este usuário realiza vendas e pode receber comissão</p>
                      </div>
                      <Switch checked={f.editIsVendedor} onCheckedChange={f.setEditIsVendedor} />
                    </div>
                    {f.editIsVendedor && (
                      <>
                        <div className="border-t border-border" />
                        <div className="flex items-center justify-between">
                          <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Comissão</p>
                          <div className="flex items-center gap-2">
                            <Label className="text-xs text-muted-foreground">Recebe comissão</Label>
                            <Switch checked={f.editRecebeComissao} onCheckedChange={f.setEditRecebeComissao} />
                          </div>
                        </div>
                        {f.editRecebeComissao && (
                          <div className="grid grid-cols-3 gap-3">
                            <div className="space-y-1.5">
                              <Label className="text-xs">Implantação (%)</Label>
                              <Input
                                type="number" min="0" max="100" step="0.01"
                                value={editComissaoImp}
                                onChange={(e) => setEditComissaoImp(e.target.value)}
                              />
                            </div>
                            <div className="space-y-1.5">
                              <Label className="text-xs">Mensalidade (%)</Label>
                              <Input
                                type="number" min="0" max="100" step="0.01"
                                value={editComissaoMens}
                                onChange={(e) => setEditComissaoMens(e.target.value)}
                              />
                            </div>
                            <div className="space-y-1.5">
                              <Label className="text-xs">Serviço (%)</Label>
                              <Input
                                type="number" min="0" max="100" step="0.01"
                                value={editComissaoServ}
                                onChange={(e) => setEditComissaoServ(e.target.value)}
                              />
                            </div>
                          </div>
                        )}
                      </>
                    )}
                  </div>
                  <div className="rounded-lg border border-border p-3 space-y-3">
                    <div className="flex items-center justify-between">
                      <div className="space-y-0.5">
                        <Label className="flex items-center gap-1.5 cursor-pointer text-sm font-medium">
                          <Wrench className="h-4 w-4 text-primary" />
                          É Técnico?
                        </Label>
                        <p className="text-xs text-muted-foreground">Realiza atendimentos técnicos e pode ser apontado para agenda</p>
                      </div>
                      <Switch checked={editIsTecnico} onCheckedChange={setEditIsTecnico} />
                    </div>
                    {editIsTecnico && (
                      <div className="space-y-2 pl-2 border-l-2 border-primary/30">
                        <Label className="text-xs font-medium">Tipo de Atendimento Técnico</Label>
                        <div className="space-y-1.5">
                          {TIPO_TECNICO_OPTIONS.map((opt) => (
                            <div key={opt.value} className="flex items-center justify-between rounded px-2 py-1">
                              <span className="text-xs">{opt.label}</span>
                              <Switch
                                checked={editTipoTecnico === opt.value}
                                onCheckedChange={(checked) => { if (checked) setEditTipoTecnico(opt.value); }}
                              />
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                  <div className="rounded-lg border border-border p-3 space-y-3">
                    <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide flex items-center gap-1.5">
                      <Headphones className="h-3.5 w-3.5" />
                      Mesas de Atendimento
                    </p>
                    <div className="space-y-2">
                      {q.mesasDisponiveis.map((m) => (
                        <div key={m.id} className="flex items-center justify-between rounded px-2 py-1.5 hover:bg-accent">
                          <span className="text-sm">{m.nome}</span>
                          <Switch
                            checked={editMesaIds.includes(m.id)}
                            onCheckedChange={(checked) => {
                              if (checked) setEditMesaIds((prev) => [...prev, m.id]);
                              else setEditMesaIds((prev) => prev.filter((id) => id !== m.id));
                            }}
                          />
                        </div>
                      ))}
                      {q.mesasDisponiveis.length === 0 && <p className="text-xs text-muted-foreground">Nenhuma mesa cadastrada.</p>}
                    </div>
                  </div>
                  <div className="rounded-lg border border-border p-3 space-y-3">
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
                  </div>
                  <div className="flex items-center justify-between">
                    <div className="space-y-0.5">
                      <Label className="text-sm font-medium">Status</Label>
                      <p className="text-xs text-muted-foreground">{editActive ? "Usuário ativo no sistema" : "Usuário sem acesso ao sistema"}</p>
                    </div>
                    <Switch checked={editActive} onCheckedChange={setEditActive} />
                  </div>
                </TabsContent>

                {/* ── Tab Permissões Especiais ── */}
                <TabsContent value="permissoes" className="space-y-4 mt-0">
                  <div className="rounded-lg border border-border p-4 space-y-4">
                    <div className="flex items-center justify-between">
                      <div className="space-y-0.5">
                        <Label className="flex items-center gap-1.5 cursor-pointer text-sm font-medium">
                          <ShieldCheck className="h-4 w-4 text-primary" />
                          Gestor de Desconto
                        </Label>
                        <p className="text-xs text-muted-foreground">
                          Recebe notificações e pode aprovar/reprovar solicitações de desconto acima do limite permitido.
                        </p>
                      </div>
                      <Switch checked={editGestorDesconto} onCheckedChange={setEditGestorDesconto} />
                    </div>
                    <div className="border-t border-border" />
                    <div className="flex items-center justify-between">
                      <div className="space-y-0.5">
                        <Label className="flex items-center gap-1.5 cursor-pointer text-sm font-medium">
                          <ShieldCheck className="h-4 w-4 text-amber-500" />
                          Permitir Cadastro CNPJ Duplicado
                        </Label>
                        <p className="text-xs text-muted-foreground">
                          Permite cadastrar clientes com CNPJ/CPF já existente no sistema.
                        </p>
                      </div>
                      <Switch checked={editPermitirCnpjDuplicado} onCheckedChange={setEditPermitirCnpjDuplicado} />
                    </div>
                    <div className="border-t border-border" />
                    <div className="flex items-center justify-between">
                      <div className="space-y-0.5">
                        <Label className="flex items-center gap-1.5 cursor-pointer text-sm font-medium">
                          <MessageCircle className="h-4 w-4 text-green-600" />
                          Enviar Espelho via WhatsApp
                        </Label>
                        <p className="text-xs text-muted-foreground">
                          Permite enviar o resumo do espelho do cliente via WhatsApp diretamente pelo sistema.
                        </p>
                      </div>
                      <Switch checked={editPermiteEnviarEspelho} onCheckedChange={setEditPermiteEnviarEspelho} />
                    </div>
                    <div className="border-t border-border" />
                    <div className="flex items-center justify-between">
                      <div className="space-y-0.5">
                        <Label className="flex items-center gap-1.5 cursor-pointer text-sm font-medium">
                          <RefreshCw className="h-4 w-4 text-orange-500" />
                          Resetar Projeto
                        </Label>
                        <p className="text-xs text-muted-foreground">
                          Permite resetar projetos no painel de atendimento, apagando histórico e voltando para etapa inicial.
                        </p>
                      </div>
                      <Switch checked={editPermiteResetarProjeto} onCheckedChange={setEditPermiteResetarProjeto} />
                    </div>
                    <div className="border-t border-border" />
                    <div className="flex items-center justify-between">
                      <div className="space-y-0.5">
                        <Label className="flex items-center gap-1.5 cursor-pointer text-sm font-medium">
                          <Ban className="h-4 w-4 text-red-500" />
                          Cancelar Projeto
                        </Label>
                        <p className="text-xs text-muted-foreground">
                          Permite cancelar projetos no painel de atendimento, registrando o motivo no relatório de projetos cancelados.
                        </p>
                      </div>
                      <Switch checked={editPermiteCancelarProjeto} onCheckedChange={setEditPermiteCancelarProjeto} />
                    </div>
                    <div className="border-t border-border" />
                    <div className="flex items-center justify-between">
                      <div className="space-y-0.5">
                        <Label className="flex items-center gap-1.5 cursor-pointer text-sm font-medium">
                          <ShoppingCart className="h-4 w-4 text-blue-500" />
                          Ver Valores do Projeto em Detalhes
                        </Label>
                        <p className="text-xs text-muted-foreground">
                          Permite visualizar os valores financeiros (implantação, mensalidade, etc.) nos detalhes do projeto no painel de atendimento.
                        </p>
                      </div>
                      <Switch checked={editPermiteVerValoresProjeto} onCheckedChange={setEditPermiteVerValoresProjeto} />
                    </div>
                  </div>
                </TabsContent>

                {/* ── Tab Notificações ── */}
                <TabsContent value="notificacoes" className="mt-0">
                  <div className="flex flex-col items-center justify-center py-12 text-center">
                    <Bell className="h-10 w-10 text-muted-foreground/40 mb-3" />
                    <h3 className="text-sm font-semibold text-foreground mb-1">Em breve</h3>
                    <p className="text-xs text-muted-foreground max-w-xs">
                      Configurações de preferências de notificações por usuário estarão disponíveis em breve.
                    </p>
                  </div>
                </TabsContent>
              </div>
            </Tabs>

            <div className="flex justify-end gap-2 pt-3 shrink-0 border-t border-border mt-3">
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
