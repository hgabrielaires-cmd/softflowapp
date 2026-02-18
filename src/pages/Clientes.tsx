import { useState, useEffect } from "react";
import { AppLayout } from "@/components/AppLayout";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/context/AuthContext";
import { Cliente, Filial } from "@/lib/supabase-types";
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
import { toast } from "sonner";
import { Plus, Search, Pencil, Building2, Phone, Mail } from "lucide-react";

const UF_LIST = [
  "AC","AL","AP","AM","BA","CE","DF","ES","GO","MA","MT","MS","MG",
  "PA","PB","PR","PE","PI","RJ","RN","RS","RO","RR","SC","SP","SE","TO",
];

const emptyForm = {
  nome_fantasia: "",
  razao_social: "",
  cnpj_cpf: "",
  contato_nome: "",
  telefone: "",
  email: "",
  cidade: "",
  uf: "",
  filial_id: "",
  ativo: true,
};

export default function Clientes() {
  const { roles, profile } = useAuth();
  const isAdmin = roles.includes("admin");
  const isFinanceiro = roles.includes("financeiro");
  const isVendedor = roles.includes("vendedor");
  const canEdit = isAdmin || isFinanceiro || isVendedor;

  const [clientes, setClientes] = useState<Cliente[]>([]);
  const [filiais, setFiliais] = useState<Filial[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<Cliente | null>(null);
  const [form, setForm] = useState(emptyForm);
  const [saving, setSaving] = useState(false);

  async function fetchData() {
    setLoading(true);
    const [{ data: c }, { data: f }] = await Promise.all([
      supabase.from("clientes").select("*").order("nome_fantasia"),
      supabase.from("filiais").select("*").order("nome"),
    ]);
    setClientes(c || []);
    setFiliais(f || []);
    setLoading(false);
  }

  useEffect(() => { fetchData(); }, []);

  const filtered = clientes.filter((c) => {
    const q = search.toLowerCase();
    return (
      c.nome_fantasia.toLowerCase().includes(q) ||
      (c.cnpj_cpf || "").includes(q) ||
      (c.telefone || "").includes(q)
    );
  });

  function openCreate() {
    setEditing(null);
    const defaultFilial = isVendedor && profile?.filial_id ? profile.filial_id : "";
    setForm({ ...emptyForm, filial_id: defaultFilial });
    setDialogOpen(true);
  }

  function openEdit(c: Cliente) {
    setEditing(c);
    setForm({
      nome_fantasia: c.nome_fantasia,
      razao_social: c.razao_social || "",
      cnpj_cpf: c.cnpj_cpf,
      contato_nome: c.contato_nome || "",
      telefone: c.telefone || "",
      email: c.email || "",
      cidade: c.cidade || "",
      uf: c.uf || "",
      filial_id: c.filial_id || "",
      ativo: c.ativo,
    });
    setDialogOpen(true);
  }

  async function handleSave() {
    if (!form.nome_fantasia.trim() || !form.cnpj_cpf.trim()) {
      toast.error("Nome fantasia e CNPJ/CPF são obrigatórios");
      return;
    }
    setSaving(true);
    const payload = {
      nome_fantasia: form.nome_fantasia.trim(),
      razao_social: form.razao_social.trim() || null,
      cnpj_cpf: form.cnpj_cpf.trim(),
      contato_nome: form.contato_nome.trim() || null,
      telefone: form.telefone.trim() || null,
      email: form.email.trim() || null,
      cidade: form.cidade.trim() || null,
      uf: form.uf || null,
      filial_id: form.filial_id || null,
      ativo: form.ativo,
    };
    if (editing) {
      const { error } = await supabase.from("clientes").update(payload).eq("id", editing.id);
      if (error) { toast.error("Erro ao atualizar cliente"); setSaving(false); return; }
      toast.success("Cliente atualizado com sucesso");
    } else {
      const { error } = await supabase.from("clientes").insert(payload);
      if (error) { toast.error("Erro ao cadastrar cliente"); setSaving(false); return; }
      toast.success("Cliente cadastrado com sucesso");
    }
    setSaving(false);
    setDialogOpen(false);
    fetchData();
  }

  async function toggleAtivo(c: Cliente) {
    const { error } = await supabase.from("clientes").update({ ativo: !c.ativo }).eq("id", c.id);
    if (error) { toast.error("Erro ao atualizar status"); return; }
    setClientes((prev) => prev.map((x) => x.id === c.id ? { ...x, ativo: !x.ativo } : x));
  }

  const filialNome = (id: string | null) => filiais.find((f) => f.id === id)?.nome || "—";

  return (
    <AppLayout>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-foreground">Clientes</h1>
            <p className="text-muted-foreground text-sm mt-1">Gestão de clientes cadastrados</p>
          </div>
          {canEdit && (
            <Button onClick={openCreate} className="gap-2">
              <Plus className="h-4 w-4" /> Novo cliente
            </Button>
          )}
        </div>

        {/* Search */}
        <div className="relative max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Buscar por nome, CNPJ ou telefone..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9"
          />
        </div>

        {/* Table */}
        <div className="rounded-lg border border-border bg-card overflow-hidden">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Nome fantasia</TableHead>
                <TableHead>CNPJ / CPF</TableHead>
                <TableHead>Contato</TableHead>
                <TableHead>Filial</TableHead>
                <TableHead>Cidade / UF</TableHead>
                <TableHead>Status</TableHead>
                {canEdit && <TableHead className="w-20">Ações</TableHead>}
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading ? (
                <TableRow>
                  <TableCell colSpan={canEdit ? 7 : 6} className="text-center text-muted-foreground py-10">
                    Carregando...
                  </TableCell>
                </TableRow>
              ) : filtered.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={canEdit ? 7 : 6} className="text-center text-muted-foreground py-10">
                    Nenhum cliente encontrado
                  </TableCell>
                </TableRow>
              ) : (
                filtered.map((c) => (
                  <TableRow key={c.id}>
                    <TableCell>
                      <div>
                        <p className="font-medium text-foreground">{c.nome_fantasia}</p>
                        {c.razao_social && (
                          <p className="text-xs text-muted-foreground">{c.razao_social}</p>
                        )}
                      </div>
                    </TableCell>
                    <TableCell className="font-mono text-sm">{c.cnpj_cpf}</TableCell>
                    <TableCell>
                      <div className="space-y-0.5">
                        {c.contato_nome && (
                          <p className="text-sm">{c.contato_nome}</p>
                        )}
                        {c.telefone && (
                          <p className="text-xs text-muted-foreground flex items-center gap-1">
                            <Phone className="h-3 w-3" />{c.telefone}
                          </p>
                        )}
                        {c.email && (
                          <p className="text-xs text-muted-foreground flex items-center gap-1">
                            <Mail className="h-3 w-3" />{c.email}
                          </p>
                        )}
                      </div>
                    </TableCell>
                    <TableCell>
                      <span className="flex items-center gap-1 text-sm">
                        <Building2 className="h-3 w-3 text-muted-foreground" />
                        {filialNome(c.filial_id)}
                      </span>
                    </TableCell>
                    <TableCell className="text-sm">
                      {[c.cidade, c.uf].filter(Boolean).join(" / ") || "—"}
                    </TableCell>
                    <TableCell>
                      {canEdit ? (
                        <Switch checked={c.ativo} onCheckedChange={() => toggleAtivo(c)} />
                      ) : (
                        <Badge variant={c.ativo ? "default" : "secondary"}>
                          {c.ativo ? "Ativo" : "Inativo"}
                        </Badge>
                      )}
                    </TableCell>
                    {canEdit && (
                      <TableCell>
                        <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => openEdit(c)}>
                          <Pencil className="h-3.5 w-3.5" />
                        </Button>
                      </TableCell>
                    )}
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>
      </div>

      {/* Dialog criar/editar */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editing ? "Editar cliente" : "Novo cliente"}</DialogTitle>
          </DialogHeader>
          <div className="grid grid-cols-2 gap-4 py-2">
            <div className="col-span-2 space-y-1.5">
              <Label>Nome fantasia *</Label>
              <Input value={form.nome_fantasia} onChange={(e) => setForm((f) => ({ ...f, nome_fantasia: e.target.value }))} placeholder="Ex: Restaurante do João" />
            </div>
            <div className="col-span-2 space-y-1.5">
              <Label>Razão social</Label>
              <Input value={form.razao_social} onChange={(e) => setForm((f) => ({ ...f, razao_social: e.target.value }))} placeholder="Razão social (opcional)" />
            </div>
            <div className="space-y-1.5">
              <Label>CNPJ / CPF *</Label>
              <Input value={form.cnpj_cpf} onChange={(e) => setForm((f) => ({ ...f, cnpj_cpf: e.target.value }))} placeholder="00.000.000/0001-00" />
            </div>
            <div className="space-y-1.5">
              <Label>Filial responsável</Label>
              <Select value={form.filial_id} onValueChange={(v) => setForm((f) => ({ ...f, filial_id: v }))} disabled={isVendedor && !isAdmin && !isFinanceiro}>
                <SelectTrigger>
                  <SelectValue placeholder="Selecionar filial" />
                </SelectTrigger>
                <SelectContent>
                  {filiais.map((fil) => (
                    <SelectItem key={fil.id} value={fil.id}>{fil.nome}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label>Nome do contato</Label>
              <Input value={form.contato_nome} onChange={(e) => setForm((f) => ({ ...f, contato_nome: e.target.value }))} placeholder="Nome da pessoa de contato" />
            </div>
            <div className="space-y-1.5">
              <Label>Telefone</Label>
              <Input value={form.telefone} onChange={(e) => setForm((f) => ({ ...f, telefone: e.target.value }))} placeholder="(00) 00000-0000" />
            </div>
            <div className="col-span-2 space-y-1.5">
              <Label>E-mail</Label>
              <Input type="email" value={form.email} onChange={(e) => setForm((f) => ({ ...f, email: e.target.value }))} placeholder="email@empresa.com" />
            </div>
            <div className="space-y-1.5">
              <Label>Cidade</Label>
              <Input value={form.cidade} onChange={(e) => setForm((f) => ({ ...f, cidade: e.target.value }))} placeholder="Ex: São Paulo" />
            </div>
            <div className="space-y-1.5">
              <Label>UF</Label>
              <Select value={form.uf} onValueChange={(v) => setForm((f) => ({ ...f, uf: v }))}>
                <SelectTrigger>
                  <SelectValue placeholder="UF" />
                </SelectTrigger>
                <SelectContent>
                  {UF_LIST.map((uf) => (
                    <SelectItem key={uf} value={uf}>{uf}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            {(isAdmin || isFinanceiro) && (
              <div className="col-span-2 flex items-center gap-3">
                <Switch checked={form.ativo} onCheckedChange={(v) => setForm((f) => ({ ...f, ativo: v }))} />
                <Label>Cliente ativo</Label>
              </div>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>Cancelar</Button>
            <Button onClick={handleSave} disabled={saving}>
              {saving ? "Salvando..." : editing ? "Salvar alterações" : "Cadastrar cliente"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </AppLayout>
  );
}
