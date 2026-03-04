import { useState } from "react";
import { AppLayout } from "@/components/AppLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Plus, Pencil, Trash2, Search, Wrench } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { TablePagination } from "@/components/TablePagination";

const PAGE_SIZE = 15;

interface Servico {
  id: string;
  nome: string;
  descricao: string | null;
  valor: number;
  unidade_medida: string;
  ativo: boolean;
  created_at: string;
}

const Servicos = () => {
  const queryClient = useQueryClient();
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<Servico | null>(null);
  const [search, setSearch] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const [form, setForm] = useState({ nome: "", descricao: "", valor: "", unidade_medida: "unidade" });

  const { data: result, isLoading } = useQuery({
    queryKey: ["servicos", currentPage, search],
    queryFn: async () => {
      const from = (currentPage - 1) * PAGE_SIZE;
      const to = from + PAGE_SIZE - 1;
      let query = supabase
        .from("servicos")
        .select("*", { count: "exact" })
        .order("created_at", { ascending: false });
      if (search) {
        const q = `%${search}%`;
        query = query.or(`nome.ilike.${q},descricao.ilike.${q}`);
      }
      const { data, count, error } = await query.range(from, to);
      if (error) throw error;
      return { items: data as Servico[], total: count || 0 };
    },
  });

  const servicos = result?.items || [];
  const totalCount = result?.total || 0;
  const totalPages = Math.ceil(totalCount / PAGE_SIZE);

  const saveMutation = useMutation({
    mutationFn: async () => {
      const payload = {
        nome: form.nome,
        descricao: form.descricao || null,
        valor: parseFloat(form.valor) || 0,
        unidade_medida: form.unidade_medida,
      };
      if (editing) {
        const { error } = await supabase.from("servicos").update(payload).eq("id", editing.id);
        if (error) throw error;
      } else {
        const { error } = await supabase.from("servicos").insert(payload);
        if (error) throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["servicos"] });
      toast.success(editing ? "Serviço atualizado!" : "Serviço criado!");
      handleClose();
    },
    onError: () => toast.error("Erro ao salvar serviço."),
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("servicos").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["servicos"] });
      toast.success("Serviço excluído!");
    },
    onError: () => toast.error("Erro ao excluir serviço."),
  });

  const handleClose = () => {
    setOpen(false);
    setEditing(null);
    setForm({ nome: "", descricao: "", valor: "", unidade_medida: "unidade" });
  };

  const handleEdit = (s: Servico) => {
    setEditing(s);
    setForm({
      nome: s.nome,
      descricao: s.descricao || "",
      valor: String(s.valor),
      unidade_medida: s.unidade_medida,
    });
    setOpen(true);
  };

  const formatCurrency = (v: number) =>
    v.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });

  return (
    <AppLayout>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Wrench className="h-6 w-6 text-primary" />
            <h1 className="text-2xl font-bold text-foreground">Serviços</h1>
          </div>
          <Button onClick={() => setOpen(true)}>
            <Plus className="h-4 w-4 mr-2" /> Novo Serviço
          </Button>
        </div>

        <div className="relative max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Buscar serviço..."
            value={search}
            onChange={(e) => { setSearch(e.target.value); setCurrentPage(1); }}
            className="pl-9"
          />
        </div>

        <div className="rounded-lg border bg-card">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Nome</TableHead>
                <TableHead>Descrição</TableHead>
                <TableHead>Valor</TableHead>
                <TableHead>Unidade</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="w-[100px]">Ações</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                <TableRow>
                  <TableCell colSpan={6} className="text-center py-8 text-muted-foreground">
                    Carregando...
                  </TableCell>
                </TableRow>
              ) : servicos.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={6} className="text-center py-8 text-muted-foreground">
                    Nenhum serviço encontrado.
                  </TableCell>
                </TableRow>
              ) : (
                servicos.map((s) => (
                  <TableRow key={s.id}>
                    <TableCell className="font-medium">{s.nome}</TableCell>
                    <TableCell className="text-muted-foreground max-w-[300px] truncate">
                      {s.descricao || "—"}
                    </TableCell>
                    <TableCell>{formatCurrency(s.valor)}</TableCell>
                    <TableCell>
                      <Badge variant="outline">
                        {s.unidade_medida === "hora" ? "Por Hora" : "Por Unidade"}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <Badge variant={s.ativo ? "default" : "secondary"}>
                        {s.ativo ? "Ativo" : "Inativo"}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <div className="flex gap-1">
                        <Button variant="ghost" size="icon" onClick={() => handleEdit(s)}>
                          <Pencil className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => deleteMutation.mutate(s.id)}
                        >
                          <Trash2 className="h-4 w-4 text-destructive" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
          <TablePagination
            currentPage={currentPage}
            totalPages={totalPages}
            totalItems={totalCount}
            itemsPerPage={PAGE_SIZE}
            onPageChange={setCurrentPage}
          />
        </div>
      </div>

      <Dialog open={open} onOpenChange={(v) => !v && handleClose()}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>{editing ? "Editar Serviço" : "Novo Serviço"}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Nome *</Label>
              <Input
                value={form.nome}
                onChange={(e) => setForm({ ...form, nome: e.target.value })}
                placeholder="Ex: Instalação de câmeras"
              />
            </div>
            <div className="space-y-2">
              <Label>Descrição</Label>
              <Textarea
                value={form.descricao}
                onChange={(e) => setForm({ ...form, descricao: e.target.value })}
                placeholder="Descrição do serviço..."
                rows={3}
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Valor (R$) *</Label>
                <Input
                  type="number"
                  step="0.01"
                  min="0"
                  value={form.valor}
                  onChange={(e) => setForm({ ...form, valor: e.target.value })}
                  placeholder="0,00"
                />
              </div>
              <div className="space-y-2">
                <Label>Unidade de Medida *</Label>
                <Select
                  value={form.unidade_medida}
                  onValueChange={(v) => setForm({ ...form, unidade_medida: v })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="unidade">Por Unidade</SelectItem>
                    <SelectItem value="hora">Por Hora</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={handleClose}>Cancelar</Button>
            <Button onClick={() => saveMutation.mutate()} disabled={!form.nome || saveMutation.isPending}>
              {saveMutation.isPending ? "Salvando..." : "Salvar"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </AppLayout>
  );
};

export default Servicos;
