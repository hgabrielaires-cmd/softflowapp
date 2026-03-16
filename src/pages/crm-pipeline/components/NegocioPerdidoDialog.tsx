import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Loader2 } from "lucide-react";

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  oportunidadeId: string;
  etapaNome: string;
  motivosPerda: { id: string; nome: string }[];
  camposPersonalizados: Record<string, string>;
  sistemaAnteriorOpcoes: string[];
  onSuccess: () => void;
}

export function NegocioPerdidoDialog({
  open, onOpenChange, oportunidadeId, etapaNome,
  motivosPerda, camposPersonalizados, onSuccess,
}: Props) {
  const [motivoPerdaId, setMotivoPerdaId] = useState("");
  const [concorrente, setConcorrente] = useState(camposPersonalizados["Sistema Anterior"] || "");
  const [observacao, setObservacao] = useState("");
  const [saving, setSaving] = useState(false);

  const motivoSelecionado = motivosPerda.find(m => m.id === motivoPerdaId);

  const handleConfirm = async () => {
    if (!motivoPerdaId) {
      toast.error("Selecione o motivo da perda");
      return;
    }
    if (!concorrente.trim()) {
      toast.error("Informe o sistema anterior / concorrente");
      return;
    }

    setSaving(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();

      // Get current etapa before updating
      const { data: opData } = await supabase
        .from("crm_oportunidades")
        .select("etapa_id")
        .eq("id", oportunidadeId)
        .single();

      // 1. Update oportunidade
      const { error: errUpdate } = await supabase
        .from("crm_oportunidades")
        .update({
          status: "perdido",
          motivo_perda: motivoSelecionado?.nome || null,
          motivo_perda_id: motivoPerdaId,
          concorrente: concorrente.trim(),
          observacao_perda: observacao.trim() || null,
          data_perda: new Date().toISOString(),
          etapa_perda_id: opData?.etapa_id || null,
        } as any)
        .eq("id", oportunidadeId);
      if (errUpdate) throw errUpdate;

      // 2. Concluir tarefas ativas
      await supabase.from("crm_tarefas").update({
        concluido_em: new Date().toISOString(),
        concluido_por: user?.id || null,
      } as any).eq("oportunidade_id", oportunidadeId).is("concluido_em", null);

      // 3. Registrar histórico
      const descricao = `Negócio marcado como Perdido — Motivo: ${motivoSelecionado?.nome || "N/A"} | Sistema Anterior: ${concorrente.trim()} | Etapa: ${etapaNome}${observacao.trim() ? ` | Obs: ${observacao.trim()}` : ""}`;

      await (supabase as any).from("crm_historico").insert({
        oportunidade_id: oportunidadeId,
        tipo: "status_alterado",
        descricao,
        user_id: user?.id || null,
      });

      toast.info("Negócio marcado como perdido 😢");
      onSuccess();
      onOpenChange(false);
      resetForm();
    } catch (err: any) {
      toast.error("Erro ao registrar perda: " + (err?.message || "Erro desconhecido"));
    } finally {
      setSaving(false);
    }
  };

  const resetForm = () => {
    setMotivoPerdaId("");
    setConcorrente("");
    setObservacao("");
  };

  return (
    <Dialog open={open} onOpenChange={(v) => { if (!v) resetForm(); onOpenChange(v); }}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            😢 Marcar como Negócio Perdido
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4 py-2">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {/* Motivo da Perda */}
            <div className="space-y-1.5">
              <Label className="text-xs">Motivo da Perda <span className="text-destructive">*</span></Label>
              <Select value={motivoPerdaId} onValueChange={setMotivoPerdaId}>
                <SelectTrigger className="h-9 text-xs">
                  <SelectValue placeholder="Selecione o motivo..." />
                </SelectTrigger>
                <SelectContent>
                  {motivosPerda.map(m => (
                    <SelectItem key={m.id} value={m.id}>{m.nome}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Sistema Anterior */}
            <div className="space-y-1.5">
              <Label className="text-xs">Sistema Anterior <span className="text-destructive">*</span></Label>
              <Input
                className="h-9 text-xs"
                placeholder="Ex: Sistema XYZ"
                value={concorrente}
                onChange={e => setConcorrente(e.target.value)}
              />
            </div>
          </div>

          {/* Observação */}
          <div className="space-y-1.5">
            <Label className="text-xs">Observação</Label>
            <Textarea
              className="text-xs min-h-[80px]"
              placeholder="Observações adicionais sobre a perda..."
              value={observacao}
              onChange={e => setObservacao(e.target.value)}
            />
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" size="sm" onClick={() => { resetForm(); onOpenChange(false); }} disabled={saving}>
            Cancelar
          </Button>
          <Button
            size="sm"
            variant="destructive"
            onClick={handleConfirm}
            disabled={saving || !motivoPerdaId || !concorrente.trim()}
          >
            {saving ? <Loader2 className="h-4 w-4 animate-spin mr-1" /> : null}
            Confirmar Perda
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
