import { useCallback, useEffect, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Loader2, Plus, Star, Trash2, CheckCircle2, AlertTriangle } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

const META_APP_ID = "2182059352731360";
const META_CONFIG_ID = "1777611969953382";

declare global {
  interface Window { FB?: any; fbAsyncInit?: () => void }
}

let sdkPromise: Promise<void> | null = null;
function loadFbSdk(): Promise<void> {
  if (window.FB) return Promise.resolve();
  if (sdkPromise) return sdkPromise;
  sdkPromise = new Promise((resolve, reject) => {
    window.fbAsyncInit = () => {
      window.FB.init({ appId: META_APP_ID, autoLogAppEvents: true, xfbml: false, version: "v21.0" });
      resolve();
    };
    const js = document.createElement("script");
    js.id = "facebook-jssdk";
    js.async = true;
    js.src = "https://connect.facebook.net/en_US/sdk.js";
    js.onerror = () => { sdkPromise = null; reject(new Error("Falha ao carregar SDK da Meta")); };
    document.body.appendChild(js);
  });
  return sdkPromise;
}

interface Numero {
  id: string; apelido: string; phone_number_id: string; waba_id: string; phone_number: string | null;
  display_name: string | null; status: string; padrao: boolean; ativo: boolean; filial_id: string | null;
}

export function WhatsAppMetaNumeros() {
  const [numeros, setNumeros] = useState<Numero[]>([]);
  const [filiais, setFiliais] = useState<{ id: string; nome: string }[]>([]);
  const [conectando, setConectando] = useState(false);
  const [pendente, setPendente] = useState<{ code?: string; phone_number_id?: string; waba_id?: string } | null>(null);
  const [apelido, setApelido] = useState("");
  const [filialId, setFilialId] = useState("");
  const [padrao, setPadrao] = useState(false);
  const [salvando, setSalvando] = useState(false);
  const sessao = useRef<{ code?: string; phone_number_id?: string; waba_id?: string }>({});

  const carregar = useCallback(async () => {
    const { data } = await supabase.from("whatsapp_meta_numeros" as any)
      .select("id, apelido, phone_number_id, waba_id, phone_number, display_name, status, padrao, ativo, filial_id")
      .order("padrao", { ascending: false }).order("created_at");
    setNumeros((data as any) || []);
  }, []);

  useEffect(() => {
    carregar();
    supabase.from("filiais").select("id, nome").order("nome").then(({ data }) => setFiliais((data as any) || []));
  }, [carregar]);

  useEffect(() => {
    const onMsg = (event: MessageEvent) => {
      if (!/^https:\/\/(www|web)\.facebook\.com$/.test(event.origin)) return;
      try {
        const data = typeof event.data === "string" ? JSON.parse(event.data) : event.data;
        if (data?.type !== "WA_EMBEDDED_SIGNUP") return;
        if (data.event === "FINISH" || data.event === "FINISH_WHATSAPP_BUSINESS_APP_ONBOARDING") {
          sessao.current.phone_number_id = data.data?.phone_number_id;
          sessao.current.waba_id = data.data?.waba_id;
          tentarAbrir();
        } else if (data.event === "CANCEL") {
          setConectando(false);
          toast.error("Conexão cancelada.");
        } else if (data.event === "ERROR") {
          setConectando(false);
          toast.error("Erro: " + (data.data?.error_message || "falha no cadastro"));
        }
      } catch { /* mensagens não JSON */ }
    };
    window.addEventListener("message", onMsg);
    return () => window.removeEventListener("message", onMsg);
  }, []);

  function tentarAbrir() {
    const s = sessao.current;
    if (s.code && s.phone_number_id && s.waba_id) {
      setPendente({ ...s });
      setApelido(""); setFilialId(""); setPadrao(numeros.length === 0);
      setConectando(false);
    }
  }

  async function iniciar() {
    setConectando(true);
    sessao.current = {};
    try { await loadFbSdk(); } catch (e: any) { setConectando(false); toast.error(e.message); return; }
    window.FB.login((response: any) => {
      const code = response?.authResponse?.code;
      if (!code) { setConectando(false); if (!sessao.current.phone_number_id) toast.error("Conexão cancelada."); return; }
      sessao.current.code = code;
      tentarAbrir();
    }, {
      config_id: META_CONFIG_ID,
      response_type: "code",
      override_default_response_type: true,
      extras: { setup: {}, featureType: "whatsapp_business_app_onboarding", sessionInfoVersion: "3" },
    });
  }

  async function salvar() {
    if (!pendente || !apelido.trim() || !filialId) { toast.error("Preencha apelido e filial."); return; }
    setSalvando(true);
    const { data, error } = await supabase.functions.invoke("whatsapp-meta", {
      body: { action: "connect_number", ...pendente, apelido: apelido.trim(), filial_id: filialId, padrao, coexistencia: true },
    });
    setSalvando(false);
    if (error || (data as any)?.ok === false) { toast.error("Erro: " + ((data as any)?.error || error?.message)); return; }
    toast.success(`Número ${apelido} conectado!`);
    setPendente(null);
    carregar();
  }

  async function tornarPadrao(n: Numero) {
    await supabase.from("whatsapp_meta_numeros" as any).update({ padrao: false }).neq("id", n.id);
    const { error } = await supabase.from("whatsapp_meta_numeros" as any).update({ padrao: true }).eq("id", n.id);
    if (error) toast.error(error.message); else carregar();
  }

  async function remover(n: Numero) {
    if (!confirm(`Remover o número ${n.apelido}?`)) return;
    const { error } = await supabase.from("whatsapp_meta_numeros" as any).delete().eq("id", n.id);
    if (error) toast.error(error.message); else { toast.success("Número removido"); carregar(); }
  }

  const nomeFilial = (id: string | null) => filiais.find((f) => f.id === id)?.nome || "—";

  return (
    <div className="space-y-2">
      <p className="text-sm font-medium">Números conectados</p>
      <div className="rounded-xl border border-border divide-y divide-border">
        {numeros.length === 0 && <p className="p-3 text-xs text-muted-foreground">Nenhum número conectado.</p>}
        {numeros.map((n) => (
          <div key={n.id} className="p-3 flex items-start justify-between gap-2">
            <div className="min-w-0 space-y-0.5">
              <div className="flex items-center gap-1.5 text-sm font-medium">
                {n.status === "connected"
                  ? <CheckCircle2 className="h-4 w-4 text-primary shrink-0" />
                  : <AlertTriangle className="h-4 w-4 text-destructive shrink-0" />}
                <span className="truncate">{n.apelido}</span>
                {n.padrao && <Badge variant="secondary" className="text-[10px]">Padrão</Badge>}
                {n.status !== "connected" && <Badge variant="destructive" className="text-[10px]">Desconectado</Badge>}
              </div>
              <p className="text-xs text-muted-foreground">{n.phone_number || n.phone_number_id}{n.display_name ? ` · ${n.display_name}` : ""}</p>
              <p className="text-xs text-muted-foreground">Filial: {nomeFilial(n.filial_id)}</p>
            </div>
            <div className="flex gap-1 shrink-0">
              {!n.padrao && (
                <Button size="icon" variant="ghost" className="h-8 w-8" title="Tornar padrão" onClick={() => tornarPadrao(n)}>
                  <Star className="h-4 w-4" />
                </Button>
              )}
              <Button size="icon" variant="ghost" className="h-8 w-8" title="Remover" onClick={() => remover(n)}>
                <Trash2 className="h-4 w-4" />
              </Button>
            </div>
          </div>
        ))}
        <div className="p-2">
          <Button variant="outline" size="sm" className="w-full gap-1.5" onClick={iniciar} disabled={conectando}>
            {conectando ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />}
            Conectar novo número
          </Button>
        </div>
      </div>

      <Dialog open={!!pendente} onOpenChange={(v) => !v && setPendente(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>WhatsApp conectado com sucesso!</DialogTitle>
            <DialogDescription>
              Phone Number ID: {pendente?.phone_number_id}<br />WABA ID: {pendente?.waba_id}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-3">
            <div className="space-y-1.5">
              <Label className="text-xs">Apelido *</Label>
              <Input value={apelido} onChange={(e) => setApelido(e.target.value)} placeholder="Ex: Softplus Alto Oeste" />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">Filial *</Label>
              <Select value={filialId} onValueChange={setFilialId}>
                <SelectTrigger><SelectValue placeholder="Selecione" /></SelectTrigger>
                <SelectContent>{filiais.map((f) => <SelectItem key={f.id} value={f.id}>{f.nome}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div className="flex items-center gap-2">
              <Switch checked={padrao} onCheckedChange={setPadrao} id="num-padrao" />
              <Label htmlFor="num-padrao" className="text-xs">Número padrão</Label>
            </div>
          </div>
          <DialogFooter>
            <Button onClick={salvar} disabled={salvando}>
              {salvando && <Loader2 className="h-4 w-4 animate-spin mr-1" />} Salvar e ativar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
