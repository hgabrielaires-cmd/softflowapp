import { Navigate } from "react-router-dom";
import { useAuth } from "@/context/AuthContext";
import { Loader2, Building2 } from "lucide-react";
import { ReactNode } from "react";
import { AppRole } from "@/lib/supabase-types";
import { Button } from "@/components/ui/button";

interface ProtectedRouteProps {
  children: ReactNode;
  requiredRole?: AppRole;
}

export function ProtectedRoute({ children, requiredRole }: ProtectedRouteProps) {
  const { user, roles, loading, deveTrocarSenha, semFilial, signOut } = useAuth();

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <div className="flex flex-col items-center gap-3">
          <Loader2 className="h-8 w-8 animate-spin text-emerald" />
          <p className="text-sm text-muted-foreground">Carregando...</p>
        </div>
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  // Forçar troca de senha no primeiro acesso
  if (deveTrocarSenha) {
    return <Navigate to="/trocar-senha" replace />;
  }

  // Bloquear usuário sem filial vinculada
  if (semFilial) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <div className="flex flex-col items-center gap-4 max-w-md text-center p-6">
          <div className="rounded-full bg-destructive/10 p-4">
            <Building2 className="h-10 w-10 text-destructive" />
          </div>
          <h2 className="text-xl font-semibold">Acesso Bloqueado</h2>
          <p className="text-muted-foreground">
            Seu usuário não possui nenhuma filial vinculada. Entre em contato com o administrador para liberar o acesso.
          </p>
          <Button variant="outline" onClick={() => signOut()}>
            Sair
          </Button>
        </div>
      </div>
    );
  }

  if (requiredRole && !roles.includes(requiredRole) && !roles.includes("admin")) {
    return <Navigate to="/dashboard" replace />;
  }

  return <>{children}</>;
}
