import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import { XCircle, UserPlus } from "lucide-react";
import { cn } from "@/lib/utils";

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  motivo: string;
  setMotivo: (v: string) => void;
  onConfirm: () => void;
  loading: boolean;
  apontamentoUsuarios: string[];
  setApontamentoUsuarios: React.Dispatch<React.SetStateAction<string[]>>;
  buscaApontamento: string;
  setBuscaApontamento: (v: string) => void;
  responsaveis: any[];
}

export function RecusarDialog({
  open, onOpenChange, motivo, setMotivo, onConfirm, loading,
  apontamentoUsuarios, setApontamentoUsuarios, buscaApontamento, setBuscaApontamento, responsaveis,
}: Props) {
  const handleClose = () => {
    onOpenChange(false);
    setMotivo("");
    setApontamentoUsuarios([]);
    setBuscaApontamento("");
  };

  return (
    <Dialog open={open} onOpenChange={(v) => { if (!v) handleClose(); }}>
      <DialogContent className="max-w-md" onInteractOutside={(e) => e.preventDefault()}>
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-destructive">
            <XCircle className="h-5 w-5" />
            Recusar Projeto
          </DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <div className="space-y-2">
            <Label>Motivo da recusa *</Label>
            <Textarea placeholder="Descreva o motivo para recusar o projeto..." value={motivo} onChange={(e) => setMotivo(e.target.value)} rows={3} />
          </div>
          <div className="space-y-2">
            <Label className="flex items-center gap-1">
              <UserPlus className="h-3.5 w-3.5" />
              Apontar responsável pela resolução
            </Label>
            <Input placeholder="Pesquisar por nome..." value={buscaApontamento} onChange={(e) => setBuscaApontamento(e.target.value)} />
            <div className="max-h-36 overflow-y-auto space-y-1 border rounded-md p-2">
              {responsaveis
                .filter((r: any) => r.full_name?.toLowerCase().includes(buscaApontamento.toLowerCase()))
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
              <p className="text-xs text-muted-foreground">{apontamentoUsuarios.length} usuário(s) selecionado(s) — receberão notificação.</p>
            )}
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={handleClose}>Cancelar</Button>
          <Button variant="destructive" onClick={onConfirm} disabled={!motivo.trim() || loading}>
            {loading ? "Recusando..." : "Confirmar Recusa"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
