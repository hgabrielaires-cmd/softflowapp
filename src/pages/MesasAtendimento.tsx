import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { AppLayout } from "@/components/AppLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Switch } from "@/components/ui/switch";
import { toast } from "sonner";
import { Plus, Pencil, Trash2, Search } from "lucide-react";
import type { MesaAtendimento } from "@/lib/supabase-types";

const PRESET_COLORS = [
  "#3b82f6", "#10b981", "#f59e0b", "#ef4444", "#8b5cf6",
  "#ec4899", "#06b6d4", "#84cc16", "#f97316", "#6366f1",
];

export default function MesasAtendimento() {
  const queryClient = useQueryClient();
  const [search, setSearch] = useState("");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<(MesaAtendimento & { cor?: string | null }) | null>(null);
  const [form, setForm] = useState({ nome: "", descricao: "", cor: "" });

  const { data: mesas = [], isLoading } = useQuery({
    queryKey: ["mesas_atendimento"],
    queryFn: async () => {
      const { data, error } = await supabase.from("mesas_atendimento").select("*").order("nome");
      if (error) throw error;
      return data as (MesaAtendimento & { cor?: string | null })[];
    },
  });

  const saveMutation = useMutation({
    mutationFn: async () => {
      const payload = { nome: form.nome, descricao: form.descricao || null, cor: form.cor || null };
      if (editing) {
        const { error } = await supabase.from("mesas_atendimento").update(payload).eq("id", editing.id);
        if (error) throw error;
      } else {
        const { error } = await supabase.from("mesas_atendimento").insert(payload);
        if (error) throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["mesas_atendimento"] });
      toast.success(editing ? "Mesa atualizada!" : "Mesa criada!");
      closeDialog();
    },
    onError: () => toast.error("Erro ao salvar mesa."),
  });

  const toggleMutation = useMutation({
    mutationFn: async ({ id, ativo }: { id: string; ativo: boolean }) => {
      const { error } = await supabase.from("mesas_atendimento").update({ ativo }).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["mesas_atendimento"] }),
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("mesas_atendimento").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["mesas_atendimento"] });
      toast.success("Mesa excluída!");
    },
    onError: () => toast.error("Erro ao excluir mesa."),
  });

  function openNew() {
    setEditing(null);
    setForm({ nome: "", descricao: "", cor: "" });
    setDialogOpen(true);
  }

  function openEdit(mesa: MesaAtendimento & { cor?: string | null }) {
    setEditing(mesa);
    setForm({ nome: mesa.nome, descricao: mesa.descricao || "", cor: mesa.cor || "" });
    setDialogOpen(true);
  }

  function closeDialog() {
    setDialogOpen(false);
    setEditing(null);
    setForm({ nome: "", descricao: "", cor: "" });
  }

  const filtered = mesas.filter((m) => m.nome.toLowerCase().includes(search.toLowerCase()));

  return (
    <AppLayout>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-bold text-foreground">Mesas de Atendimento</h1>
          <Button onClick={openNew}><Plus className="h-4 w-4 mr-2" />Nova Mesa</Button>
        </div>

        <div className="relative max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input placeholder="Buscar por nome..." value={search} onChange={(e) => setSearch(e.target.value)} className="pl-9" />
        </div>

        <div className="border rounded-lg">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-12">Cor</TableHead>
                <TableHead>Nome</TableHead>
                <TableHead>Descrição</TableHead>
                <TableHead className="w-24 text-center">Ativo</TableHead>
                <TableHead className="w-24 text-center">Ações</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                <TableRow><TableCell colSpan={5} className="text-center py-8 text-muted-foreground">Carregando...</TableCell></TableRow>
              ) : filtered.length === 0 ? (
                <TableRow><TableCell colSpan={5} className="text-center py-8 text-muted-foreground">Nenhuma mesa encontrada.</TableCell></TableRow>
              ) : (
                filtered.map((mesa) => (
                  <TableRow key={mesa.id}>
                    <TableCell>
                      {mesa.cor ? (
                        <div className="h-5 w-5 rounded-full border" style={{ backgroundColor: mesa.cor }} />
                      ) : (
                        <div className="h-5 w-5 rounded-full border border-dashed border-muted-foreground/30" />
                      )}
                    </TableCell>
                    <TableCell className="font-medium">{mesa.nome}</TableCell>
                    <TableCell className="text-muted-foreground">{mesa.descricao || "—"}</TableCell>
                    <TableCell className="text-center">
                      <Switch checked={mesa.ativo} onCheckedChange={(v) => toggleMutation.mutate({ id: mesa.id, ativo: v })} />
                    </TableCell>
                    <TableCell className="text-center">
                      <div className="flex items-center justify-center gap-1">
                        <Button variant="ghost" size="icon" onClick={() => openEdit(mesa)}><Pencil className="h-4 w-4" /></Button>
                        <Button variant="ghost" size="icon" onClick={() => deleteMutation.mutate(mesa.id)}><Trash2 className="h-4 w-4 text-destructive" /></Button>
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
            <DialogTitle>{editing ? "Editar Mesa" : "Nova Mesa de Atendimento"}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <label className="text-sm font-medium">Nome *</label>
              <Input value={form.nome} onChange={(e) => setForm((p) => ({ ...p, nome: e.target.value }))} placeholder="Ex: Suporte N1" />
            </div>
            <div>
              <label className="text-sm font-medium">Descrição</label>
              <Textarea value={form.descricao} onChange={(e) => setForm((p) => ({ ...p, descricao: e.target.value }))} placeholder="Descrição opcional..." />
            </div>
            <div>
              <label className="text-sm font-medium">Cor da Mesa</label>
              <div className="flex items-center gap-2 mt-1.5 flex-wrap">
                {PRESET_COLORS.map((c) => (
                  <button
                    key={c}
                    type="button"
                    className={`h-7 w-7 rounded-full border-2 transition-all ${form.cor === c ? 'border-foreground scale-110' : 'border-transparent'}`}
                    style={{ backgroundColor: c }}
                    onClick={() => setForm((p) => ({ ...p, cor: c }))}
                  />
                ))}
                {form.cor && (
                  <button
                    type="button"
                    className="text-xs text-muted-foreground underline ml-1"
                    onClick={() => setForm((p) => ({ ...p, cor: "" }))}
                  >
                    Limpar
                  </button>
                )}
              </div>
              <Input
                type="color"
                className="h-8 w-16 mt-2 p-0.5 cursor-pointer"
                value={form.cor || "#3b82f6"}
                onChange={(e) => setForm((p) => ({ ...p, cor: e.target.value }))}
              />
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
