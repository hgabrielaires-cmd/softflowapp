import { useState, useEffect } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { ChatConversa } from "../types";

interface Props {
  open: boolean;
  onClose: () => void;
  conversa: ChatConversa | null;
  isPending?: boolean;
  onConfirm: (motivo: string) => void;
}

export default function ExcluirAtendimentoDialog({ open, onClose, conversa, isPending, onConfirm }: Props) {
  const [motivo, setMotivo] = useState("");

  useEffect(() => {
    if (open) setMotivo("");
  }, [open]);

  const valido = motivo.trim().length >= 5;

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="sm:max-w-[460px]">
        <DialogHeader>
          <DialogTitle>Excluir atendimento</DialogTitle>
          <DialogDescription>
            O atendimento de{" "}
            <strong>{conversa?.nome_cliente || conversa?.numero_cliente || "cliente"}</strong>{" "}
            sairá da fila do chat. Informe o motivo — ele ficará registrado para relatório.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-2">
          <Label htmlFor="motivo-exclusao">Motivo da exclusão *</Label>
          <Textarea
            id="motivo-exclusao"
            value={motivo}
            onChange={(e) => setMotivo(e.target.value)}
            placeholder="Ex.: contato duplicado, trote, mensagem enviada por engano..."
            rows={4}
          />
          {!valido && motivo.length > 0 && (
            <p className="text-xs text-muted-foreground">Descreva o motivo com pelo menos 5 caracteres.</p>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose} disabled={isPending}>
            Cancelar
          </Button>
          <Button
            variant="destructive"
            disabled={!valido || isPending}
            onClick={() => onConfirm(motivo.trim())}
          >
            {isPending ? "Excluindo..." : "Excluir atendimento"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
