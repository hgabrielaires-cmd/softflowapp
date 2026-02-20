import { useState, useEffect, useRef, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { AppLayout } from "@/components/AppLayout";
import { useAuth } from "@/context/AuthContext";
import { Filial, DocumentTemplate } from "@/lib/supabase-types";
import { ContractVariablesPanel } from "@/components/ContractVariablesPanel";
import { ContractPreview } from "@/components/ContractPreview";
import { getExampleData } from "@/lib/contract-variables";
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
  FileText, Plus, Loader2, MoreHorizontal,
  Pencil, Trash2, Building2, CheckCircle, XCircle, Eye, Copy, Upload, Image,
} from "lucide-react";
import { toast } from "sonner";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";

const TIPOS: { value: DocumentTemplate["tipo"]; label: string }[] = [
  { value: "CONTRATO_BASE", label: "Contrato Base" },
  { value: "ADITIVO", label: "Termo Aditivo" },
  { value: "CANCELAMENTO", label: "Cancelamento" },
];

export default function ModelosContrato() {
  const { isAdmin } = useAuth();
  const editorRef = useRef<HTMLTextAreaElement>(null);

  const [modelos, setModelos] = useState<DocumentTemplate[]>([]);
  const [filiais, setFiliais] = useState<Filial[]>([]);
  const [loading, setLoading] = useState(true);
  const [openEditor, setOpenEditor] = useState(false);
  const [saving, setSaving] = useState(false);
  const [uploadingLogo, setUploadingLogo] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [editingModelo, setEditingModelo] = useState<DocumentTemplate | null>(null);
  const [previewOpen, setPreviewOpen] = useState(false);
  const [previewHtml, setPreviewHtml] = useState("");

  const [form, setForm] = useState({
    nome: "",
    filial_id: "todas",
    tipo: "CONTRATO_BASE" as DocumentTemplate["tipo"],
    ativo: true,
    conteudo_html: "",
    logo_url: "" as string | null,
  });

  async function loadData() {
    setLoading(true);
    const [{ data: modelosData, error }, { data: filiaisData }] = await Promise.all([
      supabase
        .from("document_templates")
        .select("*, filiais(nome)")
        .order("created_at", { ascending: false }),
      supabase.from("filiais").select("*").eq("ativa", true).order("nome"),
    ]);
    if (error) toast.error("Erro ao carregar modelos: " + error.message);
    setModelos((modelosData || []) as unknown as DocumentTemplate[]);
    setFiliais((filiaisData || []) as Filial[]);
    setLoading(false);
  }

  useEffect(() => { loadData(); }, []);

  function openNew() {
    setEditingModelo(null);
    setForm({ nome: "", filial_id: "todas", tipo: "CONTRATO_BASE", ativo: true, conteudo_html: "", logo_url: "" });
    setOpenEditor(true);
  }

  function openEdit(modelo: DocumentTemplate) {
    setEditingModelo(modelo);
    setForm({
      nome: modelo.nome,
      filial_id: modelo.filial_id ?? "todas",
      tipo: modelo.tipo,
      ativo: modelo.ativo,
      conteudo_html: modelo.conteudo_html,
      logo_url: modelo.logo_url ?? "",
    });
    setOpenEditor(true);
  }

  function handleDuplicate(modelo: DocumentTemplate) {
    setEditingModelo(null);
    setForm({
      nome: modelo.nome + " (cópia)",
      filial_id: modelo.filial_id ?? "todas",
      tipo: modelo.tipo,
      ativo: false,
      conteudo_html: modelo.conteudo_html,
      logo_url: modelo.logo_url ?? "",
    });
    setOpenEditor(true);
  }

  async function handleLogoUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!file.type.startsWith("image/")) { toast.error("Selecione uma imagem"); return; }
    if (file.size > 2 * 1024 * 1024) { toast.error("Imagem deve ter no máximo 2MB"); return; }

    setUploadingLogo(true);
    const ext = file.name.split(".").pop() || "png";
    const path = `modelos/${crypto.randomUUID()}.${ext}`;

    const { error } = await supabase.storage.from("filiais-logos").upload(path, file, { upsert: true });
    if (error) { toast.error("Erro ao enviar logo: " + error.message); setUploadingLogo(false); return; }

    const { data: urlData } = supabase.storage.from("filiais-logos").getPublicUrl(path);
    setForm((f) => ({ ...f, logo_url: urlData.publicUrl }));
    setUploadingLogo(false);
    toast.success("Logo enviada!");
  }

  const handleInsertVariable = useCallback((variable: string) => {
    const textarea = editorRef.current;
    if (!textarea) {
      setForm((f) => ({ ...f, conteudo_html: f.conteudo_html + variable }));
      return;
    }
    const start = textarea.selectionStart;
    const end = textarea.selectionEnd;
    const text = form.conteudo_html;
    const newText = text.substring(0, start) + variable + text.substring(end);
    setForm((f) => ({ ...f, conteudo_html: newText }));
    // Reposicionar cursor após a variável inserida
    requestAnimationFrame(() => {
      textarea.focus();
      const newPos = start + variable.length;
      textarea.setSelectionRange(newPos, newPos);
    });
  }, [form.conteudo_html]);

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    if (!form.nome.trim()) { toast.error("Nome é obrigatório"); return; }
    if (!form.conteudo_html.trim()) { toast.error("O conteúdo HTML do modelo é obrigatório"); return; }

    setSaving(true);

    const payload = {
      nome: form.nome.trim(),
      filial_id: form.filial_id === "todas" ? null : form.filial_id,
      tipo: form.tipo,
      ativo: form.ativo,
      conteudo_html: form.conteudo_html,
      logo_url: form.logo_url || null,
    };

    if (editingModelo) {
      const { error } = await supabase.from("document_templates").update(payload).eq("id", editingModelo.id);
      if (error) { toast.error("Erro ao atualizar: " + error.message); setSaving(false); return; }
      toast.success("Modelo atualizado!");
    } else {
      const { error } = await supabase.from("document_templates").insert(payload);
      if (error) { toast.error("Erro ao criar: " + error.message); setSaving(false); return; }
      toast.success("Modelo criado!");
    }

    setSaving(false);
    setOpenEditor(false);
    loadData();
  }

  async function handleToggleAtivo(modelo: DocumentTemplate) {
    const { error } = await supabase
      .from("document_templates")
      .update({ ativo: !modelo.ativo })
      .eq("id", modelo.id);
    if (error) { toast.error("Erro ao atualizar status"); return; }
    toast.success(modelo.ativo ? "Modelo inativado" : "Modelo ativado");
    loadData();
  }

  async function handleDelete(id: string) {
    const { error } = await supabase.from("document_templates").delete().eq("id", id);
    if (error) { toast.error("Erro ao excluir: " + error.message); return; }
    toast.success("Modelo excluído");
    setDeletingId(null);
    loadData();
  }

  const [previewDados, setPreviewDados] = useState<Record<string, string> | undefined>(undefined);

  function handlePreview(html: string, logoUrl?: string | null) {
    setPreviewHtml(html);
    if (logoUrl) {
      setPreviewDados({ ...getExampleData(), "logo.url": logoUrl, "empresa.logo": logoUrl });
    } else {
      setPreviewDados(undefined);
    }
    setPreviewOpen(true);
  }

  function getTipoLabel(tipo: string) {
    return TIPOS.find((t) => t.value === tipo)?.label || tipo;
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
              Gerencie os modelos HTML para geração de contratos
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
                <TableHead>Versão</TableHead>
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
                    <Badge variant="outline" className="text-xs">{getTipoLabel(m.tipo)}</Badge>
                  </TableCell>
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
                    <span className="text-xs text-muted-foreground">v{m.versao}</span>
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
                        <DropdownMenuItem onClick={() => handlePreview(m.conteudo_html, m.logo_url)} className="cursor-pointer">
                          <Eye className="h-4 w-4 mr-2" /> Preview
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={() => handleDuplicate(m)} className="cursor-pointer">
                          <Copy className="h-4 w-4 mr-2" /> Duplicar
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
      </div>

      {/* Editor fullscreen dialog */}
      <Dialog open={openEditor} onOpenChange={setOpenEditor}>
        <DialogContent className="max-w-[95vw] w-full h-[90vh] flex flex-col p-0">
          <DialogHeader className="px-6 pt-5 pb-3 border-b border-border shrink-0">
            <DialogTitle className="flex items-center gap-2">
              <FileText className="h-4 w-4 text-primary" />
              {editingModelo ? "Editar Modelo" : "Novo Modelo de Contrato"}
            </DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSave} className="flex flex-col flex-1 overflow-hidden">
            {/* Top bar com campos */}
            <div className="px-6 py-3 border-b border-border shrink-0 flex flex-wrap gap-3 items-end">
              <div className="space-y-1 min-w-[200px] flex-1">
                <Label className="text-xs">Nome *</Label>
                <Input
                  placeholder="Ex: Contrato Padrão 2026"
                  value={form.nome}
                  onChange={(e) => setForm((f) => ({ ...f, nome: e.target.value }))}
                  maxLength={120}
                  className="h-9"
                />
              </div>
              <div className="space-y-1 w-[180px]">
                <Label className="text-xs">Tipo *</Label>
                <Select value={form.tipo} onValueChange={(v) => setForm((f) => ({ ...f, tipo: v as DocumentTemplate["tipo"] }))}>
                  <SelectTrigger className="h-9">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {TIPOS.map((t) => (
                      <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1 w-[200px]">
                <Label className="text-xs">Filial</Label>
                <Select value={form.filial_id} onValueChange={(v) => setForm((f) => ({ ...f, filial_id: v }))}>
                  <SelectTrigger className="h-9">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="todas">Global (todas)</SelectItem>
                    {filiais.map((f) => (
                      <SelectItem key={f.id} value={f.id}>{f.nome}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
               </div>
              {/* Logo upload */}
              <div className="space-y-1 min-w-[180px]">
                <Label className="text-xs">Logo do Modelo</Label>
                <div className="flex items-center gap-2">
                  {form.logo_url ? (
                    <div className="relative h-9 w-9 rounded border border-border overflow-hidden bg-muted">
                      <img src={form.logo_url} alt="Logo" className="h-full w-full object-contain" />
                      <button
                        type="button"
                        onClick={() => setForm((f) => ({ ...f, logo_url: "" }))}
                        className="absolute -top-1 -right-1 bg-destructive text-destructive-foreground rounded-full h-4 w-4 flex items-center justify-center text-[10px] leading-none"
                        title="Remover logo"
                      >×</button>
                    </div>
                  ) : (
                    <label className="cursor-pointer inline-flex items-center gap-1.5 h-9 px-3 rounded-md border border-border bg-background text-sm text-muted-foreground hover:bg-muted transition-colors">
                      {uploadingLogo ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Upload className="h-3.5 w-3.5" />}
                      {uploadingLogo ? "Enviando..." : "Enviar logo"}
                      <input type="file" accept="image/*" className="hidden" onChange={handleLogoUpload} disabled={uploadingLogo} />
                    </label>
                  )}
                </div>
              </div>
              <div className="flex items-center gap-2 pb-1">
                <Switch
                  checked={form.ativo}
                  onCheckedChange={(v) => setForm((f) => ({ ...f, ativo: v }))}
                  id="ativo-switch"
                />
                <Label htmlFor="ativo-switch" className="text-xs cursor-pointer">Ativo</Label>
              </div>
            </div>

            {/* Editor + Painel de variáveis */}
            <div className="flex flex-1 overflow-hidden">
              {/* Editor HTML */}
              <div className="flex-1 flex flex-col overflow-hidden">
                <div className="px-6 py-2 flex items-center justify-between bg-muted/30 border-b border-border shrink-0">
                  <span className="text-xs font-medium text-muted-foreground">Editor HTML</span>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    className="h-7 text-xs gap-1"
                    onClick={() => handlePreview(form.conteudo_html, form.logo_url)}
                  >
                    <Eye className="h-3 w-3" /> Preview
                  </Button>
                </div>
                <textarea
                  ref={editorRef}
                  value={form.conteudo_html}
                  onChange={(e) => setForm((f) => ({ ...f, conteudo_html: e.target.value }))}
                  className="flex-1 w-full resize-none p-4 font-mono text-sm bg-background text-foreground focus:outline-none border-0"
                  placeholder="Cole ou escreva o HTML do seu contrato aqui...&#10;&#10;Use variáveis como {{cliente.nome_fantasia}} para campos dinâmicos.&#10;Clique nas variáveis ao lado para inserir automaticamente."
                  spellCheck={false}
                />
              </div>

              {/* Painel lateral de variáveis */}
              <div className="w-[280px] border-l border-border bg-muted/20 shrink-0 overflow-hidden">
                <ContractVariablesPanel onInsert={handleInsertVariable} />
              </div>
            </div>

            {/* Footer */}
            <DialogFooter className="px-6 py-3 border-t border-border shrink-0">
              <Button type="button" variant="outline" onClick={() => setOpenEditor(false)}>
                Cancelar
              </Button>
              <Button type="submit" disabled={saving}>
                {saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                {editingModelo ? "Salvar Alterações" : "Criar Modelo"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Preview */}
      <ContractPreview
        open={previewOpen}
        onOpenChange={setPreviewOpen}
        html={previewHtml}
        dados={previewDados}
      />

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
    </AppLayout>
  );
}
