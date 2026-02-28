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
      // Verificar se tem filial vinculada
      if (!data.filial_id && !data.acesso_global) {
        // Checar usuario_filiais
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
      } else {
        setSemFilial(false);
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
    // Primeiro obtém a sessão atual — libera o loading imediatamente
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setUser(session?.user ?? null);
      setLoading(false); // libera a tela imediatamente
      if (session?.user) {
        // busca profile e roles em background, sem bloquear a navegação
        fetchProfile(session.user.id);
        fetchRoles(session.user.id);
      }
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

  async function signOut() {
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
    <AuthContext.Provider value={{ user, session, profile, roles, isAdmin, loading, deveTrocarSenha, semFilial, clearDeveTrocarSenha, signOut }}>
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => useContext(AuthContext);
