import { useEffect, useMemo, useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Loader2 } from "lucide-react";
import {
  useCentrosCustoQuery,
  useContasFinanceirasQuery,
  useFormasPagamentoQuery,
  usePlanoContasQuery,
} from "@/pages/financeiro-parametros/useFinanceiroParametrosQueries";
import { STATUS_DESPESA } from "../constants";
import { useFornecedoresOptionsQuery } from "../useDespesasQueries";
import { useDespesaMutations } from "../useDespesaMutations";
import type { DespesaEditState, DespesaRegistro, EscopoParcelas } from "../types";

interface Props {
  despesa: DespesaRegistro | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function DespesaEditDialog({ despesa, open, onOpenChange }: Props) {
  const [state, setStateRaw] = useState<DespesaEditState | null>(null);
  const [escopo, setEscopo] = useState<EscopoParcelas>("parcela");

  const { data: fornecedores = [] } = useFornecedoresOptionsQuery();
  const { data: planoContas = [] } = usePlanoContasQuery();
  const { data: formasPagamento = [] } = useFormasPagamentoQuery();
  const { data: contas = [] } = useContasFinanceirasQuery();
  const { editarDespesaMut } = useDespesaMutations();

  const planoContasLancaveis = useMemo(
    () => planoContas.filter((p) => p.ativo && p.aceita_lancamento),
    [planoContas],
  );

  useEffect(() => {
    if (open && despesa) {
      setEscopo("parcela");
      setStateRaw({
        fornecedor_id: despesa.fornecedor_id,
        plano_conta_id: despesa.plano_conta_id,
        forma_pagamento_id: despesa.forma_pagamento_id,
        conta_financeira_id: despesa.conta_financeira_id,
        valor: String(despesa.valor),
        data_emissao: despesa.data_emissao,
        data_vencimento: despesa.data_vencimento,
        descricao: despesa.descricao || "",
        status: despesa.status,
      });
    }
  }, [open, despesa]);

  if (!despesa || !state) return null;

  const setState = (patch: Partial<DespesaEditState>) =>
    setStateRaw((prev) => (prev ? { ...prev, ...patch } : prev));

  const salvar = async () => {
    await editarDespesaMut.mutateAsync({ despesa, state, escopo });
    onOpenChange(false);
  };

  const recorrente = despesa.parcela_total > 1;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>
            Editar despesa {recorrente ? `— parcela ${despesa.parcela_numero}/${despesa.parcela_total}` : ""}
          </DialogTitle>
        </DialogHeader>

        <div className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-1.5 sm:col-span-2">
            <Label className="text-xs">Fornecedor</Label>
            <Select value={state.fornecedor_id} onValueChange={(v) => setState({ fornecedor_id: v })}>
              <SelectTrigger><SelectValue placeholder="Selecione" /></SelectTrigger>
              <SelectContent>
                {fornecedores.map((f) => (
                  <SelectItem key={f.id} value={f.id}>{f.nome_fantasia}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-1.5">
            <Label className="text-xs">Valor (R$)</Label>
            <Input value={state.valor} onChange={(e) => setState({ valor: e.target.value })} />
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs">Status</Label>
            <Select value={state.status} onValueChange={(v) => setState({ status: v })}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                {STATUS_DESPESA.map((s) => (
                  <SelectItem key={s.value} value={s.value}>{s.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-1.5">
            <Label className="text-xs">Emissão</Label>
            <Input type="date" value={state.data_emissao} onChange={(e) => setState({ data_emissao: e.target.value })} />
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs">Vencimento</Label>
            <Input type="date" value={state.data_vencimento} onChange={(e) => setState({ data_vencimento: e.target.value })} />
          </div>

          <div className="space-y-1.5">
            <Label className="text-xs">Plano de contas</Label>
            <Select value={state.plano_conta_id} onValueChange={(v) => setState({ plano_conta_id: v })}>
              <SelectTrigger><SelectValue placeholder="Selecione" /></SelectTrigger>
              <SelectContent>
                {planoContasLancaveis.map((p) => (
                  <SelectItem key={p.id} value={p.id}>{p.codigo} — {p.nome}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs">Forma de pagamento</Label>
            <Select value={state.forma_pagamento_id} onValueChange={(v) => setState({ forma_pagamento_id: v })}>
              <SelectTrigger><SelectValue placeholder="Selecione" /></SelectTrigger>
              <SelectContent>
                {formasPagamento.filter((f) => f.ativo).map((f) => (
                  <SelectItem key={f.id} value={f.id}>{f.nome}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1.5 sm:col-span-2">
            <Label className="text-xs">Conta financeira</Label>
            <Select value={state.conta_financeira_id} onValueChange={(v) => setState({ conta_financeira_id: v })}>
              <SelectTrigger><SelectValue placeholder="Selecione" /></SelectTrigger>
              <SelectContent>
                {contas.filter((c) => c.ativo).map((c) => (
                  <SelectItem key={c.id} value={c.id}>{c.nome}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-1.5 sm:col-span-2">
            <Label className="text-xs">Descrição</Label>
            <Textarea
              rows={2}
              value={state.descricao}
              onChange={(e) => setState({ descricao: e.target.value })}
            />
          </div>

          {recorrente && (
            <div className="sm:col-span-2 rounded-md border border-border p-3 space-y-2">
              <Label className="text-xs">Aplicar alterações a</Label>
              <RadioGroup value={escopo} onValueChange={(v) => setEscopo(v as EscopoParcelas)}>
                <div className="flex items-center gap-2">
                  <RadioGroupItem value="parcela" id="escopo-parcela" />
                  <Label htmlFor="escopo-parcela" className="font-normal">Somente esta parcela</Label>
                </div>
                <div className="flex items-center gap-2">
                  <RadioGroupItem value="futuras" id="escopo-futuras" />
                  <Label htmlFor="escopo-futuras" className="font-normal">
                    Esta e as parcelas futuras
                  </Label>
                </div>
              </RadioGroup>
              <p className="text-xs text-muted-foreground">
                As datas de emissão e vencimento sempre se aplicam apenas a esta parcela.
              </p>
            </div>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancelar</Button>
          <Button onClick={salvar} disabled={editarDespesaMut.isPending}>
            {editarDespesaMut.isPending && <Loader2 className="h-4 w-4 animate-spin mr-2" />}
            Salvar alterações
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
