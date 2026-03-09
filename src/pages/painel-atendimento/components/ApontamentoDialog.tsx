import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import { Users, XCircle } from "lucide-react";
import { cn } from "@/lib/utils";

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  apontamentoUsuarios: string[];
  setApontamentoUsuarios: React.Dispatch<React.SetStateAction<string[]>>;
  busca: string;
  setBusca: (v: string) => void;
  onConfirm: () => void;
  loading: boolean;
  responsaveis: any[];
  cardId: string | null;
  cardApontamentosDetalhado: Record<string, { id: string; usuario_id: string; nome: string; avatar_url: string | null }[]>;
  podeGerenciar: boolean;
  onRemover: (apontamentoId: string, cardId: string) => void;
}

export function ApontamentoDialog({
  open, onOpenChange, apontamentoUsuarios, setApontamentoUsuarios,
  busca, setBusca, onConfirm, loading, responsaveis, cardId,
  cardApontamentosDetalhado, podeGerenciar, onRemover,
}: Props) {
  const handleClose = () => {
    onOpenChange(false);
    setApontamentoUsuarios([]);
    setBusca("");
  };

  return (
    <Dialog open={open} onOpenChange={(v) => { if (!v) handleClose(); }}>
      <DialogContent className="max-w-md" onInteractOutside={(e) => e.preventDefault()}>
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Users className="h-5 w-5 text-primary" />
            Apontamento de Resolução
          </DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <div className="space-y-2">
            <Label>Buscar usuário</Label>
            <Input placeholder="Pesquisar por nome..." value={busca} onChange={(e) => setBusca(e.target.value)} />
          </div>
          {cardId && (cardApontamentosDetalhado[cardId] || []).length > 0 && (
            <div className="space-y-1">
              <Label className="text-xs text-muted-foreground">Já apontados</Label>
              <div className="space-y-1 border rounded-md p-2 bg-muted/20">
                {(cardApontamentosDetalhado[cardId] || []).map((ap) => (
                  <div key={ap.id} className="flex items-center justify-between p-2 rounded-md text-sm">
                    <span className="text-foreground">{ap.nome}</span>
                    {podeGerenciar && (
                      <Button variant="ghost" size="sm" className="h-6 px-2 text-destructive hover:text-destructive" onClick={() => onRemover(ap.id, cardId!)}>
                        <XCircle className="h-3.5 w-3.5 mr-1" />
                        Remover
                      </Button>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}
          <div className="max-h-48 overflow-y-auto space-y-1 border rounded-md p-2">
            {responsaveis
              .filter((r: any) => {
                const jaApontado = cardId ? (cardApontamentosDetalhado[cardId] || []).some(a => a.usuario_id === r.id) : false;
                return !jaApontado && r.full_name?.toLowerCase().includes(busca.toLowerCase());
              })
              .map((r: any) => (
                <label key={r.id} className={cn("flex items-center gap-2 p-2 rounded-md cursor-pointer hover:bg-muted/50 transition-colors text-sm", apontamentoUsuarios.includes(r.id) && "bg-primary/10")}>
                  <Checkbox checked={apontamentoUsuarios.includes(r.id)} onCheckedChange={(checked) => {
                    if (checked) setApontamentoUsuarios(prev => [...prev, r.id]);
                    else setApontamentoUsuarios(prev => prev.filter(id => id !== r.id));
                  }} />
                  <span>{r.full_name}</span>
                </label>
              ))}
          </div>
          {apontamentoUsuarios.length > 0 && (
            <p className="text-xs text-muted-foreground">{apontamentoUsuarios.length} usuário(s) selecionado(s). Cada um receberá uma notificação no sistema.</p>
          )}
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={handleClose}>Cancelar</Button>
          <Button onClick={onConfirm} disabled={apontamentoUsuarios.length === 0 || loading}>
            {loading ? "Salvando..." : "Confirmar Apontamento"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
