import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { CalendarDays, Loader2, Trash2 } from "lucide-react";

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  agendamentos: any[];
  removendo: boolean;
  onRemover: () => void;
  onManter: () => void;
}

export function AgendamentosCancelDialog({
  open,
  onOpenChange,
  agendamentos,
  removendo,
  onRemover,
  onManter,
}: Props) {
  return (
    <Dialog open={open} onOpenChange={(v) => { if (!v) onManter(); }}>
      <DialogContent className="max-w-md" onInteractOutside={(e) => e.preventDefault()}>
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-amber-600">
            <CalendarDays className="h-5 w-5" />
            Compromissos Agendados
          </DialogTitle>
          <DialogDescription>
            Existem {agendamentos.length} compromisso(s) agendado(s) para o(s) projeto(s) cancelado(s). Deseja removê-los da agenda?
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-2 max-h-60 overflow-y-auto">
          {agendamentos.map((ag: any) => (
            <div key={ag.id} className="rounded-md border border-border p-2.5 text-sm flex items-center justify-between">
              <div className="flex items-center gap-2">
                <CalendarDays className="h-3.5 w-3.5 text-muted-foreground" />
                <span className="font-medium">{new Date(ag.data + "T12:00:00").toLocaleDateString("pt-BR")}</span>
              </div>
              <span className="text-xs text-muted-foreground truncate max-w-[200px]">
                {(ag.painel_atendimento as any)?.clientes?.nome_fantasia || ""} — {(ag.painel_atendimento as any)?.contratos?.numero_exibicao || ""}
              </span>
            </div>
          ))}
        </div>
        <div className="flex flex-col gap-2 mt-2">
          <Button
            variant="destructive"
            onClick={onRemover}
            disabled={removendo}
            className="w-full"
          >
            {removendo ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Trash2 className="h-4 w-4 mr-2" />}
            Remover todos os compromissos
          </Button>
          <Button
            variant="outline"
            onClick={onManter}
            className="w-full"
          >
            Manter compromissos
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
