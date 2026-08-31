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

type TelegramBot = { id: string; nome: string; slug: string };
type Pessoa = { id: string; nome: string; user_id: string | null };

function nomeFuncao(slug: string) {
  return slug === "financeiro" ? "telegram-webhook" : `telegram-webhook-${slug}`;
}

function nomeSecret(slug: string) {
  return slug === "financeiro" ? "TELEGRAM_BOT_TOKEN" : `TELEGRAM_${slug.toUpperCase()}_BOT_TOKEN`;
}

async function chamarAcaoBot(slug: string, action: "test" | "setup") {
  const { data: sessionData } = await supabase.auth.getSession();
  const token = sessionData.session?.access_token ?? import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY;
  const res = await fetch(
    `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/${nomeFuncao(slug)}?action=${action}`,
    {
      method: "GET",
      headers: {
        Authorization: `Bearer ${token}`,
        apikey: import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY,
      },
    },
  );
  return await res.json().catch(() => ({}));
}

function BotAcoesCard({ bot }: { bot: TelegramBot }) {
  const [testing, setTesting] = useState(false);
  const [registering, setRegistering] = useState(false);
  const [result, setResult] = useState<TestResult>(null);

  async function run(action: "test" | "setup") {
    action === "test" ? setTesting(true) : setRegistering(true);
    setResult(null);
    try {
      const data: any = await chamarAcaoBot(bot.slug, action);
      const okResp = data?.ok === true || data?.result?.username;
      if (action === "test") {
        setResult(
          okResp
            ? { ok: true, message: `Bot: @${data?.result?.username ?? data?.username ?? bot.slug} — Online!` }
            : { ok: false, message: `Erro: ${data?.description ?? data?.error ?? "token inválido"}` },
        );
      } else {
        setResult(
          okResp
            ? { ok: true, message: "Webhook registrado!" }
            : { ok: false, message: `Erro: ${data?.description ?? data?.error ?? "falha ao registrar"}` },
        );
      }
    } catch (err: any) {
      setResult({ ok: false, message: `Erro: ${err.message}` });
    } finally {
      setTesting(false);
      setRegistering(false);
    }
  }

  return (
    <div className="space-y-2 rounded-lg border border-border p-3">
      <div className="flex items-center justify-between">
        <span className="text-sm font-medium">{bot.nome}</span>
        <code className="text-[10px] text-muted-foreground">{nomeSecret(bot.slug)}</code>
      </div>
      <div className="flex gap-2">
        <Button variant="outline" size="sm" className="flex-1" onClick={() => run("test")} disabled={testing}>
          {testing ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Zap className="h-4 w-4 mr-2" />}
          Testar
        </Button>
        <Button variant="outline" size="sm" className="flex-1" onClick={() => run("setup")} disabled={registering}>
          {registering ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Webhook className="h-4 w-4 mr-2" />}
          Webhook
        </Button>
      </div>
      <ResultBanner result={result} />
    </div>
  );
}

export function TelegramConfigDialog({ open, onOpenChange, initialConfig, onSaved }: DialogProps) {
  const [ativo, setAtivo] = useState(false);
  const [bots, setBots] = useState<TelegramBot[]>([]);
  const [pessoas, setPessoas] = useState<Pessoa[]>([]);
  const [acessos, setAcessos] = useState<Record<string, boolean>>({}); // `${bot_id}:${user_id}`
  const [novoId, setNovoId] = useState("");
  const [novoNome, setNovoNome] = useState("");
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);

  async function carregar() {
    setLoading(true);
    try {
      const [{ data: botsData }, { data: profilesData }, { data: acessosData }] = await Promise.all([
        supabase.from("telegram_bots").select("id, nome, slug").eq("ativo", true).order("nome"),
        supabase
          .from("profiles")
          .select("user_id, full_name, telegram_id")
          .not("telegram_id", "is", null),
        supabase.from("telegram_bot_acessos").select("bot_id, user_id, ativo"),
      ]);

      setBots((botsData ?? []) as TelegramBot[]);

      const doBanco: Pessoa[] = (profilesData ?? []).map((p: any) => ({
        id: String(p.telegram_id),
        nome: p.full_name ?? "",
        user_id: p.user_id,
      }));

      // Registros avulsos (sem profile) mantidos no config da integração
      const lista = initialConfig?.config?.authorized_list;
      const avulsos: Pessoa[] = (Array.isArray(lista) ? lista : [])
        .map((item: any) => ({ id: String(item?.id ?? "").trim(), nome: String(item?.nome ?? "").trim(), user_id: null }))
        .filter((item) => item.id && !doBanco.some((d) => d.id === item.id));

      setPessoas([...doBanco, ...avulsos]);

      const mapa: Record<string, boolean> = {};
      for (const a of acessosData ?? []) mapa[`${(a as any).bot_id}:${(a as any).user_id}`] = (a as any).ativo;
      setAcessos(mapa);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    setAtivo(initialConfig?.ativo ?? false);
    setNovoId("");
    setNovoNome("");
    if (open) carregar();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [initialConfig, open]);

  async function toggleAcesso(bot: TelegramBot, pessoa: Pessoa, valor: boolean) {
    if (!pessoa.user_id) return;
    const chave = `${bot.id}:${pessoa.user_id}`;
    setAcessos((prev) => ({ ...prev, [chave]: valor }));
    const { error } = await supabase
      .from("telegram_bot_acessos")
      .upsert({ bot_id: bot.id, user_id: pessoa.user_id, ativo: valor }, { onConflict: "bot_id,user_id" });
    if (error) {
      toast.error("Erro ao salvar acesso: " + error.message);
      setAcessos((prev) => ({ ...prev, [chave]: !valor }));
    }
  }

  async function addPessoa() {
    const idTg = novoId.trim();
    const nome = novoNome.trim();
    if (!idTg) return;
    if (pessoas.some((x) => x.id === idTg)) {
      toast.error("Este ID já está na lista");
      return;
    }

    // Tenta vincular a um profile existente pelo nome
    if (nome) {
      const { data: matches } = await supabase
        .from("profiles")
        .select("user_id, full_name")
        .ilike("full_name", `%${nome}%`)
        .limit(2);
      if (matches && matches.length === 1) {
        const { error } = await supabase
          .from("profiles")
          .update({ telegram_id: Number(idTg) })
          .eq("user_id", (matches[0] as any).user_id);
        if (error) {
          toast.error("Erro ao vincular usuário: " + error.message);
          return;
        }
        setPessoas([...pessoas, { id: idTg, nome: (matches[0] as any).full_name, user_id: (matches[0] as any).user_id }]);
        setNovoId("");
        setNovoNome("");
        toast.success("Usuário vinculado ao Telegram");
        return;
      }
    }

    // Sem profile correspondente: registro avulso
    setPessoas([...pessoas, { id: idTg, nome, user_id: null }]);
    setNovoId("");
    setNovoNome("");
  }

  async function removerPessoa(pessoa: Pessoa) {
    if (pessoa.user_id) {
      const { error } = await supabase
        .from("profiles")
        .update({ telegram_id: null })
        .eq("user_id", pessoa.user_id);
      if (error) {
        toast.error("Erro ao remover: " + error.message);
        return;
      }
      await supabase.from("telegram_bot_acessos").delete().eq("user_id", pessoa.user_id);
    }
    setPessoas(pessoas.filter((x) => x.id !== pessoa.id));
  }

  async function handleSave() {
    setSaving(true);
    try {
      const avulsos = pessoas.filter((p) => !p.user_id).map((p) => ({ id: p.id, nome: p.nome }));
      await saveIntegracao("telegram", ativo, {
        ...(initialConfig?.config ?? {}),
        authorized_ids: pessoas.map((x) => x.id).join(","),
        authorized_list: avulsos,
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
      <SheetContent className="w-full sm:max-w-[560px] overflow-y-auto">
        <SheetHeader>
          <div className="flex items-center gap-3">
            <img src={logoTelegram} alt="Telegram" className="h-10 w-10" />
            <div className="text-left">
              <SheetTitle>Telegram</SheetTitle>
              <SheetDescription>Bots, pessoas autorizadas e acessos</SheetDescription>
            </div>
          </div>
        </SheetHeader>

        <div className="space-y-5 py-6">
          <div className="flex items-center justify-between rounded-lg border border-border p-4">
            <div>
              <Label className="text-sm font-medium">Integração ativa</Label>
              <p className="text-xs text-muted-foreground mt-0.5">
                {ativo ? "Os bots do Telegram estão habilitados" : "Os bots do Telegram estão desabilitados"}
              </p>
            </div>
            <Switch checked={ativo} onCheckedChange={setAtivo} />
          </div>

          <div className="space-y-2">
            <Label className="text-sm font-medium">Pessoas autorizadas</Label>
            <div className="flex gap-2">
              <Input
                value={novoId}
                onChange={(e) => setNovoId(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    e.preventDefault();
                    addPessoa();
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
                    addPessoa();
                  }
                }}
                placeholder="Nome"
                className="flex-1"
              />
              <Button type="button" variant="outline" size="icon" onClick={addPessoa} aria-label="Adicionar pessoa">
                <Plus className="h-4 w-4" />
              </Button>
            </div>

            {loading ? (
              <div className="flex items-center gap-2 text-xs text-muted-foreground">
                <Loader2 className="h-4 w-4 animate-spin" /> Carregando...
              </div>
            ) : pessoas.length > 0 ? (
              <div className="space-y-1.5">
                {pessoas.map((pessoa) => (
                  <div key={pessoa.id} className="rounded-lg border border-border px-3 py-2 text-sm">
                    <div className="flex items-center justify-between">
                      <div className="flex flex-col">
                        <span className="font-mono">{pessoa.id}</span>
                        {pessoa.nome && <span className="text-xs text-muted-foreground">{pessoa.nome}</span>}
                      </div>
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8 text-destructive"
                        onClick={() => removerPessoa(pessoa)}
                        aria-label={`Remover ${pessoa.id}`}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                    <div className="mt-2 flex flex-wrap gap-x-4 gap-y-2 border-t border-border pt-2">
                      {pessoa.user_id ? (
                        bots.map((bot) => (
                          <div key={bot.id} className="flex items-center gap-2">
                            <Switch
                              checked={!!acessos[`${bot.id}:${pessoa.user_id}`]}
                              onCheckedChange={(v) => toggleAcesso(bot, pessoa, v)}
                            />
                            <span className="text-xs text-muted-foreground">{bot.nome}</span>
                          </div>
                        ))
                      ) : (
                        <span className="text-xs text-muted-foreground">
                          Sem usuário vinculado — cadastre o ID no perfil para liberar os bots
                        </span>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-xs text-muted-foreground">Nenhuma pessoa autorizada cadastrada</p>
            )}

            <p className="text-xs text-muted-foreground">O ID do Telegram é obtido no @userinfobot</p>
          </div>

          <InfoCard>
            Tokens configurados como secrets no backend:
            <br />
            {bots.map((bot) => (
              <span key={bot.id} className="block">
                {bot.nome}: <code>{nomeSecret(bot.slug)}</code>
              </span>
            ))}
          </InfoCard>

          <div className="space-y-2">
            <Label className="text-sm font-medium">Bots</Label>
            {bots.map((bot) => (
              <BotAcoesCard key={bot.id} bot={bot} />
            ))}
          </div>

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
