import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";
import { emptyFornecedorRapido } from "../constants";
import { useDespesaForm } from "../useDespesaForm";
import type { FornecedorOption } from "../types";

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onCreated: (fornecedor: FornecedorOption) => void;
}

export function FornecedorRapidoDialog({ open, onOpenChange, onCreated }: Props) {
  const [form, setForm] = useState(emptyFornecedorRapido);
  const { criarFornecedorMut } = useDespesaForm();

  const handleSave = async () => {
    if (!form.nome_fantasia.trim()) return toast.error("Informe o nome/razão social");
    if (!form.cnpj_cpf.trim()) return toast.error("Informe o CPF/CNPJ");
    const novo = await criarFornecedorMut.mutateAsync(form);
    onCreated(novo as FornecedorOption);
    setForm(emptyFornecedorRapido);
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Novo fornecedor</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <div className="space-y-1.5">
            <Label>Nome / Razão social *</Label>
            <Input
              value={form.nome_fantasia}
              onChange={(e) => setForm({ ...form, nome_fantasia: e.target.value })}
              placeholder="Nome do fornecedor"
            />
          </div>
          <div className="space-y-1.5">
            <Label>CPF / CNPJ *</Label>
            <Input
              value={form.cnpj_cpf}
              onChange={(e) => setForm({ ...form, cnpj_cpf: e.target.value })}
              placeholder="00.000.000/0000-00"
            />
          </div>
          <div className="space-y-1.5">
            <Label>Telefone</Label>
            <Input
              value={form.telefone}
              onChange={(e) => setForm({ ...form, telefone: e.target.value })}
              placeholder="(00) 00000-0000"
            />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancelar
          </Button>
          <Button onClick={handleSave} disabled={criarFornecedorMut.isPending}>
            {criarFornecedorMut.isPending && <Loader2 className="h-4 w-4 animate-spin mr-2" />}
            Salvar fornecedor
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
