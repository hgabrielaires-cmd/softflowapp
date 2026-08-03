import { useEffect, useMemo, useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Check, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { useAuth } from "@/context/AuthContext";
import {
  useCentrosCustoQuery,
  useContasFinanceirasQuery,
  useFormasPagamentoQuery,
  usePlanoContasQuery,
} from "@/pages/financeiro-parametros/useFinanceiroParametrosQueries";
import { WIZARD_STEPS, emptyDespesaWizard } from "../constants";
import { gerarParcelas, hojeISO, parseValor, rateioValido } from "../helpers";
import { useFornecedoresOptionsQuery } from "../useDespesasQueries";
import { useDespesaForm } from "../useDespesaForm";
import type { DespesaWizardState, FornecedorOption, RecorrenciaPeriodo } from "../types";
import { StepDados } from "./StepDados";
import { StepClassificacao } from "./StepClassificacao";
import { StepRecorrencia } from "./StepRecorrencia";
import { StepRevisao } from "./StepRevisao";
import { FornecedorRapidoDialog } from "./FornecedorRapidoDialog";

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function DespesaWizardDialog({ open, onOpenChange }: Props) {
  const { user } = useAuth();
  const [step, setStep] = useState(1);
  const [state, setStateRaw] = useState<DespesaWizardState>(() => emptyDespesaWizard(hojeISO()));
  const [anexo, setAnexo] = useState<File | null>(null);
  const [fornecedorDialog, setFornecedorDialog] = useState(false);

  const { data: fornecedores = [] } = useFornecedoresOptionsQuery();
  const { data: planoContas = [] } = usePlanoContasQuery();
  const { data: formasPagamento = [] } = useFormasPagamentoQuery();
  const { data: contas = [] } = useContasFinanceirasQuery();
  const { data: centrosCusto = [] } = useCentrosCustoQuery();
  const { salvarDespesaMut } = useDespesaForm();

  const setState = (patch: Partial<DespesaWizardState>) =>
    setStateRaw((prev) => ({ ...prev, ...patch }));

  const planoContasLancaveis = useMemo(
    () => planoContas.filter((p) => p.ativo && p.aceita_lancamento),
    [planoContas],
  );
  const centrosAtivos = useMemo(() => centrosCusto.filter((c) => c.ativo), [centrosCusto]);
  const formasAtivas = useMemo(() => formasPagamento.filter((f) => f.ativo), [formasPagamento]);
  const contasAtivas = useMemo(() => contas.filter((c) => c.ativo), [contas]);

  // Reinicia o wizard a cada abertura
  useEffect(() => {
    if (open) {
      setStep(1);
      setStateRaw(emptyDespesaWizard(hojeISO()));
      setAnexo(null);
    }
  }, [open]);

  // Centro de custo padrão: CC1 (empresa toda) com 100%
  useEffect(() => {
    if (!open || centrosAtivos.length === 0) return;
    setStateRaw((prev) => {
      if (prev.rateios.length > 0 && prev.rateios[0].centro_custo_id) return prev;
      const padrao =
        centrosAtivos.find((c) => (c.codigo || "").toUpperCase() === "CC1") || centrosAtivos[0];
      return { ...prev, rateios: [{ centro_custo_id: padrao.id, percentual: 100 }] };
    });
  }, [open, centrosAtivos]);

  const recalcParcelas = (patch: {
    recorrente?: boolean;
    periodo?: RecorrenciaPeriodo;
    vezes?: number;
  }) => {
    setStateRaw((prev) => {
      const next = { ...prev, ...patch };
      next.parcelas = next.recorrente
        ? gerarParcelas(next.data_vencimento, next.periodo, next.vezes, parseValor(next.valor))
        : [];
      return next;
    });
  };

  const podeAvancar = () => {
    if (step === 1) {
      if (parseValor(state.valor) <= 0) return toast.error("Informe o valor da despesa"), false;
      if (!state.data_vencimento) return toast.error("Informe a data de vencimento"), false;
      if (!state.fornecedor_id) return toast.error("Selecione o fornecedor"), false;
    }
    if (step === 2) {
      if (!state.plano_conta_id) return toast.error("Selecione o plano de contas"), false;
      if (!state.forma_pagamento_id) return toast.error("Selecione a forma de pagamento"), false;
      if (!state.conta_financeira_id) return toast.error("Selecione a conta financeira"), false;
      if (!rateioValido(state.ratear, state.rateios))
        return toast.error("O rateio deve somar 100% e ter centros selecionados"), false;
    }
    return true;
  };

  const avancar = () => {
    if (!podeAvancar()) return;
    if (step === 2) {
      // mantém a prévia de parcelas sincronizada ao entrar na etapa 3
      setStateRaw((prev) => ({
        ...prev,
        parcelas: prev.recorrente
          ? gerarParcelas(prev.data_vencimento, prev.periodo, prev.vezes, parseValor(prev.valor))
          : [],
      }));
    }
    setStep((s) => Math.min(4, s + 1));
  };

  const salvar = async () => {
    if (!rateioValido(state.ratear, state.rateios)) {
      toast.error("O rateio de centro de custo deve somar 100%");
      return;
    }
    await salvarDespesaMut.mutateAsync({ state, anexo, userId: user?.id ?? null });
    onOpenChange(false);
  };

  const onFornecedorCriado = (novo: FornecedorOption) => setState({ fornecedor_id: novo.id });

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="sm:max-w-3xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Lançamento de despesa</DialogTitle>
          </DialogHeader>

          {/* Indicador de progresso */}
          <div className="flex items-center gap-2">
            {WIZARD_STEPS.map((s, i) => {
              const concluido = step > s.numero;
              const atual = step === s.numero;
              return (
                <div key={s.numero} className="flex flex-1 items-center gap-2">
                  <div
                    className={cn(
                      "flex h-8 w-8 shrink-0 items-center justify-center rounded-full border text-sm font-medium",
                      atual && "bg-primary text-primary-foreground border-primary",
                      concluido && "bg-primary/10 text-primary border-primary",
                      !atual && !concluido && "text-muted-foreground border-border",
                    )}
                  >
                    {concluido ? <Check className="h-4 w-4" /> : s.numero}
                  </div>
                  <span
                    className={cn(
                      "text-xs sm:text-sm",
                      atual ? "font-medium text-foreground" : "text-muted-foreground",
                    )}
                  >
                    {s.label}
                  </span>
                  {i < WIZARD_STEPS.length - 1 && <div className="h-px flex-1 bg-border" />}
                </div>
              );
            })}
          </div>

          <div className="pt-2">
            {step === 1 && (
              <StepDados
                state={state}
                setState={setState}
                fornecedores={fornecedores}
                onNovoFornecedor={() => setFornecedorDialog(true)}
              />
            )}
            {step === 2 && (
              <StepClassificacao
                state={state}
                setState={setState}
                planoContas={planoContasLancaveis}
                formasPagamento={formasAtivas}
                contas={contasAtivas}
                centrosCusto={centrosAtivos}
              />
            )}
            {step === 3 && (
              <StepRecorrencia state={state} setState={setState} onRecorrenciaChange={recalcParcelas} />
            )}
            {step === 4 && (
              <StepRevisao
                state={state}
                setState={setState}
                anexo={anexo}
                setAnexo={setAnexo}
                fornecedores={fornecedores}
                planoContas={planoContasLancaveis}
                formasPagamento={formasAtivas}
                contas={contasAtivas}
                centrosCusto={centrosAtivos}
              />
            )}
          </div>

          <div className="flex justify-between pt-4">
            <Button
              variant="outline"
              onClick={() => (step === 1 ? onOpenChange(false) : setStep((s) => s - 1))}
            >
              {step === 1 ? "Cancelar" : "Voltar"}
            </Button>
            {step < 4 ? (
              <Button onClick={avancar}>Avançar</Button>
            ) : (
              <Button onClick={salvar} disabled={salvarDespesaMut.isPending}>
                {salvarDespesaMut.isPending && <Loader2 className="h-4 w-4 animate-spin mr-2" />}
                Salvar lançamento
              </Button>
            )}
          </div>
        </DialogContent>
      </Dialog>

      <FornecedorRapidoDialog
        open={fornecedorDialog}
        onOpenChange={setFornecedorDialog}
        onCreated={onFornecedorCriado}
      />
    </>
  );
}
