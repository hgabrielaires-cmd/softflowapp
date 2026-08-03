import { useEffect, useState } from "react";
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Loader2, Info, CheckCircle2, XCircle, Webhook, Zap, Plus, Trash2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import logoTelegram from "@/assets/logo-telegram.svg";
import logoAnthropic from "@/assets/logo-anthropic.svg";

type TestResult = { ok: boolean; message: string } | null;

async function saveIntegracao(nome: string, ativo: boolean, config: Record<string, unknown>) {
  const { data: existing } = await supabase
    .from("integracoes_config")
    .select("id")
    .eq("nome", nome)
    .maybeSingle();

  const payload: any = { ativo, config };
  if (existing?.id) {
    const { error } = await supabase.from("integracoes_config").update(payload).eq("id", existing.id);
    if (error) throw error;
  } else {
    const { error } = await supabase.from("integracoes_config").insert({ nome, ...payload });
    if (error) throw error;
  }
}

function ResultBanner({ result }: { result: TestResult }) {
  if (!result) return null;
  return (
    <div
      className={`flex items-start gap-2 rounded-lg border p-3 text-sm ${
        result.ok
          ? "border-emerald/40 bg-emerald/10 text-foreground"
          : "border-destructive/40 bg-destructive/10 text-foreground"
      }`}
    >
      {result.ok ? (
        <CheckCircle2 className="h-4 w-4 mt-0.5 shrink-0 text-emerald" />
      ) : (
        <XCircle className="h-4 w-4 mt-0.5 shrink-0 text-destructive" />
      )}
      <span>{result.message}</span>
    </div>
  );
}

function InfoCard({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex items-start gap-2 rounded-lg border border-border bg-muted/40 p-3 text-xs text-muted-foreground">
      <Info className="h-4 w-4 mt-0.5 shrink-0" />
      <span>{children}</span>
    </div>
  );
}

// ── Telegram ──

interface DialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  initialConfig: any;
  onSaved: () => void;
}

type TelegramId = { id: string; nome: string };

export function TelegramConfigDialog({ open, onOpenChange, initialConfig, onSaved }: DialogProps) {
  const [ativo, setAtivo] = useState(false);
  const [ids, setIds] = useState<TelegramId[]>([]);
  const [novoId, setNovoId] = useState("");
  const [novoNome, setNovoNome] = useState("");
  const [saving, setSaving] = useState(false);
  const [testing, setTesting] = useState(false);
  const [registering, setRegistering] = useState(false);
  const [result, setResult] = useState<TestResult>(null);

  useEffect(() => {
    setAtivo(initialConfig?.ativo ?? false);
    const lista = initialConfig?.config?.authorized_list;
    if (Array.isArray(lista) && lista.length > 0) {
      setIds(
        lista
          .map((item: any) => ({ id: String(item?.id ?? "").trim(), nome: String(item?.nome ?? "").trim() }))
          .filter((item) => item.id),
      );
    } else {
      const raw = initialConfig?.config?.authorized_ids;
      const arr = Array.isArray(raw) ? raw.map((v: unknown) => String(v)) : String(raw ?? "").split(",");
      setIds(arr.map((s) => s.trim()).filter(Boolean).map((id) => ({ id, nome: "" })));
    }
    setNovoId("");
    setNovoNome("");
    setResult(null);
  }, [initialConfig, open]);

  function addId() {
    const v = novoId.trim();
    if (!v) return;
    if (ids.some((x) => x.id === v)) {
      toast.error("Este ID já está na lista");
      return;
    }
    setIds([...ids, { id: v, nome: novoNome.trim() }]);
    setNovoId("");
    setNovoNome("");
  }


  async function handleTest() {
    setTesting(true);
    setResult(null);
    try {
      const { data, error } = await supabase.functions.invoke("integracoes-teste", {
        body: { action: "test_telegram" },
      });
      if (error) throw error;
      setResult(
        data?.ok
          ? { ok: true, message: `Bot: @${data.username} — Online!` }
          : { ok: false, message: `Erro: ${data?.error ?? "token inválido"}` },
      );
    } catch (err: any) {
      setResult({ ok: false, message: `Erro: ${err.message}` });
    } finally {
      setTesting(false);
    }
  }

  async function handleWebhook() {
    setRegistering(true);
    setResult(null);
    try {
      const { data, error } = await supabase.functions.invoke("integracoes-teste", {
        body: { action: "setup_telegram_webhook" },
      });
      if (error) throw error;
      setResult(
        data?.ok
          ? { ok: true, message: "Webhook registrado!" }
          : { ok: false, message: `Erro: ${data?.error ?? "falha ao registrar"}` },
      );
    } catch (err: any) {
      setResult({ ok: false, message: `Erro: ${err.message}` });
    } finally {
      setRegistering(false);
    }
  }

  async function handleSave() {
    setSaving(true);
    try {
      await saveIntegracao("telegram", ativo, {
        ...(initialConfig?.config ?? {}),
        authorized_ids: ids.map((x) => x.id).join(","),
        authorized_list: ids,
      });
      toast.success("Configuração do Telegram salva!");
      onSaved();
      onOpenChange(false);
    } catch (err: any) {
      toast.error("Erro ao salvar: " + err.message);
    } finally {
      setSaving(false);
    }
  }

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="w-full sm:max-w-[480px] overflow-y-auto">
        <SheetHeader>
          <div className="flex items-center gap-3">
            <img src={logoTelegram} alt="Telegram" className="h-10 w-10" />
            <div className="text-left">
              <SheetTitle>Telegram</SheetTitle>
              <SheetDescription>Recebimento de comprovantes e lançamento de despesas</SheetDescription>
            </div>
          </div>
        </SheetHeader>

        <div className="space-y-5 py-6">
          <div className="flex items-center justify-between rounded-lg border border-border p-4">
            <div>
              <Label className="text-sm font-medium">Integração ativa</Label>
              <p className="text-xs text-muted-foreground mt-0.5">
                {ativo ? "O bot do Telegram está habilitado" : "O bot do Telegram está desabilitado"}
              </p>
            </div>
            <Switch checked={ativo} onCheckedChange={setAtivo} />
          </div>

          <div className="space-y-2">
            <Label className="text-sm font-medium">IDs Autorizados</Label>
            <div className="flex gap-2">
              <Input
                value={novoId}
                onChange={(e) => setNovoId(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    e.preventDefault();
                    addId();
                  }
                }}
                placeholder="ID (ex.: 738302128)"
                className="flex-1"
              />
              <Input
                value={novoNome}
                onChange={(e) => setNovoNome(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    e.preventDefault();
                    addId();
                  }
                }}
                placeholder="Nome"
                className="flex-1"
              />
              <Button type="button" variant="outline" size="icon" onClick={addId} aria-label="Adicionar ID">
                <Plus className="h-4 w-4" />
              </Button>
            </div>
            {ids.length > 0 ? (
              <div className="space-y-1.5">
                {ids.map((item) => (
                  <div
                    key={item.id}
                    className="flex items-center justify-between rounded-lg border border-border px-3 py-2 text-sm"
                  >
                    <div className="flex flex-col">
                      <span className="font-mono">{item.id}</span>
                      {item.nome && <span className="text-xs text-muted-foreground">{item.nome}</span>}
                    </div>
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8 text-destructive"
                      onClick={() => setIds(ids.filter((x) => x.id !== item.id))}
                      aria-label={`Remover ${item.id}`}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-xs text-muted-foreground">Nenhum ID autorizado cadastrado</p>
            )}

            <p className="text-xs text-muted-foreground">Seu ID do Telegram (@userinfobot)</p>
          </div>


          <InfoCard>
            Token do Bot está configurado como secret no backend (<code>TELEGRAM_BOT_TOKEN</code>).
          </InfoCard>

          <div className="flex gap-2">
            <Button variant="outline" className="flex-1" onClick={handleTest} disabled={testing}>
              {testing ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Zap className="h-4 w-4 mr-2" />}
              Testar Conexão
            </Button>
            <Button variant="outline" className="flex-1" onClick={handleWebhook} disabled={registering}>
              {registering ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Webhook className="h-4 w-4 mr-2" />}
              Registrar Webhook
            </Button>
          </div>

          <ResultBanner result={result} />

          <div className="flex justify-end gap-2 pt-2">
            <Button variant="outline" onClick={() => onOpenChange(false)} disabled={saving}>
              Cancelar
            </Button>
            <Button onClick={handleSave} disabled={saving}>
              {saving && <Loader2 className="h-4 w-4 animate-spin mr-2" />}
              Salvar
            </Button>
          </div>
        </div>
      </SheetContent>
    </Sheet>
  );
}

// ── Anthropic (Claude) ──

const MODELOS = [
  { value: "claude-haiku-4-5", label: "claude-haiku-4-5 — Econômico", custo: "~R$ 1,50/mês" },
  { value: "claude-sonnet-4-6", label: "claude-sonnet-4-6 — Recomendado ⭐", custo: "~R$ 8,00/mês" },
  { value: "claude-opus-4-6", label: "claude-opus-4-6 — Premium", custo: "~R$ 15,00/mês" },
];

export function AnthropicConfigDialog({ open, onOpenChange, initialConfig, onSaved }: DialogProps) {
  const [ativo, setAtivo] = useState(false);
  const [model, setModel] = useState("claude-sonnet-4-6");
  const [saving, setSaving] = useState(false);
  const [testing, setTesting] = useState(false);
  const [result, setResult] = useState<TestResult>(null);

  useEffect(() => {
    setAtivo(initialConfig?.ativo ?? false);
    setModel(String(initialConfig?.config?.model ?? "claude-sonnet-4-6"));
    setResult(null);
  }, [initialConfig, open]);

  const custo = MODELOS.find((m) => m.value === model)?.custo ?? "—";

  async function handleTest() {
    setTesting(true);
    setResult(null);
    try {
      const { data, error } = await supabase.functions.invoke("integracoes-teste", {
        body: { action: "test_anthropic", model },
      });
      if (error) throw error;
      setResult(
        data?.ok
          ? { ok: true, message: `API Anthropic funcionando! Modelo: ${data.model}` }
          : { ok: false, message: `Erro: ${data?.error ?? "API key inválida"}` },
      );
    } catch (err: any) {
      setResult({ ok: false, message: `Erro: ${err.message}` });
    } finally {
      setTesting(false);
    }
  }

  async function handleSave() {
    setSaving(true);
    try {
      await saveIntegracao("anthropic", ativo, { ...(initialConfig?.config ?? {}), model });
      toast.success("Configuração do Claude salva!");
      onSaved();
      onOpenChange(false);
    } catch (err: any) {
      toast.error("Erro ao salvar: " + err.message);
    } finally {
      setSaving(false);
    }
  }

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="w-full sm:max-w-[480px] overflow-y-auto">
        <SheetHeader>
          <div className="flex items-center gap-3">
            <img src={logoAnthropic} alt="Claude" className="h-10 w-10 rounded-lg" />
            <div className="text-left">
              <SheetTitle>Claude (Anthropic)</SheetTitle>
              <SheetDescription>Leitura inteligente de comprovantes e notas fiscais</SheetDescription>
            </div>
          </div>
        </SheetHeader>

        <div className="space-y-5 py-6">
          <div className="flex items-center justify-between rounded-lg border border-border p-4">
            <div>
              <Label className="text-sm font-medium">Integração ativa</Label>
              <p className="text-xs text-muted-foreground mt-0.5">
                {ativo ? "A leitura por IA está habilitada" : "A leitura por IA está desabilitada"}
              </p>
            </div>
            <Switch checked={ativo} onCheckedChange={setAtivo} />
          </div>

          <div className="space-y-2">
            <Label className="text-sm font-medium">Modelo</Label>
            <Select value={model} onValueChange={setModel}>
              <SelectTrigger>
                <SelectValue placeholder="Selecione o modelo" />
              </SelectTrigger>
              <SelectContent>
                {MODELOS.map((m) => (
                  <SelectItem key={m.value} value={m.value}>
                    {m.label} ({m.custo})
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="rounded-lg border border-border p-4">
            <p className="text-xs text-muted-foreground">Baseado em 330 documentos/mês</p>
            <p className="text-lg font-semibold text-foreground mt-1">{custo}</p>
          </div>

          <InfoCard>
            API Key configurada como secret no backend (<code>ANTHROPIC_API_KEY</code>).
          </InfoCard>

          <Button variant="outline" className="w-full" onClick={handleTest} disabled={testing}>
            {testing ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Zap className="h-4 w-4 mr-2" />}
            Testar API
          </Button>

          <ResultBanner result={result} />

          <div className="flex justify-end gap-2 pt-2">
            <Button variant="outline" onClick={() => onOpenChange(false)} disabled={saving}>
              Cancelar
            </Button>
            <Button onClick={handleSave} disabled={saving}>
              {saving && <Loader2 className="h-4 w-4 animate-spin mr-2" />}
              Salvar
            </Button>
          </div>
        </div>
      </SheetContent>
    </Sheet>
  );
}
