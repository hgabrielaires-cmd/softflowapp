import { useAuth } from "@/context/AuthContext";
import { AppLayout } from "@/components/AppLayout";
import { ROLE_LABELS, ROLE_COLORS, AppRole, Filial } from "@/lib/supabase-types";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Loader2, User, Building2, Shield, Star } from "lucide-react";

export default function Perfil() {
  const { profile, roles } = useAuth();
  const [name, setName] = useState(profile?.full_name || "");
  const [saving, setSaving] = useState(false);
  const [filiais, setFiliais] = useState<Filial[]>([]);
  const [filialFavoritaId, setFilialFavoritaId] = useState<string | null>(null);
  const [savingFavorita, setSavingFavorita] = useState(false);

  useEffect(() => {
    supabase.from("filiais").select("*").eq("ativa", true).order("nome").then(({ data }) => {
      setFiliais((data || []) as Filial[]);
    });
  }, []);

  useEffect(() => {
    if (profile) {
      setName(profile.full_name);
      // Carregar filial favorita
      supabase.from("profiles").select("filial_favorita_id").eq("user_id", profile.user_id).single().then(({ data }) => {
        if (data) setFilialFavoritaId((data as any).filial_favorita_id || null);
      });
    }
  }, [profile?.user_id]);

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

  async function handleFavoritar(filialId: string) {
    if (!profile) return;
    const novaFavorita = filialFavoritaId === filialId ? null : filialId;
    setSavingFavorita(true);
    const { error } = await supabase
      .from("profiles")
      .update({ filial_favorita_id: novaFavorita } as any)
      .eq("user_id", profile.user_id);
    if (error) {
      toast.error("Erro ao salvar filial favorita");
    } else {
      setFilialFavoritaId(novaFavorita);
      toast.success(novaFavorita ? "Filial favorita definida!" : "Filial favorita removida");
    }
    setSavingFavorita(false);
  }

  const filialAtual = filiais.find((f) => f.id === profile?.filial_id);

  return (
    <AppLayout>
      <div className="max-w-lg space-y-6">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Meu Perfil</h1>
          <p className="text-sm text-muted-foreground">Gerencie suas informações pessoais</p>
        </div>

        {/* Dados pessoais */}
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
                <Building2 className="h-3.5 w-3.5" /> Filial vinculada
              </Label>
              <Input value={filialAtual?.nome || profile?.filial || "Todas as filiais"} disabled className="bg-muted" />
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

        {/* Filial favorita */}
        <div className="bg-card rounded-xl border border-border p-6 shadow-card space-y-4">
          <div className="flex items-center gap-2">
            <Star className="h-4 w-4 text-amber-400 fill-amber-400" />
            <h2 className="font-semibold text-foreground">Filial Favorita</h2>
          </div>
          <p className="text-sm text-muted-foreground">
            A filial favorita será pré-selecionada ao criar novos pedidos. Clique na estrela para marcar ou desmarcar.
          </p>

          {filiais.length === 0 ? (
            <p className="text-sm text-muted-foreground">Nenhuma filial disponível.</p>
          ) : (
            <ul className="divide-y divide-border">
              {filiais.map((filial) => {
                const isFavorita = filialFavoritaId === filial.id;
                return (
                  <li key={filial.id} className="flex items-center justify-between py-3">
                    <div className="flex items-center gap-3">
                      <Building2 className="h-4 w-4 text-muted-foreground" />
                      <span className={`text-sm font-medium ${isFavorita ? "text-foreground" : "text-muted-foreground"}`}>
                        {filial.nome}
                      </span>
                      {isFavorita && (
                        <span className="text-xs bg-amber-100 text-amber-700 px-2 py-0.5 rounded-full font-medium">
                          Favorita
                        </span>
                      )}
                    </div>
                    <button
                      type="button"
                      disabled={savingFavorita}
                      onClick={() => handleFavoritar(filial.id)}
                      title={isFavorita ? "Remover favorita" : "Marcar como favorita"}
                      className="rounded-full p-1.5 hover:bg-muted transition-colors disabled:opacity-50"
                    >
                      <Star
                        className={`h-5 w-5 transition-colors ${
                          isFavorita
                            ? "text-amber-400 fill-amber-400"
                            : "text-muted-foreground hover:text-amber-400"
                        }`}
                      />
                    </button>
                  </li>
                );
              })}
            </ul>
          )}
        </div>
      </div>
    </AppLayout>
  );
}
