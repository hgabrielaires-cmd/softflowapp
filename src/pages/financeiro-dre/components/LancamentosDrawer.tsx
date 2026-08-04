import { useState } from "react";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Download, FileText, Paperclip } from "lucide-react";
import { ORIGEM_DESPESA_LABELS } from "../constants";
import { exportarCSV, fmtCurrency, fmtDate } from "../helpers";
import type { DreLancamento } from "../types";

interface Props {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  titulo: string;
  subtitulo?: string;
  lancamentos: DreLancamento[];
}

export function LancamentosDrawer({ open, onOpenChange, titulo, subtitulo, lancamentos }: Props) {
  const [expandido, setExpandido] = useState<string | null>(null);
  const total = lancamentos.reduce((s, l) => s + Number(l.valor || 0), 0);
  const ordenados = [...lancamentos].sort((a, b) => (a.data < b.data ? 1 : -1));

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="right" className="w-full sm:max-w-[60vw] overflow-y-auto">
        <SheetHeader className="space-y-1 text-left">
          <SheetTitle>{titulo}</SheetTitle>
          <p className="text-sm text-muted-foreground">{subtitulo}</p>
          <p className="text-lg font-bold text-foreground">{fmtCurrency(total)}</p>
        </SheetHeader>

        <div className="mt-4 overflow-hidden rounded-xl border border-border">
          <table className="w-full text-sm">
            <thead className="bg-muted/60">
              <tr className="text-left text-xs uppercase text-muted-foreground">
                <th className="px-3 py-2">Data</th>
                <th className="px-3 py-2">Fornecedor</th>
                <th className="px-3 py-2">Descrição</th>
                <th className="px-3 py-2 text-right">Valor</th>
                <th className="px-3 py-2">Origem</th>
              </tr>
            </thead>
            <tbody>
              {ordenados.length === 0 && (
                <tr><td colSpan={5} className="px-3 py-6 text-center text-muted-foreground">Nenhum lançamento no período.</td></tr>
              )}
              {ordenados.map((l, i) => (
                <>
                  <tr
                    key={l.id}
                    onClick={() => setExpandido(expandido === l.id ? null : l.id)}
                    className={`cursor-pointer transition-colors hover:bg-muted/50 ${i % 2 ? "bg-muted/20" : ""}`}
                  >
                    <td className="px-3 py-2 whitespace-nowrap">{fmtDate(l.data)}</td>
                    <td className="px-3 py-2">{l.fornecedor ?? "—"}</td>
                    <td className="px-3 py-2">{l.descricao ?? "—"}</td>
                    <td className="px-3 py-2 text-right font-medium">{fmtCurrency(l.valor)}</td>
                    <td className="px-3 py-2 text-xs text-muted-foreground">
                      {ORIGEM_DESPESA_LABELS[l.origem_tipo] ?? l.origem_tipo}
                    </td>
                  </tr>
                  {expandido === l.id && (
                    <tr key={`${l.id}-det`}>
                      <td colSpan={5} className="bg-muted/30 px-3 py-3">
                        <div className="rounded-xl border border-border bg-card p-4 text-sm space-y-1">
                          <p className="mb-2 flex items-center gap-2 font-semibold">
                            <FileText className="h-4 w-4" /> Detalhes do Lançamento
                          </p>
                          <p><span className="text-muted-foreground">Fornecedor:</span> {l.fornecedor ?? "—"}</p>
                          <p><span className="text-muted-foreground">CNPJ/CPF:</span> {l.cnpj_cpf ?? "—"}</p>
                          <p><span className="text-muted-foreground">Descrição:</span> {l.descricao ?? "—"}</p>
                          <p><span className="text-muted-foreground">Valor:</span> {fmtCurrency(l.valor)}</p>
                          <p><span className="text-muted-foreground">Data:</span> {fmtDate(l.data)}</p>
                          <p><span className="text-muted-foreground">Conta:</span> {l.conta_nome ?? "—"}</p>
                          <p>
                            <span className="text-muted-foreground">Plano:</span>{" "}
                            {l.plano_codigo ? `${l.plano_codigo} — ${l.plano_nome}` : "Sem categoria"}
                          </p>
                          <p>
                            <span className="text-muted-foreground">Origem:</span>{" "}
                            {ORIGEM_DESPESA_LABELS[l.origem_tipo] ?? l.origem_tipo}
                          </p>
                          {l.anexo_url && (
                            <Button asChild size="sm" variant="outline" className="mt-2">
                              <a href={l.anexo_url} target="_blank" rel="noreferrer">
                                <Paperclip className="mr-1 h-4 w-4" /> Ver comprovante
                              </a>
                            </Button>
                          )}
                        </div>
                      </td>
                    </tr>
                  )}
                </>
              ))}
            </tbody>
          </table>
        </div>

        <div className="mt-4 flex items-center justify-between">
          <p className="text-sm font-semibold">
            Total: {fmtCurrency(total)} <span className="font-normal text-muted-foreground">({ordenados.length} lançamentos)</span>
          </p>
          <Button size="sm" variant="outline" onClick={() => exportarCSV(titulo, ordenados)}>
            <Download className="mr-1 h-4 w-4" /> Exportar CSV
          </Button>
        </div>
      </SheetContent>
    </Sheet>
  );
}
