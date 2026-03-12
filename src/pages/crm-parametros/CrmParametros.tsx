import { AppLayout } from "@/components/AppLayout";
import { useAuth } from "@/context/AuthContext";
import { Navigate } from "react-router-dom";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Filter, Settings2, Briefcase } from "lucide-react";
import { FunisTab } from "./components/FunisTab";
import { CamposPersonalizadosTab } from "./components/CamposPersonalizadosTab";
import { CargosTab } from "./components/CargosTab";

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
        </Tabs>
      </div>
    </AppLayout>
  );
}
