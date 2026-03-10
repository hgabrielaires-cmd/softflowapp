import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Plus, Trash2, ArrowUp, ArrowDown } from "lucide-react";
import type { ChecklistItemTipo, MesaAtendimento } from "@/lib/supabase-types";
import { CHECKLIST_TIPO_LABELS } from "@/lib/supabase-types";
import type { LocalEtapa, LocalAtividade, AtividadeFormState } from "../types";

interface AtividadeDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  editingAtividade: LocalAtividade | null;
  atividadeForm: AtividadeFormState;
  setAtividadeForm: React.Dispatch<React.SetStateAction<AtividadeFormState>>;
  horasText: string;
  onHorasTextChange: (val: string) => void;
  onHorasTextBlur: () => void;
  onSave: () => void;
  mesas: MesaAtendimento[];
  etapas: LocalEtapa[];
  currentEtapaTempId: string;
  // Checklist
  onAddChecklistItem: () => void;
  onUpdateChecklistText: (index: number, texto: string) => void;
  onUpdateChecklistTipo: (index: number, tipo: ChecklistItemTipo) => void;
  onRemoveChecklistItem: (index: number) => void;
  onMoveChecklistItem: (index: number, direction: "up" | "down") => void;
}

export function AtividadeDialog({
  open, onOpenChange, editingAtividade, atividadeForm, setAtividadeForm,
  horasText, onHorasTextChange, onHorasTextBlur, onSave, mesas, etapas, currentEtapaTempId,
  onAddChecklistItem, onUpdateChecklistText, onUpdateChecklistTipo, onRemoveChecklistItem, onMoveChecklistItem,
}: AtividadeDialogProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{editingAtividade ? "Editar Atividade" : "Adicionar Atividade"}</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <div>
            <label className="text-sm font-medium">Nome da Atividade *</label>
            <Input value={atividadeForm.nome} onChange={(e) => setAtividadeForm((p) => ({ ...p, nome: e.target.value }))} />
          </div>
          <div>
            <label className="text-sm font-medium">Horas Estimadas (hh:mm)</label>
            <Input
              placeholder="0:00"
              className="mt-1 w-32 font-mono text-base"
              value={horasText}
              onChange={(e) => onHorasTextChange(e.target.value)}
              onBlur={onHorasTextBlur}
            />
            <p className="text-xs text-muted-foreground mt-1">Ex: 0:15 = 15min, 1:30 = 1h30min</p>
          </div>
          <div>
            <label className="text-sm font-medium">Descrição</label>
            <Textarea value={atividadeForm.descricao} onChange={(e) => setAtividadeForm((p) => ({ ...p, descricao: e.target.value }))} />
          </div>
          <div>
            <label className="text-sm font-medium">Tipo de Responsabilidade</label>
            <Select value={atividadeForm.tipo_responsabilidade} onValueChange={(v) => setAtividadeForm((p) => ({ ...p, tipo_responsabilidade: v }))}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="Interna">Interna</SelectItem>
                <SelectItem value="Externa">Externa</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div>
            <label className="text-sm font-medium">Mesa de Atendimento</label>
            <Select value={atividadeForm.mesa_atendimento_id || "none"} onValueChange={(v) => setAtividadeForm((p) => ({ ...p, mesa_atendimento_id: v === "none" ? "" : v }))}>
              <SelectTrigger><SelectValue placeholder="Herdar da etapa" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="none">Herdar da etapa</SelectItem>
                {mesas.map((m) => <SelectItem key={m.id} value={m.id}>{m.nome}</SelectItem>)}
              </SelectContent>
            </Select>
            {!atividadeForm.mesa_atendimento_id && (() => {
              const etapa = etapas.find(e => e.tempId === currentEtapaTempId);
              const mesaNome = etapa?.mesa_atendimento_id ? mesas.find(m => m.id === etapa.mesa_atendimento_id)?.nome : null;
              return mesaNome ? <p className="text-xs text-muted-foreground mt-1">Herdará: {mesaNome}</p> : null;
            })()}
          </div>
          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="text-sm font-medium">Checklist</label>
              <Button size="sm" variant="outline" className="h-7 text-xs" onClick={onAddChecklistItem}><Plus className="h-3 w-3 mr-1" />Adicionar Item</Button>
            </div>
            {atividadeForm.checklist.length === 0 ? (
              <p className="text-xs text-muted-foreground text-center py-3">Nenhum item no checklist.</p>
            ) : (
              <div className="space-y-2">
                {atividadeForm.checklist.map((item, idx) => (
                  <div key={idx} className="flex items-center gap-2">
                    <div className="flex flex-col gap-0.5">
                      <Button variant="ghost" size="icon" className="h-5 w-5" onClick={() => onMoveChecklistItem(idx, "up")} disabled={idx === 0}><ArrowUp className="h-3 w-3" /></Button>
                      <Button variant="ghost" size="icon" className="h-5 w-5" onClick={() => onMoveChecklistItem(idx, "down")} disabled={idx === atividadeForm.checklist.length - 1}><ArrowDown className="h-3 w-3" /></Button>
                    </div>
                    <Select value={item.tipo || "check"} onValueChange={(v) => onUpdateChecklistTipo(idx, v as ChecklistItemTipo)}>
                      <SelectTrigger className="w-[140px] h-8 text-xs">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {Object.entries(CHECKLIST_TIPO_LABELS).map(([key, label]) => (
                          <SelectItem key={key} value={key}>{label}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <Input value={item.texto} onChange={(e) => onUpdateChecklistText(idx, e.target.value)} placeholder="Descrição do item..." className="flex-1 h-8 text-sm" />
                    <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => onRemoveChecklistItem(idx)}><Trash2 className="h-3 w-3 text-destructive" /></Button>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancelar</Button>
          <Button onClick={onSave} disabled={!atividadeForm.nome.trim()}>Salvar</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
