import { useState } from "react";
import { normalizeBRPhone } from "@/lib/utils";
import { supabase } from "@/integrations/supabase/client";
import { Cliente } from "@/lib/supabase-types";
import { toast } from "sonner";
import { emptyContatoForm } from "./constants";
import type { ClienteContato, ContatoFormState } from "./types";

// ─── Hook: contatos externos do cliente (modal separado) ─────────────────

interface UseClienteContatosParams {
  fetchContatos: (clienteId: string) => Promise<ClienteContato[]>;
}

export function useClienteContatos({ fetchContatos }: UseClienteContatosParams) {
  const [contatosOpen, setContatosOpen] = useState(false);
  const [clienteContatos, setClienteContatos] = useState<Cliente | null>(null);
  const [contatos, setContatos] = useState<ClienteContato[]>([]);
  const [loadingContatos, setLoadingContatos] = useState(false);
  const [contatoDialogOpen, setContatoDialogOpen] = useState(false);
  const [editingContato, setEditingContato] = useState<ClienteContato | null>(null);
  const [contatoForm, setContatoForm] = useState<ContatoFormState>(emptyContatoForm);
  const [savingContato, setSavingContato] = useState(false);

  async function loadContatos(clienteId: string) {
    setLoadingContatos(true);
    const data = await fetchContatos(clienteId);
    setContatos(data);
    setLoadingContatos(false);
  }

  async function openContatos(c: Cliente) {
    setClienteContatos(c);
    setContatosOpen(true);
    await loadContatos(c.id);
  }

  function openNovoContato() {
    setEditingContato(null);
    setContatoForm(emptyContatoForm);
    setContatoDialogOpen(true);
  }

  function openEditContato(c: ClienteContato) {
    setEditingContato(c);
    setContatoForm({
      nome: c.nome,
      cargo: c.cargo || "",
      telefone: c.telefone || "",
      email: c.email || "",
      decisor: c.decisor,
      ativo: c.ativo,
    });
    setContatoDialogOpen(true);
  }

  async function handleSaveContato() {
    if (!contatoForm.nome.trim()) {
      toast.error("Nome é obrigatório");
      return;
    }
    if (!clienteContatos) return;
    setSavingContato(true);

    const payload = {
      cliente_id: clienteContatos.id,
      nome: contatoForm.nome.trim(),
      cargo: contatoForm.cargo.trim() || null,
      telefone: normalizeBRPhone(contatoForm.telefone) || null,
      email: contatoForm.email.trim() || null,
      decisor: contatoForm.decisor,
      ativo: contatoForm.ativo,
    };

    if (contatoForm.decisor) {
      await supabase
        .from("cliente_contatos")
        .update({ decisor: false })
        .eq("cliente_id", clienteContatos.id)
        .neq("id", editingContato?.id || "");
    }

    let error;
    if (editingContato) {
      ({ error } = await supabase.from("cliente_contatos").update(payload).eq("id", editingContato.id));
    } else {
      ({ error } = await supabase.from("cliente_contatos").insert(payload));
    }

    if (error) {
      toast.error("Erro ao salvar contato: " + error.message);
    } else {
      toast.success(editingContato ? "Contato atualizado!" : "Contato adicionado!");
      setContatoDialogOpen(false);
      await loadContatos(clienteContatos.id);
    }
    setSavingContato(false);
  }

  async function handleToggleDecisor(contato: ClienteContato) {
    if (!clienteContatos) return;
    if (!contato.decisor) {
      await supabase.from("cliente_contatos").update({ decisor: false }).eq("cliente_id", clienteContatos.id);
      await supabase.from("cliente_contatos").update({ decisor: true }).eq("id", contato.id);
    } else {
      await supabase.from("cliente_contatos").update({ decisor: false }).eq("id", contato.id);
    }
    await loadContatos(clienteContatos.id);
  }

  async function handleToggleAtivoContato(contato: ClienteContato) {
    if (!clienteContatos) return;
    await supabase.from("cliente_contatos").update({ ativo: !contato.ativo }).eq("id", contato.id);
    await loadContatos(clienteContatos.id);
  }

  async function handleDesativarContato(contato: ClienteContato) {
    if (!clienteContatos) return;
    if (contato.decisor) {
      const outroDecisorAtivo = contatos.some((c) => c.id !== contato.id && c.ativo && c.decisor);
      if (!outroDecisorAtivo) {
        toast.error("Defina um novo contato como decisor antes de desativar este.");
        return;
      }
    }
    const { error } = await supabase.from("cliente_contatos").update({ ativo: false, decisor: false }).eq("id", contato.id);
    if (error) {
      toast.error("Erro ao desativar contato: " + error.message);
    } else {
      toast.success("Contato desativado com sucesso");
      await loadContatos(clienteContatos.id);
    }
  }

  return {
    contatosOpen, setContatosOpen,
    clienteContatos,
    contatos, loadingContatos,
    contatoDialogOpen, setContatoDialogOpen,
    editingContato,
    contatoForm, setContatoForm,
    savingContato,
    openContatos,
    openNovoContato,
    openEditContato,
    handleSaveContato,
    handleToggleDecisor,
    handleToggleAtivoContato,
    handleDesativarContato,
  };
}
