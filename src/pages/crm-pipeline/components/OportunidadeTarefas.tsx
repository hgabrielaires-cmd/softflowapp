import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/context/AuthContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { Badge } from "@/components/ui/badge";
import { Plus, Loader2, CalendarIcon, CheckCircle2, Clock, History } from "lucide-react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import { UserAvatar } from "@/components/UserAvatar";
import { ConcluirTarefaDialog } from "./ConcluirTarefaDialog";

interface Tarefa {
  id: string;
  tipo_atendimento: string;
  canal: string;
  data_reuniao: string | null;
  descricao: string;
  criado_por: string;
  concluido_em: string | null;
  concluido_por: string | null;
  created_at: string;
}

interface HistoricoItem {
  id: string;
  tarefa_id: string;
  resposta: string;
  data_anterior: string | null;
  data_nova: string | null;
  tipo: string;
  user_id: string;
  created_at: string;
}

interface ProfileInfo {
  full_name: string;
  avatar_url: string | null;
}

interface Props {
  oportunidadeId: string;
  tiposAtendimento: string[];
  canais: string[];
}

export function OportunidadeTarefas({ oportunidadeId, tiposAtendimento, canais }: Props) {
  const { user } = useAuth();
  const [tarefas, setTarefas] = useState<Tarefa[]>([]);
  const [historicos, setHistoricos] = useState<Record<string, HistoricoItem[]>>({});
  const [profiles, setProfiles] = useState<Record<string, ProfileInfo>>({});
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [forcarNovaTarefa, setForcarNovaTarefa] = useState(false);
  const [saving, setSaving] = useState(false);
  const [expandedHistorico, setExpandedHistorico] = useState<string | null>(null);

  // Concluir dialog
  const [concluirOpen, setConcluirOpen] = useState(false);
  const [concluirTarefa, setConcluirTarefa] = useState<Tarefa | null>(null);

  // Form
  const [tipoAtendimento, setTipoAtendimento] = useState("");
  const [canal, setCanal] = useState("");
  const [dataReuniao, setDataReuniao] = useState<Date | undefined>();
  const [horaReuniao, setHoraReuniao] = useState("09:00");
  const [descricao, setDescricao] = useState("");

  const fetchTarefas = async () => {
    const { data } = await supabase
      .from("crm_tarefas")
      .select("*")
      .eq("oportunidade_id", oportunidadeId)
      .order("created_at", { ascending: false });

    if (data) {
      setTarefas(data as Tarefa[]);

      // Fetch historicos
      const tarefaIds = data.map(t => t.id);
      if (tarefaIds.length > 0) {
        const { data: histData } = await supabase
          .from("crm_tarefas_historico" as any)
          .select("*")
          .in("tarefa_id", tarefaIds)
          .order("created_at", { ascending: true });

        if (histData) {
          const map: Record<string, HistoricoItem[]> = {};
          (histData as any[]).forEach((h: any) => {
            if (!map[h.tarefa_id]) map[h.tarefa_id] = [];
            map[h.tarefa_id].push(h as HistoricoItem);
          });
          setHistoricos(map);
        }
      }

      // Fetch profiles
      const userIds = [...new Set(data.flatMap(t => [t.criado_por, t.concluido_por].filter(Boolean)))] as string[];
      if (userIds.length > 0) {
        const { data: profs } = await supabase
          .from("profiles")
          .select("user_id, full_name, avatar_url")
          .in("user_id", userIds);
        if (profs) {
          const map: Record<string, ProfileInfo> = {};
          profs.forEach(p => { map[p.user_id] = { full_name: p.full_name, avatar_url: p.avatar_url }; });
          setProfiles(map);
        }
      }
    }
    setLoading(false);
  };

  useEffect(() => { fetchTarefas(); }, [oportunidadeId]);

  const resetForm = () => {
    setTipoAtendimento("");
    setCanal("");
    setDataReuniao(undefined);
    setHoraReuniao("09:00");
    setDescricao("");
    setShowForm(false);
    setForcarNovaTarefa(false);
  };

  const formValido = descricao.trim() && tipoAtendimento && canal;

  const handleCriar = async () => {
    if (!user || !formValido) return;
    setSaving(true);
    try {
      let dataReuniaoFinal: string | null = null;
      if (dataReuniao) {
        const [h, m] = horaReuniao.split(":").map(Number);
        const d = new Date(dataReuniao);
        d.setHours(h, m, 0, 0);
        dataReuniaoFinal = d.toISOString();
      }
      const { error } = await supabase.from("crm_tarefas").insert({
        oportunidade_id: oportunidadeId,
        tipo_atendimento: tipoAtendimento,
        canal,
        data_reuniao: dataReuniaoFinal,
        descricao: descricao.trim(),
        criado_por: user.id,
      });
      if (error) throw error;
      toast.success("Tarefa criada!");
      resetForm();
      fetchTarefas();
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "Erro desconhecido";
      toast.error("Erro ao criar tarefa: " + message);
    } finally { setSaving(false); }
  };

  const handleConcluirClick = (tarefa: Tarefa) => {
    setConcluirTarefa(tarefa);
    setConcluirOpen(true);
  };

  const handleConcluido = () => {
    setConcluirOpen(false);
    setConcluirTarefa(null);
    fetchTarefas();
  };

  const handleCriarNovaAposConcluir = () => {
    setConcluirOpen(false);
    setConcluirTarefa(null);
    fetchTarefas();
    // Force new task form open, can't cancel
    setForcarNovaTarefa(true);
    setShowForm(true);
  };

  const canCancelForm = !forcarNovaTarefa;

  return (
    <div className="space-y-4 pt-4">
      {/* Header + botão */}
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-semibold text-foreground">Tarefas</h3>
        {!showForm && (
          <Button size="sm" className="h-8 text-xs gap-1" onClick={() => setShowForm(true)}>
            <Plus className="h-3.5 w-3.5" /> Criar Tarefa
          </Button>
        )}
      </div>

      {/* Formulário */}
      {showForm && (
        <div className="border rounded-lg p-4 space-y-3 bg-muted/30">
          {forcarNovaTarefa && (
            <p className="text-xs text-amber-600 font-medium">
              ⚠ É obrigatório criar uma nova tarefa antes de continuar.
            </p>
          )}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label className="text-xs">Tipo de Atendimento *</Label>
              <Select value={tipoAtendimento || "__none__"} onValueChange={(v) => setTipoAtendimento(v === "__none__" ? "" : v)}>
                <SelectTrigger className="h-9 text-xs"><SelectValue placeholder="Selecione..." /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="__none__">Selecione...</SelectItem>
                  {tiposAtendimento.map(t => (<SelectItem key={t} value={t}>{t}</SelectItem>))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label className="text-xs">Canal *</Label>
              <Select value={canal || "__none__"} onValueChange={(v) => setCanal(v === "__none__" ? "" : v)}>
                <SelectTrigger className="h-9 text-xs"><SelectValue placeholder="Selecione..." /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="__none__">Selecione...</SelectItem>
                  {canais.map(c => (<SelectItem key={c} value={c}>{c}</SelectItem>))}
                </SelectContent>
              </Select>
            </div>
          </div>
          <div>
            <Label className="text-xs">Data e Hora da Reunião</Label>
            <div className="flex gap-2">
              <Popover>
                <PopoverTrigger asChild>
                  <Button variant="outline" className={cn("flex-1 justify-start text-left font-normal h-9 text-xs", !dataReuniao && "text-muted-foreground")}>
                    <CalendarIcon className="mr-1.5 h-3.5 w-3.5" />
                    {dataReuniao ? format(dataReuniao, "dd/MM/yyyy", { locale: ptBR }) : "Selecionar data"}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start">
                  <Calendar mode="single" selected={dataReuniao} onSelect={setDataReuniao} initialFocus className="p-3 pointer-events-auto" />
                </PopoverContent>
              </Popover>
              <Input type="time" value={horaReuniao} onChange={(e) => setHoraReuniao(e.target.value)} className="w-24 h-9 text-xs" />
            </div>
          </div>
          <div>
            <Label className="text-xs">Descrição *</Label>
            <Textarea value={descricao} onChange={(e) => setDescricao(e.target.value)} placeholder="Descreva a tarefa..." className="min-h-[60px] text-xs" />
          </div>
          <div className="flex gap-2 justify-end">
            {canCancelForm && (
              <Button variant="ghost" size="sm" className="text-xs h-8" onClick={resetForm}>Cancelar</Button>
            )}
            <Button size="sm" className="text-xs h-8" onClick={handleCriar} disabled={saving || !formValido}>
              {saving ? <Loader2 className="h-3.5 w-3.5 animate-spin mr-1" /> : null} Criar
            </Button>
          </div>
        </div>
      )}

      {/* Lista / Histórico */}
      {loading ? (
        <div className="flex justify-center py-8"><Loader2 className="h-5 w-5 animate-spin text-muted-foreground" /></div>
      ) : tarefas.length === 0 ? (
        <p className="text-xs text-muted-foreground text-center py-8">Nenhuma tarefa registrada.</p>
      ) : (
        <div className="space-y-2">
          {tarefas.map(t => {
            const criador = profiles[t.criado_por];
            const concluidor = t.concluido_por ? profiles[t.concluido_por] : null;
            const concluida = !!t.concluido_em;
            const hist = historicos[t.id] || [];
            const isExpanded = expandedHistorico === t.id;

            return (
              <div key={t.id} className={cn("border rounded-lg p-3 space-y-1.5", concluida ? "bg-muted/20 opacity-75" : "bg-background")}>
                <div className="flex items-start justify-between gap-2">
                  <div className="flex items-center gap-2 min-w-0">
                    <UserAvatar avatarUrl={criador?.avatar_url} fullName={criador?.full_name} size="xs" />
                    <span className="text-xs font-medium truncate">{criador?.full_name || "Usuário"}</span>
                    <span className="text-[10px] text-muted-foreground shrink-0">
                      {format(new Date(t.created_at), "dd/MM/yy HH:mm", { locale: ptBR })}
                    </span>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    {t.tipo_atendimento && (
                      <Badge variant="outline" className="text-[10px]">{t.tipo_atendimento}</Badge>
                    )}
                    {t.canal && (
                      <Badge variant="outline" className="text-[10px]">{t.canal}</Badge>
                    )}
                    {hist.length > 0 && (
                      <Button
                        size="sm"
                        variant="ghost"
                        className="h-6 w-6 p-0"
                        onClick={() => setExpandedHistorico(isExpanded ? null : t.id)}
                        title={`${hist.length} registro(s) de histórico`}
                      >
                        <History className="h-3.5 w-3.5 text-muted-foreground" />
                      </Button>
                    )}
                    {concluida ? (
                      <Badge variant="secondary" className="text-[10px] gap-1 bg-emerald-100 text-emerald-700">
                        <CheckCircle2 className="h-3 w-3" /> Concluída
                      </Badge>
                    ) : (
                      <Button size="sm" variant="outline" className="h-6 text-[10px] px-2 gap-1" onClick={() => handleConcluirClick(t)}>
                        <CheckCircle2 className="h-3 w-3" /> Concluir
                      </Button>
                    )}
                  </div>
                </div>
                {t.data_reuniao && (
                  <div className="flex items-center gap-1 text-[11px] text-muted-foreground">
                    <Clock className="h-3 w-3" />
                    Reunião: {format(new Date(t.data_reuniao), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })}
                  </div>
                )}
                <p className="text-xs whitespace-pre-wrap text-foreground">{t.descricao}</p>
                {concluida && concluidor && (
                  <div className="flex items-center gap-1.5 text-[10px] text-muted-foreground pt-0.5">
                    <CheckCircle2 className="h-3 w-3 text-emerald-600" />
                    Concluída por {concluidor.full_name} em {format(new Date(t.concluido_em!), "dd/MM/yy HH:mm", { locale: ptBR })}
                  </div>
                )}

                {/* Histórico expandido */}
                {isExpanded && hist.length > 0 && (
                  <div className="mt-2 border-t pt-2 space-y-2">
                    <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wide">Histórico</p>
                    {hist.map(h => {
                      const histProfile = profiles[h.user_id];
                      return (
                        <div key={h.id} className="border rounded p-2 bg-muted/20 space-y-1">
                          <div className="flex items-center gap-1.5 text-[10px] text-muted-foreground">
                            <UserAvatar avatarUrl={histProfile?.avatar_url} fullName={histProfile?.full_name} size="xs" />
                            <span>{histProfile?.full_name || "Usuário"}</span>
                            <span>•</span>
                            <span>{format(new Date(h.created_at), "dd/MM/yy HH:mm", { locale: ptBR })}</span>
                            <Badge variant={h.tipo === "adiamento" ? "outline" : "secondary"} className="text-[9px] ml-auto">
                              {h.tipo === "adiamento" ? "Adiado" : "Concluído"}
                            </Badge>
                          </div>
                          <p className="text-[11px] text-foreground">{h.resposta}</p>
                          {h.tipo === "adiamento" && h.data_anterior && h.data_nova && (
                            <div className="text-[10px] text-muted-foreground">
                              {format(new Date(h.data_anterior), "dd/MM/yy HH:mm")} → {format(new Date(h.data_nova), "dd/MM/yy HH:mm")}
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* Dialog de conclusão */}
      <ConcluirTarefaDialog
        open={concluirOpen}
        tarefa={concluirTarefa}
        onClose={() => { setConcluirOpen(false); setConcluirTarefa(null); }}
        onConcluido={handleConcluido}
        onCriarNova={handleCriarNovaAposConcluir}
      />
    </div>
  );
}
