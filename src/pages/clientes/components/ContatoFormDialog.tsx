import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Loader2 } from "lucide-react";
import type { ClienteContato, ContatoFormState } from "@/pages/clientes/types";
import { applyPhoneMask } from "@/lib/utils";

interface ContatoFormDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  editing: ClienteContato | null;
  form: ContatoFormState;
  onFormChange: React.Dispatch<React.SetStateAction<ContatoFormState>>;
  onSave: () => void;
  saving: boolean;
}

export function ContatoFormDialog({
  open,
  onOpenChange,
  editing,
  form,
  onFormChange,
  onSave,
  saving,
}: ContatoFormDialogProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>{editing ? "Editar contato" : "Novo contato"}</DialogTitle>
        </DialogHeader>
        <div className="grid grid-cols-2 gap-3 py-2">
          <div className="col-span-2 space-y-1.5">
            <Label>Nome *</Label>
            <Input value={form.nome} onChange={(e) => onFormChange((f) => ({ ...f, nome: e.target.value }))} placeholder="Nome completo" />
          </div>
          <div className="col-span-2 space-y-1.5">
            <Label>Cargo</Label>
            <Input value={form.cargo} onChange={(e) => onFormChange((f) => ({ ...f, cargo: e.target.value }))} placeholder="Ex: Proprietário, Gerente..." />
          </div>
          <div className="space-y-1.5">
            <Label>Telefone</Label>
            <Input value={applyPhoneMask(form.telefone)} onChange={(e) => onFormChange((f) => ({ ...f, telefone: e.target.value.replace(/\D/g, "") }))} placeholder="(00) 00000-0000" />
          </div>
          <div className="space-y-1.5">
            <Label>E-mail</Label>
            <Input type="email" value={form.email} onChange={(e) => onFormChange((f) => ({ ...f, email: e.target.value }))} placeholder="email@empresa.com" />
          </div>
          <div className="col-span-2 flex items-center gap-3 pt-1">
            <Checkbox
              id="decisor"
              checked={form.decisor}
              onCheckedChange={(v) => onFormChange((f) => ({ ...f, decisor: !!v }))}
            />
            <div>
              <Label htmlFor="decisor" className="cursor-pointer">Decisor</Label>
              <p className="text-xs text-muted-foreground">Este contato é o tomador de decisão</p>
            </div>
          </div>
          <div className="col-span-2 flex items-center gap-3">
            <Switch checked={form.ativo} onCheckedChange={(v) => onFormChange((f) => ({ ...f, ativo: v }))} />
            <Label>Contato ativo</Label>
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancelar</Button>
          <Button onClick={onSave} disabled={saving}>
            {saving ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
            {editing ? "Salvar" : "Adicionar contato"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
