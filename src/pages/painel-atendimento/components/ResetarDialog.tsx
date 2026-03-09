import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { RefreshCw } from "lucide-react";

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  motivo: string;
  setMotivo: (v: string) => void;
  onConfirm: () => void;
  loading: boolean;
}

export function ResetarDialog({ open, onOpenChange, motivo, setMotivo, onConfirm, loading }: Props) {
  const handleClose = () => { onOpenChange(false); setMotivo(""); };

  return (
    <Dialog open={open} onOpenChange={(v) => { if (!v) handleClose(); }}>
      <DialogContent className="max-w-md" onInteractOutside={(e) => e.preventDefault()}>
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-orange-600">
            <RefreshCw className="h-5 w-5" />
            Resetar Projeto
          </DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <div className="rounded-lg border border-destructive/30 bg-destructive/5 p-3">
            <p className="text-sm text-destructive font-medium">⚠️ Atenção: esta ação é irreversível!</p>
            <p className="text-xs text-muted-foreground mt-1">
              Todo o histórico de etapas, progresso de checklist e agendamentos serão apagados. O projeto voltará para a etapa inicial da filial.
            </p>
          </div>
          <div className="space-y-2">
            <Label>Motivo do reset *</Label>
            <Textarea placeholder="Descreva o motivo para resetar o projeto..." value={motivo} onChange={(e) => setMotivo(e.target.value)} rows={3} />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={handleClose}>Cancelar</Button>
          <Button variant="destructive" onClick={onConfirm} disabled={!motivo.trim() || loading}>
            {loading ? "Resetando..." : "Confirmar Reset"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
