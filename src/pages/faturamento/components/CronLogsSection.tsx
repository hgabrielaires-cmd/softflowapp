// ─── Seção colapsável: Últimas execuções do cron ──────────────────────────

import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Badge } from "@/components/ui/badge";
import {
  Collapsible, CollapsibleContent, CollapsibleTrigger,
} from "@/components/ui/collapsible";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import {
  History, ChevronDown, ChevronRight, Loader2,
} from "lucide-react";
import { format, parseISO } from "date-fns";

interface CronLog {
  id: string;
  executado_em: string;
  mes: number;
  ano: number;
  total_contratos: number;
  total_faturados: number;
  total_erros: number;
  total_ja_faturados: number;
}

export function CronLogsSection() {
  const [open, setOpen] = useState(false);
  const [logs, setLogs] = useState<CronLog[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (open && logs.length === 0) loadLogs();
  }, [open]);

  async function loadLogs() {
    setLoading(true);
    const { data } = await supabase
      .from("faturamento_cron_logs" as any)
      .select("id, executado_em, mes, ano, total_contratos, total_faturados, total_erros, total_ja_faturados")
      .order("executado_em", { ascending: false })
      .limit(5);
    setLogs((data || []) as unknown as CronLog[]);
    setLoading(false);
  }

  return (
    <Collapsible open={open} onOpenChange={setOpen}>
      <CollapsibleTrigger className="flex items-center gap-2 text-sm font-medium text-muted-foreground hover:text-foreground transition-colors py-2">
        {open ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
        <History className="h-4 w-4" />
        Últimas execuções do faturamento automático
      </CollapsibleTrigger>

      <CollapsibleContent>
        <div className="bg-card rounded-xl border border-border shadow-sm overflow-hidden mt-2">
          {loading ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
            </div>
          ) : logs.length === 0 ? (
            <div className="text-center py-8 text-sm text-muted-foreground">
              Nenhuma execução registrada
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow className="bg-muted/50">
                  <TableHead className="text-xs">Data/Hora</TableHead>
                  <TableHead className="text-xs">Referência</TableHead>
                  <TableHead className="text-xs text-center">Contratos</TableHead>
                  <TableHead className="text-xs text-center">Geradas</TableHead>
                  <TableHead className="text-xs text-center">Já existiam</TableHead>
                  <TableHead className="text-xs text-center">Erros</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {logs.map((log) => (
                  <TableRow key={log.id}>
                    <TableCell className="text-sm whitespace-nowrap">
                      {format(parseISO(log.executado_em), "dd/MM/yyyy HH:mm")}
                    </TableCell>
                    <TableCell className="text-sm font-mono">
                      {String(log.mes).padStart(2, "0")}/{log.ano}
                    </TableCell>
                    <TableCell className="text-center text-sm">{log.total_contratos}</TableCell>
                    <TableCell className="text-center">
                      <Badge className="bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400 text-xs">
                        {log.total_faturados}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-center">
                      <Badge variant="outline" className="text-xs">{log.total_ja_faturados}</Badge>
                    </TableCell>
                    <TableCell className="text-center">
                      {log.total_erros > 0 ? (
                        <Badge variant="destructive" className="text-xs">{log.total_erros}</Badge>
                      ) : (
                        <Badge variant="outline" className="text-xs">0</Badge>
                      )}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </div>
      </CollapsibleContent>
    </Collapsible>
  );
}
