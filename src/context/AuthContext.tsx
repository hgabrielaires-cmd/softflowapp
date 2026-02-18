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
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType>({
  user: null,
  session: null,
  profile: null,
  roles: [],
  isAdmin: false,
  loading: true,
  signOut: async () => {},
});

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [roles, setRoles] = useState<AppRole[]>([]);
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
        }
      }
    );

    return () => subscription.unsubscribe();
  }, []);

  async function signOut() {
    await supabase.auth.signOut();
    setProfile(null);
    setRoles([]);
  }

  const isAdmin = roles.includes("admin");

  return (
    <AuthContext.Provider value={{ user, session, profile, roles, isAdmin, loading, signOut }}>
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => useContext(AuthContext);
