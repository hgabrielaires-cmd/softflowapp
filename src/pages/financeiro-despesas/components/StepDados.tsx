import { useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "@/components/ui/command";
import { Check, ChevronsUpDown, Plus } from "lucide-react";
import { cn } from "@/lib/utils";
import { formatDataBR } from "../helpers";
import type { DespesaWizardState, FornecedorOption } from "../types";

interface Props {
  state: DespesaWizardState;
  setState: (patch: Partial<DespesaWizardState>) => void;
  fornecedores: FornecedorOption[];
  filiais: { id: string; nome: string }[];
  onNovoFornecedor: () => void;
}

export function StepDados({ state, setState, fornecedores, filiais, onNovoFornecedor }: Props) {
  const [openCombo, setOpenCombo] = useState(false);

  const selecionado = useMemo(
    () => fornecedores.find((f) => f.id === state.fornecedor_id),
    [fornecedores, state.fornecedor_id],
  );

  return (
    <div className="space-y-4">
      <div className="grid gap-4 sm:grid-cols-3">
        <div className="space-y-1.5">
          <Label>Valor *</Label>
          <Input
            inputMode="decimal"
            value={state.valor}
            onChange={(e) => setState({ valor: e.target.value })}
            placeholder="0,00"
          />
        </div>
        <div className="space-y-1.5">
          <Label>Data de emissão</Label>
          <Input value={formatDataBR(state.data_emissao)} disabled readOnly />
        </div>
        <div className="space-y-1.5">
          <Label>Data de vencimento *</Label>
          <Input
            type="date"
            value={state.data_vencimento}
            onChange={(e) => setState({ data_vencimento: e.target.value })}
          />
        </div>
      </div>

      <div className="space-y-1.5">
        <Label>Filial *</Label>
        <Select value={state.filial_id} onValueChange={(v) => setState({ filial_id: v })}>
          <SelectTrigger><SelectValue placeholder="Selecione a filial" /></SelectTrigger>
          <SelectContent>
            {filiais.map((f) => (
              <SelectItem key={f.id} value={f.id}>{f.nome}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="space-y-1.5">
        <Label>Código de barras / linha digitável</Label>
        <Input
          value={state.codigo_barras}
          onChange={(e) => setState({ codigo_barras: e.target.value })}
          placeholder="Opcional"
        />
      </div>

      <div className="space-y-1.5">
        <Label>Fornecedor *</Label>
        <div className="flex gap-2">
          <Popover open={openCombo} onOpenChange={setOpenCombo}>
            <PopoverTrigger asChild>
              <Button
                variant="outline"
                role="combobox"
                className="flex-1 justify-between font-normal"
              >
                {selecionado ? selecionado.nome_fantasia : "Selecione o fornecedor"}
                <ChevronsUpDown className="ml-2 h-4 w-4 opacity-50" />
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-[--radix-popover-trigger-width] p-0" align="start">
              <Command>
                <CommandInput placeholder="Buscar fornecedor..." />
                <CommandList>
                  <CommandEmpty>Nenhum fornecedor encontrado.</CommandEmpty>
                  <CommandGroup>
                    {fornecedores.map((f) => (
                      <CommandItem
                        key={f.id}
                        value={`${f.nome_fantasia} ${f.cnpj_cpf}`}
                        onSelect={() => {
                          setState({
                            fornecedor_id: f.id,
                            ...(f.plano_conta_id ? { plano_conta_id: f.plano_conta_id } : {}),
                          });
                          setOpenCombo(false);
                        }}
                      >
                        <Check
                          className={cn(
                            "mr-2 h-4 w-4",
                            f.id === state.fornecedor_id ? "opacity-100" : "opacity-0",
                          )}
                        />
                        <span className="truncate">{f.nome_fantasia}</span>
                        <span className="ml-auto text-xs text-muted-foreground">{f.cnpj_cpf}</span>
                      </CommandItem>
                    ))}
                  </CommandGroup>
                </CommandList>
              </Command>
            </PopoverContent>
          </Popover>
          <Button type="button" variant="outline" size="icon" onClick={onNovoFornecedor} title="Cadastrar fornecedor">
            <Plus className="h-4 w-4" />
          </Button>
        </div>
      </div>
    </div>
  );
}
