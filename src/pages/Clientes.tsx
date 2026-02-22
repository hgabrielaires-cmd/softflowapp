import { useState, useEffect } from "react";
import { AppLayout } from "@/components/AppLayout";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/context/AuthContext";
import { Cliente, Filial, Contrato } from "@/lib/supabase-types";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
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
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { toast } from "sonner";
import { Plus, Search, Pencil, Building2, Phone, Mail, FileText, ArrowUpCircle, ArrowDownCircle, Package, Loader2, MapPin, AlertCircle, Users, Star, Trash2 } from "lucide-react";
import { ClientePlanViewer } from "@/components/ClientePlanViewer";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";

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
  filial_id: "",
  ativo: true,
};

interface ClienteContato {
  id: string;
  cliente_id: string;
  nome: string;
  cargo: string | null;
  telefone: string | null;
  email: string | null;
  decisor: boolean;
  ativo: boolean;
  created_at: string;
}

const emptyContatoForm = {
  nome: "",
  cargo: "",
  telefone: "",
  email: "",
  decisor: false,
  ativo: true,
};

interface PedidoHistorico {
  id: string;
  tipo_pedido: string;
  status_pedido: string;
  financeiro_status: string;
  valor_implantacao_final: number;
  valor_mensalidade_final: number;
  valor_total: number;
  created_at: string;
  planos?: { nome: string } | null;
  modulos_adicionais?: any[];
}

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
  const [loadingCep, setLoadingCep] = useState(false);
  const [loadingCnpj, setLoadingCnpj] = useState(false);
  const [cepError, setCepError] = useState("");
  const [cnpjError, setCnpjError] = useState("");
  const isQuerying = loadingCep || loadingCnpj;

  // Contatos (modal separado — histórico/edição extra)
  const [contatosOpen, setContatosOpen] = useState(false);
  const [clienteContatos, setClienteContatos] = useState<Cliente | null>(null);
  const [contatos, setContatos] = useState<ClienteContato[]>([]);
  const [loadingContatos, setLoadingContatos] = useState(false);
  const [contatoDialogOpen, setContatoDialogOpen] = useState(false);
  const [editingContato, setEditingContato] = useState<ClienteContato | null>(null);
  const [contatoForm, setContatoForm] = useState(emptyContatoForm);
  const [savingContato, setSavingContato] = useState(false);

  // Contatos inline no formulário de cadastro/edição
  const [formContatos, setFormContatos] = useState<(typeof emptyContatoForm & { _id?: string })[]>([]);
  const [showContatoInlineForm, setShowContatoInlineForm] = useState(false);
  const [editingInlineIdx, setEditingInlineIdx] = useState<number | null>(null);
  const [inlineContatoForm, setInlineContatoForm] = useState(emptyContatoForm);

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

  // Historico contratual
  const [historicoOpen, setHistoricoOpen] = useState(false);
  const [clienteHistorico, setClienteHistorico] = useState<Cliente | null>(null);
  const [contratosList, setContratosList] = useState<Contrato[]>([]);
  const [pedidosHistorico, setPedidosHistorico] = useState<PedidoHistorico[]>([]);
  const [loadingHistorico, setLoadingHistorico] = useState(false);

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

  const searchTerm = search.toLowerCase().trim();
  const searchDigits = searchTerm.replace(/\D/g, "");
  const filtered = searchTerm
    ? clientes.filter((c) =>
        c.nome_fantasia.toLowerCase().includes(searchTerm) ||
        (c.razao_social || "").toLowerCase().includes(searchTerm) ||
        (searchDigits.length > 0 && (c.cnpj_cpf || "").replace(/\D/g, "").includes(searchDigits)) ||
        (c.cnpj_cpf || "").toLowerCase().includes(searchTerm) ||
        (c.contato_nome || "").toLowerCase().includes(searchTerm) ||
        (c.telefone || "").includes(searchTerm)
      )
    : clientes;
  
  console.log("[SEARCH DEBUG]", { search, searchTerm, totalClientes: clientes.length, filteredCount: filtered.length });

  function openCreate() {
    setEditing(null);
    setCepError("");
    setCnpjError("");
    const defaultFilial = isVendedor && profile?.filial_id ? profile.filial_id : "";
    setForm({ ...emptyForm, filial_id: defaultFilial });
    setFormContatos([]);
    setShowContatoInlineForm(false);
    setEditingInlineIdx(null);
    setInlineContatoForm(emptyContatoForm);
    setDialogOpen(true);
  }

  async function openEdit(c: Cliente) {
    setEditing(c);
    const ieIsento = (c as any).inscricao_estadual === "ISENTO";
    setForm({
      nome_fantasia: c.nome_fantasia,
      razao_social: c.razao_social || "",
      cnpj_cpf: c.cnpj_cpf,
      inscricao_estadual: ieIsento ? "" : ((c as any).inscricao_estadual || ""),
      ie_isento: ieIsento,
      contato_nome: c.contato_nome || "",
      telefone: c.telefone || "",
      email: c.email || "",
      cidade: c.cidade || "",
      uf: c.uf || "",
      cep: (c as any).cep || "",
      logradouro: (c as any).logradouro || "",
      numero: (c as any).numero || "",
      complemento: (c as any).complemento || "",
      bairro: (c as any).bairro || "",
      filial_id: c.filial_id || "",
      ativo: c.ativo,
    });
    setShowContatoInlineForm(false);
    setEditingInlineIdx(null);
    setInlineContatoForm(emptyContatoForm);
    // Carrega contatos existentes
    const { data } = await supabase
      .from("cliente_contatos")
      .select("*")
      .eq("cliente_id", c.id)
      .order("decisor", { ascending: false })
      .order("nome");
    setFormContatos((data || []).map((ct: any) => ({
      _id: ct.id,
      nome: ct.nome,
      cargo: ct.cargo || "",
      telefone: ct.telefone || "",
      email: ct.email || "",
      decisor: ct.decisor,
      ativo: ct.ativo,
    })));
    setDialogOpen(true);
  }

  async function openHistorico(c: Cliente) {
    setClienteHistorico(c);
    setHistoricoOpen(true);
    setLoadingHistorico(true);
    const [{ data: cData }, { data: pData }] = await Promise.all([
      supabase.from("contratos").select("*").eq("cliente_id", c.id).order("created_at", { ascending: false }),
      supabase.from("pedidos")
        .select("id, tipo_pedido, status_pedido, financeiro_status, valor_implantacao_final, valor_mensalidade_final, valor_total, created_at, modulos_adicionais, planos(nome)")
        .eq("cliente_id", c.id)
        .order("created_at", { ascending: false }),
    ]);
    setContratosList((cData || []) as unknown as Contrato[]);
    setPedidosHistorico((pData || []) as unknown as PedidoHistorico[]);
    setLoadingHistorico(false);
  }

  // Contatos
  async function openContatos(c: Cliente) {
    setClienteContatos(c);
    setContatosOpen(true);
    await fetchContatos(c.id);
  }

  async function fetchContatos(clienteId: string) {
    setLoadingContatos(true);
    const { data } = await supabase
      .from("cliente_contatos")
      .select("*")
      .eq("cliente_id", clienteId)
      .order("decisor", { ascending: false })
      .order("nome");
    setContatos((data || []) as ClienteContato[]);
    setLoadingContatos(false);
  }

  function openNovoContato() {
    setEditingContato(null);
    setContatoForm(emptyContatoForm);
    setContatoDialogOpen(true);
  }

  function openEditContato(c: ClienteContato) {
    setEditingContato(c);
    setContatoForm({
      nome: c.nome,
      cargo: c.cargo || "",
      telefone: c.telefone || "",
      email: c.email || "",
      decisor: c.decisor,
      ativo: c.ativo,
    });
    setContatoDialogOpen(true);
  }

  async function handleSaveContato() {
    if (!contatoForm.nome.trim()) {
      toast.error("Nome é obrigatório");
      return;
    }
    if (!clienteContatos) return;
    setSavingContato(true);

    const payload = {
      cliente_id: clienteContatos.id,
      nome: contatoForm.nome.trim(),
      cargo: contatoForm.cargo.trim() || null,
      telefone: contatoForm.telefone.trim() || null,
      email: contatoForm.email.trim() || null,
      decisor: contatoForm.decisor,
      ativo: contatoForm.ativo,
    };

    // Se marcando como decisor, desmarcar os outros
    if (contatoForm.decisor) {
      await supabase
        .from("cliente_contatos")
        .update({ decisor: false })
        .eq("cliente_id", clienteContatos.id)
        .neq("id", editingContato?.id || "");
    }

    let error;
    if (editingContato) {
      ({ error } = await supabase.from("cliente_contatos").update(payload).eq("id", editingContato.id));
    } else {
      ({ error } = await supabase.from("cliente_contatos").insert(payload));
    }

    if (error) {
      toast.error("Erro ao salvar contato: " + error.message);
    } else {
      toast.success(editingContato ? "Contato atualizado!" : "Contato adicionado!");
      setContatoDialogOpen(false);
      await fetchContatos(clienteContatos.id);
    }
    setSavingContato(false);
  }

  async function handleToggleDecisor(contato: ClienteContato) {
    if (!clienteContatos) return;
    if (!contato.decisor) {
      // Desmarcar todos e marcar esse
      await supabase.from("cliente_contatos").update({ decisor: false }).eq("cliente_id", clienteContatos.id);
      await supabase.from("cliente_contatos").update({ decisor: true }).eq("id", contato.id);
    } else {
      await supabase.from("cliente_contatos").update({ decisor: false }).eq("id", contato.id);
    }
    await fetchContatos(clienteContatos.id);
  }

  async function handleToggleAtivoContato(contato: ClienteContato) {
    if (!clienteContatos) return;
    await supabase.from("cliente_contatos").update({ ativo: !contato.ativo }).eq("id", contato.id);
    await fetchContatos(clienteContatos.id);
  }

  async function handleDeleteContato(contato: ClienteContato) {
    if (!clienteContatos) return;
    const { error } = await supabase.from("cliente_contatos").delete().eq("id", contato.id);
    if (error) {
      toast.error("Erro ao excluir contato");
    } else {
      toast.success("Contato removido");
      await fetchContatos(clienteContatos.id);
    }
  }

  async function handleSave() {
    if (isQuerying) return;
    if (!form.nome_fantasia.trim() || !form.cnpj_cpf.trim()) {
      toast.error("Nome fantasia e CNPJ/CPF são obrigatórios");
      return;
    }
    if (formContatos.filter((c) => c.ativo !== false).length === 0 && formContatos.length === 0) {
      toast.error("Cadastre pelo menos um contato antes de salvar");
      return;
    }
    if (formContatos.length === 0) {
      toast.error("Cadastre pelo menos um contato antes de salvar");
      return;
    }
    setSaving(true);

    // ── Verificação de CNPJ duplicado ──────────────────────────────────────
    if (!editing) {
      // Verifica se o usuário tem permissão para cadastrar CNPJ duplicado
      const { data: profileData } = await supabase
        .from("profiles")
        .select("permitir_cnpj_duplicado")
        .eq("user_id", profile?.user_id || "")
        .maybeSingle();

      const podeduplicar = isAdmin || (profileData as any)?.permitir_cnpj_duplicado === true;

      if (!podeduplicar) {
        const cnpjLimpo = form.cnpj_cpf.trim();
        const { data: existente } = await supabase
          .from("clientes")
          .select("id, nome_fantasia")
          .eq("cnpj_cpf", cnpjLimpo)
          .maybeSingle();

        if (existente) {
          toast.error(`CNPJ/CPF já cadastrado para o cliente "${existente.nome_fantasia}". Para cadastrar com CNPJ duplicado, solicite permissão ao administrador.`);
          setSaving(false);
          return;
        }
      }
    }

    const payload = {
      nome_fantasia: form.nome_fantasia.trim(),
      razao_social: form.razao_social.trim() || null,
      cnpj_cpf: form.cnpj_cpf.trim(),
      inscricao_estadual: form.ie_isento ? "ISENTO" : (form.inscricao_estadual.trim() || null),
      contato_nome: formContatos[0]?.nome || form.contato_nome.trim() || null,
      telefone: formContatos[0]?.telefone || form.telefone.trim() || null,
      email: formContatos[0]?.email || form.email.trim() || null,
      cidade: form.cidade.trim() || null,
      uf: form.uf || null,
      cep: form.cep.replace(/\D/g, "") || null,
      logradouro: form.logradouro.trim() || null,
      numero: form.numero.trim() || null,
      complemento: form.complemento.trim() || null,
      bairro: form.bairro.trim() || null,
      filial_id: form.filial_id || null,
      ativo: form.ativo,
    };
    if (editing) {
      const { error } = await supabase.from("clientes").update(payload).eq("id", editing.id);
      if (error) { toast.error("Erro ao atualizar cliente"); setSaving(false); return; }
      // Sincronizar contatos: upsert dos com _id, inserir novos
      for (const ct of formContatos) {
        if (ct._id) {
          await supabase.from("cliente_contatos").update({
            nome: ct.nome, cargo: ct.cargo || null, telefone: ct.telefone || null,
            email: ct.email || null, decisor: ct.decisor, ativo: ct.ativo,
          }).eq("id", ct._id);
        } else {
          await supabase.from("cliente_contatos").insert({
            cliente_id: editing.id, nome: ct.nome, cargo: ct.cargo || null,
            telefone: ct.telefone || null, email: ct.email || null, decisor: ct.decisor, ativo: ct.ativo,
          });
        }
      }
      toast.success("Cliente atualizado com sucesso");
    } else {
      const { data: newCliente, error } = await supabase.from("clientes").insert(payload).select().single();
      if (error || !newCliente) { toast.error("Erro ao cadastrar cliente"); setSaving(false); return; }
      // Inserir contatos
      for (const ct of formContatos) {
        await supabase.from("cliente_contatos").insert({
          cliente_id: newCliente.id, nome: ct.nome, cargo: ct.cargo || null,
          telefone: ct.telefone || null, email: ct.email || null, decisor: ct.decisor, ativo: ct.ativo,
        });
      }
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

  function fmtBRL(v: number) {
    return (v ?? 0).toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
  }

  function fmtDate(d: string) {
    return format(new Date(d), "dd/MM/yyyy", { locale: ptBR });
  }

  function fmtDateTime(d: string) {
    return format(new Date(d), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR });
  }

  const TIPO_PEDIDO_COLORS: Record<string, string> = {
    Novo: "bg-blue-100 text-blue-700",
    Upgrade: "bg-green-100 text-green-700",
    Aditivo: "bg-purple-100 text-purple-700",
  };

  // Dados do historico separados
  const contratosBase = contratosList.filter((c) => c.tipo === "Base");
  const contratosAditivos = contratosList.filter((c) => c.tipo === "Aditivo");
  const pedidosUpgrade = pedidosHistorico.filter((p) => p.tipo_pedido === "Upgrade");
  const pedidosDowngrade = pedidosHistorico.filter((p) => p.tipo_pedido === "Downgrade");

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
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none" />
          <Input
            id="search-clientes"
            placeholder="Buscar por nome fantasia, razão social, CNPJ ou contato..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9"
            autoComplete="off"
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
                <TableHead className="w-28">Ações</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading ? (
                <TableRow>
                  <TableCell colSpan={7} className="text-center text-muted-foreground py-10">
                    Carregando...
                  </TableCell>
                </TableRow>
              ) : filtered.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={7} className="text-center text-muted-foreground py-10">
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
                    <TableCell>
                      <div className="flex items-center gap-1">
                        {canEdit && (
                          <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => openEdit(c)} title="Editar cliente">
                            <Pencil className="h-3.5 w-3.5" />
                          </Button>
                        )}
                        <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => openHistorico(c)} title="Histórico contratual">
                          <FileText className="h-3.5 w-3.5" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>
      </div>

      {/* Dialog criar/editar cliente */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editing ? "Editar cliente" : "Novo cliente"}</DialogTitle>
          </DialogHeader>
          <div className="grid grid-cols-2 gap-4 py-2">

            {/* CNPJ/CPF com busca automatica */}
            <div className="space-y-1.5">
              <Label>CNPJ / CPF *</Label>
              <div className="relative">
                <Input
                  value={form.cnpj_cpf}
                  onChange={(e) => { setCnpjError(""); setForm((f) => ({ ...f, cnpj_cpf: e.target.value })); }}
                  onBlur={handleCnpjBlur}
                  placeholder="00.000.000/0001-00"
                  className={cnpjError ? "border-destructive pr-9" : "pr-9"}
                />
                {loadingCnpj && (
                  <Loader2 className="absolute right-2.5 top-1/2 -translate-y-1/2 h-4 w-4 animate-spin text-muted-foreground" />
                )}
              </div>
              {cnpjError && (
                <p className="flex items-center gap-1 text-xs text-destructive">
                  <AlertCircle className="h-3 w-3" />{cnpjError}
                </p>
              )}
            </div>

            {/* Filial */}
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

            {/* Nome fantasia */}
            <div className="col-span-2 space-y-1.5">
              <Label>Nome fantasia *</Label>
              <Input value={form.nome_fantasia} onChange={(e) => setForm((f) => ({ ...f, nome_fantasia: e.target.value }))} placeholder="Ex: Restaurante do João" />
            </div>

            {/* Razao social */}
            <div className="col-span-2 space-y-1.5">
              <Label>Razão social</Label>
              <Input value={form.razao_social} onChange={(e) => setForm((f) => ({ ...f, razao_social: e.target.value }))} placeholder="Razão social (opcional)" />
            </div>

            {/* Inscrição estadual */}
            <div className="space-y-1.5">
              <Label>Inscrição estadual</Label>
              <Input
                value={form.inscricao_estadual}
                onChange={(e) => setForm((f) => ({ ...f, inscricao_estadual: e.target.value }))}
                placeholder="Ex: 123.456.789.012"
                disabled={form.ie_isento}
                className={form.ie_isento ? "opacity-50" : ""}
              />
            </div>
            <div className="space-y-1.5 flex flex-col justify-end">
              <div className="flex items-center gap-2 h-10">
                <Switch
                  checked={form.ie_isento}
                  onCheckedChange={(v) => setForm((f) => ({ ...f, ie_isento: v, inscricao_estadual: v ? "" : f.inscricao_estadual }))}
                />
                <Label className="cursor-pointer select-none">Isento de IE</Label>
              </div>
            </div>

            {/* Separador endereco */}
            <div className="col-span-2 pt-1">
              <div className="flex items-center gap-2 text-xs text-muted-foreground font-medium uppercase tracking-wide">
                <MapPin className="h-3.5 w-3.5" />
                Endereço
              </div>
            </div>

            {/* CEP com busca automatica */}
            <div className="space-y-1.5">
              <Label>CEP</Label>
              <div className="relative">
                <Input
                  value={form.cep}
                  onChange={(e) => { setCepError(""); setForm((f) => ({ ...f, cep: e.target.value })); }}
                  onBlur={handleCepBlur}
                  placeholder="00000-000"
                  maxLength={9}
                  className={cepError ? "border-destructive pr-9" : "pr-9"}
                />
                {loadingCep && (
                  <Loader2 className="absolute right-2.5 top-1/2 -translate-y-1/2 h-4 w-4 animate-spin text-muted-foreground" />
                )}
              </div>
              {cepError && (
                <p className="flex items-center gap-1 text-xs text-destructive">
                  <AlertCircle className="h-3 w-3" />{cepError}
                </p>
              )}
            </div>

            {/* Logradouro */}
            <div className="space-y-1.5">
              <Label>Logradouro</Label>
              <Input value={form.logradouro} onChange={(e) => setForm((f) => ({ ...f, logradouro: e.target.value }))} placeholder="Rua / Avenida..." />
            </div>

            {/* Número */}
            <div className="space-y-1.5">
              <Label>Número</Label>
              <Input value={form.numero} onChange={(e) => setForm((f) => ({ ...f, numero: e.target.value }))} placeholder="Ex: 123" />
            </div>

            {/* Complemento */}
            <div className="space-y-1.5">
              <Label>Complemento</Label>
              <Input value={form.complemento} onChange={(e) => setForm((f) => ({ ...f, complemento: e.target.value }))} placeholder="Apto, Sala, Bloco..." />
            </div>

            {/* Bairro */}
            <div className="space-y-1.5">
              <Label>Bairro</Label>
              <Input value={form.bairro} onChange={(e) => setForm((f) => ({ ...f, bairro: e.target.value }))} placeholder="Bairro" />
            </div>

            {/* Cidade e UF */}
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

            {/* ── Seção Contatos ── */}
            <div className="col-span-2 pt-2">
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2 text-xs text-muted-foreground font-medium uppercase tracking-wide">
                  <Users className="h-3.5 w-3.5" />
                  Contatos <span className="text-destructive">*</span>
                  <span className="text-xs font-normal normal-case text-muted-foreground">(obrigatório ao menos 1)</span>
                </div>
                {canEdit && !showContatoInlineForm && (
                  <Button type="button" size="sm" variant="outline" className="gap-1.5 h-7 text-xs"
                    onClick={() => { setEditingInlineIdx(null); setInlineContatoForm(emptyContatoForm); setShowContatoInlineForm(true); }}>
                    <Plus className="h-3 w-3" /> Adicionar contato
                  </Button>
                )}
              </div>

              {/* Lista de contatos */}
              {formContatos.length > 0 && (
                <div className="rounded-lg border border-border divide-y divide-border mb-2">
                  {formContatos.map((ct, idx) => (
                    <div key={idx} className={`flex items-center gap-3 px-3 py-2 ${!ct.ativo ? "opacity-50" : ""}`}>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-1.5">
                          <p className="text-sm font-medium truncate">{ct.nome}</p>
                          {ct.decisor && (
                            <span className="inline-flex items-center gap-0.5 text-xs px-1.5 py-0.5 rounded-full bg-primary/10 text-primary font-medium shrink-0">
                              <Star className="h-2.5 w-2.5 fill-current" /> Decisor
                            </span>
                          )}
                        </div>
                        <div className="flex gap-2 mt-0.5">
                          {ct.cargo && <span className="text-xs text-muted-foreground">{ct.cargo}</span>}
                          {ct.telefone && <span className="text-xs text-muted-foreground">{ct.telefone}</span>}
                          {ct.email && <span className="text-xs text-muted-foreground">{ct.email}</span>}
                        </div>
                      </div>
                      {canEdit && (
                        <div className="flex items-center gap-0.5 shrink-0">
                          <Button type="button" variant="ghost" size="icon" className={`h-6 w-6 ${ct.decisor ? "text-primary" : "text-muted-foreground"}`}
                            title={ct.decisor ? "Remover como decisor" : "Marcar como decisor"}
                            onClick={() => setFormContatos((prev) => prev.map((c, i) => ({ ...c, decisor: i === idx ? !c.decisor : (ct.decisor ? c.decisor : false) })))}>
                            <Star className={`h-3 w-3 ${ct.decisor ? "fill-current" : ""}`} />
                          </Button>
                          <Button type="button" variant="ghost" size="icon" className="h-6 w-6"
                            onClick={() => { setEditingInlineIdx(idx); setInlineContatoForm({ nome: ct.nome, cargo: ct.cargo || "", telefone: ct.telefone || "", email: ct.email || "", decisor: ct.decisor, ativo: ct.ativo }); setShowContatoInlineForm(true); }}>
                            <Pencil className="h-3 w-3" />
                          </Button>
                          <Button type="button" variant="ghost" size="icon" className="h-6 w-6 text-destructive hover:text-destructive"
                            onClick={() => setFormContatos((prev) => prev.filter((_, i) => i !== idx))}>
                            <Trash2 className="h-3 w-3" />
                          </Button>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}

              {formContatos.length === 0 && !showContatoInlineForm && (
                <div className="rounded-lg border border-dashed border-destructive/40 bg-destructive/5 px-4 py-3 text-sm text-muted-foreground text-center">
                  <Users className="h-4 w-4 mx-auto mb-1 text-muted-foreground" />
                  Nenhum contato cadastrado. Adicione pelo menos um contato.
                </div>
              )}

              {/* Formulário inline de contato */}
              {showContatoInlineForm && (
                <div className="rounded-lg border border-border bg-muted/30 p-3 space-y-3">
                  <p className="text-xs font-medium text-foreground">{editingInlineIdx !== null ? "Editar contato" : "Novo contato"}</p>
                  <div className="grid grid-cols-2 gap-2">
                    <div className="col-span-2 space-y-1">
                      <Label className="text-xs">Nome *</Label>
                      <Input className="h-8 text-sm" value={inlineContatoForm.nome} onChange={(e) => setInlineContatoForm((f) => ({ ...f, nome: e.target.value }))} placeholder="Nome completo" />
                    </div>
                    <div className="space-y-1">
                      <Label className="text-xs">Cargo</Label>
                      <Input className="h-8 text-sm" value={inlineContatoForm.cargo} onChange={(e) => setInlineContatoForm((f) => ({ ...f, cargo: e.target.value }))} placeholder="Cargo / função" />
                    </div>
                    <div className="space-y-1">
                      <Label className="text-xs">Telefone</Label>
                      <Input className="h-8 text-sm" value={inlineContatoForm.telefone} onChange={(e) => setInlineContatoForm((f) => ({ ...f, telefone: e.target.value }))} placeholder="(00) 00000-0000" />
                    </div>
                    <div className="col-span-2 space-y-1">
                      <Label className="text-xs">E-mail</Label>
                      <Input className="h-8 text-sm" type="email" value={inlineContatoForm.email} onChange={(e) => setInlineContatoForm((f) => ({ ...f, email: e.target.value }))} placeholder="email@empresa.com" />
                    </div>
                    <div className="col-span-2 flex items-center gap-3">
                      <Checkbox id="inline-decisor" checked={inlineContatoForm.decisor} onCheckedChange={(v) => setInlineContatoForm((f) => ({ ...f, decisor: !!v }))} />
                      <Label htmlFor="inline-decisor" className="text-xs cursor-pointer">Decisor (tomador de decisão)</Label>
                    </div>
                  </div>
                  <div className="flex gap-2 justify-end">
                    <Button type="button" variant="outline" size="sm" className="h-7 text-xs" onClick={() => { setShowContatoInlineForm(false); setEditingInlineIdx(null); }}>Cancelar</Button>
                    <Button type="button" size="sm" className="h-7 text-xs" onClick={() => {
                      if (!inlineContatoForm.nome.trim()) { toast.error("Nome do contato é obrigatório"); return; }
                      if (editingInlineIdx !== null) {
                        setFormContatos((prev) => prev.map((c, i) => i === editingInlineIdx ? { ...c, ...inlineContatoForm, _id: c._id } : c));
                      } else {
                        // Se marcado decisor, desmarcar outros
                        setFormContatos((prev) => [
                          ...(inlineContatoForm.decisor ? prev.map((c) => ({ ...c, decisor: false })) : prev),
                          { ...inlineContatoForm },
                        ]);
                      }
                      setShowContatoInlineForm(false);
                      setEditingInlineIdx(null);
                      setInlineContatoForm(emptyContatoForm);
                    }}>
                      {editingInlineIdx !== null ? "Salvar" : "Adicionar"}
                    </Button>
                  </div>
                </div>
              )}
            </div>

          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>Cancelar</Button>
            <Button onClick={handleSave} disabled={saving || isQuerying}>
              {isQuerying ? (
                <><Loader2 className="h-4 w-4 animate-spin mr-2" />Consultando...</>
              ) : saving ? "Salvando..." : editing ? "Salvar alterações" : "Cadastrar cliente"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>


      <Dialog open={contatosOpen} onOpenChange={setContatosOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Users className="h-4 w-4" />
              Contatos — {clienteContatos?.nome_fantasia}
            </DialogTitle>
          </DialogHeader>

          {canEdit && (
            <div className="flex justify-end">
              <Button size="sm" className="gap-1.5" onClick={openNovoContato}>
                <Plus className="h-3.5 w-3.5" /> Novo contato
              </Button>
            </div>
          )}

          {loadingContatos ? (
            <div className="flex items-center justify-center py-10">
              <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
            </div>
          ) : contatos.length === 0 ? (
            <div className="text-center text-muted-foreground py-10 text-sm">
              Nenhum contato cadastrado. Clique em "Novo contato" para adicionar.
            </div>
          ) : (
            <div className="rounded-lg border border-border divide-y divide-border">
              {contatos.map((c) => (
                <div key={c.id} className={`flex items-start gap-3 px-4 py-3 ${!c.ativo ? "opacity-50" : ""}`}>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <p className="text-sm font-medium">{c.nome}</p>
                      {c.decisor && (
                        <span className="inline-flex items-center gap-1 text-xs px-1.5 py-0.5 rounded-full bg-primary/10 text-primary font-medium">
                          <Star className="h-2.5 w-2.5 fill-current" /> Decisor
                        </span>
                      )}
                      {!c.ativo && (
                        <span className="text-xs px-1.5 py-0.5 rounded-full bg-muted text-muted-foreground">Inativo</span>
                      )}
                    </div>
                    {c.cargo && <p className="text-xs text-muted-foreground">{c.cargo}</p>}
                    <div className="flex gap-3 mt-1">
                      {c.telefone && (
                        <span className="text-xs text-muted-foreground flex items-center gap-1">
                          <Phone className="h-3 w-3" />{c.telefone}
                        </span>
                      )}
                      {c.email && (
                        <span className="text-xs text-muted-foreground flex items-center gap-1">
                          <Mail className="h-3 w-3" />{c.email}
                        </span>
                      )}
                    </div>
                  </div>
                  {canEdit && (
                    <div className="flex items-center gap-1 shrink-0">
                      <Button
                        variant="ghost" size="icon" className={`h-7 w-7 ${c.decisor ? "text-primary" : "text-muted-foreground"}`}
                        onClick={() => handleToggleDecisor(c)}
                        title={c.decisor ? "Remover como decisor" : "Marcar como decisor"}
                      >
                        <Star className={`h-3.5 w-3.5 ${c.decisor ? "fill-current" : ""}`} />
                      </Button>
                      <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => openEditContato(c)} title="Editar contato">
                        <Pencil className="h-3.5 w-3.5" />
                      </Button>
                      <Button
                        variant="ghost" size="icon"
                        className="h-7 w-7 text-destructive hover:text-destructive"
                        onClick={() => handleDeleteContato(c)}
                        title="Remover contato"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </Button>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}

          <DialogFooter>
            <Button variant="outline" onClick={() => setContatosOpen(false)}>Fechar</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Dialog Novo/Editar Contato */}
      <Dialog open={contatoDialogOpen} onOpenChange={setContatoDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>{editingContato ? "Editar contato" : "Novo contato"}</DialogTitle>
          </DialogHeader>
          <div className="grid grid-cols-2 gap-3 py-2">
            <div className="col-span-2 space-y-1.5">
              <Label>Nome *</Label>
              <Input value={contatoForm.nome} onChange={(e) => setContatoForm((f) => ({ ...f, nome: e.target.value }))} placeholder="Nome completo" />
            </div>
            <div className="col-span-2 space-y-1.5">
              <Label>Cargo</Label>
              <Input value={contatoForm.cargo} onChange={(e) => setContatoForm((f) => ({ ...f, cargo: e.target.value }))} placeholder="Ex: Proprietário, Gerente..." />
            </div>
            <div className="space-y-1.5">
              <Label>Telefone</Label>
              <Input value={contatoForm.telefone} onChange={(e) => setContatoForm((f) => ({ ...f, telefone: e.target.value }))} placeholder="(00) 00000-0000" />
            </div>
            <div className="space-y-1.5">
              <Label>E-mail</Label>
              <Input type="email" value={contatoForm.email} onChange={(e) => setContatoForm((f) => ({ ...f, email: e.target.value }))} placeholder="email@empresa.com" />
            </div>
            <div className="col-span-2 flex items-center gap-3 pt-1">
              <Checkbox
                id="decisor"
                checked={contatoForm.decisor}
                onCheckedChange={(v) => setContatoForm((f) => ({ ...f, decisor: !!v }))}
              />
              <div>
                <Label htmlFor="decisor" className="cursor-pointer">Decisor</Label>
                <p className="text-xs text-muted-foreground">Este contato é o tomador de decisão</p>
              </div>
            </div>
            <div className="col-span-2 flex items-center gap-3">
              <Switch checked={contatoForm.ativo} onCheckedChange={(v) => setContatoForm((f) => ({ ...f, ativo: v }))} />
              <Label>Contato ativo</Label>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setContatoDialogOpen(false)}>Cancelar</Button>
            <Button onClick={handleSaveContato} disabled={savingContato}>
              {savingContato ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
              {editingContato ? "Salvar" : "Adicionar contato"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Dialog Historico Contratual */}
      <Dialog open={historicoOpen} onOpenChange={setHistoricoOpen}>
        <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <FileText className="h-4 w-4" />
              Histórico Contratual — {clienteHistorico?.nome_fantasia}
            </DialogTitle>
            {clienteHistorico && (
              <ClientePlanViewer clienteId={clienteHistorico.id} clienteNome={clienteHistorico.nome_fantasia} variant="icon" className="ml-auto shrink-0" />
            )}
          </DialogHeader>

          {loadingHistorico ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
            </div>
          ) : (
            <Tabs defaultValue="contratos" className="mt-2">
              <TabsList className="w-full">
                <TabsTrigger value="contratos" className="flex-1">
                  <FileText className="h-3.5 w-3.5 mr-1.5" />
                  Contratos ({contratosBase.length})
                </TabsTrigger>
                <TabsTrigger value="aditivos" className="flex-1">
                  <Package className="h-3.5 w-3.5 mr-1.5" />
                  Aditivos ({contratosAditivos.length})
                </TabsTrigger>
                <TabsTrigger value="upgrades" className="flex-1">
                  <ArrowUpCircle className="h-3.5 w-3.5 mr-1.5" />
                  Upgrades ({pedidosUpgrade.length})
                </TabsTrigger>
                <TabsTrigger value="downgrades" className="flex-1">
                  <ArrowDownCircle className="h-3.5 w-3.5 mr-1.5" />
                  Downgrades ({pedidosDowngrade.length})
                </TabsTrigger>
              </TabsList>

              {/* Contratos Base */}
              <TabsContent value="contratos" className="mt-3">
                {contratosBase.length === 0 ? (
                  <p className="text-sm text-muted-foreground text-center py-8">Nenhum contrato base.</p>
                ) : (
                  <div className="rounded-lg border border-border divide-y divide-border">
                    {contratosBase.map((ct) => (
                      <div key={ct.id} className="px-4 py-3 flex items-center justify-between">
                        <div>
                          <p className="text-sm font-medium">{ct.numero_exibicao}</p>
                          <p className="text-xs text-muted-foreground">{fmtDateTime(ct.created_at)}</p>
                        </div>
                        <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${ct.status === "Ativo" ? "bg-emerald-100 text-emerald-700" : "bg-muted text-muted-foreground"}`}>
                          {ct.status}
                        </span>
                      </div>
                    ))}
                  </div>
                )}
              </TabsContent>

              {/* Aditivos */}
              <TabsContent value="aditivos" className="mt-3">
                {contratosAditivos.length === 0 ? (
                  <p className="text-sm text-muted-foreground text-center py-8">Nenhum termo aditivo.</p>
                ) : (
                  <div className="rounded-lg border border-border divide-y divide-border">
                    {contratosAditivos.map((ct) => (
                      <div key={ct.id} className="px-4 py-3 flex items-center justify-between">
                        <div>
                          <p className="text-sm font-medium">{ct.numero_exibicao}</p>
                          <p className="text-xs text-muted-foreground">{fmtDateTime(ct.created_at)}</p>
                        </div>
                        <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${ct.status === "Ativo" ? "bg-emerald-100 text-emerald-700" : "bg-muted text-muted-foreground"}`}>
                          {ct.status}
                        </span>
                      </div>
                    ))}
                  </div>
                )}
              </TabsContent>

              {/* Upgrades */}
              <TabsContent value="upgrades" className="mt-3">
                {pedidosUpgrade.length === 0 ? (
                  <p className="text-sm text-muted-foreground text-center py-8">Nenhum upgrade registrado.</p>
                ) : (
                  <div className="rounded-lg border border-border divide-y divide-border">
                    {pedidosUpgrade.map((p) => (
                      <div key={p.id} className="px-4 py-3">
                        <div className="flex items-center justify-between">
                          <div>
                            <p className="text-sm font-medium">{p.planos?.nome || "—"}</p>
                            <p className="text-xs text-muted-foreground">{fmtDateTime(p.created_at)}</p>
                          </div>
                          <div className="text-right">
                            <p className="text-xs font-mono">{fmtBRL(p.valor_total)}</p>
                            <span className={`text-xs px-1.5 py-0.5 rounded-full font-medium ${TIPO_PEDIDO_COLORS[p.tipo_pedido] || "bg-muted text-muted-foreground"}`}>
                              {p.tipo_pedido}
                            </span>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </TabsContent>

              {/* Downgrades */}
              <TabsContent value="downgrades" className="mt-3">
                {pedidosDowngrade.length === 0 ? (
                  <p className="text-sm text-muted-foreground text-center py-8">Nenhum downgrade registrado.</p>
                ) : (
                  <div className="rounded-lg border border-border divide-y divide-border">
                    {pedidosDowngrade.map((p) => (
                      <div key={p.id} className="px-4 py-3">
                        <div className="flex items-center justify-between">
                          <div>
                            <p className="text-sm font-medium">{p.planos?.nome || "—"}</p>
                            <p className="text-xs text-muted-foreground">{fmtDateTime(p.created_at)}</p>
                          </div>
                          <div className="text-right space-y-1">
                            <p className="text-xs font-mono">{fmtBRL(p.valor_total)}</p>
                            <span className="text-xs px-1.5 py-0.5 rounded-full font-medium bg-amber-100 text-amber-700 border border-amber-200">
                              Downgrade
                            </span>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </TabsContent>
            </Tabs>
          )}

          <DialogFooter>
            <Button variant="outline" onClick={() => setHistoricoOpen(false)}>Fechar</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </AppLayout>
  );
}
