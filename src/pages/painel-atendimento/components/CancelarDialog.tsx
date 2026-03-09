import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Ban } from "lucide-react";

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  motivo: string;
  setMotivo: (v: string) => void;
  onConfirm: () => void;
  loading: boolean;
}

export function CancelarDialog({ open, onOpenChange, motivo, setMotivo, onConfirm, loading }: Props) {
  const handleClose = () => { onOpenChange(false); setMotivo(""); };

  return (
    <Dialog open={open} onOpenChange={(v) => { if (!v) handleClose(); }}>
      <DialogContent className="max-w-md" onInteractOutside={(e) => e.preventDefault()}>
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-red-600">
            <Ban className="h-5 w-5" />
            Cancelar Projeto
          </DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <div className="rounded-lg border border-destructive/30 bg-destructive/5 p-3">
            <p className="text-sm text-destructive font-medium">⚠️ Atenção: esta ação é irreversível!</p>
            <p className="text-xs text-muted-foreground mt-1">
              O projeto será marcado como cancelado e o motivo será registrado no relatório de projetos cancelados.
            </p>
          </div>
          <div className="space-y-2">
            <Label>Motivo do cancelamento *</Label>
            <Textarea placeholder="Descreva o motivo para cancelar o projeto..." value={motivo} onChange={(e) => setMotivo(e.target.value)} rows={3} />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={handleClose}>Voltar</Button>
          <Button variant="destructive" onClick={onConfirm} disabled={!motivo.trim() || loading}>
            {loading ? "Cancelando..." : "Confirmar Cancelamento"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
