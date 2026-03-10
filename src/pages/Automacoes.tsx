import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { AppLayout } from "@/components/AppLayout";
import { useAuth } from "@/context/AuthContext";
import { Navigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { Plus, Loader2, Zap, Pencil, Trash2, Bell, MessageSquare, Clock } from "lucide-react";
import { toast } from "sonner";

// ─── Types ───────────────────────────────────────────────────────────────────

interface Automacao {
  id: string;
  nome: string;
  descricao: string | null;
  ativo: boolean;
  gatilho_tipo: string;
  gatilho_config: Record<string, any>;
  acao_tipo: string;
  acao_config: Record<string, any>;
  lembrete_ativo: boolean;
  lembrete_intervalo_horas: number | null;
  lembrete_maximo: number | null;
  created_at: string;
}

interface MessageTemplate {
  id: string;
  nome: string;
  tipo: string;
  categoria: string;
}

interface Profile {
  id: string;
  full_name: string;
}

const GATILHO_TIPOS = [
  { value: "pedido_status", label: "Pedido muda de status" },
  { value: "tempo_sem_acao_financeiro", label: "Pedido parado na fila do Financeiro" },
  { value: "contrato_enviado_assinatura", label: "Contrato enviado para assinatura" },
  { value: "contrato_cancelamento", label: "Contrato cancelado" },
  { value: "card_etapa", label: "Card muda de etapa no Painel" },
];

const ACAO_TIPOS = [
  { value: "whatsapp", label: "WhatsApp" },
  { value: "notificacao", label: "Notificação Interna" },
  { value: "whatsapp_e_notificacao", label: "WhatsApp + Notificação" },
];

const PEDIDO_STATUS_OPTIONS = [
  "Aguardando Financeiro",
  "Aprovado Financeiro",
  "Reprovado Financeiro",
  "Cancelado",
  "Aguardando Aprovação de Desconto",
  "Desconto Aprovado",
];

const TIPO_PEDIDO_OPTIONS = [
  { value: "", label: "Qualquer tipo" },
  { value: "Novo", label: "Novo (Contrato Base)" },
  { value: "Upgrade", label: "Upgrade" },
  { value: "Aditivo", label: "Módulo Adicional" },
  { value: "OA", label: "Ordem de Atendimento (OA)" },
];

const GATILHO_LABELS: Record<string, string> = {
  pedido_status: "Mudança de Status do Pedido",
  tempo_sem_acao_financeiro: "Tempo sem Ação (Financeiro)",
  contrato_enviado_assinatura: "Contrato Enviado p/ Assinatura",
  contrato_cancelamento: "Cancelamento de Contrato",
  card_etapa: "Mudança de Etapa no Painel",
};

const ACAO_LABELS: Record<string, string> = {
  whatsapp: "WhatsApp",
  notificacao: "Notificação",
  whatsapp_e_notificacao: "WhatsApp + Notificação",
};

// ─── Component ───────────────────────────────────────────────────────────────

export default function Automacoes() {
  const { isAdmin } = useAuth();
  if (!isAdmin) return <Navigate to="/dashboard" replace />;

  const [automacoes, setAutomacoes] = useState<Automacao[]>([]);
  const [templates, setTemplates] = useState<MessageTemplate[]>([]);
  const [usuarios, setUsuarios] = useState<Profile[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);

  // Form state
  const [nome, setNome] = useState("");
  const [descricao, setDescricao] = useState("");
  const [gatilhoTipo, setGatilhoTipo] = useState("");
  const [acaoTipo, setAcaoTipo] = useState("");
  const [templateId, setTemplateId] = useState("");
  const [destinatarioTipo, setDestinatarioTipo] = useState("role");
  const [destinatarioRole, setDestinatarioRole] = useState("");
  const [usuarioIds, setUsuarioIds] = useState<string[]>([]);
  const [lembreteAtivo, setLembreteAtivo] = useState(false);
  const [lembreteHoras, setLembreteHoras] = useState<number>(24);
  const [lembreteMaximo, setLembreteMaximo] = useState<number>(3);

  // Gatilho-specific
  const [statusDe, setStatusDe] = useState("");
  const [statusPara, setStatusPara] = useState("");
  const [tipoPedido, setTipoPedido] = useState("");
  const [horasSemAcao, setHorasSemAcao] = useState<number>(24);

  useEffect(() => {
    loadAll();
  }, []);

  async function loadAll() {
    setLoading(true);
    const [automRes, templRes, usersRes] = await Promise.all([
      supabase.from("automacoes").select("*").order("created_at", { ascending: false }),
      supabase.from("message_templates").select("id, nome, tipo, categoria").eq("ativo", true).order("nome"),
      supabase.from("profiles").select("id, full_name").eq("active", true).order("full_name"),
    ]);
    if (automRes.data) setAutomacoes(automRes.data as any);
    if (templRes.data) setTemplates(templRes.data);
    if (usersRes.data) setUsuarios(usersRes.data);
    setLoading(false);
  }

  function resetForm() {
    setNome("");
    setDescricao("");
    setGatilhoTipo("");
    setAcaoTipo("");
    setTemplateId("");
    setDestinatarioTipo("role");
    setDestinatarioRole("");
    setUsuarioIds([]);
    setLembreteAtivo(false);
    setLembreteHoras(24);
    setLembreteMaximo(3);
    setStatusDe("");
    setStatusPara("");
    setTipoPedido("");
    setHorasSemAcao(24);
    setEditingId(null);
  }

  function openNew() {
    resetForm();
    setDialogOpen(true);
  }

  function openEdit(a: Automacao) {
    setEditingId(a.id);
    setNome(a.nome);
    setDescricao(a.descricao || "");
    setGatilhoTipo(a.gatilho_tipo);
    setAcaoTipo(a.acao_tipo);
    setTemplateId(a.acao_config?.template_id || "");
    setDestinatarioTipo(a.acao_config?.destinatario_tipo || "role");
    setDestinatarioRole(a.acao_config?.destinatario_valor || "");
    setUsuarioIds(a.acao_config?.usuario_ids || []);
    setLembreteAtivo(a.lembrete_ativo);
    setLembreteHoras(a.lembrete_intervalo_horas || 24);
    setLembreteMaximo(a.lembrete_maximo || 3);
    setStatusDe(a.gatilho_config?.status_de || "");
    setStatusPara(a.gatilho_config?.status_para || "");
    setTipoPedido(a.gatilho_config?.tipo_pedido || "");
    setHorasSemAcao(a.gatilho_config?.horas || 24);
    setDialogOpen(true);
  }

  async function handleSave() {
    if (!nome.trim() || !gatilhoTipo || !acaoTipo) {
      toast.error("Preencha os campos obrigatórios: Nome, Gatilho e Ação.");
      return;
    }

    setSaving(true);

    let gatilhoConfig: Record<string, any> = {};
    if (gatilhoTipo === "pedido_status") {
      gatilhoConfig = { status_de: statusDe, status_para: statusPara, tipo_pedido: tipoPedido || null };
    } else if (gatilhoTipo === "tempo_sem_acao_financeiro") {
      gatilhoConfig = { modulo: "financeiro", horas: horasSemAcao, tipo_pedido: tipoPedido || null };
    }

    const acaoConfig: Record<string, any> = {
      template_id: templateId || null,
      destinatario_tipo: destinatarioTipo,
      destinatario_valor: destinatarioRole || null,
      usuario_ids: usuarioIds,
    };

    const payload = {
      nome: nome.trim(),
      descricao: descricao.trim() || null,
      gatilho_tipo: gatilhoTipo,
      gatilho_config: gatilhoConfig,
      acao_tipo: acaoTipo,
      acao_config: acaoConfig,
      lembrete_ativo: lembreteAtivo,
      lembrete_intervalo_horas: lembreteAtivo ? lembreteHoras : null,
      lembrete_maximo: lembreteAtivo ? lembreteMaximo : null,
    };

    let error;
    if (editingId) {
      ({ error } = await supabase.from("automacoes").update(payload).eq("id", editingId));
    } else {
      ({ error } = await supabase.from("automacoes").insert(payload));
    }

    setSaving(false);
    if (error) {
      toast.error("Erro ao salvar automação: " + error.message);
      return;
    }
    toast.success(editingId ? "Automação atualizada!" : "Automação criada!");
    setDialogOpen(false);
    resetForm();
    loadAll();
  }

  async function toggleAtivo(id: string, ativo: boolean) {
    const { error } = await supabase.from("automacoes").update({ ativo: !ativo }).eq("id", id);
    if (error) { toast.error("Erro: " + error.message); return; }
    setAutomacoes(prev => prev.map(a => a.id === id ? { ...a, ativo: !ativo } : a));
    toast.success(!ativo ? "Automação ativada" : "Automação desativada");
  }

  async function handleDelete(id: string) {
    if (!confirm("Excluir esta automação?")) return;
    const { error } = await supabase.from("automacoes").delete().eq("id", id);
    if (error) { toast.error("Erro: " + error.message); return; }
    setAutomacoes(prev => prev.filter(a => a.id !== id));
    toast.success("Automação excluída");
  }

  function toggleUsuarioId(uid: string) {
    setUsuarioIds(prev =>
      prev.includes(uid) ? prev.filter(x => x !== uid) : [...prev, uid]
    );
  }

  const acaoIcon = (tipo: string) => {
    if (tipo.includes("whatsapp")) return <MessageSquare className="h-3.5 w-3.5" />;
    return <Bell className="h-3.5 w-3.5" />;
  };

  return (
    <AppLayout>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-foreground">Automações</h1>
            <p className="text-sm text-muted-foreground">Configure alertas automáticos por WhatsApp e notificações internas</p>
          </div>
          <Button onClick={openNew}><Plus className="h-4 w-4 mr-2" />Nova Automação</Button>
        </div>

        {loading ? (
          <div className="flex justify-center py-12"><Loader2 className="h-8 w-8 animate-spin text-muted-foreground" /></div>
        ) : automacoes.length === 0 ? (
          <Card>
            <CardContent className="flex flex-col items-center justify-center py-12 text-center">
              <Zap className="h-12 w-12 text-muted-foreground/40 mb-4" />
              <p className="text-muted-foreground">Nenhuma automação configurada.</p>
              <Button variant="outline" className="mt-4" onClick={openNew}><Plus className="h-4 w-4 mr-2" />Criar primeira automação</Button>
            </CardContent>
          </Card>
        ) : (
          <div className="rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Nome</TableHead>
                  <TableHead>Gatilho</TableHead>
                  <TableHead>Ação</TableHead>
                  <TableHead>Lembrete</TableHead>
                  <TableHead className="text-center">Ativo</TableHead>
                  <TableHead className="w-24"></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {automacoes.map(a => (
                  <TableRow key={a.id}>
                    <TableCell>
                      <div>
                        <span className="font-medium">{a.nome}</span>
                        {a.descricao && <p className="text-xs text-muted-foreground mt-0.5">{a.descricao}</p>}
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline" className="text-xs">
                        {GATILHO_LABELS[a.gatilho_tipo] || a.gatilho_tipo}
                      </Badge>
                      {a.gatilho_tipo === "pedido_status" && a.gatilho_config?.status_para && (
                        <p className="text-xs text-muted-foreground mt-1">→ {a.gatilho_config.status_para}</p>
                      )}
                      {a.gatilho_tipo === "tempo_sem_acao_financeiro" && (
                        <p className="text-xs text-muted-foreground mt-1">{a.gatilho_config?.horas || 24}h sem ação</p>
                      )}
                      {a.gatilho_tipo === "contrato_enviado_assinatura" && (
                        <p className="text-xs text-muted-foreground mt-1">→ Vendedor do pedido</p>
                      )}
                      {(a.gatilho_config as any)?.tipo_pedido && (a.gatilho_config as any).tipo_pedido !== "qualquer" && (
                        <Badge variant="secondary" className="text-[10px] mt-1">{(a.gatilho_config as any).tipo_pedido}</Badge>
                      )}
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-1.5">
                        {acaoIcon(a.acao_tipo)}
                        <span className="text-sm">{ACAO_LABELS[a.acao_tipo] || a.acao_tipo}</span>
                      </div>
                    </TableCell>
                    <TableCell>
                      {a.lembrete_ativo ? (
                        <div className="flex items-center gap-1 text-sm">
                          <Clock className="h-3.5 w-3.5 text-muted-foreground" />
                          <span>A cada {a.lembrete_intervalo_horas}h (máx {a.lembrete_maximo}x)</span>
                        </div>
                      ) : (
                        <span className="text-xs text-muted-foreground">—</span>
                      )}
                    </TableCell>
                    <TableCell className="text-center">
                      <Switch checked={a.ativo} onCheckedChange={() => toggleAtivo(a.id, a.ativo)} />
                    </TableCell>
                    <TableCell>
                      <div className="flex gap-1">
                        <Button variant="ghost" size="icon" onClick={() => openEdit(a)}><Pencil className="h-4 w-4" /></Button>
                        <Button variant="ghost" size="icon" onClick={() => handleDelete(a.id)} className="text-destructive hover:text-destructive"><Trash2 className="h-4 w-4" /></Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}
      </div>

      {/* ─── Dialog ─── */}
      <Dialog open={dialogOpen} onOpenChange={(o) => { if (!o) { resetForm(); } setDialogOpen(o); }}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editingId ? "Editar Automação" : "Nova Automação"}</DialogTitle>
          </DialogHeader>

          <div className="space-y-6 py-2">
            {/* Nome e Descrição */}
            <div className="grid grid-cols-1 gap-4">
              <div className="space-y-2">
                <Label>Nome *</Label>
                <Input value={nome} onChange={e => setNome(e.target.value)} placeholder="Ex: Alerta pedido na fila do financeiro" />
              </div>
              <div className="space-y-2">
                <Label>Descrição</Label>
                <Textarea value={descricao} onChange={e => setDescricao(e.target.value)} placeholder="Descrição opcional" rows={2} />
              </div>
            </div>

            <Separator />

            {/* Gatilho */}
            <div className="space-y-4">
              <h3 className="text-sm font-semibold text-foreground flex items-center gap-2"><Zap className="h-4 w-4" />Gatilho (Quando disparar?)</h3>
              <div className="space-y-2">
                <Label>Tipo de Gatilho *</Label>
                <Select value={gatilhoTipo} onValueChange={setGatilhoTipo}>
                  <SelectTrigger><SelectValue placeholder="Selecione o gatilho" /></SelectTrigger>
                  <SelectContent>
                    {GATILHO_TIPOS.map(g => (
                      <SelectItem key={g.value} value={g.value}>{g.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {(gatilhoTipo === "pedido_status" || gatilhoTipo === "tempo_sem_acao_financeiro") && (
                <div className="space-y-2 pl-4 border-l-2 border-muted">
                  <Label>Tipo de Pedido (modalidade de venda)</Label>
                  <Select value={tipoPedido} onValueChange={setTipoPedido}>
                    <SelectTrigger><SelectValue placeholder="Qualquer tipo" /></SelectTrigger>
                    <SelectContent>
                      {TIPO_PEDIDO_OPTIONS.map(t => (
                        <SelectItem key={t.value || "any"} value={t.value || "qualquer"}>{t.label}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <p className="text-xs text-muted-foreground">Filtra a automação para disparar apenas para o tipo de pedido selecionado.</p>
                </div>
              )}
              {gatilhoTipo === "pedido_status" && (
                <div className="grid grid-cols-2 gap-4 pl-4 border-l-2 border-muted">
                  <div className="space-y-2">
                    <Label>Status de origem (opcional)</Label>
                    <Select value={statusDe} onValueChange={setStatusDe}>
                      <SelectTrigger><SelectValue placeholder="Qualquer" /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="qualquer">Qualquer</SelectItem>
                        {PEDIDO_STATUS_OPTIONS.map(s => (
                          <SelectItem key={s} value={s}>{s}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label>Status de destino *</Label>
                    <Select value={statusPara} onValueChange={setStatusPara}>
                      <SelectTrigger><SelectValue placeholder="Selecione" /></SelectTrigger>
                      <SelectContent>
                        {PEDIDO_STATUS_OPTIONS.map(s => (
                          <SelectItem key={s} value={s}>{s}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              )}

              {gatilhoTipo === "tempo_sem_acao_financeiro" && (
                <div className="pl-4 border-l-2 border-muted space-y-2">
                  <Label>Horas sem ação antes do alerta</Label>
                  <Input type="number" min={1} value={horasSemAcao} onChange={e => setHorasSemAcao(Number(e.target.value))} className="w-32" />
                  <p className="text-xs text-muted-foreground">O alerta será disparado quando o pedido ficar na fila do financeiro por esse tempo sem ser processado.</p>
                </div>
              )}
            </div>

            <Separator />

            {/* Ação */}
            <div className="space-y-4">
              <h3 className="text-sm font-semibold text-foreground flex items-center gap-2"><Bell className="h-4 w-4" />Ação (O que fazer?)</h3>
              <div className="space-y-2">
                <Label>Tipo de Ação *</Label>
                <Select value={acaoTipo} onValueChange={setAcaoTipo}>
                  <SelectTrigger><SelectValue placeholder="Selecione a ação" /></SelectTrigger>
                  <SelectContent>
                    {ACAO_TIPOS.map(a => (
                      <SelectItem key={a.value} value={a.value}>{a.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {(acaoTipo.includes("whatsapp")) && (
                <div className="space-y-2 pl-4 border-l-2 border-muted">
                  <Label>Template de Mensagem</Label>
                  <Select value={templateId} onValueChange={setTemplateId}>
                    <SelectTrigger><SelectValue placeholder="Selecione um template" /></SelectTrigger>
                    <SelectContent>
                      {templates.filter(t => t.tipo === "whatsapp").map(t => (
                        <SelectItem key={t.id} value={t.id}>{t.nome}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              )}

              {(acaoTipo.includes("notificacao")) && (
                <div className="space-y-2 pl-4 border-l-2 border-muted">
                  <Label>Template de Notificação</Label>
                  <Select value={!acaoTipo.includes("whatsapp") ? templateId : ""} onValueChange={(v) => { if (!acaoTipo.includes("whatsapp")) setTemplateId(v); }}>
                    <SelectTrigger><SelectValue placeholder="Selecione um template" /></SelectTrigger>
                    <SelectContent>
                      {templates.filter(t => t.tipo === "notificacao").map(t => (
                        <SelectItem key={t.id} value={t.id}>{t.nome}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              )}

              <div className="space-y-2">
                <Label>Destinatários</Label>
                <Select value={destinatarioTipo} onValueChange={setDestinatarioTipo}>
                  <SelectTrigger className="w-48"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="role">Por perfil (role)</SelectItem>
                    <SelectItem value="usuarios">Usuários específicos</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {destinatarioTipo === "role" && (
                <div className="space-y-2 pl-4 border-l-2 border-muted">
                  <Label>Perfil destinatário</Label>
                  <Select value={destinatarioRole} onValueChange={setDestinatarioRole}>
                    <SelectTrigger><SelectValue placeholder="Selecione" /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="admin">Administrador</SelectItem>
                      <SelectItem value="gestor">Gestor</SelectItem>
                      <SelectItem value="financeiro">Financeiro</SelectItem>
                      <SelectItem value="vendedor">Vendedor</SelectItem>
                      <SelectItem value="operacional">Operacional</SelectItem>
                      <SelectItem value="tecnico">Técnico</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              )}

              {destinatarioTipo === "usuarios" && (
                <div className="space-y-2 pl-4 border-l-2 border-muted">
                  <Label>Selecione os usuários</Label>
                  <div className="max-h-40 overflow-y-auto border rounded-md p-2 space-y-1">
                    {usuarios.map(u => (
                      <label key={u.id} className="flex items-center gap-2 text-sm cursor-pointer hover:bg-muted/50 px-2 py-1 rounded">
                        <input
                          type="checkbox"
                          checked={usuarioIds.includes(u.id)}
                          onChange={() => toggleUsuarioId(u.id)}
                          className="rounded"
                        />
                        {u.full_name}
                      </label>
                    ))}
                  </div>
                </div>
              )}
            </div>

            <Separator />

            {/* Lembrete */}
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-semibold text-foreground flex items-center gap-2"><Clock className="h-4 w-4" />Lembrete (Repetir?)</h3>
                <Switch checked={lembreteAtivo} onCheckedChange={setLembreteAtivo} />
              </div>

              {lembreteAtivo && (
                <div className="grid grid-cols-2 gap-4 pl-4 border-l-2 border-muted">
                  <div className="space-y-2">
                    <Label>Repetir a cada (horas)</Label>
                    <Input type="number" min={1} value={lembreteHoras} onChange={e => setLembreteHoras(Number(e.target.value))} />
                  </div>
                  <div className="space-y-2">
                    <Label>Máximo de repetições</Label>
                    <Input type="number" min={1} max={10} value={lembreteMaximo} onChange={e => setLembreteMaximo(Number(e.target.value))} />
                  </div>
                  <p className="col-span-2 text-xs text-muted-foreground">
                    O lembrete será enviado repetidamente no intervalo configurado até atingir o máximo ou a condição ser resolvida.
                  </p>
                </div>
              )}
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>Cancelar</Button>
            <Button onClick={handleSave} disabled={saving}>
              {saving && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              {editingId ? "Salvar" : "Criar Automação"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </AppLayout>
  );
}
