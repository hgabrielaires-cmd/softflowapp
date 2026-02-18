import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Eye, EyeOff, Lock, Mail, Loader2 } from "lucide-react";
import { toast } from "sonner";
import logoSoftflowBranca from "@/assets/logo-softflow-branca.png";
import logoSoftflowAzul from "@/assets/logo-softflow-azul.png";

export default function Login() {
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);

  async function handleLogin(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) {
      toast.error("Credenciais inválidas. Verifique seu e-mail e senha.");
    } else {
      navigate("/dashboard");
    }
    setLoading(false);
  }

  return (
    <div className="min-h-screen flex">
      {/* Left panel */}
      <div className="hidden lg:flex lg:w-1/2 gradient-hero flex-col justify-between p-12">
        <div>
          <img src={logoSoftflowBranca} alt="Softflow" className="h-10 object-contain" />
        </div>

        <div>
          <h1 className="text-white text-4xl font-bold leading-tight mb-4" style={{ fontFamily: 'Plus Jakarta Sans, sans-serif' }}>
            Portal Interno<br />
            <span className="text-emerald-400">Softflow</span>
          </h1>
          <p className="text-blue-200 text-base leading-relaxed max-w-sm">
            Gestão integrada de vendas, contratos, comissões e agenda operacional para bares e restaurantes.
          </p>
        </div>

        <div className="grid grid-cols-2 gap-4">
          {[
            { label: "Pedidos", desc: "Controle completo" },
            { label: "Comissões", desc: "Automáticas" },
            { label: "Agenda", desc: "Instalações" },
            { label: "Filiais", desc: "Multi-unidade" },
          ].map((item) => (
            <div key={item.label} className="rounded-xl p-4" style={{ background: 'hsl(222 60% 22%)' }}>
              <p className="text-emerald-400 font-semibold text-sm">{item.label}</p>
              <p className="text-blue-300 text-xs mt-0.5">{item.desc}</p>
            </div>
          ))}
        </div>
      </div>

      {/* Right panel */}
      <div className="flex-1 flex items-center justify-center p-8 bg-background">
        <div className="w-full max-w-md">
          {/* Mobile logo */}
          <div className="mb-8 lg:hidden">
            <img src={logoSoftflowAzul} alt="Softflow" className="h-10 object-contain" />
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
                  required
                />
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
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                >
                  {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
            </div>

            <Button
              type="submit"
              className="w-full h-11 text-sm font-semibold"
              style={{ background: 'var(--gradient-brand)' }}
              disabled={loading}
            >
              {loading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Entrando...
                </>
              ) : (
                "Entrar no sistema"
              )}
            </Button>
          </form>

          <p className="text-center text-xs text-muted-foreground mt-8">
            Acesso restrito a colaboradores da Softflow Tecnologia.<br />
            Entre em contato com o administrador para obter acesso.
          </p>
        </div>
      </div>
    </div>
  );
}
