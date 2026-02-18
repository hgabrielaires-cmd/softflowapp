import { useState, useEffect } from "react";
import { AppLayout } from "@/components/AppLayout";
import { supabase } from "@/integrations/supabase/client";
import { Modulo, Plano, PlanoModulo } from "@/lib/supabase-types";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
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
import { toast } from "sonner";
import { Plus, Pencil, Trash2, Link } from "lucide-react";

// ─── Planos Tab ─────────────────────────────────────────────────────────────

function PlanosTab() {
  const [planos, setPlanos] = useState<Plano[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<Plano | null>(null);
  const [form, setForm] = useState({ nome: "", descricao: "", ativo: true });
  const [saving, setSaving] = useState(false);

  async function fetch() {
    setLoading(true);
    const { data } = await supabase.from("planos").select("*").order("nome");
    setPlanos(data || []);
    setLoading(false);
  }

  useEffect(() => { fetch(); }, []);

  function openCreate() {
    setEditing(null);
    setForm({ nome: "", descricao: "", ativo: true });
    setDialogOpen(true);
  }

  function openEdit(p: Plano) {
    setEditing(p);
    setForm({ nome: p.nome, descricao: p.descricao || "", ativo: p.ativo });
    setDialogOpen(true);
  }

  async function handleSave() {
    if (!form.nome.trim()) { toast.error("Nome é obrigatório"); return; }
    setSaving(true);
    const payload = { nome: form.nome.trim(), descricao: form.descricao.trim() || null, ativo: form.ativo };
    if (editing) {
      const { error } = await supabase.from("planos").update(payload).eq("id", editing.id);
      if (error) { toast.error("Erro ao salvar"); setSaving(false); return; }
      toast.success("Plano atualizado");
    } else {
      const { error } = await supabase.from("planos").insert(payload);
      if (error) { toast.error("Erro ao criar"); setSaving(false); return; }
      toast.success("Plano criado");
    }
    setSaving(false);
    setDialogOpen(false);
    fetch();
  }

  async function handleDelete(p: Plano) {
    if (!confirm(`Excluir o plano "${p.nome}"?`)) return;
    const { error } = await supabase.from("planos").delete().eq("id", p.id);
    if (error) { toast.error("Erro ao excluir"); return; }
    toast.success("Plano excluído");
    fetch();
  }

  async function toggleAtivo(p: Plano) {
    await supabase.from("planos").update({ ativo: !p.ativo }).eq("id", p.id);
    setPlanos((prev) => prev.map((x) => x.id === p.id ? { ...x, ativo: !x.ativo } : x));
  }

  return (
    <div className="space-y-4">
      <div className="flex justify-end">
        <Button onClick={openCreate} className="gap-2"><Plus className="h-4 w-4" /> Novo plano</Button>
      </div>
      <div className="rounded-lg border border-border bg-card overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Nome</TableHead>
              <TableHead>Descrição</TableHead>
              <TableHead>Status</TableHead>
              <TableHead className="w-28">Ações</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading ? (
              <TableRow><TableCell colSpan={4} className="text-center py-10 text-muted-foreground">Carregando...</TableCell></TableRow>
            ) : planos.length === 0 ? (
              <TableRow><TableCell colSpan={4} className="text-center py-10 text-muted-foreground">Nenhum plano cadastrado</TableCell></TableRow>
            ) : planos.map((p) => (
              <TableRow key={p.id}>
                <TableCell className="font-medium">{p.nome}</TableCell>
                <TableCell className="text-muted-foreground text-sm">{p.descricao || "—"}</TableCell>
                <TableCell><Switch checked={p.ativo} onCheckedChange={() => toggleAtivo(p)} /></TableCell>
                <TableCell>
                  <div className="flex gap-1">
                    <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => openEdit(p)}><Pencil className="h-3.5 w-3.5" /></Button>
                    <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive hover:text-destructive" onClick={() => handleDelete(p)}><Trash2 className="h-3.5 w-3.5" /></Button>
                  </div>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader><DialogTitle>{editing ? "Editar plano" : "Novo plano"}</DialogTitle></DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-1.5">
              <Label>Nome *</Label>
              <Input value={form.nome} onChange={(e) => setForm((f) => ({ ...f, nome: e.target.value }))} placeholder="Ex: Essencial, Pro, Premium" />
            </div>
            <div className="space-y-1.5">
              <Label>Descrição</Label>
              <Textarea value={form.descricao} onChange={(e) => setForm((f) => ({ ...f, descricao: e.target.value }))} placeholder="Descrição opcional do plano" rows={3} />
            </div>
            <div className="flex items-center gap-3">
              <Switch checked={form.ativo} onCheckedChange={(v) => setForm((f) => ({ ...f, ativo: v }))} />
              <Label>Plano ativo</Label>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>Cancelar</Button>
            <Button onClick={handleSave} disabled={saving}>{saving ? "Salvando..." : editing ? "Salvar" : "Criar plano"}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

// ─── Módulos Tab ─────────────────────────────────────────────────────────────

function ModulosTab() {
  const [modulos, setModulos] = useState<Modulo[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<Modulo | null>(null);
  const [form, setForm] = useState({ nome: "", ativo: true });
  const [saving, setSaving] = useState(false);

  async function fetch() {
    setLoading(true);
    const { data } = await supabase.from("modulos").select("*").order("nome");
    setModulos(data || []);
    setLoading(false);
  }

  useEffect(() => { fetch(); }, []);

  function openCreate() {
    setEditing(null);
    setForm({ nome: "", ativo: true });
    setDialogOpen(true);
  }

  function openEdit(m: Modulo) {
    setEditing(m);
    setForm({ nome: m.nome, ativo: m.ativo });
    setDialogOpen(true);
  }

  async function handleSave() {
    if (!form.nome.trim()) { toast.error("Nome é obrigatório"); return; }
    setSaving(true);
    const payload = { nome: form.nome.trim(), ativo: form.ativo };
    if (editing) {
      const { error } = await supabase.from("modulos").update(payload).eq("id", editing.id);
      if (error) { toast.error("Erro ao salvar"); setSaving(false); return; }
      toast.success("Módulo atualizado");
    } else {
      const { error } = await supabase.from("modulos").insert(payload);
      if (error) { toast.error("Erro ao criar"); setSaving(false); return; }
      toast.success("Módulo criado");
    }
    setSaving(false);
    setDialogOpen(false);
    fetch();
  }

  async function handleDelete(m: Modulo) {
    if (!confirm(`Excluir o módulo "${m.nome}"?`)) return;
    const { error } = await supabase.from("modulos").delete().eq("id", m.id);
    if (error) { toast.error("Erro ao excluir"); return; }
    toast.success("Módulo excluído");
    fetch();
  }

  async function toggleAtivo(m: Modulo) {
    await supabase.from("modulos").update({ ativo: !m.ativo }).eq("id", m.id);
    setModulos((prev) => prev.map((x) => x.id === m.id ? { ...x, ativo: !x.ativo } : x));
  }

  return (
    <div className="space-y-4">
      <div className="flex justify-end">
        <Button onClick={openCreate} className="gap-2"><Plus className="h-4 w-4" /> Novo módulo</Button>
      </div>
      <div className="rounded-lg border border-border bg-card overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Nome</TableHead>
              <TableHead>Status</TableHead>
              <TableHead className="w-28">Ações</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading ? (
              <TableRow><TableCell colSpan={3} className="text-center py-10 text-muted-foreground">Carregando...</TableCell></TableRow>
            ) : modulos.length === 0 ? (
              <TableRow><TableCell colSpan={3} className="text-center py-10 text-muted-foreground">Nenhum módulo cadastrado</TableCell></TableRow>
            ) : modulos.map((m) => (
              <TableRow key={m.id}>
                <TableCell className="font-medium">{m.nome}</TableCell>
                <TableCell><Switch checked={m.ativo} onCheckedChange={() => toggleAtivo(m)} /></TableCell>
                <TableCell>
                  <div className="flex gap-1">
                    <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => openEdit(m)}><Pencil className="h-3.5 w-3.5" /></Button>
                    <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive hover:text-destructive" onClick={() => handleDelete(m)}><Trash2 className="h-3.5 w-3.5" /></Button>
                  </div>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-sm">
          <DialogHeader><DialogTitle>{editing ? "Editar módulo" : "Novo módulo"}</DialogTitle></DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-1.5">
              <Label>Nome *</Label>
              <Input value={form.nome} onChange={(e) => setForm((f) => ({ ...f, nome: e.target.value }))} placeholder="Ex: PDV, iFood, Gestão Estoque" />
            </div>
            <div className="flex items-center gap-3">
              <Switch checked={form.ativo} onCheckedChange={(v) => setForm((f) => ({ ...f, ativo: v }))} />
              <Label>Módulo ativo</Label>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>Cancelar</Button>
            <Button onClick={handleSave} disabled={saving}>{saving ? "Salvando..." : editing ? "Salvar" : "Criar módulo"}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

// ─── Vínculos Tab ─────────────────────────────────────────────────────────────

function VinculosTab() {
  const [planos, setPlanos] = useState<Plano[]>([]);
  const [modulos, setModulos] = useState<Modulo[]>([]);
  const [selectedPlano, setSelectedPlano] = useState("");
  const [vinculos, setVinculos] = useState<PlanoModulo[]>([]);
  const [loadingVinculos, setLoadingVinculos] = useState(false);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [form, setForm] = useState({
    modulo_id: "",
    inclui_treinamento: false,
    ordem: 0,
    duracao_minutos: "",
    obrigatorio: false,
  });
  const [saving, setSaving] = useState(false);

  async function fetchBase() {
    const [{ data: p }, { data: m }] = await Promise.all([
      supabase.from("planos").select("*").eq("ativo", true).order("nome"),
      supabase.from("modulos").select("*").eq("ativo", true).order("nome"),
    ]);
    setPlanos(p || []);
    setModulos(m || []);
  }

  async function fetchVinculos(planoId: string) {
    setLoadingVinculos(true);
    const { data } = await supabase
      .from("plano_modulos")
      .select("*, modulo:modulos(*)")
      .eq("plano_id", planoId)
      .order("ordem");
    setVinculos((data as PlanoModulo[]) || []);
    setLoadingVinculos(false);
  }

  useEffect(() => { fetchBase(); }, []);

  useEffect(() => {
    if (selectedPlano) fetchVinculos(selectedPlano);
    else setVinculos([]);
  }, [selectedPlano]);

  const modulosVinculados = new Set(vinculos.map((v) => v.modulo_id));
  const modulosDisponiveis = modulos.filter((m) => !modulosVinculados.has(m.id));

  async function handleAdicionar() {
    if (!form.modulo_id) { toast.error("Selecione um módulo"); return; }
    setSaving(true);
    const { error } = await supabase.from("plano_modulos").insert({
      plano_id: selectedPlano,
      modulo_id: form.modulo_id,
      inclui_treinamento: form.inclui_treinamento,
      ordem: Number(form.ordem) || 0,
      duracao_minutos: form.duracao_minutos ? Number(form.duracao_minutos) : null,
      obrigatorio: form.obrigatorio,
    });
    if (error) { toast.error("Erro ao vincular módulo"); setSaving(false); return; }
    toast.success("Módulo vinculado ao plano");
    setSaving(false);
    setDialogOpen(false);
    setForm({ modulo_id: "", inclui_treinamento: false, ordem: 0, duracao_minutos: "", obrigatorio: false });
    fetchVinculos(selectedPlano);
  }

  async function handleRemover(v: PlanoModulo) {
    if (!confirm(`Remover "${v.modulo?.nome}" deste plano?`)) return;
    const { error } = await supabase.from("plano_modulos").delete().eq("id", v.id);
    if (error) { toast.error("Erro ao remover"); return; }
    toast.success("Módulo removido do plano");
    fetchVinculos(selectedPlano);
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-4">
        <div className="flex-1 max-w-xs space-y-1">
          <Label>Selecionar plano</Label>
          <Select value={selectedPlano} onValueChange={setSelectedPlano}>
            <SelectTrigger>
              <SelectValue placeholder="Escolha um plano..." />
            </SelectTrigger>
            <SelectContent>
              {planos.map((p) => (
                <SelectItem key={p.id} value={p.id}>{p.nome}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        {selectedPlano && (
          <Button onClick={() => setDialogOpen(true)} className="gap-2 mt-6" disabled={modulosDisponiveis.length === 0}>
            <Link className="h-4 w-4" /> Adicionar módulo
          </Button>
        )}
      </div>

      {selectedPlano && (
        <div className="rounded-lg border border-border bg-card overflow-hidden">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-12">Ordem</TableHead>
                <TableHead>Módulo</TableHead>
                <TableHead>Treinamento</TableHead>
                <TableHead>Duração</TableHead>
                <TableHead>Obrigatório</TableHead>
                <TableHead className="w-16">Ação</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loadingVinculos ? (
                <TableRow><TableCell colSpan={6} className="text-center py-8 text-muted-foreground">Carregando...</TableCell></TableRow>
              ) : vinculos.length === 0 ? (
                <TableRow><TableCell colSpan={6} className="text-center py-8 text-muted-foreground">Nenhum módulo vinculado a este plano</TableCell></TableRow>
              ) : vinculos.map((v) => (
                <TableRow key={v.id}>
                  <TableCell className="text-center text-muted-foreground">{v.ordem}</TableCell>
                  <TableCell className="font-medium">{v.modulo?.nome}</TableCell>
                  <TableCell>
                    <Badge variant={v.inclui_treinamento ? "default" : "secondary"}>
                      {v.inclui_treinamento ? "Sim" : "Não"}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-sm text-muted-foreground">
                    {v.duracao_minutos ? `${v.duracao_minutos} min` : "—"}
                  </TableCell>
                  <TableCell>
                    <Badge variant={v.obrigatorio ? "default" : "outline"}>
                      {v.obrigatorio ? "Obrigatório" : "Opcional"}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive hover:text-destructive" onClick={() => handleRemover(v)}>
                      <Trash2 className="h-3.5 w-3.5" />
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader><DialogTitle>Vincular módulo ao plano</DialogTitle></DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-1.5">
              <Label>Módulo *</Label>
              <Select value={form.modulo_id} onValueChange={(v) => setForm((f) => ({ ...f, modulo_id: v }))}>
                <SelectTrigger><SelectValue placeholder="Selecionar módulo" /></SelectTrigger>
                <SelectContent>
                  {modulosDisponiveis.map((m) => (
                    <SelectItem key={m.id} value={m.id}>{m.nome}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label>Ordem</Label>
                <Input type="number" min={0} value={form.ordem} onChange={(e) => setForm((f) => ({ ...f, ordem: Number(e.target.value) }))} />
              </div>
              <div className="space-y-1.5">
                <Label>Duração (minutos)</Label>
                <Input type="number" min={0} value={form.duracao_minutos} onChange={(e) => setForm((f) => ({ ...f, duracao_minutos: e.target.value }))} placeholder="Opcional" />
              </div>
            </div>
            <div className="flex items-center gap-3">
              <Switch checked={form.inclui_treinamento} onCheckedChange={(v) => setForm((f) => ({ ...f, inclui_treinamento: v }))} />
              <Label>Inclui treinamento</Label>
            </div>
            <div className="flex items-center gap-3">
              <Switch checked={form.obrigatorio} onCheckedChange={(v) => setForm((f) => ({ ...f, obrigatorio: v }))} />
              <Label>Módulo obrigatório</Label>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>Cancelar</Button>
            <Button onClick={handleAdicionar} disabled={saving}>{saving ? "Salvando..." : "Vincular módulo"}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function Planos() {
  return (
    <AppLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Planos e Módulos</h1>
          <p className="text-muted-foreground text-sm mt-1">Gerencie planos de serviço, módulos disponíveis e seus vínculos</p>
        </div>
        <Tabs defaultValue="planos">
          <TabsList>
            <TabsTrigger value="planos">Planos</TabsTrigger>
            <TabsTrigger value="modulos">Módulos</TabsTrigger>
            <TabsTrigger value="vinculos">Vínculos</TabsTrigger>
          </TabsList>
          <TabsContent value="planos" className="mt-4"><PlanosTab /></TabsContent>
          <TabsContent value="modulos" className="mt-4"><ModulosTab /></TabsContent>
          <TabsContent value="vinculos" className="mt-4"><VinculosTab /></TabsContent>
        </Tabs>
      </div>
    </AppLayout>
  );
}
