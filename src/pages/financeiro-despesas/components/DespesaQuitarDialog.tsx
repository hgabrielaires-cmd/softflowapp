import { useEffect, useMemo, useState } from "react";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import { Check, CheckCircle2, ChevronsUpDown, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import {
  useContasFinanceirasQuery,
  usePlanoContasQuery,
} from "@/pages/financeiro-parametros/useFinanceiroParametrosQueries";
import { formatBRL, formatDataBR, hojeISO, parseValor } from "../helpers";
import { useDespesaMutations } from "../useDespesaMutations";
import type { DespesaRegistro } from "../types";

interface Props {
  despesa: DespesaRegistro | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

function Linha({ label, valor }: { label: string; valor: string }) {
  return (
    <div className="flex flex-col gap-0.5 py-1 text-sm sm:flex-row sm:justify-between sm:gap-4">
      <span className="text-muted-foreground">{label}</span>
      <span className="font-medium break-words sm:text-right">{valor || "—"}</span>
    </div>
  );
}

export function DespesaQuitarDialog({ despesa, open, onOpenChange }: Props) {
  const [dataPagamento, setDataPagamento] = useState(hojeISO());
  const [temJuros, setTemJuros] = useState(false);
  const [planoJuros, setPlanoJuros] = useState("");
  const [planoOpen, setPlanoOpen] = useState(false);
  const [jurosPerc, setJurosPerc] = useState("0");
  const [jurosValor, setJurosValor] = useState("0");
  const [etapaConta, setEtapaConta] = useState(false);
  const [contaPagamento, setContaPagamento] = useState("");

  const { data: planoContas = [] } = usePlanoContasQuery();
  const { data: contas = [] } = useContasFinanceirasQuery();
  const { quitarDespesaMut } = useDespesaMutations();

  const planoContasLancaveis = useMemo(
    () => planoContas.filter((p) => p.ativo && p.aceita_lancamento),
    [planoContas],
  );
  const contasAtivas = useMemo(() => contas.filter((c) => c.ativo), [contas]);

  useEffect(() => {
    if (open) {
      setDataPagamento(hojeISO());
      setTemJuros(false);
      setPlanoJuros("");
      setJurosPerc("0");
      setJurosValor("0");
      setEtapaConta(false);
      setContaPagamento(despesa?.conta_financeira_id || "");
    }
  }, [open, despesa]);

  if (!despesa) return null;

  const valorOriginal = Number(despesa.valor);
  const juros = temJuros ? parseValor(jurosValor) : 0;
  const totalLiquido = valorOriginal + juros;

  const onPercChange = (v: string) => {
    setJurosPerc(v);
    const perc = parseValor(v);
    setJurosValor(((valorOriginal * perc) / 100).toFixed(2).replace(".", ","));
  };

  const onValorChange = (v: string) => {
    setJurosValor(v);
    const val = parseValor(v);
    setJurosPerc(valorOriginal > 0 ? ((val / valorOriginal) * 100).toFixed(4).replace(".", ",") : "0");
  };

  const irParaConta = () => {
    if (!dataPagamento) return toast.error("Informe a data do pagamento");
    if (temJuros && juros > 0 && !planoJuros) {
      return toast.error("Selecione o plano de contas dos juros");
    }
    setEtapaConta(true);
  };

  const confirmar = async () => {
    if (!contaPagamento) return toast.error("Selecione a conta financeira do pagamento");
    await quitarDespesaMut.mutateAsync({
      despesa,
      data_pagamento: dataPagamento,
      juros_percentual: temJuros ? parseValor(jurosPerc) : 0,
      juros_valor: juros,
      plano_conta_juros_id: temJuros && juros > 0 ? planoJuros || null : null,
      valor_pago: totalLiquido,
      conta_financeira_id: contaPagamento,
    });
    onOpenChange(false);
  };

  const planoNome = (id: string) => {
    const p = planoContas.find((x) => x.id === id);
    return p ? `${p.codigo} — ${p.nome}` : "";
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="w-[calc(100vw-1.5rem)] max-w-[calc(100vw-1.5rem)] sm:max-w-xl max-h-[92dvh] overflow-y-auto">
        <DialogHeader className="text-left">
          <DialogTitle>Quitar despesa</DialogTitle>
        </DialogHeader>

        <div className="rounded-lg border border-border p-3 sm:p-4">
          <Linha label="Fornecedor" valor={despesa.fornecedores?.nome_fantasia || ""} />
          <Linha label="Valor da parcela" valor={formatBRL(valorOriginal)} />
          <Linha label="Vencimento" valor={formatDataBR(despesa.data_vencimento)} />
          <Linha label="Plano de contas" valor={planoNome(despesa.plano_conta_id)} />
          <Linha label="Descrição" valor={despesa.descricao || ""} />
          {despesa.parcela_total > 1 && (
            <Linha label="Parcela" valor={`${despesa.parcela_numero}/${despesa.parcela_total}`} />
          )}
        </div>

        <div className="space-y-1.5">
          <Label className="text-xs">Data do pagamento</Label>
          <Input type="date" value={dataPagamento} onChange={(e) => setDataPagamento(e.target.value)} />
        </div>

        <div className="space-y-3 rounded-lg border border-border p-3 sm:p-4">
          <div className="flex items-center justify-between gap-3">
            <Label className="text-sm font-medium">Acréscimos (juros)</Label>
            <Select value={temJuros ? "sim" : "nao"} onValueChange={(v) => setTemJuros(v === "sim")}>
              <SelectTrigger className="w-32"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="nao">Não houve</SelectItem>
                <SelectItem value="sim">Houve juros</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {temJuros && (
            <div className="grid gap-3 sm:grid-cols-2">
              <div className="space-y-1.5 sm:col-span-2">
                <Label className="text-xs">Plano de contas dos juros</Label>
                <Popover open={planoOpen} onOpenChange={setPlanoOpen}>
                  <PopoverTrigger asChild>
                    <Button
                      variant="outline"
                      role="combobox"
                      className={cn(
                        "w-full justify-between font-normal",
                        !planoJuros && "text-muted-foreground",
                      )}
                    >
                      <span className="truncate">
                        {planoJuros ? planoNome(planoJuros) : "Pesquisar plano de contas..."}
                      </span>
                      <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-[--radix-popover-trigger-width] p-0" align="start">
                    <Command
                      filter={(value, search) =>
                        value.toLowerCase().includes(search.toLowerCase()) ? 1 : 0
                      }
                    >
                      <CommandInput placeholder="Digite o código ou o nome..." />
                      <CommandList>
                        <CommandEmpty>Nenhum plano de contas encontrado.</CommandEmpty>
                        <CommandGroup>
                          {planoContasLancaveis.map((p) => (
                            <CommandItem
                              key={p.id}
                              value={`${p.codigo} ${p.nome}`}
                              onSelect={() => {
                                setPlanoJuros(p.id);
                                setPlanoOpen(false);
                              }}
                            >
                              <Check
                                className={cn(
                                  "mr-2 h-4 w-4",
                                  planoJuros === p.id ? "opacity-100" : "opacity-0",
                                )}
                              />
                              <span className="truncate">{p.codigo} — {p.nome}</span>
                            </CommandItem>
                          ))}
                        </CommandGroup>
                      </CommandList>
                    </Command>
                  </PopoverContent>
                </Popover>
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs">Juros (%)</Label>
                <Input value={jurosPerc} onChange={(e) => onPercChange(e.target.value)} />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs">Valor juros (R$)</Label>
                <Input value={jurosValor} onChange={(e) => onValorChange(e.target.value)} />
              </div>
            </div>
          )}

          <div className="flex items-center justify-between border-t border-border pt-3">
            <span className="text-sm text-muted-foreground">Total líquido pago</span>
            <span className="text-lg font-semibold">{formatBRL(totalLiquido)}</span>
          </div>
        </div>

        <DialogFooter className="flex-col-reverse gap-2 sm:flex-row">
          <Button variant="outline" className="w-full sm:w-auto" onClick={() => onOpenChange(false)}>
            Cancelar
          </Button>
          <Button className="w-full sm:w-auto" onClick={confirmar} disabled={quitarDespesaMut.isPending}>
            {quitarDespesaMut.isPending ? (
              <Loader2 className="h-4 w-4 animate-spin mr-2" />
            ) : (
              <CheckCircle2 className="h-4 w-4 mr-2" />
            )}
            Confirmar pagamento
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
