import { useState } from "react";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Button } from "@/components/ui/button";
import { ChevronDown, X, Building2 } from "lucide-react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

export interface AlertLevel {
  nivel: number;
  template_id: string;
  usuario_ids: string[];
  horas_apos_sla: string;
  ativo: boolean;
}

export interface FilialAlertConfig {
  filial_id: string;
  whatsappLevels: AlertLevel[];
  notifLevels: AlertLevel[];
}

interface Props {
  canal: "whatsapp" | "notificacao";
  canalLabel: string;
  enabled: boolean;
  onEnabledChange: (v: boolean) => void;
  filiais: { id: string; nome: string }[];
  filialConfigs: Record<string, AlertLevel[]>;
  onFilialLevelChange: (filialId: string, nivel: number, field: keyof AlertLevel, value: any) => void;
  templates: { id: string; nome: string }[];
  usuarios: { id: string; full_name: string }[];
}

const LEVEL_LABELS = [
  { nivel: 1, label: "1º Lembrete", desc: "Enviado ao responsável direto", color: "bg-yellow-100 text-yellow-800 border-yellow-300" },
  { nivel: 2, label: "2º Lembrete", desc: "Reforço após tempo adicional", color: "bg-orange-100 text-orange-800 border-orange-300" },
  { nivel: 3, label: "3º Lembrete (Gestor)", desc: "Escala para o gestor", color: "bg-red-100 text-red-800 border-red-300" },
];

export const defaultAlertLevel = (nivel: number): AlertLevel => ({
  nivel,
  template_id: "",
  usuario_ids: [],
  horas_apos_sla: "0",
  ativo: nivel === 1,
});

function MultiUserSelect({
  selectedIds,
  onChange,
  usuarios,
}: {
  selectedIds: string[];
  onChange: (ids: string[]) => void;
  usuarios: { id: string; full_name: string }[];
}) {
  const [open, setOpen] = useState(false);

  const toggleUser = (id: string) => {
    if (selectedIds.includes(id)) {
      onChange(selectedIds.filter((uid) => uid !== id));
    } else {
      onChange([...selectedIds, id]);
    }
  };

  const selectedNames = usuarios.filter((u) => selectedIds.includes(u.id));

  return (
    <div className="space-y-1.5 mt-1">
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <Button
            variant="outline"
            role="combobox"
            className="w-full justify-between font-normal h-auto min-h-10"
          >
            <span className="text-sm truncate text-muted-foreground">
              {selectedIds.length === 0
                ? "Selecione usuários..."
                : `${selectedIds.length} usuário(s) selecionado(s)`}
            </span>
            <ChevronDown className="h-4 w-4 shrink-0 opacity-50" />
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-[--radix-popover-trigger-width] p-0" align="start">
          <div className="max-h-56 overflow-y-auto p-1">
            {usuarios.map((u) => (
              <label
                key={u.id}
                className="flex items-center gap-2 px-2 py-1.5 rounded-sm cursor-pointer hover:bg-accent text-sm"
              >
                <Checkbox
                  checked={selectedIds.includes(u.id)}
                  onCheckedChange={() => toggleUser(u.id)}
                />
                {u.full_name}
              </label>
            ))}
          </div>
        </PopoverContent>
      </Popover>
      {selectedNames.length > 0 && (
        <div className="flex flex-wrap gap-1">
          {selectedNames.map((u) => (
            <Badge key={u.id} variant="secondary" className="text-xs gap-1 pr-1">
              {u.full_name}
              <button
                type="button"
                onClick={() => onChange(selectedIds.filter((id) => id !== u.id))}
                className="ml-0.5 hover:text-destructive"
              >
                <X className="h-3 w-3" />
              </button>
            </Badge>
          ))}
        </div>
      )}
    </div>
  );
}

function AlertLevelsConfig({
  levels,
  onLevelChange,
  templates,
  usuarios,
}: {
  levels: AlertLevel[];
  onLevelChange: (nivel: number, field: keyof AlertLevel, value: any) => void;
  templates: { id: string; nome: string }[];
  usuarios: { id: string; full_name: string }[];
}) {
  return (
    <div className="space-y-4">
      {LEVEL_LABELS.map((lvl) => {
        const level = levels.find((l) => l.nivel === lvl.nivel) || defaultAlertLevel(lvl.nivel);
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
                  <label className="text-xs font-medium text-muted-foreground">Usuários Responsáveis</label>
                  <MultiUserSelect
                    selectedIds={level.usuario_ids}
                    onChange={(ids) => onLevelChange(lvl.nivel, "usuario_ids", ids)}
                    usuarios={usuarios}
                  />
                </div>
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}

export function EtapaAlertasConfig({
  canal,
  canalLabel,
  enabled,
  onEnabledChange,
  filiais,
  filialConfigs,
  onFilialLevelChange,
  templates,
  usuarios,
}: Props) {
  const [activeFilial, setActiveFilial] = useState(filiais[0]?.id || "");

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <label className="text-sm font-medium">Alerta {canalLabel}</label>
        <Switch checked={enabled} onCheckedChange={onEnabledChange} />
      </div>
      {enabled && filiais.length > 0 && (
        <div className="space-y-3 pl-4 border-l-2 border-primary/20">
          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            <Building2 className="h-3.5 w-3.5" />
            <span>Configure os responsáveis por filial</span>
          </div>
          <Tabs value={activeFilial} onValueChange={setActiveFilial}>
            <TabsList className="w-full flex-wrap h-auto gap-1 bg-muted/50">
              {filiais.map((f) => (
                <TabsTrigger key={f.id} value={f.id} className="text-xs">
                  {f.nome}
                </TabsTrigger>
              ))}
            </TabsList>
            {filiais.map((f) => (
              <TabsContent key={f.id} value={f.id}>
                <AlertLevelsConfig
                  levels={filialConfigs[f.id] || [1, 2, 3].map(defaultAlertLevel)}
                  onLevelChange={(nivel, field, value) => onFilialLevelChange(f.id, nivel, field, value)}
                  templates={templates}
                  usuarios={usuarios}
                />
              </TabsContent>
            ))}
          </Tabs>
        </div>
      )}
    </div>
  );
}
