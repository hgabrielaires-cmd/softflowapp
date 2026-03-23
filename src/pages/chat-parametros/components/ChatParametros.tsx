import { AppLayout } from "@/components/AppLayout";
import { useAuth } from "@/context/AuthContext";
import { Navigate } from "react-router-dom";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Settings2, Bot, Zap, MessageSquare } from "lucide-react";
import { ConfigGeralTab } from "./ConfigGeralTab";
import { FluxoBotTab } from "./FluxoBotTab";
import { RespostasRapidasTab } from "./RespostasRapidasTab";
import { WebhookEvolutionTab } from "./WebhookEvolutionTab";

export default function ChatParametros() {
  const { isAdmin } = useAuth();

  if (!isAdmin) return <Navigate to="/dashboard" replace />;

  return (
    <AppLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Chat — Configurações</h1>
          <p className="text-sm text-muted-foreground mt-1">
            Gerencie configurações do chat, fluxo do bot, respostas rápidas e webhook
          </p>
        </div>

        <Tabs defaultValue="geral" className="space-y-4">
          <TabsList>
            <TabsTrigger value="geral" className="gap-1.5">
              <Settings2 className="h-4 w-4" /> Configurações Gerais
            </TabsTrigger>
            <TabsTrigger value="fluxo" className="gap-1.5">
              <Bot className="h-4 w-4" /> Fluxo do Bot
            </TabsTrigger>
            <TabsTrigger value="respostas" className="gap-1.5">
              <MessageSquare className="h-4 w-4" /> Respostas Rápidas
            </TabsTrigger>
            <TabsTrigger value="webhook" className="gap-1.5">
              <Zap className="h-4 w-4" /> Webhook Evolution
            </TabsTrigger>
          </TabsList>

          <TabsContent value="geral">
            <ConfigGeralTab />
          </TabsContent>
          <TabsContent value="fluxo">
            <FluxoBotTab />
          </TabsContent>
          <TabsContent value="respostas">
            <RespostasRapidasTab />
          </TabsContent>
          <TabsContent value="webhook">
            <WebhookEvolutionTab />
          </TabsContent>
        </Tabs>
      </div>
    </AppLayout>
  );
}
