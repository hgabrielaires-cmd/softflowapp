import { useAuth } from "@/context/AuthContext";
import { AppLayout } from "@/components/AppLayout";
import { ROLE_LABELS, ROLE_COLORS, AppRole, Filial } from "@/lib/supabase-types";
import { useUserFiliais } from "@/hooks/useUserFiliais";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useState, useEffect, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Loader2, User, Building2, Shield, Star, KeyRound, Camera } from "lucide-react";
import { UserAvatar } from "@/components/UserAvatar";

export default function Perfil() {
  const { profile, roles, refreshProfile } = useAuth();
  const { filiaisDoUsuario } = useUserFiliais();
  const [name, setName] = useState(profile?.full_name || "");
  const [saving, setSaving] = useState(false);
  const [filialFavoritaId, setFilialFavoritaId] = useState<string | null>(null);
  const [savingFavorita, setSavingFavorita] = useState(false);
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null);
  const [uploadingAvatar, setUploadingAvatar] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Password change
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [savingPassword, setSavingPassword] = useState(false);

  useEffect(() => {
    if (profile) {
      setName(profile.full_name);
      setAvatarUrl(profile.avatar_url || null);
      supabase.from("profiles").select("filial_favorita_id").eq("user_id", profile.user_id).single().then(({ data }) => {
        if (data) setFilialFavoritaId((data as any).filial_favorita_id || null);
      });
    }
  }, [profile?.user_id]);

  function compressImage(file: File, maxSize = 200, quality = 0.8): Promise<Blob> {
    return new Promise((resolve, reject) => {
      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement("canvas");
        let { width, height } = img;
        if (width > maxSize || height > maxSize) {
          if (width > height) { height = Math.round((height * maxSize) / width); width = maxSize; }
          else { width = Math.round((width * maxSize) / height); height = maxSize; }
        }
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext("2d")!;
        ctx.drawImage(img, 0, 0, width, height);
        canvas.toBlob((blob) => blob ? resolve(blob) : reject(new Error("Falha ao comprimir")), "image/webp", quality);
      };
      img.onerror = reject;
      img.src = URL.createObjectURL(file);
    });
  }

  async function handleAvatarUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file || !profile) return;

    if (!file.type.startsWith("image/")) {
      toast.error("Selecione uma imagem válida");
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      toast.error("A imagem deve ter no máximo 5MB");
      return;
    }

    setUploadingAvatar(true);
    try {
      const compressed = await compressImage(file, 200, 0.75);
      const filePath = `${profile.user_id}/avatar.webp`;

      const { error: uploadError } = await supabase.storage
        .from("avatars")
        .upload(filePath, compressed, { upsert: true, contentType: "image/webp" });

      if (uploadError) throw uploadError;

      const { data: urlData } = supabase.storage.from("avatars").getPublicUrl(filePath);
      const publicUrl = `${urlData.publicUrl}?t=${Date.now()}`;

      const { error: updateError } = await supabase
        .from("profiles")
        .update({ avatar_url: publicUrl })
        .eq("user_id", profile.user_id);

      if (updateError) throw updateError;

      setAvatarUrl(publicUrl);
      await refreshProfile();
      toast.success("Foto atualizada com sucesso!");
    } catch (err: any) {
      toast.error(err.message || "Erro ao enviar foto");
    } finally {
      setUploadingAvatar(false);
    }
  }

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

  async function handleChangePassword(e: React.FormEvent) {
    e.preventDefault();
    if (newPassword !== confirmPassword) {
      toast.error("As senhas não coincidem");
      return;
    }
    if (newPassword.length < 6) {
      toast.error("A nova senha deve ter pelo menos 6 caracteres");
      return;
    }
    setSavingPassword(true);
    const { error } = await supabase.auth.updateUser({ password: newPassword });
    if (error) {
      toast.error(error.message || "Erro ao alterar senha");
    } else {
      toast.success("Senha alterada com sucesso!");
      setCurrentPassword("");
      setNewPassword("");
      setConfirmPassword("");
    }
    setSavingPassword(false);
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

  const filialAtual = filiaisDoUsuario.find((f) => f.id === profile?.filial_id);

  return (
    <AppLayout>
      <div className="max-w-lg space-y-6">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Meu Perfil</h1>
          <p className="text-sm text-muted-foreground">Gerencie suas informações pessoais</p>
        </div>

        {/* Dados pessoais */}
        <div className="bg-card rounded-xl border border-border p-6 shadow-card space-y-5">
          <div className="flex items-center gap-4 pb-4 border-b border-border">
            <div className="relative group">
              <UserAvatar avatarUrl={avatarUrl} fullName={profile?.full_name} size="lg" />
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                disabled={uploadingAvatar}
                className="absolute inset-0 rounded-full bg-black/40 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer"
              >
                {uploadingAvatar ? (
                  <Loader2 className="h-5 w-5 text-white animate-spin" />
                ) : (
                  <Camera className="h-5 w-5 text-white" />
                )}
              </button>
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                className="hidden"
                onChange={handleAvatarUpload}
              />
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
              <p className="text-[10px] text-muted-foreground mt-1">Clique na foto para alterar</p>
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

        {/* Alterar senha */}
        <div className="bg-card rounded-xl border border-border p-6 shadow-card space-y-4">
          <div className="flex items-center gap-2">
            <KeyRound className="h-4 w-4 text-primary" />
            <h2 className="font-semibold text-foreground">Alterar Senha</h2>
          </div>
          <form onSubmit={handleChangePassword} className="space-y-4">
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
            <Button type="submit" disabled={savingPassword}>
              {savingPassword && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Alterar senha
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

          {filiaisDoUsuario.length === 0 ? (
            <p className="text-sm text-muted-foreground">Nenhuma filial disponível.</p>
          ) : (
            <ul className="divide-y divide-border">
              {filiaisDoUsuario.map((filial) => {
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
