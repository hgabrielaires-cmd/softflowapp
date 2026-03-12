import { useVersionCheck } from "@/hooks/useVersionCheck";
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { AuthProvider } from "@/context/AuthContext";
import { ProtectedRoute } from "@/components/ProtectedRoute";
import Login from "./pages/Login";
import Dashboard from "./pages/Dashboard";
import Usuarios from "./pages/Usuarios";
import Perfil from "./pages/Perfil";
import Filiais from "./pages/Filiais";
import Financeiro from "./pages/Financeiro";
import { ComingSoon } from "./components/ComingSoon";
import Clientes from "./pages/Clientes";
import Planos from "./pages/Planos";
import Pedidos from "./pages/Pedidos";
import Contratos from "./pages/Contratos";
import Notificacoes from "./pages/Notificacoes";
import ModelosContrato from "./pages/ModelosContrato";
import PerfisUsuario from "./pages/PerfisUsuario";
import Fornecedores from "./pages/Fornecedores";
import Servicos from "./pages/Servicos";
import Integracoes from "./pages/Integracoes";
import ResetPassword from "./pages/ResetPassword";
import NotFound from "./pages/NotFound";
import Agenda from "./pages/Agenda";
import TrocarSenha from "./pages/TrocarSenha";
import MesasAtendimento from "./pages/MesasAtendimento";
import JornadaImplantacao from "./pages/JornadaImplantacao";
import PainelAtendimento from "./pages/PainelAtendimento";
import EtapasPainel from "./pages/EtapasPainel";
import DashboardFinanceiro from "./pages/DashboardFinanceiro";
import DashboardAtendimento from "./pages/DashboardAtendimento";
import Segmentos from "./pages/Segmentos";
import Setores from "./pages/Setores";
import Automacoes from "./pages/Automacoes";
import Faturamento from "./pages/Faturamento";
import CrmParametros from "./pages/crm-parametros/CrmParametros";
import CrmPipeline from "./pages/CrmPipeline";

const queryClient = new QueryClient();

const App = () => {
  useVersionCheck();
  return (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner richColors />
      <BrowserRouter>
        <AuthProvider>
          <Routes>
            <Route path="/" element={<Navigate to="/login" replace />} />
            <Route path="/login" element={<Login />} />
            <Route path="/reset-password" element={<ResetPassword />} />
            <Route path="/trocar-senha" element={<TrocarSenha />} />
            <Route
              path="/dashboard"
              element={
                <ProtectedRoute>
                  <Dashboard />
                </ProtectedRoute>
              }
            />
            <Route
              path="/dashboard-financeiro"
              element={
                <ProtectedRoute>
                  <DashboardFinanceiro />
                </ProtectedRoute>
              }
            />
            <Route
              path="/dashboard-atendimento"
              element={
                <ProtectedRoute>
                  <DashboardAtendimento />
                </ProtectedRoute>
              }
            />
            <Route
              path="/usuarios"
              element={
                <ProtectedRoute>
                  <Usuarios />
                </ProtectedRoute>
              }
            />
            <Route
              path="/perfil"
              element={
                <ProtectedRoute>
                  <Perfil />
                </ProtectedRoute>
              }
            />
            <Route
              path="/pedidos"
              element={
                <ProtectedRoute>
                  <Pedidos />
                </ProtectedRoute>
              }
            />
            <Route
              path="/financeiro"
              element={
                <ProtectedRoute>
                  <Financeiro />
                </ProtectedRoute>
              }
            />
            <Route
              path="/agenda"
              element={
                <ProtectedRoute>
                  <Agenda />
                </ProtectedRoute>
              }
            />
            <Route
              path="/filiais"
              element={
                <ProtectedRoute>
                  <Filiais />
                </ProtectedRoute>
              }
            />
            <Route
              path="/clientes"
              element={
                <ProtectedRoute>
                  <Clientes />
                </ProtectedRoute>
              }
            />
            <Route
              path="/planos"
              element={
                <ProtectedRoute>
                  <Planos />
                </ProtectedRoute>
              }
            />
            <Route
              path="/tickets"
              element={
                <ProtectedRoute>
                  <ComingSoon module="Helpdesk" title="Tickets" description="Em desenvolvimento. Gestão de tickets de suporte." />
                </ProtectedRoute>
              }
            />
            <Route
              path="/pedidos/novo"
              element={
                <ProtectedRoute>
                  <ComingSoon module="Pedidos" title="Criar Pedido" description="Em desenvolvimento. Formulário de criação de pedido direto pelo menu." />
                </ProtectedRoute>
              }
            />
            <Route
              path="/contratos"
              element={
                <ProtectedRoute>
                  <Contratos />
                </ProtectedRoute>
              }
            />
            <Route
              path="/receitas"
              element={
                <ProtectedRoute>
                  <ComingSoon module="Financeiro" title="Receitas" description="Em desenvolvimento. Lançamento e controle de receitas." />
                </ProtectedRoute>
              }
            />
            <Route
              path="/despesas"
              element={
                <ProtectedRoute>
                  <ComingSoon module="Financeiro" title="Despesas" description="Em desenvolvimento. Lançamento e controle de despesas." />
                </ProtectedRoute>
              }
            />
            <Route
              path="/dre"
              element={
                <ProtectedRoute>
                  <ComingSoon module="Financeiro" title="DRE" description="Em desenvolvimento. Demonstrativo de Resultado do Exercício." />
                </ProtectedRoute>
              }
            />
            <Route
              path="/notificacoes"
              element={
                <ProtectedRoute>
                  <Notificacoes />
                </ProtectedRoute>
              }
            />
            <Route
              path="/modelos-contrato"
              element={
                <ProtectedRoute>
                  <ModelosContrato />
                </ProtectedRoute>
              }
            />
            <Route
              path="/perfis-usuario"
              element={
                <ProtectedRoute>
                  <PerfisUsuario />
                </ProtectedRoute>
              }
            />
            <Route
              path="/fornecedores"
              element={
                <ProtectedRoute>
                  <Fornecedores />
                </ProtectedRoute>
              }
            />
            <Route
              path="/servicos"
              element={
                <ProtectedRoute>
                  <Servicos />
                </ProtectedRoute>
              }
            />
            <Route
              path="/integracoes"
              element={
                <ProtectedRoute>
                  <Integracoes />
                </ProtectedRoute>
              }
            />
            <Route
              path="/jornadas"
              element={
                <ProtectedRoute>
                  <JornadaImplantacao />
                </ProtectedRoute>
              }
            />
            <Route
              path="/mesas-atendimento"
              element={
                <ProtectedRoute>
                  <MesasAtendimento />
                </ProtectedRoute>
              }
            />
            <Route
              path="/etapas-painel"
              element={
                <ProtectedRoute>
                  <EtapasPainel />
                </ProtectedRoute>
              }
            />
            <Route
              path="/fila-agendamento"
              element={
                <ProtectedRoute>
                  <PainelAtendimento />
                </ProtectedRoute>
              }
            />
            <Route
              path="/segmentos"
              element={
                <ProtectedRoute>
                  <Segmentos />
                </ProtectedRoute>
              }
            />
            <Route
              path="/setores"
              element={
                <ProtectedRoute>
                  <Setores />
                </ProtectedRoute>
              }
            />
            <Route
              path="/automacoes"
              element={
                <ProtectedRoute>
                  <Automacoes />
                </ProtectedRoute>
              }
            />
            <Route
              path="/faturamento"
              element={
                <ProtectedRoute>
                  <Faturamento />
                </ProtectedRoute>
              }
            />
            <Route
              path="/crm-parametros"
              element={
                <ProtectedRoute>
                  <CrmParametros />
                </ProtectedRoute>
              }
            />
            <Route
              path="/dashboard-crm"
              element={
                <ProtectedRoute>
                  <ComingSoon module="CRM" title="Dashboard CRM" description="Em desenvolvimento. Painel de indicadores do CRM." />
                </ProtectedRoute>
              }
            />
            <Route
              path="/crm-pipeline"
              element={
                <ProtectedRoute>
                  <ComingSoon module="CRM" title="Pipeline de Vendas" description="Em desenvolvimento. Visualização do pipeline de vendas." />
                </ProtectedRoute>
              }
            />
            <Route
              path="/crm-agenda"
              element={
                <ProtectedRoute>
                  <ComingSoon module="CRM" title="Agenda CRM" description="Em desenvolvimento. Agenda de atividades do CRM." />
                </ProtectedRoute>
              }
            />
            <Route path="*" element={<NotFound />} />
          </Routes>
        </AuthProvider>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
  );
};

export default App;
