import { useState, useEffect, useRef, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Filial, DocumentTemplate, TemplateClause, ContractClause } from "@/lib/supabase-types";
import { ContractVariablesPanel } from "@/components/ContractVariablesPanel";
import { ContractPreview } from "@/components/ContractPreview";
import { ClauseEditor } from "@/components/ClauseEditor";
import { ClauseLibrary } from "@/components/ClauseLibrary";
import { getExampleData } from "@/lib/contract-variables";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
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
  FileText, Plus, Loader2, MoreHorizontal,
  Pencil, Trash2, Building2, CheckCircle, XCircle, Eye, Copy, Upload, ClipboardList,
} from "lucide-react";
import { toast } from "sonner";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { ScrollArea } from "@/components/ui/scroll-area";

const TIPO_ORDEM = "ORDEM_ATENDIMENTO";

function buildHtmlFromClauses(clauses: TemplateClause[]): string {
  const activeClauses = clauses
    .filter((c) => c.ativo)
    .sort((a, b) => a.ordem - b.ordem);
  if (activeClauses.length === 0) return "";
  return activeClauses
    .map((c, i) => {
      const titulo = `<p style="margin-top:20px;margin-bottom:8px;"><strong>CLÁUSULA ${i + 1}ª - ${c.titulo.toUpperCase()}</strong></p>`;
      return titulo + "\n" + c.conteudo_html;
    })
    .join("\n\n");
}

interface OrdemAtendimentoTabProps {
  filiais: Filial[];
}

export function OrdemAtendimentoTab({ filiais }: OrdemAtendimentoTabProps) {
  const editorRef = useRef<HTMLTextAreaElement>(null);

  const [modelos, setModelos] = useState<DocumentTemplate[]>([]);
  const [loading, setLoading] = useState(true);
  const [openEditor, setOpenEditor] = useState(false);
  const [saving, setSaving] = useState(false);
  const [uploadingLogo, setUploadingLogo] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [editingModelo, setEditingModelo] = useState<DocumentTemplate | null>(null);
  const [previewOpen, setPreviewOpen] = useState(false);
  const [previewHtml, setPreviewHtml] = useState("");
  const [libraryOpen, setLibraryOpen] = useState(false);

  const [clauses, setClauses] = useState<TemplateClause[]>([]);
  const [loadingClauses, setLoadingClauses] = useState(false);

  const [form, setForm] = useState({
    nome: "",
    filial_id: "todas",
    ativo: true,
    conteudo_html: "",
    logo_url: "" as string | null,
    usa_clausulas: true,
  });

  async function loadData() {
    setLoading(true);
    const { data, error } = await supabase
      .from("document_templates")
      .select("*, filiais(nome)")
      .eq("tipo", TIPO_ORDEM)
      .order("created_at", { ascending: false });
    if (error) toast.error("Erro ao carregar modelos: " + error.message);
    setModelos((data || []) as unknown as DocumentTemplate[]);
    setLoading(false);
  }

  useEffect(() => { loadData(); }, []);

  async function loadTemplateClauses(templateId: string) {
    setLoadingClauses(true);
    const { data, error } = await supabase
      .from("template_clauses")
      .select("*")
      .eq("template_id", templateId)
      .order("ordem");
    if (error) toast.error("Erro ao carregar cláusulas: " + error.message);
    setClauses((data || []) as TemplateClause[]);
    setLoadingClauses(false);
  }

  function openNew() {
    setEditingModelo(null);
    setForm({ nome: "", filial_id: "todas", ativo: true, conteudo_html: "", logo_url: "", usa_clausulas: true });
    setClauses([]);
    setOpenEditor(true);
  }

  function openEdit(modelo: DocumentTemplate) {
    setEditingModelo(modelo);
    setForm({
      nome: modelo.nome,
      filial_id: modelo.filial_id ?? "todas",
      ativo: modelo.ativo,
      conteudo_html: modelo.conteudo_html,
      logo_url: modelo.logo_url ?? "",
      usa_clausulas: modelo.usa_clausulas,
    });
    if (modelo.usa_clausulas) {
      loadTemplateClauses(modelo.id);
    } else {
      setClauses([]);
    }
    setOpenEditor(true);
  }

  function handleDuplicate(modelo: DocumentTemplate) {
    setEditingModelo(null);
    setForm({
      nome: modelo.nome + " (cópia)",
      filial_id: modelo.filial_id ?? "todas",
      ativo: false,
      conteudo_html: modelo.conteudo_html,
      logo_url: modelo.logo_url ?? "",
      usa_clausulas: modelo.usa_clausulas,
    });
    if (modelo.usa_clausulas) {
      loadTemplateClauses(modelo.id);
    } else {
      setClauses([]);
    }
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
    requestAnimationFrame(() => {
      textarea.focus();
      const newPos = start + variable.length;
      textarea.setSelectionRange(newPos, newPos);
    });
  }, [form.conteudo_html]);

  function handleClauseChange(id: string, field: keyof TemplateClause, value: string) {
    setClauses((prev) => prev.map((c) => c.id === id ? { ...c, [field]: value } : c));
  }
  function handleClauseMoveUp(id: string) {
    setClauses((prev) => {
      const idx = prev.findIndex((c) => c.id === id);
      if (idx <= 0) return prev;
      const next = [...prev];
      [next[idx - 1], next[idx]] = [next[idx], next[idx - 1]];
      return next.map((c, i) => ({ ...c, ordem: i }));
    });
  }
  function handleClauseMoveDown(id: string) {
    setClauses((prev) => {
      const idx = prev.findIndex((c) => c.id === id);
      if (idx < 0 || idx >= prev.length - 1) return prev;
      const next = [...prev];
      [next[idx], next[idx + 1]] = [next[idx + 1], next[idx]];
      return next.map((c, i) => ({ ...c, ordem: i }));
    });
  }
  function handleClauseRemove(id: string) {
    setClauses((prev) => prev.filter((c) => c.id !== id).map((c, i) => ({ ...c, ordem: i })));
  }
  function handleAddNewClause() {
    const newClause: TemplateClause = {
      id: crypto.randomUUID(),
      template_id: editingModelo?.id || "",
      clause_id: null,
      titulo: "Nova Cláusula",
      conteudo_html: "",
      ordem: clauses.length,
      ativo: true,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };
    setClauses((prev) => [...prev, newClause]);
  }
  function handleSelectFromLibrary(clause: ContractClause) {
    const newClause: TemplateClause = {
      id: crypto.randomUUID(),
      template_id: editingModelo?.id || "",
      clause_id: clause.id,
      titulo: clause.titulo,
      conteudo_html: clause.conteudo_html,
      ordem: clauses.length,
      ativo: true,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };
    setClauses((prev) => [...prev, newClause]);
    toast.success(`Cláusula "${clause.titulo}" adicionada`);
  }

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    if (!form.nome.trim()) { toast.error("Nome é obrigatório"); return; }
    if (form.usa_clausulas) {
      if (clauses.length === 0) { toast.error("Adicione pelo menos uma cláusula"); return; }
    } else {
      if (!form.conteudo_html.trim()) { toast.error("O conteúdo HTML do modelo é obrigatório"); return; }
    }
    setSaving(true);
    const conteudoHtml = form.usa_clausulas ? buildHtmlFromClauses(clauses) : form.conteudo_html;
    const payload = {
      nome: form.nome.trim(),
      filial_id: form.filial_id === "todas" ? null : form.filial_id,
      tipo: TIPO_ORDEM,
      ativo: form.ativo,
      conteudo_html: conteudoHtml,
      logo_url: form.logo_url || null,
      usa_clausulas: form.usa_clausulas,
    };
    let templateId = editingModelo?.id;
    if (editingModelo) {
      const { error } = await supabase.from("document_templates").update(payload).eq("id", editingModelo.id);
      if (error) { toast.error("Erro ao atualizar: " + error.message); setSaving(false); return; }
    } else {
      const { data, error } = await supabase.from("document_templates").insert(payload).select("id").single();
      if (error) { toast.error("Erro ao criar: " + error.message); setSaving(false); return; }
      templateId = data.id;
    }
    if (form.usa_clausulas && templateId) {
      await supabase.from("template_clauses").delete().eq("template_id", templateId);
      if (clauses.length > 0) {
        const clausePayloads = clauses.map((c, i) => ({
          template_id: templateId!,
          clause_id: c.clause_id || null,
          titulo: c.titulo,
          conteudo_html: c.conteudo_html,
          ordem: i,
          ativo: c.ativo,
        }));
        const { error: clauseError } = await supabase.from("template_clauses").insert(clausePayloads);
        if (clauseError) { toast.error("Erro ao salvar cláusulas: " + clauseError.message); setSaving(false); return; }
      }
    }
    toast.success(editingModelo ? "Modelo atualizado!" : "Modelo criado!");
    setSaving(false);
    setOpenEditor(false);
    loadData();
  }

  async function handleToggleAtivo(modelo: DocumentTemplate) {
    const { error } = await supabase.from("document_templates").update({ ativo: !modelo.ativo }).eq("id", modelo.id);
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

  function handlePreviewFromEditor() {
    const html = form.usa_clausulas ? buildHtmlFromClauses(clauses) : form.conteudo_html;
    handlePreview(html, form.logo_url);
  }

  return (
    <>
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
                <TableHead>Modo</TableHead>
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
                    <Badge variant="secondary" className="text-xs">
                      {m.usa_clausulas ? "Cláusulas" : "HTML"}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <button onClick={() => handleToggleAtivo(m)} className="flex items-center gap-1.5 group" title={m.ativo ? "Clique para inativar" : "Clique para ativar"}>
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
                        <DropdownMenuItem onClick={() => setDeletingId(m.id)} className="cursor-pointer text-destructive focus:text-destructive">
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
              <ClipboardList className="h-4 w-4 text-primary" />
              {editingModelo ? "Editar Modelo de Ordem" : "Novo Modelo de Ordem de Atendimento"}
            </DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSave} className="flex flex-col flex-1 overflow-hidden">
            {/* Top bar */}
            <div className="px-6 py-3 border-b border-border shrink-0 flex flex-wrap gap-3 items-end">
              <div className="space-y-1 min-w-[200px] flex-1">
                <Label className="text-xs">Nome *</Label>
                <Input
                  placeholder="Ex: Ordem de Serviço - Instalação"
                  value={form.nome}
                  onChange={(e) => setForm((f) => ({ ...f, nome: e.target.value }))}
                  maxLength={120}
                  className="h-9"
                />
              </div>
              <div className="space-y-1 w-[200px]">
                <Label className="text-xs">Filial</Label>
                <Select value={form.filial_id} onValueChange={(v) => setForm((f) => ({ ...f, filial_id: v }))}>
                  <SelectTrigger className="h-9"><SelectValue /></SelectTrigger>
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
                <Switch checked={form.ativo} onCheckedChange={(v) => setForm((f) => ({ ...f, ativo: v }))} id="ordem-ativo-switch" />
                <Label htmlFor="ordem-ativo-switch" className="text-xs cursor-pointer">Ativo</Label>
              </div>
            </div>

            {/* Editor area */}
            <div className="flex flex-1 overflow-hidden">
              {form.usa_clausulas ? (
                <div className="flex-1 flex flex-col overflow-hidden">
                  <div className="px-6 py-2 flex items-center justify-between bg-muted/30 border-b border-border shrink-0">
                    <span className="text-xs font-medium text-muted-foreground">
                      Cláusulas da Ordem ({clauses.length})
                    </span>
                    <div className="flex items-center gap-2">
                      <Button type="button" variant="outline" size="sm" className="h-7 text-xs gap-1" onClick={() => setLibraryOpen(true)}>
                        <Plus className="h-3 w-3" /> Da Biblioteca
                      </Button>
                      <Button type="button" variant="outline" size="sm" className="h-7 text-xs gap-1" onClick={handleAddNewClause}>
                        <Plus className="h-3 w-3" /> Nova Cláusula
                      </Button>
                      <Button type="button" variant="outline" size="sm" className="h-7 text-xs gap-1" onClick={handlePreviewFromEditor}>
                        <Eye className="h-3 w-3" /> Preview
                      </Button>
                    </div>
                  </div>
                  <ScrollArea className="flex-1 px-4 py-3">
                    {loadingClauses ? (
                      <div className="flex justify-center py-12">
                        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
                      </div>
                    ) : clauses.length === 0 ? (
                      <div className="flex flex-col items-center justify-center py-16 text-muted-foreground">
                        <ClipboardList className="h-10 w-10 mb-3 opacity-30" />
                        <p className="text-sm">Nenhuma cláusula adicionada</p>
                        <p className="text-xs mt-1">Clique em "+ Nova Cláusula" ou busque na biblioteca</p>
                      </div>
                    ) : (
                      <div className="space-y-2">
                        {clauses.sort((a, b) => a.ordem - b.ordem).map((c, i) => (
                          <ClauseEditor
                            key={c.id}
                            clause={c}
                            index={i}
                            total={clauses.length}
                            onChange={handleClauseChange}
                            onMoveUp={handleClauseMoveUp}
                            onMoveDown={handleClauseMoveDown}
                            onRemove={handleClauseRemove}
                          />
                        ))}
                      </div>
                    )}
                  </ScrollArea>
                </div>
              ) : (
                <>
                  <div className="flex-1 flex flex-col overflow-hidden">
                    <div className="px-6 py-2 flex items-center justify-between bg-muted/30 border-b border-border shrink-0">
                      <span className="text-xs font-medium text-muted-foreground">Editor HTML</span>
                      <Button type="button" variant="outline" size="sm" className="h-7 text-xs gap-1" onClick={() => handlePreview(form.conteudo_html, form.logo_url)}>
                        <Eye className="h-3 w-3" /> Preview
                      </Button>
                    </div>
                    <textarea
                      ref={editorRef}
                      value={form.conteudo_html}
                      onChange={(e) => setForm((f) => ({ ...f, conteudo_html: e.target.value }))}
                      className="flex-1 w-full resize-none p-4 font-mono text-sm bg-background text-foreground focus:outline-none border-0"
                      placeholder="Cole ou escreva o HTML da sua ordem de atendimento aqui..."
                      spellCheck={false}
                    />
                  </div>
                  <div className="w-[280px] border-l border-border bg-muted/20 shrink-0 overflow-hidden">
                    <ContractVariablesPanel onInsert={handleInsertVariable} />
                  </div>
                </>
              )}
            </div>

            {/* Footer */}
            <DialogFooter className="px-6 py-3 border-t border-border shrink-0">
              <div className="flex items-center gap-2 mr-auto">
                <Switch checked={form.usa_clausulas} onCheckedChange={(v) => setForm((f) => ({ ...f, usa_clausulas: v }))} id="ordem-clausulas-switch" />
                <Label htmlFor="ordem-clausulas-switch" className="text-xs cursor-pointer">Modo Cláusulas</Label>
              </div>
              <Button type="button" variant="outline" onClick={() => setOpenEditor(false)}>Cancelar</Button>
              <Button type="submit" disabled={saving}>
                {saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                {editingModelo ? "Salvar Alterações" : "Criar Modelo"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Clause Library */}
      <ClauseLibrary open={libraryOpen} onOpenChange={setLibraryOpen} onSelect={handleSelectFromLibrary} onCreateNew={handleAddNewClause} />

      {/* Preview */}
      <ContractPreview open={previewOpen} onOpenChange={setPreviewOpen} html={previewHtml} dados={previewDados} />

      {/* Delete confirmation */}
      <AlertDialog open={!!deletingId} onOpenChange={() => setDeletingId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Excluir modelo?</AlertDialogTitle>
            <AlertDialogDescription>Esta ação não pode ser desfeita. O modelo será removido permanentemente.</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={() => deletingId && handleDelete(deletingId)} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">Excluir</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
