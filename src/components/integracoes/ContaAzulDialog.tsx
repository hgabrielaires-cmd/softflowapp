import { useEffect, useState } from "react";
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Loader2, Info, CheckCircle2, RefreshCw, Link2, Unlink, Clock, X, Plus, Save } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import logoContaAzul from "@/assets/logo-contaazul.svg";

const FUNCTIONS_BASE = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1`;

interface ContaAzulConfigDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  initialConfig?: { ativo?: boolean; config?: any } | null;
  onSaved?: () => void;
}

interface SyncLog {
  id: string;
  periodo_inicio: string | null;
  periodo_fim: string | null;
  registros_importados: number;
  registros_ignorados: number;
  status: string;
  erro: string | null;
  created_at: string;
}

function fmtDataHora(v?: string | null) {
  if (!v) return "—";
  return new Date(v).toLocaleString("pt-BR", { day: "2-digit", month: "2-digit", hour: "2-digit", minute: "2-digit" });
}

export function ContaAzulConfigDialog({ open, onOpenChange, initialConfig, onSaved }: ContaAzulConfigDialogProps) {
  const [loading, setLoading] = useState(false);
  const [syncing, setSyncing] = useState(false);
  const [conectado, setConectado] = useState(false);
  const [ultimaSync, setUltimaSync] = useState<string | null>(null);
  const [autoSync, setAutoSync] = useState<boolean>(initialConfig?.ativo ?? false);
  const [filiais, setFiliais] = useState<{ id: string; nome: string }[]>([]);
  const [filialId, setFilialId] = useState<string>("");
  const [logs, setLogs] = useState<SyncLog[]>([]);
  const [horarios, setHorarios] = useState<string[]>([]);
  const [novoHorario, setNovoHorario] = useState("");
  const [salvandoHorarios, setSalvandoHorarios] = useState(false);
  const [crons, setCrons] = useState<{ jobname: string; schedule: string; active: boolean }[]>([]);

  async function carregarHorarios(fId: string) {
    if (!fId) return;
    const { data } = await supabase
      .from("contaazul_config")
      .select("horarios_sync")
      .eq("filial_id", fId)
      .maybeSingle();
    setHorarios([...((data?.horarios_sync as string[]) ?? [])].sort());
  }

  async function carregar() {
    setLoading(true);
    const [{ data: tokens }, { data: logsData }, { data: filiaisData }, { data: cronsData }] = await Promise.all([
      supabase.from("contaazul_tokens").select("filial_id, updated_at").order("updated_at", { ascending: false }),
      supabase.from("contaazul_sync_log").select("*").order("created_at", { ascending: false }).limit(10),
      supabase.from("filiais").select("id, nome").eq("ativa", true).order("nome"),
      supabase.rpc("fn_listar_crons_contaazul"),
    ]);
    setConectado((tokens?.length ?? 0) > 0);
    setLogs((logsData as SyncLog[]) ?? []);
    setFiliais(filiaisData ?? []);
    setCrons((cronsData as any[]) ?? []);
    setUltimaSync(logsData?.[0]?.created_at ?? null);
    const fId = filialId || filiaisData?.[0]?.id || "";
    if (!filialId && fId) setFilialId(fId);
    await carregarHorarios(fId);
    setLoading(false);
  }

  useEffect(() => {
    if (open) carregar();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  useEffect(() => {
    if (open && filialId) carregarHorarios(filialId);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filialId]);

  useEffect(() => {
    setAutoSync(initialConfig?.ativo ?? false);
  }, [initialConfig]);

  function adicionarHorario() {
    if (!novoHorario || !/^\d{2}:\d{2}$/.test(novoHorario)) {
      toast.error("Informe um horário válido (HH:MM)");
      return;
    }
    if (horarios.includes(novoHorario)) {
      toast.error("Horário já cadastrado");
      return;
    }
    setHorarios([...horarios, novoHorario].sort());
    setNovoHorario("");
  }

  function removerHorario(h: string) {
    setHorarios(horarios.filter((x) => x !== h));
  }

  async function salvarHorarios() {
    if (!filialId) { toast.error("Selecione a filial"); return; }
    setSalvandoHorarios(true);
    const { error } = await supabase
      .from("contaazul_config")
      .upsert(
        { filial_id: filialId, horarios_sync: horarios, updated_at: new Date().toISOString() },
        { onConflict: "filial_id" },
      );
    if (error) {
      setSalvandoHorarios(false);
      toast.error("Erro ao salvar horários: " + error.message);
      return;
    }
    const { error: rpcErr } = await supabase.rpc("fn_recriar_crons_contaazul", {
      p_horarios: horarios,
      p_apikey: import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY as string,
    });
    setSalvandoHorarios(false);
    if (rpcErr) { toast.error("Erro ao recriar agendamentos: " + rpcErr.message); return; }
    toast.success(
      horarios.length
        ? `${horarios.length} horário(s) salvos! Próxima sync: ${proximoHorario() ?? horarios[0]}`
        : "Agendamentos removidos",
    );
    const { data: cronsData } = await supabase.rpc("fn_listar_crons_contaazul");
    setCrons((cronsData as any[]) ?? []);
  }

  function minutosAgora() {
    const n = new Date();
    return n.getHours() * 60 + n.getMinutes();
  }

  function paraMinutos(h: string) {
    const [hh, mm] = h.split(":").map(Number);
    return hh * 60 + mm;
  }

  function proximoHorario() {
    return horarios.find((h) => paraMinutos(h) > minutosAgora());
  }


  function conectar() {
    if (!filialId) { toast.error("Selecione a filial"); return; }
    window.open(`${FUNCTIONS_BASE}/contaazul-oauth?action=authorize&filial_id=${filialId}`, "_blank");
  }

  async function desconectar() {
    setLoading(true);
    const { error } = await supabase.from("contaazul_tokens").delete().not("id", "is", null);
    setLoading(false);
    if (error) { toast.error("Erro ao desconectar: " + error.message); return; }
    toast.success("Conta Azul desconectada");
    carregar();
  }

  async function sincronizar() {
    setSyncing(true);
    const { data, error } = await supabase.functions.invoke("contaazul-sync", {
      body: { periodo: "mes", filial_id: filialId || null },
    });
    setSyncing(false);
    if (error) { toast.error("Falha na sincronização"); return; }
    if ((data as any)?.error) { toast.error((data as any).error); carregar(); return; }
    toast.success(`Sincronização concluída: ${(data as any)?.importados ?? 0} importados`);
    carregar();
  }

  async function salvarAutoSync(valor: boolean) {
    setAutoSync(valor);
    const { data: existing } = await supabase
      .from("integracoes_config").select("id").eq("nome", "contaazul").maybeSingle();
    const payload: any = { ativo: valor, config: { auto_sync: valor } };
    if (existing?.id) await supabase.from("integracoes_config").update(payload).eq("id", existing.id);
    else await supabase.from("integracoes_config").insert({ nome: "contaazul", ...payload });
    toast.success(valor ? "Sincronização automática ativada" : "Sincronização automática desativada");
    onSaved?.();
  }

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="w-full sm:max-w-lg overflow-y-auto">
        <SheetHeader>
          <div className="flex items-center gap-3">
            <img src={logoContaAzul} alt="Conta Azul" className="h-10 w-10 rounded-xl" />
            <div>
              <SheetTitle>Conta Azul</SheetTitle>
              <SheetDescription>Importação automática de receitas recebidas</SheetDescription>
            </div>
          </div>
        </SheetHeader>

        {loading ? (
          <div className="flex justify-center py-10"><Loader2 className="h-5 w-5 animate-spin text-muted-foreground" /></div>
        ) : (
          <div className="space-y-5 py-6">
            <div className="flex items-center justify-between rounded-lg border border-border p-3">
              <div className="space-y-1">
                {conectado ? (
                  <Badge className="gap-1"><CheckCircle2 className="h-3 w-3" /> Conectado</Badge>
                ) : (
                  <Badge variant="outline" className="gap-1">Desconectado</Badge>
                )}
                <p className="text-xs text-muted-foreground">Última sincronização: {fmtDataHora(ultimaSync)}</p>
              </div>
              {conectado ? (
                <div className="flex gap-2">
                  <Button size="sm" onClick={sincronizar} disabled={syncing} className="gap-1.5">
                    {syncing ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <RefreshCw className="h-3.5 w-3.5" />}
                    Sincronizar agora
                  </Button>
                  <Button size="sm" variant="outline" onClick={desconectar} className="gap-1.5">
                    <Unlink className="h-3.5 w-3.5" /> Desconectar
                  </Button>
                </div>
              ) : (
                <Button size="sm" onClick={conectar} className="gap-1.5">
                  <Link2 className="h-3.5 w-3.5" /> Conectar Conta Azul
                </Button>
              )}
            </div>

            <div className="space-y-2">
              <Label>Filial</Label>
              <Select value={filialId} onValueChange={setFilialId}>
                <SelectTrigger><SelectValue placeholder="Selecione a filial" /></SelectTrigger>
                <SelectContent>
                  {filiais.map((f) => (<SelectItem key={f.id} value={f.id}>{f.nome}</SelectItem>))}
                </SelectContent>
              </Select>
            </div>

            <div className="flex items-center justify-between rounded-lg border border-border p-3">
              <div>
                <Label className="text-sm">Sincronização automática diária</Label>
                <p className="text-xs text-muted-foreground">Nos horários configurados abaixo (BRT)</p>
              </div>
              <Switch checked={autoSync} onCheckedChange={salvarAutoSync} />
            </div>

            <div className="space-y-3 rounded-lg border border-border p-3">
              <div>
                <Label className="flex items-center gap-1.5 text-sm">
                  <Clock className="h-4 w-4" /> Horários de Sincronização
                </Label>
                <p className="text-xs text-muted-foreground">
                  O sistema buscará receitas da Conta Azul nestes horários (BRT)
                </p>
              </div>

              <div className="space-y-1.5">
                {horarios.length === 0 ? (
                  <p className="text-xs text-muted-foreground">Nenhum horário cadastrado.</p>
                ) : (
                  horarios.map((h) => {
                    const passou = paraMinutos(h) <= minutosAgora();
                    const proximo = proximoHorario() === h;
                    return (
                      <div key={h} className="flex items-center justify-between rounded-md border border-border px-3 py-1.5">
                        <span className="flex items-center gap-2 text-sm tabular-nums">
                          <Clock className="h-3.5 w-3.5 text-muted-foreground" /> {h}
                          {passou ? (
                            <Badge variant="outline" className="text-[10px]">concluída</Badge>
                          ) : proximo ? (
                            <Badge className="text-[10px]">próxima</Badge>
                          ) : null}
                        </span>
                        <Button size="icon" variant="ghost" className="h-7 w-7" onClick={() => removerHorario(h)}>
                          <X className="h-3.5 w-3.5" />
                        </Button>
                      </div>
                    );
                  })
                )}
              </div>

              <div className="flex gap-2">
                <Input
                  type="time"
                  value={novoHorario}
                  onChange={(e) => setNovoHorario(e.target.value)}
                  className="w-36"
                />
                <Button size="sm" variant="outline" onClick={adicionarHorario} className="gap-1.5">
                  <Plus className="h-3.5 w-3.5" /> Adicionar
                </Button>
              </div>

              <Button size="sm" onClick={salvarHorarios} disabled={salvandoHorarios} className="w-full gap-1.5">
                {salvandoHorarios ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Save className="h-3.5 w-3.5" />}
                Salvar Horários
              </Button>

              {crons.length > 0 && (
                <div className="rounded-md bg-muted/40 p-2 text-[11px] text-muted-foreground">
                  <p className="mb-1 font-medium">Agendamentos ativos (UTC):</p>
                  {crons.map((c) => (
                    <p key={c.jobname} className="tabular-nums">
                      {c.jobname} · {c.schedule} {c.active ? "" : "(inativo)"}
                    </p>
                  ))}
                </div>
              )}
            </div>

            <div className="space-y-3 rounded-lg border border-border p-3">
              <div>
                <Label className="text-sm">Reprocessar taxas de boleto</Label>
                <p className="text-xs text-muted-foreground">
                  Gera as taxas dos recebimentos já importados no mês selecionado (não duplica).
                </p>
              </div>
              <div className="flex gap-2">
                <Select value={String(mesTaxa)} onValueChange={(v) => setMesTaxa(Number(v))}>
                  <SelectTrigger className="w-32"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {MESES.map((m, i) => (<SelectItem key={m} value={String(i + 1)}>{m}</SelectItem>))}
                  </SelectContent>
                </Select>
                <Input
                  type="number"
                  className="w-24"
                  value={anoTaxa}
                  onChange={(e) => setAnoTaxa(Number(e.target.value))}
                />
                <Button size="sm" variant="outline" onClick={reprocessarTaxas} disabled={reprocessando} className="gap-1.5">
                  {reprocessando ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <RefreshCw className="h-3.5 w-3.5" />}
                  Reprocessar
                </Button>
              </div>
            </div>


            <div className="flex items-start gap-2 rounded-lg border border-border bg-muted/40 p-3 text-xs text-muted-foreground">
              <Info className="h-4 w-4 mt-0.5 shrink-0" />
              <span>
                Os recebimentos pagos (boleto/PIX) são lançados como entrada na conta financeira
                <strong> CONTA AZUL</strong>, sem duplicar registros já importados.
              </span>
            </div>

            <div className="space-y-2">
              <Label className="text-sm">Histórico de sincronizações</Label>
              <div className="rounded-lg border border-border divide-y divide-border">
                {logs.length === 0 ? (
                  <p className="p-3 text-xs text-muted-foreground">Nenhuma sincronização registrada.</p>
                ) : (
                  logs.map((l) => (
                    <div key={l.id} className="flex items-center justify-between p-3 text-xs">
                      <span className="text-muted-foreground">{fmtDataHora(l.created_at)}</span>
                      <span>{l.registros_importados} importados · {l.registros_ignorados} ignorados</span>
                      <Badge variant={l.status === "sucesso" ? "outline" : "destructive"} className="text-[10px]">
                        {l.status}
                      </Badge>
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>
        )}
      </SheetContent>
    </Sheet>
  );
}
