import { AppLayout } from "@/components/AppLayout";
import { useAuth } from "@/context/AuthContext";
import { Navigate } from "react-router-dom";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Filter, Settings2, Briefcase, ThumbsDown, MessageSquare } from "lucide-react";
import { FunisTab } from "./components/FunisTab";
import { CamposPersonalizadosTab } from "./components/CamposPersonalizadosTab";
import { CargosTab } from "./components/CargosTab";
import { MotivosPerdaTab } from "./components/MotivosPerdaTab";
import { AutomacaoChatTab } from "./components/AutomacaoChatTab";

export default function CrmParametros() {
  const { isAdmin } = useAuth();

  if (!isAdmin) return <Navigate to="/dashboard" replace />;

  return (
    <AppLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold text-foreground">CRM — Configurações</h1>
          <p className="text-sm text-muted-foreground mt-1">Gerencie funis de venda, etapas e campos personalizados do CRM</p>
        </div>

        <Tabs defaultValue="funis" className="space-y-4">
          <TabsList>
            <TabsTrigger value="funis" className="gap-1.5">
              <Filter className="h-4 w-4" /> Funis e Etapas
            </TabsTrigger>
            <TabsTrigger value="campos" className="gap-1.5">
              <Settings2 className="h-4 w-4" /> Campos Personalizados
            </TabsTrigger>
            <TabsTrigger value="cargos" className="gap-1.5">
              <Briefcase className="h-4 w-4" /> Cargos
            </TabsTrigger>
            <TabsTrigger value="motivos_perda" className="gap-1.5">
              <ThumbsDown className="h-4 w-4" /> Motivos de Perda
            </TabsTrigger>
            <TabsTrigger value="automacao_chat" className="gap-1.5">
              <MessageSquare className="h-4 w-4" /> Automação Chat
            </TabsTrigger>
          </TabsList>

          <TabsContent value="funis">
            <FunisTab />
          </TabsContent>

          <TabsContent value="campos">
            <CamposPersonalizadosTab />
          </TabsContent>

          <TabsContent value="cargos">
            <CargosTab />
          </TabsContent>

          <TabsContent value="motivos_perda">
            <MotivosPerdaTab />
          </TabsContent>

          <TabsContent value="automacao_chat">
            <AutomacaoChatTab />
          </TabsContent>
        </Tabs>
      </div>
    </AppLayout>
  );
}
