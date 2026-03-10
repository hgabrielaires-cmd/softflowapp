import React from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from "@/components/ui/dialog";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { FileText, Loader2 } from "lucide-react";

import type { NotaFiscal, NotaFiscalFormState, ClienteOption } from "../types";

interface NotaFiscalEditorDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  editingNota: NotaFiscal | null;
  form: NotaFiscalFormState;
  setForm: React.Dispatch<React.SetStateAction<NotaFiscalFormState>>;
  saving: boolean;
  onSave: (e: React.FormEvent) => void;
  clientes: ClienteOption[];
  faturasOptions: { id: string; numero_fatura: string }[];
  loadFaturasOptions: (clienteId: string) => void;
}

export function NotaFiscalEditorDialog({
  open, onOpenChange, editingNota, form, setForm,
  saving, onSave, clientes, faturasOptions, loadFaturasOptions,
}: NotaFiscalEditorDialogProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <FileText className="h-4 w-4 text-primary" />
            {editingNota ? "Editar Nota Fiscal" : "Nova Nota Fiscal"}
          </DialogTitle>
        </DialogHeader>
        <form onSubmit={onSave} className="flex flex-col gap-3">
          <div className="space-y-1">
            <Label className="text-xs">Cliente *</Label>
            <Select value={form.cliente_id} onValueChange={(v) => { setForm(f => ({ ...f, cliente_id: v, fatura_id: "" })); loadFaturasOptions(v); }}>
              <SelectTrigger className="h-9"><SelectValue placeholder="Selecione" /></SelectTrigger>
              <SelectContent>
                {clientes.map(c => (
                  <SelectItem key={c.id} value={c.id}>{c.nome_fantasia}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {faturasOptions.length > 0 && (
            <div className="space-y-1">
              <Label className="text-xs">Fatura vinculada (opcional)</Label>
              <Select value={form.fatura_id || "_none"} onValueChange={(v) => setForm(f => ({ ...f, fatura_id: v === "_none" ? "" : v }))}>
                <SelectTrigger className="h-9"><SelectValue placeholder="Nenhuma" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="_none">Nenhuma</SelectItem>
                  {faturasOptions.map(f => (
                    <SelectItem key={f.id} value={f.id}>{f.numero_fatura}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1">
              <Label className="text-xs">Nº da NF *</Label>
              <Input placeholder="00001" value={form.numero_nf} onChange={(e) => setForm(f => ({ ...f, numero_nf: e.target.value }))} className="h-9" />
            </div>
            <div className="space-y-1">
              <Label className="text-xs">Série</Label>
              <Input placeholder="1" value={form.serie} onChange={(e) => setForm(f => ({ ...f, serie: e.target.value }))} className="h-9" />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1">
              <Label className="text-xs">Valor *</Label>
              <Input type="number" step="0.01" min="0" placeholder="0,00" value={form.valor} onChange={(e) => setForm(f => ({ ...f, valor: e.target.value }))} className="h-9" />
            </div>
            <div className="space-y-1">
              <Label className="text-xs">Data de Emissão</Label>
              <Input type="date" value={form.data_emissao} onChange={(e) => setForm(f => ({ ...f, data_emissao: e.target.value }))} className="h-9" />
            </div>
          </div>

          <div className="space-y-1">
            <Label className="text-xs">Observações</Label>
            <Textarea placeholder="Observações opcionais..." value={form.observacoes} onChange={(e) => setForm(f => ({ ...f, observacoes: e.target.value }))} className="min-h-[60px]" />
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>Cancelar</Button>
            <Button type="submit" disabled={saving}>
              {saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              {editingNota ? "Salvar" : "Registrar NF"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
