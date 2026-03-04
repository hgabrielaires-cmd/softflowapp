import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { AppLayout } from "@/components/AppLayout";
import { useAuth } from "@/context/AuthContext";
import { useCrudPermissions } from "@/hooks/useCrudPermissions";
import { Navigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from "@/components/ui/dialog";
import { Plus, Loader2, Trash2, Search, Pencil, Building } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";

interface Setor {
  id: string;
  nome: string;
  descricao: string | null;
  telefone: string | null;
  ativo: boolean;
  created_at: string;
}

export default function Setores() {
  const { isAdmin, roles } = useAuth();
  const { canIncluir, canEditar, canExcluir } = useCrudPermissions("setores", roles);
  const canAccess = isAdmin || canIncluir || canEditar;

  const [setores, setSetores] = useState<Setor[]>([]);
  const [loading, setLoading] = useState(true);
  const [busca, setBusca] = useState("");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editando, setEditando] = useState<Setor | null>(null);
  const [form, setForm] = useState({ nome: "", descricao: "", telefone: "" });
  const [saving, setSaving] = useState(false);

  if (!canAccess) return <Navigate to="/dashboard" replace />;

  async function loadSetores() {
    setLoading(true);
    const { data, error } = await supabase
      .from("setores")
      .select("*")
      .order("nome");
    if (error) toast.error("Erro ao carregar setores");
    else setSetores((data as Setor[]) || []);
    setLoading(false);
  }

  useEffect(() => { loadSetores(); }, []);

  function openNew() {
    setEditando(null);
    setForm({ nome: "", descricao: "", telefone: "" });
    setDialogOpen(true);
  }

  function openEdit(setor: Setor) {
    setEditando(setor);
    setForm({ nome: setor.nome, descricao: setor.descricao || "", telefone: setor.telefone || "" });
    setDialogOpen(true);
  }

  async function handleSave() {
    if (!form.nome.trim()) { toast.error("Nome é obrigatório"); return; }
    setSaving(true);

    const payload = {
      nome: form.nome.trim(),
      descricao: form.descricao.trim() || null,
      telefone: form.telefone.trim() || null,
    };

    if (editando) {
      const { error } = await supabase.from("setores").update(payload).eq("id", editando.id);
      if (error) toast.error("Erro ao atualizar setor");
      else { toast.success("Setor atualizado"); setDialogOpen(false); loadSetores(); }
    } else {
      const { error } = await supabase.from("setores").insert(payload);
      if (error) toast.error("Erro ao criar setor");
      else { toast.success("Setor criado"); setDialogOpen(false); loadSetores(); }
    }
    setSaving(false);
  }

  async function toggleAtivo(setor: Setor) {
    const { error } = await supabase.from("setores").update({ ativo: !setor.ativo }).eq("id", setor.id);
    if (error) toast.error("Erro ao atualizar status");
    else loadSetores();
  }

  async function handleDelete(id: string) {
    if (!confirm("Tem certeza que deseja excluir este setor?")) return;
    const { error } = await supabase.from("setores").delete().eq("id", id);
    if (error) toast.error("Erro ao excluir setor. Verifique se não está vinculado a algum template.");
    else { toast.success("Setor excluído"); loadSetores(); }
  }

  const filtrados = setores.filter(s =>
    s.nome.toLowerCase().includes(busca.toLowerCase()) ||
    (s.descricao || "").toLowerCase().includes(busca.toLowerCase())
  );

  return (
    <AppLayout>
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-xl font-bold flex items-center gap-2">
              <Building className="h-5 w-5" />
              Setores
            </h1>
            <p className="text-sm text-muted-foreground">
              Gerencie os setores vinculados aos templates de mensagens WhatsApp
            </p>
          </div>
          {(isAdmin || canIncluir) && (
            <Button onClick={openNew} size="sm">
              <Plus className="h-4 w-4 mr-1" /> Novo Setor
            </Button>
          )}
        </div>

        <div className="relative max-w-xs">
          <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Buscar setor..."
            className="pl-8 h-9"
            value={busca}
            onChange={e => setBusca(e.target.value)}
          />
        </div>

        <div className="rounded-md border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Nome</TableHead>
                <TableHead>Descrição</TableHead>
                <TableHead>Telefone</TableHead>
                <TableHead className="w-20 text-center">Ativo</TableHead>
                <TableHead className="w-20 text-center">Ações</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading ? (
                <TableRow>
                  <TableCell colSpan={5} className="text-center py-8">
                    <Loader2 className="h-5 w-5 animate-spin mx-auto" />
                  </TableCell>
                </TableRow>
              ) : filtrados.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={5} className="text-center py-8 text-muted-foreground">
                    Nenhum setor encontrado
                  </TableCell>
                </TableRow>
              ) : (
                filtrados.map(setor => (
                  <TableRow key={setor.id}>
                    <TableCell className="font-medium">{setor.nome}</TableCell>
                    <TableCell className="text-muted-foreground text-sm">{setor.descricao || "—"}</TableCell>
                    <TableCell className="text-sm">{setor.telefone || "—"}</TableCell>
                    <TableCell className="text-center">
                      <Switch
                        checked={setor.ativo}
                        disabled={!isAdmin && !canEditar}
                        onCheckedChange={() => toggleAtivo(setor)}
                      />
                    </TableCell>
                    <TableCell className="text-center">
                      <div className="flex items-center justify-center gap-1">
                        {(isAdmin || canEditar) && (
                          <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => openEdit(setor)}>
                            <Pencil className="h-3.5 w-3.5" />
                          </Button>
                        )}
                        {(isAdmin || canExcluir) && (
                          <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive" onClick={() => handleDelete(setor.id)}>
                            <Trash2 className="h-3.5 w-3.5" />
                          </Button>
                        )}
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
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>{editando ? "Editar Setor" : "Novo Setor"}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <label className="text-sm font-medium">Nome *</label>
              <Input
                value={form.nome}
                onChange={e => setForm(f => ({ ...f, nome: e.target.value }))}
                placeholder="Ex: Comercial, Suporte, Financeiro"
              />
            </div>
            <div>
              <label className="text-sm font-medium">Descrição</label>
              <Textarea
                value={form.descricao}
                onChange={e => setForm(f => ({ ...f, descricao: e.target.value }))}
                placeholder="Descrição opcional do setor"
                rows={2}
              />
            </div>
            <div>
              <label className="text-sm font-medium">Telefone / WhatsApp</label>
              <Input
                value={form.telefone}
                onChange={e => setForm(f => ({ ...f, telefone: e.target.value }))}
                placeholder="(00) 00000-0000"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>Cancelar</Button>
            <Button onClick={handleSave} disabled={saving}>
              {saving && <Loader2 className="h-4 w-4 mr-1 animate-spin" />}
              {editando ? "Salvar" : "Criar"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </AppLayout>
  );
}
