import React from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle,
} from "@/components/ui/dialog";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { CheckCircle } from "lucide-react";

import type { PagamentoFormState } from "../types";
import { FORMAS_PAGAMENTO } from "../constants";

interface RegistrarPagamentoDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  pagamentoForm: PagamentoFormState;
  setPagamentoForm: React.Dispatch<React.SetStateAction<PagamentoFormState>>;
  onConfirm: () => void;
}

export function RegistrarPagamentoDialog({
  open, onOpenChange, pagamentoForm, setPagamentoForm, onConfirm,
}: RegistrarPagamentoDialogProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-sm">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <CheckCircle className="h-4 w-4 text-emerald-600" /> Registrar Pagamento
          </DialogTitle>
        </DialogHeader>
        <div className="flex flex-col gap-3">
          <div className="space-y-1">
            <Label className="text-xs">Data do Pagamento *</Label>
            <Input type="date" value={pagamentoForm.data_pagamento} onChange={(e) => setPagamentoForm(f => ({ ...f, data_pagamento: e.target.value }))} className="h-9" />
          </div>
          <div className="space-y-1">
            <Label className="text-xs">Forma de Pagamento</Label>
            <Select value={pagamentoForm.forma_pagamento || "_none"} onValueChange={(v) => setPagamentoForm(f => ({ ...f, forma_pagamento: v === "_none" ? "" : v }))}>
              <SelectTrigger className="h-9"><SelectValue placeholder="Selecione" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="_none">Nenhuma</SelectItem>
                {FORMAS_PAGAMENTO.map(fp => (
                  <SelectItem key={fp.value} value={fp.value}>{fp.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={() => onOpenChange(false)}>Cancelar</Button>
            <Button onClick={onConfirm}>Confirmar</Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
