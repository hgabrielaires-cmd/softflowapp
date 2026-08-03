import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Plus, Trash2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { distribuirRateio, totalRateio } from "../helpers";
import type { DespesaWizardState } from "../types";
import type { CentroCusto, ContaFinanceira, FormaPagamento, PlanoConta } from "@/pages/financeiro-parametros/types";

interface Props {
  state: DespesaWizardState;
  setState: (patch: Partial<DespesaWizardState>) => void;
  planoContas: PlanoConta[];
  formasPagamento: FormaPagamento[];
  contas: ContaFinanceira[];
  centrosCusto: CentroCusto[];
}

export function StepClassificacao({
  state,
  setState,
  planoContas,
  formasPagamento,
  contas,
  centrosCusto,
}: Props) {
  const total = totalRateio(state.rateios);
  const centroPadrao = state.rateios[0]?.centro_custo_id || "";

  const toggleRateio = (checked: boolean) => {
    if (checked) {
      setState({ ratear: true, rateios: [{ centro_custo_id: centroPadrao, percentual: 100 }] });
    } else {
      setState({ ratear: false, rateios: [{ centro_custo_id: centroPadrao, percentual: 100 }] });
    }
  };

  const addLinha = () => {
    const novas = [...state.rateios, { centro_custo_id: "", percentual: 0 }];
    setState({ rateios: distribuirRateio(novas) });
  };

  const removeLinha = (index: number) => {
    if (state.rateios.length <= 1) return;
    setState({ rateios: distribuirRateio(state.rateios.filter((_, i) => i !== index)) });
  };

  const updateLinha = (index: number, patch: Partial<{ centro_custo_id: string; percentual: number }>) => {
    setState({
      rateios: state.rateios.map((l, i) => (i === index ? { ...l, ...patch } : l)),
    });
  };

  return (
    <div className="space-y-4">
      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-1.5">
          <Label>Plano de contas *</Label>
          <Popover open={planoOpen} onOpenChange={setPlanoOpen}>
            <PopoverTrigger asChild>
              <Button
                variant="outline"
                role="combobox"
                aria-expanded={planoOpen}
                className={cn(
                  "w-full justify-between font-normal",
                  !planoSelecionado && "text-muted-foreground",
                )}
              >
                <span className="truncate">
                  {planoSelecionado
                    ? `${planoSelecionado.codigo} — ${planoSelecionado.nome}`
                    : "Selecione"}
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
                <CommandInput placeholder="Buscar por código ou nome..." />
                <CommandList>
                  <CommandEmpty>Nenhum plano encontrado.</CommandEmpty>
                  <CommandGroup>
                    {planoContas.map((p) => (
                      <CommandItem
                        key={p.id}
                        value={`${p.codigo} ${p.nome}`}
                        onSelect={() => {
                          setState({ plano_conta_id: p.id });
                          setPlanoOpen(false);
                        }}
                      >
                        <Check
                          className={cn(
                            "mr-2 h-4 w-4",
                            state.plano_conta_id === p.id ? "opacity-100" : "opacity-0",
                          )}
                        />
                        {p.codigo} — {p.nome}
                      </CommandItem>
                    ))}
                  </CommandGroup>
                </CommandList>
              </Command>
            </PopoverContent>
          </Popover>
        </div>
        <div className="space-y-1.5">
          <Label>Forma de pagamento *</Label>
          <Select value={state.forma_pagamento_id} onValueChange={(v) => setState({ forma_pagamento_id: v })}>
            <SelectTrigger><SelectValue placeholder="Selecione" /></SelectTrigger>
            <SelectContent>
              {formasPagamento.map((f) => (
                <SelectItem key={f.id} value={f.id}>{f.nome}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      <div className="space-y-1.5">
        <Label>Conta financeira *</Label>
        <Select value={state.conta_financeira_id} onValueChange={(v) => setState({ conta_financeira_id: v })}>
          <SelectTrigger><SelectValue placeholder="Selecione" /></SelectTrigger>
          <SelectContent>
            {contas.map((c) => (
              <SelectItem key={c.id} value={c.id}>{c.nome}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="rounded-lg border border-border p-3 sm:p-4 space-y-3">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <Label className="text-sm font-medium">Centro de custo</Label>
          <div className="flex items-center gap-2">
            <span className="text-xs text-muted-foreground">Ratear entre centros de custo</span>
            <Switch checked={state.ratear} onCheckedChange={toggleRateio} />
          </div>
        </div>


        {!state.ratear ? (
          <Select
            value={centroPadrao}
            onValueChange={(v) => setState({ rateios: [{ centro_custo_id: v, percentual: 100 }] })}
          >
            <SelectTrigger><SelectValue placeholder="Selecione o centro de custo" /></SelectTrigger>
            <SelectContent>
              {centrosCusto.map((c) => (
                <SelectItem key={c.id} value={c.id}>
                  {c.codigo ? `${c.codigo} — ` : ""}{c.nome}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        ) : (
          <div className="space-y-2">
            {state.rateios.map((linha, index) => (
              <div key={index} className="flex flex-wrap items-center gap-2">
                <Select
                  value={linha.centro_custo_id}
                  onValueChange={(v) => updateLinha(index, { centro_custo_id: v })}
                >
                  <SelectTrigger className="w-full min-w-0 sm:flex-1 sm:w-auto">
                    <SelectValue placeholder="Centro de custo" />
                  </SelectTrigger>
                  <SelectContent>
                    {centrosCusto.map((c) => (
                      <SelectItem key={c.id} value={c.id}>
                        {c.codigo ? `${c.codigo} — ` : ""}{c.nome}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <div className="flex flex-1 items-center gap-2">
                  <Input
                    className="w-20 sm:w-24"
                    inputMode="decimal"
                    value={String(linha.percentual)}
                    onChange={(e) => updateLinha(index, { percentual: Number(e.target.value.replace(",", ".")) || 0 })}
                  />
                  <span className="text-sm text-muted-foreground">%</span>
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    className="ml-auto sm:ml-0"
                    disabled={state.rateios.length <= 1}
                    onClick={() => removeLinha(index)}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            ))}
            <div className="flex flex-wrap items-center justify-between gap-2 pt-1">
              <Button type="button" variant="outline" size="sm" onClick={addLinha}>
                <Plus className="h-4 w-4 mr-1" /> Adicionar centro de custo
              </Button>
              <span
                className={cn(
                  "text-sm font-medium",
                  total === 100 ? "text-green-600" : "text-destructive",
                )}
              >
                Total: {total}%
              </span>
            </div>

          </div>
        )}
      </div>
    </div>
  );
}
