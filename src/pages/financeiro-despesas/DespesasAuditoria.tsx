import { useMemo, useState } from "react";
import { Link, Navigate } from "react-router-dom";
import { AppLayout } from "@/components/AppLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { TablePagination } from "@/components/TablePagination";
import { ArrowLeft, Eye, History, X } from "lucide-react";
import { useAuth } from "@/context/AuthContext";
import { useMenuPermissions } from "@/hooks/useMenuPermissions";
import {
  useCentrosCustoQuery,
  useContasFinanceirasQuery,
  useFormasPagamentoQuery,
  usePlanoContasQuery,
} from "@/pages/financeiro-parametros/useFinanceiroParametrosQueries";
import { ACOES_AUDITORIA, FILTRO_TODOS, ITEMS_PER_PAGE, emptyAuditoriaFiltros } from "./constants";
import { acaoAuditoriaLabel, acaoBadgeVariant, formatDataHoraBR } from "./helpers";
import { useAuditoriaDespesasQuery, useAuditoriaUsuariosQuery } from "./useAuditoriaDespesasQueries";
import { useFornecedoresOptionsQuery } from "./useDespesasQueries";
import { AuditoriaDetalheDialog } from "./components/AuditoriaDetalheDialog";
import type { AuditoriaDespesaRegistro } from "./types";

export default function DespesasAuditoria() {
  const [filtros, setFiltrosRaw] = useState(emptyAuditoriaFiltros);
  const [page, setPage] = useState(1);
  const [detalhe, setDetalhe] = useState<AuditoriaDespesaRegistro | null>(null);

  const { roles } = useAuth();
  const { permissions, loading: permsLoading } = useMenuPermissions(roles);

  const { data: registros = [], isLoading } = useAuditoriaDespesasQuery();
  const { data: usuarios = [] } = useAuditoriaUsuariosQuery();
  const { data: fornecedores = [] } = useFornecedoresOptionsQuery();
  const { data: planoContas = [] } = usePlanoContasQuery();
  const { data: formasPagamento = [] } = useFormasPagamentoQuery();
  const { data: contas = [] } = useContasFinanceirasQuery();
  const { data: centrosCusto = [] } = useCentrosCustoQuery();

  const nomeUsuario = (id: string | null) => {
    if (!id) return "Sistema";
    const u = usuarios.find((x) => x.user_id === id);
    return u?.full_name || u?.email || "Usuário removido";
  };

  const nomeFornecedor = (id: unknown) =>
    fornecedores.find((f) => f.id === id)?.nome_fantasia || (id ? String(id) : "—");

  const setFiltros = (patch: Partial<typeof emptyAuditoriaFiltros>) => {
    setFiltrosRaw((prev) => ({ ...prev, ...patch }));
    setPage(1);
  };

  const filtrados = useMemo(() => {
    return registros.filter((r) => {
      if (filtros.acao !== FILTRO_TODOS && r.action !== filtros.acao) return false;
      if (filtros.user_id !== FILTRO_TODOS && r.user_id !== filtros.user_id) return false;
      const dia = r.created_at.slice(0, 10);
      if (filtros.data_inicio && dia < filtros.data_inicio) return false;
      if (filtros.data_fim && dia > filtros.data_fim) return false;
      return true;
    });
  }, [registros, filtros]);

  const totalPages = Math.ceil(filtrados.length / ITEMS_PER_PAGE) || 1;
  const paginados = filtrados.slice((page - 1) * ITEMS_PER_PAGE, page * ITEMS_PER_PAGE);
  const temFiltro = JSON.stringify(filtros) !== JSON.stringify(emptyAuditoriaFiltros);

  const usuariosComEvento = useMemo(() => {
    const ids = new Set(registros.map((r) => r.user_id).filter(Boolean) as string[]);
    return usuarios.filter((u) => ids.has(u.user_id));
  }, [registros, usuarios]);

  if (permsLoading) {
    return (
      <AppLayout>
        <div className="flex items-center justify-center py-20">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
        </div>
      </AppLayout>
    );
  }

  if (permissions !== null && !permissions.has("menu.despesas_auditoria")) {
    return <Navigate to="/dashboard" replace />;
  }

  const resumo = (r: AuditoriaDespesaRegistro) => {
    const d = (r.details || {}) as Record<string, any>;
    if (r.action === "despesa_updated") {
      const campos = Object.keys(d.changes || {});
      return `${campos.length} campo(s) alterado(s)`;
    }
    return [
      nomeFornecedor(d.fornecedor_id),
      d.valor != null
        ? Number(d.valor).toLocaleString("pt-BR", { style: "currency", currency: "BRL" })
        : null,
      d.data_vencimento ? `venc. ${String(d.data_vencimento).split("-").reverse().join("/")}` : null,
    ]
      .filter(Boolean)
      .join(" · ");
  };

  return (
    <AppLayout>
      <div className="space-y-6">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-foreground flex items-center gap-2">
              <History className="h-6 w-6" /> Histórico de despesas
            </h1>
            <p className="text-sm text-muted-foreground mt-1">
              Inclusões, edições e exclusões registradas na auditoria
            </p>
          </div>
          <Button variant="outline" asChild>
            <Link to="/despesas">
              <ArrowLeft className="h-4 w-4 mr-1" /> Voltar para despesas
            </Link>
          </Button>
        </div>

        {/* Filtros */}
        <div className="rounded-lg border border-border bg-card p-4 space-y-4">
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
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
            <div className="space-y-1.5">
              <Label className="text-xs">Usuário</Label>
              <Select value={filtros.user_id} onValueChange={(v) => setFiltros({ user_id: v })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value={FILTRO_TODOS}>Todos</SelectItem>
                  {usuariosComEvento.map((u) => (
                    <SelectItem key={u.user_id} value={u.user_id}>
                      {u.full_name || u.email}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">Tipo de ação</Label>
              <Select value={filtros.acao} onValueChange={(v) => setFiltros({ acao: v })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value={FILTRO_TODOS}>Todas</SelectItem>
                  {ACOES_AUDITORIA.map((a) => (
                    <SelectItem key={a.value} value={a.value}>{a.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="flex items-center justify-between">
            <span className="text-sm text-muted-foreground">{filtrados.length} evento(s)</span>
            {temFiltro && (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => { setFiltrosRaw(emptyAuditoriaFiltros); setPage(1); }}
              >
                <X className="h-4 w-4 mr-1" /> Limpar filtros
              </Button>
            )}
          </div>
        </div>

        <div className="rounded-lg border border-border bg-card overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="whitespace-nowrap">Data/hora</TableHead>
                <TableHead>Usuário</TableHead>
                <TableHead>Ação</TableHead>
                <TableHead>Despesa</TableHead>
                <TableHead className="w-[80px] text-right">Detalhes</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                <TableRow>
                  <TableCell colSpan={5} className="text-center py-10 text-muted-foreground">
                    Carregando...
                  </TableCell>
                </TableRow>
              ) : paginados.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={5} className="text-center py-10 text-muted-foreground">
                    Nenhum evento de auditoria encontrado.
                  </TableCell>
                </TableRow>
              ) : (
                paginados.map((r) => (
                  <TableRow key={r.id}>
                    <TableCell className="whitespace-nowrap">{formatDataHoraBR(r.created_at)}</TableCell>
                    <TableCell>{nomeUsuario(r.user_id)}</TableCell>
                    <TableCell>
                      <Badge variant={acaoBadgeVariant(r.action)}>{acaoAuditoriaLabel(r.action)}</Badge>
                    </TableCell>
                    <TableCell className="text-sm">{resumo(r)}</TableCell>
                    <TableCell className="text-right">
                      <Button variant="ghost" size="icon" onClick={() => setDetalhe(r)} title="Ver detalhes">
                        <Eye className="h-4 w-4" />
                      </Button>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>

        <TablePagination
          currentPage={page}
          totalPages={totalPages}
          totalItems={filtrados.length}
          itemsPerPage={ITEMS_PER_PAGE}
          onPageChange={setPage}
        />

      </div>

      <AuditoriaDetalheDialog
        registro={detalhe}
        onOpenChange={(open) => !open && setDetalhe(null)}
        usuario={detalhe ? nomeUsuario(detalhe.user_id) : ""}
        fornecedores={fornecedores}
        planoContas={planoContas}
        formasPagamento={formasPagamento}
        contas={contas}
        centrosCusto={centrosCusto}
      />
    </AppLayout>
  );
}
