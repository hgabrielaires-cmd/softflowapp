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
import { Bell, Plus, Trash2, Loader2, Users, User, Globe, Info, AlertTriangle, Zap, Search, Send } from "lucide-react";
import { toast } from "sonner";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { ROLE_LABELS, AppRole } from "@/lib/supabase-types";

const TIPO_CONFIG = {
  info: { label: "Informativo", icon: Info, color: "bg-blue-100 text-blue-700 border-blue-200" },
  aviso: { label: "Aviso", icon: AlertTriangle, color: "bg-amber-100 text-amber-700 border-amber-200" },
  urgente: { label: "Urgente", icon: Zap, color: "bg-red-100 text-red-700 border-red-200" },
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

interface UsuarioSimples {
  user_id: string;
  full_name: string;
  email: string;
}

export default function Notificacoes() {
  const { profile, isAdmin } = useAuth();
  const [notificacoes, setNotificacoes] = useState<Notificacao[]>([]);
  const [usuarios, setUsuarios] = useState<UsuarioSimples[]>([]);
  const [usuariosNomesMap, setUsuariosNomesMap] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(true);
  const [openDialog, setOpenDialog] = useState(false);
  const [saving, setSaving] = useState(false);

  // Busca de usuário no form
  const [userSearch, setUserSearch] = useState("");
  const [showUserDropdown, setShowUserDropdown] = useState(false);
  const [selectedUser, setSelectedUser] = useState<UsuarioSimples | null>(null);

  const [form, setForm] = useState({
    titulo: "",
    mensagem: "",
    tipo: "info",
    destino: "todos", // 'todos' | 'role:ROLE' | 'usuario'
  });

  async function loadUsuarios() {
    const { data } = await supabase
      .from("profiles")
      .select("user_id, full_name, email")
      .eq("active", true)
      .order("full_name");
    const list = (data || []) as UsuarioSimples[];
    setUsuarios(list);
    const map: Record<string, string> = {};
    list.forEach((u) => { map[u.user_id] = u.full_name; });
    setUsuariosNomesMap(map);
  }

  async function loadNotificacoes() {
    setLoading(true);
    const { data } = await supabase
      .from("notificacoes")
      .select("*")
      .order("created_at", { ascending: false });
    setNotificacoes((data || []) as Notificacao[]);
    setLoading(false);
  }

  useEffect(() => {
    loadNotificacoes();
    loadUsuarios();
  }, []);

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    if (!form.titulo.trim() || !form.mensagem.trim()) {
      toast.error("Título e mensagem são obrigatórios");
      return;
    }
    if (form.destino === "usuario" && !selectedUser) {
      toast.error("Selecione um usuário");
      return;
    }
    setSaving(true);

    let destinatario_user_id: string | null = null;
    let destinatario_role: string | null = null;

    if (form.destino.startsWith("role:")) {
      destinatario_role = form.destino.replace("role:", "");
    } else if (form.destino === "usuario" && selectedUser) {
      destinatario_user_id = selectedUser.user_id;
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
      resetForm();
      loadNotificacoes();
    }
    setSaving(false);
  }

  function resetForm() {
    setForm({ titulo: "", mensagem: "", tipo: "info", destino: "todos" });
    setSelectedUser(null);
    setUserSearch("");
    setShowUserDropdown(false);
  }

  async function handleDelete(id: string) {
    const { error } = await supabase.from("notificacoes").delete().eq("id", id);
    if (error) { toast.error("Erro ao excluir notificação"); return; }
    toast.success("Notificação excluída");
    loadNotificacoes();
  }

  const filteredUsuarios = userSearch.trim().length >= 1
    ? usuarios.filter((u) =>
        u.full_name.toLowerCase().includes(userSearch.toLowerCase()) ||
        u.email.toLowerCase().includes(userSearch.toLowerCase())
      )
    : usuarios;

  function getDestinoLabel(n: Notificacao) {
    if (n.destinatario_role) {
      return (
        <span className="inline-flex items-center gap-1 text-xs bg-primary/10 text-primary border border-primary/20 px-2 py-0.5 rounded-full font-medium">
          <Users className="h-3 w-3" />
          {ROLE_LABELS[n.destinatario_role as AppRole] || n.destinatario_role}
        </span>
      );
    }
    if (n.destinatario_user_id) {
      const nome = usuariosNomesMap[n.destinatario_user_id] || "Usuário específico";
      return (
        <span className="inline-flex items-center gap-1 text-xs bg-muted border border-border px-2 py-0.5 rounded-full">
          <User className="h-3 w-3" />
          {nome}
        </span>
      );
    }
    return (
      <span className="inline-flex items-center gap-1 text-xs bg-emerald-50 text-emerald-700 border border-emerald-200 px-2 py-0.5 rounded-full font-medium">
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

        {/* Estatísticas rápidas */}
        <div className="grid grid-cols-3 gap-3">
          {Object.entries(TIPO_CONFIG).map(([key, cfg]) => {
            const count = notificacoes.filter((n) => n.tipo === key).length;
            const Icon = cfg.icon;
            return (
              <div key={key} className="bg-card border border-border rounded-xl p-4 flex items-center gap-3">
                <span className={`p-2 rounded-lg border ${cfg.color}`}>
                  <Icon className="h-4 w-4" />
                </span>
                <div>
                  <p className="text-xs text-muted-foreground">{cfg.label}</p>
                  <p className="text-lg font-bold text-foreground">{count}</p>
                </div>
              </div>
            );
          })}
        </div>

        {/* Tabela */}
        <div className="bg-card rounded-xl border border-border shadow-sm overflow-hidden">
          <Table>
            <TableHeader>
              <TableRow className="bg-muted/50">
                <TableHead className="w-32">Tipo</TableHead>
                <TableHead>Título</TableHead>
                <TableHead className="hidden md:table-cell">Mensagem</TableHead>
                <TableHead>Destinatário</TableHead>
                <TableHead className="hidden sm:table-cell">Data</TableHead>
                <TableHead className="text-right w-16">Ações</TableHead>
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
                  <TableCell colSpan={6} className="text-center py-16 text-muted-foreground">
                    <Bell className="h-8 w-8 mx-auto mb-2 opacity-30" />
                    Nenhuma notificação enviada ainda
                  </TableCell>
                </TableRow>
              ) : notificacoes.map((n) => {
                const cfg = TIPO_CONFIG[n.tipo as keyof typeof TIPO_CONFIG] || TIPO_CONFIG.info;
                const Icon = cfg.icon;
                return (
                  <TableRow key={n.id}>
                    <TableCell>
                      <span className={`inline-flex items-center gap-1 text-xs font-medium px-2 py-0.5 rounded-full border ${cfg.color}`}>
                        <Icon className="h-3 w-3" />
                        {cfg.label}
                      </span>
                    </TableCell>
                    <TableCell className="font-medium max-w-[160px] truncate">{n.titulo}</TableCell>
                    <TableCell className="hidden md:table-cell text-sm text-muted-foreground max-w-[220px] truncate">{n.mensagem}</TableCell>
                    <TableCell>{getDestinoLabel(n)}</TableCell>
                    <TableCell className="hidden sm:table-cell text-sm text-muted-foreground whitespace-nowrap">
                      {format(new Date(n.created_at), "dd/MM/yyyy HH:mm", { locale: ptBR })}
                    </TableCell>
                    <TableCell className="text-right">
                      <AlertDialog>
                        <AlertDialogTrigger asChild>
                          <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive hover:text-destructive hover:bg-destructive/10">
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
      <Dialog open={openDialog} onOpenChange={(v) => { setOpenDialog(v); if (!v) resetForm(); }}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Send className="h-4 w-4 text-primary" /> Nova Notificação
            </DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSave} className="space-y-4">
            {/* Tipo e Destinatário */}
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label>Tipo *</Label>
                <Select value={form.tipo} onValueChange={(v) => setForm((f) => ({ ...f, tipo: v }))}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {Object.entries(TIPO_CONFIG).map(([key, cfg]) => {
                      const Icon = cfg.icon;
                      return (
                        <SelectItem key={key} value={key}>
                          <span className="flex items-center gap-2">
                            <Icon className="h-3.5 w-3.5" />
                            {cfg.label}
                          </span>
                        </SelectItem>
                      );
                    })}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label>Enviar para *</Label>
                <Select value={form.destino} onValueChange={(v) => {
                  setForm((f) => ({ ...f, destino: v }));
                  if (v !== "usuario") { setSelectedUser(null); setUserSearch(""); }
                }}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="todos">
                      <span className="flex items-center gap-2"><Globe className="h-3.5 w-3.5" /> Todos os usuários</span>
                    </SelectItem>
                    <SelectItem value="usuario">
                      <span className="flex items-center gap-2"><User className="h-3.5 w-3.5" /> Usuário específico</span>
                    </SelectItem>
                    {ROLES.map((r) => (
                      <SelectItem key={r} value={`role:${r}`}>
                        <span className="flex items-center gap-2"><Users className="h-3.5 w-3.5" /> {ROLE_LABELS[r]}</span>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* Busca de usuário específico */}
            {form.destino === "usuario" && (
              <div className="space-y-1.5">
                <Label>Selecionar usuário *</Label>
                {selectedUser ? (
                  <div className="flex items-center gap-2 p-2.5 rounded-lg border border-border bg-muted/30">
                    <User className="h-4 w-4 text-primary shrink-0" />
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium truncate">{selectedUser.full_name}</p>
                      <p className="text-xs text-muted-foreground truncate">{selectedUser.email}</p>
                    </div>
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      className="h-6 px-2 text-xs text-muted-foreground hover:text-foreground shrink-0"
                      onClick={() => { setSelectedUser(null); setUserSearch(""); }}
                    >
                      Trocar
                    </Button>
                  </div>
                ) : (
                  <div className="relative">
                    <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground pointer-events-none" />
                    <Input
                      placeholder="Buscar por nome ou e-mail..."
                      className="pl-8"
                      value={userSearch}
                      onChange={(e) => { setUserSearch(e.target.value); setShowUserDropdown(true); }}
                      onFocus={() => setShowUserDropdown(true)}
                      autoComplete="off"
                    />
                    {showUserDropdown && filteredUsuarios.length > 0 && (
                      <div className="absolute z-50 top-full mt-1 w-full bg-popover border border-border rounded-lg shadow-lg max-h-48 overflow-y-auto">
                        {filteredUsuarios.slice(0, 10).map((u) => (
                          <button
                            key={u.user_id}
                            type="button"
                            className="w-full text-left px-3 py-2 hover:bg-muted/60 transition-colors flex flex-col gap-0.5"
                            onMouseDown={(e) => {
                              e.preventDefault();
                              setSelectedUser(u);
                              setShowUserDropdown(false);
                              setUserSearch("");
                            }}
                          >
                            <span className="text-sm font-medium text-foreground">{u.full_name}</span>
                            <span className="text-xs text-muted-foreground">{u.email}</span>
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                )}
              </div>
            )}

            {/* Título */}
            <div className="space-y-1.5">
              <Label>Título *</Label>
              <Input
                placeholder="Ex: Manutenção programada"
                value={form.titulo}
                onChange={(e) => setForm((f) => ({ ...f, titulo: e.target.value }))}
                maxLength={120}
              />
              <p className="text-xs text-muted-foreground text-right">{form.titulo.length}/120</p>
            </div>

            {/* Mensagem */}
            <div className="space-y-1.5">
              <Label>Mensagem *</Label>
              <Textarea
                placeholder="Descreva o comunicado..."
                value={form.mensagem}
                onChange={(e) => setForm((f) => ({ ...f, mensagem: e.target.value }))}
                rows={4}
                maxLength={1000}
              />
              <p className="text-xs text-muted-foreground text-right">{form.mensagem.length}/1000</p>
            </div>

            {/* Preview do destinatário */}
            <div className="rounded-lg border border-border bg-muted/30 px-3 py-2 flex items-center gap-2 text-xs text-muted-foreground">
              <Bell className="h-3.5 w-3.5 shrink-0" />
              <span>
                {form.destino === "todos" && "Esta notificação será enviada para todos os usuários do sistema."}
                {form.destino === "usuario" && !selectedUser && "Selecione um usuário acima."}
                {form.destino === "usuario" && selectedUser && `Será enviada apenas para ${selectedUser.full_name}.`}
                {form.destino.startsWith("role:") && `Será enviada para todos os usuários com perfil "${ROLE_LABELS[form.destino.replace("role:", "") as AppRole]}".`}
              </span>
            </div>

            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => { setOpenDialog(false); resetForm(); }}>
                Cancelar
              </Button>
              <Button type="submit" disabled={saving} className="gap-2">
                {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
                Enviar
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </AppLayout>
  );
}
