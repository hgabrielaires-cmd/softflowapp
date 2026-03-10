import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Loader2 } from "lucide-react";

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  contratoNumero?: string;
  clienteNome?: string;
  motivoCancelamento: string;
  setMotivoCancelamento: (v: string) => void;
  onConfirm: () => void;
  processando: boolean;
}

export function EncerrarContratoDialog({
  open,
  onOpenChange,
  contratoNumero,
  clienteNome,
  motivoCancelamento,
  setMotivoCancelamento,
  onConfirm,
  processando,
}: Props) {
  return (
    <AlertDialog open={open} onOpenChange={(v) => { onOpenChange(v); if (!v) setMotivoCancelamento(""); }}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Cancelar contrato?</AlertDialogTitle>
          <AlertDialogDescription>
            Esta ação cancelará o contrato{" "}
            <strong>{contratoNumero}</strong> do cliente{" "}
            <strong>{clienteNome}</strong>. Esta ação não pode
            ser desfeita.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <div className="space-y-2">
          <label className="text-sm font-medium">Motivo do cancelamento</label>
          <textarea
            className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring min-h-[80px]"
            placeholder="Informe o motivo do cancelamento..."
            value={motivoCancelamento}
            onChange={(e) => setMotivoCancelamento(e.target.value)}
          />
        </div>
        <AlertDialogFooter>
          <AlertDialogCancel>Voltar</AlertDialogCancel>
          <AlertDialogAction
            className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            onClick={onConfirm}
            disabled={processando || !motivoCancelamento.trim()}
          >
            {processando ? (
              <Loader2 className="h-4 w-4 animate-spin mr-2" />
            ) : null}
            Confirmar Cancelamento
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
