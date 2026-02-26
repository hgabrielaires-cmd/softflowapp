import { useState, useEffect, useRef } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { AppLayout } from "@/components/AppLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { toast } from "sonner";
import { Plus, Pencil, Trash2, Search, ChevronDown, ChevronRight, Eye, GripVertical, Download, Calendar, Paperclip, Hash, ToggleLeft, Type, CheckSquare } from "lucide-react";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import type { Jornada, JornadaEtapa, JornadaAtividade, MesaAtendimento, ChecklistItem, ChecklistItemTipo, Filial } from "@/lib/supabase-types";
import { CHECKLIST_TIPO_LABELS } from "@/lib/supabase-types";

// ─── Local state types for creation ──────────────────────────────────────────

interface LocalAtividade {
  tempId: string;
  id?: string;
  nome: string;
  descricao: string;
  horas_estimadas: number;
  checklist: ChecklistItem[];
  tipo_responsabilidade: string;
  ordem: number;
}

interface LocalEtapa {
  tempId: string;
  id?: string;
  nome: string;
  descricao: string;
  mesa_atendimento_id: string;
  permite_clonar: boolean;
  ordem: number;
  atividades: LocalAtividade[];
}

const emptyForm = {
  nome: "",
  descricao: "",
  filial_id: "",
  vinculo_tipo: "",
  vinculo_id: "",
};

export default function JornadaImplantacao() {
  const queryClient = useQueryClient();
  const [search, setSearch] = useState("");
  const [filterVinculo, setFilterVinculo] = useState("todos");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<Jornada | null>(null);
  const [form, setForm] = useState(emptyForm);
  const [etapas, setEtapas] = useState<LocalEtapa[]>([]);
  const [etapaDialogOpen, setEtapaDialogOpen] = useState(false);
  const [editingEtapa, setEditingEtapa] = useState<LocalEtapa | null>(null);
  const [etapaForm, setEtapaForm] = useState({ nome: "", descricao: "", mesa_atendimento_id: "", permite_clonar: false });
  const [importDialogOpen, setImportDialogOpen] = useState(false);
  const [clonableEtapas, setClonableEtapas] = useState<any[]>([]);
  const [atividadeDialogOpen, setAtividadeDialogOpen] = useState(false);
  const [currentEtapaTempId, setCurrentEtapaTempId] = useState("");
  const [editingAtividade, setEditingAtividade] = useState<LocalAtividade | null>(null);
  const [atividadeForm, setAtividadeForm] = useState({ nome: "", descricao: "", horas_estimadas: 0, checklist: [] as ChecklistItem[], tipo_responsabilidade: "Interna" });
  const [horasText, setHorasText] = useState("0:00");
  const [expandedEtapas, setExpandedEtapas] = useState<Set<string>>(new Set());
  const dragEtapaItem = useRef<number | null>(null);
  const dragEtapaOverItem = useRef<number | null>(null);
  const dragAtivItem = useRef<{ etapaTempId: string; index: number } | null>(null);
  const dragAtivOverItem = useRef<{ etapaTempId: string; index: number } | null>(null);
  // ─── Queries ────────────────────────────────────────────────────────────────

  const { data: jornadas = [], isLoading } = useQuery({
    queryKey: ["jornadas"],
    queryFn: async () => {
      const { data, error } = await supabase.from("jornadas").select("*, filiais(nome)").order("nome");
      if (error) throw error;
      return data.map((j: any) => ({ ...j, filial: j.filiais ? { nome: j.filiais.nome } : null })) as Jornada[];
    },
  });

  const { data: filiais = [] } = useQuery({
    queryKey: ["filiais"],
    queryFn: async () => {
      const { data } = await supabase.from("filiais").select("*").eq("ativa", true).order("nome");
      return (data || []) as Filial[];
    },
  });

  const { data: planos = [] } = useQuery({
    queryKey: ["planos_ativos"],
    queryFn: async () => {
      const { data } = await supabase.from("planos").select("id, nome, descricao").eq("ativo", true).order("nome");
      return data || [];
    },
  });

  const { data: modulos = [] } = useQuery({
    queryKey: ["modulos_ativos"],
    queryFn: async () => {
      const { data } = await supabase.from("modulos").select("id, nome").eq("ativo", true).order("nome");
      return data || [];
    },
  });

  const { data: servicos = [] } = useQuery({
    queryKey: ["servicos_ativos"],
    queryFn: async () => {
      const { data } = await supabase.from("servicos").select("id, nome, descricao").eq("ativo", true).order("nome");
      return data || [];
    },
  });

  const { data: mesas = [] } = useQuery({
    queryKey: ["mesas_atendimento"],
    queryFn: async () => {
      const { data } = await supabase.from("mesas_atendimento").select("*").eq("ativo", true).order("nome");
      return (data || []) as MesaAtendimento[];
    },
  });

  const { data: painelEtapas = [] } = useQuery({
    queryKey: ["painel_etapas_for_jornada"],
    queryFn: async () => {
      const { data } = await supabase.from("painel_etapas").select("id, nome").eq("ativo", true).order("ordem");
      return data || [];
    },
  });

  // ─── Auto-fill description ─────────────────────────────────────────────────

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

  // ─── Get vinculo items based on type ───────────────────────────────────────

  function getVinculoItems() {
    if (form.vinculo_tipo === "plano") return planos.map((p) => ({ id: p.id, nome: p.nome }));
    if (form.vinculo_tipo === "modulo") return modulos.map((m) => ({ id: m.id, nome: m.nome }));
    if (form.vinculo_tipo === "servico") return servicos.map((s) => ({ id: s.id, nome: s.nome }));
    return [];
  }

  function getVinculoLabel(tipo: string, id: string) {
    if (tipo === "plano") return planos.find((p) => p.id === id)?.nome || id;
    if (tipo === "modulo") return modulos.find((m) => m.id === id)?.nome || id;
    if (tipo === "servico") return servicos.find((s) => s.id === id)?.nome || id;
    return id;
  }

  // ─── Save jornada ──────────────────────────────────────────────────────────

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
        // Delete old etapas (cascade deletes atividades)
        await supabase.from("jornada_etapas").delete().eq("jornada_id", jornadaId);
      } else {
        const { data, error } = await supabase.from("jornadas").insert(payload).select("id").single();
        if (error) throw error;
        jornadaId = data.id;
      }

      // Insert etapas and atividades
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
            ordem: a.ordem,
          }));
          const { error: atErr } = await supabase.from("jornada_atividades").insert(atividades);
          if (atErr) throw atErr;
        }
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["jornadas"] });
      toast.success(editing ? "Jornada atualizada!" : "Jornada criada!");
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

  // ─── Open/Close dialogs ────────────────────────────────────────────────────

  function openNew() {
    setEditing(null);
    setForm({ ...emptyForm });
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

    // Load etapas and atividades
    const { data: etapasData } = await supabase.from("jornada_etapas").select("*").eq("jornada_id", jornada.id).order("ordem");
    const localEtapas: LocalEtapa[] = [];
    for (const e of etapasData || []) {
      const { data: ativData } = await supabase.from("jornada_atividades").select("*").eq("etapa_id", e.id).order("ordem");
      localEtapas.push({
        tempId: crypto.randomUUID(),
        id: e.id,
        nome: e.nome,
        descricao: e.descricao || "",
        mesa_atendimento_id: e.mesa_atendimento_id || "",
        permite_clonar: (e as any).permite_clonar || false,
        ordem: e.ordem,
        atividades: (ativData || []).map((a: any) => ({
          tempId: crypto.randomUUID(),
          id: a.id,
          nome: a.nome,
          descricao: a.descricao || "",
          horas_estimadas: a.horas_estimadas,
          checklist: Array.isArray(a.checklist) ? a.checklist : [],
          tipo_responsabilidade: a.tipo_responsabilidade,
          ordem: a.ordem,
        })),
      });
    }
    setEtapas(localEtapas);
    setDialogOpen(true);
  }

  function closeDialog() {
    setDialogOpen(false);
    setEditing(null);
    setForm({ ...emptyForm });
    setEtapas([]);
  }

  // ─── Etapa CRUD ────────────────────────────────────────────────────────────

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

  // ─── Atividade CRUD ────────────────────────────────────────────────────────

  function openNewAtividade(etapaTempId: string) {
    setCurrentEtapaTempId(etapaTempId);
    setEditingAtividade(null);
    setAtividadeForm({ nome: "", descricao: "", horas_estimadas: 0, checklist: [], tipo_responsabilidade: "Interna" });
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
    });
    const h = Math.floor(atividade.horas_estimadas);
    const m = Math.round((atividade.horas_estimadas - h) * 60);
    setHorasText(`${h}:${m.toString().padStart(2, "0")}`);
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

  // ─── Checklist helpers ─────────────────────────────────────────────────────

  function addChecklistItem() {
    setAtividadeForm((prev) => ({ ...prev, checklist: [...prev.checklist, { texto: "", concluido: false, tipo: "check" as ChecklistItemTipo }] }));
  }

  function updateChecklistText(index: number, texto: string) {
    setAtividadeForm((prev) => ({ ...prev, checklist: prev.checklist.map((c, i) => i === index ? { ...c, texto } : c) }));
  }

  function updateChecklistTipo(index: number, tipo: ChecklistItemTipo) {
    setAtividadeForm((prev) => ({ ...prev, checklist: prev.checklist.map((c, i) => i === index ? { ...c, tipo } : c) }));
  }

  function removeChecklistItem(index: number) {
    setAtividadeForm((prev) => ({ ...prev, checklist: prev.checklist.filter((_, i) => i !== index) }));
  }

  // ─── Toggle expanded etapa ─────────────────────────────────────────────────

  function toggleExpanded(tempId: string) {
    setExpandedEtapas((prev) => {
      const next = new Set(prev);
      if (next.has(tempId)) next.delete(tempId); else next.add(tempId);
      return next;
    });
  }

  // ─── Import clonable etapas ────────────────────────────────────────────────

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



  const filtered = jornadas.filter((j) => {
    if (search && !j.nome.toLowerCase().includes(search.toLowerCase())) return false;
    if (filterVinculo !== "todos" && j.vinculo_tipo !== filterVinculo) return false;
    return true;
  });

  const canSave = form.nome.trim() && form.vinculo_tipo && form.vinculo_id;

  return (
    <AppLayout>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-bold text-foreground">Jornadas de Implantação</h1>
          <Button onClick={openNew}><Plus className="h-4 w-4 mr-2" />Nova Jornada</Button>
        </div>

        <div className="flex gap-3 items-center flex-wrap">
          <div className="relative max-w-sm">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input placeholder="Buscar por nome..." value={search} onChange={(e) => setSearch(e.target.value)} className="pl-9" />
          </div>
          <Select value={filterVinculo} onValueChange={setFilterVinculo}>
            <SelectTrigger className="w-48"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="todos">Todos os vínculos</SelectItem>
              <SelectItem value="plano">Plano</SelectItem>
              <SelectItem value="modulo">Módulo Adicional</SelectItem>
              <SelectItem value="servico">Serviço</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div className="border rounded-lg">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Nome</TableHead>
                <TableHead>Vínculo</TableHead>
                <TableHead>Filial</TableHead>
                <TableHead className="w-24 text-center">Ativo</TableHead>
                <TableHead className="w-24 text-center">Ações</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                <TableRow><TableCell colSpan={5} className="text-center py-8 text-muted-foreground">Carregando...</TableCell></TableRow>
              ) : filtered.length === 0 ? (
                <TableRow><TableCell colSpan={5} className="text-center py-8 text-muted-foreground">Nenhuma jornada encontrada.</TableCell></TableRow>
              ) : (
                filtered.map((j) => (
                  <TableRow key={j.id}>
                    <TableCell className="font-medium">{j.nome}</TableCell>
                    <TableCell>
                      <Badge variant="outline" className="capitalize">{j.vinculo_tipo}</Badge>
                      <span className="ml-2 text-sm text-muted-foreground">{getVinculoLabel(j.vinculo_tipo, j.vinculo_id)}</span>
                    </TableCell>
                    <TableCell>{j.filial?.nome || <span className="text-muted-foreground">Global</span>}</TableCell>
                    <TableCell className="text-center">
                      <Switch checked={j.ativo} onCheckedChange={(v) => toggleMutation.mutate({ id: j.id, ativo: v })} />
                    </TableCell>
                    <TableCell className="text-center">
                      <div className="flex items-center justify-center gap-1">
                        <Button variant="ghost" size="icon" onClick={() => openEdit(j)}><Pencil className="h-4 w-4" /></Button>
                        <Button variant="ghost" size="icon" onClick={() => deleteMutation.mutate(j.id)}><Trash2 className="h-4 w-4 text-destructive" /></Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>
      </div>

      {/* ─── Main Dialog ──────────────────────────────────────────────────────── */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editing ? "Editar Jornada" : "Nova Jornada de Implantação"}</DialogTitle>
          </DialogHeader>

          <Tabs defaultValue="dados">
            <TabsList className="w-full">
              <TabsTrigger value="dados" className="flex-1">Dados da Jornada</TabsTrigger>
              <TabsTrigger value="etapas" className="flex-1">Etapas e Atividades</TabsTrigger>
            </TabsList>

            <TabsContent value="dados" className="space-y-4 mt-4">
              {(() => {
                const totalMin = etapas.reduce((sum, e) => sum + e.atividades.reduce((s, a) => s + a.horas_estimadas * 60, 0), 0);
                if (totalMin <= 0) return null;
                const h = Math.floor(totalMin / 60);
                const m = Math.round(totalMin % 60);
                return (
                  <div className="rounded-lg border border-primary/30 bg-primary/5 p-4 flex items-center gap-3">
                    <div className="rounded-full bg-primary/10 p-2">
                      <Eye className="h-5 w-5 text-primary" />
                    </div>
                    <div>
                      <p className="text-xs text-muted-foreground">Total de horas estimadas (todas as etapas)</p>
                      <p className="text-xl font-bold text-primary">{h}:{m.toString().padStart(2, "0")}h</p>
                    </div>
                  </div>
                );
              })()}

              <div>
                <label className="text-sm font-medium">Filial</label>
                <Select value={form.filial_id || "global"} onValueChange={(v) => setForm((p) => ({ ...p, filial_id: v === "global" ? "" : v }))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="global">Global (todas as filiais)</SelectItem>
                    {filiais.map((f) => <SelectItem key={f.id} value={f.id}>{f.nome}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>

              <div>
                <label className="text-sm font-medium">Nome da Jornada *</label>
                <Input value={form.nome} onChange={(e) => setForm((p) => ({ ...p, nome: e.target.value }))} placeholder="Ex: Implantação e Treinamento Plano Essencial" />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-sm font-medium">Tipo de Vínculo *</label>
                  <Select value={form.vinculo_tipo} onValueChange={(v) => setForm((p) => ({ ...p, vinculo_tipo: v, vinculo_id: "", descricao: "" }))}>
                    <SelectTrigger><SelectValue placeholder="Selecione..." /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="plano">Plano</SelectItem>
                      <SelectItem value="modulo">Módulo Adicional</SelectItem>
                      <SelectItem value="servico">Serviço</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <label className="text-sm font-medium">Vínculo *</label>
                  <Select value={form.vinculo_id} onValueChange={(v) => setForm((p) => ({ ...p, vinculo_id: v }))} disabled={!form.vinculo_tipo}>
                    <SelectTrigger><SelectValue placeholder="Selecione..." /></SelectTrigger>
                    <SelectContent>
                      {getVinculoItems().map((item) => <SelectItem key={item.id} value={item.id}>{item.nome}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div>
                <label className="text-sm font-medium">Descrição</label>
                <Textarea value={form.descricao} onChange={(e) => setForm((p) => ({ ...p, descricao: e.target.value }))} placeholder="Descrição preenchida automaticamente do vínculo..." rows={4} />
              </div>
            </TabsContent>

            <TabsContent value="etapas" className="space-y-4 mt-4">
              <div className="flex justify-between items-center">
                <h3 className="text-sm font-semibold">Etapas</h3>
                <div className="flex gap-2">
                  <Button size="sm" variant="outline" onClick={openImportDialog}><Download className="h-4 w-4 mr-1" />Importar Etapa</Button>
                  <Button size="sm" onClick={openNewEtapa}><Plus className="h-4 w-4 mr-1" />Adicionar Etapa</Button>
                </div>
              </div>

              {etapas.length === 0 ? (
                <p className="text-sm text-muted-foreground text-center py-8">Nenhuma etapa cadastrada. Clique em "Adicionar Etapa" para começar.</p>
              ) : (
                <div className="space-y-3">
                  {etapas.map((etapa, idx) => {
                    const isExpanded = expandedEtapas.has(etapa.tempId);
                    const mesaNome = mesas.find((m) => m.id === etapa.mesa_atendimento_id)?.nome;
                    const totalHoras = etapa.atividades.reduce((sum, a) => sum + a.horas_estimadas, 0);
                    const totalH = Math.floor(totalHoras);
                    const totalM = Math.round((totalHoras - totalH) * 60);
                    return (
                      <div
                        key={etapa.tempId}
                        className="border rounded-lg"
                        draggable
                        onDragStart={() => { dragEtapaItem.current = idx; }}
                        onDragEnter={() => { dragEtapaOverItem.current = idx; }}
                        onDragOver={(e) => e.preventDefault()}
                        onDragEnd={handleEtapaDragEnd}
                      >
                        <div className="flex items-center justify-between p-3 hover:bg-muted/50">
                          <div className="flex items-center gap-2 cursor-pointer flex-1" onClick={() => toggleExpanded(etapa.tempId)}>
                            <GripVertical className="h-4 w-4 text-muted-foreground cursor-grab flex-shrink-0" />
                            {isExpanded ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
                            <span className="font-medium text-sm">{idx + 1}. {etapa.nome}</span>
                            {mesaNome && <Badge variant="secondary" className="text-xs">{mesaNome}</Badge>}
                            <span className="text-xs text-muted-foreground">({etapa.atividades.length} atividades)</span>
                            {etapa.atividades.length > 0 && <Badge variant="outline" className="text-xs font-mono">{totalH}:{totalM.toString().padStart(2, "0")}h</Badge>}
                          </div>
                          <div className="flex gap-1" onClick={(e) => e.stopPropagation()}>
                            <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => openEditEtapa(etapa)}><Pencil className="h-3.5 w-3.5" /></Button>
                            <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => removeEtapa(etapa.tempId)}><Trash2 className="h-3.5 w-3.5 text-destructive" /></Button>
                          </div>
                        </div>

                        {isExpanded && (
                          <div className="px-3 pb-3 border-t space-y-2">
                            {etapa.descricao && <p className="text-xs text-muted-foreground mt-2">{etapa.descricao}</p>}
                            <div className="flex justify-between items-center mt-2">
                              <span className="text-xs font-medium">Atividades</span>
                              <Button size="sm" variant="outline" className="h-7 text-xs" onClick={() => openNewAtividade(etapa.tempId)}>
                                <Plus className="h-3 w-3 mr-1" />Adicionar Atividade
                              </Button>
                            </div>
                            {etapa.atividades.length === 0 ? (
                              <p className="text-xs text-muted-foreground text-center py-4">Nenhuma atividade.</p>
                            ) : (
                              <div className="space-y-1.5">
                                {etapa.atividades.map((a, aIdx) => (
                                  <div
                                    key={a.tempId}
                                    className="flex items-start justify-between bg-muted/30 rounded-md p-2 cursor-grab active:cursor-grabbing"
                                    draggable
                                    onDragStart={(e) => { e.stopPropagation(); dragAtivItem.current = { etapaTempId: etapa.tempId, index: aIdx }; }}
                                    onDragEnter={(e) => { e.stopPropagation(); dragAtivOverItem.current = { etapaTempId: etapa.tempId, index: aIdx }; }}
                                    onDragOver={(e) => { e.preventDefault(); e.stopPropagation(); }}
                                    onDragEnd={(e) => { e.stopPropagation(); handleAtividadeDragEnd(etapa.tempId); }}
                                  >
                                    <div className="flex items-start gap-2">
                                      <GripVertical className="h-4 w-4 text-muted-foreground mt-0.5 flex-shrink-0" />
                                      <div className="space-y-0.5">
                                        <p className="text-sm font-medium">{a.nome}</p>
                                      <div className="flex gap-2 text-xs text-muted-foreground">
                                        <span>{Math.floor(a.horas_estimadas)}:{(Math.round((a.horas_estimadas - Math.floor(a.horas_estimadas)) * 60)).toString().padStart(2, "0")}h estimadas</span>
                                        <span>•</span>
                                        <span>{a.tipo_responsabilidade}</span>
                                        {a.checklist.length > 0 && <><span>•</span><span>{a.checklist.length} itens checklist</span></>}
                                      </div>
                                    </div>
                                    </div>
                                    <div className="flex gap-1">
                                      {a.checklist.length > 0 && (
                                        <Popover>
                                          <PopoverTrigger asChild>
                                            <Button variant="ghost" size="icon" className="h-6 w-6"><Eye className="h-3 w-3" /></Button>
                                          </PopoverTrigger>
                                          <PopoverContent className="w-64 p-3" side="left">
                                            <p className="text-xs font-semibold mb-2">Checklist ({a.checklist.length} itens)</p>
                                            <ul className="space-y-1">
                                              {a.checklist.map((item, idx) => (
                                                <li key={idx} className="flex items-start gap-2 text-xs">
                                                  <Badge variant="outline" className="text-[10px] px-1 py-0 shrink-0">{CHECKLIST_TIPO_LABELS[(item as ChecklistItem).tipo || 'check']}</Badge>
                                                  <span>{item.texto || "(sem texto)"}</span>
                                                </li>
                                              ))}
                                            </ul>
                                          </PopoverContent>
                                        </Popover>
                                      )}
                                      <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => openEditAtividade(etapa.tempId, a)}><Pencil className="h-3 w-3" /></Button>
                                      <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => removeAtividade(etapa.tempId, a.tempId)}><Trash2 className="h-3 w-3 text-destructive" /></Button>
                                    </div>
                                  </div>
                                ))}
                              </div>
                            )}
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </TabsContent>
          </Tabs>

          <DialogFooter>
            <Button variant="outline" onClick={closeDialog}>Cancelar</Button>
            <Button onClick={() => saveMutation.mutate()} disabled={!canSave || saveMutation.isPending}>
              {saveMutation.isPending ? "Salvando..." : "Salvar"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ─── Etapa Dialog ─────────────────────────────────────────────────────── */}
      <Dialog open={etapaDialogOpen} onOpenChange={setEtapaDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editingEtapa ? "Editar Etapa" : "Adicionar Etapa"}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <label className="text-sm font-medium">Nome da Etapa *</label>
              <Select value={etapaForm.nome || "placeholder"} onValueChange={(v) => setEtapaForm((p) => ({ ...p, nome: v === "placeholder" ? "" : v }))}>
                <SelectTrigger><SelectValue placeholder="Selecione a etapa..." /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="placeholder" disabled>Selecione a etapa...</SelectItem>
                  {painelEtapas.map((e) => <SelectItem key={e.id} value={e.nome}>{e.nome}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div>
              <label className="text-sm font-medium">Descrição</label>
              <Textarea value={etapaForm.descricao} onChange={(e) => setEtapaForm((p) => ({ ...p, descricao: e.target.value }))} placeholder="Ex: Nessa etapa certifique-se que está tudo dentro do padrão." />
            </div>
            <div>
              <label className="text-sm font-medium">Mesa de Atendimento</label>
              <Select value={etapaForm.mesa_atendimento_id || "none"} onValueChange={(v) => setEtapaForm((p) => ({ ...p, mesa_atendimento_id: v === "none" ? "" : v }))}>
                <SelectTrigger><SelectValue placeholder="Selecione..." /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">Nenhuma</SelectItem>
                  {mesas.map((m) => <SelectItem key={m.id} value={m.id}>{m.nome}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="flex items-center justify-between">
              <label className="text-sm font-medium">Permite Clonar</label>
              <Switch checked={etapaForm.permite_clonar} onCheckedChange={(v) => setEtapaForm((p) => ({ ...p, permite_clonar: v }))} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEtapaDialogOpen(false)}>Cancelar</Button>
            <Button onClick={saveEtapa} disabled={!etapaForm.nome.trim()}>Salvar</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ─── Atividade Dialog ─────────────────────────────────────────────────── */}
      <Dialog open={atividadeDialogOpen} onOpenChange={setAtividadeDialogOpen}>
        <DialogContent className="max-w-lg max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editingAtividade ? "Editar Atividade" : "Adicionar Atividade"}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <label className="text-sm font-medium">Nome da Atividade *</label>
              <Input value={atividadeForm.nome} onChange={(e) => setAtividadeForm((p) => ({ ...p, nome: e.target.value }))} />
            </div>
            <div>
              <label className="text-sm font-medium">Horas Estimadas (hh:mm)</label>
              <Input
                placeholder="0:00"
                className="mt-1 w-32 font-mono text-base"
                value={horasText}
                onChange={(e) => {
                  const val = e.target.value.replace(/[^0-9:]/g, "");
                  setHorasText(val);
                }}
                onBlur={() => {
                  const parts = horasText.split(":");
                  const hours = parseInt(parts[0] || "0", 10) || 0;
                  const mins = Math.min(59, parseInt(parts[1] || "0", 10) || 0);
                  const decimal = hours + mins / 60;
                  setAtividadeForm((p) => ({ ...p, horas_estimadas: Math.round(decimal * 100) / 100 }));
                  setHorasText(`${hours}:${mins.toString().padStart(2, "0")}`);
                }}
              />
              <p className="text-xs text-muted-foreground mt-1">Ex: 0:15 = 15min, 1:30 = 1h30min</p>
            </div>
            <div>
              <label className="text-sm font-medium">Descrição</label>
              <Textarea value={atividadeForm.descricao} onChange={(e) => setAtividadeForm((p) => ({ ...p, descricao: e.target.value }))} />
            </div>
            <div>
              <label className="text-sm font-medium">Tipo de Responsabilidade</label>
              <Select value={atividadeForm.tipo_responsabilidade} onValueChange={(v) => setAtividadeForm((p) => ({ ...p, tipo_responsabilidade: v }))}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="Interna">Interna</SelectItem>
                  <SelectItem value="Externa">Externa</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <div className="flex items-center justify-between mb-2">
                <label className="text-sm font-medium">Checklist</label>
                <Button size="sm" variant="outline" className="h-7 text-xs" onClick={addChecklistItem}><Plus className="h-3 w-3 mr-1" />Adicionar Item</Button>
              </div>
              {atividadeForm.checklist.length === 0 ? (
                <p className="text-xs text-muted-foreground text-center py-3">Nenhum item no checklist.</p>
              ) : (
                <div className="space-y-2">
                  {atividadeForm.checklist.map((item, idx) => (
                    <div key={idx} className="flex items-center gap-2">
                      <Select value={item.tipo || "check"} onValueChange={(v) => updateChecklistTipo(idx, v as ChecklistItemTipo)}>
                        <SelectTrigger className="w-[140px] h-8 text-xs">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {Object.entries(CHECKLIST_TIPO_LABELS).map(([key, label]) => (
                            <SelectItem key={key} value={key}>{label}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <Input value={item.texto} onChange={(e) => updateChecklistText(idx, e.target.value)} placeholder="Descrição do item..." className="flex-1 h-8 text-sm" />
                      <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => removeChecklistItem(idx)}><Trash2 className="h-3 w-3 text-destructive" /></Button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setAtividadeDialogOpen(false)}>Cancelar</Button>
            <Button onClick={saveAtividade} disabled={!atividadeForm.nome.trim()}>Salvar</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ─── Import Etapa Dialog ──────────────────────────────────────────────── */}
      <Dialog open={importDialogOpen} onOpenChange={setImportDialogOpen}>
        <DialogContent className="max-w-lg max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Importar Etapa</DialogTitle>
          </DialogHeader>
          {clonableEtapas.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-8">Nenhuma etapa com permissão de clonagem encontrada.</p>
          ) : (
            <div className="space-y-2">
              <p className="text-sm text-muted-foreground">Selecione a etapa que deseja importar:</p>
              {clonableEtapas.map((etapa) => (
                <div key={etapa.id} className="border rounded-lg p-3 hover:bg-muted/50 cursor-pointer" onClick={() => importEtapa(etapa)}>
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="font-medium text-sm">{etapa.nome}</p>
                      {etapa.descricao && <p className="text-xs text-muted-foreground mt-0.5">{etapa.descricao}</p>}
                      <div className="flex gap-2 mt-1">
                        <Badge variant="outline" className="text-xs">{etapa.jornada_atividades?.length || 0} atividades</Badge>
                        {etapa.jornadas && <Badge variant="secondary" className="text-xs">Jornada: {etapa.jornadas.nome}</Badge>}
                      </div>
                    </div>
                    <Download className="h-4 w-4 text-muted-foreground" />
                  </div>
                </div>
              ))}
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setImportDialogOpen(false)}>Fechar</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </AppLayout>
  );
}
