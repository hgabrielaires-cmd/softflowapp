import { useState } from "react";
import { AppLayout } from "@/components/AppLayout";
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

import { TablePagination } from "@/components/TablePagination";
import { ITEMS_PER_PAGE } from "@/pages/clientes/constants";
import { useClientesQueries } from "@/pages/clientes/useClientesQueries";
import { useClienteForm } from "@/pages/clientes/useClienteForm";
import { useClienteContatos } from "@/pages/clientes/useClienteContatos";
import { HistoricoContratualDialog } from "@/pages/clientes/components/HistoricoContratualDialog";
import { ClienteContatosDialog } from "@/pages/clientes/components/ClienteContatosDialog";
import { ContatoFormDialog } from "@/pages/clientes/components/ContatoFormDialog";
import { ClienteFormDialog } from "@/pages/clientes/components/ClienteFormDialog";

export default function Clientes() {
  const q = useClientesQueries();
  const {
    isAdmin, profile,
    crudIncluir,
    canEditExisting, vendedorSomenteLeitura,
    podeImportar, podeVerHistorico, podeVerRentabilidade,
    filiaisDoUsuario, filialPadraoId,
    decisoresMap, loading,
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

  const ct = useClienteContatos({ fetchContatos });


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
        open={ct.contatosOpen}
        onOpenChange={ct.setContatosOpen}
        cliente={ct.clienteContatos}
        contatos={ct.contatos}
        loading={ct.loadingContatos}
        canEditExisting={canEditExisting}
        onNovoContato={ct.openNovoContato}
        onEditContato={ct.openEditContato}
        onToggleDecisor={ct.handleToggleDecisor}
        onDesativarContato={ct.handleDesativarContato}
      />

      <ContatoFormDialog
        open={ct.contatoDialogOpen}
        onOpenChange={ct.setContatoDialogOpen}
        editing={ct.editingContato}
        form={ct.contatoForm}
        onFormChange={ct.setContatoForm}
        onSave={ct.handleSaveContato}
        saving={ct.savingContato}
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

    </AppLayout>
  );
}
