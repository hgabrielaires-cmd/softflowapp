// ─── Dialog de geração manual de faturas ──────────────────────────────────

import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog, DialogContent, DialogDescription, DialogFooter,
  DialogHeader, DialogTitle,
} from "@/components/ui/dialog";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import {
  Zap, Loader2, CheckCircle2, SkipForward, AlertOctagon,
} from "lucide-react";
import { toast } from "sonner";
import { fmtCurrency } from "../helpers";

interface GerarFaturasDialogProps {
  onGerado?: () => void;
}

export function GerarFaturasButton({ onGerado }: GerarFaturasDialogProps) {
  const [showConfirm, setShowConfirm] = useState(false);
  const [gerando, setGerando] = useState(false);
  const [resultado, setResultado] = useState<any>(null);
  const [showResult, setShowResult] = useState(false);
  const [mes, setMes] = useState(new Date().getMonth() + 1);
  const [ano, setAno] = useState(new Date().getFullYear());

  async function handleGerar() {
    setShowConfirm(false);
    setGerando(true);
    try {
      const { data, error } = await supabase.functions.invoke("gerar-faturas-mensais", {
        body: { mes, ano },
      });
      if (error) throw error;

      setResultado(data);
      setShowResult(true);

      if (data?.total_faturados > 0) {
        toast.success(`${data.total_faturados} fatura(s) gerada(s)!`);
        onGerado?.();
      } else if (data?.total_erros > 0) {
        toast.error(`${data.total_erros} erro(s) na geração`);
      } else {
        toast.info("Nenhuma fatura nova a gerar");
      }
    } catch (err: any) {
      toast.error("Erro: " + (err?.message || "Desconhecido"));
    } finally {
      setGerando(false);
    }
  }

  return (
    <>
      <Button
        variant="outline"
        className="gap-2"
        onClick={() => setShowConfirm(true)}
        disabled={gerando}
      >
        {gerando ? <Loader2 className="h-4 w-4 animate-spin" /> : <Zap className="h-4 w-4" />}
        Gerar Faturas do Mês
      </Button>

      {/* Confirmation dialog */}
      <AlertDialog open={showConfirm} onOpenChange={setShowConfirm}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2">
              <Zap className="h-5 w-5 text-primary" />
              Gerar faturas mensais
            </AlertDialogTitle>
            <AlertDialogDescription>
              Gerar faturas de <strong>{String(mes).padStart(2, "0")}/{ano}</strong> para
              todos os contratos ativos? Contratos já faturados serão ignorados.
            </AlertDialogDescription>
          </AlertDialogHeader>

          <div className="grid grid-cols-2 gap-3 py-2">
            <div>
              <Label className="text-xs">Mês</Label>
              <Input
                type="number"
                min={1}
                max={12}
                value={mes}
                onChange={(e) => setMes(Number(e.target.value))}
                className="h-9"
              />
            </div>
            <div>
              <Label className="text-xs">Ano</Label>
              <Input
                type="number"
                min={2024}
                max={2030}
                value={ano}
                onChange={(e) => setAno(Number(e.target.value))}
                className="h-9"
              />
            </div>
          </div>

          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={handleGerar}>
              Confirmar Geração
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Result dialog */}
      <Dialog open={showResult} onOpenChange={setShowResult}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Zap className="h-5 w-5 text-primary" />
              Resultado da Geração
            </DialogTitle>
            <DialogDescription>
              Período: {resultado ? `${String(resultado.mes).padStart(2, "0")}/${resultado.ano}` : "—"}
            </DialogDescription>
          </DialogHeader>

          {resultado && (
            <div className="space-y-4">
              <div className="grid grid-cols-3 gap-3">
                <SummaryCard
                  icon={<CheckCircle2 className="h-5 w-5 text-emerald-600" />}
                  value={resultado.total_faturados}
                  label="Geradas"
                  colorClass="bg-emerald-50 dark:bg-emerald-950/20 border-emerald-200 dark:border-emerald-800 text-emerald-700 dark:text-emerald-400"
                />
                <SummaryCard
                  icon={<SkipForward className="h-5 w-5 text-amber-600" />}
                  value={resultado.total_ja_faturados}
                  label="Já existiam"
                  colorClass="bg-amber-50 dark:bg-amber-950/20 border-amber-200 dark:border-amber-800 text-amber-700 dark:text-amber-400"
                />
                <SummaryCard
                  icon={<AlertOctagon className="h-5 w-5 text-red-600" />}
                  value={resultado.total_erros}
                  label="Erros"
                  colorClass="bg-red-50 dark:bg-red-950/20 border-red-200 dark:border-red-800 text-red-700 dark:text-red-400"
                />
              </div>

              {resultado.resultados?.length > 0 && (
                <div className="max-h-60 overflow-y-auto border rounded-lg">
                  <Table>
                    <TableHeader>
                      <TableRow className="bg-muted/50">
                        <TableHead className="text-xs">Cliente</TableHead>
                        <TableHead className="text-xs text-right">Valor</TableHead>
                        <TableHead className="text-xs text-center">Status</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {resultado.resultados.map((r: any, i: number) => (
                        <TableRow key={i}>
                          <TableCell className="text-sm truncate max-w-[200px]">{r.cliente_nome}</TableCell>
                          <TableCell className="text-sm text-right font-mono">
                            {r.valor > 0 ? fmtCurrency(r.valor) : "—"}
                          </TableCell>
                          <TableCell className="text-center">
                            {r.status === "sucesso" && <Badge className="bg-emerald-100 text-emerald-700 text-xs">OK</Badge>}
                            {r.status === "ja_faturado" && <Badge variant="outline" className="text-xs">Pulado</Badge>}
                            {r.status === "erro" && (
                              <Badge variant="destructive" className="text-xs" title={r.erro}>Erro</Badge>
                            )}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>
    </>
  );
}

function SummaryCard({ icon, value, label, colorClass }: {
  icon: React.ReactNode; value: number; label: string; colorClass: string;
}) {
  return (
    <div className={`border rounded-lg p-3 text-center ${colorClass}`}>
      <div className="mx-auto mb-1 flex justify-center">{icon}</div>
      <div className="text-lg font-bold">{value}</div>
      <div className="text-xs">{label}</div>
    </div>
  );
}
