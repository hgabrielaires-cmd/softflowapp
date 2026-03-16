import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/context/AuthContext";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { CalendarIcon, Loader2, Clock, Plus, CheckCircle2 } from "lucide-react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

interface Tarefa {
  id: string;
  data_reuniao: string | null;
  descricao: string;
}

interface Props {
  open: boolean;
  tarefa: Tarefa | null;
  onClose: () => void;
  onConcluido: () => void;
  onCriarNova: () => void;
  onNegocioPerdido?: () => void;
  onNegocioGanho?: () => void;
}

type Etapa = "resposta" | "escolha" | "adiar" | "finalizar";

export function ConcluirTarefaDialog({ open, tarefa, onClose, onConcluido, onCriarNova, onNegocioPerdido, onNegocioGanho }: Props) {
  const { user } = useAuth();
  const [etapa, setEtapa] = useState<Etapa>("resposta");
  const [resposta, setResposta] = useState("");
  const [dataAdiar, setDataAdiar] = useState<Date | undefined>();
  const [horaAdiar, setHoraAdiar] = useState("09:00");
  const [saving, setSaving] = useState(false);

  const resetState = () => {
    setEtapa("resposta");
    setResposta("");
    setDataAdiar(undefined);
    setHoraAdiar("09:00");
    setSaving(false);
  };

  const handleOpenChange = (isOpen: boolean) => {
    if (!isOpen) {
      // Allow closing - keeps task open without concluding
      resetState();
      onClose();
      return;
    }
  };

  const handleAvancarParaEscolha = () => {
    if (!resposta.trim()) {
      toast.error("Digite uma resposta antes de continuar.");
      return;
    }
    setEtapa("escolha");
  };

  const handleAdiar = async () => {
    if (!user || !tarefa || !dataAdiar) return;
    setSaving(true);
    try {
      const [h, m] = horaAdiar.split(":").map(Number);
      const novaData = new Date(dataAdiar);
      novaData.setHours(h, m, 0, 0);

      // Save history
      const { error: histErr } = await supabase.from("crm_tarefas_historico" as any).insert({
        tarefa_id: tarefa.id,
        resposta: resposta.trim(),
        data_anterior: tarefa.data_reuniao,
        data_nova: novaData.toISOString(),
        tipo: "adiamento",
        user_id: user.id,
      });
      if (histErr) throw histErr;

      // Update task with new date, clear concluded
      const { error: updErr } = await supabase
        .from("crm_tarefas")
        .update({
          data_reuniao: novaData.toISOString(),
          concluido_em: null,
          concluido_por: null,
        })
        .eq("id", tarefa.id);
      if (updErr) throw updErr;

      toast.success("Tarefa adiada com sucesso!");
      resetState();
      onConcluido();
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "Erro desconhecido";
      toast.error("Erro ao adiar tarefa: " + message);
    } finally {
      setSaving(false);
    }
  };

  const handleCriarNova = async () => {
    if (!user || !tarefa) return;
    setSaving(true);
    try {
      const { error: histErr } = await supabase.from("crm_tarefas_historico" as any).insert({
        tarefa_id: tarefa.id,
        resposta: resposta.trim(),
        data_anterior: tarefa.data_reuniao,
        data_nova: null,
        tipo: "conclusao",
        user_id: user.id,
      });
      if (histErr) throw histErr;
      const { error: updErr } = await supabase
        .from("crm_tarefas")
        .update({ concluido_em: new Date().toISOString(), concluido_por: user.id })
        .eq("id", tarefa.id);
      if (updErr) throw updErr;
      toast.success("Tarefa concluída!");
      resetState();
      onCriarNova();
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "Erro desconhecido";
      toast.error("Erro ao concluir tarefa: " + message);
    } finally {
      setSaving(false);
    }
  };

  const handleFinalizarConcluir = async () => {
    if (!user || !tarefa) return;
    setSaving(true);
    try {
      const { error: histErr } = await supabase.from("crm_tarefas_historico" as any).insert({
        tarefa_id: tarefa.id,
        resposta: resposta.trim(),
        data_anterior: tarefa.data_reuniao,
        data_nova: null,
        tipo: "conclusao",
        user_id: user.id,
      });
      if (histErr) throw histErr;
      const { error: updErr } = await supabase
        .from("crm_tarefas")
        .update({ concluido_em: new Date().toISOString(), concluido_por: user.id })
        .eq("id", tarefa.id);
      if (updErr) throw updErr;
      toast.success("Tarefa concluída!");
      setEtapa("finalizar");
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "Erro desconhecido";
      toast.error("Erro ao concluir tarefa: " + message);
    } finally {
      setSaving(false);
    }
  };

  if (!tarefa) return null;

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle className="text-base">
            {etapa === "resposta" && "Registrar Resposta"}
            {etapa === "escolha" && "O que deseja fazer?"}
            {etapa === "adiar" && "Adiar Tarefa"}
            {etapa === "finalizar" && "Finalizar Oportunidade"}
          </DialogTitle>
        </DialogHeader>

        {/* Etapa 1: Resposta */}
        {etapa === "resposta" && (
          <div className="space-y-3">
            <div>
              <Label className="text-xs font-medium">Resposta / Observação *</Label>
              <Textarea
                value={resposta}
                onChange={(e) => setResposta(e.target.value)}
                placeholder="Descreva o resultado do atendimento..."
                className="min-h-[80px] text-xs mt-1"
              />
            </div>
            <div className="flex justify-end">
              <Button size="sm" className="text-xs h-8" onClick={handleAvancarParaEscolha} disabled={!resposta.trim()}>
                Avançar
              </Button>
            </div>
          </div>
        )}

        {etapa === "escolha" && (
          <div className="space-y-3">
            <p className="text-xs text-muted-foreground">
              Escolha uma ação para continuar. A oportunidade não pode ficar sem tarefa.
            </p>
            <div className="grid grid-cols-3 gap-3">
              <Button
                variant="outline"
                className="h-20 flex flex-col gap-1.5 text-xs"
                onClick={() => setEtapa("adiar")}
              >
                <Clock className="h-5 w-5 text-amber-500" />
                <span className="font-medium">Adiar Tarefa</span>
                <span className="text-[10px] text-muted-foreground">Reagendar mesma tarefa</span>
              </Button>
              <Button
                variant="outline"
                className="h-20 flex flex-col gap-1.5 text-xs"
                onClick={handleCriarNova}
                disabled={saving}
              >
                {saving ? <Loader2 className="h-5 w-5 animate-spin" /> : <Plus className="h-5 w-5 text-primary" />}
                <span className="font-medium">Criar Nova Tarefa</span>
                <span className="text-[10px] text-muted-foreground">Concluir e criar outra</span>
              </Button>
              <Button
                variant="outline"
                className="h-20 flex flex-col gap-1.5 text-xs"
                onClick={handleFinalizarConcluir}
                disabled={saving}
              >
                {saving ? <Loader2 className="h-5 w-5 animate-spin" /> : <CheckCircle2 className="h-5 w-5 text-emerald-600" />}
                <span className="font-medium">Finalizar e Concluir</span>
                <span className="text-[10px] text-muted-foreground">Encerrar oportunidade</span>
              </Button>
            </div>
            <Button variant="ghost" size="sm" className="text-xs h-7 w-full" onClick={() => setEtapa("resposta")}>
              ← Voltar
            </Button>
          </div>
        )}

        {/* Etapa Finalizar: Perdido ou Ganho */}
        {etapa === "finalizar" && (
          <div className="space-y-3">
            <p className="text-xs text-muted-foreground">
              Tarefa concluída! Agora defina o resultado da oportunidade.
            </p>
            <div className="grid grid-cols-2 gap-3">
              <Button
                variant="outline"
                className="h-20 flex flex-col gap-1.5 text-xs border-destructive/50 hover:bg-destructive hover:text-destructive-foreground"
                onClick={() => {
                  resetState();
                  onNegocioPerdido?.();
                }}
              >
                <span className="text-2xl">😢</span>
                <span className="font-medium">Negócio Perdido</span>
              </Button>
              <Button
                variant="outline"
                className="h-20 flex flex-col gap-1.5 text-xs border-emerald-300 hover:bg-emerald-600 hover:text-white"
                onClick={() => {
                  resetState();
                  onNegocioGanho?.();
                }}
              >
                <span className="text-2xl">🥳</span>
                <span className="font-medium">Negócio Ganho</span>
              </Button>
            </div>
          </div>
        )}

        {/* Etapa 3: Adiar */}
        {etapa === "adiar" && (
          <div className="space-y-3">
            <div>
              <Label className="text-xs font-medium">Nova Data e Hora *</Label>
              <div className="flex gap-2 mt-1">
                <Popover>
                  <PopoverTrigger asChild>
                    <Button
                      variant="outline"
                      className={cn("flex-1 justify-start text-left font-normal h-9 text-xs", !dataAdiar && "text-muted-foreground")}
                    >
                      <CalendarIcon className="mr-1.5 h-3.5 w-3.5" />
                      {dataAdiar ? format(dataAdiar, "dd/MM/yyyy", { locale: ptBR }) : "Selecionar data"}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0" align="start">
                    <Calendar
                      mode="single"
                      selected={dataAdiar}
                      onSelect={setDataAdiar}
                      initialFocus
                      className="p-3 pointer-events-auto"
                    />
                  </PopoverContent>
                </Popover>
                <Input
                  type="time"
                  value={horaAdiar}
                  onChange={(e) => setHoraAdiar(e.target.value)}
                  className="w-24 h-9 text-xs"
                />
              </div>
            </div>
            <div className="flex gap-2 justify-end">
              <Button variant="ghost" size="sm" className="text-xs h-8" onClick={() => setEtapa("escolha")}>
                ← Voltar
              </Button>
              <Button size="sm" className="text-xs h-8" onClick={handleAdiar} disabled={saving || !dataAdiar}>
                {saving ? <Loader2 className="h-3.5 w-3.5 animate-spin mr-1" /> : null}
                Confirmar Adiamento
              </Button>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
