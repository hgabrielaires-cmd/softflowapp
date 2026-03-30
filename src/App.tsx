import React, { Suspense } from "react";
import { useVersionCheck } from "@/hooks/useVersionCheck";
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { AuthProvider } from "@/context/AuthContext";
import { ProtectedRoute } from "@/components/ProtectedRoute";
import { ComingSoon } from "./components/ComingSoon";

// ── Lazy-loaded pages ────────────────────────────────────────────────────────
const Login = React.lazy(() => import("./pages/Login"));
const ResetPassword = React.lazy(() => import("./pages/ResetPassword"));
const TrocarSenha = React.lazy(() => import("./pages/TrocarSenha"));
const NotFound = React.lazy(() => import("./pages/NotFound"));
const Dashboard = React.lazy(() => import("./pages/Dashboard"));
const Usuarios = React.lazy(() => import("./pages/Usuarios"));
const Perfil = React.lazy(() => import("./pages/Perfil"));
const Filiais = React.lazy(() => import("./pages/Filiais"));
const Financeiro = React.lazy(() => import("./pages/Financeiro"));
const Clientes = React.lazy(() => import("./pages/Clientes"));
const Contatos = React.lazy(() => import("@/pages/Contatos"));
const Planos = React.lazy(() => import("./pages/Planos"));
const Pedidos = React.lazy(() => import("./pages/Pedidos"));
const Contratos = React.lazy(() => import("./pages/Contratos"));
const Notificacoes = React.lazy(() => import("./pages/Notificacoes"));
const ModelosContrato = React.lazy(() => import("./pages/ModelosContrato"));
const PerfisUsuario = React.lazy(() => import("./pages/PerfisUsuario"));
const Fornecedores = React.lazy(() => import("./pages/Fornecedores"));
const Servicos = React.lazy(() => import("./pages/Servicos"));
const Integracoes = React.lazy(() => import("./pages/Integracoes"));
const Agenda = React.lazy(() => import("./pages/Agenda"));
const MesasAtendimento = React.lazy(() => import("./pages/MesasAtendimento"));
const JornadaImplantacao = React.lazy(() => import("./pages/JornadaImplantacao"));
const PainelAtendimento = React.lazy(() => import("./pages/PainelAtendimento"));
const EtapasPainel = React.lazy(() => import("./pages/EtapasPainel"));
const DashboardFinanceiro = React.lazy(() => import("./pages/DashboardFinanceiro"));
const DashboardAtendimento = React.lazy(() => import("./pages/DashboardAtendimento"));
const DashboardChatAtendimento = React.lazy(() => import("./pages/DashboardChatAtendimento"));
const Segmentos = React.lazy(() => import("./pages/Segmentos"));
const Setores = React.lazy(() => import("./pages/Setores"));
const Automacoes = React.lazy(() => import("./pages/Automacoes"));
const Faturamento = React.lazy(() => import("./pages/Faturamento"));
const ConfigurarFaturamento = React.lazy(() => import("./pages/configurar-faturamento/components/ConfigurarFaturamento"));
const CrmParametros = React.lazy(() => import("./pages/crm-parametros/CrmParametros"));
const CrmPipeline = React.lazy(() => import("./pages/CrmPipeline"));
const Tickets = React.lazy(() => import("./pages/Tickets"));
const TicketNovo = React.lazy(() => import("./pages/TicketNovo"));
const HelpdeskParametros = React.lazy(() => import("./pages/HelpdeskParametros"));
const TesteAsaas = React.lazy(() => import("./pages/TesteAsaas"));
const AgendaCrm = React.lazy(() => import("./pages/AgendaCrm"));
const DashboardCrm = React.lazy(() => import("./pages/DashboardCrm"));
const Chat = React.lazy(() => import("./pages/Chat"));
const ChatParametros = React.lazy(() => import("./pages/chat-parametros"));

function PageLoader() {
  return (
    <div className="flex items-center justify-center min-h-screen bg-background">
      <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
    </div>
  );
}

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 1000 * 60 * 2, // 2 min default
      refetchOnWindowFocus: false,
    },
  },
});

const App = () => {
  useVersionCheck();
  return (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner richColors />
      <BrowserRouter>
        <AuthProvider>
          <Suspense fallback={<PageLoader />}>
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
              path="/dashboard-tickets"
              element={
                <ProtectedRoute>
                  <DashboardAtendimento />
                </ProtectedRoute>
              }
            />
            <Route
              path="/dashboard-atendimento"
              element={
                <ProtectedRoute>
                  <DashboardChatAtendimento />
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
              path="/contatos"
              element={
                <ProtectedRoute>
                  <Contatos />
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
                  <Tickets />
                </ProtectedRoute>
              }
            />
            <Route
              path="/tickets/novo"
              element={
                <ProtectedRoute>
                  <TicketNovo />
                </ProtectedRoute>
              }
            />
            <Route
              path="/helpdesk-parametros"
              element={
                <ProtectedRoute>
                  <HelpdeskParametros />
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
              path="/faturamento/configurar/:contratoId"
              element={
                <ProtectedRoute>
                  <ConfigurarFaturamento />
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
                  <DashboardCrm />
                </ProtectedRoute>
              }
            />
            <Route
              path="/crm-pipeline"
              element={
                <ProtectedRoute>
                  <CrmPipeline />
                </ProtectedRoute>
              }
            />
            <Route
              path="/crm-agenda"
              element={
                <ProtectedRoute>
                  <AgendaCrm />
                </ProtectedRoute>
              }
            />
            <Route
              path="/financeiro/teste-asaas"
              element={
                <ProtectedRoute>
                  <TesteAsaas />
                </ProtectedRoute>
              }
            />
            <Route
              path="/chat"
              element={
                <ProtectedRoute>
                  <Chat />
                </ProtectedRoute>
              }
            />
            <Route
              path="/chat-parametros"
              element={
                <ProtectedRoute>
                  <ChatParametros />
                </ProtectedRoute>
              }
            />
            <Route path="*" element={<NotFound />} />
          </Routes>
          </Suspense>
        </AuthProvider>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
  );
};

export default App;
