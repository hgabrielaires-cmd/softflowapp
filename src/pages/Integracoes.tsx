import { useState, useEffect, useCallback } from "react";
import logoZapsign from "@/assets/logo-zapsign.svg";
import logoWhatsapp from "@/assets/logo-whatsapp.svg";
import logoBrowserless from "@/assets/logo-browserless.svg";
import { AppLayout } from "@/components/AppLayout";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { CheckCircle2, Clock, ExternalLink, Eye, EyeOff, Loader2, QrCode, Wifi, WifiOff, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

// ── Types ──

interface IntegrationConfig {
  id: string;
  nome: string;
  ativo: boolean;
  token: string | null;
  server_url: string | null;
}

interface IntegrationDef {
  key: string;
  icon: React.ReactNode;
  title: string;
  description: string;
  accentColor: string;
  hasLogo?: boolean;
  details: string[];
  tokenLabel: string;
  tokenPlaceholder: string;
  hasEvolutionApi?: boolean;
}

const DEFAULT_INSTANCE_NAME = "Softflow_WhatsApp";

const integrationDefs: IntegrationDef[] = [
  {
    key: "zapsign",
    icon: <img src={logoZapsign} alt="ZapSign" className="h-28 w-28 object-contain" />,
    hasLogo: true,
    title: "ZapSign",
    description: "Assinatura eletrônica de contratos",
    accentColor: "bg-emerald",
    tokenLabel: "API Token",
    tokenPlaceholder: "Cole aqui seu token da ZapSign",
    details: [
      "Envio automático de contratos para assinatura",
      "Autenticação JWT com renovação automática",
      "Rastreamento de status em tempo real",
      "Identificação automática de signatários",
    ],
  },
  {
    key: "whatsapp",
    icon: <img src={logoWhatsapp} alt="WhatsApp" className="h-28 w-28 object-contain" />,
    hasLogo: true,
    title: "WhatsApp",
    description: "Comunicação via Evolution API",
    accentColor: "bg-[hsl(142,70%,45%)]",
    tokenLabel: "API Key (Global)",
    tokenPlaceholder: "Cole aqui sua API Key da Evolution API",
    hasEvolutionApi: true,
    details: [
      "Envio de notificações e lembretes",
      "Links de assinatura por WhatsApp",
      "Confirmações automáticas de agendamento",
      "Comunicação direta com clientes",
    ],
  },
  {
    key: "browserless",
    icon: <img src={logoBrowserless} alt="Browserless" className="h-28 w-28 object-contain" />,
    hasLogo: true,
    title: "Browserless (PDV)",
    description: "Geração de PDFs via renderização server-side",
    accentColor: "gradient-brand",
    tokenLabel: "API Key",
    tokenPlaceholder: "Cole aqui sua API Key do Browserless",
    details: [
      "Renderização de alta fidelidade com headless Chrome",
      "Geração de contratos em PDF formato A4",
      "Substituição automática de variáveis",
      "Armazenamento seguro no storage",
    ],
  },
];

// ── WhatsApp Config Dialog (Evolution API) ──

interface WhatsAppConfigDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  config: IntegrationConfig | null;
  onSave: (nome: string, ativo: boolean, token: string, serverUrl: string) => Promise<void>;
}

function WhatsAppConfigDialog({ open, onOpenChange, config, onSave }: WhatsAppConfigDialogProps) {
  const [ativo, setAtivo] = useState(false);
  const [token, setToken] = useState("");
  const [serverUrl, setServerUrl] = useState("");
  const [showToken, setShowToken] = useState(false);
  const [saving, setSaving] = useState(false);
  const [newInstanceName, setNewInstanceName] = useState("");

  // QR code / connection state
  const [qrCode, setQrCode] = useState<string | null>(null);
  const [connectionState, setConnectionState] = useState<string | null>(null);
  const [loadingQr, setLoadingQr] = useState(false);
  const [loadingState, setLoadingState] = useState(false);
  const [creatingInstance, setCreatingInstance] = useState(false);
  const [instances, setInstances] = useState<any[]>([]);

  useEffect(() => {
    if (config) {
      setAtivo(config.ativo);
      setToken(config.token || "");
      setServerUrl(config.server_url || "");
    } else {
      setAtivo(false);
      setToken("");
      setServerUrl("");
    }
    setShowToken(false);
    setQrCode(null);
    setConnectionState(null);
    setNewInstanceName("");
    setInstances([]);
  }, [config, open]);

  // Check connection state when dialog opens with credentials
  useEffect(() => {
    if (open && serverUrl && token) {
      checkConnectionState();
    }
  }, [open]);

  async function callEvolutionApi(action: string) {
    const { data, error } = await supabase.functions.invoke("evolution-api", {
      body: {
        action,
        server_url: serverUrl.trim(),
        api_key: token.trim(),
        instance_name: INSTANCE_NAME,
      },
    });
    if (error) throw new Error(error.message || "Erro na comunicação");
    if (data?.error) throw new Error(data.error);
    return data;
  }

  async function checkConnectionState() {
    if (!serverUrl.trim() || !token.trim()) {
      toast.error("Preencha o servidor e a API Key primeiro.");
      return;
    }
    setLoadingState(true);
    try {
      const data = await callEvolutionApi("connection_state");
      const state = data?.instance?.state || data?.state || "unknown";
      setConnectionState(state);
      if (state === "open") {
        toast.success("WhatsApp conectado!");
        setQrCode(null);
      }
    } catch (err: any) {
      setConnectionState("not_found");
    } finally {
      setLoadingState(false);
    }
  }

  async function handleCreateInstance() {
    if (!serverUrl.trim() || !token.trim()) {
      toast.error("Preencha o servidor e a API Key primeiro.");
      return;
    }
    setCreatingInstance(true);
    try {
      const data = await callEvolutionApi("create_instance");
      toast.success("Instância criada com sucesso!");

      // Check if QR code came back in create response
      const qr = data?.qrcode?.base64 || data?.base64 || null;
      if (qr) {
        setQrCode(qr);
        setConnectionState("connecting");
      } else {
        // Try to connect to get QR
        await handleConnectQr();
      }
    } catch (err: any) {
      // If instance already exists, try connecting
      if (err.message?.includes("already") || err.message?.includes("exists")) {
        toast.info("Instância já existe. Buscando QR Code...");
        await handleConnectQr();
      } else {
        toast.error("Erro ao criar instância: " + err.message);
      }
    } finally {
      setCreatingInstance(false);
    }
  }

  async function handleConnectQr() {
    if (!serverUrl.trim() || !token.trim()) {
      toast.error("Preencha o servidor e a API Key primeiro.");
      return;
    }
    setLoadingQr(true);
    try {
      const data = await callEvolutionApi("connect");
      const qr = data?.base64 || data?.qrcode?.base64 || null;
      if (qr) {
        setQrCode(qr);
        setConnectionState("connecting");
      } else if (data?.instance?.state === "open") {
        setConnectionState("open");
        setQrCode(null);
        toast.success("WhatsApp já está conectado!");
      } else {
        toast.info("Nenhum QR code retornado. Verifique o estado da conexão.");
      }
    } catch (err: any) {
      toast.error("Erro ao buscar QR Code: " + err.message);
    } finally {
      setLoadingQr(false);
    }
  }

  async function handleSave() {
    setSaving(true);
    try {
      await onSave("whatsapp", ativo, token.trim(), serverUrl.trim());
      onOpenChange(false);
    } finally {
      setSaving(false);
    }
  }

  const isConnected = connectionState === "open";

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <div className="flex items-center gap-3">
            <img src={logoWhatsapp} alt="WhatsApp" className="h-10 w-10 object-contain" />
            <div>
              <DialogTitle>WhatsApp — Evolution API</DialogTitle>
              <DialogDescription>Conecte via Evolution API com a instância {INSTANCE_NAME}</DialogDescription>
            </div>
          </div>
        </DialogHeader>

        <div className="space-y-5 py-4">
          {/* Toggle ativo/inativo */}
          <div className="flex items-center justify-between rounded-lg border border-border p-4">
            <div>
              <Label className="text-sm font-medium">Integração ativa</Label>
              <p className="text-xs text-muted-foreground mt-0.5">
                {ativo ? "A integração está habilitada" : "A integração está desabilitada"}
              </p>
            </div>
            <Switch checked={ativo} onCheckedChange={setAtivo} />
          </div>

          {/* Server URL */}
          <div className="space-y-2">
            <Label htmlFor="server_url" className="text-sm font-medium">Servidor Evolution API</Label>
            <Input
              id="server_url"
              type="text"
              value={serverUrl}
              onChange={(e) => setServerUrl(e.target.value)}
              placeholder="http://seu-ip:8080"
            />
            <p className="text-xs text-muted-foreground">
              URL do servidor onde a Evolution API está rodando. Use <strong>http://</strong> (não https) para portas customizadas.
            </p>
          </div>

          {/* API Key */}
          <div className="space-y-2">
            <Label htmlFor="token" className="text-sm font-medium">API Key (Global)</Label>
            <div className="relative">
              <Input
                id="token"
                type={showToken ? "text" : "password"}
                value={token}
                onChange={(e) => setToken(e.target.value)}
                placeholder="Cole aqui sua API Key da Evolution API"
                className="pr-10"
              />
              <button
                type="button"
                onClick={() => setShowToken(!showToken)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
              >
                {showToken ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </button>
            </div>
          </div>

          {/* Connection Status */}
          <div className="rounded-lg border border-border p-4 space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                {isConnected ? (
                  <Wifi className="h-4 w-4 text-emerald-500" />
                ) : (
                  <WifiOff className="h-4 w-4 text-muted-foreground" />
                )}
                <Label className="text-sm font-medium">Status da Conexão</Label>
              </div>
              <Badge variant={isConnected ? "default" : "outline"} className="text-[10px]">
                {loadingState ? "Verificando..." : isConnected ? "Conectado" : connectionState === "connecting" ? "Aguardando QR" : connectionState === "not_found" ? "Sem instância" : connectionState || "Desconhecido"}
              </Badge>
            </div>

            <div className="flex gap-2 flex-wrap">
              <Button
                variant="outline"
                size="sm"
                onClick={checkConnectionState}
                disabled={loadingState || !serverUrl.trim() || !token.trim()}
              >
                {loadingState ? <Loader2 className="h-3 w-3 animate-spin mr-1" /> : <RefreshCw className="h-3 w-3 mr-1" />}
                Verificar
              </Button>

              {!isConnected && (
                <>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={handleCreateInstance}
                    disabled={creatingInstance || !serverUrl.trim() || !token.trim()}
                  >
                    {creatingInstance ? <Loader2 className="h-3 w-3 animate-spin mr-1" /> : null}
                    Criar Instância
                  </Button>

                  <Button
                    variant="outline"
                    size="sm"
                    onClick={handleConnectQr}
                    disabled={loadingQr || !serverUrl.trim() || !token.trim()}
                  >
                    {loadingQr ? <Loader2 className="h-3 w-3 animate-spin mr-1" /> : <QrCode className="h-3 w-3 mr-1" />}
                    Ler QR Code
                  </Button>
                </>
              )}
            </div>

            {/* QR Code display */}
            {qrCode && !isConnected && (
              <div className="flex flex-col items-center gap-3 pt-2">
                <p className="text-xs text-muted-foreground text-center">
                  Escaneie o QR Code abaixo com o WhatsApp no seu celular
                </p>
                <div className="rounded-xl border-2 border-primary/20 bg-white p-3">
                  <img
                    src={qrCode.startsWith("data:") ? qrCode : `data:image/png;base64,${qrCode}`}
                    alt="QR Code WhatsApp"
                    className="h-56 w-56 object-contain"
                  />
                </div>
                <Button variant="ghost" size="sm" onClick={handleConnectQr} disabled={loadingQr}>
                  {loadingQr ? <Loader2 className="h-3 w-3 animate-spin mr-1" /> : <RefreshCw className="h-3 w-3 mr-1" />}
                  Atualizar QR Code
                </Button>
              </div>
            )}

            {isConnected && (
              <div className="flex items-center gap-2 rounded-lg bg-emerald-500/10 p-3">
                <CheckCircle2 className="h-4 w-4 text-emerald-500" />
                <p className="text-sm text-emerald-700 dark:text-emerald-400">WhatsApp conectado com sucesso!</p>
              </div>
            )}
          </div>
        </div>

        <DialogFooter className="gap-2 sm:gap-0">
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={saving}>
            Cancelar
          </Button>
          <Button onClick={handleSave} disabled={saving}>
            {saving && <Loader2 className="h-4 w-4 animate-spin mr-2" />}
            Salvar
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ── Generic Config Dialog ──

interface ConfigDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  def: IntegrationDef;
  config: IntegrationConfig | null;
  onSave: (nome: string, ativo: boolean, token: string, serverUrl?: string) => Promise<void>;
}

function ConfigDialog({ open, onOpenChange, def, config, onSave }: ConfigDialogProps) {
  const [ativo, setAtivo] = useState(false);
  const [token, setToken] = useState("");
  const [showToken, setShowToken] = useState(false);
  const [saving, setSaving] = useState(false);
  const [ambiente, setAmbiente] = useState<"sandbox" | "production">("sandbox");

  useEffect(() => {
    if (config) {
      setAtivo(config.ativo);
      setToken(config.token || "");
      // Read environment from server_url field for zapsign
      if (def.key === "zapsign") {
        setAmbiente(config.server_url === "production" ? "production" : "sandbox");
      }
    } else {
      setAtivo(false);
      setToken("");
      setAmbiente("sandbox");
    }
    setShowToken(false);
  }, [config, open]);

  async function handleSave() {
    setSaving(true);
    try {
      const serverUrl = def.key === "zapsign" ? ambiente : undefined;
      await onSave(def.key, ativo, token.trim(), serverUrl);
      onOpenChange(false);
    } finally {
      setSaving(false);
    }
  }

  const isZapsign = def.key === "zapsign";

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <div className="flex items-center gap-3">
            <div className={`h-10 w-10 rounded-xl flex items-center justify-center shadow-sm ${def.hasLogo ? "bg-transparent" : def.accentColor + " text-white"}`}>
              {def.icon}
            </div>
            <div>
              <DialogTitle>{def.title}</DialogTitle>
              <DialogDescription>{def.description}</DialogDescription>
            </div>
          </div>
        </DialogHeader>

        <div className="space-y-5 py-4">
          <div className="flex items-center justify-between rounded-lg border border-border p-4">
            <div>
              <Label className="text-sm font-medium">Integração ativa</Label>
              <p className="text-xs text-muted-foreground mt-0.5">
                {ativo ? "A integração está habilitada" : "A integração está desabilitada"}
              </p>
            </div>
            <Switch checked={ativo} onCheckedChange={setAtivo} />
          </div>

          {/* ZapSign: Ambiente toggle */}
          {isZapsign && (
            <div className="flex items-center justify-between rounded-lg border border-border p-4">
              <div>
                <Label className="text-sm font-medium">Ambiente</Label>
                <p className="text-xs text-muted-foreground mt-0.5">
                  {ambiente === "sandbox" ? "🧪 Homologação — não consome créditos" : "🚀 Produção — documentos reais"}
                </p>
              </div>
              <div className="flex items-center gap-2">
                <span className={`text-xs font-medium ${ambiente === "sandbox" ? "text-amber-600 dark:text-amber-400" : "text-muted-foreground"}`}>
                  Homolog.
                </span>
                <Switch
                  checked={ambiente === "production"}
                  onCheckedChange={(checked) => setAmbiente(checked ? "production" : "sandbox")}
                />
                <span className={`text-xs font-medium ${ambiente === "production" ? "text-emerald-600 dark:text-emerald-400" : "text-muted-foreground"}`}>
                  Produção
                </span>
              </div>
            </div>
          )}

          <div className="space-y-2">
            <Label htmlFor="token" className="text-sm font-medium">{def.tokenLabel}</Label>
            <div className="relative">
              <Input
                id="token"
                type={showToken ? "text" : "password"}
                value={token}
                onChange={(e) => setToken(e.target.value)}
                placeholder={def.tokenPlaceholder}
                className="pr-10"
              />
              <button
                type="button"
                onClick={() => setShowToken(!showToken)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
              >
                {showToken ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </button>
            </div>
            <p className="text-xs text-muted-foreground">O token é armazenado de forma segura no banco de dados.</p>
          </div>
        </div>

        <DialogFooter className="gap-2 sm:gap-0">
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={saving}>Cancelar</Button>
          <Button onClick={handleSave} disabled={saving}>
            {saving && <Loader2 className="h-4 w-4 animate-spin mr-2" />}
            Salvar
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ── Integration Card ──

interface IntegrationCardProps {
  def: IntegrationDef;
  config: IntegrationConfig | null;
  onOpenConfig: () => void;
}

function IntegrationCard({ def, config, onOpenConfig }: IntegrationCardProps) {
  const isAtivo = config?.ativo ?? false;
  const status = isAtivo ? "ativo" : "inativo";
  const statusConfig = {
    ativo: { variant: "default" as const, icon: <CheckCircle2 className="h-3 w-3" />, label: "Ativo" },
    inativo: { variant: "outline" as const, icon: <Clock className="h-3 w-3" />, label: "Inativo" },
  };
  const cfg = statusConfig[status];

  return (
    <Card className="group relative overflow-hidden transition-all duration-300 hover:shadow-soft border-border/60">
      <div className={`absolute top-0 left-0 right-0 h-1 ${isAtivo ? def.accentColor : "bg-muted-foreground/20"}`} />
      <CardHeader className="pb-3 relative">
        <Badge variant={cfg.variant} className="absolute top-4 right-4 flex items-center gap-1 text-[10px] font-medium px-2 py-0.5">
          {cfg.icon}
          {cfg.label}
        </Badge>
        <div className="flex justify-center pt-2">
          <div className={`h-32 w-32 rounded-2xl flex items-center justify-center transition-all duration-300 group-hover:scale-110 group-hover:shadow-lg ${def.hasLogo ? "bg-muted/30" : isAtivo ? def.accentColor + " text-white" : "bg-muted text-muted-foreground"}`}>
            {def.icon}
          </div>
        </div>
      </CardHeader>
      <CardContent className="pt-0">
        <ul className="space-y-1.5">
          {def.details.map((detail, i) => (
            <li key={i} className="flex items-center gap-2 text-sm text-muted-foreground">
              <div className={`h-1.5 w-1.5 rounded-full shrink-0 ${isAtivo ? def.accentColor : "bg-muted-foreground/40"}`} />
              {detail}
            </li>
          ))}
        </ul>
        <div className="mt-4 pt-3 border-t border-border/50">
          <Button variant="ghost" size="sm" className="text-xs text-muted-foreground hover:text-foreground gap-1.5 px-0" onClick={onOpenConfig}>
            <ExternalLink className="h-3 w-3" />
            Ver configurações
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}

// ── Page ──

export default function Integracoes() {
  const [configs, setConfigs] = useState<IntegrationConfig[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedDef, setSelectedDef] = useState<IntegrationDef | null>(null);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [whatsappDialogOpen, setWhatsappDialogOpen] = useState(false);

  async function loadConfigs() {
    const { data, error } = await supabase.from("integracoes_config").select("*");
    if (!error && data) {
      setConfigs(data as IntegrationConfig[]);
    }
    setLoading(false);
  }

  useEffect(() => {
    loadConfigs();
  }, []);

  function getConfig(key: string) {
    return configs.find((c) => c.nome === key) || null;
  }

  async function handleSave(nome: string, ativo: boolean, token: string, serverUrl?: string) {
    const existing = getConfig(nome);
    const payload: any = { ativo, token: token || null };
    if (serverUrl !== undefined) payload.server_url = serverUrl || null;

    if (existing) {
      const { error } = await supabase.from("integracoes_config").update(payload).eq("id", existing.id);
      if (error) { toast.error("Erro ao salvar: " + error.message); return; }
    } else {
      const { error } = await supabase.from("integracoes_config").insert({ nome, ...payload });
      if (error) { toast.error("Erro ao salvar: " + error.message); return; }
    }
    toast.success("Configuração salva com sucesso!");
    await loadConfigs();
  }

  const ativasCount = configs.filter((c) => c.ativo).length;
  const inativasCount = integrationDefs.length - ativasCount;

  return (
    <AppLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Integrações</h1>
          <p className="text-sm text-muted-foreground mt-1">Gerencie as integrações externas do sistema</p>
        </div>

        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2 text-sm">
            <div className="h-2 w-2 rounded-full bg-emerald" />
            <span className="text-muted-foreground"><span className="font-medium text-foreground">{ativasCount}</span> ativas</span>
          </div>
          <div className="flex items-center gap-2 text-sm">
            <div className="h-2 w-2 rounded-full bg-muted-foreground/40" />
            <span className="text-muted-foreground"><span className="font-medium text-foreground">{inativasCount}</span> inativas</span>
          </div>
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
            {integrationDefs.map((def) => (
              <IntegrationCard
                key={def.key}
                def={def}
                config={getConfig(def.key)}
                onOpenConfig={() => {
                  if (def.hasEvolutionApi) {
                    setWhatsappDialogOpen(true);
                  } else {
                    setSelectedDef(def);
                    setDialogOpen(true);
                  }
                }}
              />
            ))}
          </div>
        )}
      </div>

      {/* WhatsApp Evolution API Dialog */}
      <WhatsAppConfigDialog
        open={whatsappDialogOpen}
        onOpenChange={setWhatsappDialogOpen}
        config={getConfig("whatsapp")}
        onSave={handleSave}
      />

      {/* Generic Dialog */}
      {selectedDef && (
        <ConfigDialog
          open={dialogOpen}
          onOpenChange={setDialogOpen}
          def={selectedDef}
          config={getConfig(selectedDef.key)}
          onSave={handleSave}
        />
      )}
    </AppLayout>
  );
}
