import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Loader2, Save } from "lucide-react";
import { useChatParametrosQueries } from "../useChatParametrosQueries";
import { useChatParametrosForm } from "../useChatParametrosForm";
import { DIAS_SEMANA, DISTRIBUICAO_TIPOS, DEFAULT_HORARIOS_POR_DIA } from "../constants";
import type { HorariosPorDia } from "../types";
import { useAuth } from "@/context/AuthContext";
import { setPref } from "@/hooks/useNotificacaoChat";

export function ConfigGeralTab() {
  const { configQuery } = useChatParametrosQueries();
  const { salvarConfig } = useChatParametrosForm();
  const config = configQuery.data;
  const { user } = useAuth();
  const userId = user?.id || "";

  // Per-user notification prefs
  const [notifSom, setNotifSom] = useState(() => {
    try { const v = localStorage.getItem(`chat_notif_som_${userId}`); return v === null ? true : v === "true"; } catch { return true; }
  });
  const [notifBrowser, setNotifBrowser] = useState(() => {
    try { const v = localStorage.getItem(`chat_notif_browser_${userId}`); return v === null ? true : v === "true"; } catch { return true; }
  });

  const [form, setForm] = useState({
    id: "",
    ativo: true,
    horarios_por_dia: DEFAULT_HORARIOS_POR_DIA as HorariosPorDia,
    mensagem_boas_vindas: "Olá! Bem-vindo(a) à Softplus Tecnologia! 😊",
    mensagem_fora_horario: "Olá! Nosso horário de atendimento é de {horario_inicio} às {horario_fim}. Deixe sua mensagem e retornaremos em breve!",
    mensagem_aguardando: "Aguarde um instante, nossa equipe já vai lhe atender. 🤗\n⏳ Espera estimada: 1 a 10 min.",
    mensagem_encerramento: "Obrigado pelo contato! Foi um prazer atendê-lo. 😊",
    mensagem_nps: "Como você avalia nosso atendimento?\n1 - Péssimo 😞\n2 - Ruim 😕\n3 - Regular 😐\n4 - Bom 😊\n5 - Excelente 🌟",
    mensagem_plantao: "🚨 *Atenção: Estamos em regime de plantão.* Atendemos apenas casos emergenciais neste horário. Descreva sua situação e retornaremos o mais breve possível.",
    distribuicao_tipo: "manual",
    max_conversas_por_atendente: 10,
    tempo_espera_estimado: "1 a 10 min",
  });

  useEffect(() => {
    if (config) {
      setForm({
        id: config.id,
        ativo: config.ativo ?? true,
        horarios_por_dia: (config as any).horarios_por_dia ?? DEFAULT_HORARIOS_POR_DIA,
        mensagem_boas_vindas: config.mensagem_boas_vindas ?? "",
        mensagem_fora_horario: config.mensagem_fora_horario ?? "",
        mensagem_aguardando: config.mensagem_aguardando ?? "",
        mensagem_encerramento: config.mensagem_encerramento ?? "",
        mensagem_nps: config.mensagem_nps ?? "",
        mensagem_plantao: (config as any).mensagem_plantao ?? "🚨 *Atenção: Estamos em regime de plantão.* Atendemos apenas casos emergenciais neste horário. Descreva sua situação e retornaremos o mais breve possível.",
        distribuicao_tipo: config.distribuicao_tipo ?? "manual",
        max_conversas_por_atendente: config.max_conversas_por_atendente ?? 10,
        tempo_espera_estimado: config.tempo_espera_estimado ?? "1 a 10 min",
      });
    }
  }, [config]);

  const updatePeriodo = (dia: string, periodo: "atendimento" | "plantao", field: string, value: any) => {
    setForm((prev) => ({
      ...prev,
      horarios_por_dia: {
        ...prev.horarios_por_dia,
        [dia]: {
          ...prev.horarios_por_dia[dia],
          [periodo]: {
            ...prev.horarios_por_dia[dia][periodo],
            [field]: value,
          },
        },
      },
    }));
  };

  const handleSave = () => salvarConfig.mutate(form);

  const isNew = !config;

  if (configQuery.isLoading) {
    return <div className="flex justify-center py-12"><Loader2 className="h-6 w-6 animate-spin text-muted-foreground" /></div>;
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Status do Chat</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center gap-4">
            <Label className="w-20">Ativo</Label>
            <Switch checked={form.ativo} onCheckedChange={(v) => setForm((p) => ({ ...p, ativo: v }))} />
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Horários de Atendimento por Dia</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="border rounded-lg overflow-hidden">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-muted/50 border-b">
                  <th className="text-left p-3 w-28 font-medium">Dia</th>
                  <th className="text-left p-3 w-28 font-medium">Período</th>
                  <th className="text-center p-3 w-16 font-medium">Ativo</th>
                  <th className="text-left p-3 font-medium">Início</th>
                  <th className="text-left p-3 font-medium">Fim</th>
                </tr>
              </thead>
              <tbody>
                {DIAS_SEMANA.map((d) => {
                  const dia = form.horarios_por_dia[String(d.value)];
                  if (!dia) return null;
                  return (
                    <tr key={d.value} className="border-b last:border-b-0">
                      <td className="p-3 font-medium align-top" rowSpan={1}>
                        <div className="flex flex-col gap-3">
                          <span className="font-semibold text-foreground">{d.label}</span>
                        </div>
                      </td>
                      <td colSpan={4} className="p-0">
                        {/* Atendimento */}
                        <div className="flex items-center gap-3 p-2 border-b border-dashed">
                          <span className="w-28 flex items-center gap-1.5 text-xs font-medium">
                            <span className="h-2.5 w-2.5 rounded-full bg-green-500 inline-block" />
                            Atendimento
                          </span>
                          <Switch
                            checked={dia.atendimento.ativo}
                            onCheckedChange={(v) => updatePeriodo(String(d.value), "atendimento", "ativo", v)}
                          />
                          <Input
                            type="time"
                            className="w-28 h-8 text-xs"
                            value={dia.atendimento.inicio}
                            disabled={!dia.atendimento.ativo}
                            onChange={(e) => updatePeriodo(String(d.value), "atendimento", "inicio", e.target.value)}
                          />
                          <span className="text-xs text-muted-foreground">às</span>
                          <Input
                            type="time"
                            className="w-28 h-8 text-xs"
                            value={dia.atendimento.fim}
                            disabled={!dia.atendimento.ativo}
                            onChange={(e) => updatePeriodo(String(d.value), "atendimento", "fim", e.target.value)}
                          />
                        </div>
                        {/* Plantão */}
                        <div className="flex items-center gap-3 p-2">
                          <span className="w-28 flex items-center gap-1.5 text-xs font-medium">
                            <span className="h-2.5 w-2.5 rounded-full bg-amber-500 inline-block" />
                            Plantão
                          </span>
                          <Switch
                            checked={dia.plantao.ativo}
                            onCheckedChange={(v) => updatePeriodo(String(d.value), "plantao", "ativo", v)}
                          />
                          <Input
                            type="time"
                            className="w-28 h-8 text-xs"
                            value={dia.plantao.inicio}
                            disabled={!dia.plantao.ativo}
                            onChange={(e) => updatePeriodo(String(d.value), "plantao", "inicio", e.target.value)}
                          />
                          <span className="text-xs text-muted-foreground">às</span>
                          <Input
                            type="time"
                            className="w-28 h-8 text-xs"
                            value={dia.plantao.fim}
                            disabled={!dia.plantao.ativo}
                            onChange={(e) => updatePeriodo(String(d.value), "plantao", "fim", e.target.value)}
                          />
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Mensagens</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <Label>Mensagem de Boas-vindas</Label>
            <Textarea rows={2} value={form.mensagem_boas_vindas} onChange={(e) => setForm((p) => ({ ...p, mensagem_boas_vindas: e.target.value }))} />
          </div>
          <div>
            <Label>Mensagem Fora do Horário</Label>
            <Textarea rows={2} value={form.mensagem_fora_horario} onChange={(e) => setForm((p) => ({ ...p, mensagem_fora_horario: e.target.value }))} />
          </div>
          <div>
            <Label>Mensagem Aguardando</Label>
            <Textarea rows={2} value={form.mensagem_aguardando} onChange={(e) => setForm((p) => ({ ...p, mensagem_aguardando: e.target.value }))} />
          </div>
          <div>
            <Label>Mensagem Encerramento</Label>
            <Textarea rows={2} value={form.mensagem_encerramento} onChange={(e) => setForm((p) => ({ ...p, mensagem_encerramento: e.target.value }))} />
          </div>
          <div>
            <Label>Mensagem NPS</Label>
            <Textarea rows={3} value={form.mensagem_nps} onChange={(e) => setForm((p) => ({ ...p, mensagem_nps: e.target.value }))} />
          </div>
          <div>
            <Label>🚨 Mensagem de Plantão</Label>
            <Textarea rows={3} value={form.mensagem_plantao} onChange={(e) => setForm((p) => ({ ...p, mensagem_plantao: e.target.value }))} />
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Distribuição</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label>Tipo de Distribuição</Label>
              <Select value={form.distribuicao_tipo} onValueChange={(v) => setForm((p) => ({ ...p, distribuicao_tipo: v }))}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {DISTRIBUICAO_TIPOS.map((t) => (
                    <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Máx. conversas por atendente</Label>
              <Input type="number" min={1} value={form.max_conversas_por_atendente} onChange={(e) => setForm((p) => ({ ...p, max_conversas_por_atendente: Number(e.target.value) }))} />
            </div>
          </div>
          <div>
            <Label>Tempo de espera estimado</Label>
            <Input value={form.tempo_espera_estimado} onChange={(e) => setForm((p) => ({ ...p, tempo_espera_estimado: e.target.value }))} />
          </div>
        </CardContent>
      </Card>

      {/* Notification Preferences (per-user, localStorage) */}
      <Card>
        <CardHeader><CardTitle className="text-lg">Notificações do Chat</CardTitle></CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between">
            <Label>Som de notificação</Label>
            <Switch
              checked={notifSom}
              onCheckedChange={(v) => { setNotifSom(v); setPref(userId, "som", v); }}
            />
          </div>
          <div className="flex items-center justify-between">
            <Label>Notificação do navegador</Label>
            <Switch
              checked={notifBrowser}
              onCheckedChange={(v) => { setNotifBrowser(v); setPref(userId, "browser", v); }}
            />
          </div>
        </CardContent>
      </Card>

      <div className="flex items-center justify-between">
        {isNew && (
          <p className="text-sm text-amber-600 font-medium">⚠️ Configurações ainda não salvas no banco. Clique em Salvar.</p>
        )}
        <Button onClick={handleSave} disabled={salvarConfig.isPending} className="ml-auto">
          {salvarConfig.isPending ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Save className="h-4 w-4 mr-2" />}
          Salvar Configurações
        </Button>
      </div>
    </div>
  );
}
