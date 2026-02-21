import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { Loader2, KeyRound, CheckCircle } from "lucide-react";
import { useNavigate } from "react-router-dom";
import logoSoftflowAzul from "@/assets/logo-softflow-azul.png";

export default function ResetPassword() {
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [saving, setSaving] = useState(false);
  const [success, setSuccess] = useState(false);
  const navigate = useNavigate();

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (newPassword !== confirmPassword) {
      toast.error("As senhas não coincidem");
      return;
    }
    if (newPassword.length < 6) {
      toast.error("A senha deve ter pelo menos 6 caracteres");
      return;
    }
    setSaving(true);
    const { error } = await supabase.auth.updateUser({ password: newPassword });
    if (error) {
      toast.error(error.message || "Erro ao redefinir senha");
    } else {
      setSuccess(true);
      toast.success("Senha redefinida com sucesso!");
    }
    setSaving(false);
  }

  if (success) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background p-4">
        <div className="w-full max-w-sm bg-card rounded-xl border border-border p-8 shadow-card text-center space-y-4">
          <CheckCircle className="h-12 w-12 text-green-500 mx-auto" />
          <h1 className="text-xl font-bold text-foreground">Senha Redefinida!</h1>
          <p className="text-sm text-muted-foreground">Sua senha foi alterada com sucesso.</p>
          <Button onClick={() => navigate("/login")} className="w-full">
            Ir para o Login
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-4">
      <div className="w-full max-w-sm bg-card rounded-xl border border-border p-8 shadow-card space-y-6">
        <div className="text-center space-y-2">
          <img src={logoSoftflowAzul} alt="Softflow" className="h-10 mx-auto mb-4" />
          <h1 className="text-xl font-bold text-foreground flex items-center justify-center gap-2">
            <KeyRound className="h-5 w-5 text-primary" />
            Redefinir Senha
          </h1>
          <p className="text-sm text-muted-foreground">Digite sua nova senha abaixo</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-1.5">
            <Label>Nova senha</Label>
            <Input
              type="password"
              placeholder="Mínimo 6 caracteres"
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              required
            />
          </div>
          <div className="space-y-1.5">
            <Label>Confirmar nova senha</Label>
            <Input
              type="password"
              placeholder="Repita a nova senha"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              required
            />
          </div>
          <Button type="submit" className="w-full" disabled={saving}>
            {saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Redefinir Senha
          </Button>
        </form>
      </div>
    </div>
  );
}
