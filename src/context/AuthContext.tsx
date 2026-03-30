import { createContext, useContext, useEffect, useState, ReactNode } from "react";
import { User, Session } from "@supabase/supabase-js";
import { supabase } from "@/integrations/supabase/client";
import { AppRole, Profile } from "@/lib/supabase-types";
import { toast } from "sonner";

interface AuthContextType {
  user: User | null;
  session: Session | null;
  profile: Profile | null;
  roles: AppRole[];
  isAdmin: boolean;
  loading: boolean;
  deveTrocarSenha: boolean;
  semFilial: boolean;
  clearDeveTrocarSenha: () => void;
  refreshProfile: () => Promise<void>;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType>({
  user: null,
  session: null,
  profile: null,
  roles: [],
  isAdmin: false,
  loading: true,
  deveTrocarSenha: false,
  semFilial: false,
  clearDeveTrocarSenha: () => {},
  refreshProfile: async () => {},
  signOut: async () => {},
});

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [roles, setRoles] = useState<AppRole[]>([]);
  const [deveTrocarSenha, setDeveTrocarSenha] = useState(false);
  const [semFilial, setSemFilial] = useState(false);
  const [loading, setLoading] = useState(true);

  async function fetchProfile(userId: string): Promise<Profile | null> {
    const { data } = await supabase
      .from("profiles")
      .select("*")
      .eq("user_id", userId)
      .single();
    if (data) {
      // Bloquear usuário inativo
      if (data.active === false) {
        toast.error("Sua conta está inativa. Entre em contato com o administrador.");
        await supabase.auth.signOut();
        return null;
      }
      setProfile(data as Profile);
      // Verificar se deve trocar senha
      if ((data as any).deve_trocar_senha === true) {
        setDeveTrocarSenha(true);
      }
      // Verificar se tem filial vinculada (acesso_global dispensa vínculo)
      if (data.acesso_global) {
        setSemFilial(false);
      } else {
        const { data: ufData } = await supabase
          .from("usuario_filiais")
          .select("filial_id")
          .eq("user_id", userId)
          .limit(1);
        if (!ufData || ufData.length === 0) {
          setSemFilial(true);
        } else {
          setSemFilial(false);
        }
      }
    }
    return data as Profile | null;
  }

  async function fetchRoles(userId: string) {
    const { data } = await supabase
      .from("user_roles")
      .select("role")
      .eq("user_id", userId);
    if (data) setRoles(data.map((r) => r.role as AppRole));
  }

  useEffect(() => {
    // Obtém a sessão e aguarda profile/roles antes de liberar
    supabase.auth.getSession().then(async ({ data: { session } }) => {
      setSession(session);
      setUser(session?.user ?? null);
      if (session?.user) {
        await Promise.all([
          fetchProfile(session.user.id),
          fetchRoles(session.user.id),
        ]);
      }
      setLoading(false);
    });

    // Escuta mudanças futuras
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (event, session) => {
        setSession(session);
        setUser(session?.user ?? null);
        if (session?.user) {
          // Usa setTimeout para evitar deadlock com Supabase
          setTimeout(() => {
            fetchProfile(session.user.id);
            fetchRoles(session.user.id);
          }, 0);
        } else {
        setProfile(null);
          setRoles([]);
          setSemFilial(false);
        }
      }
    );

    return () => subscription.unsubscribe();
  }, []);

  async function refreshProfile() {
    if (user) {
      await fetchProfile(user.id);
    }
  }

  async function signOut() {
    if (user) {
      const nowIso = new Date().toISOString();
      await supabase
        .from("atendente_presenca")
        .upsert(
          {
            user_id: user.id,
            status: "offline",
            last_heartbeat: nowIso,
            updated_at: nowIso,
          },
          { onConflict: "user_id" }
        );
    }

    await supabase.auth.signOut();
    setProfile(null);
    setRoles([]);
    setSemFilial(false);
  }

  function clearDeveTrocarSenha() {
    setDeveTrocarSenha(false);
  }

  const isAdmin = roles.includes("admin");

  return (
    <AuthContext.Provider value={{ user, session, profile, roles, isAdmin, loading, deveTrocarSenha, semFilial, clearDeveTrocarSenha, refreshProfile, signOut }}>
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => useContext(AuthContext);
