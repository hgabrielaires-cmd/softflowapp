import { useState, useRef } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { AppLayout } from "@/components/AppLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Switch } from "@/components/ui/switch";
import { toast } from "sonner";
import { Plus, Pencil, Trash2, Search, GripVertical } from "lucide-react";

interface PainelEtapa {
  id: string;
  nome: string;
  ordem: number;
  cor: string | null;
  ativo: boolean;
  controla_sla: boolean;
  prazo_maximo_horas: number | null;
  alerta_whatsapp: boolean;
  alerta_notificacoes: boolean;
  created_at: string;
  updated_at: string;
}

const defaultForm = { nome: "", cor: "#3b82f6", controla_sla: false, prazo_maximo_horas: "", alerta_whatsapp: false, alerta_notificacoes: false };

export default function EtapasPainel() {
  const queryClient = useQueryClient();
  const [search, setSearch] = useState("");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<PainelEtapa | null>(null);
  const [form, setForm] = useState({ nome: "", cor: "#3b82f6", controla_sla: false, prazo_maximo_horas: "", alerta_whatsapp: false, alerta_notificacoes: false });
  const dragItem = useRef<number | null>(null);
  const dragOverItem = useRef<number | null>(null);

  const { data: etapas = [], isLoading } = useQuery({
    queryKey: ["painel_etapas"],
    queryFn: async () => {
      const { data, error } = await supabase.from("painel_etapas").select("*").order("ordem");
      if (error) throw error;
      return data as PainelEtapa[];
    },
  });

  const saveMutation = useMutation({
    mutationFn: async () => {
      const payload = {
        nome: form.nome,
        cor: form.cor || null,
        controla_sla: form.controla_sla,
        prazo_maximo_horas: form.controla_sla && form.prazo_maximo_horas ? Number(form.prazo_maximo_horas) : null,
        alerta_whatsapp: form.alerta_whatsapp,
        alerta_notificacoes: form.alerta_notificacoes,
      };
      if (editing) {
        const { error } = await supabase.from("painel_etapas").update(payload).eq("id", editing.id);
        if (error) throw error;
      } else {
        const maxOrdem = etapas.length > 0 ? Math.max(...etapas.map(e => e.ordem)) + 1 : 1;
        const { error } = await supabase.from("painel_etapas").insert({ ...payload, ordem: maxOrdem });
        if (error) throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["painel_etapas"] });
      toast.success(editing ? "Etapa atualizada!" : "Etapa criada!");
      closeDialog();
    },
    onError: () => toast.error("Erro ao salvar etapa."),
  });

  const toggleMutation = useMutation({
    mutationFn: async ({ id, ativo }: { id: string; ativo: boolean }) => {
      const { error } = await supabase.from("painel_etapas").update({ ativo }).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["painel_etapas"] }),
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("painel_etapas").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["painel_etapas"] });
      toast.success("Etapa excluída!");
    },
    onError: () => toast.error("Erro ao excluir etapa. Pode estar vinculada a atendimentos."),
  });

  async function handleDragEnd() {
    if (dragItem.current === null || dragOverItem.current === null || dragItem.current === dragOverItem.current) {
      dragItem.current = null;
      dragOverItem.current = null;
      return;
    }

    const reordered = [...etapas];
    const [removed] = reordered.splice(dragItem.current, 1);
    reordered.splice(dragOverItem.current, 0, removed);

    // Update all orders in DB
    const updates = reordered.map((etapa, idx) => 
      supabase.from("painel_etapas").update({ ordem: idx + 1 }).eq("id", etapa.id)
    );

    dragItem.current = null;
    dragOverItem.current = null;

    try {
      await Promise.all(updates);
      queryClient.invalidateQueries({ queryKey: ["painel_etapas"] });
    } catch {
      toast.error("Erro ao reordenar etapas.");
    }
  }

  function openNew() {
    setEditing(null);
    setForm({ ...defaultForm });
    setDialogOpen(true);
  }

  function openEdit(etapa: PainelEtapa) {
    setEditing(etapa);
    setForm({
      nome: etapa.nome,
      cor: etapa.cor || "#3b82f6",
      controla_sla: etapa.controla_sla,
      prazo_maximo_horas: etapa.prazo_maximo_horas != null ? String(etapa.prazo_maximo_horas) : "",
      alerta_whatsapp: etapa.alerta_whatsapp,
      alerta_notificacoes: etapa.alerta_notificacoes,
    });
    setDialogOpen(true);
  }

  function closeDialog() {
    setDialogOpen(false);
    setEditing(null);
    setForm({ ...defaultForm });
  }

  const filtered = search
    ? etapas.filter((e) => e.nome.toLowerCase().includes(search.toLowerCase()))
    : etapas;

  const isDraggable = !search; // Disable drag when searching

  return (
    <AppLayout>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-bold text-foreground">Etapas do Painel</h1>
          <Button onClick={openNew}><Plus className="h-4 w-4 mr-2" />Nova Etapa</Button>
        </div>

        <div className="relative max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input placeholder="Buscar por nome..." value={search} onChange={(e) => setSearch(e.target.value)} className="pl-9" />
        </div>

        <div className="border rounded-lg">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-16 text-center">Ordem</TableHead>
                <TableHead>Nome</TableHead>
                <TableHead className="w-24 text-center">Cor</TableHead>
                <TableHead className="w-24 text-center">Ativo</TableHead>
                <TableHead className="w-32 text-center">Ações</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                <TableRow><TableCell colSpan={5} className="text-center py-8 text-muted-foreground">Carregando...</TableCell></TableRow>
              ) : filtered.length === 0 ? (
                <TableRow><TableCell colSpan={5} className="text-center py-8 text-muted-foreground">Nenhuma etapa encontrada.</TableCell></TableRow>
              ) : (
                filtered.map((etapa, idx) => (
                  <TableRow
                    key={etapa.id}
                    draggable={isDraggable}
                    onDragStart={() => { dragItem.current = idx; }}
                    onDragEnter={() => { dragOverItem.current = idx; }}
                    onDragOver={(e) => e.preventDefault()}
                    onDragEnd={handleDragEnd}
                    className={isDraggable ? "cursor-grab active:cursor-grabbing" : ""}
                  >
                    <TableCell className="text-center">
                      <div className="flex items-center justify-center gap-1">
                        {isDraggable && <GripVertical className="h-4 w-4 text-muted-foreground" />}
                        <span className="text-sm font-medium">{etapa.ordem}</span>
                      </div>
                    </TableCell>
                    <TableCell className="font-medium">{etapa.nome}</TableCell>
                    <TableCell className="text-center">
                      {etapa.cor ? (
                        <div className="inline-flex items-center gap-2">
                          <div className="w-5 h-5 rounded border" style={{ backgroundColor: etapa.cor }} />
                          <span className="text-xs text-muted-foreground">{etapa.cor}</span>
                        </div>
                      ) : "—"}
                    </TableCell>
                    <TableCell className="text-center">
                      <Switch checked={etapa.ativo} onCheckedChange={(v) => toggleMutation.mutate({ id: etapa.id, ativo: v })} />
                    </TableCell>
                    <TableCell className="text-center">
                      <div className="flex items-center justify-center gap-1">
                        <Button variant="ghost" size="icon" onClick={() => openEdit(etapa)}><Pencil className="h-4 w-4" /></Button>
                        <Button variant="ghost" size="icon" onClick={() => deleteMutation.mutate(etapa.id)}><Trash2 className="h-4 w-4 text-destructive" /></Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>
      </div>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editing ? "Editar Etapa" : "Nova Etapa"}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <label className="text-sm font-medium">Nome *</label>
              <Input value={form.nome} onChange={(e) => setForm((p) => ({ ...p, nome: e.target.value }))} placeholder="Ex: Onboard" />
            </div>
            <div>
              <label className="text-sm font-medium">Cor</label>
              <div className="flex items-center gap-3 mt-1">
                <input type="color" value={form.cor} onChange={(e) => setForm((p) => ({ ...p, cor: e.target.value }))} className="w-10 h-10 rounded cursor-pointer border" />
                <Input value={form.cor} onChange={(e) => setForm((p) => ({ ...p, cor: e.target.value }))} className="max-w-32" />
              </div>
            </div>
            <div className="flex items-center justify-between">
              <label className="text-sm font-medium">Controla SLA</label>
              <Switch checked={form.controla_sla} onCheckedChange={(v) => setForm((p) => ({ ...p, controla_sla: v, prazo_maximo_horas: v ? p.prazo_maximo_horas : "" }))} />
            </div>
            {form.controla_sla && (
              <div>
                <label className="text-sm font-medium">Prazo Máximo para Início (horas) *</label>
                <Input type="number" min="1" value={form.prazo_maximo_horas} onChange={(e) => setForm((p) => ({ ...p, prazo_maximo_horas: e.target.value }))} placeholder="Ex: 48" />
                <p className="text-xs text-muted-foreground mt-1">Se ultrapassado, o card aparecerá como "Tarefa Atrasada" no painel.</p>
              </div>
            )}
            <div className="flex items-center justify-between">
              <label className="text-sm font-medium">Alerta WhatsApp</label>
              <Switch checked={form.alerta_whatsapp} onCheckedChange={(v) => setForm((p) => ({ ...p, alerta_whatsapp: v }))} />
            </div>
            <div className="flex items-center justify-between">
              <label className="text-sm font-medium">Alerta Notificações</label>
              <Switch checked={form.alerta_notificacoes} onCheckedChange={(v) => setForm((p) => ({ ...p, alerta_notificacoes: v }))} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={closeDialog}>Cancelar</Button>
            <Button onClick={() => saveMutation.mutate()} disabled={!form.nome.trim() || (form.controla_sla && !form.prazo_maximo_horas) || saveMutation.isPending}>
              {saveMutation.isPending ? "Salvando..." : "Salvar"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </AppLayout>
  );
}
