import { toast } from "sonner";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { PERIODOS_RECORRENCIA } from "../constants";
import { ANEXO_ACCEPT, ANEXO_MAX_MB, formatBRL, formatDataBR, parseValor, validarAnexo } from "../helpers";

import type { DespesaWizardState, FornecedorOption } from "../types";
import type { CentroCusto, ContaFinanceira, FormaPagamento, PlanoConta } from "@/pages/financeiro-parametros/types";

interface Props {
  state: DespesaWizardState;
  setState: (patch: Partial<DespesaWizardState>) => void;
  anexo: File | null;
  setAnexo: (file: File | null) => void;
  fornecedores: FornecedorOption[];
  planoContas: PlanoConta[];
  formasPagamento: FormaPagamento[];
  contas: ContaFinanceira[];
  centrosCusto: CentroCusto[];
}

function Linha({ label, valor }: { label: string; valor: string }) {
  return (
    <div className="flex flex-col gap-0.5 py-1 text-sm sm:flex-row sm:justify-between sm:gap-4">
      <span className="text-muted-foreground">{label}</span>
      <span className="font-medium break-words sm:text-right">{valor || "—"}</span>
    </div>
  );
}


export function StepRevisao({
  state,
  setState,
  anexo,
  setAnexo,
  fornecedores,
  planoContas,
  formasPagamento,
  contas,
  centrosCusto,
}: Props) {
  const nomeCentro = (id: string) => {
    const c = centrosCusto.find((x) => x.id === id);
    return c ? `${c.codigo ? c.codigo + " — " : ""}${c.nome}` : "—";
  };

  const periodoLabel = PERIODOS_RECORRENCIA.find((p) => p.value === state.periodo)?.label || "";

  return (
    <div className="space-y-4">
      <div className="rounded-lg border border-border p-3 sm:p-4">
        <Linha label="Valor" valor={formatBRL(parseValor(state.valor))} />
        <Linha label="Data de emissão" valor={formatDataBR(state.data_emissao)} />
        <Linha label="Data de vencimento" valor={formatDataBR(state.data_vencimento)} />
        <Linha
          label="Fornecedor"
          valor={fornecedores.find((f) => f.id === state.fornecedor_id)?.nome_fantasia || ""}
        />
        <Linha label="Código de barras" valor={state.codigo_barras} />
        <Linha
          label="Plano de contas"
          valor={(() => {
            const p = planoContas.find((x) => x.id === state.plano_conta_id);
            return p ? `${p.codigo} — ${p.nome}` : "";
          })()}
        />
        <Linha
          label="Forma de pagamento"
          valor={formasPagamento.find((f) => f.id === state.forma_pagamento_id)?.nome || ""}
        />
        <Linha
          label="Conta financeira"
          valor={contas.find((c) => c.id === state.conta_financeira_id)?.nome || ""}
        />
        <Linha
          label="Centro de custo"
          valor={
            state.ratear
              ? state.rateios.map((r) => `${nomeCentro(r.centro_custo_id)} (${r.percentual}%)`).join(" • ")
              : nomeCentro(state.rateios[0]?.centro_custo_id || "")
          }
        />
        <Linha
          label="Recorrência"
          valor={state.recorrente ? `${periodoLabel} — ${state.vezes}x` : "Não se repete"}
        />
      </div>

      {state.recorrente && state.parcelas.length > 0 && (
        <div className="rounded-lg border border-border overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-24">Parcela</TableHead>
                <TableHead>Vencimento</TableHead>
                <TableHead className="text-right">Valor</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {state.parcelas.map((p) => (
                <TableRow key={p.numero}>
                  <TableCell>{p.numero}/{state.parcelas.length}</TableCell>
                  <TableCell>{formatDataBR(p.data_vencimento)}</TableCell>
                  <TableCell className="text-right">{formatBRL(p.valor)}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}

      <div className="space-y-1.5">
        <Label>Descrição da despesa</Label>
        <Textarea
          rows={3}
          value={state.descricao}
          onChange={(e) => setState({ descricao: e.target.value })}
          placeholder="Opcional"
        />
      </div>

      <div className="space-y-1.5">
        <Label>Anexo</Label>
        <Input
          type="file"
          accept={ANEXO_ACCEPT}
          onChange={(e) => {
            const file = e.target.files?.[0] || null;
            if (!file) return setAnexo(null);
            const erro = validarAnexo(file);
            if (erro) {
              toast.error(erro);
              e.target.value = "";
              setAnexo(null);
              return;
            }
            setAnexo(file);
          }}
        />
        <p className="text-xs text-muted-foreground">
          PDF ou imagem (PNG, JPG, WEBP) de até {ANEXO_MAX_MB} MB. Opcional.
        </p>
        {anexo && <p className="text-xs text-muted-foreground">{anexo.name}</p>}
      </div>

    </div>
  );
}
