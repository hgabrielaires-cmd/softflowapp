import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Eye, EyeOff, Lock, Mail, Loader2 } from "lucide-react";
import { toast } from "sonner";
import logoSoftflowBranca from "@/assets/logo-softflow-branca.png";
import logoSoftplusAzul from "@/assets/logo-softplus-azul.png";

export default function Login() {
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);

  async function handleLogin(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);

    // Proteção contra brute-force: verificar bloqueio
    try {
      const { data: isBlocked } = await supabase.rpc("check_login_blocked", { p_email: email });
      if (isBlocked) {
        toast.error("Muitas tentativas de login. Aguarde 5 minutos antes de tentar novamente.");
        setLoading(false);
        return;
      }
    } catch (e) {
      console.warn("Erro ao verificar bloqueio de login:", e);
    }

    const { data: authData, error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) {
      // Registrar tentativa falhada
      try {
        await supabase.rpc("record_login_attempt", { p_email: email, p_success: false });
      } catch (e) {
        console.warn("Erro ao registrar tentativa:", e);
      }
      toast.error("Credenciais inválidas. Verifique seu e-mail e senha.");
      setLoading(false);
      return;
    }

    // Registrar tentativa bem-sucedida
    try {
      await supabase.rpc("record_login_attempt", { p_email: email, p_success: true });
    } catch (e) {
      console.warn("Erro ao registrar login:", e);
    }

    const userId = authData.user?.id;
    if (!userId) {
      toast.error("Erro inesperado ao autenticar.");
      setLoading(false);
      return;
    }

    // Verificar se o usuário está ativo
    const { data: profile } = await supabase
      .from("profiles")
      .select("active, filial_id, acesso_global")
      .eq("user_id", userId)
      .single();

    if (profile?.active === false) {
      toast.error("Sua conta está inativa. Entre em contato com o administrador.");
      await supabase.auth.signOut();
      setLoading(false);
      return;
    }

    // Verificar se tem filial vinculada via usuario_filiais (fonte única de verdade)
    if (!profile?.acesso_global) {
      const { data: ufData } = await supabase
        .from("usuario_filiais")
        .select("filial_id")
        .eq("user_id", userId)
        .limit(1);

      if (!ufData || ufData.length === 0) {
        toast.error("Seu usuário não possui nenhuma filial vinculada. Entre em contato com o administrador.");
        await supabase.auth.signOut();
        setLoading(false);
        return;
      }
    }

    navigate("/dashboard");
  }

  return (
    <div className="min-h-screen flex">
      {/* Left panel */}
      <div className="hidden lg:flex lg:w-1/2 gradient-hero flex-col items-center justify-center p-12">
        <img src={logoSoftflowBranca} alt="Softflow" className="w-64 object-contain" loading="eager" fetchPriority="high" />
      </div>

      {/* Right panel */}
      <div className="flex-1 flex items-center justify-center p-8 bg-background">
        <div className="w-full max-w-md">
          {/* Logo */}
          <div className="mb-8 flex justify-center">
            <img alt="Softflow" className="h-16 object-contain" src="/lovable-uploads/41a83057-5d6f-4fb4-9aae-97e8b980824c.png" loading="eager" fetchPriority="high" />
          </div>

          <div className="mb-8">
            <h2 className="text-2xl font-bold text-foreground mb-1" style={{ fontFamily: 'Plus Jakarta Sans, sans-serif' }}>
              Bem-vindo de volta
            </h2>
            <p className="text-muted-foreground text-sm">
              Entre com suas credenciais para acessar o sistema
            </p>
          </div>

          <form onSubmit={handleLogin} className="space-y-5">
            <div className="space-y-1.5">
              <Label htmlFor="email" className="text-sm font-medium">
                E-mail
              </Label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  id="email"
                  type="email"
                  placeholder="seu@email.com"
                  className="pl-9"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required />
              </div>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="password" className="text-sm font-medium">
                Senha
              </Label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  id="password"
                  type={showPassword ? "text" : "password"}
                  placeholder="••••••••"
                  className="pl-9 pr-10"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors">
                  {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
            </div>

            <Button
              type="submit"
              className="w-full h-11 text-sm font-semibold"
              style={{ background: 'var(--gradient-brand)' }}
              disabled={loading}>
              {loading ?
              <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Entrando...
                </> :
              "Entrar no sistema"
              }
            </Button>
          </form>

          <p className="text-center text-xs text-muted-foreground mt-8">
            Acesso restrito. Entre em contato com o administrador para obter acesso.
          </p>

          <div className="flex items-center justify-center gap-2 mt-6">
            <span className="text-xs text-muted-foreground">By
            </span>
            <img src={logoSoftplusAzul} alt="Softplus" className="h-5 object-contain opacity-70" />
          </div>
        </div>
      </div>
    </div>);
}