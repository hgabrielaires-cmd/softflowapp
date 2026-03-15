import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { AlertCircle, Eye, Loader2 } from "lucide-react";
import type { Contrato } from "../types";

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  contratoBaseCancelado: Contrato | null;
  aditivosVinculados: Contrato[];
  aditivosSelecionados: string[];
  setAditivosSelecionados: React.Dispatch<React.SetStateAction<string[]>>;
  processando: boolean;
  onManterTodos: () => void;
  onCancelarSelecionados: () => void;
  getTipoBadge: (tipo: string) => React.ReactNode;
  onOpenDetail: (contrato: Contrato) => void;
}

export function CancelarAditivosDialog({
  open,
  onOpenChange,
  contratoBaseCancelado,
  aditivosVinculados,
  aditivosSelecionados,
  setAditivosSelecionados,
  processando,
  onManterTodos,
  onCancelarSelecionados,
  getTipoBadge,
  onOpenDetail,
}: Props) {
  return (
    <Dialog open={open} onOpenChange={(v) => { if (!v) onManterTodos(); }}>
      <DialogContent className="max-w-md" onInteractOutside={(e) => e.preventDefault()} onEscapeKeyDown={(e) => e.preventDefault()}>
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-destructive">
            <AlertCircle className="h-5 w-5" />
            Cancelar contratos vinculados?
          </DialogTitle>
          <DialogDescription>
            O contrato base <strong>{contratoBaseCancelado?.numero_exibicao}</strong> será cancelado. Existem{" "}
            <strong>{aditivosVinculados.length}</strong> contrato(s) vinculado(s) ativo(s) que <strong>devem ser cancelados junto</strong>, pois aditivos não podem existir sem o plano base. Selecione quais deseja cancelar:
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-2 max-h-60 overflow-y-auto">
          {aditivosVinculados.map((aditivo) => (
            <label
              key={aditivo.id}
              className="flex items-center gap-3 rounded-md border border-border p-3 cursor-pointer hover:bg-muted/50 transition-colors"
            >
              <Checkbox
                checked={aditivosSelecionados.includes(aditivo.id)}
                onCheckedChange={(checked) => {
                  setAditivosSelecionados(prev =>
                    checked
                      ? [...prev, aditivo.id]
                      : prev.filter(id => id !== aditivo.id)
                  );
                }}
              />
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <span className="font-mono font-semibold text-sm">{aditivo.numero_exibicao}</span>
                  {getTipoBadge(aditivo.tipo)}
                </div>
                {aditivo.pedidos?.tipo_pedido && (
                  <span className="text-xs text-muted-foreground">
                    {aditivo.pedidos.tipo_pedido === "Upgrade" ? "↑ Upgrade de Plano" : aditivo.pedidos.tipo_pedido === "Aditivo" ? "＋ Módulos Adicionais" : aditivo.pedidos.tipo_pedido === "OA" ? "📋 Ordem de Atendimento" : aditivo.pedidos.tipo_pedido}
                  </span>
                )}
              </div>
              <Button
                type="button"
                variant="ghost"
                size="icon"
                className="h-7 w-7 shrink-0"
                title="Visualizar contrato"
                onClick={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  onOpenDetail(aditivo);
                }}
              >
                <Eye className="h-4 w-4" />
              </Button>
            </label>
          ))}
        </div>
        <p className="text-xs text-muted-foreground">
          ⚠️ Aditivos não podem existir sem o contrato base. Todos os selecionados serão cancelados automaticamente.
        </p>
        <div className="flex justify-end gap-2 mt-2">
          <Button variant="outline" onClick={onManterTodos} disabled={processando}>
            Voltar
          </Button>
          <Button
            variant="destructive"
            onClick={onCancelarSelecionados}
            disabled={aditivosSelecionados.length === 0 || processando}
          >
            {processando ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
            Cancelar base + {aditivosSelecionados.length} aditivo(s)
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
