import { useState, useEffect } from "react";
import logoZapsign from "@/assets/logo-zapsign.svg";
import logoWhatsapp from "@/assets/logo-whatsapp.svg";
import logoBrowserless from "@/assets/logo-browserless.svg";
import { AppLayout } from "@/components/AppLayout";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { FileSignature, MessageCircle, Monitor, CheckCircle2, Clock, ExternalLink, Eye, EyeOff, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

// ── Types ──

interface IntegrationConfig {
  id: string;
  nome: string;
  ativo: boolean;
  token: string | null;
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
}

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
    description: "Comunicação com clientes via WhatsApp",
    accentColor: "bg-[hsl(142,70%,45%)]",
    tokenLabel: "API Token",
    tokenPlaceholder: "Cole aqui seu token do WhatsApp",
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

// ── Config Dialog ──

interface ConfigDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  def: IntegrationDef;
  config: IntegrationConfig | null;
  onSave: (nome: string, ativo: boolean, token: string) => Promise<void>;
}

function ConfigDialog({ open, onOpenChange, def, config, onSave }: ConfigDialogProps) {
  const [ativo, setAtivo] = useState(false);
  const [token, setToken] = useState("");
  const [showToken, setShowToken] = useState(false);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (config) {
      setAtivo(config.ativo);
      setToken(config.token || "");
    } else {
      setAtivo(false);
      setToken("");
    }
    setShowToken(false);
  }, [config, open]);

  async function handleSave() {
    setSaving(true);
    try {
      await onSave(def.key, ativo, token.trim());
      onOpenChange(false);
    } finally {
      setSaving(false);
    }
  }

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

          {/* Campo de token */}
          <div className="space-y-2">
            <Label htmlFor="token" className="text-sm font-medium">
              {def.tokenLabel}
            </Label>
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
            <p className="text-xs text-muted-foreground">
              O token é armazenado de forma segura no banco de dados.
            </p>
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
          <div className={`h-32 w-32 rounded-2xl flex items-center justify-center ${def.hasLogo ? "bg-muted/30" : isAtivo ? def.accentColor + " text-white" : "bg-muted text-muted-foreground"}`}>
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

  async function loadConfigs() {
    const { data, error } = await supabase
      .from("integracoes_config")
      .select("*");
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

  async function handleSave(nome: string, ativo: boolean, token: string) {
    const existing = getConfig(nome);

    if (existing) {
      const { error } = await supabase
        .from("integracoes_config")
        .update({ ativo, token: token || null })
        .eq("id", existing.id);
      if (error) {
        toast.error("Erro ao salvar: " + error.message);
        return;
      }
    } else {
      const { error } = await supabase
        .from("integracoes_config")
        .insert({ nome, ativo, token: token || null });
      if (error) {
        toast.error("Erro ao salvar: " + error.message);
        return;
      }
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
          <p className="text-sm text-muted-foreground mt-1">
            Gerencie as integrações externas do sistema
          </p>
        </div>

        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2 text-sm">
            <div className="h-2 w-2 rounded-full bg-emerald" />
            <span className="text-muted-foreground">
              <span className="font-medium text-foreground">{ativasCount}</span> ativas
            </span>
          </div>
          <div className="flex items-center gap-2 text-sm">
            <div className="h-2 w-2 rounded-full bg-muted-foreground/40" />
            <span className="text-muted-foreground">
              <span className="font-medium text-foreground">{inativasCount}</span> inativas
            </span>
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
                  setSelectedDef(def);
                  setDialogOpen(true);
                }}
              />
            ))}
          </div>
        )}
      </div>

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
