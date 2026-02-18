import { useAuth } from "@/context/AuthContext";
import { AppLayout } from "@/components/AppLayout";
import { ROLE_LABELS, ROLE_COLORS, AppRole } from "@/lib/supabase-types";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Loader2, User, Building2, Shield } from "lucide-react";

export default function Perfil() {
  const { profile, roles } = useAuth();
  const [name, setName] = useState(profile?.full_name || "");
  const [saving, setSaving] = useState(false);
  const [filialNome, setFilialNome] = useState<string | null>(null);

  useEffect(() => {
    if (profile?.filial_id) {
      supabase.from("filiais").select("nome").eq("id", profile.filial_id).single().then(({ data }) => {
        if (data) setFilialNome(data.nome);
      });
    }
  }, [profile?.filial_id]);

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

        <div className="bg-card rounded-xl border border-border p-6 shadow-card space-y-5">
          {/* Avatar / Initials */}
          <div className="flex items-center gap-4 pb-4 border-b border-border">
            <div className="h-14 w-14 rounded-full bg-primary flex items-center justify-center text-primary-foreground text-xl font-bold">
              {profile?.full_name?.split(" ").map(n => n[0]).join("").slice(0, 2).toUpperCase() || "?"}
            </div>
            <div>
              <p className="font-semibold text-foreground">{profile?.full_name}</p>
              <div className="flex flex-wrap gap-1.5 mt-1">
                {roles.map((role) => (
                  <span key={role} className={`px-2 py-0.5 rounded text-xs font-medium border ${ROLE_COLORS[role as AppRole]}`}>
                    {ROLE_LABELS[role as AppRole]}
                  </span>
                ))}
              </div>
            </div>
          </div>

          <form onSubmit={handleSave} className="space-y-4">
            <div className="space-y-1.5">
              <Label className="flex items-center gap-1.5">
                <User className="h-3.5 w-3.5" /> Nome completo
              </Label>
              <Input value={name} onChange={(e) => setName(e.target.value)} />
            </div>
            <div className="space-y-1.5">
              <Label>E-mail</Label>
              <Input value={profile?.email || ""} disabled className="bg-muted" />
            </div>
            <div className="space-y-1.5">
              <Label className="flex items-center gap-1.5">
                <Building2 className="h-3.5 w-3.5" /> Filial
              </Label>
              <Input value={filialNome || profile?.filial || "—"} disabled className="bg-muted" />
            </div>
            <div className="space-y-1.5">
              <Label className="flex items-center gap-1.5">
                <Shield className="h-3.5 w-3.5" /> Status
              </Label>
              <Input value={profile?.active ? "Ativo" : "Inativo"} disabled className="bg-muted" />
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
