import { useEffect, useState } from "react";
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Eye, EyeOff, Loader2, CheckCircle2, Clock, PlugZap } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

interface Props {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  initialConfig: any | null;
  onSaved?: () => void;
}

export function WhatsAppMetaDialog({ open, onOpenChange, initialConfig, onSaved }: Props) {
  const [ativo, setAtivo] = useState(false);
  const [phoneNumberId, setPhoneNumberId] = useState("");
  const [wabaId, setWabaId] = useState("");
  const [accessToken, setAccessToken] = useState("");
  const [verifyToken, setVerifyToken] = useState("");
  const [phoneNumber, setPhoneNumber] = useState("");
  const [showToken, setShowToken] = useState(false);
  const [saving, setSaving] = useState(false);
  const [testing, setTesting] = useState(false);

  useEffect(() => {
    if (!open) return;
    const cfg = initialConfig?.config || {};
    setAtivo(initialConfig?.ativo ?? false);
    setPhoneNumberId(cfg.phone_number_id || "");
    setWabaId(cfg.waba_id || "");
    setAccessToken(cfg.access_token || "");
    setVerifyToken(cfg.verify_token || "");
    setPhoneNumber(cfg.phone_number || "");
  }, [open, initialConfig]);

  async function handleSave() {
    setSaving(true);
    const payload = {
      nome: "whatsapp_meta",
      ativo,
      config: {
        phone_number_id: phoneNumberId.trim(),
        waba_id: wabaId.trim(),
        access_token: accessToken.trim(),
        verify_token: verifyToken.trim(),
        phone_number: phoneNumber.trim(),
      },
    };
    const { error } = await supabase
      .from("integracoes_config")
      .upsert(payload, { onConflict: "nome" });
    setSaving(false);
    if (error) { toast.error("Erro ao salvar: " + error.message); return; }
    toast.success("Configuração salva com sucesso!");
    onSaved?.();
    onOpenChange(false);
  }

  async function handleTest() {
    setTesting(true);
    const { data, error } = await supabase.functions.invoke("whatsapp-meta", {
      body: { action: "test" },
    });
    setTesting(false);
    if (error) { toast.error("Falha na conexão: " + error.message); return; }
    if ((data as any)?.ok) toast.success("Conexão OK com a Meta Cloud API!");
    else toast.error("Não foi possível conectar: " + JSON.stringify((data as any)?.error ?? data));
  }

  const conectado = ativo && !!phoneNumberId && !!accessToken;

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="right" className="w-full sm:max-w-lg overflow-y-auto">
        <SheetHeader>
          <SheetTitle className="flex items-center gap-2">
            <span className="h-3 w-3 rounded-full" style={{ background: "#25D366" }} />
            WhatsApp API Oficial (Meta)
          </SheetTitle>
          <SheetDescription>
            Configuração da Meta Cloud API. A Evolution API continua funcionando normalmente.
          </SheetDescription>
        </SheetHeader>

        <div className="mt-4 space-y-5">
          <div className="rounded-xl border border-border p-3 flex items-center justify-between">
            <div className="flex items-center gap-2 text-sm">
              {conectado ? (
                <Badge className="gap-1 bg-emerald-100 text-emerald-700 border-emerald-200 dark:bg-emerald-900/30 dark:text-emerald-400">
                  <CheckCircle2 className="h-3 w-3" /> Conectado
                </Badge>
              ) : (
                <Badge className="gap-1 bg-amber-100 text-amber-700 border-amber-200 dark:bg-amber-900/30 dark:text-amber-400">
                  <Clock className="h-3 w-3" /> ⏳ Aguardando verificação Meta
                </Badge>
              )}
            </div>
            <div className="flex items-center gap-2">
              <Switch checked={ativo} onCheckedChange={setAtivo} id="meta-ativo" />
              <Label htmlFor="meta-ativo" className="text-xs cursor-pointer">Ativa</Label>
            </div>
          </div>

          <Separator />

          <div className="space-y-1.5">
            <Label className="text-xs">Phone Number ID</Label>
            <Input value={phoneNumberId} onChange={(e) => setPhoneNumberId(e.target.value)} placeholder="1234567890" className="h-9" />
            <p className="text-[11px] text-muted-foreground">ID do número no Meta Business</p>
          </div>

          <div className="space-y-1.5">
            <Label className="text-xs">WhatsApp Business Account ID (WABA ID)</Label>
            <Input value={wabaId} onChange={(e) => setWabaId(e.target.value)} placeholder="0987654321" className="h-9" />
          </div>

          <div className="space-y-1.5">
            <Label className="text-xs">Access Token (permanente)</Label>
            <div className="relative">
              <Input
                type={showToken ? "text" : "password"}
                value={accessToken}
                onChange={(e) => setAccessToken(e.target.value)}
                placeholder="EAAG..."
                className="h-9 pr-10"
              />
              <button
                type="button"
                onClick={() => setShowToken(!showToken)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
              >
                {showToken ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </button>
            </div>
            <p className="text-[11px] text-muted-foreground">Token gerado no Meta Business Suite</p>
          </div>

          <div className="space-y-1.5">
            <Label className="text-xs">Verify Token (webhook)</Label>
            <Input value={verifyToken} onChange={(e) => setVerifyToken(e.target.value)} placeholder="softflow_meta_webhook" className="h-9" />
            <p className="text-[11px] text-muted-foreground">Token de verificação do webhook</p>
          </div>

          <div className="space-y-1.5">
            <Label className="text-xs">Número de telefone</Label>
            <Input value={phoneNumber} onChange={(e) => setPhoneNumber(e.target.value)} placeholder="+5584999999999" className="h-9" />
          </div>

          <div className="rounded-xl bg-muted/40 border border-border p-3 space-y-1">
            <p className="text-[11px] font-medium">URL do webhook (Meta)</p>
            <code className="text-[11px] break-all text-muted-foreground">
              {`https://${import.meta.env.VITE_SUPABASE_PROJECT_ID}.supabase.co/functions/v1/whatsapp-meta-webhook`}
            </code>
          </div>

          <div className="flex gap-2 pt-2">
            <Button variant="outline" onClick={handleTest} disabled={testing} className="gap-2">
              {testing ? <Loader2 className="h-4 w-4 animate-spin" /> : <PlugZap className="h-4 w-4" />}
              Testar conexão
            </Button>
            <Button onClick={handleSave} disabled={saving} className="gap-2 ml-auto">
              {saving && <Loader2 className="h-4 w-4 animate-spin" />}
              Salvar
            </Button>
          </div>
        </div>
      </SheetContent>
    </Sheet>
  );
}
