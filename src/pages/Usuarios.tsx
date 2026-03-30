import { AppLayout } from "@/components/AppLayout";
import { useAuth } from "@/context/AuthContext";
import { Navigate } from "react-router-dom";
import { ROLE_LABELS } from "@/lib/supabase-types";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
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
import { Plus, Search, UserX, UserCheck, Loader2, Pencil, Key, Send } from "lucide-react";
import { TablePagination } from "@/components/TablePagination";
import { useUsuariosQueries } from "./usuarios/useUsuariosQueries";
import { useUsuariosForm } from "./usuarios/useUsuariosForm";
import { CreateUserDialog } from "./usuarios/components/CreateUserDialog";
import { EditUserDialog } from "./usuarios/components/EditUserDialog";

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
      <CreateUserDialog
        open={f.openInvite}
        onOpenChange={f.setOpenInvite}
        inviteName={f.inviteName} setInviteName={f.setInviteName}
        inviteEmail={f.inviteEmail} setInviteEmail={f.setInviteEmail}
        inviteTelefone={f.inviteTelefone} setInviteTelefone={f.setInviteTelefone}
        inviteRole={f.inviteRole} setInviteRole={f.setInviteRole}
        inviteAcessoGlobal={f.inviteAcessoGlobal} setInviteAcessoGlobal={f.setInviteAcessoGlobal}
        inviteFilialIds={f.inviteFilialIds} setInviteFilialIds={f.setInviteFilialIds}
        inviteIsVendedor={f.inviteIsVendedor} setInviteIsVendedor={f.setInviteIsVendedor}
        inviteRecebeComissao={f.inviteRecebeComissao} setInviteRecebeComissao={f.setInviteRecebeComissao}
        inviteComissaoImp={f.inviteComissaoImp} setInviteComissaoImp={f.setInviteComissaoImp}
        inviteComissaoMens={f.inviteComissaoMens} setInviteComissaoMens={f.setInviteComissaoMens}
        inviteComissaoServ={f.inviteComissaoServ} setInviteComissaoServ={f.setInviteComissaoServ}
        inviteIsTecnico={f.inviteIsTecnico} setInviteIsTecnico={f.setInviteIsTecnico}
        inviteTipoTecnico={f.inviteTipoTecnico} setInviteTipoTecnico={f.setInviteTipoTecnico}
        inviteMesaIds={f.inviteMesaIds} setInviteMesaIds={f.setInviteMesaIds}
        inviteSetorId={f.inviteSetorId} setInviteSetorId={f.setInviteSetorId}
        inviteDescontoLimiteImp={f.inviteDescontoLimiteImp} setInviteDescontoLimiteImp={f.setInviteDescontoLimiteImp}
        inviteDescontoLimiteMens={f.inviteDescontoLimiteMens} setInviteDescontoLimiteMens={f.setInviteDescontoLimiteMens}
        inviteGestorDesconto={f.inviteGestorDesconto} setInviteGestorDesconto={f.setInviteGestorDesconto}
        invitePermitirCnpjDuplicado={f.invitePermitirCnpjDuplicado} setInvitePermitirCnpjDuplicado={f.setInvitePermitirCnpjDuplicado}
        inviting={f.inviting}
        handleInvite={f.handleInvite}
        filiais={q.filiais}
        mesasDisponiveis={q.mesasDisponiveis}
        setoresDisponiveis={q.setoresDisponiveis}
      />

      {/* ── Edit Dialog ── */}
      <EditUserDialog
        open={f.openEdit}
        onOpenChange={f.setOpenEdit}
        editingUser={f.editingUser}
        editName={f.editName} setEditName={f.setEditName}
        editTelefone={f.editTelefone} setEditTelefone={f.setEditTelefone}
        editRole={f.editRole} setEditRole={f.setEditRole}
        editAcessoGlobal={f.editAcessoGlobal} setEditAcessoGlobal={f.setEditAcessoGlobal}
        editFilialIds={f.editFilialIds} setEditFilialIds={f.setEditFilialIds}
        editIsVendedor={f.editIsVendedor} setEditIsVendedor={f.setEditIsVendedor}
        editRecebeComissao={f.editRecebeComissao} setEditRecebeComissao={f.setEditRecebeComissao}
        editComissaoImp={f.editComissaoImp} setEditComissaoImp={f.setEditComissaoImp}
        editComissaoMens={f.editComissaoMens} setEditComissaoMens={f.setEditComissaoMens}
        editComissaoServ={f.editComissaoServ} setEditComissaoServ={f.setEditComissaoServ}
        editIsTecnico={f.editIsTecnico} setEditIsTecnico={f.setEditIsTecnico}
        editTipoTecnico={f.editTipoTecnico} setEditTipoTecnico={f.setEditTipoTecnico}
        editMesaIds={f.editMesaIds} setEditMesaIds={f.setEditMesaIds}
        editSetorId={f.editSetorId} setEditSetorId={f.setEditSetorId}
        editDescontoLimiteImp={f.editDescontoLimiteImp} setEditDescontoLimiteImp={f.setEditDescontoLimiteImp}
        editDescontoLimiteMens={f.editDescontoLimiteMens} setEditDescontoLimiteMens={f.setEditDescontoLimiteMens}
        editGestorDesconto={f.editGestorDesconto} setEditGestorDesconto={f.setEditGestorDesconto}
        editPermitirCnpjDuplicado={f.editPermitirCnpjDuplicado} setEditPermitirCnpjDuplicado={f.setEditPermitirCnpjDuplicado}
        editPermiteEnviarEspelho={f.editPermiteEnviarEspelho} setEditPermiteEnviarEspelho={f.setEditPermiteEnviarEspelho}
        editPermiteResetarProjeto={f.editPermiteResetarProjeto} setEditPermiteResetarProjeto={f.setEditPermiteResetarProjeto}
        editPermiteCancelarProjeto={f.editPermiteCancelarProjeto} setEditPermiteCancelarProjeto={f.setEditPermiteCancelarProjeto}
        editPermiteVerValoresProjeto={f.editPermiteVerValoresProjeto} setEditPermiteVerValoresProjeto={f.setEditPermiteVerValoresProjeto}
        editActive={f.editActive} setEditActive={f.setEditActive}
        editIsAtendenteChat={f.editIsAtendenteChat} setEditIsAtendenteChat={f.setEditIsAtendenteChat}
        saving={f.saving}
        handleEdit={f.handleEdit}
        filiais={q.filiais}
        mesasDisponiveis={q.mesasDisponiveis}
        setoresDisponiveis={q.setoresDisponiveis}
      />
    </AppLayout>
  );
}
