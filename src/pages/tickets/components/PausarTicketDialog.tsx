import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { PauseCircle } from "lucide-react";

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onConfirm: (motivo: string, tipo: "aguardando_cliente" | "outro") => void;
  loading: boolean;
}

export function PausarTicketDialog({ open, onOpenChange, onConfirm, loading }: Props) {
  const [tipo, setTipo] = useState<"aguardando_cliente" | "outro">("aguardando_cliente");
  const [motivo, setMotivo] = useState("");

  const handleClose = () => {
    onOpenChange(false);
    setMotivo("");
    setTipo("aguardando_cliente");
  };

  return (
    <Dialog open={open} onOpenChange={(v) => { if (!v) handleClose(); }}>
      <DialogContent className="max-w-md" onInteractOutside={(e) => e.preventDefault()}>
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-amber-600">
            <PauseCircle className="h-5 w-5" />
            Pausar Ticket
          </DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <div className="space-y-2">
            <Label>Tipo de pausa</Label>
            <RadioGroup value={tipo} onValueChange={(v) => setTipo(v as any)} className="space-y-2">
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="aguardando_cliente" id="aguardando" />
                <Label htmlFor="aguardando" className="text-sm font-normal cursor-pointer">
                  Aguardando Cliente <span className="text-xs text-muted-foreground">(move para "Aguardando Cliente")</span>
                </Label>
              </div>
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="outro" id="outro" />
                <Label htmlFor="outro" className="text-sm font-normal cursor-pointer">
                  Outro motivo <span className="text-xs text-muted-foreground">(mantém "Em Andamento" com status pausado)</span>
                </Label>
              </div>
            </RadioGroup>
          </div>
          <div className="space-y-2">
            <Label>Motivo da pausa *</Label>
            <Textarea
              placeholder="Descreva o motivo..."
              value={motivo}
              onChange={(e) => setMotivo(e.target.value)}
              rows={3}
            />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={handleClose}>Cancelar</Button>
          <Button
            className="bg-amber-600 hover:bg-amber-700 text-white"
            onClick={() => { onConfirm(motivo, tipo); handleClose(); }}
            disabled={!motivo.trim() || loading}
          >
            {loading ? "Pausando..." : "Confirmar Pausa"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
