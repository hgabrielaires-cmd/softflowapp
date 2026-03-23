import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Loader2, Zap, CheckCircle2, XCircle } from "lucide-react";
import { useChatParametrosForm } from "../useChatParametrosForm";
import { supabase } from "@/integrations/supabase/client";
import { useQuery } from "@tanstack/react-query";

interface InstanceStatus {
  name: string;
  status: "pending" | "success" | "error";
  message?: string;
}

export function WebhookEvolutionTab() {
  const { configurarWebhook } = useChatParametrosForm();
  const [statuses, setStatuses] = useState<InstanceStatus[]>([]);
  const [configuring, setConfiguring] = useState(false);

  const instanciasQuery = useQuery({
    queryKey: ["evolution-instancias"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("integracoes")
        .select("config")
        .eq("tipo", "evolution_api")
        .eq("ativo", true);
      if (error) throw error;
      const instances: string[] = [];
      (data || []).forEach((row: any) => {
        const config = row.config;
        if (config?.instance_name) instances.push(config.instance_name);
        if (config?.instances && Array.isArray(config.instances)) {
          config.instances.forEach((i: any) => {
            if (i.name) instances.push(i.name);
          });
        }
      });
      return instances;
    },
  });

  const handleConfigurarTodas = async () => {
    const instances = instanciasQuery.data || [];
    if (instances.length === 0) return;

    setConfiguring(true);
    const results: InstanceStatus[] = instances.map((name) => ({ name, status: "pending" as const }));
    setStatuses([...results]);

    for (let i = 0; i < instances.length; i++) {
      try {
        await configurarWebhook.mutateAsync(instances[i]);
        results[i] = { name: instances[i], status: "success" };
      } catch (err: any) {
        results[i] = { name: instances[i], status: "error", message: err.message };
      }
      setStatuses([...results]);
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
            <p className="text-sm font-medium mb-1">URL do Webhook:</p>
            <code className="text-xs break-all bg-background border rounded px-2 py-1 block">{webhookUrl}</code>
          </div>

          <p className="text-sm text-muted-foreground">
            Ao clicar no botão abaixo, o webhook será configurado automaticamente em todas as instâncias ativas da Evolution API,
            apontando para a edge function de recebimento de mensagens.
          </p>

          {instanciasQuery.isLoading ? (
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Loader2 className="h-4 w-4 animate-spin" /> Buscando instâncias...
            </div>
          ) : (instanciasQuery.data?.length || 0) === 0 ? (
            <div className="text-sm text-muted-foreground">
              Nenhuma instância da Evolution API encontrada. Configure uma integração primeiro em Parâmetros → Integrações.
            </div>
          ) : (
            <>
              <p className="text-sm">
                <strong>{instanciasQuery.data?.length}</strong> instância(s) encontrada(s):
                {instanciasQuery.data?.map((name) => (
                  <Badge key={name} variant="outline" className="ml-2">{name}</Badge>
                ))}
              </p>
              <Button onClick={handleConfigurarTodas} disabled={configuring}>
                {configuring ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Zap className="h-4 w-4 mr-2" />}
                Configurar Webhook em Todas as Instâncias
              </Button>
            </>
          )}

          {statuses.length > 0 && (
            <div className="space-y-2 mt-4">
              {statuses.map((s) => (
                <div key={s.name} className="flex items-center gap-2 text-sm">
                  {s.status === "pending" && <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />}
                  {s.status === "success" && <CheckCircle2 className="h-4 w-4 text-green-600" />}
                  {s.status === "error" && <XCircle className="h-4 w-4 text-destructive" />}
                  <span className="font-mono">{s.name}</span>
                  {s.status === "success" && <span className="text-green-600">Configurado!</span>}
                  {s.status === "error" && <span className="text-destructive text-xs">{s.message}</span>}
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
