import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import type { MesaAtendimento } from "@/lib/supabase-types";
import type { LocalEtapa, EtapaFormState } from "../types";

interface EtapaDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  editingEtapa: LocalEtapa | null;
  etapaForm: EtapaFormState;
  setEtapaForm: React.Dispatch<React.SetStateAction<EtapaFormState>>;
  onSave: () => void;
  painelEtapas: { id: string; nome: string }[];
  mesas: MesaAtendimento[];
}

export function EtapaDialog({
  open, onOpenChange, editingEtapa, etapaForm, setEtapaForm, onSave, painelEtapas, mesas,
}: EtapaDialogProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>{editingEtapa ? "Editar Etapa" : "Adicionar Etapa"}</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <div>
            <label className="text-sm font-medium">Nome da Etapa *</label>
            <Select value={etapaForm.nome || "placeholder"} onValueChange={(v) => setEtapaForm((p) => ({ ...p, nome: v === "placeholder" ? "" : v }))}>
              <SelectTrigger><SelectValue placeholder="Selecione a etapa..." /></SelectTrigger>
              <SelectContent>
                <SelectItem value="placeholder" disabled>Selecione a etapa...</SelectItem>
                {painelEtapas.map((e) => <SelectItem key={e.id} value={e.nome}>{e.nome}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div>
            <label className="text-sm font-medium">Descrição</label>
            <Textarea value={etapaForm.descricao} onChange={(e) => setEtapaForm((p) => ({ ...p, descricao: e.target.value }))} placeholder="Ex: Nessa etapa certifique-se que está tudo dentro do padrão." />
          </div>
          <div>
            <label className="text-sm font-medium">Mesa de Atendimento</label>
            <Select value={etapaForm.mesa_atendimento_id || "none"} onValueChange={(v) => setEtapaForm((p) => ({ ...p, mesa_atendimento_id: v === "none" ? "" : v }))}>
              <SelectTrigger><SelectValue placeholder="Selecione..." /></SelectTrigger>
              <SelectContent>
                <SelectItem value="none">Nenhuma</SelectItem>
                {mesas.map((m) => <SelectItem key={m.id} value={m.id}>{m.nome}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div className="flex items-center justify-between">
            <label className="text-sm font-medium">Permite Clonar</label>
            <Switch checked={etapaForm.permite_clonar} onCheckedChange={(v) => setEtapaForm((p) => ({ ...p, permite_clonar: v }))} />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancelar</Button>
          <Button onClick={onSave} disabled={!etapaForm.nome.trim()}>Salvar</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
