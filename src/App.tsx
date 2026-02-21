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
import Integracoes from "./pages/Integracoes";
import ResetPassword from "./pages/ResetPassword";
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient();

const App = () => (
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
            <Route
              path="/dashboard"
              element={
                <ProtectedRoute>
                  <Dashboard />
                </ProtectedRoute>
              }
            />
            <Route
              path="/usuarios"
              element={
                <ProtectedRoute requiredRole="admin">
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
              <ProtectedRoute requiredRole="financeiro">
                  <Financeiro />
                </ProtectedRoute>
              }
            />
            <Route
              path="/agenda"
              element={
                <ProtectedRoute>
                  <ComingSoon
                    module="Módulo 5"
                    title="Agenda Operacional"
                    description="Em desenvolvimento. Controle de instalações, treinamentos e retreinamentos."
                  />
                </ProtectedRoute>
              }
            />
            <Route
              path="/filiais"
              element={
                <ProtectedRoute requiredRole="admin">
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
                <ProtectedRoute requiredRole="admin">
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
                <ProtectedRoute requiredRole="financeiro">
                  <ComingSoon module="Financeiro" title="Receitas" description="Em desenvolvimento. Lançamento e controle de receitas." />
                </ProtectedRoute>
              }
            />
            <Route
              path="/despesas"
              element={
                <ProtectedRoute requiredRole="financeiro">
                  <ComingSoon module="Financeiro" title="Despesas" description="Em desenvolvimento. Lançamento e controle de despesas." />
                </ProtectedRoute>
              }
            />
            <Route
              path="/dre"
              element={
                <ProtectedRoute requiredRole="financeiro">
                  <ComingSoon module="Financeiro" title="DRE" description="Em desenvolvimento. Demonstrativo de Resultado do Exercício." />
                </ProtectedRoute>
              }
            />
            <Route
              path="/notificacoes"
              element={
                <ProtectedRoute requiredRole="admin">
                  <Notificacoes />
                </ProtectedRoute>
              }
            />
            <Route
              path="/modelos-contrato"
              element={
                <ProtectedRoute requiredRole="admin">
                  <ModelosContrato />
                </ProtectedRoute>
              }
            />
            <Route
              path="/perfis-usuario"
              element={
                <ProtectedRoute requiredRole="admin">
                  <PerfisUsuario />
                </ProtectedRoute>
              }
            />
            <Route
              path="/fornecedores"
              element={
                <ProtectedRoute requiredRole="admin">
                  <Fornecedores />
                </ProtectedRoute>
              }
            />
            <Route
              path="/integracoes"
              element={
                <ProtectedRoute requiredRole="admin">
                  <Integracoes />
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

export default App;
