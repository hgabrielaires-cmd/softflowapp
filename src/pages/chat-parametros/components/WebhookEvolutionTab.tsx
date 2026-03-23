import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Loader2, Zap, CheckCircle2, XCircle } from "lucide-react";
import { useChatParametrosForm } from "../useChatParametrosForm";

interface InstanceStatus {
  name: string;
  status: "pending" | "success" | "error";
  message?: string;
}

export function WebhookEvolutionTab() {
  const { configurarWebhook } = useChatParametrosForm();
  const [instancias, setInstancias] = useState<string[]>([]);
  const [novaInstancia, setNovaInstancia] = useState("");
  const [statuses, setStatuses] = useState<InstanceStatus[]>([]);
  const [configuring, setConfiguring] = useState(false);

  const addInstancia = () => {
    const name = novaInstancia.trim();
    if (name && !instancias.includes(name)) {
      setInstancias((prev) => [...prev, name]);
      setNovaInstancia("");
    }
  };

  const removeInstancia = (name: string) => {
    setInstancias((prev) => prev.filter((i) => i !== name));
  };

  const handleConfigurar = async (instanceName: string) => {
    setStatuses((prev) => [...prev.filter((s) => s.name !== instanceName), { name: instanceName, status: "pending" }]);
    try {
      await configurarWebhook.mutateAsync(instanceName);
      setStatuses((prev) => prev.map((s) => (s.name === instanceName ? { ...s, status: "success" } : s)));
    } catch (err: any) {
      setStatuses((prev) => prev.map((s) => (s.name === instanceName ? { ...s, status: "error", message: err.message } : s)));
    }
  };

  const handleConfigurarTodas = async () => {
    if (instancias.length === 0) return;
    setConfiguring(true);
    for (const name of instancias) {
      await handleConfigurar(name);
    }
    setConfiguring(false);
  };

  const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
  const webhookUrl = `${supabaseUrl}/functions/v1/evolution-webhook`;

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Configurar Webhook da Evolution API</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="bg-muted/50 rounded-lg p-4">
            <p className="text-sm font-medium mb-1">URL do Webhook (base):</p>
            <code className="text-xs break-all bg-background border rounded px-2 py-1 block">{webhookUrl}</code>
            <p className="text-xs text-muted-foreground mt-2">
              O token de autenticação é adicionado automaticamente ao configurar.
            </p>
          </div>

          <p className="text-sm text-muted-foreground">
            Informe o nome das instâncias da Evolution API e clique para configurar o webhook automaticamente.
          </p>

          <div className="flex gap-2">
            <Input
              placeholder="Nome da instância (ex: softplus-01)"
              value={novaInstancia}
              onChange={(e) => setNovaInstancia(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && addInstancia()}
            />
            <Button variant="outline" onClick={addInstancia}>Adicionar</Button>
          </div>

          {instancias.length > 0 && (
            <div className="space-y-2">
              {instancias.map((name) => {
                const st = statuses.find((s) => s.name === name);
                return (
                  <div key={name} className="flex items-center gap-2 text-sm border rounded-lg px-3 py-2">
                    {st?.status === "pending" && <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />}
                    {st?.status === "success" && <CheckCircle2 className="h-4 w-4 text-green-600" />}
                    {st?.status === "error" && <XCircle className="h-4 w-4 text-destructive" />}
                    {!st && <Zap className="h-4 w-4 text-muted-foreground" />}
                    <span className="font-mono flex-1">{name}</span>
                    {st?.status === "error" && <span className="text-destructive text-xs">{st.message}</span>}
                    <Button variant="ghost" size="sm" onClick={() => handleConfigurar(name)} disabled={configuring}>
                      Configurar
                    </Button>
                    <Button variant="ghost" size="sm" onClick={() => removeInstancia(name)} className="text-destructive">
                      Remover
                    </Button>
                  </div>
                );
              })}

              <Button onClick={handleConfigurarTodas} disabled={configuring} className="mt-2">
                {configuring ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Zap className="h-4 w-4 mr-2" />}
                Configurar Todas
              </Button>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
