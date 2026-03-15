import { useNavigate } from "react-router-dom";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import { Loader2, Search, Settings2, FileWarning } from "lucide-react";
import { TablePagination } from "@/components/TablePagination";
import { format, parseISO } from "date-fns";
import { fmtCurrency } from "../helpers";
import { useAguardandoFaturamentoQueries } from "../useAguardandoFaturamentoQueries";
import type { ContratoAguardando } from "../types";

const BADGE_COLORS: Record<string, string> = {
  "Não Faturado": "bg-amber-100 text-amber-800 border-amber-200 dark:bg-amber-900/30 dark:text-amber-400 dark:border-amber-800",
  "Upgrade Pendente": "bg-violet-100 text-violet-800 border-violet-200 dark:bg-violet-900/30 dark:text-violet-400 dark:border-violet-800",
  "OA Pendente": "bg-blue-100 text-blue-800 border-blue-200 dark:bg-blue-900/30 dark:text-blue-400 dark:border-blue-800",
  "Módulo Pendente": "bg-cyan-100 text-cyan-800 border-cyan-200 dark:bg-cyan-900/30 dark:text-cyan-400 dark:border-cyan-800",
  "Downgrade Pendente": "bg-orange-100 text-orange-800 border-orange-200 dark:bg-orange-900/30 dark:text-orange-400 dark:border-orange-800",
  "Retroativo": "bg-slate-100 text-slate-700 border-slate-200 dark:bg-slate-900/30 dark:text-slate-400 dark:border-slate-800",
};

interface AguardandoFaturamentoTabProps {
  filialFilter?: string;
}

export function AguardandoFaturamentoTab({ filialFilter = "all" }: AguardandoFaturamentoTabProps) {
  const navigate = useNavigate();
  const q = useAguardandoFaturamentoQueries(filialFilter);

  return (
    <div className="space-y-4">
      {/* Filters */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div className="relative">
          <Search className="h-4 w-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Buscar por nº contrato ou cliente..."
            value={q.search}
            onChange={(e) => { q.setSearch(e.target.value); q.setPage(1); }}
            className="pl-9 h-9 w-72"
          />
        </div>
      </div>

      {/* Table */}
      <div className="bg-card rounded-xl border border-border shadow-sm overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow className="bg-muted/50">
              <TableHead>Cliente</TableHead>
              <TableHead>Contrato</TableHead>
              <TableHead>Tipo</TableHead>
              <TableHead>Plano</TableHead>
              <TableHead className="text-right">Implantação</TableHead>
              <TableHead className="text-right">Parcelas</TableHead>
              <TableHead className="text-right">Mensalidade</TableHead>
              <TableHead>Data Assinatura</TableHead>
              <TableHead className="text-center">Dias Aguardando</TableHead>
              <TableHead className="text-right">Ação</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {q.loading ? (
              <TableRow>
                <TableCell colSpan={10} className="text-center py-12">
                  <Loader2 className="h-6 w-6 animate-spin mx-auto text-muted-foreground" />
                </TableCell>
              </TableRow>
            ) : q.contratos.length === 0 ? (
              <TableRow>
                <TableCell colSpan={10} className="text-center py-16 text-muted-foreground">
                  <FileWarning className="h-8 w-8 mx-auto mb-2 opacity-30" />
                  Nenhum contrato aguardando faturamento
                </TableCell>
              </TableRow>
            ) : q.contratos.map((c) => (
              <TableRow key={c.id}>
                <TableCell className="max-w-[180px] truncate font-medium">{c.cliente_nome}</TableCell>
                <TableCell className="font-mono text-sm">{c.numero_exibicao}</TableCell>
                <TableCell>
                  <Badge className={`text-xs ${BADGE_COLORS[c.badge_tipo] || BADGE_COLORS["Não Faturado"]}`}>
                    {c.badge_tipo}
                  </Badge>
                </TableCell>
                <TableCell className="text-sm">{c.plano_nome}</TableCell>
                <TableCell className="text-right font-medium">{fmtCurrency(c.valor_implantacao)}</TableCell>
                <TableCell className="text-right text-sm">{c.parcelas_implantacao}x</TableCell>
                <TableCell className="text-right font-medium">{fmtCurrency(c.valor_mensalidade)}</TableCell>
                <TableCell className="text-sm whitespace-nowrap">
                  {format(parseISO(c.data_assinatura), "dd/MM/yyyy")}
                </TableCell>
                <TableCell className="text-center">
                  <Badge variant="outline" className={`text-xs ${c.dias_aguardando > 3 ? "border-red-300 text-red-600 dark:text-red-400" : ""}`}>
                    {c.dias_aguardando}d
                  </Badge>
                </TableCell>
                <TableCell className="text-right">
                  <Button
                    size="sm"
                    className="gap-1.5 bg-[hsl(var(--primary))] hover:bg-[hsl(var(--primary))]/90"
                    onClick={() => navigate(`/faturamento/configurar/${c.id}`)}
                  >
                    <Settings2 className="h-3.5 w-3.5" />
                    Configurar
                  </Button>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>

      {q.totalPages > 1 && (
        <TablePagination
          currentPage={q.page}
          totalPages={q.totalPages}
          totalItems={q.total}
          itemsPerPage={15}
          onPageChange={q.setPage}
        />
      )}
    </div>
  );
}
