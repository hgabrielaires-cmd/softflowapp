import { useState } from "react";
import { normalizeBRPhone } from "@/lib/utils";
import { supabase } from "@/integrations/supabase/client";
import { Cliente } from "@/lib/supabase-types";
import { toast } from "sonner";
import { emptyForm, emptyContatoForm } from "./constants";
import type { ClienteFormState, ContatoFormState } from "./types";

// ─── Types ───────────────────────────────────────────────────────────────
export type InlineContato = ContatoFormState & { _id?: string };

interface UseClienteFormParams {
  profile: { user_id: string; filial_id?: string | null } | null;
  isAdmin: boolean;
  canEditExisting: boolean;
  crudIncluir: boolean;
  filialPadraoId: string;
  fetchContatos: (clienteId: string) => Promise<any[]>;
  fetchData: () => void;
}

// ─── Hook ────────────────────────────────────────────────────────────────
export function useClienteForm({
  profile,
  isAdmin,
  canEditExisting,
  crudIncluir,
  filialPadraoId,
  fetchContatos,
  fetchData,
}: UseClienteFormParams) {
  // ── Dialog / editing state ─────────────────────────────────────────────
  const [dialogOpen, setDialogOpen] = useState(false);
  const [viewOnly, setViewOnly] = useState(false);
  const [editing, setEditing] = useState<Cliente | null>(null);
  const [form, setForm] = useState<ClienteFormState>(emptyForm);
  const [saving, setSaving] = useState(false);

  // ── CEP / CNPJ lookup ─────────────────────────────────────────────────
  const [loadingCep, setLoadingCep] = useState(false);
  const [loadingCnpj, setLoadingCnpj] = useState(false);
  const [cepError, setCepError] = useState("");
  const [cnpjError, setCnpjError] = useState("");
  const isQuerying = loadingCep || loadingCnpj;

  // ── Contatos inline ───────────────────────────────────────────────────
  const [formContatos, setFormContatos] = useState<InlineContato[]>([]);
  const [showContatoInlineForm, setShowContatoInlineForm] = useState(false);
  const [editingInlineIdx, setEditingInlineIdx] = useState<number | null>(null);
  const [inlineContatoForm, setInlineContatoForm] = useState<ContatoFormState>(emptyContatoForm);

  // ── CEP Blur ──────────────────────────────────────────────────────────
  async function handleCepBlur() {
    const cep = form.cep.replace(/\D/g, "");
    if (cep.length !== 8) return;
    setCepError("");
    setLoadingCep(true);
    try {
      const res = await fetch(`https://viacep.com.br/ws/${cep}/json/`);
      const data = await res.json();
      if (data.erro) {
        setCepError("CEP não encontrado");
      } else {
        setForm((f) => ({
          ...f,
          logradouro: f.logradouro || data.logradouro || "",
          bairro: f.bairro || data.bairro || "",
          cidade: f.cidade || data.localidade || "",
          uf: f.uf || data.uf || "",
        }));
      }
    } catch {
      setCepError("Erro ao consultar CEP");
    } finally {
      setLoadingCep(false);
    }
  }

  // ── CNPJ Blur ─────────────────────────────────────────────────────────
  async function handleCnpjBlur() {
    const cnpj = form.cnpj_cpf.replace(/\D/g, "");
    if (cnpj.length !== 14) return;

    setCnpjError("");
    setLoadingCnpj(true);

    try {
      let dadosCnpj: any = null;

      // 1) BrasilAPI
      try {
        const res = await fetch(`https://brasilapi.com.br/api/cnpj/v1/${cnpj}`);
        if (res.ok) {
          const data = await res.json();
          dadosCnpj = {
            razao_social: data.razao_social || "",
            nome_fantasia: data.nome_fantasia || data.razao_social || "",
            email: data.email || "",
            telefone: `${data.ddd_telefone_1 || ""}${data.telefone_1 || ""}`.replace(/\D/g, ""),
            municipio: data.municipio || "",
            uf: data.uf || "",
            logradouro: data.logradouro ? `${data.tipo_logradouro || ""} ${data.logradouro}`.trim() : "",
            bairro: data.bairro || "",
            cep: (data.cep || "").replace(/\D/g, ""),
            numero: data.numero || "",
            complemento: data.complemento || "",
          };
        }
      } catch {
        // fallback
      }

      // 2) publica.cnpj.ws (fallback principal no front-end por CORS)
      if (!dadosCnpj) {
        try {
          const res2 = await fetch(`https://publica.cnpj.ws/cnpj/${cnpj}`);
          if (res2.ok) {
            const data = await res2.json();
            const est = data?.estabelecimento || {};
            dadosCnpj = {
              razao_social: data?.razao_social || "",
              nome_fantasia: est?.nome_fantasia || data?.razao_social || "",
              email: est?.email || "",
              telefone: `${est?.ddd1 || ""}${est?.telefone1 || ""}`.replace(/\D/g, ""),
              municipio: est?.cidade?.nome || "",
              uf: est?.estado?.sigla || "",
              logradouro: [est?.tipo_logradouro, est?.logradouro].filter(Boolean).join(" ").trim(),
              bairro: est?.bairro || "",
              cep: (est?.cep || "").replace(/\D/g, ""),
              numero: est?.numero || "",
              complemento: est?.complemento || "",
            };
          }
        } catch {
          // fallback
        }
      }

      // 3) ReceitaWS (best effort)
      if (!dadosCnpj) {
        try {
          const res3 = await fetch(`https://receitaws.com.br/v1/cnpj/${cnpj}`);
          if (res3.ok) {
            const data = await res3.json();
            if (data.status !== "ERROR") {
              dadosCnpj = {
                razao_social: data.nome || "",
                nome_fantasia: data.fantasia || data.nome || "",
                email: data.email || "",
                telefone: (data.telefone || "").replace(/[^\d]/g, ""),
                municipio: data.municipio || "",
                uf: data.uf || "",
                logradouro: data.logradouro || "",
                bairro: data.bairro || "",
                cep: (data.cep || "").replace(/\D/g, ""),
                numero: data.numero || "",
                complemento: data.complemento || "",
              };
            }
          }
        } catch {
          // sem fallback adicional
        }
      }

      if (!dadosCnpj) {
        setCnpjError("CNPJ não encontrado. Verifique o número ou tente novamente.");
      } else {
        setForm((f) => ({
          ...f,
          razao_social: f.razao_social || dadosCnpj.razao_social,
          nome_fantasia: f.nome_fantasia || dadosCnpj.nome_fantasia,
          email: f.email || dadosCnpj.email,
          telefone: f.telefone || dadosCnpj.telefone,
          cidade: f.cidade || dadosCnpj.municipio,
          uf: f.uf || dadosCnpj.uf,
          logradouro: f.logradouro || dadosCnpj.logradouro,
          bairro: f.bairro || dadosCnpj.bairro,
          cep: f.cep || dadosCnpj.cep,
          numero: f.numero || dadosCnpj.numero,
          complemento: f.complemento || dadosCnpj.complemento,
        }));
      }
    } catch {
      setCnpjError("Erro ao consultar CNPJ. Tente novamente.");
    } finally {
      setLoadingCnpj(false);
    }
  }

  // ── Open create ───────────────────────────────────────────────────────
  function openCreate() {
    setEditing(null);
    setViewOnly(false);
    setCepError("");
    setCnpjError("");
    const defaultFilial = filialPadraoId || profile?.filial_id || "";
    setForm({ ...emptyForm, filial_id: defaultFilial });
    setFormContatos([]);
    setShowContatoInlineForm(false);
    setEditingInlineIdx(null);
    setInlineContatoForm(emptyContatoForm);
    setDialogOpen(true);
  }

  // ── Open edit ─────────────────────────────────────────────────────────
  async function openEdit(c: Cliente, readonly = false) {
    setEditing(c);
    setViewOnly(readonly);
    const ieIsento = (c as any).inscricao_estadual === "ISENTO";
    setForm({
      nome_fantasia: c.nome_fantasia,
      razao_social: c.razao_social || "",
      apelido: (c as any).apelido || "",
      cnpj_cpf: c.cnpj_cpf,
      inscricao_estadual: ieIsento ? "" : ((c as any).inscricao_estadual || ""),
      ie_isento: ieIsento,
      responsavel_nome: (c as any).responsavel_nome || "",
      contato_nome: c.contato_nome || "",
      telefone: c.telefone || "",
      email: c.email || "",
      cidade: c.cidade || "",
      uf: c.uf || "",
      cep: (c as any).cep || "",
      logradouro: (c as any).logradouro || "",
      numero: (c as any).numero || "",
      complemento: (c as any).complemento || "",
      bairro: (c as any).bairro || "",
      filial_id: c.filial_id || "",
      ativo: c.ativo,
    });
    setShowContatoInlineForm(false);
    setEditingInlineIdx(null);
    setInlineContatoForm(emptyContatoForm);
    setCepError("");
    setCnpjError("");
    // Carrega contatos existentes
    const data = await fetchContatos(c.id);
    setFormContatos((data || []).map((ct: any) => ({
      _id: ct.id,
      nome: ct.nome,
      cargo: ct.cargo || "",
      telefone: ct.telefone || "",
      email: ct.email || "",
      decisor: ct.decisor,
      ativo: ct.ativo,
    })));
    setDialogOpen(true);
  }

  // ── Save ──────────────────────────────────────────────────────────────
  async function handleSave() {
    if (isQuerying) return;
    if (!form.nome_fantasia.trim() || !form.cnpj_cpf.trim() || !form.razao_social.trim()) {
      toast.error("Nome fantasia, Razão social e CNPJ/CPF são obrigatórios");
      return;
    }
    if (!form.responsavel_nome.trim()) {
      toast.error("Nome completo do responsável é obrigatório");
      return;
    }
    if (!form.ie_isento && !form.inscricao_estadual.trim()) {
      toast.error("Inscrição Estadual é obrigatória. Se não possuir, marque 'Isento de IE'.");
      return;
    }
    if (formContatos.length === 0) {
      toast.error("Cadastre pelo menos um contato antes de salvar");
      return;
    }
    const contatoInvalido = formContatos.find((c) => !c.email?.trim() || !c.cargo?.trim());
    if (contatoInvalido) {
      toast.error("Todos os contatos devem ter E-mail e Cargo preenchidos");
      return;
    }
    setSaving(true);

    // ── Verificação de CNPJ duplicado ──────────────────────────────────
    if (!editing) {
      const { data: profileData } = await supabase
        .from("profiles")
        .select("permitir_cnpj_duplicado")
        .eq("user_id", profile?.user_id || "")
        .maybeSingle();

      const podeduplicar = isAdmin || (profileData as any)?.permitir_cnpj_duplicado === true;

      if (!podeduplicar) {
        const cnpjLimpo = form.cnpj_cpf.trim();
        const { data: existente } = await supabase
          .from("clientes")
          .select("id, nome_fantasia")
          .eq("cnpj_cpf", cnpjLimpo)
          .maybeSingle();

        if (existente) {
          toast.error(`CNPJ/CPF já cadastrado para o cliente "${existente.nome_fantasia}". Para cadastrar com CNPJ duplicado, solicite permissão ao administrador.`);
          setSaving(false);
          return;
        }
      }
    }

    const payload: any = {
      nome_fantasia: form.nome_fantasia.trim(),
      razao_social: form.razao_social.trim(),
      apelido: form.apelido.trim() || null,
      cnpj_cpf: form.cnpj_cpf.trim(),
      inscricao_estadual: form.ie_isento ? "ISENTO" : (form.inscricao_estadual.trim() || null),
      responsavel_nome: form.responsavel_nome.trim() || null,
      contato_nome: formContatos[0]?.nome || form.contato_nome.trim() || null,
      telefone: formContatos[0]?.telefone || form.telefone.trim() || null,
      email: formContatos[0]?.email || form.email.trim() || null,
      cidade: form.cidade.trim() || null,
      uf: form.uf || null,
      cep: form.cep.replace(/\D/g, "") || null,
      logradouro: form.logradouro.trim() || null,
      numero: form.numero.trim() || null,
      complemento: form.complemento.trim() || null,
      bairro: form.bairro.trim() || null,
      filial_id: form.filial_id || null,
      ativo: form.ativo,
    };

    if (editing) {
      payload.atualizado_por = profile?.user_id || null;
      const { error } = await supabase.from("clientes").update(payload).eq("id", editing.id);
      if (error) { toast.error("Erro ao atualizar cliente: " + error.message); setSaving(false); return; }
      // Sincronizar contatos
      for (const ct of formContatos) {
        if (ct._id) {
          await supabase.from("cliente_contatos").update({
            nome: ct.nome, cargo: ct.cargo || null, telefone: normalizeBRPhone(ct.telefone) || null,
            email: ct.email || null, decisor: ct.decisor, ativo: ct.ativo,
          }).eq("id", ct._id);
        } else {
          await supabase.from("cliente_contatos").insert({
            cliente_id: editing.id, nome: ct.nome, cargo: ct.cargo || null,
            telefone: normalizeBRPhone(ct.telefone) || null, email: ct.email || null, decisor: ct.decisor, ativo: ct.ativo,
          });
        }
      }
      toast.success("Cliente atualizado com sucesso");
    } else {
      payload.criado_por = profile?.user_id || null;
      const { data: newCliente, error } = await supabase.from("clientes").insert(payload).select().single();
      if (error || !newCliente) { toast.error("Erro ao cadastrar cliente: " + (error?.message || "")); setSaving(false); return; }
      for (const ct of formContatos) {
        await supabase.from("cliente_contatos").insert({
          cliente_id: newCliente.id, nome: ct.nome, cargo: ct.cargo || null,
          telefone: normalizeBRPhone(ct.telefone) || null, email: ct.email || null, decisor: ct.decisor, ativo: ct.ativo,
        });
      }
      toast.success("Cliente cadastrado com sucesso");
    }
    setSaving(false);
    setDialogOpen(false);
    fetchData();
  }

  return {
    // Dialog
    dialogOpen, setDialogOpen,
    viewOnly,
    editing,
    // Form
    form, setForm,
    saving,
    // CEP / CNPJ
    loadingCep, loadingCnpj,
    cepError, setCepError,
    cnpjError, setCnpjError,
    isQuerying,
    // Inline contatos
    formContatos, setFormContatos,
    showContatoInlineForm, setShowContatoInlineForm,
    editingInlineIdx, setEditingInlineIdx,
    inlineContatoForm, setInlineContatoForm,
    // Actions
    openCreate,
    openEdit,
    handleSave,
    handleCepBlur,
    handleCnpjBlur,
  };
}
