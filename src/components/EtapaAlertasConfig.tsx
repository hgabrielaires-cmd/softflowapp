import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";

interface AlertLevel {
  nivel: number;
  template_id: string;
  usuario_id: string;
  horas_apos_sla: string;
  ativo: boolean;
}

interface Props {
  canal: "whatsapp" | "notificacao";
  canalLabel: string;
  enabled: boolean;
  onEnabledChange: (v: boolean) => void;
  levels: AlertLevel[];
  onLevelChange: (nivel: number, field: keyof AlertLevel, value: any) => void;
  templates: { id: string; nome: string }[];
  usuarios: { id: string; full_name: string }[];
}

const LEVEL_LABELS = [
  { nivel: 1, label: "1º Lembrete", desc: "Enviado ao responsável direto", color: "bg-yellow-100 text-yellow-800 border-yellow-300" },
  { nivel: 2, label: "2º Lembrete", desc: "Reforço após tempo adicional", color: "bg-orange-100 text-orange-800 border-orange-300" },
  { nivel: 3, label: "3º Lembrete (Gestor)", desc: "Escala para o gestor", color: "bg-red-100 text-red-800 border-red-300" },
];

export function EtapaAlertasConfig({ canal, canalLabel, enabled, onEnabledChange, levels, onLevelChange, templates, usuarios }: Props) {
  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <label className="text-sm font-medium">Alerta {canalLabel}</label>
        <Switch checked={enabled} onCheckedChange={onEnabledChange} />
      </div>
      {enabled && (
        <div className="space-y-4 pl-4 border-l-2 border-primary/20">
          {LEVEL_LABELS.map((lvl) => {
            const level = levels.find((l) => l.nivel === lvl.nivel) || { nivel: lvl.nivel, template_id: "", usuario_id: "", horas_apos_sla: "0", ativo: true };
            return (
              <div key={lvl.nivel} className="space-y-2 p-3 rounded-lg border bg-muted/30">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Badge variant="outline" className={lvl.color}>{lvl.label}</Badge>
                    <span className="text-xs text-muted-foreground">{lvl.desc}</span>
                  </div>
                  <Switch
                    checked={level.ativo}
                    onCheckedChange={(v) => onLevelChange(lvl.nivel, "ativo", v)}
                  />
                </div>
                {level.ativo && (
                  <div className="space-y-2 mt-2">
                    {lvl.nivel > 1 && (
                      <div>
                        <label className="text-xs font-medium text-muted-foreground">Horas após SLA para disparar</label>
                        <div className="flex items-center gap-2 mt-1">
                          <Input
                            type="number"
                            min="0"
                            step="0.5"
                            value={level.horas_apos_sla}
                            onChange={(e) => onLevelChange(lvl.nivel, "horas_apos_sla", e.target.value)}
                            className="max-w-24"
                            placeholder="0"
                          />
                          <span className="text-xs text-muted-foreground">horas após o {lvl.nivel === 2 ? "1º lembrete" : "2º lembrete"}</span>
                        </div>
                      </div>
                    )}
                    <div>
                      <label className="text-xs font-medium text-muted-foreground">Template da Mensagem</label>
                      <Select value={level.template_id} onValueChange={(v) => onLevelChange(lvl.nivel, "template_id", v)}>
                        <SelectTrigger className="mt-1"><SelectValue placeholder="Selecione um template..." /></SelectTrigger>
                        <SelectContent>
                          {templates.map((t) => (
                            <SelectItem key={t.id} value={t.id}>{t.nome}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div>
                      <label className="text-xs font-medium text-muted-foreground">Usuário Responsável</label>
                      <Select value={level.usuario_id} onValueChange={(v) => onLevelChange(lvl.nivel, "usuario_id", v)}>
                        <SelectTrigger className="mt-1"><SelectValue placeholder="Selecione um usuário..." /></SelectTrigger>
                        <SelectContent>
                          {usuarios.map((u) => (
                            <SelectItem key={u.id} value={u.id}>{u.full_name}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
