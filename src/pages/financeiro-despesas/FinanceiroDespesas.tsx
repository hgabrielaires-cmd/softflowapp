import { useMemo, useState } from "react";
import { AppLayout } from "@/components/AppLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { TablePagination } from "@/components/TablePagination";
import { Pencil, Plus, Search, TrendingDown, Trash2, X } from "lucide-react";
import { DespesaWizardDialog } from "./components/DespesaWizardDialog";
import { DespesaEditDialog } from "./components/DespesaEditDialog";
import { DespesaDeleteDialog } from "./components/DespesaDeleteDialog";
import { useDespesasQuery, useFornecedoresOptionsQuery } from "./useDespesasQueries";

import {
  useCentrosCustoQuery,
  useContasFinanceirasQuery,
  useFormasPagamentoQuery,
  usePlanoContasQuery,
} from "@/pages/financeiro-parametros/useFinanceiroParametrosQueries";
import { FILTRO_TODOS, ITEMS_PER_PAGE, STATUS_DESPESA, emptyDespesaFiltros } from "./constants";
import { aplicarFiltrosDespesas, formatBRL, formatDataBR, statusBadgeVariant } from "./helpers";
import { useAuth } from "@/context/AuthContext";
import { useCrudPermissions } from "@/hooks/useCrudPermissions";

export default function FinanceiroDespesas() {
  const [wizardOpen, setWizardOpen] = useState(false);
  const [filtros, setFiltrosRaw] = useState(emptyDespesaFiltros);
  const [page, setPage] = useState(1);

  const { roles } = useAuth();
  const { canIncluir } = useCrudPermissions("despesas", roles);

  const { data: despesas = [], isLoading } = useDespesasQuery();
  const { data: fornecedores = [] } = useFornecedoresOptionsQuery();
  const { data: planoContas = [] } = usePlanoContasQuery();
  const { data: formasPagamento = [] } = useFormasPagamentoQuery();
  const { data: centrosCusto = [] } = useCentrosCustoQuery();
  const { data: contas = [] } = useContasFinanceirasQuery();


  const setFiltros = (patch: Partial<typeof emptyDespesaFiltros>) => {
    setFiltrosRaw((prev) => ({ ...prev, ...patch }));
    setPage(1);
  };

  const filtradas = useMemo(() => aplicarFiltrosDespesas(despesas, filtros), [despesas, filtros]);
  const totalPages = Math.ceil(filtradas.length / ITEMS_PER_PAGE) || 1;
  const paginadas = filtradas.slice((page - 1) * ITEMS_PER_PAGE, page * ITEMS_PER_PAGE);
  const totalValor = filtradas.reduce((acc, d) => acc + Number(d.valor), 0);

  const temFiltro = JSON.stringify(filtros) !== JSON.stringify(emptyDespesaFiltros);

  return (
    <AppLayout>
      <div className="space-y-6">
        <div className="flex items-start justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-foreground flex items-center gap-2">
              <TrendingDown className="h-6 w-6" /> Despesas
            </h1>
            <p className="text-sm text-muted-foreground mt-1">
              Lançamento e controle de despesas
            </p>
          </div>
          {canIncluir && (
            <Button onClick={() => setWizardOpen(true)}>
              <Plus className="h-4 w-4 mr-1" /> Novo
            </Button>
          )}

        </div>

        {/* Filtros */}
        <div className="rounded-lg border border-border bg-card p-4 space-y-4">
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            <div className="space-y-1.5">
              <Label className="text-xs">Buscar</Label>
              <div className="relative">
                <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input
                  className="pl-8"
                  placeholder="Fornecedor ou descrição"
                  value={filtros.busca}
                  onChange={(e) => setFiltros({ busca: e.target.value })}
                />
              </div>
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">Base do período</Label>
              <Select
                value={filtros.base_data}
                onValueChange={(v) => setFiltros({ base_data: v as "vencimento" | "emissao" })}
              >
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="vencimento">Vencimento</SelectItem>
                  <SelectItem value="emissao">Emissão</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">De</Label>
              <Input
                type="date"
                value={filtros.data_inicio}
                onChange={(e) => setFiltros({ data_inicio: e.target.value })}
              />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">Até</Label>
              <Input
                type="date"
                value={filtros.data_fim}
                onChange={(e) => setFiltros({ data_fim: e.target.value })}
              />
            </div>
          </div>

          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
            <div className="space-y-1.5">
              <Label className="text-xs">Fornecedor</Label>
              <Select value={filtros.fornecedor_id} onValueChange={(v) => setFiltros({ fornecedor_id: v })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value={FILTRO_TODOS}>Todos</SelectItem>
                  {fornecedores.map((f) => (
                    <SelectItem key={f.id} value={f.id}>{f.nome_fantasia}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">Centro de custo</Label>
              <Select value={filtros.centro_custo_id} onValueChange={(v) => setFiltros({ centro_custo_id: v })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value={FILTRO_TODOS}>Todos</SelectItem>
                  {centrosCusto.map((c) => (
                    <SelectItem key={c.id} value={c.id}>
                      {c.codigo ? `${c.codigo} — ` : ""}{c.nome}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">Plano de contas</Label>
              <Select value={filtros.plano_conta_id} onValueChange={(v) => setFiltros({ plano_conta_id: v })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value={FILTRO_TODOS}>Todos</SelectItem>
                  {planoContas.map((p) => (
                    <SelectItem key={p.id} value={p.id}>{p.codigo} — {p.nome}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">Forma de pagamento</Label>
              <Select
                value={filtros.forma_pagamento_id}
                onValueChange={(v) => setFiltros({ forma_pagamento_id: v })}
              >
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value={FILTRO_TODOS}>Todas</SelectItem>
                  {formasPagamento.map((f) => (
                    <SelectItem key={f.id} value={f.id}>{f.nome}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">Status</Label>
              <Select value={filtros.status} onValueChange={(v) => setFiltros({ status: v })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value={FILTRO_TODOS}>Todos</SelectItem>
                  {STATUS_DESPESA.map((s) => (
                    <SelectItem key={s.value} value={s.value}>{s.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="flex items-center justify-between">
            <span className="text-sm text-muted-foreground">
              {filtradas.length} lançamento(s) · Total {formatBRL(totalValor)}
            </span>
            {temFiltro && (
              <Button variant="ghost" size="sm" onClick={() => { setFiltrosRaw(emptyDespesaFiltros); setPage(1); }}>
                <X className="h-4 w-4 mr-1" /> Limpar filtros
              </Button>
            )}
          </div>
        </div>

        <div className="rounded-lg border border-border bg-card">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Fornecedor</TableHead>
                <TableHead>Descrição</TableHead>
                <TableHead>Emissão</TableHead>
                <TableHead>Vencimento</TableHead>
                <TableHead>Parcela</TableHead>
                <TableHead className="text-right">Valor</TableHead>
                <TableHead>Status</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                <TableRow>
                  <TableCell colSpan={7} className="text-center py-10 text-muted-foreground">
                    Carregando...
                  </TableCell>
                </TableRow>
              ) : paginadas.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={7} className="text-center py-10 text-muted-foreground">
                    Nenhuma despesa encontrada.
                  </TableCell>
                </TableRow>
              ) : (
                paginadas.map((d) => (
                  <TableRow key={d.id}>
                    <TableCell>{d.fornecedores?.nome_fantasia || "—"}</TableCell>
                    <TableCell className="max-w-[280px] truncate">{d.descricao || "—"}</TableCell>
                    <TableCell>{formatDataBR(d.data_emissao)}</TableCell>
                    <TableCell>{formatDataBR(d.data_vencimento)}</TableCell>
                    <TableCell>{d.parcela_numero}/{d.parcela_total}</TableCell>
                    <TableCell className="text-right">{formatBRL(Number(d.valor))}</TableCell>
                    <TableCell>
                      <Badge variant={statusBadgeVariant(d)}>
                        {STATUS_DESPESA.find((s) => s.value === d.status)?.label || d.status}
                      </Badge>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
          <TablePagination
            currentPage={page}
            totalPages={totalPages}
            totalItems={filtradas.length}
            itemsPerPage={ITEMS_PER_PAGE}
            onPageChange={setPage}
          />
        </div>
      </div>

      <DespesaWizardDialog open={wizardOpen} onOpenChange={setWizardOpen} />
    </AppLayout>
  );
}
