import { useState, useEffect, useCallback } from "react";
import logoZapsign from "@/assets/logo-zapsign.svg";
import logoWhatsapp from "@/assets/logo-whatsapp.svg";
import logoBrowserless from "@/assets/logo-browserless.svg";
import logoAsaas from "@/assets/logo-asaas.svg";
import { AppLayout } from "@/components/AppLayout";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { CheckCircle2, Clock, ExternalLink, Eye, EyeOff, Loader2, QrCode, Wifi, WifiOff, RefreshCw, Plus, Trash2, Building2, Cloud } from "lucide-react";
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
  {
    key: "asaas",
    icon: <img src={logoAsaas} alt="Asaas" className="h-28 w-28 object-contain" />,
    hasLogo: true,
    title: "Asaas",
    description: "Gateway de pagamentos por filial",
    accentColor: "bg-blue-500",
    tokenLabel: "API Key",
    tokenPlaceholder: "Cole aqui seu token do Asaas",
    details: [
      "Geração automática de boletos e Pix",
      "Token individual por filial (CNPJ)",
      "Modo sandbox e produção",
      "Webhooks para atualização de status",
    ],
  },
  {
    key: "r2",
    icon: <Cloud className="h-16 w-16" />,
    hasLogo: false,
    title: "Cloudflare R2",
    description: "Armazenamento de arquivos e documentos",
    accentColor: "bg-orange-500",
    tokenLabel: "",
    tokenPlaceholder: "",
    details: [
      "Armazenamento de anexos de tickets",
      "Documentos e cardápios de clientes",
      "Links diretos para download pelo usuário",
      "10GB gratuitos por mês",
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
  const [setoresInstances, setSetoresInstances] = useState<{ nome: string; instance_name: string; usuario_nome?: string }[]>([]);

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
      fetchInstances();
      fetchSetoresInstances();
    }
  }, [open]);

  async function fetchSetoresInstances() {
    try {
      const { data } = await supabase
        .from("setores")
        .select("nome, instance_name, usuario_id")
        .not("instance_name", "is", null)
        .eq("ativo", true);
      const filtered = (data || []).filter((s: any) => s.instance_name?.trim());
      // Enrich with user names
      const userIds = filtered.map((s: any) => s.usuario_id).filter(Boolean);
      let userMap: Record<string, string> = {};
      if (userIds.length > 0) {
        const { data: profiles } = await supabase
          .from("profiles")
          .select("user_id, full_name")
          .in("user_id", userIds);
        (profiles || []).forEach((p: any) => { userMap[p.user_id] = p.full_name; });
      }
      setSetoresInstances(filtered.map((s: any) => ({
        nome: s.nome,
        instance_name: s.instance_name,
        usuario_nome: s.usuario_id ? userMap[s.usuario_id] : undefined,
      })));
    } catch (err) {
      console.error("fetchSetoresInstances error:", err);
    }
  }

  async function callEvolutionApi(action: string, instanceName?: string) {
    const { data, error } = await supabase.functions.invoke("evolution-api", {
      body: {
        action,
        server_url: serverUrl.trim(),
        api_key: token.trim(),
        instance_name: instanceName || DEFAULT_INSTANCE_NAME,
      },
    });
    if (error) throw new Error(error.message || "Erro na comunicação");
    if (data?.error) {
      // Include details in error message for better matching
      const details = data?.details?.response?.message;
      const detailStr = Array.isArray(details) ? details.join(", ") : typeof details === "string" ? details : "";
      throw new Error(detailStr || data.error);
    }
    return data;
  }

  async function fetchInstances() {
    if (!serverUrl.trim() || !token.trim()) return;
    try {
      const data = await callEvolutionApi("fetch_instances");
      console.log("fetch_instances response:", JSON.stringify(data));
      // Evolution API can return array directly or nested
      let list: any[] = [];
      if (Array.isArray(data)) {
        list = data;
      } else if (data?.instances && Array.isArray(data.instances)) {
        list = data.instances;
      } else if (typeof data === "object" && data !== null) {
        // Single instance object
        list = [data];
      }
      setInstances(list);
    } catch (err) {
      console.error("fetchInstances error:", err);
    }
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

  async function handleCreateInstance(overrideName?: string) {
    if (!serverUrl.trim() || !token.trim()) {
      toast.error("Preencha o servidor e a API Key primeiro.");
      return;
    }
    const instanceToCreate = overrideName || newInstanceName.trim() || DEFAULT_INSTANCE_NAME;
    setCreatingInstance(true);
    try {
      const { data, error } = await supabase.functions.invoke("evolution-api", {
        body: {
          action: "create_instance",
          server_url: serverUrl.trim(),
          api_key: token.trim(),
          instance_name: instanceToCreate,
        },
      });
      if (error) throw new Error(error.message);
      if (data?.error) throw new Error(data.error);

      toast.success(`Instância "${instanceToCreate}" criada!`);

      const qr = data?.qrcode?.base64 || data?.base64 || null;
      if (qr) {
        setQrCode(qr);
        setConnectionState("connecting");
      } else {
        await handleConnectQr(instanceToCreate);
      }
      await fetchInstances();
    } catch (err: any) {
      if (err.message?.includes("already") || err.message?.includes("exists") || err.message?.includes("in use")) {
        toast.info("Instância já existe. Buscando QR Code...");
        await handleConnectQr(instanceToCreate);
      } else {
        toast.error("Erro ao criar instância: " + err.message);
      }
    } finally {
      setCreatingInstance(false);
    }
  }

  async function handleConnectQr(instanceName?: string) {
    if (!serverUrl.trim() || !token.trim()) {
      toast.error("Preencha o servidor e a API Key primeiro.");
      return;
    }
    const name = instanceName || newInstanceName.trim() || DEFAULT_INSTANCE_NAME;
    setLoadingQr(true);
    try {
      const data = await callEvolutionApi("connect", name);
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
      // If instance doesn't exist, auto-create it
      if (err.message?.includes("does not exist") || err.message?.includes("not found") || err.message?.includes("404")) {
        toast.info(`Instância "${name}" não encontrada. Criando automaticamente...`);
        try {
          const createData = await callEvolutionApi("create_instance", name);
          const qr = createData?.qrcode?.base64 || createData?.base64 || null;
          if (qr) {
            setQrCode(qr);
            setConnectionState("connecting");
            toast.success(`Instância "${name}" criada!`);
          } else {
            // Try connect again after creation
            const connectData = await callEvolutionApi("connect", name);
            const qr2 = connectData?.base64 || connectData?.qrcode?.base64 || null;
            if (qr2) {
              setQrCode(qr2);
              setConnectionState("connecting");
            }
            toast.success(`Instância "${name}" criada!`);
          }
          await fetchInstances();
        } catch (createErr: any) {
          toast.error("Erro ao criar instância: " + createErr.message);
        }
      } else {
        toast.error("Erro ao buscar QR Code: " + err.message);
      }
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
              <DialogDescription>Gerencie as instâncias WhatsApp via Evolution API</DialogDescription>
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
                <Label className="text-sm font-medium">Instância Padrão ({DEFAULT_INSTANCE_NAME})</Label>
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
            </div>

            {isConnected && (
              <div className="flex items-center gap-2 rounded-lg bg-emerald-500/10 p-3">
                <CheckCircle2 className="h-4 w-4 text-emerald-500" />
                <p className="text-sm text-emerald-700 dark:text-emerald-400">Instância padrão conectada!</p>
              </div>
            )}
          </div>

          {/* Create new instance */}
          <div className="rounded-lg border border-border p-4 space-y-3">
            <Label className="text-sm font-medium">Criar / Conectar Instância</Label>
            <p className="text-xs text-muted-foreground">
              Crie instâncias adicionais para vincular a setores específicos (ex: Financeiro_WhatsApp, Suporte_WhatsApp).
            </p>
            <div className="flex gap-2">
              <Input
                value={newInstanceName}
                onChange={(e) => setNewInstanceName(e.target.value)}
                placeholder="Nome da instância (ex: Financeiro_WhatsApp)"
                className="flex-1"
              />
            </div>
            <div className="flex gap-2 flex-wrap">
              <Button
                variant="outline"
                size="sm"
                onClick={() => handleCreateInstance()}
                disabled={creatingInstance || !serverUrl.trim() || !token.trim()}
              >
                {creatingInstance ? <Loader2 className="h-3 w-3 animate-spin mr-1" /> : null}
                Criar Instância
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => handleConnectQr(newInstanceName.trim() || undefined)}
                disabled={loadingQr || !serverUrl.trim() || !token.trim()}
              >
                {loadingQr ? <Loader2 className="h-3 w-3 animate-spin mr-1" /> : <QrCode className="h-3 w-3 mr-1" />}
                Ler QR Code
              </Button>
            </div>

            {/* QR Code display */}
            {qrCode && (
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
                <Button variant="ghost" size="sm" onClick={() => handleConnectQr(newInstanceName.trim() || undefined)} disabled={loadingQr}>
                  {loadingQr ? <Loader2 className="h-3 w-3 animate-spin mr-1" /> : <RefreshCw className="h-3 w-3 mr-1" />}
                  Atualizar QR Code
                </Button>
              </div>
            )}
          </div>

          {/* Instances list - merged from Evolution API + Setores */}
          {(() => {
            const apiNames = new Set<string>();
            const mergedItems: { name: string; state: string; setor?: string; usuario?: string; fromApi: boolean }[] = [];
            instances.forEach((inst: any, i: number) => {
              const name = inst?.instance?.instanceName || inst?.instanceName || inst?.name || `Instância ${i + 1}`;
              const state = inst?.instance?.state || inst?.state || inst?.connectionStatus || "unknown";
              apiNames.add(name);
              const setor = setoresInstances.find(s => s.instance_name === name);
              mergedItems.push({ name, state, setor: setor?.nome, usuario: setor?.usuario_nome, fromApi: true });
            });
            setoresInstances.forEach(s => {
              if (!apiNames.has(s.instance_name)) {
                mergedItems.push({ name: s.instance_name, state: "not_created", setor: s.nome, usuario: s.usuario_nome, fromApi: false });
              }
            });
            if (mergedItems.length === 0) return null;
            return (
              <div className="rounded-lg border border-border p-4 space-y-2">
                <div className="flex items-center justify-between">
                  <Label className="text-sm font-medium">Instâncias ({mergedItems.length})</Label>
                  <Button variant="ghost" size="sm" onClick={() => { fetchInstances(); fetchSetoresInstances(); }} className="h-7">
                    <RefreshCw className="h-3 w-3 mr-1" />
                    Atualizar
                  </Button>
                </div>
                <div className="space-y-1">
                  {mergedItems.map((item, i) => {
                    const isOpen = item.state === "open" || item.state === "connected";
                    const isClosed = item.state === "close" || item.state === "closed" || item.state === "disconnected";
                    const isNotCreated = item.state === "not_created";
                    return (
                      <div key={i} className="flex items-center justify-between text-sm py-1.5 px-2 rounded hover:bg-muted/50">
                        <div className="flex flex-col">
                          <span className="font-mono text-xs">{item.name}</span>
                          {(item.setor || item.usuario) && (
                            <span className="text-[10px] text-muted-foreground">
                              {item.setor && `Setor: ${item.setor}`}
                              {item.setor && item.usuario && " · "}
                              {item.usuario && `Usuário: ${item.usuario}`}
                            </span>
                          )}
                        </div>
                        <div className="flex items-center gap-2">
                          <Badge variant={isOpen ? "default" : "outline"} className="text-[10px]">
                            {isOpen ? "Conectado" : isNotCreated ? "Não criada" : isClosed ? "Desconectado" : item.state}
                          </Badge>
                          {!isOpen && (
                            <Button
                              variant="ghost"
                              size="sm"
                              className="h-6 px-2 text-[10px]"
                              onClick={() => {
                                setNewInstanceName(item.name);
                                if (isNotCreated) {
                                  handleCreateInstance(item.name);
                                } else {
                                  handleConnectQr(item.name);
                                }
                              }}
                            >
                              <QrCode className="h-3 w-3 mr-1" />
                              {isNotCreated ? "Criar" : "Conectar"}
                            </Button>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            );
          })()}
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

// ── Asaas Config Dialog (per-filial) ──

interface AsaasFilialConfig {
  id?: string;
  filial_id: string;
  filial_nome: string;
  token: string;
  ambiente: "sandbox" | "production";
  ativo: boolean;
}

function AsaasConfigDialog({ open, onOpenChange }: { open: boolean; onOpenChange: (open: boolean) => void }) {
  const [filiais, setFiliais] = useState<{ id: string; nome: string }[]>([]);
  const [configs, setConfigs] = useState<AsaasFilialConfig[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [showTokens, setShowTokens] = useState<Record<string, boolean>>({});

  const loadData = useCallback(async () => {
    setLoading(true);
    const [{ data: filiaisData }, { data: configsData }] = await Promise.all([
      supabase.from("filiais").select("id, nome").eq("ativa", true).order("nome"),
      supabase.from("asaas_config").select("*"),
    ]);

    const fList = (filiaisData || []) as { id: string; nome: string }[];
    setFiliais(fList);

    const existing = (configsData || []) as any[];
    const mapped: AsaasFilialConfig[] = existing.map((c: any) => ({
      id: c.id,
      filial_id: c.filial_id,
      filial_nome: fList.find(f => f.id === c.filial_id)?.nome || "—",
      token: c.token || "",
      ambiente: c.ambiente === "production" ? "production" : "sandbox",
      ativo: c.ativo,
    }));
    setConfigs(mapped);
    setLoading(false);
  }, []);

  useEffect(() => {
    if (open) loadData();
  }, [open, loadData]);

  function addFilial(filialId: string) {
    const filial = filiais.find(f => f.id === filialId);
    if (!filial || configs.some(c => c.filial_id === filialId)) return;
    setConfigs(prev => [...prev, {
      filial_id: filialId,
      filial_nome: filial.nome,
      token: "",
      ambiente: "sandbox",
      ativo: true,
    }]);
  }

  function removeConfig(filialId: string) {
    setConfigs(prev => prev.filter(c => c.filial_id !== filialId));
  }

  function updateConfig(filialId: string, updates: Partial<AsaasFilialConfig>) {
    setConfigs(prev => prev.map(c => c.filial_id === filialId ? { ...c, ...updates } : c));
  }

  async function handleSave() {
    setSaving(true);
    try {
      for (const cfg of configs) {
        if (!cfg.token.trim()) continue;
        const payload = {
          filial_id: cfg.filial_id,
          token: cfg.token.trim(),
          ambiente: cfg.ambiente,
          ativo: cfg.ativo,
        };
        if (cfg.id) {
          await supabase.from("asaas_config").update(payload).eq("id", cfg.id);
        } else {
          await supabase.from("asaas_config").upsert(payload, { onConflict: "filial_id" });
        }
      }

      // Delete removed configs
      const { data: allConfigs } = await supabase.from("asaas_config").select("id, filial_id");
      const currentFilialIds = new Set(configs.map(c => c.filial_id));
      for (const existing of (allConfigs || []) as any[]) {
        if (!currentFilialIds.has(existing.filial_id)) {
          await supabase.from("asaas_config").delete().eq("id", existing.id);
        }
      }

      toast.success("Configurações do Asaas salvas!");
      onOpenChange(false);
    } catch (err: any) {
      toast.error("Erro: " + err.message);
    } finally {
      setSaving(false);
    }
  }

  const availableFiliais = filiais.filter(f => !configs.some(c => c.filial_id === f.id));
  const hasAnyActive = configs.some(c => c.ativo && c.token.trim());

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <div className="flex items-center gap-3">
            <img src={logoAsaas} alt="Asaas" className="h-10 w-10 object-contain" />
            <div>
              <DialogTitle>Asaas — Gateway de Pagamentos</DialogTitle>
              <DialogDescription>Configure o token do Asaas para cada filial</DialogDescription>
            </div>
          </div>
        </DialogHeader>

        {loading ? (
          <div className="flex justify-center py-8">
            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
          </div>
        ) : (
          <div className="space-y-4 py-2">
            {/* Add filial */}
            {availableFiliais.length > 0 && (
              <div className="flex items-center gap-2">
                <Select onValueChange={addFilial}>
                  <SelectTrigger className="h-9 flex-1">
                    <Building2 className="h-3.5 w-3.5 mr-1.5" />
                    <SelectValue placeholder="Adicionar filial..." />
                  </SelectTrigger>
                  <SelectContent>
                    {availableFiliais.map(f => (
                      <SelectItem key={f.id} value={f.id}>{f.nome}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}

            {configs.length === 0 && (
              <p className="text-sm text-muted-foreground text-center py-4">
                Nenhuma filial configurada. Adicione uma filial acima para começar.
              </p>
            )}

            {/* Per-filial configs */}
            {configs.map((cfg) => (
              <div key={cfg.filial_id} className="rounded-lg border border-border p-4 space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Building2 className="h-4 w-4 text-muted-foreground" />
                    <span className="font-medium text-sm">{cfg.filial_nome}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Switch
                      checked={cfg.ativo}
                      onCheckedChange={(v) => updateConfig(cfg.filial_id, { ativo: v })}
                    />
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-7 w-7 text-muted-foreground hover:text-destructive"
                      onClick={() => removeConfig(cfg.filial_id)}
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </Button>
                  </div>
                </div>

                {/* Ambiente */}
                <div className="flex items-center justify-between">
                  <Label className="text-xs text-muted-foreground">Ambiente</Label>
                  <div className="flex items-center gap-2">
                    <span className={`text-xs font-medium ${cfg.ambiente === "sandbox" ? "text-amber-600 dark:text-amber-400" : "text-muted-foreground"}`}>
                      Sandbox
                    </span>
                    <Switch
                      checked={cfg.ambiente === "production"}
                      onCheckedChange={(v) => updateConfig(cfg.filial_id, { ambiente: v ? "production" : "sandbox" })}
                    />
                    <span className={`text-xs font-medium ${cfg.ambiente === "production" ? "text-emerald-600 dark:text-emerald-400" : "text-muted-foreground"}`}>
                      Produção
                    </span>
                  </div>
                </div>

                {/* Token */}
                <div className="space-y-1">
                  <Label className="text-xs text-muted-foreground">API Key</Label>
                  <div className="relative">
                    <Input
                      type={showTokens[cfg.filial_id] ? "text" : "password"}
                      value={cfg.token}
                      onChange={(e) => updateConfig(cfg.filial_id, { token: e.target.value })}
                      placeholder="$aact_..."
                      className="pr-10 text-sm"
                    />
                    <button
                      type="button"
                      onClick={() => setShowTokens(prev => ({ ...prev, [cfg.filial_id]: !prev[cfg.filial_id] }))}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                    >
                      {showTokens[cfg.filial_id] ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </button>
                  </div>
                </div>

                {/* Status badge */}
                <div className="flex justify-end">
                  <Badge variant={cfg.ativo && cfg.token.trim() ? "default" : "outline"} className="text-[10px]">
                    {cfg.ativo && cfg.token.trim()
                      ? `✓ ${cfg.ambiente === "sandbox" ? "Sandbox" : "Produção"}`
                      : "Inativo"
                    }
                  </Badge>
                </div>
              </div>
            ))}
          </div>
        )}

        <DialogFooter className="gap-2 sm:gap-0">
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={saving}>
            Cancelar
          </Button>
          <Button onClick={handleSave} disabled={saving || loading}>
            {saving && <Loader2 className="h-4 w-4 animate-spin mr-2" />}
            Salvar
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ── R2 Config Dialog ──

interface R2ConfigDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  initialConfig: any;
}

function R2ConfigDialog({ open, onOpenChange, initialConfig }: R2ConfigDialogProps) {
  const [ativo, setAtivo] = useState(false);
  const [endpoint, setEndpoint] = useState("");
  const [accessKeyId, setAccessKeyId] = useState("");
  const [secretAccessKey, setSecretAccessKey] = useState("");
  const [bucketName, setBucketName] = useState("");
  const [publicUrl, setPublicUrl] = useState("");
  const [showAccessKey, setShowAccessKey] = useState(false);
  const [showSecretKey, setShowSecretKey] = useState(false);
  const [saving, setSaving] = useState(false);
  const [existingId, setExistingId] = useState<string | null>(null);

  useEffect(() => {
    if (initialConfig) {
      setAtivo(initialConfig.ativo ?? false);
      setEndpoint(initialConfig.endpoint || "");
      setAccessKeyId(initialConfig.access_key_id || "");
      setSecretAccessKey(initialConfig.secret_access_key || "");
      setBucketName(initialConfig.bucket_name || "");
      setPublicUrl(initialConfig.public_url || "");
      setExistingId(initialConfig.id || null);
    } else {
      setAtivo(false);
      setEndpoint("");
      setAccessKeyId("");
      setSecretAccessKey("");
      setBucketName("");
      setPublicUrl("");
      setExistingId(null);
    }
    setShowAccessKey(false);
    setShowSecretKey(false);
  }, [initialConfig, open]);

  async function handleSave() {
    setSaving(true);
    try {
      const payload = {
        ativo,
        endpoint: endpoint.trim() || null,
        access_key_id: accessKeyId.trim() || null,
        secret_access_key: secretAccessKey.trim() || null,
        bucket_name: bucketName.trim() || null,
        public_url: publicUrl.trim() || null,
      };
      if (existingId) {
        const { error } = await supabase.from("r2_config").update(payload).eq("id", existingId);
        if (error) throw error;
      } else {
        const { error } = await supabase.from("r2_config").insert(payload);
        if (error) throw error;
      }
      toast.success("Configuração do Cloudflare R2 salva!");
      onOpenChange(false);
    } catch (err: any) {
      toast.error("Erro ao salvar: " + err.message);
    } finally {
      setSaving(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-lg bg-orange-500 flex items-center justify-center">
              <Cloud className="h-6 w-6 text-white" />
            </div>
            <div>
              <DialogTitle>Cloudflare R2</DialogTitle>
              <DialogDescription>Armazenamento de arquivos e documentos</DialogDescription>
            </div>
          </div>
        </DialogHeader>

        <div className="space-y-5 py-4">
          {/* Toggle ativo */}
          <div className="flex items-center justify-between rounded-lg border border-border p-4">
            <div>
              <Label className="text-sm font-medium">Integração ativa</Label>
              <p className="text-xs text-muted-foreground mt-0.5">
                {ativo ? "O armazenamento R2 está habilitado" : "O armazenamento R2 está desabilitado"}
              </p>
            </div>
            <Switch checked={ativo} onCheckedChange={setAtivo} />
          </div>

          {/* Endpoint */}
          <div className="space-y-2">
            <Label className="text-sm font-medium">Endpoint S3</Label>
            <Input
              value={endpoint}
              onChange={(e) => setEndpoint(e.target.value)}
              placeholder="https://xxx.r2.cloudflarestorage.com"
            />
            <p className="text-xs text-muted-foreground">URL S3 do bucket Cloudflare R2</p>
          </div>

          {/* Access Key ID */}
          <div className="space-y-2">
            <Label className="text-sm font-medium">Access Key ID</Label>
            <div className="relative">
              <Input
                type={showAccessKey ? "text" : "password"}
                value={accessKeyId}
                onChange={(e) => setAccessKeyId(e.target.value)}
                placeholder="Access Key ID"
                className="pr-10"
              />
              <button
                type="button"
                onClick={() => setShowAccessKey(!showAccessKey)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
              >
                {showAccessKey ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </button>
            </div>
          </div>

          {/* Secret Access Key */}
          <div className="space-y-2">
            <Label className="text-sm font-medium">Secret Access Key</Label>
            <div className="relative">
              <Input
                type={showSecretKey ? "text" : "password"}
                value={secretAccessKey}
                onChange={(e) => setSecretAccessKey(e.target.value)}
                placeholder="Secret Access Key"
                className="pr-10"
              />
              <button
                type="button"
                onClick={() => setShowSecretKey(!showSecretKey)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
              >
                {showSecretKey ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </button>
            </div>
          </div>

          {/* Bucket Name */}
          <div className="space-y-2">
            <Label className="text-sm font-medium">Bucket Name</Label>
            <Input
              value={bucketName}
              onChange={(e) => setBucketName(e.target.value)}
              placeholder="softflow-arquivos"
            />
          </div>

          {/* Public URL */}
          <div className="space-y-2">
            <Label className="text-sm font-medium">URL Pública</Label>
            <Input
              value={publicUrl}
              onChange={(e) => setPublicUrl(e.target.value)}
              placeholder="https://pub-xxx.r2.dev"
            />
            <p className="text-xs text-muted-foreground">URL pública para acesso direto aos arquivos</p>
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

// ── Page ──

export default function Integracoes() {
  const [configs, setConfigs] = useState<IntegrationConfig[]>([]);
  const [asaasConfigs, setAsaasConfigs] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedDef, setSelectedDef] = useState<IntegrationDef | null>(null);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [whatsappDialogOpen, setWhatsappDialogOpen] = useState(false);
  const [asaasDialogOpen, setAsaasDialogOpen] = useState(false);

  const [r2DialogOpen, setR2DialogOpen] = useState(false);
  const [r2Config, setR2Config] = useState<any>(null);

  async function loadConfigs() {
    const [{ data, error }, { data: asaasData }, { data: r2Data }] = await Promise.all([
      supabase.from("integracoes_config").select("*"),
      supabase.from("asaas_config").select("*"),
      supabase.from("r2_config").select("*").limit(1),
    ]);
    if (!error && data) {
      setConfigs(data as IntegrationConfig[]);
    }
    setAsaasConfigs(asaasData || []);
    setR2Config((r2Data && r2Data.length > 0) ? r2Data[0] : null);
    setLoading(false);
  }

  useEffect(() => {
    loadConfigs();
  }, []);

  function getConfig(key: string) {
    // For asaas, check asaas_config table
    if (key === "asaas") {
      const hasActive = asaasConfigs.some((c: any) => c.ativo);
      if (asaasConfigs.length > 0) {
        return {
          id: "asaas",
          nome: "asaas",
          ativo: hasActive,
          token: "configured",
          server_url: null,
        } as IntegrationConfig;
      }
      return null;
    }
    if (key === "r2") {
      if (r2Config) {
        return {
          id: "r2",
          nome: "r2",
          ativo: r2Config.ativo === true,
          token: "configured",
          server_url: null,
        } as IntegrationConfig;
      }
      return null;
    }
    return configs.find((c) => c.nome === key) || null;
  }

  async function handleSave(nome: string, ativo: boolean, token: string, serverUrl?: string) {
    const existing = configs.find((c) => c.nome === nome);
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

  const ativasCount = integrationDefs.filter(d => getConfig(d.key)?.ativo).length;
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
                  } else if (def.key === "asaas") {
                    setAsaasDialogOpen(true);
                  } else if (def.key === "r2") {
                    setR2DialogOpen(true);
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

      {/* Asaas Dialog */}
      <AsaasConfigDialog
        open={asaasDialogOpen}
        onOpenChange={(v) => { setAsaasDialogOpen(v); if (!v) loadConfigs(); }}
      />

      {/* R2 Dialog */}
      <R2ConfigDialog
        open={r2DialogOpen}
        onOpenChange={(v) => { setR2DialogOpen(v); if (!v) loadConfigs(); }}
        initialConfig={r2Config}
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
