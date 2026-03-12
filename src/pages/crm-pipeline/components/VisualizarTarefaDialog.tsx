import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { UserAvatar } from "@/components/UserAvatar";
import { Clock, CalendarIcon, CheckCircle2, RotateCcw } from "lucide-react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";

interface HistoricoItem {
  id: string;
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

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  tarefa: Tarefa | null;
  historico: HistoricoItem[];
  profiles: Record<string, ProfileInfo>;
}

export function VisualizarTarefaDialog({ open, onOpenChange, tarefa, historico, profiles }: Props) {
  if (!tarefa) return null;

  const criador = profiles[tarefa.criado_por];
  const concluida = !!tarefa.concluido_em;
  const concluidor = tarefa.concluido_por ? profiles[tarefa.concluido_por] : null;
  const adiamentos = historico.filter(h => h.tipo === "adiamento");

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-base">Detalhes da Tarefa</DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          {/* Info geral */}
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <UserAvatar avatarUrl={criador?.avatar_url} fullName={criador?.full_name} size="xs" />
              <span className="text-xs font-medium">{criador?.full_name || "Usuário"}</span>
              <span className="text-[10px] text-muted-foreground">
                {format(new Date(tarefa.created_at), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })}
              </span>
            </div>
            <div className="flex items-center gap-2 flex-wrap">
              {tarefa.tipo_atendimento && <Badge variant="outline" className="text-[10px]">{tarefa.tipo_atendimento}</Badge>}
              {tarefa.canal && <Badge variant="outline" className="text-[10px]">{tarefa.canal}</Badge>}
              {concluida ? (
                <Badge variant="secondary" className="text-[10px] gap-1 bg-emerald-100 text-emerald-700">
                  <CheckCircle2 className="h-3 w-3" /> Concluída
                </Badge>
              ) : (
                <Badge variant="secondary" className="text-[10px] gap-1 bg-blue-100 text-blue-700">
                  <Clock className="h-3 w-3" /> Pendente
                </Badge>
              )}
              {adiamentos.length > 0 && (
                <Badge variant="outline" className="text-[10px] gap-1 text-amber-600 border-amber-300">
                  <RotateCcw className="h-3 w-3" /> Adiada {adiamentos.length}x
                </Badge>
              )}
            </div>
          </div>

          {/* Descrição */}
          <div>
            <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wide mb-1">Descrição</p>
            <p className="text-xs whitespace-pre-wrap text-foreground bg-muted/30 rounded p-2">{tarefa.descricao}</p>
          </div>

          {/* Data reunião atual */}
          {tarefa.data_reuniao && (
            <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
              <CalendarIcon className="h-3.5 w-3.5" />
              <span>Reunião atual: <span className="font-medium text-foreground">{format(new Date(tarefa.data_reuniao), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })}</span></span>
            </div>
          )}

          {/* Conclusão */}
          {concluida && concluidor && (
            <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
              <CheckCircle2 className="h-3.5 w-3.5 text-emerald-600" />
              Concluída por {concluidor.full_name} em {format(new Date(tarefa.concluido_em!), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })}
            </div>
          )}

          {/* Histórico */}
          {historico.length > 0 && (
            <>
              <Separator />
              <div>
                <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wide mb-2">
                  Histórico ({historico.length} registro{historico.length > 1 ? "s" : ""})
                </p>
                <div className="space-y-2">
                  {historico.map((h, idx) => {
                    const hProfile = profiles[h.user_id];
                    return (
                      <div key={h.id} className="border rounded p-2.5 bg-muted/20 space-y-1.5 relative">
                        <div className="absolute -left-[1px] top-3 w-1 h-4 rounded-r" style={{ backgroundColor: h.tipo === "adiamento" ? "hsl(var(--accent))" : "hsl(142 76% 36%)" }} />
                        <div className="flex items-center gap-1.5 text-[10px] text-muted-foreground">
                          <UserAvatar avatarUrl={hProfile?.avatar_url} fullName={hProfile?.full_name} size="xs" />
                          <span className="font-medium">{hProfile?.full_name || "Usuário"}</span>
                          <span>•</span>
                          <span>{format(new Date(h.created_at), "dd/MM/yy HH:mm", { locale: ptBR })}</span>
                          <Badge
                            variant={h.tipo === "adiamento" ? "outline" : "secondary"}
                            className="text-[9px] ml-auto"
                          >
                            {h.tipo === "adiamento" ? `Adiamento #${adiamentos.indexOf(h) + 1}` : "Conclusão"}
                          </Badge>
                        </div>
                        <p className="text-[11px] text-foreground pl-1">{h.resposta}</p>
                        {h.tipo === "adiamento" && h.data_anterior && h.data_nova && (
                          <div className="text-[10px] text-muted-foreground pl-1 flex items-center gap-1">
                            <CalendarIcon className="h-3 w-3" />
                            {format(new Date(h.data_anterior), "dd/MM/yy HH:mm")} → {format(new Date(h.data_nova), "dd/MM/yy HH:mm")}
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            </>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
