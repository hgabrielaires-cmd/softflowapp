import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { ArrowRight } from "lucide-react";
import { CAMPOS_AUDITORIA_LABEL } from "../constants";
import { acaoAuditoriaLabel, acaoBadgeVariant, formatDataHoraBR, formatValorAuditoria } from "../helpers";
import type { AuditoriaDespesaRegistro, FornecedorOption } from "../types";
import type { CentroCusto, ContaFinanceira, FormaPagamento, PlanoConta } from "@/pages/financeiro-parametros/types";

interface Props {
  registro: AuditoriaDespesaRegistro | null;
  onOpenChange: (open: boolean) => void;
  usuario: string;
  fornecedores: FornecedorOption[];
  planoContas: PlanoConta[];
  formasPagamento: FormaPagamento[];
  contas: ContaFinanceira[];
  centrosCusto: CentroCusto[];
}

export function AuditoriaDetalheDialog({
  registro,
  onOpenChange,
  usuario,
  fornecedores,
  planoContas,
  formasPagamento,
  contas,
  centrosCusto,
}: Props) {
  if (!registro) return null;

  const details = (registro.details || {}) as Record<string, any>;
  const changes = (details.changes || {}) as Record<string, { old: unknown; new: unknown }>;
  const edicao = registro.action === "despesa_updated";
  const exclusao = registro.action === "despesa_deleted";

  const resolver = (campo: string, valor: unknown) =>
    formatValorAuditoria(campo, valor, {
      fornecedores,
      planoContas,
      formasPagamento,
      contas,
      centrosCusto,
    });

  const snapshot = Object.entries(details).filter(([k]) => k !== "changes");

  return (
    <Dialog open onOpenChange={onOpenChange}>
      <DialogContent className="w-[calc(100vw-1.5rem)] max-w-[calc(100vw-1.5rem)] sm:max-w-xl max-h-[90dvh] overflow-y-auto p-4 sm:p-6">
        <DialogHeader className="text-left">
          <DialogTitle className="flex flex-wrap items-center gap-2 text-base sm:text-lg">
            <Badge variant={acaoBadgeVariant(registro.action)}>
              {acaoAuditoriaLabel(registro.action)}
            </Badge>
            <span>{formatDataHoraBR(registro.created_at)}</span>
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4 text-sm">
          <div className="rounded-lg border border-border p-3 space-y-1">
            <div className="flex justify-between gap-4">
              <span className="text-muted-foreground">Usuário</span>
              <span className="font-medium text-right">{usuario}</span>
            </div>
            <div className="flex justify-between gap-4">
              <span className="text-muted-foreground">ID do lançamento</span>
              <span className="font-mono text-xs break-all text-right">{registro.entity_id}</span>
            </div>
          </div>

          {edicao ? (
            <div className="rounded-lg border border-border p-3 space-y-2">
              <p className="font-medium">Alterações</p>
              {Object.entries(changes).map(([campo, diff]) => (
                <div key={campo} className="space-y-0.5">
                  <p className="text-xs text-muted-foreground">
                    {CAMPOS_AUDITORIA_LABEL[campo] || campo}
                  </p>
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="rounded bg-muted px-2 py-0.5 line-through text-muted-foreground break-all">
                      {resolver(campo, diff.old)}
                    </span>
                    <ArrowRight className="h-3.5 w-3.5 text-muted-foreground" />
                    <span className="rounded bg-primary/10 px-2 py-0.5 font-medium break-all">
                      {resolver(campo, diff.new)}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="rounded-lg border border-border p-3 space-y-1">
              <p className="font-medium">
                {exclusao ? "Lançamento antes da exclusão" : "Dados do lançamento"}
              </p>
              {snapshot.map(([campo, valor]) => (
                <div key={campo} className="flex justify-between gap-4">
                  <span className="text-muted-foreground">
                    {CAMPOS_AUDITORIA_LABEL[campo] || campo}
                  </span>
                  <span className="font-medium text-right break-all">{resolver(campo, valor)}</span>
                </div>
              ))}
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
