import { useState, useEffect } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { applyPhoneMask } from "@/lib/utils";

interface ContatoLocal {
  id?: string;
  nome: string;
  telefone: string;
  cargo_id: string;
  email: string;
}

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  contato: ContatoLocal | null; // null = novo
  cargos: { id: string; nome: string }[];
  onSave: (contato: ContatoLocal) => void;
}

const emptyContato = (): ContatoLocal => ({ nome: "", telefone: "", cargo_id: "", email: "" });

export function ContatoOportunidadeDialog({ open, onOpenChange, contato, cargos, onSave }: Props) {
  const [form, setForm] = useState<ContatoLocal>(emptyContato());

  useEffect(() => {
    if (open) {
      setForm(contato ? { ...contato } : emptyContato());
    }
  }, [open, contato]);

  const isValid = form.nome.trim() !== "" && form.telefone.trim() !== "";
  const isEditing = !!contato;

  const handleSave = () => {
    if (!isValid) return;
    onSave(form);
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>{isEditing ? "Editar Contato" : "Novo Contato"}</DialogTitle>
        </DialogHeader>

        <div className="space-y-3 py-2">
          <div>
            <Label className="text-xs">Nome *</Label>
            <Input
              value={form.nome}
              onChange={(e) => setForm(prev => ({ ...prev, nome: e.target.value }))}
              placeholder="Nome do contato"
              className="h-9"
              autoFocus
            />
          </div>
          <div>
            <Label className="text-xs">Telefone *</Label>
            <Input
              value={applyPhoneMask(form.telefone)}
              onChange={(e) => setForm(prev => ({ ...prev, telefone: e.target.value.replace(/\D/g, "") }))}
              placeholder="(00) 00000-0000"
              className="h-9"
            />
          </div>
          <div>
            <Label className="text-xs">Cargo</Label>
            <Select value={form.cargo_id || "__none__"} onValueChange={(v) => setForm(prev => ({ ...prev, cargo_id: v === "__none__" ? "" : v }))}>
              <SelectTrigger className="h-9"><SelectValue placeholder="Selecione..." /></SelectTrigger>
              <SelectContent>
                <SelectItem value="__none__">Nenhum</SelectItem>
                {cargos.map(c => (<SelectItem key={c.id} value={c.id}>{c.nome}</SelectItem>))}
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label className="text-xs">Email</Label>
            <Input
              value={form.email}
              onChange={(e) => setForm(prev => ({ ...prev, email: e.target.value }))}
              placeholder="email@exemplo.com"
              className="h-9"
              type="email"
            />
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancelar</Button>
          <Button onClick={handleSave} disabled={!isValid}>
            {isEditing ? "Salvar" : "Adicionar"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
