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
  Pencil, Trash2, CheckCircle, XCircle, Copy, Send, RefreshCw,
  Clock, AlertTriangle,
} from "lucide-react";
import { toast } from "sonner";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import {
  MetaVariavel, META_CAMPOS, META_CAMPOS_GRUPOS, getCampoMeta,
  sincronizarVariaveis, previewComExemplos,
} from "@/lib/meta-variaveis";


interface MetaButton {
  type: "QUICK_REPLY" | "URL" | "PHONE";
  text: string;
  url?: string;
  phone?: string;
}

interface MessageTemplate {
  id: string;
  nome: string;
  tipo: string;
  categoria: string;
  conteudo: string;
  descricao: string | null;
  ativo: boolean;
  setor_id: string | null;
  created_at: string;
  updated_at: string;
  meta_template_type?: string | null;
  meta_template_name?: string | null;
  meta_template_status?: string | null;
  meta_language?: string | null;
  meta_buttons?: MetaButton[] | null;
  meta_variaveis?: MetaVariavel[] | null;

}

interface Setor {
  id: string;
  nome: string;
}

const CANAL_META = "whatsapp_meta";

const TIPOS_MSG = [
  { value: "whatsapp", label: "WhatsApp" },
  { value: "email", label: "E-mail" },
  { value: "sms", label: "SMS" },
  { value: "telegram", label: "Telegram" },
  { value: CANAL_META, label: "WhatsApp API Meta (Oficial)" },
];

const META_TIPOS = [
  { value: "MARKETING", label: "Marketing", desc: "Promoções, ofertas, conteúdo" },
  { value: "UTILITY", label: "Utilitário", desc: "Atualizações de transação, alertas" },
  { value: "AUTHENTICATION", label: "Autenticação", desc: "Códigos de verificação, OTP" },
];

const META_IDIOMAS = ["pt_BR", "en_US", "es_ES"];

const META_STATUS: Record<string, { label: string; className: string }> = {
  pending: { label: "Pendente", className: "bg-amber-100 text-amber-700 border-amber-200 dark:bg-amber-900/30 dark:text-amber-400" },
  approved: { label: "Aprovado", className: "bg-emerald-100 text-emerald-700 border-emerald-200 dark:bg-emerald-900/30 dark:text-emerald-400" },
  rejected: { label: "Rejeitado", className: "bg-red-100 text-red-700 border-red-200 dark:bg-red-900/30 dark:text-red-400" },
};


const CATEGORIAS = [
  { value: "termo_aceite", label: "Termo de Aceite" },
  { value: "boas_vindas", label: "Boas-vindas" },
  { value: "cobranca", label: "Cobrança" },
  { value: "lembrete", label: "Lembrete" },
  { value: "cancelamento", label: "Cancelamento" },
  { value: "alerta_sla", label: "Alerta SLA" },
  { value: "outro", label: "Outro" },
];

const VARIAVEIS_DISPONIVEIS = [
  { var: "{contato.nome}", desc: "Nome do contato" },
  { var: "{cliente.nome_fantasia}", desc: "Nome fantasia do cliente" },
  { var: "{cliente.razao_social}", desc: "Razão social" },
  { var: "{contrato.numero}", desc: "Nº do contrato" },
  { var: "{contrato.numero_origem}", desc: "Nº do contrato de origem (base)" },
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
  { var: "{espelho.pedido}", desc: "Espelho completo do pedido" },
  { var: "{espelho.upgrade}", desc: "Espelho detalhado de Upgrade (config atual + desconto + nova config)" },
  { var: "{desconto.detalhes}", desc: "Detalhamento de descontos aplicados" },
  { var: "{desconto.motivo}", desc: "Motivo do desconto" },
  { var: "{margem.bruta}", desc: "Margem bruta % da mensalidade" },
  { var: "{margem.markup}", desc: "Markup % da mensalidade" },
  { var: "{margem.lucro}", desc: "Lucro bruto R$ da mensalidade" },
  { var: "{pedido.numero}", desc: "Nº do pedido" },
  { var: "{pedido.tipo}", desc: "Tipo do pedido" },
  { var: "{pedido.data}", desc: "Data do pedido" },
  { var: "{pedido.valor_implantacao}", desc: "Valor implantação do pedido" },
  { var: "{pedido.valor_mensalidade}", desc: "Valor mensalidade do pedido" },
  { var: "{pedido.valor_total}", desc: "Valor total do pedido" },
  { var: "{filial.nome}", desc: "Nome da filial" },
  { var: "{saudacao}", desc: "Saudação automática por horário" },
  { var: "{usuario.nome}", desc: "Nome do destinatário" },
  { var: "{status.anterior}", desc: "Status anterior do pedido" },
  { var: "{status.novo}", desc: "Novo status do pedido" },
];

export function MessageTemplates() {
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const [templates, setTemplates] = useState<MessageTemplate[]>([]);
  const [setores, setSetores] = useState<Setor[]>([]);
  const [loading, setLoading] = useState(true);
  const [openEditor, setOpenEditor] = useState(false);
  const [saving, setSaving] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [editingTemplate, setEditingTemplate] = useState<MessageTemplate | null>(null);
  const [enviandoMetaId, setEnviandoMetaId] = useState<string | null>(null);
  const [syncing, setSyncing] = useState(false);

  const emptyForm = {
    nome: "",
    tipo: "whatsapp",
    categoria: "termo_aceite",
    conteudo: "",
    descricao: "",
    ativo: true,
    setor_id: "" as string,
    meta_template_type: "UTILITY",
    meta_template_name: "",
    meta_template_status: "pending",
    meta_language: "pt_BR",
    meta_buttons: [] as MetaButton[],
    meta_variaveis: [] as MetaVariavel[],

  };

  const [form, setForm] = useState(emptyForm);

  async function loadData() {
    setLoading(true);
    const { data, error } = await supabase
      .from("message_templates")
      .select("*")
      .neq("tipo", "notificacao")
      .order("created_at", { ascending: false });
    if (error) toast.error("Erro ao carregar templates: " + error.message);
    setTemplates((data || []) as unknown as MessageTemplate[]);
    setLoading(false);
  }

  async function loadSetores() {
    const { data } = await supabase.from("setores").select("id, nome").eq("ativo", true).order("nome");
    if (data) setSetores(data as Setor[]);
  }

  useEffect(() => { loadData(); loadSetores(); }, []);

  function openNew() {
    setEditingTemplate(null);
    setForm(emptyForm);
    setOpenEditor(true);
  }

  function metaFieldsFrom(t: MessageTemplate) {
    return {
      meta_template_type: t.meta_template_type || "UTILITY",
      meta_template_name: t.meta_template_name || "",
      meta_template_status: t.meta_template_status || "pending",
      meta_language: t.meta_language || "pt_BR",
      meta_buttons: Array.isArray(t.meta_buttons) ? (t.meta_buttons as MetaButton[]) : [],
      meta_variaveis: Array.isArray(t.meta_variaveis) ? (t.meta_variaveis as MetaVariavel[]) : [],

    };
  }

  function openEdit(t: MessageTemplate) {
    setEditingTemplate(t);
    setForm({
      ...emptyForm,
      nome: t.nome,
      tipo: t.tipo,
      categoria: t.categoria,
      conteudo: t.conteudo,
      descricao: t.descricao || "",
      ativo: t.ativo,
      setor_id: t.setor_id || "",
      ...metaFieldsFrom(t),
    });
    setOpenEditor(true);
  }

  function handleDuplicate(t: MessageTemplate) {
    setEditingTemplate(null);
    setForm({
      ...emptyForm,
      nome: t.nome + " (cópia)",
      tipo: t.tipo,
      categoria: t.categoria,
      conteudo: t.conteudo,
      descricao: t.descricao || "",
      ativo: false,
      setor_id: t.setor_id || "",
      ...metaFieldsFrom(t),
      meta_template_name: "",
    });
    setOpenEditor(true);
  }


  function sanitizeTemplateBody(text: string) {
    return String(text || "")
      .replace(/\r\n/g, "\n")
      .replace(/\r/g, "\n")
      .split("\n")
      .map((l) => l.trimEnd())
      .join("\n")
      .replace(/\n{3,}/g, "\n\n")
      .replace(/[ \t]{2,}/g, " ")
      .trim();
  }

  const isMeta = form.tipo === CANAL_META;

  // Mantém o mapeamento sincronizado com as variáveis {{N}} do conteúdo
  useEffect(() => {
    if (!isMeta) return;
    setForm((f) => {
      const next = sincronizarVariaveis(f.conteudo, f.meta_variaveis);
      const igual =
        next.length === f.meta_variaveis.length &&
        next.every((v, i) => v === f.meta_variaveis[i]);
      return igual ? f : { ...f, meta_variaveis: next };
    });
  }, [form.conteudo, isMeta]);

  function atualizarVariavel(posicao: number, patch: Partial<MetaVariavel>) {
    setForm((f) => ({
      ...f,
      meta_variaveis: f.meta_variaveis.map((v) => v.posicao === posicao ? { ...v, ...patch } : v),
    }));
  }

  function trocarCampoVariavel(posicao: number, campo: string) {
    const def = getCampoMeta(campo);
    atualizarVariavel(posicao, {
      campo,
      label: def?.label || "",
      exemplo: campo === "custom" ? "" : (def?.exemplo || ""),
    });
  }


  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    if (!form.nome.trim()) { toast.error("Nome é obrigatório"); return; }
    if (!form.conteudo.trim()) { toast.error("Conteúdo é obrigatório"); return; }
    if (isMeta && form.meta_template_name && !/^[a-z0-9_]+$/.test(form.meta_template_name)) {
      toast.error("Nome do template na Meta: use apenas letras minúsculas, números e _");
      return;
    }

    setSaving(true);
    const payload: any = {
      nome: form.nome.trim(),
      tipo: form.tipo,
      categoria: form.categoria,
      conteudo: sanitizeTemplateBody(form.conteudo),
      descricao: form.descricao.trim() || null,
      ativo: form.ativo,
      setor_id: form.setor_id || null,
      meta_template_type: isMeta ? form.meta_template_type : null,
      meta_template_name: isMeta ? (form.meta_template_name.trim() || null) : null,
      meta_template_status: isMeta ? form.meta_template_status : null,
      meta_language: isMeta ? form.meta_language : null,
      meta_buttons: isMeta ? form.meta_buttons : [],
      meta_variaveis: isMeta ? form.meta_variaveis : [],

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

  async function enviarParaMeta(t: {
    id?: string;
    meta_template_name?: string | null;
    meta_template_type?: string | null;
    meta_language?: string | null;
    conteudo: string;
    meta_buttons?: MetaButton[] | null;
    meta_variaveis?: MetaVariavel[] | null;
  }) {
    const faltando: string[] = [];
    if (!t.meta_template_name) faltando.push("Nome do template na Meta");
    if (!t.meta_template_type) faltando.push("Tipo de template");
    if (!t.meta_language) faltando.push("Idioma");
    if (!t.conteudo?.trim()) faltando.push("Conteúdo");
    if (faltando.length) {
      toast.error("Campos obrigatórios: " + faltando.join(", "));
      return;
    }

    const variaveis = sincronizarVariaveis(t.conteudo, t.meta_variaveis || []);
    const semExemplo = variaveis.filter((v) => !v.exemplo?.trim()).map((v) => `{{${v.posicao}}}`);
    if (semExemplo.length) {
      toast.error(`A Meta exige exemplos para as variáveis: ${semExemplo.join(", ")}`);
      return;
    }

    setEnviandoMetaId(t.id || "form");
    const { data: cfg } = await supabase
      .from("integracoes_config")
      .select("config")
      .eq("nome", "whatsapp_meta")
      .eq("ativo", true)
      .maybeSingle();

    if (!cfg?.config) {
      setEnviandoMetaId(null);
      toast.error("Configure a integração WhatsApp Meta em Integrações antes de enviar.");
      return;
    }

    const { data, error } = await supabase.functions.invoke("whatsapp-meta", {
      body: {
        action: "create_template",
        name: t.meta_template_name,
        language: t.meta_language,
        category: t.meta_template_type,
        conteudo: sanitizeTemplateBody(t.conteudo),
        buttons: t.meta_buttons || [],
        examples: variaveis
          .sort((a, b) => a.posicao - b.posicao)
          .map((v) => v.exemplo.trim()),
      },
    });
    setEnviandoMetaId(null);


    const res = data as any;
    if (error || !res?.ok) {
      const msg = res?.error || error?.message || "Falha ao enviar";
      toast.error("Erro Meta: " + msg);
      return;
    }

    if (t.id) {
      await supabase
        .from("message_templates")
        .update({ meta_template_status: "pending", updated_at: new Date().toISOString() })
        .eq("id", t.id);
    }
    toast.success("Template enviado para aprovação! A Meta analisa em até 24 horas.");
    setForm((f) => ({ ...f, meta_template_status: "pending" }));
    loadData();
  }

  async function handleSyncMeta() {
    setSyncing(true);
    const { data, error } = await supabase.functions.invoke("whatsapp-meta", {
      body: { action: "sync_templates" },
    });
    setSyncing(false);
    const res = data as any;
    if (error || !res?.ok) {
      toast.error("Erro Meta: " + (res?.error || error?.message || "Falha ao sincronizar"));
      return;
    }
    const c = res.contagem || {};
    toast.success(`Status atualizado! ${c.approved || 0} aprovados, ${c.pending || 0} pendentes, ${c.rejected || 0} rejeitados`);
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

  function canSendToMeta(status?: string | null) {
    return !status || status === "rejected";
  }

  function MetaStatusBadge({ status }: { status?: string | null }) {
    const st = status && META_STATUS[status];
    if (!st) {
      return (
        <Badge variant="outline" className="text-[10px] bg-muted text-muted-foreground gap-1">
          <Send className="h-3 w-3" /> Não enviado
        </Badge>
      );
    }
    const icon = status === "approved" ? <CheckCircle className="h-3 w-3" /> : status === "rejected" ? <AlertTriangle className="h-3 w-3" /> : <Clock className="h-3 w-3" />;
    return (
      <Badge
        variant="outline"
        className={`text-[10px] gap-1 ${st.className}`}
        title={status === "rejected" ? "Template rejeitado pela Meta. Revise o conteúdo e reenvie." : status === "pending" ? "Template aguardando análise da Meta." : undefined}
      >
        {icon} {st.label}
      </Badge>
    );
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
        <div className="flex items-center gap-2">
          <Button variant="outline" className="gap-2" onClick={handleSyncMeta} disabled={syncing}>
            {syncing ? <Loader2 className="h-4 w-4 animate-spin" /> : <RefreshCw className="h-4 w-4" />}
            Atualizar status Meta
          </Button>
          <Button className="gap-2" onClick={openNew}>
            <Plus className="h-4 w-4" /> Novo Template
          </Button>
        </div>
      </div>

      <div className="bg-card rounded-xl border border-border shadow-sm overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow className="bg-muted/50">
              <TableHead>Nome</TableHead>
              <TableHead>Canal</TableHead>
              <TableHead>Categoria</TableHead>
              <TableHead>Setor</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Atualizado</TableHead>
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
            ) : templates.length === 0 ? (
              <TableRow>
                <TableCell colSpan={7} className="text-center py-16 text-muted-foreground">
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
                  <div className="flex flex-wrap items-center gap-1">
                    <Badge variant="outline" className="text-xs">{getTipoLabel(t.tipo)}</Badge>
                    {t.tipo === CANAL_META && <MetaStatusBadge status={t.meta_template_status} />}
                    {t.tipo === CANAL_META && canSendToMeta(t.meta_template_status) && (
                      <Button
                        type="button"
                        size="sm"
                        variant="ghost"
                        className="h-6 px-2 text-[10px] gap-1"
                        disabled={enviandoMetaId === t.id}
                        onClick={() => enviarParaMeta(t)}
                      >
                        {enviandoMetaId === t.id
                          ? <Loader2 className="h-3 w-3 animate-spin" />
                          : <Send className="h-3 w-3" />}
                        Enviar para Meta
                      </Button>
                    )}
                  </div>

                </TableCell>

                <TableCell>
                  <Badge variant="secondary" className="text-xs">{getCategoriaLabel(t.categoria)}</Badge>
                </TableCell>
                <TableCell>
                  <span className="text-xs text-muted-foreground">{t.setor_id ? setores.find(s => s.id === t.setor_id)?.nome || "—" : "—"}</span>
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
              <div className="space-y-1">
                <Label className="text-xs">Setor</Label>
                <Select value={form.setor_id || "_none"} onValueChange={(v) => setForm((f) => ({ ...f, setor_id: v === "_none" ? "" : v }))}>
                  <SelectTrigger className="h-9"><SelectValue placeholder="Nenhum" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="_none">Nenhum</SelectItem>
                    {setores.map((s) => (
                      <SelectItem key={s.id} value={s.id}>{s.nome}</SelectItem>
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

            {isMeta && (
              <div className="rounded-lg border border-border/60 bg-muted/30 p-3 space-y-3">
                <p className="text-xs font-semibold">Configuração Meta (WhatsApp Oficial)</p>
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <Label className="text-xs">Tipo de template</Label>
                    <Select value={form.meta_template_type} onValueChange={(v) => setForm((f) => ({ ...f, meta_template_type: v }))}>
                      <SelectTrigger className="h-9"><SelectValue /></SelectTrigger>
                      <SelectContent>
                        {META_TIPOS.map((t) => (
                          <SelectItem key={t.value} value={t.value}>
                            {t.label} — <span className="text-muted-foreground">{t.desc}</span>
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-1">
                    <Label className="text-xs">Idioma</Label>
                    <Select value={form.meta_language} onValueChange={(v) => setForm((f) => ({ ...f, meta_language: v }))}>
                      <SelectTrigger className="h-9"><SelectValue /></SelectTrigger>
                      <SelectContent>
                        {META_IDIOMAS.map((l) => <SelectItem key={l} value={l}>{l}</SelectItem>)}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-1">
                    <Label className="text-xs">Nome do template na Meta</Label>
                    <Input
                      placeholder="ex: cobranca_fatura"
                      value={form.meta_template_name}
                      onChange={(e) => setForm((f) => ({ ...f, meta_template_name: e.target.value.toLowerCase().replace(/[^a-z0-9_]/g, "_") }))}
                      className="h-9 font-mono text-xs"
                    />
                  </div>
                  <div className="space-y-1">
                    <Label className="text-xs">Status de aprovação</Label>
                    <Select value={form.meta_template_status} onValueChange={(v) => setForm((f) => ({ ...f, meta_template_status: v }))}>
                      <SelectTrigger className="h-9"><SelectValue /></SelectTrigger>
                      <SelectContent>
                        {Object.entries(META_STATUS).map(([k, v]) => <SelectItem key={k} value={k}>{v.label}</SelectItem>)}
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <Label className="text-xs">Botões interativos ({form.meta_buttons.length}/3)</Label>
                    <Button
                      type="button"
                      size="sm"
                      variant="outline"
                      className="h-7 text-xs"
                      disabled={form.meta_buttons.length >= 3}
                      onClick={() => setForm((f) => ({ ...f, meta_buttons: [...f.meta_buttons, { type: "QUICK_REPLY", text: "" }] }))}
                    >
                      Adicionar botão
                    </Button>
                  </div>
                  {form.meta_buttons.map((b, i) => (
                    <div key={i} className="flex gap-2 items-center">
                      <Select
                        value={b.type}
                        onValueChange={(v) => setForm((f) => ({
                          ...f,
                          meta_buttons: f.meta_buttons.map((x, ix) => ix === i ? { ...x, type: v as MetaButton["type"] } : x),
                        }))}
                      >
                        <SelectTrigger className="h-8 w-[140px] text-xs"><SelectValue /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="QUICK_REPLY">Resposta rápida</SelectItem>
                          <SelectItem value="URL">Link (URL)</SelectItem>
                          <SelectItem value="PHONE">Telefone</SelectItem>
                        </SelectContent>
                      </Select>
                      <Input
                        placeholder="Texto do botão"
                        value={b.text}
                        maxLength={25}
                        onChange={(e) => setForm((f) => ({
                          ...f,
                          meta_buttons: f.meta_buttons.map((x, ix) => ix === i ? { ...x, text: e.target.value } : x),
                        }))}
                        className="h-8 text-xs flex-1"
                      />
                      {b.type !== "QUICK_REPLY" && (
                        <Input
                          placeholder={b.type === "URL" ? "https://..." : "+5584..."}
                          value={b.type === "URL" ? (b.url || "") : (b.phone || "")}
                          onChange={(e) => setForm((f) => ({
                            ...f,
                            meta_buttons: f.meta_buttons.map((x, ix) => ix === i
                              ? (x.type === "URL" ? { ...x, url: e.target.value } : { ...x, phone: e.target.value })
                              : x),
                          }))}
                          className="h-8 text-xs flex-1"
                        />
                      )}
                      <Button
                        type="button"
                        size="icon"
                        variant="ghost"
                        className="h-8 w-8"
                        onClick={() => setForm((f) => ({ ...f, meta_buttons: f.meta_buttons.filter((_, ix) => ix !== i) }))}
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </Button>
                    </div>
                  ))}
                </div>
              </div>
            )}


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

            {isMeta && (
              <div className="rounded-lg border border-border/60 bg-muted/30 p-3 space-y-3">
                <div>
                  <p className="text-xs font-semibold">📋 Mapeamento de Variáveis</p>
                  <p className="text-[11px] text-muted-foreground">
                    Defina o que cada {"{{N}}"} representa. A Meta exige exemplos para aprovar templates com variáveis.
                  </p>
                </div>

                {form.meta_variaveis.length === 0 ? (
                  <p className="text-xs text-muted-foreground">
                    Nenhuma variável detectada. Use {"{{1}}"}, {"{{2}}"}... no conteúdo.
                  </p>
                ) : (
                  <div className="space-y-2">
                    {form.meta_variaveis.map((v) => (
                      <div key={v.posicao} className="flex items-center gap-2">
                        <span className="font-mono text-xs text-primary w-12 shrink-0">{`{{${v.posicao}}}`}</span>
                        <span className="text-muted-foreground text-xs">→</span>
                        <Select value={v.campo} onValueChange={(val) => trocarCampoVariavel(v.posicao, val)}>
                          <SelectTrigger className="h-8 w-[240px] text-xs">
                            <SelectValue placeholder="Campo do sistema" />
                          </SelectTrigger>
                          <SelectContent>
                            {META_CAMPOS_GRUPOS.map((g) => (
                              <div key={g}>
                                <div className="px-2 py-1 text-[10px] uppercase text-muted-foreground">{g}</div>
                                {META_CAMPOS.filter((c) => c.grupo === g).map((c) => (
                                  <SelectItem key={c.campo} value={c.campo}>{c.label}</SelectItem>
                                ))}
                              </div>
                            ))}
                          </SelectContent>
                        </Select>
                        <Input
                          placeholder={v.campo === "custom" ? "Texto fixo" : "Exemplo"}
                          value={v.exemplo}
                          onChange={(e) => atualizarVariavel(v.posicao, { exemplo: e.target.value })}
                          className="h-8 text-xs flex-1"
                        />
                      </div>
                    ))}
                  </div>
                )}

                <div>
                  <Label className="text-xs">Preview</Label>
                  <div className="mt-1 rounded-lg bg-emerald-50 dark:bg-emerald-950/20 border border-emerald-200 dark:border-emerald-900 p-3 text-sm whitespace-pre-wrap">
                    {previewComExemplos(form.conteudo, form.meta_variaveis) || "—"}
                  </div>
                </div>
              </div>
            )}



            <div className="flex items-center gap-2">
              <Switch
                checked={form.ativo}
                onCheckedChange={(v) => setForm((f) => ({ ...f, ativo: v }))}
                id="msg-ativo"
              />
              <Label htmlFor="msg-ativo" className="text-xs cursor-pointer">Ativo</Label>
            </div>

            <DialogFooter>
              {isMeta && canSendToMeta(form.meta_template_status) && (
                <Button
                  type="button"
                  variant="secondary"
                  className="mr-auto gap-2"
                  disabled={enviandoMetaId !== null}
                  onClick={() => enviarParaMeta({
                    id: editingTemplate?.id,
                    meta_template_name: form.meta_template_name,
                    meta_template_type: form.meta_template_type,
                    meta_language: form.meta_language,
                    conteudo: form.conteudo,
                    meta_buttons: form.meta_buttons,
                  })}
                >
                  {enviandoMetaId ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
                  Enviar para aprovação Meta
                </Button>
              )}
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
