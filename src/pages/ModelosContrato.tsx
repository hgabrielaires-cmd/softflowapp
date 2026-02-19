import { useState, useEffect, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";
import { AppLayout } from "@/components/AppLayout";
import { useAuth } from "@/context/AuthContext";
import { Filial } from "@/lib/supabase-types";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  FileText, Plus, Loader2, MoreHorizontal, Download,
  Pencil, Trash2, Upload, Building2, CheckCircle, XCircle, Code2,
} from "lucide-react";
import { toast } from "sonner";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";

interface ModeloContrato {
  id: string;
  nome: string;
  filial_id: string | null;
  tipo: string;
  ativo: boolean;
  arquivo_docx_url: string | null;
  created_at: string;
  updated_at: string;
  filiais?: { nome: string } | null;
}

const TIPOS = ["Contrato Base"];

export default function ModelosContrato() {
  const { isAdmin } = useAuth();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [modelos, setModelos] = useState<ModeloContrato[]>([]);
  const [filiais, setFiliais] = useState<Filial[]>([]);
  const [loading, setLoading] = useState(true);
  const [openDialog, setOpenDialog] = useState(false);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [editingModelo, setEditingModelo] = useState<ModeloContrato | null>(null);
  const [variaveisModelo, setVariaveisModelo] = useState<{ id: string; variaveis: string[]; loading: boolean } | null>(null);

  const [form, setForm] = useState({
    nome: "",
    filial_id: "todas",
    tipo: "Contrato Base",
    ativo: true,
  });
  const [arquivoSelecionado, setArquivoSelecionado] = useState<File | null>(null);
  const [urlAtual, setUrlAtual] = useState<string | null>(null);

  async function loadData() {
    setLoading(true);
    const [{ data: modelosData, error }, { data: filiaisData }] = await Promise.all([
      supabase
        .from("modelos_contrato")
        .select("*, filiais(nome)")
        .order("created_at", { ascending: false }),
      supabase.from("filiais").select("*").eq("ativa", true).order("nome"),
    ]);
    if (error) toast.error("Erro ao carregar modelos: " + error.message);
    setModelos((modelosData || []) as unknown as ModeloContrato[]);
    setFiliais((filiaisData || []) as Filial[]);
    setLoading(false);
  }

  useEffect(() => { loadData(); }, []);

  function openNew() {
    setEditingModelo(null);
    setForm({ nome: "", filial_id: "todas", tipo: "Contrato Base", ativo: true });
    setArquivoSelecionado(null);
    setUrlAtual(null);
    setOpenDialog(true);
  }

  function openEdit(modelo: ModeloContrato) {
    setEditingModelo(modelo);
    setForm({
      nome: modelo.nome,
      filial_id: modelo.filial_id ?? "todas",
      tipo: modelo.tipo,
      ativo: modelo.ativo,
    });
    setArquivoSelecionado(null);
    setUrlAtual(modelo.arquivo_docx_url);
    setOpenDialog(true);
  }

  function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    const ext = file.name.split(".").pop()?.toLowerCase();
    if (ext !== "docx") {
      toast.error("Apenas arquivos .docx são permitidos");
      return;
    }
    if (file.size > 20 * 1024 * 1024) {
      toast.error("Arquivo muito grande. Máximo 20MB.");
      return;
    }
    setArquivoSelecionado(file);
  }

  async function uploadArquivo(file: File): Promise<string | null> {
    setUploading(true);
    const timestamp = Date.now();
    const safeName = file.name.replace(/[^a-zA-Z0-9._-]/g, "_");
    const path = `${timestamp}_${safeName}`;

    const { error } = await supabase.storage
      .from("modelos-contrato")
      .upload(path, file, { upsert: false, contentType: "application/vnd.openxmlformats-officedocument.wordprocessingml.document" });

    setUploading(false);
    if (error) {
      toast.error("Erro ao fazer upload: " + error.message);
      return null;
    }

    const { data } = supabase.storage.from("modelos-contrato").getPublicUrl(path);
    // bucket privado — usar signed URL
    const { data: signed } = await supabase.storage
      .from("modelos-contrato")
      .createSignedUrl(path, 60 * 60 * 24 * 365); // 1 ano

    return signed?.signedUrl || data?.publicUrl || null;
  }

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    if (!form.nome.trim()) { toast.error("Nome é obrigatório"); return; }
    if (!editingModelo && !arquivoSelecionado) { toast.error("Selecione um arquivo DOCX"); return; }

    setSaving(true);

    let arquivo_docx_url = urlAtual;

    if (arquivoSelecionado) {
      arquivo_docx_url = await uploadArquivo(arquivoSelecionado);
      if (!arquivo_docx_url) { setSaving(false); return; }
    }

    const payload = {
      nome: form.nome.trim(),
      filial_id: form.filial_id === "todas" ? null : form.filial_id,
      tipo: form.tipo,
      ativo: form.ativo,
      arquivo_docx_url,
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

  async function handleToggleAtivo(modelo: ModeloContrato) {
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

  async function handleDownload(modelo: ModeloContrato) {
    if (!modelo.arquivo_docx_url) { toast.error("Nenhum arquivo vinculado"); return; }
    // Gerar signed URL para download
    const path = modelo.arquivo_docx_url.split("/modelos-contrato/")[1]?.split("?")[0];
    if (!path) {
      window.open(modelo.arquivo_docx_url, "_blank");
      return;
    }
    const { data, error } = await supabase.storage
      .from("modelos-contrato")
      .createSignedUrl(decodeURIComponent(path), 60);
    if (error || !data?.signedUrl) { toast.error("Erro ao gerar link de download"); return; }
    window.open(data.signedUrl, "_blank");
  }

  async function handleVerVariaveis(modelo: ModeloContrato) {
    if (!modelo.arquivo_docx_url) { toast.error("Nenhum arquivo vinculado"); return; }
    setVariaveisModelo({ id: modelo.id, variaveis: [], loading: true });
    try {
      const { data, error } = await supabase.functions.invoke("extrair-variaveis-docx", {
        body: { modelo_id: modelo.id },
      });
      if (error) throw error;
      setVariaveisModelo({ id: modelo.id, variaveis: data.variaveis || [], loading: false });
    } catch (err) {
      toast.error("Erro ao extrair variáveis: " + String(err));
      setVariaveisModelo(null);
    }
  }

  if (!isAdmin) {
    return (
      <AppLayout>
        <div className="flex items-center justify-center h-64 text-muted-foreground">
          Acesso restrito a administradores.
        </div>
      </AppLayout>
    );
  }

  return (
    <AppLayout>
      <div className="space-y-5">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-foreground flex items-center gap-2">
              <FileText className="h-6 w-6 text-primary" />
              Modelos de Contrato
            </h1>
            <p className="text-sm text-muted-foreground">
              Gerencie os modelos DOCX para geração de contratos
            </p>
          </div>
          <Button className="gap-2" onClick={openNew}>
            <Plus className="h-4 w-4" /> Novo Modelo
          </Button>
        </div>

        {/* Tabela */}
        <div className="bg-card rounded-xl border border-border shadow-sm overflow-hidden">
          <Table>
            <TableHeader>
              <TableRow className="bg-muted/50">
                <TableHead>Nome</TableHead>
                <TableHead>Tipo</TableHead>
                <TableHead>Filial</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Arquivo</TableHead>
                <TableHead>Criado em</TableHead>
                <TableHead className="text-right">Ações</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading ? (
                <TableRow>
                  <TableCell colSpan={7} className="text-center py-12">
                    <Loader2 className="h-6 w-6 animate-spin mx-auto text-muted-foreground" />
                  </TableCell>
                </TableRow>
              ) : modelos.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={7} className="text-center py-16 text-muted-foreground">
                    <FileText className="h-8 w-8 mx-auto mb-2 opacity-30" />
                    Nenhum modelo cadastrado ainda
                  </TableCell>
                </TableRow>
              ) : modelos.map((m) => (
                <TableRow key={m.id}>
                  <TableCell className="font-medium">{m.nome}</TableCell>
                  <TableCell>
                    <Badge variant="outline" className="text-xs">{m.tipo}</Badge>
                  </TableCell>
                  <TableCell>
                    {m.filiais ? (
                      <span className="inline-flex items-center gap-1 text-xs text-muted-foreground">
                        <Building2 className="h-3 w-3" /> {m.filiais.nome}
                      </span>
                    ) : (
                      <span className="text-xs text-muted-foreground">Todas</span>
                    )}
                  </TableCell>
                  <TableCell>
                    <button
                      onClick={() => handleToggleAtivo(m)}
                      className="flex items-center gap-1.5 group"
                      title={m.ativo ? "Clique para inativar" : "Clique para ativar"}
                    >
                      {m.ativo ? (
                        <Badge className="bg-emerald-100 text-emerald-700 border-emerald-200 hover:bg-emerald-100 gap-1 dark:bg-emerald-900/30 dark:text-emerald-400 dark:border-emerald-800">
                          <CheckCircle className="h-3 w-3" /> Ativo
                        </Badge>
                      ) : (
                        <Badge variant="secondary" className="gap-1">
                          <XCircle className="h-3 w-3" /> Inativo
                        </Badge>
                      )}
                    </button>
                  </TableCell>
                  <TableCell>
                    {m.arquivo_docx_url ? (
                      <button
                        onClick={() => handleDownload(m)}
                        className="inline-flex items-center gap-1 text-xs text-primary hover:underline"
                      >
                        <Download className="h-3 w-3" /> Baixar DOCX
                      </button>
                    ) : (
                      <span className="text-xs text-muted-foreground">—</span>
                    )}
                  </TableCell>
                  <TableCell className="text-sm text-muted-foreground whitespace-nowrap">
                    {format(new Date(m.created_at), "dd/MM/yyyy", { locale: ptBR })}
                  </TableCell>
                  <TableCell className="text-right">
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="icon" className="h-7 w-7">
                          <MoreHorizontal className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end" className="w-44">
                        <DropdownMenuItem onClick={() => openEdit(m)} className="cursor-pointer">
                          <Pencil className="h-4 w-4 mr-2" /> Editar
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={() => handleDownload(m)} className="cursor-pointer" disabled={!m.arquivo_docx_url}>
                          <Download className="h-4 w-4 mr-2" /> Baixar DOCX
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={() => handleVerVariaveis(m)} className="cursor-pointer" disabled={!m.arquivo_docx_url}>
                          <Code2 className="h-4 w-4 mr-2" /> Ver Variáveis
                        </DropdownMenuItem>
                        <DropdownMenuSeparator />
                        <DropdownMenuItem
                          onClick={() => setDeletingId(m.id)}
                          className="cursor-pointer text-destructive focus:text-destructive"
                        >
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

        {/* Painel de variáveis extraídas */}
        {variaveisModelo && (
          <div className="bg-card rounded-xl border border-border shadow-sm p-5 space-y-3">
            <div className="flex items-center justify-between">
              <h2 className="text-sm font-semibold text-foreground flex items-center gap-2">
                <Code2 className="h-4 w-4 text-primary" />
                Variáveis encontradas no modelo
              </h2>
              <Button variant="ghost" size="sm" onClick={() => setVariaveisModelo(null)} className="h-7 text-xs">
                Fechar
              </Button>
            </div>
            {variaveisModelo.loading ? (
              <div className="flex items-center gap-2 text-sm text-muted-foreground py-4">
                <Loader2 className="h-4 w-4 animate-spin" /> Extraindo variáveis do DOCX...
              </div>
            ) : variaveisModelo.variaveis.length === 0 ? (
              <p className="text-sm text-muted-foreground py-2">
                Nenhum marcador <code className="bg-muted px-1 rounded text-xs">#CAMPO#</code> encontrado no documento.
              </p>
            ) : (
              <div className="space-y-2">
                <p className="text-xs text-muted-foreground">
                  {variaveisModelo.variaveis.length} variável(is) encontrada(s):
                </p>
                <div className="flex flex-wrap gap-2">
                  {variaveisModelo.variaveis.map((v) => (
                    <span
                      key={v}
                      className="inline-flex items-center px-2.5 py-1 rounded-md text-xs font-mono bg-primary/10 text-primary border border-primary/20"
                    >
                      #{v}#
                    </span>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Dialog criar/editar */}
      <Dialog open={openDialog} onOpenChange={setOpenDialog}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <FileText className="h-4 w-4 text-primary" />
              {editingModelo ? "Editar Modelo" : "Novo Modelo de Contrato"}
            </DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSave} className="space-y-4">
            {/* Nome */}
            <div className="space-y-1.5">
              <Label>Nome *</Label>
              <Input
                placeholder="Ex: Contrato Padrão 2025"
                value={form.nome}
                onChange={(e) => setForm((f) => ({ ...f, nome: e.target.value }))}
                maxLength={120}
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              {/* Tipo */}
              <div className="space-y-1.5">
                <Label>Tipo *</Label>
                <Select value={form.tipo} onValueChange={(v) => setForm((f) => ({ ...f, tipo: v }))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {TIPOS.map((t) => (
                      <SelectItem key={t} value={t}>{t}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Filial */}
              <div className="space-y-1.5">
                <Label>Filial</Label>
                <Select value={form.filial_id} onValueChange={(v) => setForm((f) => ({ ...f, filial_id: v }))}>
                  <SelectTrigger><SelectValue placeholder="Todas as filiais" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="todas">Todas as filiais</SelectItem>
                    {filiais.map((f) => (
                      <SelectItem key={f.id} value={f.id}>{f.nome}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* Upload DOCX */}
            <div className="space-y-1.5">
              <Label>Arquivo DOCX {!editingModelo && "*"}</Label>
              <div
                onClick={() => fileInputRef.current?.click()}
                className="border-2 border-dashed border-border rounded-xl p-5 text-center cursor-pointer hover:border-primary/50 hover:bg-muted/30 transition-colors"
              >
                <input
                  ref={fileInputRef}
                  type="file"
                  accept=".docx,application/vnd.openxmlformats-officedocument.wordprocessingml.document"
                  className="hidden"
                  onChange={handleFileChange}
                />
                {arquivoSelecionado ? (
                  <div className="flex items-center justify-center gap-2 text-sm text-foreground">
                    <FileText className="h-5 w-5 text-primary" />
                    <span className="font-medium">{arquivoSelecionado.name}</span>
                    <span className="text-xs text-muted-foreground">
                      ({(arquivoSelecionado.size / 1024).toFixed(0)} KB)
                    </span>
                  </div>
                ) : urlAtual ? (
                  <div className="flex items-center justify-center gap-2 text-sm text-muted-foreground">
                    <FileText className="h-5 w-5 text-emerald-600 dark:text-emerald-400" />
                    <span>Arquivo atual vinculado</span>
                    <span className="text-xs text-primary">(clique para substituir)</span>
                  </div>
                ) : (
                  <div className="space-y-1">
                    <Upload className="h-8 w-8 mx-auto text-muted-foreground/50" />
                    <p className="text-sm text-muted-foreground">
                      Clique para selecionar o arquivo <strong>.docx</strong>
                    </p>
                    <p className="text-xs text-muted-foreground">Máximo 20MB</p>
                  </div>
                )}
              </div>
            </div>

            {/* Ativo */}
            <div className="flex items-center justify-between rounded-lg border border-border bg-muted/30 px-4 py-3">
              <div>
                <p className="text-sm font-medium text-foreground">Modelo ativo</p>
                <p className="text-xs text-muted-foreground">Modelos ativos ficam disponíveis para uso</p>
              </div>
              <Switch
                checked={form.ativo}
                onCheckedChange={(v) => setForm((f) => ({ ...f, ativo: v }))}
              />
            </div>

            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setOpenDialog(false)}>
                Cancelar
              </Button>
              <Button type="submit" disabled={saving || uploading} className="gap-2">
                {(saving || uploading) && <Loader2 className="h-4 w-4 animate-spin" />}
                {uploading ? "Enviando arquivo..." : saving ? "Salvando..." : editingModelo ? "Salvar" : "Criar Modelo"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Confirm delete */}
      <AlertDialog open={!!deletingId} onOpenChange={(v) => { if (!v) setDeletingId(null); }}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Excluir modelo?</AlertDialogTitle>
            <AlertDialogDescription>
              O modelo será excluído permanentemente. O arquivo DOCX no storage não será removido automaticamente.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => deletingId && handleDelete(deletingId)}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Excluir
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </AppLayout>
  );
}
