import { useState } from "react";
import { AppLayout } from "@/components/AppLayout";
import { supabase } from "@/integrations/supabase/client";
import { Cliente } from "@/lib/supabase-types";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
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
import { Plus, Search, Pencil, Building2, Phone, Star, Upload, Eye, FileText } from "lucide-react";
import { ImportClientesDialog } from "@/components/ImportClientesDialog";
import { TablePagination } from "@/components/TablePagination";
import { emptyContatoForm, ITEMS_PER_PAGE } from "@/pages/clientes/constants";
import type { ClienteContato } from "@/pages/clientes/types";
import { useClientesQueries } from "@/pages/clientes/useClientesQueries";
import { useClienteForm } from "@/pages/clientes/useClienteForm";
import { HistoricoContratualDialog } from "@/pages/clientes/components/HistoricoContratualDialog";
import { ClienteContatosDialog } from "@/pages/clientes/components/ClienteContatosDialog";
import { ContatoFormDialog } from "@/pages/clientes/components/ContatoFormDialog";
import { ClienteFormDialog } from "@/pages/clientes/components/ClienteFormDialog";

export default function Clientes() {
  const q = useClientesQueries();
  const {
    isAdmin, profile, roles,
    crudIncluir, crudEditar, crudExcluir,
    canEditExisting, vendedorSomenteLeitura,
    podeImportar, podeVerHistorico, podeVerRentabilidade,
    filiaisDoUsuario, filialPadraoId, isGlobal,
    clientes, setClientes, decisoresMap, filiais, loading,
    search, setSearch, filtroFilialId, setFiltroFilialId,
    currentPage, setCurrentPage,
    filtered, filialNome,
    historicoOpen, setHistoricoOpen,
    clienteHistorico, contratosList, pedidosHistorico,
    loadingHistorico, rentabilidadeConsolidada, margemIdealHistorico,
    fetchData, fetchContatos, openHistorico, toggleAtivo,
  } = q;

  const f = useClienteForm({
    profile, isAdmin, canEditExisting, crudIncluir,
    filialPadraoId, fetchContatos, fetchData,
  });

  // Contatos (modal separado — histórico/edição extra)
  const [contatosOpen, setContatosOpen] = useState(false);
  const [clienteContatos, setClienteContatos] = useState<Cliente | null>(null);
  const [contatos, setContatos] = useState<ClienteContato[]>([]);
  const [loadingContatos, setLoadingContatos] = useState(false);
  const [contatoDialogOpen, setContatoDialogOpen] = useState(false);
  const [editingContato, setEditingContato] = useState<ClienteContato | null>(null);
  const [contatoForm, setContatoForm] = useState(emptyContatoForm);
  const [savingContato, setSavingContato] = useState(false);

  // Importação
  const [importOpen, setImportOpen] = useState(false);

  // Contatos
  async function openContatos(c: Cliente) {
    setClienteContatos(c);
    setContatosOpen(true);
    await loadContatos(c.id);
  }

  async function loadContatos(clienteId: string) {
    setLoadingContatos(true);
    const data = await fetchContatos(clienteId);
    setContatos(data);
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
      await loadContatos(clienteContatos.id);
    }
    setSavingContato(false);
  }

  async function handleToggleDecisor(contato: ClienteContato) {
    if (!clienteContatos) return;
    if (!contato.decisor) {
      await supabase.from("cliente_contatos").update({ decisor: false }).eq("cliente_id", clienteContatos.id);
      await supabase.from("cliente_contatos").update({ decisor: true }).eq("id", contato.id);
    } else {
      await supabase.from("cliente_contatos").update({ decisor: false }).eq("id", contato.id);
    }
    await loadContatos(clienteContatos.id);
  }

  async function handleToggleAtivoContato(contato: ClienteContato) {
    if (!clienteContatos) return;
    await supabase.from("cliente_contatos").update({ ativo: !contato.ativo }).eq("id", contato.id);
    await loadContatos(clienteContatos.id);
  }

  async function handleDesativarContato(contato: ClienteContato) {
    if (!clienteContatos) return;
    if (contato.decisor) {
      const outroDecisorAtivo = contatos.some((c) => c.id !== contato.id && c.ativo && c.decisor);
      if (!outroDecisorAtivo) {
        toast.error("Defina um novo contato como decisor antes de desativar este.");
        return;
      }
    }
    const { error } = await supabase.from("cliente_contatos").update({ ativo: false, decisor: false }).eq("id", contato.id);
    if (error) {
      toast.error("Erro ao desativar contato: " + error.message);
    } else {
      toast.success("Contato desativado com sucesso");
      await loadContatos(clienteContatos.id);
    }
  }

  async function handleToggleAtivo(c: Cliente) {
    const ok = await toggleAtivo(c);
    if (!ok) toast.error("Erro ao atualizar status");
  }

  return (
    <AppLayout>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-foreground">Clientes</h1>
            <p className="text-muted-foreground text-sm mt-1">Gestão de clientes cadastrados</p>
          </div>
          <div className="flex items-center gap-2">
            {podeImportar && (
              <Button variant="outline" onClick={() => setImportOpen(true)} className="gap-2">
                <Upload className="h-4 w-4" /> Importação
              </Button>
            )}
            {crudIncluir && (
              <Button onClick={f.openCreate} className="gap-2">
                <Plus className="h-4 w-4" /> Novo cliente
              </Button>
            )}
          </div>
        </div>

        {/* Search + Filial filter */}
        <div className="flex items-center gap-3 flex-wrap">
          <div className="relative max-w-sm flex-1 min-w-[200px]">
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
          {filiaisDoUsuario.length > 1 && (
            <Select value={filtroFilialId} onValueChange={setFiltroFilialId}>
              <SelectTrigger className="w-[220px]">
                <Building2 className="h-4 w-4 mr-2 text-muted-foreground" />
                <SelectValue placeholder="Filial" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="__todas__">Todas as Filiais</SelectItem>
                {filiaisDoUsuario.map((fil) => (
                  <SelectItem key={fil.id} value={fil.id}>{fil.nome}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}
        </div>

        {/* Table */}
        <div className="rounded-lg border border-border bg-card overflow-hidden">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Nome fantasia</TableHead>
                <TableHead>Apelido</TableHead>
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
                   <TableCell colSpan={8} className="text-center text-muted-foreground py-10">
                    Carregando...
                  </TableCell>
                </TableRow>
              ) : filtered.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={8} className="text-center text-muted-foreground py-10">
                    Nenhum cliente encontrado
                  </TableCell>
                </TableRow>
              ) : (
                filtered.slice((currentPage - 1) * ITEMS_PER_PAGE, currentPage * ITEMS_PER_PAGE).map((c) => (
                  <TableRow key={c.id}>
                    <TableCell>
                      <div>
                        <p className="font-medium text-foreground">{c.nome_fantasia}</p>
                        {c.razao_social && (
                          <p className="text-xs text-muted-foreground">{c.razao_social}</p>
                        )}
                      </div>
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground">{(c as any).apelido || "—"}</TableCell>
                    <TableCell className="font-mono text-sm">{c.cnpj_cpf}</TableCell>
                    <TableCell>
                      <div className="space-y-0.5">
                        {decisoresMap[c.id] ? (
                          <>
                            <p className="text-sm flex items-center gap-1">
                              <Star className="h-3 w-3 text-primary fill-primary" />
                              {decisoresMap[c.id].nome}
                            </p>
                            {decisoresMap[c.id].telefone && (
                              <p className="text-xs text-muted-foreground flex items-center gap-1">
                                <Phone className="h-3 w-3" />{decisoresMap[c.id].telefone}
                              </p>
                            )}
                          </>
                        ) : (
                          <>
                            {c.contato_nome && <p className="text-sm">{c.contato_nome}</p>}
                            {c.telefone && (
                              <p className="text-xs text-muted-foreground flex items-center gap-1">
                                <Phone className="h-3 w-3" />{c.telefone}
                              </p>
                            )}
                          </>
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
                      {canEditExisting && !vendedorSomenteLeitura ? (
                        <Switch checked={c.ativo} onCheckedChange={() => handleToggleAtivo(c)} />
                      ) : (
                        <Badge variant={c.ativo ? "default" : "secondary"}>
                          {c.ativo ? "Ativo" : "Inativo"}
                        </Badge>
                      )}
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-1">
                        {canEditExisting && !vendedorSomenteLeitura ? (
                          <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => f.openEdit(c)} title="Editar cliente">
                            <Pencil className="h-3.5 w-3.5" />
                          </Button>
                        ) : (
                          <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => f.openEdit(c, true)} title="Visualizar cliente">
                            <Eye className="h-3.5 w-3.5" />
                          </Button>
                        )}
                        {podeVerHistorico && (
                          <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => openHistorico(c)} title="Histórico contratual">
                            <FileText className="h-3.5 w-3.5" />
                          </Button>
                        )}
                      </div>
                    </TableCell>
                  </TableRow>
                ))
              )}
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

      <ClienteFormDialog
        open={f.dialogOpen}
        onOpenChange={f.setDialogOpen}
        viewOnly={f.viewOnly}
        editing={f.editing}
        form={f.form}
        setForm={f.setForm}
        saving={f.saving}
        isQuerying={f.isQuerying}
        loadingCep={f.loadingCep}
        loadingCnpj={f.loadingCnpj}
        cepError={f.cepError}
        setCepError={f.setCepError}
        cnpjError={f.cnpjError}
        setCnpjError={f.setCnpjError}
        handleCepBlur={f.handleCepBlur}
        handleCnpjBlur={f.handleCnpjBlur}
        handleSave={f.handleSave}
        canEditExisting={canEditExisting}
        crudIncluir={crudIncluir}
        filiaisDoUsuario={filiaisDoUsuario}
        formContatos={f.formContatos}
        setFormContatos={f.setFormContatos}
        showContatoInlineForm={f.showContatoInlineForm}
        setShowContatoInlineForm={f.setShowContatoInlineForm}
        editingInlineIdx={f.editingInlineIdx}
        setEditingInlineIdx={f.setEditingInlineIdx}
        inlineContatoForm={f.inlineContatoForm}
        setInlineContatoForm={f.setInlineContatoForm}
      />

      <ClienteContatosDialog
        open={contatosOpen}
        onOpenChange={setContatosOpen}
        cliente={clienteContatos}
        contatos={contatos}
        loading={loadingContatos}
        canEditExisting={canEditExisting}
        onNovoContato={openNovoContato}
        onEditContato={openEditContato}
        onToggleDecisor={handleToggleDecisor}
        onDesativarContato={handleDesativarContato}
      />

      <ContatoFormDialog
        open={contatoDialogOpen}
        onOpenChange={setContatoDialogOpen}
        editing={editingContato}
        form={contatoForm}
        onFormChange={setContatoForm}
        onSave={handleSaveContato}
        saving={savingContato}
      />

      <HistoricoContratualDialog
        open={historicoOpen}
        onOpenChange={setHistoricoOpen}
        cliente={clienteHistorico}
        contratosList={contratosList}
        pedidosHistorico={pedidosHistorico}
        loading={loadingHistorico}
        podeVerRentabilidade={podeVerRentabilidade}
        rentabilidadeConsolidada={rentabilidadeConsolidada}
        margemIdealHistorico={margemIdealHistorico}
      />

      <ImportClientesDialog
        open={importOpen}
        onOpenChange={setImportOpen}
        filialId={filialPadraoId || profile?.filial_id || ""}
        onSuccess={fetchData}
      />
    </AppLayout>
  );
}
