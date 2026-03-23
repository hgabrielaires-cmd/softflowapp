import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { Loader2, Save } from "lucide-react";
import { useChatParametrosQueries } from "../useChatParametrosQueries";
import { useChatParametrosForm } from "../useChatParametrosForm";
import { DIAS_SEMANA, DISTRIBUICAO_TIPOS } from "../constants";

export function ConfigGeralTab() {
  const { configQuery } = useChatParametrosQueries();
  const { salvarConfig } = useChatParametrosForm();
  const config = configQuery.data;

  const [form, setForm] = useState({
    id: "",
    ativo: true,
    horario_inicio: "08:00",
    horario_fim: "23:59",
    dias_semana: [1, 2, 3, 4, 5, 6] as number[],
    mensagem_boas_vindas: "Olá! Bem-vindo(a) à Softplus Tecnologia! 😊",
    mensagem_fora_horario: "Olá! Nosso horário de atendimento é de {horario_inicio} às {horario_fim}. Deixe sua mensagem e retornaremos em breve!",
    mensagem_aguardando: "Aguarde um instante, nossa equipe já vai lhe atender. 🤗\n⏳ Espera estimada: 1 a 10 min.",
    mensagem_encerramento: "Obrigado pelo contato! Foi um prazer atendê-lo. 😊",
    mensagem_nps: "Como você avalia nosso atendimento?\n1 - Péssimo 😞\n2 - Ruim 😕\n3 - Regular 😐\n4 - Bom 😊\n5 - Excelente 🌟",
    distribuicao_tipo: "manual",
    max_conversas_por_atendente: 10,
    tempo_espera_estimado: "1 a 10 min",
  });

  useEffect(() => {
    if (config) {
      setForm({
        id: config.id,
        ativo: config.ativo ?? true,
        horario_inicio: config.horario_inicio ?? "08:00",
        horario_fim: config.horario_fim ?? "23:59",
        dias_semana: config.dias_semana ?? [1, 2, 3, 4, 5, 6],
        mensagem_boas_vindas: config.mensagem_boas_vindas ?? "",
        mensagem_fora_horario: config.mensagem_fora_horario ?? "",
        mensagem_aguardando: config.mensagem_aguardando ?? "",
        mensagem_encerramento: config.mensagem_encerramento ?? "",
        mensagem_nps: config.mensagem_nps ?? "",
        distribuicao_tipo: config.distribuicao_tipo ?? "manual",
        max_conversas_por_atendente: config.max_conversas_por_atendente ?? 10,
        tempo_espera_estimado: config.tempo_espera_estimado ?? "1 a 10 min",
      });
    }
  }, [config]);

  const toggleDia = (dia: number) => {
    setForm((prev) => ({
      ...prev,
      dias_semana: prev.dias_semana.includes(dia)
        ? prev.dias_semana.filter((d) => d !== dia)
        : [...prev.dias_semana, dia].sort(),
    }));
  };

  const handleSave = () => salvarConfig.mutate(form);

  if (configQuery.isLoading) {
    return <div className="flex justify-center py-12"><Loader2 className="h-6 w-6 animate-spin text-muted-foreground" /></div>;
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Horário de Atendimento</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center gap-4">
            <Label className="w-20">Ativo</Label>
            <Switch checked={form.ativo} onCheckedChange={(v) => setForm((p) => ({ ...p, ativo: v }))} />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label>Início</Label>
              <Input type="time" value={form.horario_inicio} onChange={(e) => setForm((p) => ({ ...p, horario_inicio: e.target.value }))} />
            </div>
            <div>
              <Label>Fim</Label>
              <Input type="time" value={form.horario_fim} onChange={(e) => setForm((p) => ({ ...p, horario_fim: e.target.value }))} />
            </div>
          </div>
          <div>
            <Label>Dias da semana</Label>
            <div className="flex gap-3 mt-2 flex-wrap">
              {DIAS_SEMANA.map((d) => (
                <label key={d.value} className="flex items-center gap-1.5 text-sm">
                  <Checkbox
                    checked={form.dias_semana.includes(d.value)}
                    onCheckedChange={() => toggleDia(d.value)}
                  />
                  {d.label}
                </label>
              ))}
            </div>
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

      <div className="flex justify-end">
        <Button onClick={handleSave} disabled={salvarConfig.isPending}>
          {salvarConfig.isPending ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Save className="h-4 w-4 mr-2" />}
          Salvar Configurações
        </Button>
      </div>
    </div>
  );
}
