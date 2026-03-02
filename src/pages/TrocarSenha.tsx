import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/context/AuthContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { Loader2, KeyRound, ShieldAlert } from "lucide-react";
import { useNavigate } from "react-router-dom";
import logoSoftflowAzul from "@/assets/logo-softflow-azul.png";

export default function TrocarSenha() {
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [saving, setSaving] = useState(false);
  const { user, clearDeveTrocarSenha } = useAuth();
  const navigate = useNavigate();

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (newPassword !== confirmPassword) {
      toast.error("As senhas não coincidem");
      return;
    }
    if (newPassword.length < 8) {
      toast.error("A senha deve ter pelo menos 8 caracteres");
      return;
    }
    if (!/[A-Z]/.test(newPassword)) {
      toast.error("A senha deve conter pelo menos uma letra maiúscula");
      return;
    }
    if (!/[a-z]/.test(newPassword)) {
      toast.error("A senha deve conter pelo menos uma letra minúscula");
      return;
    }
    if (!/[0-9]/.test(newPassword)) {
      toast.error("A senha deve conter pelo menos um número");
      return;
    }
    if (!/[!@#$%&*()_+\-=\[\]{};':"|,.<>\/?]/.test(newPassword)) {
      toast.error("A senha deve conter pelo menos um caractere especial");
      return;
    }
    setSaving(true);
    try {
      const { error } = await supabase.auth.updateUser({ password: newPassword });
      if (error) throw error;

      // Limpar flag no banco
      if (user) {
        await supabase.from("profiles").update({ deve_trocar_senha: false } as any).eq("user_id", user.id);
      }

      clearDeveTrocarSenha();
      toast.success("Senha alterada com sucesso!");
      navigate("/dashboard");
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : "Erro ao alterar senha");
    }
    setSaving(false);
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-4">
      <div className="w-full max-w-sm bg-card rounded-xl border border-border p-8 shadow-card space-y-6">
        <div className="text-center space-y-2">
          <img src={logoSoftflowAzul} alt="Softflow" className="h-10 mx-auto mb-4" />
          <div className="flex items-center justify-center gap-2 text-amber-500 mb-2">
            <ShieldAlert className="h-6 w-6" />
          </div>
          <h1 className="text-xl font-bold text-foreground flex items-center justify-center gap-2">
            <KeyRound className="h-5 w-5 text-primary" />
            Troca de Senha Obrigatória
          </h1>
          <p className="text-sm text-muted-foreground">
           Por segurança, você precisa criar uma nova senha antes de continuar.
          </p>
          <ul className="text-xs text-muted-foreground text-left list-disc list-inside space-y-0.5">
            <li>Mínimo 8 caracteres</li>
            <li>Pelo menos 1 letra maiúscula</li>
            <li>Pelo menos 1 letra minúscula</li>
            <li>Pelo menos 1 número</li>
            <li>Pelo menos 1 caractere especial (!@#$%&*)</li>
          </ul>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-1.5">
            <Label>Nova senha</Label>
            <Input
              type="password"
              placeholder="Mínimo 8 caracteres"
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
            Alterar Senha e Continuar
          </Button>
        </form>
      </div>
    </div>
  );
}
