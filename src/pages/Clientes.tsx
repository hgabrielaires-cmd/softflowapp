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
import { Plus, Search, Pencil, Building2, Phone, Mail, FileText, ArrowUpCircle, Package, Loader2 } from "lucide-react";
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
  contato_nome: "",
  telefone: "",
  email: "",
  cidade: "",
  uf: "",
  filial_id: "",
  ativo: true,
};

interface PedidoHistorico {
  id: string;
  tipo_pedido: string;
  status_pedido: string;
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

  // Histórico contratual
  const [historicoOpen, setHistoricoOpen] = useState(false);
  const [clienteHistorico, setClienteHistorico] = useState<Cliente | null>(null);
  const [contratos, setContratos] = useState<Contrato[]>([]);
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

  async function openHistorico(c: Cliente) {
    setClienteHistorico(c);
    setHistoricoOpen(true);
    setLoadingHistorico(true);
    const [{ data: cData }, { data: pData }] = await Promise.all([
      supabase.from("contratos").select("*").eq("cliente_id", c.id).order("created_at", { ascending: false }),
      supabase.from("pedidos")
        .select("id, tipo_pedido, status_pedido, valor_implantacao_final, valor_mensalidade_final, valor_total, created_at, modulos_adicionais, planos(nome)")
        .eq("cliente_id", c.id)
        .order("created_at", { ascending: false }),
    ]);
    setContratos((cData || []) as unknown as Contrato[]);
    setPedidosHistorico((pData || []) as unknown as PedidoHistorico[]);
    setLoadingHistorico(false);
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

  function fmtBRL(v: number) {
    return (v ?? 0).toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
  }

  function fmtDate(d: string) {
    return format(new Date(d), "dd/MM/yyyy", { locale: ptBR });
  }

  const TIPO_PEDIDO_COLORS: Record<string, string> = {
    Novo: "bg-blue-100 text-blue-700",
    Upgrade: "bg-green-100 text-green-700",
    Aditivo: "bg-purple-100 text-purple-700",
  };

  // Dados do histórico separados
  const contratosBase = contratos.filter((c) => c.tipo === "Base");
  const contratosAditivos = contratos.filter((c) => c.tipo === "Termo Aditivo");
  const pedidosUpgrade = pedidosHistorico.filter((p) => p.tipo_pedido === "Upgrade");

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
                <TableHead className="w-24">Ações</TableHead>
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

      {/* Dialog Histórico Contratual */}
      <Dialog open={historicoOpen} onOpenChange={setHistoricoOpen}>
        <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <FileText className="h-4 w-4" />
              Histórico Contratual — {clienteHistorico?.nome_fantasia}
            </DialogTitle>
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
                <TabsTrigger value="pedidos" className="flex-1">
                  Todos os pedidos ({pedidosHistorico.length})
                </TabsTrigger>
              </TabsList>

              {/* Contratos Base */}
              <TabsContent value="contratos" className="mt-4">
                {contratosBase.length === 0 ? (
                  <p className="text-center text-muted-foreground py-8 text-sm">Nenhum contrato base registrado</p>
                ) : (
                  <div className="rounded-lg border border-border overflow-hidden">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Nº</TableHead>
                          <TableHead>Exibição</TableHead>
                          <TableHead>Tipo</TableHead>
                          <TableHead>Status</TableHead>
                          <TableHead>Data</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {contratosBase.map((c) => (
                          <TableRow key={c.id}>
                            <TableCell className="font-mono font-medium">{c.numero_registro}</TableCell>
                            <TableCell className="font-mono text-sm">{c.numero_exibicao}</TableCell>
                            <TableCell>
                              <Badge variant="outline">{c.tipo}</Badge>
                            </TableCell>
                            <TableCell>
                              <Badge variant={c.status === "Ativo" ? "default" : "secondary"}>
                                {c.status}
                              </Badge>
                            </TableCell>
                            <TableCell className="text-sm text-muted-foreground">{fmtDate(c.created_at)}</TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                )}
              </TabsContent>

              {/* Termos Aditivos */}
              <TabsContent value="aditivos" className="mt-4">
                {contratosAditivos.length === 0 ? (
                  <p className="text-center text-muted-foreground py-8 text-sm">Nenhum termo aditivo registrado</p>
                ) : (
                  <div className="rounded-lg border border-border overflow-hidden">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Nº</TableHead>
                          <TableHead>Exibição</TableHead>
                          <TableHead>Status</TableHead>
                          <TableHead>Data</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {contratosAditivos.map((c) => (
                          <TableRow key={c.id}>
                            <TableCell className="font-mono font-medium">{c.numero_registro}</TableCell>
                            <TableCell className="font-mono text-sm">{c.numero_exibicao}</TableCell>
                            <TableCell>
                              <Badge variant={c.status === "Ativo" ? "default" : "secondary"}>
                                {c.status}
                              </Badge>
                            </TableCell>
                            <TableCell className="text-sm text-muted-foreground">{fmtDate(c.created_at)}</TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                )}
              </TabsContent>

              {/* Upgrades */}
              <TabsContent value="upgrades" className="mt-4">
                {pedidosUpgrade.length === 0 ? (
                  <p className="text-center text-muted-foreground py-8 text-sm">Nenhum upgrade realizado</p>
                ) : (
                  <div className="rounded-lg border border-border overflow-hidden">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Plano</TableHead>
                          <TableHead>Status</TableHead>
                          <TableHead className="text-right">Implantação</TableHead>
                          <TableHead className="text-right">Mensalidade</TableHead>
                          <TableHead>Data</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {pedidosUpgrade.map((p) => (
                          <TableRow key={p.id}>
                            <TableCell className="font-medium">{p.planos?.nome || "—"}</TableCell>
                            <TableCell>
                              <span className="text-xs px-2 py-0.5 rounded-full bg-muted text-muted-foreground">
                                {p.status_pedido}
                              </span>
                            </TableCell>
                            <TableCell className="text-right font-mono text-sm">{fmtBRL(p.valor_implantacao_final ?? 0)}</TableCell>
                            <TableCell className="text-right font-mono text-sm">{fmtBRL(p.valor_mensalidade_final ?? 0)}</TableCell>
                            <TableCell className="text-sm text-muted-foreground">{fmtDate(p.created_at)}</TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                )}
              </TabsContent>

              {/* Todos os pedidos */}
              <TabsContent value="pedidos" className="mt-4">
                {pedidosHistorico.length === 0 ? (
                  <p className="text-center text-muted-foreground py-8 text-sm">Nenhum pedido registrado</p>
                ) : (
                  <div className="rounded-lg border border-border overflow-hidden">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Tipo</TableHead>
                          <TableHead>Plano</TableHead>
                          <TableHead>Status</TableHead>
                          <TableHead className="text-right">Implantação</TableHead>
                          <TableHead className="text-right">Mensalidade</TableHead>
                          <TableHead className="text-right">Total</TableHead>
                          <TableHead>Data</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {pedidosHistorico.map((p) => (
                          <TableRow key={p.id}>
                            <TableCell>
                              <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium ${TIPO_PEDIDO_COLORS[p.tipo_pedido] || "bg-muted text-muted-foreground"}`}>
                                {p.tipo_pedido === "Upgrade" && <ArrowUpCircle className="h-3 w-3" />}
                                {p.tipo_pedido === "Aditivo" && <Package className="h-3 w-3" />}
                                {p.tipo_pedido || "Novo"}
                              </span>
                            </TableCell>
                            <TableCell className="text-sm">{p.planos?.nome || "—"}</TableCell>
                            <TableCell>
                              <span className="text-xs px-2 py-0.5 rounded-full bg-muted text-muted-foreground">
                                {p.status_pedido}
                              </span>
                            </TableCell>
                            <TableCell className="text-right font-mono text-sm">{fmtBRL(p.valor_implantacao_final ?? 0)}</TableCell>
                            <TableCell className="text-right font-mono text-sm">{fmtBRL(p.valor_mensalidade_final ?? 0)}</TableCell>
                            <TableCell className="text-right font-mono text-sm font-semibold">{fmtBRL(p.valor_total)}</TableCell>
                            <TableCell className="text-sm text-muted-foreground">{fmtDate(p.created_at)}</TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                )}
              </TabsContent>
            </Tabs>
          )}
        </DialogContent>
      </Dialog>
    </AppLayout>
  );
}
