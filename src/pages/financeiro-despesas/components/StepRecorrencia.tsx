import { useState } from "react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { PERIODOS_RECORRENCIA } from "../constants";
import { formatBRL } from "../helpers";
import { ParcelasPaginacao, fatiar } from "./ParcelasPaginacao";
import type { DespesaWizardState, RecorrenciaPeriodo } from "../types";

interface Props {
  state: DespesaWizardState;
  setState: (patch: Partial<DespesaWizardState>) => void;
  onRecorrenciaChange: (patch: { recorrente?: boolean; periodo?: RecorrenciaPeriodo; vezes?: number }) => void;
}

export function StepRecorrencia({ state, setState, onRecorrenciaChange }: Props) {
  const [porPagina, setPorPagina] = useState("5");
  const [pagina, setPagina] = useState(1);
  const { visiveis, totalPaginas } = fatiar(state.parcelas, porPagina, pagina);

  const editarParcela = (numero: number, data: string) => {
    setState({
      parcelas: state.parcelas.map((p) => (p.numero === numero ? { ...p, data_vencimento: data } : p)),
    });
  };

  return (
    <div className="space-y-4">
      <div className="space-y-2">
        <Label>Essa despesa se repete?</Label>
        <RadioGroup
          className="flex gap-6"
          value={state.recorrente ? "sim" : "nao"}
          onValueChange={(v) => onRecorrenciaChange({ recorrente: v === "sim" })}
        >
          <div className="flex items-center gap-2">
            <RadioGroupItem value="sim" id="rec-sim" />
            <Label htmlFor="rec-sim" className="font-normal">Sim</Label>
          </div>
          <div className="flex items-center gap-2">
            <RadioGroupItem value="nao" id="rec-nao" />
            <Label htmlFor="rec-nao" className="font-normal">Não</Label>
          </div>
        </RadioGroup>
      </div>

      {state.recorrente && (
        <>
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-1.5">
              <Label>Período</Label>
              <Select
                value={state.periodo}
                onValueChange={(v) => onRecorrenciaChange({ periodo: v as RecorrenciaPeriodo })}
              >
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {PERIODOS_RECORRENCIA.map((p) => (
                    <SelectItem key={p.value} value={p.value}>{p.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label>Número de vezes</Label>
              <Input
                type="number"
                min={1}
                value={state.vezes}
                onChange={(e) => onRecorrenciaChange({ vezes: Math.max(1, Number(e.target.value) || 1) })}
              />
            </div>
          </div>

          <div className="rounded-lg border border-border overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-16 sm:w-20">Parcela</TableHead>
                  <TableHead>Vencimento</TableHead>
                  <TableHead className="text-right">Valor</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {visiveis.map((p) => (
                  <TableRow key={p.numero}>
                    <TableCell className="whitespace-nowrap">{p.numero}/{state.parcelas.length}</TableCell>
                    <TableCell>
                      <Input
                        type="date"
                        className="w-36 sm:w-44"
                        value={p.data_vencimento}
                        onChange={(e) => editarParcela(p.numero, e.target.value)}
                      />
                    </TableCell>
                    <TableCell className="text-right whitespace-nowrap">{formatBRL(p.valor)}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>

          <ParcelasPaginacao
            total={state.parcelas.length}
            porPagina={porPagina}
            setPorPagina={setPorPagina}
            pagina={Math.min(pagina, totalPaginas)}
            setPagina={setPagina}
            totalPaginas={totalPaginas}
          />
        </>
      )}
    </div>
  );
}
