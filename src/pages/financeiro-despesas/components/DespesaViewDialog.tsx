import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import {
  useCentrosCustoQuery,
  useContasFinanceirasQuery,
  useFormasPagamentoQuery,
  usePlanoContasQuery,
} from "@/pages/financeiro-parametros/useFinanceiroParametrosQueries";
import { STATUS_DESPESA } from "../constants";
import { formatBRL, formatDataBR, statusBadgeClass, statusBadgeVariant, despesaVencida } from "../helpers";
import type { DespesaRegistro } from "../types";

interface Props {
  despesa: DespesaRegistro | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

function Campo({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="space-y-1">
      <Label className="text-xs text-muted-foreground">{label}</Label>
      <p className="text-sm text-foreground break-words">{value || "—"}</p>
    </div>
  );
}

export function DespesaViewDialog({ despesa, open, onOpenChange }: Props) {
  const { data: planoContas = [] } = usePlanoContasQuery();
  const { data: formasPagamento = [] } = useFormasPagamentoQuery();
  const { data: contas = [] } = useContasFinanceirasQuery();
  const { data: centrosCusto = [] } = useCentrosCustoQuery();

  if (!despesa) return null;

  const plano = planoContas.find((p) => p.id === despesa.plano_conta_id);
  const forma = formasPagamento.find((f) => f.id === despesa.forma_pagamento_id);
  const conta = contas.find((c) => c.id === despesa.conta_financeira_id);
  const rateioIds = (despesa.fin_despesa_rateios || []).map((r) => r.centro_custo_id);
  const centros = centrosCusto.filter((c) => rateioIds.includes(c.id)).map((c) => c.nome).join(", ");

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>
            Visualizar despesa {despesa.parcela_total > 1 ? `— parcela ${despesa.parcela_numero}/${despesa.parcela_total}` : ""}
          </DialogTitle>
        </DialogHeader>

        <div className="grid gap-4 sm:grid-cols-2">
          <div className="sm:col-span-2">
            <Campo label="Fornecedor" value={despesa.fornecedores?.nome_fantasia} />
          </div>
          <Campo label="Valor" value={formatBRL(Number(despesa.valor))} />
          <div className="space-y-1">
            <Label className="text-xs text-muted-foreground">Status</Label>
            <div>
              <Badge variant={statusBadgeVariant(despesa)} className={statusBadgeClass(despesa)}>
                {despesaVencida(despesa)
                  ? "Vencido"
                  : STATUS_DESPESA.find((s) => s.value === despesa.status)?.label || despesa.status}
              </Badge>
            </div>
          </div>
          <Campo label="Emissão" value={formatDataBR(despesa.data_emissao)} />
          <Campo label="Vencimento" value={formatDataBR(despesa.data_vencimento)} />
          <Campo label="Plano de contas" value={plano ? `${plano.codigo} — ${plano.nome}` : "—"} />
          <Campo label="Forma de pagamento" value={forma?.nome} />
          <Campo label="Conta financeira" value={conta?.nome} />
          <Campo label="Centro de custo" value={centros} />
          {despesa.data_pagamento && (
            <>
              <Campo label="Data do pagamento" value={formatDataBR(despesa.data_pagamento)} />
              <Campo label="Valor pago" value={despesa.valor_pago != null ? formatBRL(Number(despesa.valor_pago)) : "—"} />
            </>
          )}
          {Number(despesa.juros_valor || 0) > 0 && (
            <Campo label="Juros / acréscimos" value={formatBRL(Number(despesa.juros_valor))} />
          )}
          <div className="sm:col-span-2">
            <Campo label="Descrição" value={despesa.descricao} />
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Fechar</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
