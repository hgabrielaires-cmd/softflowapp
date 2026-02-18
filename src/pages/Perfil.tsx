import { useAuth } from "@/context/AuthContext";
import { AppLayout } from "@/components/AppLayout";
import { Profile } from "@/lib/supabase-types";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Loader2 } from "lucide-react";

export default function Perfil() {
  const { profile } = useAuth();
  const [name, setName] = useState(profile?.full_name || "");
  const [saving, setSaving] = useState(false);

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    if (!profile) return;
    setSaving(true);
    const { error } = await supabase
      .from("profiles")
      .update({ full_name: name })
      .eq("user_id", profile.user_id);
    if (error) {
      toast.error("Erro ao salvar perfil");
    } else {
      toast.success("Perfil atualizado com sucesso");
    }
    setSaving(false);
  }

  return (
    <AppLayout>
      <div className="max-w-lg space-y-6">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Meu Perfil</h1>
          <p className="text-sm text-muted-foreground">Gerencie suas informações pessoais</p>
        </div>

        <div className="bg-card rounded-xl border border-border p-6 shadow-card">
          <form onSubmit={handleSave} className="space-y-4">
            <div className="space-y-1.5">
              <Label>Nome completo</Label>
              <Input value={name} onChange={(e) => setName(e.target.value)} />
            </div>
            <div className="space-y-1.5">
              <Label>E-mail</Label>
              <Input value={profile?.email || ""} disabled className="bg-muted" />
            </div>
            <div className="space-y-1.5">
              <Label>Filial</Label>
              <Input value={profile?.filial || "—"} disabled className="bg-muted" />
            </div>
            <Button type="submit" disabled={saving}>
              {saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Salvar alterações
            </Button>
          </form>
        </div>
      </div>
    </AppLayout>
  );
}
