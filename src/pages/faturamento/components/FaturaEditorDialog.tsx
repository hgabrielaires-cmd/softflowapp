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
import { Receipt, Loader2 } from "lucide-react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";

import type { Fatura, FaturaFormState, ClienteOption, ContratoOption } from "../types";
import { TIPOS_FATURA, FORMAS_PAGAMENTO } from "../constants";
import { fmtCurrency } from "../helpers";

interface FaturaEditorDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  editingFatura: Fatura | null;
  form: FaturaFormState;
  setForm: React.Dispatch<React.SetStateAction<FaturaFormState>>;
  saving: boolean;
  onSave: (e: React.FormEvent) => void;
  clientes: ClienteOption[];
  contratos: ContratoOption[];
  loadContratos: (clienteId: string) => void;
}

export function FaturaEditorDialog({
  open, onOpenChange, editingFatura, form, setForm,
  saving, onSave, clientes, contratos, loadContratos,
}: FaturaEditorDialogProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Receipt className="h-4 w-4 text-primary" />
            {editingFatura ? "Editar Fatura" : "Nova Fatura"}
          </DialogTitle>
        </DialogHeader>
        <form onSubmit={onSave} className="flex flex-col gap-3">
          <div className="space-y-1">
            <Label className="text-xs">Cliente *</Label>
            <Select value={form.cliente_id} onValueChange={(v) => { setForm(f => ({ ...f, cliente_id: v, contrato_id: "" })); loadContratos(v); }}>
              <SelectTrigger className="h-9"><SelectValue placeholder="Selecione o cliente" /></SelectTrigger>
              <SelectContent>
                {clientes.map(c => (
                  <SelectItem key={c.id} value={c.id}>{c.nome_fantasia}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {contratos.length > 0 && (
            <div className="space-y-1">
              <Label className="text-xs">Contrato (opcional)</Label>
              <Select value={form.contrato_id || "_none"} onValueChange={(v) => setForm(f => ({ ...f, contrato_id: v === "_none" ? "" : v }))}>
                <SelectTrigger className="h-9"><SelectValue placeholder="Nenhum" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="_none">Nenhum</SelectItem>
                  {contratos.map(c => (
                    <SelectItem key={c.id} value={c.id}>{c.numero_exibicao}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1">
              <Label className="text-xs">Tipo</Label>
              <Select value={form.tipo} onValueChange={(v) => setForm(f => ({ ...f, tipo: v }))}>
                <SelectTrigger className="h-9"><SelectValue /></SelectTrigger>
                <SelectContent>
                  {TIPOS_FATURA.map(t => (
                    <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1">
              <Label className="text-xs">Forma de Pagamento</Label>
              <Select value={form.forma_pagamento || "_none"} onValueChange={(v) => setForm(f => ({ ...f, forma_pagamento: v === "_none" ? "" : v }))}>
                <SelectTrigger className="h-9"><SelectValue placeholder="Selecione" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="_none">Nenhuma</SelectItem>
                  {FORMAS_PAGAMENTO.map(fp => (
                    <SelectItem key={fp.value} value={fp.value}>{fp.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1">
              <Label className="text-xs">Valor *</Label>
              <Input type="number" step="0.01" min="0" placeholder="0,00" value={form.valor} onChange={(e) => setForm(f => ({ ...f, valor: e.target.value }))} className="h-9" />
            </div>
            <div className="space-y-1">
              <Label className="text-xs">Desconto</Label>
              <Input type="number" step="0.01" min="0" placeholder="0,00" value={form.valor_desconto} onChange={(e) => setForm(f => ({ ...f, valor_desconto: e.target.value }))} className="h-9" />
            </div>
          </div>

          {form.valor && Number(form.valor) > 0 && (
            <div className="text-sm font-medium text-right text-primary">
              Valor Final: {fmtCurrency(Number(form.valor) - (Number(form.valor_desconto) || 0))}
            </div>
          )}

          <div className="space-y-1">
            <Label className="text-xs">Data de Vencimento *</Label>
            <Input type="date" value={form.data_vencimento} onChange={(e) => setForm(f => ({ ...f, data_vencimento: e.target.value }))} className="h-9" />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1">
              <Label className="text-xs">Mês Referência</Label>
              <Select value={form.referencia_mes} onValueChange={(v) => setForm(f => ({ ...f, referencia_mes: v }))}>
                <SelectTrigger className="h-9"><SelectValue placeholder="Mês" /></SelectTrigger>
                <SelectContent>
                  {Array.from({ length: 12 }, (_, i) => (
                    <SelectItem key={i + 1} value={String(i + 1)}>
                      {format(new Date(2024, i, 1), "MMMM", { locale: ptBR })}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1">
              <Label className="text-xs">Ano Referência</Label>
              <Input type="number" min="2020" max="2030" placeholder="2026" value={form.referencia_ano} onChange={(e) => setForm(f => ({ ...f, referencia_ano: e.target.value }))} className="h-9" />
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
              {editingFatura ? "Salvar" : "Criar Fatura"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
