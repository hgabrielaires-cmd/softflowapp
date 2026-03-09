import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Play } from "lucide-react";
import type { PainelCard } from "../types";

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  comentario: string;
  setComentario: (v: string) => void;
  onConfirm: () => void;
  loading: boolean;
  detailCard: PainelCard | null;
  responsaveis: any[];
}

export function RetomarDialog({ open, onOpenChange, comentario, setComentario, onConfirm, loading, detailCard, responsaveis }: Props) {
  const handleClose = () => { onOpenChange(false); setComentario(""); };

  return (
    <Dialog open={open} onOpenChange={(v) => { if (!v) handleClose(); }}>
      <DialogContent className="max-w-md" onInteractOutside={(e) => e.preventDefault()}>
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Play className="h-5 w-5 text-primary" />
            Retomar Projeto
          </DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          {detailCard?.pausado_motivo && (
            <div className="rounded-md border p-3 bg-muted/30 space-y-1">
              <p className="text-xs font-medium text-muted-foreground">
                {detailCard.status_projeto === "recusado" ? "❌ Motivo da Recusa:" : "⏸️ Motivo da Pausa:"}
              </p>
              <p className="text-sm">{detailCard.pausado_motivo}</p>
              {detailCard.pausado_em && (
                <p className="text-[10px] text-muted-foreground">
                  {new Date(detailCard.pausado_em).toLocaleDateString("pt-BR")} às{" "}
                  {new Date(detailCard.pausado_em).toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" })}
                  {detailCard.pausado_por && (() => {
                    const autor = responsaveis.find((r: any) => r.id === detailCard.pausado_por);
                    return autor ? ` por ${(autor as any).full_name?.split(" ")[0]}` : "";
                  })()}
                </p>
              )}
            </div>
          )}
          <div className="space-y-2">
            <Label>Resposta / Comentário de retorno <span className="text-destructive">*</span></Label>
            <Textarea placeholder="Descreva a resolução ou resposta ao motivo da pausa/recusa..." value={comentario} onChange={(e) => setComentario(e.target.value)} rows={4} />
          </div>
          <p className="text-xs text-muted-foreground">
            O card voltará para a etapa de origem com prazo reiniciado (como novo card).
          </p>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={handleClose}>Cancelar</Button>
          <Button onClick={onConfirm} disabled={!comentario.trim() || loading}>
            {loading ? "Retomando..." : "Confirmar Retomada"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
