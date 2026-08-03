import { Card } from "@/components/ui/card";
import { ArrowDown, ArrowUp, Landmark } from "lucide-react";
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
