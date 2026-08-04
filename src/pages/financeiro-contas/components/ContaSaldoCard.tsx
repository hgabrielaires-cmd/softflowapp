import { useState } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ArrowDown, ArrowUp, Landmark, Loader2, RefreshCw } from "lucide-react";
import { toast } from "sonner";
import { useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { cn } from "@/lib/utils";
import { fmtCurrency } from "../helpers";
import type { ContaResumo } from "../types";

interface Props {
  conta: ContaResumo;
  selecionada: boolean;
  onSelect: (id: string) => void;
}

export function ContaSaldoCard({ conta, selecionada, onSelect }: Props) {
  const positivo = conta.saldo >= 0;
  const [syncing, setSyncing] = useState(false);
  const queryClient = useQueryClient();
  const isContaAzul = conta.nome.toUpperCase().includes("CONTA AZUL");

  async function sincronizar(e: React.MouseEvent) {
    e.stopPropagation();
    setSyncing(true);
    const { data, error } = await supabase.functions.invoke("contaazul-sync", {
      body: { periodo: "mes", filial_id: null },
    });
    setSyncing(false);
    if (error) { toast.error("Falha na sincronização"); return; }
    if ((data as any)?.error) { toast.error((data as any).error); return; }
    toast.success(`Sincronização concluída: ${(data as any)?.importados ?? 0} importados`);
    queryClient.invalidateQueries({ queryKey: ["fin_saldos_contas"] });
    queryClient.invalidateQueries({ queryKey: ["fin_movimentacoes"] });
  }

  return (
    <Card
      role="button"
      tabIndex={0}
      onClick={() => onSelect(conta.id)}
      onKeyDown={(e) => e.key === "Enter" && onSelect(conta.id)}
      className={cn(
        "rounded-xl p-4 cursor-pointer transition-colors hover:border-primary/50",
        selecionada && "border-primary ring-1 ring-primary",
      )}
    >
      <div className="flex items-center gap-2 mb-2">
        <Landmark className="h-4 w-4 text-muted-foreground" />
        <p className="text-sm font-semibold text-foreground truncate">{conta.nome}</p>
        {isContaAzul && (
          <Button
            variant="outline"
            size="sm"
            className="ml-auto h-7 px-2"
            onClick={sincronizar}
            disabled={syncing}
            title="Sincronizar com a Conta Azul"
          >
            {syncing ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <RefreshCw className="h-3.5 w-3.5" />}
            <span className="ml-1 text-xs">Sincronizar</span>
          </Button>
        )}
      </div>
      <p className="text-xs text-muted-foreground">Saldo atual</p>
      <p className={cn("text-xl font-bold", positivo ? "text-emerald-600" : "text-destructive")}>
        {fmtCurrency(conta.saldo)}
      </p>
      <div className="mt-3 space-y-1 text-xs">
        <p className="flex items-center gap-1 text-emerald-600">
          <ArrowUp className="h-3 w-3" /> Entradas mês: {fmtCurrency(conta.entradasMes)}
        </p>
        <p className="flex items-center gap-1 text-destructive">
          <ArrowDown className="h-3 w-3" /> Saídas mês: {fmtCurrency(conta.saidasMes)}
        </p>
      </div>
    </Card>
  );
}
