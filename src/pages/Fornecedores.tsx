import { useState, useEffect } from "react";
import { AppLayout } from "@/components/AppLayout";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/context/AuthContext";
import { useCrudPermissions } from "@/hooks/useCrudPermissions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
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
import { toast } from "sonner";
import {
  Plus, Search, Pencil, Building2, Phone, Mail, Loader2, MapPin,
  MoreHorizontal, CheckCircle, XCircle, Trash2, Truck,
} from "lucide-react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { TablePagination } from "@/components/TablePagination";

const UF_LIST = [
  "AC","AL","AP","AM","BA","CE","DF","ES","GO","MA","MT","MS","MG",
  "PA","PB","PR","PE","PI","RJ","RN","RS","RO","RR","SC","SP","SE","TO",
];

const emptyForm = {
  nome_fantasia: "",
  razao_social: "",
  cnpj_cpf: "",
  inscricao_estadual: "",
  ie_isento: false,
  contato_nome: "",
  telefone: "",
  email: "",
  cidade: "",
  uf: "",
  cep: "",
  logradouro: "",
  numero: "",
  complemento: "",
  bairro: "",
  observacoes: "",
  ativo: true,
};

interface Fornecedor {
  id: string;
  nome_fantasia: string;
  razao_social: string | null;
  cnpj_cpf: string;
  inscricao_estadual: string | null;
  contato_nome: string | null;
  telefone: string | null;
  email: string | null;
  logradouro: string | null;
  numero: string | null;
  complemento: string | null;
  bairro: string | null;
  cidade: string | null;
  uf: string | null;
  cep: string | null;
  observacoes: string | null;
  ativo: boolean;
  created_at: string;
  updated_at: string;
}

export default function Fornecedores() {
  const { roles } = useAuth();
  const isAdmin = roles.includes("admin");
  const isFinanceiro = roles.includes("financeiro");
  const { canIncluir: crudIncluir, canEditar: crudEditar, canExcluir: crudExcluir } = useCrudPermissions("fornecedores", roles);
  const canEdit = crudEditar || crudIncluir;

  const [fornecedores, setFornecedores] = useState<Fornecedor[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const ITEMS_PER_PAGE = 15;
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<Fornecedor | null>(null);
  const [form, setForm] = useState(emptyForm);
  const [saving, setSaving] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [loadingCep, setLoadingCep] = useState(false);
  const [loadingCnpj, setLoadingCnpj] = useState(false);
  const [cepError, setCepError] = useState("");
  const [cnpjError, setCnpjError] = useState("");

  async function loadData() {
    setLoading(true);
    const { data, error } = await supabase
      .from("fornecedores")
      .select("*")
      .order("nome_fantasia");
    if (error) toast.error("Erro ao carregar fornecedores: " + error.message);
    setFornecedores((data || []) as Fornecedor[]);
    setLoading(false);
  }

  useEffect(() => { loadData(); }, []);

  async function handleCepBlur() {
    const cep = form.cep.replace(/\D/g, "");
    if (cep.length !== 8) return;
    setCepError("");
    setLoadingCep(true);
    try {
      const res = await fetch(`https://viacep.com.br/ws/${cep}/json/`);
      const data = await res.json();
      if (data.erro) {
        setCepError("CEP não encontrado");
      } else {
        setForm((f) => ({
          ...f,
          logradouro: f.logradouro || data.logradouro || "",
          bairro: f.bairro || data.bairro || "",
          cidade: f.cidade || data.localidade || "",
          uf: f.uf || data.uf || "",
        }));
      }
    } catch {
      setCepError("Erro ao consultar CEP");
    } finally {
      setLoadingCep(false);
    }
  }

  async function handleCnpjBlur() {
    const cnpj = form.cnpj_cpf.replace(/\D/g, "");
    if (cnpj.length !== 14) return;
    setCnpjError("");
    setLoadingCnpj(true);
    try {
      const res = await fetch(`https://brasilapi.com.br/api/cnpj/v1/${cnpj}`);
      if (!res.ok) {
        setCnpjError("CNPJ não encontrado");
      } else {
        const data = await res.json();
        const telefoneApi = data.ddd_telefone_1
          ? `(${data.ddd_telefone_1}) ${data.telefone_1 || ""}`.trim()
          : "";
        const logradouroApi = data.logradouro
          ? `${data.tipo_logradouro || ""} ${data.logradouro}`.trim()
          : "";
        setForm((f) => ({
          ...f,
          razao_social: f.razao_social || data.razao_social || "",
          nome_fantasia: f.nome_fantasia || data.nome_fantasia || "",
          email: f.email || data.email || "",
          telefone: f.telefone || telefoneApi,
          cidade: f.cidade || data.municipio || "",
          uf: f.uf || data.uf || "",
          logradouro: f.logradouro || logradouroApi,
          bairro: f.bairro || data.bairro || "",
          cep: f.cep || (data.cep ? data.cep.replace(/\D/g, "") : ""),
        }));
      }
    } catch {
      setCnpjError("CNPJ não encontrado");
    } finally {
      setLoadingCnpj(false);
    }
  }

  function openNew() {
    setEditing(null);
    setForm(emptyForm);
    setCepError("");
    setCnpjError("");
    setDialogOpen(true);
  }

  function openEdit(f: Fornecedor) {
    setEditing(f);
    setForm({
      nome_fantasia: f.nome_fantasia,
      razao_social: f.razao_social || "",
      cnpj_cpf: f.cnpj_cpf,
      inscricao_estadual: f.inscricao_estadual || "",
      ie_isento: f.inscricao_estadual === "ISENTO",
      contato_nome: f.contato_nome || "",
      telefone: f.telefone || "",
      email: f.email || "",
      cidade: f.cidade || "",
      uf: f.uf || "",
      cep: f.cep || "",
      logradouro: f.logradouro || "",
      numero: f.numero || "",
      complemento: f.complemento || "",
      bairro: f.bairro || "",
      observacoes: f.observacoes || "",
      ativo: f.ativo,
    });
    setCepError("");
    setCnpjError("");
    setDialogOpen(true);
  }

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    if (!form.nome_fantasia.trim()) { toast.error("Nome fantasia é obrigatório"); return; }
    if (!form.cnpj_cpf.trim()) { toast.error("CNPJ/CPF é obrigatório"); return; }

    setSaving(true);
    const payload = {
      nome_fantasia: form.nome_fantasia.trim(),
      razao_social: form.razao_social.trim() || null,
      cnpj_cpf: form.cnpj_cpf.trim(),
      inscricao_estadual: form.ie_isento ? "ISENTO" : (form.inscricao_estadual.trim() || null),
      contato_nome: form.contato_nome.trim() || null,
      telefone: form.telefone.trim() || null,
      email: form.email.trim() || null,
      logradouro: form.logradouro.trim() || null,
      numero: form.numero.trim() || null,
      complemento: form.complemento.trim() || null,
      bairro: form.bairro.trim() || null,
      cidade: form.cidade.trim() || null,
      uf: form.uf || null,
      cep: form.cep.trim() || null,
      observacoes: form.observacoes.trim() || null,
      ativo: form.ativo,
    };

    if (editing) {
      const { error } = await supabase.from("fornecedores").update(payload).eq("id", editing.id);
      if (error) { toast.error("Erro ao atualizar: " + error.message); setSaving(false); return; }
      toast.success("Fornecedor atualizado!");
    } else {
      const { error } = await supabase.from("fornecedores").insert(payload);
      if (error) { toast.error("Erro ao cadastrar: " + error.message); setSaving(false); return; }
      toast.success("Fornecedor cadastrado!");
    }

    setSaving(false);
    setDialogOpen(false);
    loadData();
  }

  async function handleToggleAtivo(f: Fornecedor) {
    const { error } = await supabase.from("fornecedores").update({ ativo: !f.ativo }).eq("id", f.id);
    if (error) { toast.error("Erro ao atualizar status"); return; }
    toast.success(f.ativo ? "Fornecedor inativado" : "Fornecedor ativado");
    loadData();
  }

  async function handleDelete(id: string) {
    const { error } = await supabase.from("fornecedores").delete().eq("id", id);
    if (error) { toast.error("Erro ao excluir: " + error.message); return; }
    toast.success("Fornecedor excluído");
    setDeletingId(null);
    loadData();
  }

  const filtered = fornecedores.filter((f) => {
    const q = search.toLowerCase();
    return (
      f.nome_fantasia.toLowerCase().includes(q) ||
      (f.razao_social || "").toLowerCase().includes(q) ||
      f.cnpj_cpf.includes(q) ||
      (f.email || "").toLowerCase().includes(q) ||
      (f.cidade || "").toLowerCase().includes(q)
    );
  });

  // Reset page when search changes
  useEffect(() => { setCurrentPage(1); }, [search]);

  return (
    <AppLayout>
      <div className="space-y-5">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-foreground flex items-center gap-2">
              <Truck className="h-6 w-6 text-primary" />
              Fornecedores
            </h1>
            <p className="text-sm text-muted-foreground">
              Cadastro e gestão de fornecedores
            </p>
          </div>
          {canEdit && (
            <Button className="gap-2" onClick={openNew}>
              <Plus className="h-4 w-4" /> Novo Fornecedor
            </Button>
          )}
        </div>

        {/* Search */}
        <div className="relative max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Buscar por nome, CNPJ, email, cidade..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9"
          />
        </div>

        {/* Table */}
        <div className="bg-card rounded-xl border border-border shadow-sm overflow-hidden">
          <Table>
            <TableHeader>
              <TableRow className="bg-muted/50">
                <TableHead>Nome Fantasia</TableHead>
                <TableHead>CNPJ/CPF</TableHead>
                <TableHead>Contato</TableHead>
                <TableHead>Cidade/UF</TableHead>
                <TableHead>Status</TableHead>
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
              ) : filtered.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={6} className="text-center py-16 text-muted-foreground">
                    <Truck className="h-8 w-8 mx-auto mb-2 opacity-30" />
                    {search ? "Nenhum fornecedor encontrado" : "Nenhum fornecedor cadastrado"}
                  </TableCell>
                </TableRow>
              ) : filtered.slice((currentPage - 1) * ITEMS_PER_PAGE, currentPage * ITEMS_PER_PAGE).map((f) => (
                <TableRow key={f.id}>
                  <TableCell>
                    <div>
                      <span className="font-medium">{f.nome_fantasia}</span>
                      {f.razao_social && (
                        <p className="text-xs text-muted-foreground truncate max-w-[200px]">{f.razao_social}</p>
                      )}
                    </div>
                  </TableCell>
                  <TableCell className="text-sm font-mono">{f.cnpj_cpf}</TableCell>
                  <TableCell>
                    <div className="space-y-0.5">
                      {f.contato_nome && (
                        <span className="text-sm">{f.contato_nome}</span>
                      )}
                      {f.telefone && (
                        <p className="text-xs text-muted-foreground flex items-center gap-1">
                          <Phone className="h-3 w-3" /> {f.telefone}
                        </p>
                      )}
                      {f.email && (
                        <p className="text-xs text-muted-foreground flex items-center gap-1">
                          <Mail className="h-3 w-3" /> {f.email}
                        </p>
                      )}
                    </div>
                  </TableCell>
                  <TableCell>
                    {f.cidade || f.uf ? (
                      <span className="text-sm text-muted-foreground flex items-center gap-1">
                        <MapPin className="h-3 w-3" /> {[f.cidade, f.uf].filter(Boolean).join(" / ")}
                      </span>
                    ) : (
                      <span className="text-xs text-muted-foreground">—</span>
                    )}
                  </TableCell>
                  <TableCell>
                    <button onClick={() => canEdit && handleToggleAtivo(f)} className="focus:outline-none" disabled={!canEdit}>
                      {f.ativo ? (
                        <Badge className="bg-emerald-100 text-emerald-700 border-emerald-200 hover:bg-emerald-100 gap-1 text-xs cursor-pointer dark:bg-emerald-900/30 dark:text-emerald-400 dark:border-emerald-800">
                          <CheckCircle className="h-3 w-3" /> Ativo
                        </Badge>
                      ) : (
                        <Badge variant="secondary" className="gap-1 text-xs cursor-pointer">
                          <XCircle className="h-3 w-3" /> Inativo
                        </Badge>
                      )}
                    </button>
                  </TableCell>
                  <TableCell className="text-right">
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="icon" className="h-7 w-7">
                          <MoreHorizontal className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end" className="w-44">
                        <DropdownMenuItem onClick={() => openEdit(f)} className="cursor-pointer">
                          <Pencil className="h-4 w-4 mr-2" /> Editar
                        </DropdownMenuItem>
                        {canEdit && (
                          <>
                            <DropdownMenuSeparator />
                            <DropdownMenuItem onClick={() => setDeletingId(f.id)} className="cursor-pointer text-destructive focus:text-destructive">
                              <Trash2 className="h-4 w-4 mr-2" /> Excluir
                            </DropdownMenuItem>
                          </>
                        )}
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
          <TablePagination
            currentPage={currentPage}
            totalPages={Math.ceil(filtered.length / ITEMS_PER_PAGE)}
            totalItems={filtered.length}
            itemsPerPage={ITEMS_PER_PAGE}
            onPageChange={setCurrentPage}
          />
        </div>
      </div>

      {/* Dialog criar/editar */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Truck className="h-5 w-5 text-primary" />
              {editing ? "Editar Fornecedor" : "Novo Fornecedor"}
            </DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSave} className="space-y-4">
            {/* CNPJ/CPF */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <Label>CNPJ/CPF *</Label>
                <Input
                  value={form.cnpj_cpf}
                  onChange={(e) => setForm((f) => ({ ...f, cnpj_cpf: e.target.value }))}
                  onBlur={handleCnpjBlur}
                  placeholder="00.000.000/0000-00"
                />
                {cnpjError && <p className="text-xs text-destructive mt-1">{cnpjError}</p>}
                {loadingCnpj && <p className="text-xs text-muted-foreground mt-1">Consultando CNPJ...</p>}
              </div>
              <div>
                <Label>Razão Social</Label>
                <Input
                  value={form.razao_social}
                  onChange={(e) => setForm((f) => ({ ...f, razao_social: e.target.value }))}
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <Label>Nome Fantasia *</Label>
                <Input
                  value={form.nome_fantasia}
                  onChange={(e) => setForm((f) => ({ ...f, nome_fantasia: e.target.value }))}
                />
              </div>
              <div>
                <Label>Inscrição Estadual</Label>
                <div className="space-y-1">
                  <Input
                    value={form.ie_isento ? "ISENTO" : form.inscricao_estadual}
                    onChange={(e) => setForm((f) => ({ ...f, inscricao_estadual: e.target.value }))}
                    disabled={form.ie_isento}
                  />
                  <div className="flex items-center gap-2">
                    <Checkbox
                      checked={form.ie_isento}
                      onCheckedChange={(v) => setForm((f) => ({ ...f, ie_isento: !!v, inscricao_estadual: v ? "ISENTO" : "" }))}
                      id="ie-isento"
                    />
                    <label htmlFor="ie-isento" className="text-xs text-muted-foreground cursor-pointer">ISENTO</label>
                  </div>
                </div>
              </div>
            </div>

            {/* Contato */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div>
                <Label>Nome do Contato</Label>
                <Input
                  value={form.contato_nome}
                  onChange={(e) => setForm((f) => ({ ...f, contato_nome: e.target.value }))}
                />
              </div>
              <div>
                <Label>Telefone</Label>
                <Input
                  value={form.telefone}
                  onChange={(e) => setForm((f) => ({ ...f, telefone: e.target.value }))}
                  placeholder="(00) 00000-0000"
                />
              </div>
              <div>
                <Label>E-mail</Label>
                <Input
                  type="email"
                  value={form.email}
                  onChange={(e) => setForm((f) => ({ ...f, email: e.target.value }))}
                />
              </div>
            </div>

            {/* Endereço */}
            <div className="border-t border-border pt-4 mt-4">
              <h3 className="text-sm font-medium mb-3 flex items-center gap-1.5">
                <MapPin className="h-4 w-4 text-muted-foreground" /> Endereço
              </h3>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div>
                  <Label>CEP</Label>
                  <Input
                    value={form.cep}
                    onChange={(e) => setForm((f) => ({ ...f, cep: e.target.value }))}
                    onBlur={handleCepBlur}
                    placeholder="00000-000"
                  />
                  {cepError && <p className="text-xs text-destructive mt-1">{cepError}</p>}
                  {loadingCep && <p className="text-xs text-muted-foreground mt-1">Consultando CEP...</p>}
                </div>
                <div className="sm:col-span-2">
                  <Label>Logradouro</Label>
                  <Input
                    value={form.logradouro}
                    onChange={(e) => setForm((f) => ({ ...f, logradouro: e.target.value }))}
                  />
                </div>
              </div>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mt-3">
                <div>
                  <Label>Número</Label>
                  <Input
                    value={form.numero}
                    onChange={(e) => setForm((f) => ({ ...f, numero: e.target.value }))}
                  />
                </div>
                <div>
                  <Label>Complemento</Label>
                  <Input
                    value={form.complemento}
                    onChange={(e) => setForm((f) => ({ ...f, complemento: e.target.value }))}
                  />
                </div>
                <div>
                  <Label>Bairro</Label>
                  <Input
                    value={form.bairro}
                    onChange={(e) => setForm((f) => ({ ...f, bairro: e.target.value }))}
                  />
                </div>
                <div>
                  <Label>Cidade</Label>
                  <Input
                    value={form.cidade}
                    onChange={(e) => setForm((f) => ({ ...f, cidade: e.target.value }))}
                  />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4 mt-3">
                <div>
                  <Label>UF</Label>
                  <Select value={form.uf} onValueChange={(v) => setForm((f) => ({ ...f, uf: v }))}>
                    <SelectTrigger><SelectValue placeholder="Selecione" /></SelectTrigger>
                    <SelectContent>
                      {UF_LIST.map((uf) => (
                        <SelectItem key={uf} value={uf}>{uf}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </div>

            {/* Observações */}
            <div>
              <Label>Observações</Label>
              <Textarea
                value={form.observacoes}
                onChange={(e) => setForm((f) => ({ ...f, observacoes: e.target.value }))}
                placeholder="Informações adicionais sobre o fornecedor..."
                rows={3}
              />
            </div>

            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setDialogOpen(false)}>Cancelar</Button>
              <Button type="submit" disabled={saving}>
                {saving && <Loader2 className="h-4 w-4 animate-spin mr-2" />}
                {editing ? "Salvar" : "Cadastrar"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Delete confirmation */}
      <AlertDialog open={!!deletingId} onOpenChange={() => setDeletingId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Excluir fornecedor?</AlertDialogTitle>
            <AlertDialogDescription>
              Esta ação não pode ser desfeita. O fornecedor será removido permanentemente.
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
