import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from "@/components/ui/dialog";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem,
  DropdownMenuSeparator, DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Plus, Loader2, MoreHorizontal, Pencil, Trash2, Building2,
  CheckCircle, XCircle, Upload, ClipboardList,
} from "lucide-react";
import { toast } from "sonner";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { Filial } from "@/lib/supabase-types";

interface OrdemAtendimentoTabProps {
  filiais: Filial[];
}

interface ModeloOrdem {
  id: string;
  nome: string;
  tipo: string;
  ativo: boolean;
  arquivo_docx_url: string | null;
  filial_id: string | null;
  created_at: string;
  updated_at: string;
  filiais?: { nome: string } | null;
}

export function OrdemAtendimentoTab({ filiais }: OrdemAtendimentoTabProps) {
  const [modelos, setModelos] = useState<ModeloOrdem[]>([]);
  const [loading, setLoading] = useState(true);
  const [openDialog, setOpenDialog] = useState(false);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [editingModelo, setEditingModelo] = useState<ModeloOrdem | null>(null);

  const [form, setForm] = useState({
    nome: "",
    tipo: "Ordem de Atendimento",
    filial_id: "todas",
    ativo: true,
    arquivo_docx_url: "" as string | null,
  });

  async function loadData() {
    setLoading(true);
    const { data, error } = await supabase
      .from("modelos_contrato")
      .select("*, filiais(nome)")
      .eq("tipo", "Ordem de Atendimento")
      .order("created_at", { ascending: false });
    if (error) toast.error("Erro ao carregar modelos: " + error.message);
    setModelos((data || []) as unknown as ModeloOrdem[]);
    setLoading(false);
  }

  useEffect(() => { loadData(); }, []);

  function openNew() {
    setEditingModelo(null);
    setForm({ nome: "", tipo: "Ordem de Atendimento", filial_id: "todas", ativo: true, arquivo_docx_url: "" });
    setOpenDialog(true);
  }

  function openEdit(modelo: ModeloOrdem) {
    setEditingModelo(modelo);
    setForm({
      nome: modelo.nome,
      tipo: modelo.tipo,
      filial_id: modelo.filial_id ?? "todas",
      ativo: modelo.ativo,
      arquivo_docx_url: modelo.arquivo_docx_url ?? "",
    });
    setOpenDialog(true);
  }

  async function handleUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    const allowedTypes = [
      "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
      "application/msword",
    ];
    if (!allowedTypes.includes(file.type)) {
      toast.error("Selecione um arquivo .docx ou .doc");
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      toast.error("Arquivo deve ter no máximo 5MB");
      return;
    }

    setUploading(true);
    const ext = file.name.split(".").pop() || "docx";
    const path = `ordens/${crypto.randomUUID()}.${ext}`;

    const { error } = await supabase.storage.from("modelos-contrato").upload(path, file, { upsert: true });
    if (error) {
      toast.error("Erro ao enviar arquivo: " + error.message);
      setUploading(false);
      return;
    }

    const { data: urlData } = supabase.storage.from("modelos-contrato").getPublicUrl(path);
    setForm((f) => ({ ...f, arquivo_docx_url: urlData.publicUrl }));
    setUploading(false);
    toast.success("Arquivo enviado!");
  }

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    if (!form.nome.trim()) { toast.error("Nome é obrigatório"); return; }

    setSaving(true);
    const payload = {
      nome: form.nome.trim(),
      tipo: "Ordem de Atendimento",
      filial_id: form.filial_id === "todas" ? null : form.filial_id,
      ativo: form.ativo,
      arquivo_docx_url: form.arquivo_docx_url || null,
    };

    if (editingModelo) {
      const { error } = await supabase.from("modelos_contrato").update(payload).eq("id", editingModelo.id);
      if (error) { toast.error("Erro ao atualizar: " + error.message); setSaving(false); return; }
      toast.success("Modelo atualizado!");
    } else {
      const { error } = await supabase.from("modelos_contrato").insert(payload);
      if (error) { toast.error("Erro ao criar: " + error.message); setSaving(false); return; }
      toast.success("Modelo criado!");
    }

    setSaving(false);
    setOpenDialog(false);
    loadData();
  }

  async function handleToggleAtivo(modelo: ModeloOrdem) {
    const { error } = await supabase
      .from("modelos_contrato")
      .update({ ativo: !modelo.ativo })
      .eq("id", modelo.id);
    if (error) { toast.error("Erro ao atualizar status"); return; }
    toast.success(modelo.ativo ? "Modelo inativado" : "Modelo ativado");
    loadData();
  }

  async function handleDelete(id: string) {
    const { error } = await supabase.from("modelos_contrato").delete().eq("id", id);
    if (error) { toast.error("Erro ao excluir: " + error.message); return; }
    toast.success("Modelo excluído");
    setDeletingId(null);
    loadData();
  }

  return (
    <div className="space-y-4">
      <div className="flex justify-end">
        <Button className="gap-2" onClick={openNew}>
          <Plus className="h-4 w-4" /> Novo Modelo de Ordem
        </Button>
      </div>

      <div className="bg-card rounded-xl border border-border shadow-sm overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow className="bg-muted/50">
              <TableHead>Nome</TableHead>
              <TableHead>Filial</TableHead>
              <TableHead>Arquivo</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Criado em</TableHead>
              <TableHead className="text-right">Ações</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading ? (
              <TableRow>
                <TableCell colSpan={6} className="text-center py-12">
                  <Loader2 className="h-6 w-6 animate-spin mx-auto text-muted-foreground" />
                </TableCell>
              </TableRow>
            ) : modelos.length === 0 ? (
              <TableRow>
                <TableCell colSpan={6} className="text-center py-16 text-muted-foreground">
                  <ClipboardList className="h-8 w-8 mx-auto mb-2 opacity-30" />
                  Nenhum modelo de ordem de atendimento cadastrado
                </TableCell>
              </TableRow>
            ) : modelos.map((m) => (
              <TableRow key={m.id}>
                <TableCell className="font-medium">{m.nome}</TableCell>
                <TableCell>
                  {m.filiais ? (
                    <span className="inline-flex items-center gap-1 text-xs text-muted-foreground">
                      <Building2 className="h-3 w-3" /> {m.filiais.nome}
                    </span>
                  ) : (
                    <span className="text-xs text-muted-foreground">Global</span>
                  )}
                </TableCell>
                <TableCell>
                  {m.arquivo_docx_url ? (
                    <Badge variant="secondary" className="text-xs">DOCX</Badge>
                  ) : (
                    <span className="text-xs text-muted-foreground">—</span>
                  )}
                </TableCell>
                <TableCell>
                  <button onClick={() => handleToggleAtivo(m)} className="focus:outline-none">
                    {m.ativo ? (
                      <Badge className="bg-emerald-100 text-emerald-700 hover:bg-emerald-200 border-0 gap-1 text-xs cursor-pointer">
                        <CheckCircle className="h-3 w-3" /> Ativo
                      </Badge>
                    ) : (
                      <Badge variant="secondary" className="gap-1 text-xs cursor-pointer">
                        <XCircle className="h-3 w-3" /> Inativo
                      </Badge>
                    )}
                  </button>
                </TableCell>
                <TableCell className="text-xs text-muted-foreground">
                  {format(new Date(m.created_at), "dd/MM/yyyy", { locale: ptBR })}
                </TableCell>
                <TableCell className="text-right">
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="ghost" size="icon" className="h-8 w-8">
                        <MoreHorizontal className="h-4 w-4" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuItem onClick={() => openEdit(m)}>
                        <Pencil className="h-4 w-4 mr-2" /> Editar
                      </DropdownMenuItem>
                      <DropdownMenuSeparator />
                      <DropdownMenuItem className="text-destructive" onClick={() => setDeletingId(m.id)}>
                        <Trash2 className="h-4 w-4 mr-2" /> Excluir
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>

      {/* Dialog criar/editar */}
      <Dialog open={openDialog} onOpenChange={setOpenDialog}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>
              {editingModelo ? "Editar Modelo de Ordem" : "Novo Modelo de Ordem de Atendimento"}
            </DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSave} className="space-y-4">
            <div>
              <Label>Nome *</Label>
              <Input
                value={form.nome}
                onChange={(e) => setForm((f) => ({ ...f, nome: e.target.value }))}
                placeholder="Ex: Ordem de Serviço - Instalação"
              />
            </div>

            <div>
              <Label>Filial</Label>
              <Select value={form.filial_id} onValueChange={(v) => setForm((f) => ({ ...f, filial_id: v }))}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="todas">Todas as Filiais</SelectItem>
                  {filiais.map((f) => (
                    <SelectItem key={f.id} value={f.id}>{f.nome}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label>Arquivo DOCX (modelo)</Label>
              <div className="flex items-center gap-2 mt-1">
                <Button type="button" variant="outline" size="sm" className="gap-1.5" asChild>
                  <label className="cursor-pointer">
                    <Upload className="h-3.5 w-3.5" />
                    {uploading ? "Enviando..." : "Upload DOCX"}
                    <input type="file" accept=".docx,.doc" className="hidden" onChange={handleUpload} disabled={uploading} />
                  </label>
                </Button>
                {form.arquivo_docx_url && (
                  <Badge variant="secondary" className="text-xs">Arquivo anexado</Badge>
                )}
              </div>
            </div>

            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setOpenDialog(false)}>Cancelar</Button>
              <Button type="submit" disabled={saving}>
                {saving && <Loader2 className="h-4 w-4 animate-spin mr-2" />}
                {editingModelo ? "Salvar" : "Criar"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Delete confirmation */}
      <AlertDialog open={!!deletingId} onOpenChange={() => setDeletingId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Excluir modelo?</AlertDialogTitle>
            <AlertDialogDescription>
              Esta ação não pode ser desfeita. O modelo será removido permanentemente.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={() => deletingId && handleDelete(deletingId)} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
              Excluir
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
