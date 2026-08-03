import { useState } from "react";
import { AppLayout } from "@/components/AppLayout";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Plus, TrendingDown } from "lucide-react";
import { DespesaWizardDialog } from "./components/DespesaWizardDialog";
import { useDespesasQuery } from "./useDespesasQueries";
import { formatBRL, formatDataBR } from "./helpers";

export default function FinanceiroDespesas() {
  const [wizardOpen, setWizardOpen] = useState(false);
  const { data: despesas = [], isLoading } = useDespesasQuery();

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
          <Button onClick={() => setWizardOpen(true)}>
            <Plus className="h-4 w-4 mr-1" /> Nova despesa
          </Button>
        </div>

        <div className="rounded-lg border border-border bg-card">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Fornecedor</TableHead>
                <TableHead>Descrição</TableHead>
                <TableHead>Vencimento</TableHead>
                <TableHead>Parcela</TableHead>
                <TableHead className="text-right">Valor</TableHead>
                <TableHead>Status</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                <TableRow>
                  <TableCell colSpan={6} className="text-center py-10 text-muted-foreground">
                    Carregando...
                  </TableCell>
                </TableRow>
              ) : despesas.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={6} className="text-center py-10 text-muted-foreground">
                    Nenhuma despesa lançada.
                  </TableCell>
                </TableRow>
              ) : (
                despesas.map((d) => (
                  <TableRow key={d.id}>
                    <TableCell>{d.fornecedores?.nome_fantasia || "—"}</TableCell>
                    <TableCell className="max-w-[280px] truncate">{d.descricao || "—"}</TableCell>
                    <TableCell>{formatDataBR(d.data_vencimento)}</TableCell>
                    <TableCell>{d.parcela_numero}/{d.parcela_total}</TableCell>
                    <TableCell className="text-right">{formatBRL(Number(d.valor))}</TableCell>
                    <TableCell><Badge variant="secondary">{d.status}</Badge></TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>
      </div>

      <DespesaWizardDialog open={wizardOpen} onOpenChange={setWizardOpen} />
    </AppLayout>
  );
}
