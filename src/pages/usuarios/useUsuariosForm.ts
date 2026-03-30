// ─── Form hook for Usuarios module ──────────────────────────────────────

import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { AppRole } from "@/lib/supabase-types";
import { toast } from "sonner";
import { gerarSenhaSegura } from "./helpers";
import type { UserWithRoles } from "./types";

interface UseUsuariosFormParams {
  refetchUsers: () => void;
}

export function useUsuariosForm({ refetchUsers }: UseUsuariosFormParams) {
  // ── Create dialog state ──
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
  const [inviteSetorId, setInviteSetorId] = useState("");
  const [inviting, setInviting] = useState(false);

  // ── Edit dialog state ──
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
  const [editSetorId, setEditSetorId] = useState("");
  const [editActive, setEditActive] = useState(true);
  const [editIsAtendenteChat, setEditIsAtendenteChat] = useState(false);
  const [saving, setSaving] = useState(false);

  // ── WhatsApp boas-vindas ──
  async function enviarWhatsappBoasVindas(nome: string, email: string, senha: string, telefone: string) {
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

  // ── Create ──
  async function handleInvite(e: React.FormEvent) {
    e.preventDefault();
    setInviting(true);

    const senhaTemporaria = gerarSenhaSegura();

    try {
      const { data, error } = await supabase.auth.signUp({
        email: inviteEmail,
        password: senhaTemporaria,
        options: { data: { full_name: inviteName } },
      });

      if (error) throw error;
      if (!data.user) throw new Error("Usuário não criado");

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
        setor_id: inviteSetorId || null,
      } as any).eq("user_id", data.user.id);

      if (inviteFilialIds.length > 0 && !inviteAcessoGlobal) {
        const rows = inviteFilialIds.map((fId) => ({ user_id: data.user!.id, filial_id: fId }));
        await supabase.from("usuario_filiais").insert(rows);
      }

      if (inviteMesaIds.length > 0) {
        const mesaRows = inviteMesaIds.map((mId) => ({ user_id: data.user!.id, mesa_id: mId }));
        await supabase.from("usuario_mesas").insert(mesaRows);
      }

      await supabase.from("user_roles").insert({ user_id: data.user.id, role: inviteRole });

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
      resetInviteForm();
      refetchUsers();
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : "Erro ao criar usuário");
    }
    setInviting(false);
  }

  function resetInviteForm() {
    setInviteEmail(""); setInviteName(""); setInviteRole("vendedor"); setInviteFilialId(""); setInviteFilialIds([]); setInviteAcessoGlobal(false); setInviteComissaoImp("5"); setInviteComissaoMens("5"); setInviteComissaoServ("5"); setInviteDescontoLimiteImp("0"); setInviteDescontoLimiteMens("0"); setInviteGestorDesconto(false); setInvitePermitirCnpjDuplicado(false); setInviteRecebeComissao(true); setInviteTelefone(""); setInviteIsTecnico(false); setInviteTipoTecnico("interno"); setInviteIsVendedor(false); setInviteMesaIds([]); setInviteSetorId("");
  }

  // ── Open edit dialog ──
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
    setEditSetorId((user as any).setor_id || "");
    setEditActive(user.active);
    setEditIsAtendenteChat((user as any).is_atendente_chat ?? false);
    setOpenEdit(true);
  }

  // ── Edit submit ──
  async function handleEdit(e: React.FormEvent) {
    e.preventDefault();
    if (!editingUser) return;
    setSaving(true);
    try {
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
        is_atendente_chat: editIsAtendenteChat,
        setor_id: editSetorId || null,
      } as any).eq("user_id", editingUser.user_id);

      if (profileError) throw profileError;

      const { error: deleteUfError } = await supabase.from("usuario_filiais").delete().eq("user_id", editingUser.user_id);
      if (deleteUfError) throw deleteUfError;
      if (editFilialIds.length > 0 && !editAcessoGlobal) {
        const rows = editFilialIds.map((fId) => ({ user_id: editingUser.user_id, filial_id: fId }));
        const { error: ufError } = await supabase.from("usuario_filiais").insert(rows);
        if (ufError) throw ufError;
      }

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
      refetchUsers();
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : "Erro ao atualizar usuário");
    }
    setSaving(false);
  }

  // ── Toggle active ──
  async function toggleActive(user: UserWithRoles) {
    const { error } = await supabase.from("profiles").update({ active: !user.active }).eq("user_id", user.user_id);
    if (error) { toast.error("Erro ao atualizar usuário"); return; }
    toast.success(user.active ? "Usuário desativado" : "Usuário ativado");
    refetchUsers();
  }

  // ── Reset password ──
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

  // ── Reenviar boas-vindas ──
  async function handleReenviarBoasVindas(user: UserWithRoles) {
    const telefone = (user as any).telefone;
    if (!telefone) {
      toast.error("Usuário não possui telefone cadastrado. Edite o usuário e informe o telefone.");
      return;
    }

    try {
      toast.loading("Reenviando boas-vindas...", { id: "reenviar" });
      const novaSenha = gerarSenhaSegura();

      const { error: pwError } = await supabase.functions.invoke("admin-update-password", {
        body: { user_id: user.user_id, password: novaSenha },
      });
      if (pwError) throw pwError;

      await supabase.from("profiles").update({
        deve_trocar_senha: true,
      } as any).eq("user_id", user.user_id);

      await enviarWhatsappBoasVindas(user.full_name, user.email, novaSenha, telefone);
      toast.success("Boas-vindas reenviada com sucesso! Nova senha gerada.", { id: "reenviar" });
    } catch (err: unknown) {
      console.error("Erro ao reenviar boas-vindas:", err);
      toast.error(err instanceof Error ? err.message : "Erro ao reenviar boas-vindas", { id: "reenviar" });
    }
  }

  return {
    // Invite dialog
    openInvite, setOpenInvite,
    inviteEmail, setInviteEmail,
    inviteName, setInviteName,
    inviteRole, setInviteRole,
    inviteFilialId, setInviteFilialId,
    inviteFilialIds, setInviteFilialIds,
    inviteAcessoGlobal, setInviteAcessoGlobal,
    inviteComissaoImp, setInviteComissaoImp,
    inviteComissaoMens, setInviteComissaoMens,
    inviteComissaoServ, setInviteComissaoServ,
    inviteDescontoLimiteImp, setInviteDescontoLimiteImp,
    inviteDescontoLimiteMens, setInviteDescontoLimiteMens,
    inviteGestorDesconto, setInviteGestorDesconto,
    invitePermitirCnpjDuplicado, setInvitePermitirCnpjDuplicado,
    inviteRecebeComissao, setInviteRecebeComissao,
    inviteTelefone, setInviteTelefone,
    inviteIsTecnico, setInviteIsTecnico,
    inviteTipoTecnico, setInviteTipoTecnico,
    inviteIsVendedor, setInviteIsVendedor,
    inviteMesaIds, setInviteMesaIds,
    inviting,
    handleInvite,

    // Edit dialog
    openEdit, setOpenEdit,
    editingUser,
    editName, setEditName,
    editRole, setEditRole,
    editFilialId, setEditFilialId,
    editFilialIds, setEditFilialIds,
    editAcessoGlobal, setEditAcessoGlobal,
    editComissaoImp, setEditComissaoImp,
    editComissaoMens, setEditComissaoMens,
    editComissaoServ, setEditComissaoServ,
    editDescontoLimiteImp, setEditDescontoLimiteImp,
    editDescontoLimiteMens, setEditDescontoLimiteMens,
    editGestorDesconto, setEditGestorDesconto,
    editPermitirCnpjDuplicado, setEditPermitirCnpjDuplicado,
    editRecebeComissao, setEditRecebeComissao,
    editTelefone, setEditTelefone,
    editPermiteEnviarEspelho, setEditPermiteEnviarEspelho,
    editPermiteResetarProjeto, setEditPermiteResetarProjeto,
    editPermiteCancelarProjeto, setEditPermiteCancelarProjeto,
    editPermiteVerValoresProjeto, setEditPermiteVerValoresProjeto,
    editIsTecnico, setEditIsTecnico,
    editTipoTecnico, setEditTipoTecnico,
    editIsVendedor, setEditIsVendedor,
    editMesaIds, setEditMesaIds,
    editActive, setEditActive,
    editIsAtendenteChat, setEditIsAtendenteChat,
    saving,
    handleEdit,
    openEditDialog,

    // Actions
    toggleActive,
    handleResetPassword,
    handleReenviarBoasVindas,
  };
}
