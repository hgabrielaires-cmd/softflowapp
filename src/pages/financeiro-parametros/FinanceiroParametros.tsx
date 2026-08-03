import { AppLayout } from "@/components/AppLayout";
import { useAuth } from "@/context/AuthContext";
import { Navigate } from "react-router-dom";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ListTree, Layers, CreditCard, Landmark } from "lucide-react";
import { PlanoContasTab } from "./components/PlanoContasTab";
import { CentrosCustoTab } from "./components/CentrosCustoTab";
import { FormasPagamentoTab } from "./components/FormasPagamentoTab";
import { ContasFinanceirasTab } from "./components/ContasFinanceirasTab";

export default function FinanceiroParametros() {
  const { isAdmin } = useAuth();

  if (!isAdmin) return <Navigate to="/dashboard" replace />;

  return (
    <AppLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Financeiro — Configurações</h1>
          <p className="text-sm text-muted-foreground mt-1">
            Gerencie plano de contas, centros de custo, formas de pagamento e contas financeiras
          </p>
        </div>

        <Tabs defaultValue="plano_contas" className="space-y-4">
          <TabsList>
            <TabsTrigger value="plano_contas" className="gap-1.5">
              <ListTree className="h-4 w-4" /> Plano de Contas
            </TabsTrigger>
            <TabsTrigger value="centros_custo" className="gap-1.5">
              <Layers className="h-4 w-4" /> Centros de Custo
            </TabsTrigger>
            <TabsTrigger value="formas_pagamento" className="gap-1.5">
              <CreditCard className="h-4 w-4" /> Formas de Pagamento
            </TabsTrigger>
            <TabsTrigger value="contas_financeiras" className="gap-1.5">
              <Landmark className="h-4 w-4" /> Contas Financeiras
            </TabsTrigger>
          </TabsList>

          <TabsContent value="plano_contas"><PlanoContasTab /></TabsContent>
          <TabsContent value="centros_custo"><CentrosCustoTab /></TabsContent>
          <TabsContent value="formas_pagamento"><FormasPagamentoTab /></TabsContent>
          <TabsContent value="contas_financeiras"><ContasFinanceirasTab /></TabsContent>
        </Tabs>
      </div>
    </AppLayout>
  );
}
