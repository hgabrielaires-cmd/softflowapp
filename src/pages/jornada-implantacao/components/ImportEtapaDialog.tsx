import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Download } from "lucide-react";

interface ImportEtapaDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  clonableEtapas: any[];
  onImport: (etapaData: any) => void;
}

export function ImportEtapaDialog({ open, onOpenChange, clonableEtapas, onImport }: ImportEtapaDialogProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Importar Etapa</DialogTitle>
        </DialogHeader>
        {clonableEtapas.length === 0 ? (
          <p className="text-sm text-muted-foreground text-center py-8">Nenhuma etapa com permissão de clonagem encontrada.</p>
        ) : (
          <div className="space-y-2">
            <p className="text-sm text-muted-foreground">Selecione a etapa que deseja importar:</p>
            {clonableEtapas.map((etapa) => (
              <div key={etapa.id} className="border rounded-lg p-3 hover:bg-muted/50 cursor-pointer" onClick={() => onImport(etapa)}>
                <div className="flex items-center justify-between">
                  <div>
                    <p className="font-medium text-sm">{etapa.nome}</p>
                    {etapa.descricao && <p className="text-xs text-muted-foreground mt-0.5">{etapa.descricao}</p>}
                    <div className="flex gap-2 mt-1">
                      <Badge variant="outline" className="text-xs">{etapa.jornada_atividades?.length || 0} atividades</Badge>
                      {etapa.jornadas && <Badge variant="secondary" className="text-xs">Jornada: {etapa.jornadas.nome}</Badge>}
                    </div>
                  </div>
                  <Download className="h-4 w-4 text-muted-foreground" />
                </div>
              </div>
            ))}
          </div>
        )}
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Fechar</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
