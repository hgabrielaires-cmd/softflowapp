import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { toast } from "sonner";
import { CalendarDays, Clock, X } from "lucide-react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { cn } from "@/lib/utils";

interface Agendamento {
  id?: string;
  data: string;
  hora_inicio?: string | null;
  hora_fim?: string | null;
  observacao?: string | null;
}

interface Props {
  cardId: string;
  atividadeId: string;
  checklistIndex: number;
  disabled?: boolean;
  mesaId?: string | null;
  mesaCor?: string | null;
  filialId?: string | null;
  etapaId?: string | null;
  etapaExecucaoId?: string | null;
  titulo?: string | null;
  onUpdate?: (hasAgendamentos: boolean) => void;
}

export function AgendamentoChecklist({ cardId, atividadeId, checklistIndex, disabled, mesaId, mesaCor, filialId, etapaId, etapaExecucaoId, titulo, onUpdate }: Props) {
  const [agendamentos, setAgendamentos] = useState<Agendamento[]>([]);
  const [selectedDates, setSelectedDates] = useState<Date[]>([]);
  const [loading, setLoading] = useState(true);
  const [popoverOpen, setPopoverOpen] = useState(false);

  useEffect(() => {
    (async () => {
      setLoading(true);
      const { data, error } = await supabase
        .from("painel_agendamentos")
        .select("*")
        .eq("card_id", cardId)
        .eq("atividade_id", atividadeId)
        .eq("checklist_index", checklistIndex)
        .order("data");
      if (!error && data) {
        setAgendamentos(data.map((d: any) => ({
          id: d.id,
          data: d.data,
          hora_inicio: d.hora_inicio,
          hora_fim: d.hora_fim,
          observacao: d.observacao,
        })));
        setSelectedDates(data.map((d: any) => new Date(d.data + "T12:00:00")));
        onUpdate?.(data.length > 0);
      }
      setLoading(false);
    })();
  }, [cardId, atividadeId, checklistIndex]);

  async function handleSelectDates(dates: Date[] | undefined) {
    if (!dates) return;
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const filtered = dates.filter(d => d >= today);
    setSelectedDates(filtered);
  }

  async function confirmarDatas() {
    const { data: { user } } = await supabase.auth.getUser();

    const currentDatesSet = new Set(agendamentos.map(a => a.data));
    const selectedDatesStr = selectedDates.map(d => format(d, "yyyy-MM-dd"));
    const selectedSet = new Set(selectedDatesStr);

    const toAdd = selectedDatesStr.filter(d => !currentDatesSet.has(d));
    const toRemove = agendamentos.filter(a => !selectedSet.has(a.data));

    if (toAdd.length > 0) {
      const { error } = await supabase.from("painel_agendamentos").insert(
        toAdd.map(data => ({
          card_id: cardId,
          atividade_id: atividadeId,
          checklist_index: checklistIndex,
          data,
          criado_por: user?.id || null,
          mesa_id: mesaId || null,
          filial_id: filialId || null,
          etapa_id: etapaId || null,
          etapa_execucao_id: etapaExecucaoId || null,
          titulo: titulo || null,
          cor_evento: mesaCor || null,
        }))
      );
      if (error) { toast.error("Erro ao salvar agendamentos"); return; }
    }

    if (toRemove.length > 0) {
      const ids = toRemove.filter(a => a.id).map(a => a.id!);
      if (ids.length > 0) {
        await supabase.from("painel_agendamentos").delete().in("id", ids);
      }
    }

    const { data } = await supabase
      .from("painel_agendamentos")
      .select("*")
      .eq("card_id", cardId)
      .eq("atividade_id", atividadeId)
      .eq("checklist_index", checklistIndex)
      .order("data");

    if (data) {
      setAgendamentos(data.map((d: any) => ({
        id: d.id,
        data: d.data,
        hora_inicio: d.hora_inicio,
        hora_fim: d.hora_fim,
        observacao: d.observacao,
      })));
      setSelectedDates(data.map((d: any) => new Date(d.data + "T12:00:00")));
      onUpdate?.(data.length > 0);
    }

    await supabase.from("painel_checklist_progresso").upsert({
      card_id: cardId,
      atividade_id: atividadeId,
      checklist_index: checklistIndex,
      concluido: (data?.length || 0) > 0,
      concluido_por: user?.id || null,
      concluido_em: new Date().toISOString(),
      valor_texto: `${data?.length || 0} dia(s) agendado(s)`,
    }, { onConflict: "card_id,atividade_id,checklist_index" });

    setPopoverOpen(false);
    toast.success("Agendamento atualizado!");
  }

  async function updateHorario(agId: string, field: "hora_inicio" | "hora_fim", value: string) {
    await supabase.from("painel_agendamentos").update({ [field]: value || null }).eq("id", agId);
    setAgendamentos(prev => prev.map(a => a.id === agId ? { ...a, [field]: value || null } : a));
  }

  async function removeAgendamento(agId: string) {
    await supabase.from("painel_agendamentos").delete().eq("id", agId);
    setAgendamentos(prev => {
      const updated = prev.filter(a => a.id !== agId);
      setSelectedDates(updated.map(a => new Date(a.data + "T12:00:00")));
      onUpdate?.(updated.length > 0);

      (async () => {
        const { data: { user } } = await supabase.auth.getUser();
        await supabase.from("painel_checklist_progresso").upsert({
          card_id: cardId,
          atividade_id: atividadeId,
          checklist_index: checklistIndex,
          concluido: updated.length > 0,
          concluido_por: user?.id || null,
          concluido_em: updated.length > 0 ? new Date().toISOString() : null,
          valor_texto: updated.length > 0 ? `${updated.length} dia(s) agendado(s)` : null,
        }, { onConflict: "card_id,atividade_id,checklist_index" });
      })();

      return updated;
    });
    toast.success("Data removida!");
  }

  if (loading) return <span className="text-[10px] text-muted-foreground">Carregando...</span>;

  return (
    <div className="space-y-2 pl-1 w-full">
      <Popover open={popoverOpen} onOpenChange={setPopoverOpen}>
        <PopoverTrigger asChild>
          <Button variant="outline" size="sm" className="h-7 text-xs gap-1" disabled={disabled}>
            <CalendarDays className="h-3 w-3" />
            {agendamentos.length > 0 ? `${agendamentos.length} dia(s)` : "Agendar datas"}
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-auto p-0" align="start">
          <div className="p-3 space-y-3">
            <Calendar
              mode="multiple"
              selected={selectedDates}
              onSelect={handleSelectDates}
              locale={ptBR}
              disabled={{ before: new Date() }}
              className={cn("pointer-events-auto")}
              classNames={{
                day_selected: "!bg-emerald-600 !text-white hover:!bg-emerald-700 hover:!text-white focus:!bg-emerald-600 focus:!text-white",
                cell: "h-9 w-9 text-center text-sm p-0 relative [&:has([aria-selected])]:bg-emerald-100 first:[&:has([aria-selected])]:rounded-l-md last:[&:has([aria-selected])]:rounded-r-md focus-within:relative focus-within:z-20",
              }}
            />
            <div className="flex justify-end gap-2">
              <Button variant="outline" size="sm" onClick={() => setPopoverOpen(false)}>
                Cancelar
              </Button>
              <Button size="sm" onClick={confirmarDatas}>
                Confirmar
              </Button>
            </div>
          </div>
        </PopoverContent>
      </Popover>

      {agendamentos.length > 0 && (
        <div className="space-y-1.5">
          {agendamentos.map((ag) => (
            <div
              key={ag.id}
              className="flex items-center gap-2 rounded px-2 py-1.5 text-xs"
              style={{
                backgroundColor: mesaCor ? `${mesaCor}15` : undefined,
                borderLeft: mesaCor ? `3px solid ${mesaCor}` : undefined,
              }}
            >
              <CalendarDays className="h-3 w-3 text-primary shrink-0" />
              <span className="font-medium min-w-[70px]">
                {format(new Date(ag.data + "T12:00:00"), "dd/MM/yyyy")}
              </span>
              <div className="flex items-center gap-1">
                <Clock className="h-2.5 w-2.5 text-muted-foreground" />
                <Input
                  type="time"
                  className="h-6 w-[75px] text-[11px] px-1"
                  value={ag.hora_inicio || ""}
                  disabled={disabled}
                  onChange={(e) => ag.id && updateHorario(ag.id, "hora_inicio", e.target.value)}
                  placeholder="Início"
                />
                <span className="text-muted-foreground">-</span>
                <Input
                  type="time"
                  className="h-6 w-[75px] text-[11px] px-1"
                  value={ag.hora_fim || ""}
                  disabled={disabled}
                  onChange={(e) => ag.id && updateHorario(ag.id, "hora_fim", e.target.value)}
                  placeholder="Fim"
                />
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
