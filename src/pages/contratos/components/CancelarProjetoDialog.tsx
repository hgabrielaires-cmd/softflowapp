import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { AlertCircle, Loader2, MapPin, Tag, Trash2 } from "lucide-react";

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  projetosAtivos: any[];
  processando: boolean;
  onExcluirProjetos: () => void;
  onManterComTag: () => void;
  onIgnorar: () => void;
}

export function CancelarProjetoDialog({
  open,
  onOpenChange,
  projetosAtivos,
  processando,
  onExcluirProjetos,
  onManterComTag,
  onIgnorar,
}: Props) {
  return (
    <Dialog open={open} onOpenChange={(v) => { if (!v) onIgnorar(); }}>
      <DialogContent className="max-w-md" onInteractOutside={(e) => e.preventDefault()}>
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-destructive">
            <AlertCircle className="h-5 w-5" />
            Projeto encontrado no Painel
          </DialogTitle>
          <DialogDescription>
            Este contrato possui projeto(s) ativo(s) no painel de atendimento. O que deseja fazer?
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-3">
          {projetosAtivos.map((p) => (
            <div key={p.id} className="rounded-md border border-border p-3 text-sm space-y-1">
              <div className="flex items-center justify-between">
                <span className="font-medium">{(p.clientes as any)?.nome_fantasia}</span>
                <Badge variant="outline" className="text-xs">{p.tipo_operacao}</Badge>
              </div>
              <div className="flex items-center gap-1.5 text-muted-foreground">
                <MapPin className="h-3.5 w-3.5" />
                <span>Etapa atual: <strong className="text-foreground">{(p.painel_etapas as any)?.nome || "Desconhecida"}</strong></span>
              </div>
            </div>
          ))}
        </div>
        <div className="flex flex-col gap-2 mt-2">
          <Button
            variant="destructive"
            onClick={onExcluirProjetos}
            disabled={processando}
            className="w-full"
          >
            {processando ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Trash2 className="h-4 w-4 mr-2" />}
            Sim, excluir do painel
          </Button>
          <Button
            variant="outline"
            onClick={onManterComTag}
            disabled={processando}
            className="w-full border-destructive/30 text-destructive hover:bg-destructive/10"
          >
            {processando ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Tag className="h-4 w-4 mr-2" />}
            Não, manter com tag "Cancelado"
          </Button>
          <Button variant="ghost" onClick={onIgnorar} className="w-full text-muted-foreground">
            Ignorar
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
