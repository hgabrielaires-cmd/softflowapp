import { useEffect, useMemo, useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { ArrowDown, ArrowUp, ArrowLeftRight, ChevronLeft, ChevronRight } from "lucide-react";
import { cn } from "@/lib/utils";
import { ORIGEM_LABELS, TODAS } from "../constants";
import { fmtCurrency, fmtDate } from "../helpers";
import type { ExtratoLinha } from "../types";

const POR_PAGINA = 25;

interface Props {
  linhas: ExtratoLinha[];
  saldoAnterior: number;
  contaId: string;
  onSelect: (linha: ExtratoLinha) => void;
}

export function ExtratoTable({ linhas, saldoAnterior, contaId, onSelect }: Props) {
  const mostrarSaldo = contaId !== TODAS;
  const [pagina, setPagina] = useState(1);

  const totalPaginas = Math.max(1, Math.ceil(linhas.length / POR_PAGINA));

  useEffect(() => {
    setPagina(1);
  }, [linhas, contaId]);

  const paginaAtual = Math.min(pagina, totalPaginas);
  const inicio = (paginaAtual - 1) * POR_PAGINA;
  const linhasPagina = useMemo(
    () => linhas.slice(inicio, inicio + POR_PAGINA),
    [linhas, inicio],
  );


  return (
    <div className="border rounded-xl overflow-hidden">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead className="w-[110px]">Data</TableHead>
            <TableHead>Descrição</TableHead>
            <TableHead className="w-[150px]">Tipo</TableHead>
            <TableHead className="w-[140px] text-right">Valor</TableHead>
            {mostrarSaldo && <TableHead className="w-[140px] text-right">Saldo</TableHead>}
            <TableHead className="w-[110px]">Origem</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {mostrarSaldo && (
            <TableRow className="bg-muted/40">
              <TableCell className="text-xs text-muted-foreground">—</TableCell>
              <TableCell className="text-xs text-muted-foreground">Saldo anterior</TableCell>
              <TableCell className="text-xs text-muted-foreground">—</TableCell>
              <TableCell className="text-right text-xs text-muted-foreground">—</TableCell>
              <TableCell
                className={cn(
                  "text-right text-sm font-medium",
                  saldoAnterior >= 0 ? "text-emerald-600" : "text-destructive",
                )}
              >
                {fmtCurrency(saldoAnterior)}
              </TableCell>
              <TableCell />
            </TableRow>
          )}

          {linhas.length === 0 ? (
            <TableRow>
              <TableCell colSpan={mostrarSaldo ? 6 : 5} className="text-center text-sm text-muted-foreground py-10">
                Nenhuma movimentação no período.
              </TableCell>
            </TableRow>
          ) : (
            linhas.map((l) => {
              const entrada = l.efeito >= 0;
              return (
                <TableRow key={l.id} className="cursor-pointer" onClick={() => onSelect(l)}>
                  <TableCell className="text-sm">{fmtDate(l.data_movimentacao)}</TableCell>
                  <TableCell className="text-sm text-foreground">{l.descricao || "—"}</TableCell>
                  <TableCell>
                    {l.tipo === "transferencia" ? (
                      <span className="inline-flex items-center gap-1 text-sm text-blue-600">
                        <ArrowLeftRight className="h-3.5 w-3.5" /> Transferência
                      </span>
                    ) : entrada ? (
                      <span className="inline-flex items-center gap-1 text-sm text-emerald-600">
                        <ArrowUp className="h-3.5 w-3.5" /> Entrada
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1 text-sm text-destructive">
                        <ArrowDown className="h-3.5 w-3.5" /> Saída
                      </span>
                    )}
                  </TableCell>
                  <TableCell
                    className={cn("text-right text-sm font-medium", entrada ? "text-emerald-600" : "text-destructive")}
                  >
                    {entrada ? "+" : "-"}
                    {fmtCurrency(Math.abs(l.efeito))}
                  </TableCell>
                  {mostrarSaldo && (
                    <TableCell
                      className={cn(
                        "text-right text-sm font-medium",
                        l.saldoAcumulado >= 0 ? "text-emerald-600" : "text-destructive",
                      )}
                    >
                      {fmtCurrency(l.saldoAcumulado)}
                    </TableCell>
                  )}
                  <TableCell>
                    <Badge variant="outline" className="text-xs">
                      {ORIGEM_LABELS[String(l.origem ?? "manual")] || "Manual"}
                    </Badge>
                  </TableCell>
                </TableRow>
              );
            })
          )}
        </TableBody>
      </Table>
    </div>
  );
}
