// ─── Form, mutations & handlers for JornadaImplantacao module ─────────────
import { useState, useEffect, useRef } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import type { Jornada, ChecklistItem, ChecklistItemTipo, MesaAtendimento } from "@/lib/supabase-types";
import type { LocalEtapa, LocalAtividade, JornadaFormState, EtapaFormState, AtividadeFormState } from "./types";
import { emptyJornadaForm } from "./constants";
import { getVinculoItems, getVinculoLabel, mapEtapasToLocal, decimalToHorasText } from "./helpers";

interface VinculoItem {
  id: string;
  nome: string;
  descricao?: string;
}

interface UseJornadaFormParams {
  planos: VinculoItem[];
  modulos: VinculoItem[];
  servicos: VinculoItem[];
  mesas: MesaAtendimento[];
}

export function useJornadaForm({ planos, modulos, servicos, mesas }: UseJornadaFormParams) {
  const queryClient = useQueryClient();

  // ─── Main dialog state ──────────────────────────────────────────────────
  const [search, setSearch] = useState("");
  const [filterVinculo, setFilterVinculo] = useState("todos");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<Jornada | null>(null);
  const [form, setForm] = useState<JornadaFormState>({ ...emptyJornadaForm });
  const [etapas, setEtapas] = useState<LocalEtapa[]>([]);
  const [expandedEtapas, setExpandedEtapas] = useState<Set<string>>(new Set());
  const [confirmCloseOpen, setConfirmCloseOpen] = useState(false);
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);
  const skipConfirmRef = useRef(false);

  // ─── View dialog state ─────────────────────────────────────────────────
  const [viewDialogOpen, setViewDialogOpen] = useState(false);
  const [viewJornada, setViewJornada] = useState<Jornada | null>(null);
  const [viewEtapas, setViewEtapas] = useState<LocalEtapa[]>([]);
  const [viewExpandedEtapas, setViewExpandedEtapas] = useState<Set<string>>(new Set());

  // ─── Etapa dialog state ────────────────────────────────────────────────
  const [etapaDialogOpen, setEtapaDialogOpen] = useState(false);
  const [editingEtapa, setEditingEtapa] = useState<LocalEtapa | null>(null);
  const [etapaForm, setEtapaForm] = useState<EtapaFormState>({ nome: "", descricao: "", mesa_atendimento_id: "", permite_clonar: false });

  // ─── Atividade dialog state ────────────────────────────────────────────
  const [atividadeDialogOpen, setAtividadeDialogOpen] = useState(false);
  const [currentEtapaTempId, setCurrentEtapaTempId] = useState("");
  const [editingAtividade, setEditingAtividade] = useState<LocalAtividade | null>(null);
  const [atividadeForm, setAtividadeForm] = useState<AtividadeFormState>({ nome: "", descricao: "", horas_estimadas: 0, checklist: [], tipo_responsabilidade: "Interna", mesa_atendimento_id: "" });
  const [horasText, setHorasText] = useState("0:00");

  // ─── Import dialog state ───────────────────────────────────────────────
  const [importDialogOpen, setImportDialogOpen] = useState(false);
  const [clonableEtapas, setClonableEtapas] = useState<any[]>([]);

  // ─── Drag & drop refs ──────────────────────────────────────────────────
  const dragEtapaItem = useRef<number | null>(null);
  const dragEtapaOverItem = useRef<number | null>(null);
  const dragAtivItem = useRef<{ etapaTempId: string; index: number } | null>(null);
  const dragAtivOverItem = useRef<{ etapaTempId: string; index: number } | null>(null);

  // ─── Auto-fill description ─────────────────────────────────────────────
  useEffect(() => {
    if (!form.vinculo_tipo || !form.vinculo_id) return;
    let desc = "";
    if (form.vinculo_tipo === "plano") {
      const p = planos.find((x) => x.id === form.vinculo_id);
      desc = p?.descricao || "";
    } else if (form.vinculo_tipo === "servico") {
      const s = servicos.find((x) => x.id === form.vinculo_id);
      desc = s?.descricao || "";
    }
    if (desc) setForm((prev) => ({ ...prev, descricao: desc }));
  }, [form.vinculo_tipo, form.vinculo_id]);

  // ─── Derived helpers ───────────────────────────────────────────────────
  const vinculoItems = getVinculoItems(form.vinculo_tipo, planos, modulos, servicos);

  function resolveVinculoLabel(tipo: string, id: string) {
    return getVinculoLabel(tipo, id, planos, modulos, servicos);
  }

  const canSave = !!(form.nome.trim() && form.vinculo_tipo && form.vinculo_id);

  // ─── Save mutation ─────────────────────────────────────────────────────
  const saveMutation = useMutation({
    mutationFn: async () => {
      const payload = {
        nome: form.nome,
        descricao: form.descricao || null,
        filial_id: form.filial_id || null,
        vinculo_tipo: form.vinculo_tipo,
        vinculo_id: form.vinculo_id,
      };

      let jornadaId: string;

      if (editing) {
        const { error } = await supabase.from("jornadas").update(payload).eq("id", editing.id);
        if (error) throw error;
        jornadaId = editing.id;

        // 1. Fetch old etapas/atividades and build remap keys
        const { data: oldEtapas } = await supabase
          .from("jornada_etapas")
          .select("id, nome, ordem")
          .eq("jornada_id", jornadaId)
          .order("ordem");

        const oldAtivMap: Record<string, string> = {};

        if (oldEtapas && oldEtapas.length > 0) {
          const oldEtapaIds = oldEtapas.map(e => e.id);
          const { data: oldAtividades } = await supabase
            .from("jornada_atividades")
            .select("id, etapa_id, ordem")
            .in("etapa_id", oldEtapaIds)
            .order("ordem");

          if (oldAtividades) {
            const etapaOrdemMap: Record<string, number> = {};
            oldEtapas.forEach(e => { etapaOrdemMap[e.id] = e.ordem; });
            oldAtividades.forEach(a => {
              const key = `${etapaOrdemMap[a.etapa_id]}-${a.ordem}`;
              oldAtivMap[key] = a.id;
            });
          }

          // 2. DELETE old data FIRST to avoid duplicates
          const { error: delAtivErr } = await supabase.from("jornada_atividades").delete().in("etapa_id", oldEtapaIds);
          if (delAtivErr) throw delAtivErr;
          const { error: delEtapaErr } = await supabase.from("jornada_etapas").delete().in("id", oldEtapaIds);
          if (delEtapaErr) throw delEtapaErr;
        }

        // 3. INSERT new etapas/atividades
        const newAtivMap: Record<string, string> = {};

        for (const etapa of etapas) {
          const { data: etapaData, error: etapaErr } = await supabase.from("jornada_etapas").insert({
            jornada_id: jornadaId,
            nome: etapa.nome,
            descricao: etapa.descricao || null,
            mesa_atendimento_id: etapa.mesa_atendimento_id || null,
            permite_clonar: etapa.permite_clonar,
            ordem: etapa.ordem,
          }).select("id").single();
          if (etapaErr) throw etapaErr;

          if (etapa.atividades.length > 0) {
            const atividades = etapa.atividades.map((a) => ({
              etapa_id: etapaData.id,
              nome: a.nome,
              descricao: a.descricao || null,
              horas_estimadas: a.horas_estimadas,
              checklist: a.checklist as any,
              tipo_responsabilidade: a.tipo_responsabilidade,
              mesa_atendimento_id: a.mesa_atendimento_id || null,
              ordem: a.ordem,
            }));
            const { data: insertedAtivs, error: atErr } = await supabase
              .from("jornada_atividades")
              .insert(atividades)
              .select("id, ordem");
            if (atErr) throw atErr;

            if (insertedAtivs) {
              insertedAtivs.forEach(a => {
                const key = `${etapa.ordem}-${a.ordem}`;
                newAtivMap[key] = a.id;
              });
            }
          }
        }

        // 4. Remap references from old atividade IDs to new ones
        for (const [key, oldId] of Object.entries(oldAtivMap)) {
          const newId = newAtivMap[key];
          if (newId && newId !== oldId) {
            await Promise.all([
              supabase.from("painel_agendamentos").update({ atividade_id: newId }).eq("atividade_id", oldId),
              supabase.from("painel_checklist_progresso").update({ atividade_id: newId }).eq("atividade_id", oldId),
            ]);
          }
        }
      } else {
        const { data, error } = await supabase.from("jornadas").insert(payload).select("id").single();
        if (error) throw error;
        jornadaId = data.id;

        for (const etapa of etapas) {
          const { data: etapaData, error: etapaErr } = await supabase.from("jornada_etapas").insert({
            jornada_id: jornadaId,
            nome: etapa.nome,
            descricao: etapa.descricao || null,
            mesa_atendimento_id: etapa.mesa_atendimento_id || null,
            permite_clonar: etapa.permite_clonar,
            ordem: etapa.ordem,
          }).select("id").single();
          if (etapaErr) throw etapaErr;

          if (etapa.atividades.length > 0) {
            const atividades = etapa.atividades.map((a) => ({
              etapa_id: etapaData.id,
              nome: a.nome,
              descricao: a.descricao || null,
              horas_estimadas: a.horas_estimadas,
              checklist: a.checklist as any,
              tipo_responsabilidade: a.tipo_responsabilidade,
              mesa_atendimento_id: a.mesa_atendimento_id || null,
              ordem: a.ordem,
            }));
            const { error: atErr } = await supabase.from("jornada_atividades").insert(atividades);
            if (atErr) throw atErr;
          }
        }
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["jornadas"] });
      toast.success(editing ? "Jornada atualizada!" : "Jornada criada!");
      skipConfirmRef.current = true;
      closeDialog();
    },
    onError: (e) => { console.error(e); toast.error("Erro ao salvar jornada."); },
  });

  const toggleMutation = useMutation({
    mutationFn: async ({ id, ativo }: { id: string; ativo: boolean }) => {
      const { error } = await supabase.from("jornadas").update({ ativo }).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["jornadas"] }),
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("jornadas").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["jornadas"] });
      toast.success("Jornada excluída!");
    },
    onError: () => toast.error("Erro ao excluir jornada."),
  });

  // ─── Open/Close dialog handlers ────────────────────────────────────────
  function openNew() {
    setEditing(null);
    setForm({ ...emptyJornadaForm });
    setEtapas([]);
    setDialogOpen(true);
  }

  async function openEdit(jornada: Jornada) {
    setEditing(jornada);
    setForm({
      nome: jornada.nome,
      descricao: jornada.descricao || "",
      filial_id: jornada.filial_id || "",
      vinculo_tipo: jornada.vinculo_tipo,
      vinculo_id: jornada.vinculo_id,
    });
    const { data: etapasData } = await supabase.from("jornada_etapas").select("*, jornada_atividades(*)").eq("jornada_id", jornada.id).order("ordem");
    setEtapas(mapEtapasToLocal(etapasData || []));
    setDialogOpen(true);
  }

  function closeDialog() {
    setDialogOpen(false);
    setEditing(null);
    setForm({ ...emptyJornadaForm });
    setEtapas([]);
  }

  async function openView(jornada: Jornada) {
    setViewJornada(jornada);
    const { data: etapasData } = await supabase.from("jornada_etapas").select("*, mesas_atendimento(nome), jornada_atividades(*)").eq("jornada_id", jornada.id).order("ordem");
    const localEtapas = mapEtapasToLocal(etapasData || []);
    setViewEtapas(localEtapas);
    setViewExpandedEtapas(new Set(localEtapas.map(e => e.tempId)));
    setViewDialogOpen(true);
  }

  // ─── Dialog close with confirm ─────────────────────────────────────────
  function handleDialogOpenChange(open: boolean) {
    if (!open) {
      if (skipConfirmRef.current) {
        skipConfirmRef.current = false;
        setDialogOpen(false);
      } else {
        setConfirmCloseOpen(true);
      }
    }
  }

  function handleConfirmNo() {
    setConfirmCloseOpen(false);
    closeDialog();
  }

  function handleConfirmYes() {
    setConfirmCloseOpen(false);
    skipConfirmRef.current = true;
    setDialogOpen(false);
    saveMutation.mutate();
  }

  function handleDeleteConfirm() {
    if (deleteConfirmId) deleteMutation.mutate(deleteConfirmId);
    setDeleteConfirmId(null);
  }

  // ─── Etapa CRUD ────────────────────────────────────────────────────────
  function openNewEtapa() {
    setEditingEtapa(null);
    setEtapaForm({ nome: "", descricao: "", mesa_atendimento_id: "", permite_clonar: false });
    setEtapaDialogOpen(true);
  }

  function openEditEtapa(etapa: LocalEtapa) {
    setEditingEtapa(etapa);
    setEtapaForm({ nome: etapa.nome, descricao: etapa.descricao, mesa_atendimento_id: etapa.mesa_atendimento_id, permite_clonar: etapa.permite_clonar });
    setEtapaDialogOpen(true);
  }

  function saveEtapa() {
    if (!etapaForm.nome.trim()) return;
    if (editingEtapa) {
      setEtapas((prev) => prev.map((e) => e.tempId === editingEtapa.tempId ? { ...e, ...etapaForm } : e));
    } else {
      setEtapas((prev) => [...prev, {
        tempId: crypto.randomUUID(),
        nome: etapaForm.nome,
        descricao: etapaForm.descricao,
        mesa_atendimento_id: etapaForm.mesa_atendimento_id,
        permite_clonar: etapaForm.permite_clonar,
        ordem: prev.length,
        atividades: [],
      }]);
    }
    setEtapaDialogOpen(false);
  }

  function removeEtapa(tempId: string) {
    setEtapas((prev) => prev.filter((e) => e.tempId !== tempId));
  }

  // ─── Etapa drag & drop ─────────────────────────────────────────────────
  function handleEtapaDragStart(idx: number) { dragEtapaItem.current = idx; }
  function handleEtapaDragEnter(idx: number) { dragEtapaOverItem.current = idx; }

  function handleEtapaDragEnd() {
    if (dragEtapaItem.current === null || dragEtapaOverItem.current === null || dragEtapaItem.current === dragEtapaOverItem.current) {
      dragEtapaItem.current = null;
      dragEtapaOverItem.current = null;
      return;
    }
    setEtapas((prev) => {
      const reordered = [...prev];
      const [removed] = reordered.splice(dragEtapaItem.current!, 1);
      reordered.splice(dragEtapaOverItem.current!, 0, removed);
      dragEtapaItem.current = null;
      dragEtapaOverItem.current = null;
      return reordered.map((e, i) => ({ ...e, ordem: i }));
    });
  }

  // ─── Atividade drag & drop ─────────────────────────────────────────────
  function handleAtivDragStart(etapaTempId: string, index: number) {
    dragAtivItem.current = { etapaTempId, index };
  }
  function handleAtivDragEnter(etapaTempId: string, index: number) {
    dragAtivOverItem.current = { etapaTempId, index };
  }

  function handleAtividadeDragEnd(etapaTempId: string) {
    const from = dragAtivItem.current;
    const to = dragAtivOverItem.current;
    if (!from || !to || from.etapaTempId !== etapaTempId || to.etapaTempId !== etapaTempId || from.index === to.index) {
      dragAtivItem.current = null;
      dragAtivOverItem.current = null;
      return;
    }
    setEtapas((prev) => prev.map((e) => {
      if (e.tempId !== etapaTempId) return e;
      const reordered = [...e.atividades];
      const [removed] = reordered.splice(from.index, 1);
      reordered.splice(to.index, 0, removed);
      return { ...e, atividades: reordered.map((a, i) => ({ ...a, ordem: i })) };
    }));
    dragAtivItem.current = null;
    dragAtivOverItem.current = null;
  }

  // ─── Atividade CRUD ────────────────────────────────────────────────────
  function openNewAtividade(etapaTempId: string) {
    setCurrentEtapaTempId(etapaTempId);
    setEditingAtividade(null);
    const etapa = etapas.find(e => e.tempId === etapaTempId);
    setAtividadeForm({ nome: "", descricao: "", horas_estimadas: 0, checklist: [], tipo_responsabilidade: "Interna", mesa_atendimento_id: etapa?.mesa_atendimento_id || "" });
    setHorasText("0:00");
    setAtividadeDialogOpen(true);
  }

  function openEditAtividade(etapaTempId: string, atividade: LocalAtividade) {
    setCurrentEtapaTempId(etapaTempId);
    setEditingAtividade(atividade);
    setAtividadeForm({
      nome: atividade.nome,
      descricao: atividade.descricao,
      horas_estimadas: atividade.horas_estimadas,
      checklist: [...atividade.checklist],
      tipo_responsabilidade: atividade.tipo_responsabilidade,
      mesa_atendimento_id: atividade.mesa_atendimento_id || "",
    });
    setHorasText(decimalToHorasText(atividade.horas_estimadas));
    setAtividadeDialogOpen(true);
  }

  function saveAtividade() {
    if (!atividadeForm.nome.trim()) return;
    setEtapas((prev) => prev.map((e) => {
      if (e.tempId !== currentEtapaTempId) return e;
      if (editingAtividade) {
        return { ...e, atividades: e.atividades.map((a) => a.tempId === editingAtividade.tempId ? { ...a, ...atividadeForm } : a) };
      }
      return { ...e, atividades: [...e.atividades, { tempId: crypto.randomUUID(), ...atividadeForm, ordem: e.atividades.length }] };
    }));
    setAtividadeDialogOpen(false);
  }

  function removeAtividade(etapaTempId: string, atividadeTempId: string) {
    setEtapas((prev) => prev.map((e) => e.tempId !== etapaTempId ? e : { ...e, atividades: e.atividades.filter((a) => a.tempId !== atividadeTempId) }));
  }

  // ─── Checklist helpers ─────────────────────────────────────────────────
  function addChecklistItem() {
    setAtividadeForm((prev) => ({ ...prev, checklist: [...prev.checklist, { texto: "", concluido: false, tipo: "check" as ChecklistItemTipo }] }));
  }

  function updateChecklistText(index: number, texto: string) {
    setAtividadeForm((prev) => ({ ...prev, checklist: prev.checklist.map((c, i) => i === index ? { ...c, texto } : c) }));
  }

  function updateChecklistTipo(index: number, tipo: ChecklistItemTipo) {
    setAtividadeForm((prev) => ({
      ...prev,
      checklist: prev.checklist.map((c, i) => {
        if (i !== index) return c;
        // When switching away from agendamento, clear the extra fields
        if (tipo !== "agendamento") {
          const { mesa_id, etapa_execucao_id, ...rest } = c;
          return { ...rest, tipo };
        }
        return { ...c, tipo };
      }),
    }));
  }

  function updateChecklistMesaId(index: number, mesa_id: string | null) {
    setAtividadeForm((prev) => ({ ...prev, checklist: prev.checklist.map((c, i) => i === index ? { ...c, mesa_id } : c) }));
  }

  function updateChecklistEtapaExecucaoId(index: number, etapa_execucao_id: string | null) {
    setAtividadeForm((prev) => ({ ...prev, checklist: prev.checklist.map((c, i) => i === index ? { ...c, etapa_execucao_id } : c) }));
  }

  function removeChecklistItem(index: number) {
    setAtividadeForm((prev) => ({ ...prev, checklist: prev.checklist.filter((_, i) => i !== index) }));
  }

  function moveChecklistItem(index: number, direction: "up" | "down") {
    setAtividadeForm((prev) => {
      const list = [...prev.checklist];
      const target = direction === "up" ? index - 1 : index + 1;
      if (target < 0 || target >= list.length) return prev;
      [list[index], list[target]] = [list[target], list[index]];
      return { ...prev, checklist: list };
    });
  }

  // ─── Expand/collapse ───────────────────────────────────────────────────
  function toggleExpanded(tempId: string) {
    setExpandedEtapas((prev) => {
      const next = new Set(prev);
      if (next.has(tempId)) next.delete(tempId); else next.add(tempId);
      return next;
    });
  }

  // ─── Import ────────────────────────────────────────────────────────────
  async function openImportDialog() {
    const { data } = await supabase
      .from("jornada_etapas")
      .select("*, jornada_atividades(*), jornadas(nome)")
      .eq("permite_clonar", true)
      .order("nome");
    setClonableEtapas(data || []);
    setImportDialogOpen(true);
  }

  async function importEtapa(etapaData: any) {
    const atividades: LocalAtividade[] = (etapaData.jornada_atividades || [])
      .sort((a: any, b: any) => a.ordem - b.ordem)
      .map((a: any) => ({
        tempId: crypto.randomUUID(),
        nome: a.nome,
        descricao: a.descricao || "",
        horas_estimadas: a.horas_estimadas,
        checklist: Array.isArray(a.checklist) ? a.checklist : [],
        tipo_responsabilidade: a.tipo_responsabilidade,
        mesa_atendimento_id: a.mesa_atendimento_id || "",
        ordem: a.ordem,
      }));

    setEtapas((prev) => [...prev, {
      tempId: crypto.randomUUID(),
      nome: etapaData.nome,
      descricao: etapaData.descricao || "",
      mesa_atendimento_id: etapaData.mesa_atendimento_id || "",
      permite_clonar: false,
      ordem: prev.length,
      atividades,
    }]);

    toast.success(`Etapa "${etapaData.nome}" importada com ${atividades.length} atividades!`);
    setImportDialogOpen(false);
  }

  // ─── Horas text handlers ───────────────────────────────────────────────
  function handleHorasTextChange(val: string) {
    setHorasText(val.replace(/[^0-9:]/g, ""));
  }

  function handleHorasTextBlur() {
    const parts = horasText.split(":");
    const hours = parseInt(parts[0] || "0", 10) || 0;
    const mins = Math.min(59, parseInt(parts[1] || "0", 10) || 0);
    const decimal = hours + mins / 60;
    setAtividadeForm((p) => ({ ...p, horas_estimadas: Math.round(decimal * 100) / 100 }));
    setHorasText(`${hours}:${mins.toString().padStart(2, "0")}`);
  }

  return {
    // Search / filter
    search, setSearch,
    filterVinculo, setFilterVinculo,

    // Main dialog
    dialogOpen, handleDialogOpenChange,
    editing,
    form, setForm,
    etapas,
    expandedEtapas,
    vinculoItems,
    canSave,
    saveMutation,
    resolveVinculoLabel,
    openNew, openEdit, closeDialog,

    // View dialog
    viewDialogOpen, setViewDialogOpen,
    viewJornada,
    viewEtapas,
    viewExpandedEtapas, setViewExpandedEtapas,
    openView,

    // Confirm close dialog
    confirmCloseOpen, setConfirmCloseOpen,
    handleConfirmNo, handleConfirmYes,

    // Delete confirm
    deleteConfirmId, setDeleteConfirmId,
    handleDeleteConfirm,

    // Toggle ativo
    toggleMutation,

    // Etapa dialog
    etapaDialogOpen, setEtapaDialogOpen,
    editingEtapa,
    etapaForm, setEtapaForm,
    openNewEtapa, openEditEtapa, saveEtapa, removeEtapa,

    // Etapa drag & drop
    handleEtapaDragStart, handleEtapaDragEnter, handleEtapaDragEnd,

    // Atividade dialog
    atividadeDialogOpen, setAtividadeDialogOpen,
    currentEtapaTempId,
    editingAtividade,
    atividadeForm, setAtividadeForm,
    horasText, handleHorasTextChange, handleHorasTextBlur,
    openNewAtividade, openEditAtividade, saveAtividade, removeAtividade,

    // Atividade drag & drop
    handleAtivDragStart, handleAtivDragEnter, handleAtividadeDragEnd,

    // Checklist
    addChecklistItem, updateChecklistText, updateChecklistTipo, updateChecklistMesaId, updateChecklistEtapaExecucaoId, removeChecklistItem, moveChecklistItem,

    // Expand/collapse
    toggleExpanded,

    // Import
    importDialogOpen, setImportDialogOpen,
    clonableEtapas,
    openImportDialog, importEtapa,
  };
}
