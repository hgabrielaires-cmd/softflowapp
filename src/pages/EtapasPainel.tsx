import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { AppLayout } from "@/components/AppLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Switch } from "@/components/ui/switch";
import { toast } from "sonner";
import { Plus, Pencil, Trash2, Search, ArrowUp, ArrowDown } from "lucide-react";

interface PainelEtapa {
  id: string;
  nome: string;
  ordem: number;
  cor: string | null;
  ativo: boolean;
  created_at: string;
  updated_at: string;
}

export default function EtapasPainel() {
  const queryClient = useQueryClient();
  const [search, setSearch] = useState("");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<PainelEtapa | null>(null);
  const [form, setForm] = useState({ nome: "", cor: "#3b82f6" });

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
      if (editing) {
        const { error } = await supabase.from("painel_etapas").update({ nome: form.nome, cor: form.cor || null }).eq("id", editing.id);
        if (error) throw error;
      } else {
        const maxOrdem = etapas.length > 0 ? Math.max(...etapas.map(e => e.ordem)) + 1 : 1;
        const { error } = await supabase.from("painel_etapas").insert({ nome: form.nome, cor: form.cor || null, ordem: maxOrdem });
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

  const reorderMutation = useMutation({
    mutationFn: async ({ id, novaOrdem }: { id: string; novaOrdem: number }) => {
      const { error } = await supabase.from("painel_etapas").update({ ordem: novaOrdem }).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["painel_etapas"] }),
  });

  function moveUp(index: number) {
    if (index <= 0) return;
    const current = etapas[index];
    const above = etapas[index - 1];
    reorderMutation.mutate({ id: current.id, novaOrdem: above.ordem });
    reorderMutation.mutate({ id: above.id, novaOrdem: current.ordem });
  }

  function moveDown(index: number) {
    if (index >= etapas.length - 1) return;
    const current = etapas[index];
    const below = etapas[index + 1];
    reorderMutation.mutate({ id: current.id, novaOrdem: below.ordem });
    reorderMutation.mutate({ id: below.id, novaOrdem: current.ordem });
  }

  function openNew() {
    setEditing(null);
    setForm({ nome: "", cor: "#3b82f6" });
    setDialogOpen(true);
  }

  function openEdit(etapa: PainelEtapa) {
    setEditing(etapa);
    setForm({ nome: etapa.nome, cor: etapa.cor || "#3b82f6" });
    setDialogOpen(true);
  }

  function closeDialog() {
    setDialogOpen(false);
    setEditing(null);
    setForm({ nome: "", cor: "#3b82f6" });
  }

  const filtered = etapas.filter((e) => e.nome.toLowerCase().includes(search.toLowerCase()));

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
                  <TableRow key={etapa.id}>
                    <TableCell className="text-center">
                      <div className="flex items-center justify-center gap-1">
                        <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => moveUp(idx)} disabled={idx === 0}>
                          <ArrowUp className="h-3 w-3" />
                        </Button>
                        <span className="text-sm font-medium">{etapa.ordem}</span>
                        <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => moveDown(idx)} disabled={idx === filtered.length - 1}>
                          <ArrowDown className="h-3 w-3" />
                        </Button>
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
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={closeDialog}>Cancelar</Button>
            <Button onClick={() => saveMutation.mutate()} disabled={!form.nome.trim() || saveMutation.isPending}>
              {saveMutation.isPending ? "Salvando..." : "Salvar"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </AppLayout>
  );
}
