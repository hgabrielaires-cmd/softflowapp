import { useState, useEffect, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
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
  MessageSquare, Plus, Loader2, MoreHorizontal,
  Pencil, Trash2, CheckCircle, XCircle, Copy,
} from "lucide-react";
import { toast } from "sonner";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";

interface MessageTemplate {
  id: string;
  nome: string;
  tipo: string;
  categoria: string;
  conteudo: string;
  descricao: string | null;
  ativo: boolean;
  created_at: string;
  updated_at: string;
}

const TIPOS_MSG = [
  { value: "whatsapp", label: "WhatsApp" },
  { value: "email", label: "E-mail" },
  { value: "sms", label: "SMS" },
];

const CATEGORIAS = [
  { value: "termo_aceite", label: "Termo de Aceite" },
  { value: "boas_vindas", label: "Boas-vindas" },
  { value: "cobranca", label: "Cobrança" },
  { value: "lembrete", label: "Lembrete" },
  { value: "cancelamento", label: "Cancelamento" },
  { value: "outro", label: "Outro" },
];

const VARIAVEIS_DISPONIVEIS = [
  { var: "{contato.nome}", desc: "Nome do contato" },
  { var: "{cliente.nome_fantasia}", desc: "Nome fantasia do cliente" },
  { var: "{cliente.razao_social}", desc: "Razão social" },
  { var: "{contrato.numero}", desc: "Nº do contrato" },
  { var: "{plano.nome}", desc: "Nome do plano" },
  { var: "{plano.nome_anterior}", desc: "Nome do plano anterior" },
  { var: "{plano.valor_base}", desc: "Valor base do plano" },
  { var: "{valores.implantacao}", desc: "Valor implantação" },
  { var: "{valores.mensalidade}", desc: "Valor mensalidade" },
  { var: "{valores.mensalidade_atual}", desc: "Mensalidade atual (antes da alteração)" },
  { var: "{valores.nova_mensalidade}", desc: "Nova mensalidade após alteração" },
  { var: "{valores.plano_anterior}", desc: "Valor do plano anterior" },
  { var: "{valores.adicionais_anteriores}", desc: "Valor dos adicionais anteriores" },
  { var: "{valores.total_anterior}", desc: "Total mensal anterior" },
  { var: "{modulos.adicionais_anteriores}", desc: "Lista de adicionais anteriores" },
  { var: "{modulos.adicionais_novos}", desc: "Lista de novos adicionais incluídos" },
  { var: "{valores.total_adicionais_novos}", desc: "Total dos novos adicionais" },
  { var: "{regras.mensalidade}", desc: "Regras de mensalidade" },
  { var: "{link_assinatura}", desc: "Link de assinatura" },
  { var: "{empresa.nome}", desc: "Nome da empresa" },
  { var: "{vendedor.nome}", desc: "Nome do vendedor" },
];

export function MessageTemplates() {
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const [templates, setTemplates] = useState<MessageTemplate[]>([]);
  const [loading, setLoading] = useState(true);
  const [openEditor, setOpenEditor] = useState(false);
  const [saving, setSaving] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [editingTemplate, setEditingTemplate] = useState<MessageTemplate | null>(null);

  const [form, setForm] = useState({
    nome: "",
    tipo: "whatsapp",
    categoria: "termo_aceite",
    conteudo: "",
    descricao: "",
    ativo: true,
  });

  async function loadData() {
    setLoading(true);
    const { data, error } = await supabase
      .from("message_templates")
      .select("*")
      .order("created_at", { ascending: false });
    if (error) toast.error("Erro ao carregar templates: " + error.message);
    setTemplates((data || []) as MessageTemplate[]);
    setLoading(false);
  }

  useEffect(() => { loadData(); }, []);

  function openNew() {
    setEditingTemplate(null);
    setForm({ nome: "", tipo: "whatsapp", categoria: "termo_aceite", conteudo: "", descricao: "", ativo: true });
    setOpenEditor(true);
  }

  function openEdit(t: MessageTemplate) {
    setEditingTemplate(t);
    setForm({
      nome: t.nome,
      tipo: t.tipo,
      categoria: t.categoria,
      conteudo: t.conteudo,
      descricao: t.descricao || "",
      ativo: t.ativo,
    });
    setOpenEditor(true);
  }

  function handleDuplicate(t: MessageTemplate) {
    setEditingTemplate(null);
    setForm({
      nome: t.nome + " (cópia)",
      tipo: t.tipo,
      categoria: t.categoria,
      conteudo: t.conteudo,
      descricao: t.descricao || "",
      ativo: false,
    });
    setOpenEditor(true);
  }

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    if (!form.nome.trim()) { toast.error("Nome é obrigatório"); return; }
    if (!form.conteudo.trim()) { toast.error("Conteúdo é obrigatório"); return; }

    setSaving(true);
    const payload = {
      nome: form.nome.trim(),
      tipo: form.tipo,
      categoria: form.categoria,
      conteudo: form.conteudo,
      descricao: form.descricao.trim() || null,
      ativo: form.ativo,
    };

    if (editingTemplate) {
      const { error } = await supabase.from("message_templates").update(payload).eq("id", editingTemplate.id);
      if (error) { toast.error("Erro ao atualizar: " + error.message); setSaving(false); return; }
    } else {
      const { error } = await supabase.from("message_templates").insert(payload);
      if (error) { toast.error("Erro ao criar: " + error.message); setSaving(false); return; }
    }

    toast.success(editingTemplate ? "Template atualizado!" : "Template criado!");
    setSaving(false);
    setOpenEditor(false);
    loadData();
  }

  async function handleToggleAtivo(t: MessageTemplate) {
    const { error } = await supabase.from("message_templates").update({ ativo: !t.ativo }).eq("id", t.id);
    if (error) { toast.error("Erro ao atualizar status"); return; }
    toast.success(t.ativo ? "Template inativado" : "Template ativado");
    loadData();
  }

  async function handleDelete(id: string) {
    const { error } = await supabase.from("message_templates").delete().eq("id", id);
    if (error) { toast.error("Erro ao excluir: " + error.message); return; }
    toast.success("Template excluído");
    setDeletingId(null);
    loadData();
  }

  function insertVariable(v: string) {
    const textarea = textareaRef.current;
    if (textarea) {
      const start = textarea.selectionStart;
      const end = textarea.selectionEnd;
      const text = form.conteudo;
      const newText = text.substring(0, start) + v + text.substring(end);
      setForm((f) => ({ ...f, conteudo: newText }));
      requestAnimationFrame(() => {
        textarea.focus();
        const pos = start + v.length;
        textarea.setSelectionRange(pos, pos);
      });
    } else {
      setForm((f) => ({ ...f, conteudo: f.conteudo + v }));
    }
  }

  function getCategoriaLabel(cat: string) {
    return CATEGORIAS.find((c) => c.value === cat)?.label || cat;
  }

  function getTipoLabel(tipo: string) {
    return TIPOS_MSG.find((t) => t.value === tipo)?.label || tipo;
  }

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-semibold text-foreground flex items-center gap-2">
            <MessageSquare className="h-5 w-5 text-primary" />
            Templates de Mensagens
          </h2>
          <p className="text-sm text-muted-foreground">
            Gerencie os modelos de mensagens para WhatsApp, e-mail e SMS
          </p>
        </div>
        <Button className="gap-2" onClick={openNew}>
          <Plus className="h-4 w-4" /> Novo Template
        </Button>
      </div>

      <div className="bg-card rounded-xl border border-border shadow-sm overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow className="bg-muted/50">
              <TableHead>Nome</TableHead>
              <TableHead>Canal</TableHead>
              <TableHead>Categoria</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Atualizado</TableHead>
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
            ) : templates.length === 0 ? (
              <TableRow>
                <TableCell colSpan={6} className="text-center py-16 text-muted-foreground">
                  <MessageSquare className="h-8 w-8 mx-auto mb-2 opacity-30" />
                  Nenhum template cadastrado ainda
                </TableCell>
              </TableRow>
            ) : templates.map((t) => (
              <TableRow key={t.id}>
                <TableCell>
                  <div>
                    <span className="font-medium">{t.nome}</span>
                    {t.descricao && (
                      <p className="text-xs text-muted-foreground mt-0.5 line-clamp-1">{t.descricao}</p>
                    )}
                  </div>
                </TableCell>
                <TableCell>
                  <Badge variant="outline" className="text-xs">{getTipoLabel(t.tipo)}</Badge>
                </TableCell>
                <TableCell>
                  <Badge variant="secondary" className="text-xs">{getCategoriaLabel(t.categoria)}</Badge>
                </TableCell>
                <TableCell>
                  <button onClick={() => handleToggleAtivo(t)} className="flex items-center gap-1.5 group" title={t.ativo ? "Clique para inativar" : "Clique para ativar"}>
                    {t.ativo ? (
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
                <TableCell className="text-sm text-muted-foreground whitespace-nowrap">
                  {format(new Date(t.updated_at), "dd/MM/yyyy", { locale: ptBR })}
                </TableCell>
                <TableCell className="text-right">
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="ghost" size="icon" className="h-7 w-7">
                        <MoreHorizontal className="h-4 w-4" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end" className="w-44">
                      <DropdownMenuItem onClick={() => openEdit(t)} className="cursor-pointer">
                        <Pencil className="h-4 w-4 mr-2" /> Editar
                      </DropdownMenuItem>
                      <DropdownMenuItem onClick={() => handleDuplicate(t)} className="cursor-pointer">
                        <Copy className="h-4 w-4 mr-2" /> Duplicar
                      </DropdownMenuItem>
                      <DropdownMenuSeparator />
                      <DropdownMenuItem onClick={() => setDeletingId(t.id)} className="cursor-pointer text-destructive focus:text-destructive">
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

      {/* Editor Dialog */}
      <Dialog open={openEditor} onOpenChange={setOpenEditor}>
        <DialogContent className="max-w-6xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <MessageSquare className="h-4 w-4 text-primary" />
              {editingTemplate ? "Editar Template" : "Novo Template de Mensagem"}
            </DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSave} className="flex flex-col gap-4">
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1 col-span-2">
                <Label className="text-xs">Nome *</Label>
                <Input
                  placeholder="Ex: Termo de Aceite - WhatsApp"
                  value={form.nome}
                  onChange={(e) => setForm((f) => ({ ...f, nome: e.target.value }))}
                  className="h-9"
                />
              </div>
              <div className="space-y-1">
                <Label className="text-xs">Canal</Label>
                <Select value={form.tipo} onValueChange={(v) => setForm((f) => ({ ...f, tipo: v }))}>
                  <SelectTrigger className="h-9"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {TIPOS_MSG.map((t) => (
                      <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1">
                <Label className="text-xs">Categoria</Label>
                <Select value={form.categoria} onValueChange={(v) => setForm((f) => ({ ...f, categoria: v }))}>
                  <SelectTrigger className="h-9"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {CATEGORIAS.map((c) => (
                      <SelectItem key={c.value} value={c.value}>{c.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1 col-span-2">
                <Label className="text-xs">Descrição (opcional)</Label>
                <Input
                  placeholder="Breve descrição do uso deste template"
                  value={form.descricao}
                  onChange={(e) => setForm((f) => ({ ...f, descricao: e.target.value }))}
                  className="h-9"
                />
              </div>
            </div>

            <div className="flex gap-3">
              <div className="flex-1 flex flex-col space-y-1">
                <Label className="text-xs">Conteúdo da Mensagem *</Label>
                <Textarea
                  ref={textareaRef}
                  value={form.conteudo}
                  onChange={(e) => setForm((f) => ({ ...f, conteudo: e.target.value }))}
                  placeholder="Digite o conteúdo da mensagem..."
                  className="min-h-[400px] resize-vertical font-mono text-sm"
                />
              </div>
              <div className="w-[220px] shrink-0 flex flex-col space-y-1">
                <Label className="text-xs">Variáveis disponíveis</Label>
                <div className="max-h-[400px] overflow-y-auto rounded-md border border-border bg-muted/30 p-2 space-y-1">
                  {VARIAVEIS_DISPONIVEIS.map((v) => (
                    <button
                      key={v.var}
                      type="button"
                      onClick={() => insertVariable(v.var)}
                      className="w-full text-left px-2 py-1.5 rounded text-xs hover:bg-accent transition-colors group"
                    >
                      <code className="text-primary font-mono text-[11px]">{v.var}</code>
                      <p className="text-muted-foreground text-[10px] mt-0.5">{v.desc}</p>
                    </button>
                  ))}
                </div>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <Switch
                checked={form.ativo}
                onCheckedChange={(v) => setForm((f) => ({ ...f, ativo: v }))}
                id="msg-ativo"
              />
              <Label htmlFor="msg-ativo" className="text-xs cursor-pointer">Ativo</Label>
            </div>

            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setOpenEditor(false)}>
                Cancelar
              </Button>
              <Button type="submit" disabled={saving}>
                {saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                {editingTemplate ? "Salvar Alterações" : "Criar Template"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Delete confirmation */}
      <AlertDialog open={!!deletingId} onOpenChange={() => setDeletingId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Excluir template?</AlertDialogTitle>
            <AlertDialogDescription>
              Esta ação não pode ser desfeita. O template será removido permanentemente.
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
