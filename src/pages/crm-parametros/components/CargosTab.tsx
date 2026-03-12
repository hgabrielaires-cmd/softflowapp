import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { Plus, Trash2, Loader2 } from "lucide-react";
import { toast } from "sonner";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from "@/components/ui/dialog";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";

interface Cargo {
  id: string;
  nome: string;
  ativo: boolean;
  ordem: number;
}

export function CargosTab() {
  const queryClient = useQueryClient();
  const [showCreate, setShowCreate] = useState(false);
  const [newNome, setNewNome] = useState("");
  const [deleteId, setDeleteId] = useState<string | null>(null);

  const { data: cargos = [], isLoading } = useQuery({
    queryKey: ["crm_cargos"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("crm_cargos")
        .select("*")
        .order("ordem");
      if (error) throw error;
      return data as Cargo[];
    },
  });

  const invalidate = () => queryClient.invalidateQueries({ queryKey: ["crm_cargos"] });

  const createMut = useMutation({
    mutationFn: async (nome: string) => {
      const ordem = cargos.length > 0 ? Math.max(...cargos.map(c => c.ordem)) + 1 : 0;
      const { error } = await supabase.from("crm_cargos").insert({ nome, ordem });
      if (error) throw error;
    },
    onSuccess: () => { toast.success("Cargo criado!"); invalidate(); setShowCreate(false); setNewNome(""); },
    onError: () => toast.error("Erro ao criar cargo"),
  });

  const toggleMut = useMutation({
    mutationFn: async ({ id, ativo }: { id: string; ativo: boolean }) => {
      const { error } = await supabase.from("crm_cargos").update({ ativo }).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => invalidate(),
    onError: () => toast.error("Erro ao atualizar cargo"),
  });

  const deleteMut = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("crm_cargos").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => { toast.success("Cargo removido!"); invalidate(); setDeleteId(null); },
    onError: () => toast.error("Erro ao remover cargo"),
  });

  if (isLoading) return <div className="flex justify-center py-12"><Loader2 className="h-6 w-6 animate-spin text-muted-foreground" /></div>;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="font-semibold text-foreground">Cargos</h3>
        <Button size="sm" onClick={() => setShowCreate(true)}>
          <Plus className="h-4 w-4 mr-1" /> Novo Cargo
        </Button>
      </div>

      {cargos.length === 0 ? (
        <p className="text-sm text-muted-foreground text-center py-8">Nenhum cargo cadastrado.</p>
      ) : (
        <div className="border rounded-lg divide-y">
          {cargos.map((cargo) => (
            <div key={cargo.id} className="flex items-center gap-3 px-4 py-3">
              <span className="flex-1 text-sm font-medium text-foreground">{cargo.nome}</span>
              <Switch
                checked={cargo.ativo}
                onCheckedChange={(v) => toggleMut.mutate({ id: cargo.id, ativo: v })}
              />
              <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive" onClick={() => setDeleteId(cargo.id)}>
                <Trash2 className="h-4 w-4" />
              </Button>
            </div>
          ))}
        </div>
      )}

      {/* Create dialog */}
      <Dialog open={showCreate} onOpenChange={setShowCreate}>
        <DialogContent className="max-w-sm">
          <DialogHeader><DialogTitle>Novo Cargo</DialogTitle></DialogHeader>
          <Input value={newNome} onChange={(e) => setNewNome(e.target.value)} placeholder="Nome do cargo" />
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowCreate(false)}>Cancelar</Button>
            <Button onClick={() => createMut.mutate(newNome)} disabled={!newNome.trim() || createMut.isPending}>
              {createMut.isPending ? "Salvando..." : "Salvar"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete confirmation */}
      <AlertDialog open={!!deleteId} onOpenChange={() => setDeleteId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Remover cargo?</AlertDialogTitle>
            <AlertDialogDescription>Esta ação não pode ser desfeita.</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={() => deleteId && deleteMut.mutate(deleteId)}>Remover</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
