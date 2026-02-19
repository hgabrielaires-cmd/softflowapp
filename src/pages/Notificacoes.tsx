import { useState, useEffect } from "react";
import { AppLayout } from "@/components/AppLayout";
import { useAuth } from "@/context/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
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
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { Bell, Plus, Trash2, Loader2, Users, User, Globe, Info, AlertTriangle, Zap } from "lucide-react";
import { toast } from "sonner";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { ROLE_LABELS, AppRole } from "@/lib/supabase-types";

const TIPO_CONFIG = {
  info: { label: "Informativo", icon: Info, color: "bg-blue-100 text-blue-700" },
  aviso: { label: "Aviso", icon: AlertTriangle, color: "bg-amber-100 text-amber-700" },
  urgente: { label: "Urgente", icon: Zap, color: "bg-red-100 text-red-700" },
};

const ROLES: AppRole[] = ["admin", "financeiro", "vendedor", "operacional", "tecnico"];

interface Notificacao {
  id: string;
  titulo: string;
  mensagem: string;
  tipo: string;
  destinatario_user_id: string | null;
  destinatario_role: string | null;
  criado_por: string;
  created_at: string;
}

export default function Notificacoes() {
  const { profile, isAdmin } = useAuth();
  const [notificacoes, setNotificacoes] = useState<Notificacao[]>([]);
  const [loading, setLoading] = useState(true);
  const [openDialog, setOpenDialog] = useState(false);
  const [saving, setSaving] = useState(false);

  const [form, setForm] = useState({
    titulo: "",
    mensagem: "",
    tipo: "info",
    destino: "todos", // 'todos' | 'role:admin' | 'role:vendedor' | etc.
  });

  async function loadNotificacoes() {
    setLoading(true);
    const { data } = await supabase
      .from("notificacoes")
      .select("*")
      .order("created_at", { ascending: false });
    setNotificacoes((data || []) as Notificacao[]);
    setLoading(false);
  }

  useEffect(() => { loadNotificacoes(); }, []);

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    if (!form.titulo.trim() || !form.mensagem.trim()) {
      toast.error("Título e mensagem são obrigatórios");
      return;
    }
    setSaving(true);

    let destinatario_user_id: string | null = null;
    let destinatario_role: string | null = null;

    if (form.destino.startsWith("role:")) {
      destinatario_role = form.destino.replace("role:", "");
    }
    // 'todos' → ambos nulos

    const { error } = await supabase.from("notificacoes").insert({
      titulo: form.titulo.trim(),
      mensagem: form.mensagem.trim(),
      tipo: form.tipo,
      destinatario_user_id,
      destinatario_role,
      criado_por: profile?.user_id,
    });

    if (error) {
      toast.error("Erro ao criar notificação: " + error.message);
    } else {
      toast.success("Notificação enviada com sucesso!");
      setOpenDialog(false);
      setForm({ titulo: "", mensagem: "", tipo: "info", destino: "todos" });
      loadNotificacoes();
    }
    setSaving(false);
  }

  async function handleDelete(id: string) {
    const { error } = await supabase.from("notificacoes").delete().eq("id", id);
    if (error) { toast.error("Erro ao excluir notificação"); return; }
    toast.success("Notificação excluída");
    loadNotificacoes();
  }

  function getDestinoLabel(n: Notificacao) {
    if (n.destinatario_role) {
      return (
        <span className="inline-flex items-center gap-1 text-xs bg-muted px-2 py-0.5 rounded-full">
          <Users className="h-3 w-3" />
          {ROLE_LABELS[n.destinatario_role as AppRole] || n.destinatario_role}
        </span>
      );
    }
    if (n.destinatario_user_id) {
      return (
        <span className="inline-flex items-center gap-1 text-xs bg-muted px-2 py-0.5 rounded-full">
          <User className="h-3 w-3" />
          Usuário específico
        </span>
      );
    }
    return (
      <span className="inline-flex items-center gap-1 text-xs bg-primary/10 text-primary px-2 py-0.5 rounded-full">
        <Globe className="h-3 w-3" />
        Todos
      </span>
    );
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
              <Bell className="h-6 w-6 text-primary" /> Notificações
            </h1>
            <p className="text-sm text-muted-foreground">
              Envie comunicados e avisos para os usuários do sistema
            </p>
          </div>
          <Button className="gap-2" onClick={() => setOpenDialog(true)}>
            <Plus className="h-4 w-4" /> Nova Notificação
          </Button>
        </div>

        {/* Tabela */}
        <div className="bg-card rounded-xl border border-border shadow-sm overflow-hidden">
          <Table>
            <TableHeader>
              <TableRow className="bg-muted/50">
                <TableHead>Tipo</TableHead>
                <TableHead>Título</TableHead>
                <TableHead>Mensagem</TableHead>
                <TableHead>Destinatário</TableHead>
                <TableHead>Data</TableHead>
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
              ) : notificacoes.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={6} className="text-center py-12 text-muted-foreground">
                    Nenhuma notificação enviada ainda
                  </TableCell>
                </TableRow>
              ) : notificacoes.map((n) => {
                const cfg = TIPO_CONFIG[n.tipo as keyof typeof TIPO_CONFIG] || TIPO_CONFIG.info;
                const Icon = cfg.icon;
                return (
                  <TableRow key={n.id}>
                    <TableCell>
                      <span className={`inline-flex items-center gap-1 text-xs font-medium px-2 py-0.5 rounded-full ${cfg.color}`}>
                        <Icon className="h-3 w-3" />
                        {cfg.label}
                      </span>
                    </TableCell>
                    <TableCell className="font-medium max-w-[180px] truncate">{n.titulo}</TableCell>
                    <TableCell className="text-sm text-muted-foreground max-w-[240px] truncate">{n.mensagem}</TableCell>
                    <TableCell>{getDestinoLabel(n)}</TableCell>
                    <TableCell className="text-sm text-muted-foreground">
                      {format(new Date(n.created_at), "dd/MM/yyyy HH:mm", { locale: ptBR })}
                    </TableCell>
                    <TableCell className="text-right">
                      <AlertDialog>
                        <AlertDialogTrigger asChild>
                          <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive hover:text-destructive">
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </AlertDialogTrigger>
                        <AlertDialogContent>
                          <AlertDialogHeader>
                            <AlertDialogTitle>Excluir notificação?</AlertDialogTitle>
                            <AlertDialogDescription>
                              Esta ação não pode ser desfeita. A notificação será removida para todos os usuários.
                            </AlertDialogDescription>
                          </AlertDialogHeader>
                          <AlertDialogFooter>
                            <AlertDialogCancel>Cancelar</AlertDialogCancel>
                            <AlertDialogAction onClick={() => handleDelete(n.id)} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
                              Excluir
                            </AlertDialogAction>
                          </AlertDialogFooter>
                        </AlertDialogContent>
                      </AlertDialog>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </div>
      </div>

      {/* Dialog nova notificação */}
      <Dialog open={openDialog} onOpenChange={setOpenDialog}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Bell className="h-4 w-4" /> Nova Notificação
            </DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSave} className="space-y-4">
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label>Tipo</Label>
                <Select value={form.tipo} onValueChange={(v) => setForm((f) => ({ ...f, tipo: v }))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {Object.entries(TIPO_CONFIG).map(([key, cfg]) => (
                      <SelectItem key={key} value={key}>{cfg.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label>Destinatário</Label>
                <Select value={form.destino} onValueChange={(v) => setForm((f) => ({ ...f, destino: v }))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="todos">Todos os usuários</SelectItem>
                    {ROLES.map((r) => (
                      <SelectItem key={r} value={`role:${r}`}>{ROLE_LABELS[r]}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="space-y-1.5">
              <Label>Título *</Label>
              <Input
                placeholder="Ex: Manutenção programada"
                value={form.titulo}
                onChange={(e) => setForm((f) => ({ ...f, titulo: e.target.value }))}
                maxLength={120}
              />
            </div>
            <div className="space-y-1.5">
              <Label>Mensagem *</Label>
              <Textarea
                placeholder="Descreva o comunicado..."
                value={form.mensagem}
                onChange={(e) => setForm((f) => ({ ...f, mensagem: e.target.value }))}
                rows={4}
              />
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setOpenDialog(false)}>Cancelar</Button>
              <Button type="submit" disabled={saving}>
                {saving && <Loader2 className="h-4 w-4 animate-spin mr-2" />}
                Enviar
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </AppLayout>
  );
}
