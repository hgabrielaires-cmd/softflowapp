import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { AppLayout } from "@/components/AppLayout";
import { useAuth } from "@/context/AuthContext";
import { Navigate } from "react-router-dom";
import { AppRole, ROLE_LABELS, Filial } from "@/lib/supabase-types";
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
import { toast } from "sonner";
import { Switch } from "@/components/ui/switch";
import { UserWithRoles, MesaOption } from "./usuarios/types";
import { ALL_ROLES, ITEMS_PER_PAGE, TIPO_TECNICO_OPTIONS } from "./usuarios/constants";
import { gerarSenhaSegura } from "./usuarios/helpers";

export default function Usuarios() {
  const { isAdmin } = useAuth();
  const [users, setUsers] = useState<UserWithRoles[]>([]);
  const [filiais, setFiliais] = useState<Filial[]>([]);
  const [mesasDisponiveis, setMesasDisponiveis] = useState<MesaOption[]>([]);
  const [loading, setLoading] = useState(true);
  const [filiaisLoaded, setFiliaisLoaded] = useState(false);
  const [search, setSearch] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  
  

  // Create dialog
  const [openInvite, setOpenInvite] = useState(false);
  const [inviteEmail, setInviteEmail] = useState("");
  const [inviteName, setInviteName] = useState("");
  const [inviteRole, setInviteRole] = useState<AppRole>("vendedor");
  const [inviteFilialId, setInviteFilialId] = useState("");
  const [inviteFilialIds, setInviteFilialIds] = useState<string[]>([]);
  const [inviteAcessoGlobal, setInviteAcessoGlobal] = useState(false);
  const [inviteComissaoImp, setInviteComissaoImp] = useState("5");
  const [inviteComissaoMens, setInviteComissaoMens] = useState("5");
  const [inviteComissaoServ, setInviteComissaoServ] = useState("5");
  const [inviteDescontoLimiteImp, setInviteDescontoLimiteImp] = useState("0");
  const [inviteDescontoLimiteMens, setInviteDescontoLimiteMens] = useState("0");
  const [inviteGestorDesconto, setInviteGestorDesconto] = useState(false);
  const [invitePermitirCnpjDuplicado, setInvitePermitirCnpjDuplicado] = useState(false);
  const [inviteRecebeComissao, setInviteRecebeComissao] = useState(true);
  const [inviteTelefone, setInviteTelefone] = useState("");
  const [inviteIsTecnico, setInviteIsTecnico] = useState(false);
  const [inviteTipoTecnico, setInviteTipoTecnico] = useState("interno");
  const [inviteIsVendedor, setInviteIsVendedor] = useState(false);
  const [inviteMesaIds, setInviteMesaIds] = useState<string[]>([]);
  const [inviting, setInviting] = useState(false);

  // Edit dialog
  const [openEdit, setOpenEdit] = useState(false);
  const [editingUser, setEditingUser] = useState<UserWithRoles | null>(null);
  const [editName, setEditName] = useState("");
  const [editRole, setEditRole] = useState<AppRole>("vendedor");
  const [editFilialId, setEditFilialId] = useState("");
  const [editFilialIds, setEditFilialIds] = useState<string[]>([]);
  const [editAcessoGlobal, setEditAcessoGlobal] = useState(false);
  const [editComissaoImp, setEditComissaoImp] = useState("5");
  const [editComissaoMens, setEditComissaoMens] = useState("5");
  const [editComissaoServ, setEditComissaoServ] = useState("5");
  const [editDescontoLimiteImp, setEditDescontoLimiteImp] = useState("0");
  const [editDescontoLimiteMens, setEditDescontoLimiteMens] = useState("0");
  const [editGestorDesconto, setEditGestorDesconto] = useState(false);
  const [editPermitirCnpjDuplicado, setEditPermitirCnpjDuplicado] = useState(false);
  const [editRecebeComissao, setEditRecebeComissao] = useState(true);
  const [editTelefone, setEditTelefone] = useState("");
  const [editPermiteEnviarEspelho, setEditPermiteEnviarEspelho] = useState(false);
  const [editPermiteResetarProjeto, setEditPermiteResetarProjeto] = useState(false);
  const [editPermiteCancelarProjeto, setEditPermiteCancelarProjeto] = useState(false);
  const [editPermiteVerValoresProjeto, setEditPermiteVerValoresProjeto] = useState(false);
  const [editIsTecnico, setEditIsTecnico] = useState(false);
  const [editTipoTecnico, setEditTipoTecnico] = useState("interno");
  const [editIsVendedor, setEditIsVendedor] = useState(false);
  const [editMesaIds, setEditMesaIds] = useState<string[]>([]);
  const [editActive, setEditActive] = useState(true);
  const [saving, setSaving] = useState(false);

  if (!isAdmin) return <Navigate to="/dashboard" replace />;

  async function loadFiliais() {
    const [{ data: fData }, { data: mData }] = await Promise.all([
      supabase.from("filiais").select("*").eq("ativa", true).order("nome"),
      supabase.from("mesas_atendimento").select("id, nome").eq("ativo", true).order("nome"),
    ]);
    if (fData) setFiliais(fData as Filial[]);
    if (mData) setMesasDisponiveis(mData as MesaOption[]);
    setFiliaisLoaded(true);
  }

  async function loadUsers() {
    setLoading(true);
    const { data: profiles, error } = await supabase
      .from("profiles")
      .select("*, filiais!profiles_filial_id_fkey(nome)")
      .order("full_name");

    if (error) { toast.error("Erro ao carregar usuários"); setLoading(false); return; }

    const [{ data: roleData }, { data: ufData }, { data: umData }] = await Promise.all([
      supabase.from("user_roles").select("*"),
      supabase.from("usuario_filiais").select("user_id, filial_id"),
      supabase.from("usuario_mesas").select("user_id, mesa_id"),
    ]);

    const enriched: UserWithRoles[] = (profiles || []).map((p: any) => {
      const userFiliais = (ufData || []).filter((uf) => uf.user_id === p.user_id);
      const filiaisVinculadas = userFiliais.map((uf) => {
        const f = filiais.find((fl) => fl.id === uf.filial_id);
        return f ? { id: f.id, nome: f.nome } : null;
      }).filter(Boolean) as { id: string; nome: string }[];

      const userMesas = (umData || []).filter((um: any) => um.user_id === p.user_id);
      const mesasVinculadas = userMesas.map((um: any) => {
        const m = mesasDisponiveis.find((md) => md.id === um.mesa_id);
        return m ? { id: m.id, nome: m.nome } : null;
      }).filter(Boolean) as { id: string; nome: string }[];

      return {
        ...p,
        filial_nome: p.filiais?.nome || p.filial || null,
        roles: (roleData || []).filter((r) => r.user_id === p.user_id).map((r) => r.role as AppRole),
        acesso_global: p.acesso_global || false,
        filiais_vinculadas: filiaisVinculadas,
        mesas_vinculadas: mesasVinculadas,
      };
    });

    setUsers(enriched);
    setLoading(false);
  }

  useEffect(() => {
    loadFiliais();
  }, []);

  useEffect(() => {
    if (filiaisLoaded) {
      loadUsers();
    }
  }, [filiaisLoaded]);

  // ── Enviar WhatsApp de boas-vindas ──────────────────────
  async function enviarWhatsappBoasVindas(nome: string, email: string, senha: string, telefone: string) {
    // Buscar template de boas-vindas (com id para roteamento de instância)
    const { data: template } = await supabase
      .from("message_templates")
      .select("id, conteudo")
      .eq("categoria", "boas_vindas")
      .eq("ativo", true)
      .limit(1)
      .single();

    const linkSistema = "https://softflow.app.br/login";
    
    let mensagem = template?.conteudo || `Olá ${nome}! Bem-vindo ao SoftFlow!\n\nE-mail: ${email}\nSenha: ${senha}\n\nAcesse: ${linkSistema}`;
    
    mensagem = mensagem
      .replace(/\{usuario\.nome\}/g, nome)
      .replace(/\{usuario\.email\}/g, email)
      .replace(/\{usuario\.senha\}/g, senha)
      .replace(/\{link_sistema\}/g, linkSistema);

    const { error } = await supabase.functions.invoke("evolution-api", {
      body: {
        action: "send_text",
        number: telefone,
        text: mensagem,
        template_id: template?.id || undefined,
      },
    });

    if (error) throw error;
  }

  // ── Create ──────────────────────────────────────────────
  async function handleInvite(e: React.FormEvent) {
    e.preventDefault();
    setInviting(true);

    // Gerar senha segura: 8 caracteres com maiúscula, minúscula, número e especial
    const senhaTemporaria = gerarSenhaSegura();

    try {
      const { data, error } = await supabase.auth.signUp({
        email: inviteEmail,
        password: senhaTemporaria,
        options: { data: { full_name: inviteName } },
      });

      if (error) throw error;
      if (!data.user) throw new Error("Usuário não criado");

      // Confirmar e-mail e definir senha via admin (evita "Email not confirmed")
      await supabase.functions.invoke("admin-update-password", {
        body: { user_id: data.user.id, password: senhaTemporaria },
      });

      const filialFavorita = inviteFilialIds.length > 0 ? inviteFilialIds[0] : null;

      await supabase.from("profiles").update({
        filial_id: filialFavorita,
        acesso_global: inviteAcessoGlobal,
        comissao_percentual: parseFloat(inviteComissaoImp) || 5,
        comissao_implantacao_percentual: parseFloat(inviteComissaoImp) || 5,
        comissao_mensalidade_percentual: parseFloat(inviteComissaoMens) || 5,
        comissao_servico_percentual: parseFloat(inviteComissaoServ) || 5,
        desconto_limite_implantacao: parseFloat(inviteDescontoLimiteImp) || 0,
        desconto_limite_mensalidade: parseFloat(inviteDescontoLimiteMens) || 0,
        gestor_desconto: inviteGestorDesconto,
        permitir_cnpj_duplicado: invitePermitirCnpjDuplicado,
        recebe_comissao: inviteRecebeComissao,
        telefone: inviteTelefone || null,
        deve_trocar_senha: true,
        is_tecnico: inviteIsTecnico,
        tipo_tecnico: inviteIsTecnico ? inviteTipoTecnico : null,
        is_vendedor: inviteIsVendedor,
      } as any).eq("user_id", data.user.id);

      // Insert filiais junction
      if (inviteFilialIds.length > 0 && !inviteAcessoGlobal) {
        const rows = inviteFilialIds.map((fId) => ({ user_id: data.user.id, filial_id: fId }));
        await supabase.from("usuario_filiais").insert(rows);
      }

      // Insert mesas junction
      if (inviteMesaIds.length > 0) {
        const mesaRows = inviteMesaIds.map((mId) => ({ user_id: data.user.id, mesa_id: mId }));
        await supabase.from("usuario_mesas").insert(mesaRows);
      }

      await supabase.from("user_roles").insert({ user_id: data.user.id, role: inviteRole });

      // Enviar WhatsApp de boas-vindas se o telefone foi informado
      if (inviteTelefone) {
        try {
          await enviarWhatsappBoasVindas(inviteName, inviteEmail, senhaTemporaria, inviteTelefone);
        } catch (whatsErr) {
          console.error("Erro ao enviar WhatsApp:", whatsErr);
          toast.warning("Usuário criado, mas não foi possível enviar o WhatsApp de boas-vindas.");
        }
      }

      toast.success(`Usuário ${inviteName} criado com sucesso!`);
      setOpenInvite(false);
      setInviteEmail(""); setInviteName(""); setInviteRole("vendedor"); setInviteFilialId(""); setInviteFilialIds([]); setInviteAcessoGlobal(false); setInviteComissaoImp("5"); setInviteComissaoMens("5"); setInviteComissaoServ("5"); setInviteDescontoLimiteImp("0"); setInviteDescontoLimiteMens("0"); setInviteGestorDesconto(false); setInvitePermitirCnpjDuplicado(false); setInviteRecebeComissao(true); setInviteTelefone(""); setInviteIsTecnico(false); setInviteTipoTecnico("interno"); setInviteIsVendedor(false); setInviteMesaIds([]);
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
    setEditFilialIds((user.filiais_vinculadas || []).map((f) => f.id));
    setEditAcessoGlobal(user.acesso_global || false);
    setEditComissaoImp(((user as any).comissao_implantacao_percentual ?? user.comissao_percentual ?? 5).toString());
    setEditComissaoMens(((user as any).comissao_mensalidade_percentual ?? user.comissao_percentual ?? 5).toString());
    setEditComissaoServ(((user as any).comissao_servico_percentual ?? 5).toString());
    setEditDescontoLimiteImp(((user as any).desconto_limite_implantacao ?? 0).toString());
    setEditDescontoLimiteMens(((user as any).desconto_limite_mensalidade ?? 0).toString());
    setEditGestorDesconto((user as any).gestor_desconto ?? false);
    setEditPermitirCnpjDuplicado((user as any).permitir_cnpj_duplicado ?? false);
    setEditRecebeComissao((user as any).recebe_comissao ?? true);
    setEditTelefone((user as any).telefone || "");
    setEditPermiteEnviarEspelho((user as any).permite_enviar_espelho_whatsapp ?? false);
    setEditPermiteResetarProjeto((user as any).permite_resetar_projeto ?? false);
    setEditPermiteCancelarProjeto((user as any).permite_cancelar_projeto ?? false);
    setEditPermiteVerValoresProjeto((user as any).permite_ver_valores_projeto ?? false);
    setEditIsTecnico((user as any).is_tecnico ?? false);
    setEditTipoTecnico((user as any).tipo_tecnico || "interno");
    setEditIsVendedor((user as any).is_vendedor ?? false);
    setEditMesaIds((user.mesas_vinculadas || []).map((m) => m.id));
    setEditActive(user.active);
    setOpenEdit(true);
  }

  async function handleEdit(e: React.FormEvent) {
    e.preventDefault();
    if (!editingUser) return;
    setSaving(true);
    try {
      // Determine filial_favorita: use filial_id (kept for backward compat), set to first selected or null
      const filialFavorita = editFilialIds.length > 0 ? editFilialIds[0] : null;
      
      const { error: profileError } = await supabase.from("profiles").update({
        full_name: editName,
        filial_id: filialFavorita,
        acesso_global: editAcessoGlobal,
        comissao_percentual: parseFloat(editComissaoImp) || 0,
        comissao_implantacao_percentual: parseFloat(editComissaoImp) || 0,
        comissao_mensalidade_percentual: parseFloat(editComissaoMens) || 0,
        comissao_servico_percentual: parseFloat(editComissaoServ) || 0,
        desconto_limite_implantacao: parseFloat(editDescontoLimiteImp) || 0,
        desconto_limite_mensalidade: parseFloat(editDescontoLimiteMens) || 0,
        gestor_desconto: editGestorDesconto,
        permitir_cnpj_duplicado: editPermitirCnpjDuplicado,
        recebe_comissao: editRecebeComissao,
        telefone: editTelefone || null,
        permite_enviar_espelho_whatsapp: editPermiteEnviarEspelho,
        permite_resetar_projeto: editPermiteResetarProjeto,
        permite_cancelar_projeto: editPermiteCancelarProjeto,
        permite_ver_valores_projeto: editPermiteVerValoresProjeto,
        is_tecnico: editIsTecnico,
        tipo_tecnico: editIsTecnico ? editTipoTecnico : null,
        is_vendedor: editIsVendedor,
        active: editActive,
      } as any).eq("user_id", editingUser.user_id);

      if (profileError) throw profileError;

      // Update usuario_filiais junction
      const { error: deleteUfError } = await supabase.from("usuario_filiais").delete().eq("user_id", editingUser.user_id);
      if (deleteUfError) throw deleteUfError;
      if (editFilialIds.length > 0 && !editAcessoGlobal) {
        const rows = editFilialIds.map((fId) => ({ user_id: editingUser.user_id, filial_id: fId }));
        const { error: ufError } = await supabase.from("usuario_filiais").insert(rows);
        if (ufError) throw ufError;
      }

      // Update usuario_mesas junction
      await supabase.from("usuario_mesas").delete().eq("user_id", editingUser.user_id);
      if (editMesaIds.length > 0) {
        const mesaRows = editMesaIds.map((mId) => ({ user_id: editingUser.user_id, mesa_id: mId }));
        await supabase.from("usuario_mesas").insert(mesaRows);
      }

      const { data: existingRole } = await supabase
        .from("user_roles")
        .select("id")
        .eq("user_id", editingUser.user_id)
        .single();

      if (existingRole) {
        const { error: updateRoleError } = await supabase
          .from("user_roles")
          .update({ role: editRole })
          .eq("id", existingRole.id);
        if (updateRoleError) throw updateRoleError;
      } else {
        const { error: insertError } = await supabase
          .from("user_roles")
          .insert({ user_id: editingUser.user_id, role: editRole });
        if (insertError) throw insertError;
      }

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

  // ── Reset password ────────────────────────────────────────
  async function handleResetPassword(user: UserWithRoles) {
    try {
      const { error } = await supabase.auth.resetPasswordForEmail(user.email, {
        redirectTo: `${window.location.origin}/reset-password`,
      });
      if (error) throw error;
      toast.success(`E-mail de redefinição de senha enviado para ${user.email}`);
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : "Erro ao enviar e-mail de redefinição");
    }
  }

  // ── Reenviar boas-vindas ────────────────────────────────
  async function handleReenviarBoasVindas(user: UserWithRoles) {
    const telefone = (user as any).telefone;
    if (!telefone) {
      toast.error("Usuário não possui telefone cadastrado. Edite o usuário e informe o telefone.");
      return;
    }

    try {
      toast.loading("Reenviando boas-vindas...", { id: "reenviar" });

      // Gerar senha segura: 8 caracteres com maiúscula, minúscula, número e especial
      const novaSenha = gerarSenhaSegura();

      // Atualizar senha via edge function (usa service role)
      const { error: pwError } = await supabase.functions.invoke("admin-update-password", {
        body: { user_id: user.user_id, password: novaSenha },
      });

      if (pwError) throw pwError;

      // Marcar que deve trocar senha
      await supabase.from("profiles").update({
        deve_trocar_senha: true,
      } as any).eq("user_id", user.user_id);

      // Enviar WhatsApp
      await enviarWhatsappBoasVindas(user.full_name, user.email, novaSenha, telefone);

      toast.success("Boas-vindas reenviada com sucesso! Nova senha gerada.", { id: "reenviar" });
    } catch (err: unknown) {
      console.error("Erro ao reenviar boas-vindas:", err);
      toast.error(err instanceof Error ? err.message : "Erro ao reenviar boas-vindas", { id: "reenviar" });
    }
  }


  const filtered = users.filter(
    (u) =>
      u.full_name.toLowerCase().includes(search.toLowerCase()) ||
      u.email.toLowerCase().includes(search.toLowerCase())
  );

  // Reset page when search changes
  useEffect(() => { setCurrentPage(1); }, [search]);



  return (
    <AppLayout>
      <div className="space-y-5 w-full max-w-[1400px]">
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
                filtered.slice((currentPage - 1) * ITEMS_PER_PAGE, currentPage * ITEMS_PER_PAGE).map((user) => (
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
                          onClick={() => openEditDialog(user)}
                          title="Editar usuário"
                        >
                          <Pencil className="h-3.5 w-3.5 text-muted-foreground" />
                        </Button>

                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-7 w-7"
                          onClick={() => handleResetPassword(user)}
                          title="Redefinir senha por e-mail"
                        >
                          <Key className="h-3.5 w-3.5 text-muted-foreground" />
                        </Button>

                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-7 w-7"
                          onClick={() => handleReenviarBoasVindas(user)}
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
          <TablePagination
            currentPage={currentPage}
            totalPages={Math.ceil(filtered.length / ITEMS_PER_PAGE)}
            totalItems={filtered.length}
            itemsPerPage={ITEMS_PER_PAGE}
            onPageChange={setCurrentPage}
          />
        </div>
      </div>

      {/* ── Create Dialog ── */}
      <Dialog open={openInvite} onOpenChange={setOpenInvite}>
        <DialogContent className="max-w-xl flex flex-col max-h-[90vh]">
          <DialogHeader className="shrink-0">
            <DialogTitle>Criar novo usuário</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleInvite} className="space-y-4 overflow-y-auto flex-1 pr-1">
            <div className="space-y-1.5">
              <Label>Nome completo</Label>
              <Input
                placeholder="João da Silva"
                value={inviteName}
                onChange={(e) => setInviteName(e.target.value)}
                required
              />
            </div>
            <div className="grid grid-cols-2 gap-3">
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
              <div className="space-y-1.5">
                <Label>Telefone</Label>
                <Input
                  type="tel"
                  placeholder="(11) 99999-9999"
                  value={inviteTelefone}
                  onChange={(e) => setInviteTelefone(e.target.value)}
                />
              </div>
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
            </div>
            <div className="rounded-lg border border-border p-3 space-y-3">
              <div className="flex items-center justify-between">
                <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Filiais de Acesso</p>
                <div className="flex items-center gap-2">
                  <Label className="text-xs text-muted-foreground flex items-center gap-1">
                    <Globe className="h-3.5 w-3.5" />
                    Acesso global
                  </Label>
                  <Switch checked={inviteAcessoGlobal} onCheckedChange={(v) => {
                    setInviteAcessoGlobal(v);
                    if (v) setInviteFilialIds([]);
                  }} />
                </div>
              </div>
              {!inviteAcessoGlobal && (
                <div className="space-y-2">
                  {filiais.map((f) => (
                    <div key={f.id} className="flex items-center justify-between rounded px-2 py-1.5 hover:bg-accent">
                      <span className="text-sm">{f.nome}</span>
                      <Switch
                        checked={inviteFilialIds.includes(f.id)}
                        onCheckedChange={(checked) => {
                          if (checked) {
                            setInviteFilialIds((prev) => [...prev, f.id]);
                          } else {
                            setInviteFilialIds((prev) => prev.filter((id) => id !== f.id));
                          }
                        }}
                      />
                    </div>
                  ))}
                </div>
              )}
              {inviteAcessoGlobal && (
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
                <Switch checked={inviteIsVendedor} onCheckedChange={setInviteIsVendedor} />
              </div>
              {inviteIsVendedor && (
                <>
                  <div className="border-t border-border" />
                  <div className="flex items-center justify-between">
                    <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Comissão</p>
                    <div className="flex items-center gap-2">
                      <Label className="text-xs text-muted-foreground">Recebe comissão</Label>
                      <Switch checked={inviteRecebeComissao} onCheckedChange={setInviteRecebeComissao} />
                    </div>
                  </div>
                  {inviteRecebeComissao && (
                    <div className="grid grid-cols-3 gap-3">
                      <div className="space-y-1.5">
                        <Label className="text-xs">Implantação (%)</Label>
                        <Input
                          type="number" min="0" max="100" step="0.01" placeholder="5"
                          value={inviteComissaoImp}
                          onChange={(e) => setInviteComissaoImp(e.target.value)}
                        />
                      </div>
                      <div className="space-y-1.5">
                        <Label className="text-xs">Mensalidade (%)</Label>
                        <Input
                          type="number" min="0" max="100" step="0.01" placeholder="5"
                          value={inviteComissaoMens}
                          onChange={(e) => setInviteComissaoMens(e.target.value)}
                        />
                      </div>
                      <div className="space-y-1.5">
                        <Label className="text-xs">Serviço (%)</Label>
                        <Input
                          type="number" min="0" max="100" step="0.01" placeholder="5"
                          value={inviteComissaoServ}
                          onChange={(e) => setInviteComissaoServ(e.target.value)}
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
                <Switch checked={inviteIsTecnico} onCheckedChange={setInviteIsTecnico} />
              </div>
              {inviteIsTecnico && (
                <div className="space-y-2 pl-2 border-l-2 border-primary/30">
                  <Label className="text-xs font-medium">Tipo de Atendimento</Label>
                  <div className="space-y-1.5">
                    {TIPO_TECNICO_OPTIONS.map((opt) => (
                      <div key={opt.value} className="flex items-center justify-between rounded px-2 py-1">
                        <span className="text-xs">{opt.label}</span>
                        <Switch
                          checked={inviteTipoTecnico === opt.value}
                          onCheckedChange={(checked) => { if (checked) setInviteTipoTecnico(opt.value); }}
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
                {mesasDisponiveis.map((m) => (
                  <div key={m.id} className="flex items-center justify-between rounded px-2 py-1.5 hover:bg-accent">
                    <span className="text-sm">{m.nome}</span>
                    <Switch
                      checked={inviteMesaIds.includes(m.id)}
                      onCheckedChange={(checked) => {
                        if (checked) setInviteMesaIds((prev) => [...prev, m.id]);
                        else setInviteMesaIds((prev) => prev.filter((id) => id !== m.id));
                      }}
                    />
                  </div>
                ))}
                {mesasDisponiveis.length === 0 && <p className="text-xs text-muted-foreground">Nenhuma mesa cadastrada.</p>}
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
              <div className="flex items-center justify-between pt-1">
                <div className="space-y-0.5">
                  <Label className="flex items-center gap-1.5 cursor-pointer">
                    <ShieldCheck className="h-4 w-4 text-amber-500" />
                    Permitir Cadastro CNPJ Duplicado
                  </Label>
                  <p className="text-xs text-muted-foreground">Permite cadastrar clientes com CNPJ já existente no módulo de Clientes</p>
                </div>
                <Switch checked={invitePermitirCnpjDuplicado} onCheckedChange={setInvitePermitirCnpjDuplicado} />
              </div>
            </div>
            <div className="flex justify-end gap-2 pt-2 shrink-0">
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
        <DialogContent className="max-w-xl flex flex-col max-h-[90vh]">
          <DialogHeader className="shrink-0">
            <DialogTitle>Editar usuário</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleEdit} className="flex-1 overflow-hidden flex flex-col">
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
                      value={editName}
                      onChange={(e) => setEditName(e.target.value)}
                      required
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-1.5">
                      <Label>E-mail</Label>
                      <Input value={editingUser?.email || ""} disabled className="bg-muted text-muted-foreground" />
                    </div>
                    <div className="space-y-1.5">
                      <Label>Telefone</Label>
                      <Input
                        type="tel"
                        placeholder="(11) 99999-9999"
                        value={editTelefone}
                        onChange={(e) => setEditTelefone(e.target.value)}
                      />
                    </div>
                  </div>
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
                  </div>
                  <div className="rounded-lg border border-border p-3 space-y-3">
                    <div className="flex items-center justify-between">
                      <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Filiais de Acesso</p>
                      <div className="flex items-center gap-2">
                        <Label className="text-xs text-muted-foreground flex items-center gap-1">
                          <Globe className="h-3.5 w-3.5" />
                          Acesso global
                        </Label>
                        <Switch checked={editAcessoGlobal} onCheckedChange={(v) => {
                          setEditAcessoGlobal(v);
                          if (v) setEditFilialIds([]);
                        }} />
                      </div>
                    </div>
                    {!editAcessoGlobal && (
                      <div className="space-y-2">
                        {filiais.map((f) => (
                          <div key={f.id} className="flex items-center justify-between rounded px-2 py-1.5 hover:bg-accent">
                            <span className="text-sm">{f.nome}</span>
                            <Switch
                              checked={editFilialIds.includes(f.id)}
                              onCheckedChange={(checked) => {
                                if (checked) {
                                  setEditFilialIds((prev) => [...prev, f.id]);
                                } else {
                                  setEditFilialIds((prev) => prev.filter((id) => id !== f.id));
                                }
                              }}
                            />
                          </div>
                        ))}
                      </div>
                    )}
                    {editAcessoGlobal && (
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
                      <Switch checked={editIsVendedor} onCheckedChange={setEditIsVendedor} />
                    </div>
                    {editIsVendedor && (
                      <>
                        <div className="border-t border-border" />
                        <div className="flex items-center justify-between">
                          <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Comissão</p>
                          <div className="flex items-center gap-2">
                            <Label className="text-xs text-muted-foreground">Recebe comissão</Label>
                            <Switch checked={editRecebeComissao} onCheckedChange={setEditRecebeComissao} />
                          </div>
                        </div>
                        {editRecebeComissao && (
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
                          {[{ value: "interno", label: "Interno" }, { value: "externo", label: "Externo" }, { value: "ambos", label: "Ambos" }].map((opt) => (
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
                      {mesasDisponiveis.map((m) => (
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
                      {mesasDisponiveis.length === 0 && <p className="text-xs text-muted-foreground">Nenhuma mesa cadastrada.</p>}
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
