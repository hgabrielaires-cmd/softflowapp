// ─── Queries hook for Usuarios module ────────────────────────────────────

import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { AppRole, Filial } from "@/lib/supabase-types";
import { toast } from "sonner";
import { ITEMS_PER_PAGE } from "./constants";
import type { UserWithRoles, MesaOption } from "./types";

export function useUsuariosQueries() {
  const [users, setUsers] = useState<UserWithRoles[]>([]);
  const [filiais, setFiliais] = useState<Filial[]>([]);
  const [mesasDisponiveis, setMesasDisponiveis] = useState<MesaOption[]>([]);
  const [loading, setLoading] = useState(true);
  const [filiaisLoaded, setFiliaisLoaded] = useState(false);
  const [search, setSearch] = useState("");
  const [currentPage, setCurrentPage] = useState(1);

  const loadFiliais = useCallback(async () => {
    const [{ data: fData }, { data: mData }] = await Promise.all([
      supabase.from("filiais").select("*").eq("ativa", true).order("nome"),
      supabase.from("mesas_atendimento").select("id, nome").eq("ativo", true).order("nome"),
    ]);
    if (fData) setFiliais(fData as Filial[]);
    if (mData) setMesasDisponiveis(mData as MesaOption[]);
    setFiliaisLoaded(true);
  }, []);

  const loadUsers = useCallback(async (filiaisRef: Filial[], mesasRef: MesaOption[]) => {
    setLoading(true);
    const { data: profiles, error } = await supabase
      .from("profiles")
      .select("*, filiais!profiles_filial_id_fkey(nome)")
      .order("full_name");

    if (error) {
      toast.error("Erro ao carregar usuários");
      setLoading(false);
      return;
    }

    const [{ data: roleData }, { data: ufData }, { data: umData }] = await Promise.all([
      supabase.from("user_roles").select("*"),
      supabase.from("usuario_filiais").select("user_id, filial_id"),
      supabase.from("usuario_mesas").select("user_id, mesa_id"),
    ]);

    const enriched: UserWithRoles[] = (profiles || []).map((p: any) => {
      const userFiliais = (ufData || []).filter((uf) => uf.user_id === p.user_id);
      const filiaisVinculadas = userFiliais
        .map((uf) => {
          const f = filiaisRef.find((fl) => fl.id === uf.filial_id);
          return f ? { id: f.id, nome: f.nome } : null;
        })
        .filter(Boolean) as { id: string; nome: string }[];

      const userMesas = (umData || []).filter((um: any) => um.user_id === p.user_id);
      const mesasVinculadas = userMesas
        .map((um: any) => {
          const m = mesasRef.find((md) => md.id === um.mesa_id);
          return m ? { id: m.id, nome: m.nome } : null;
        })
        .filter(Boolean) as { id: string; nome: string }[];

      return {
        ...p,
        filial_nome: p.filiais?.nome || p.filial || null,
        roles: (roleData || []).filter((r) => r.user_id === p.user_id).map((r) => r.role as AppRole),
        acesso_global: p.acesso_global || false,
        filiais_vinculadas: filiaisVinculadas,
        mesas_vinculadas: mesasVinculadas,
      };
    });

    setUsers(enriched);
    setLoading(false);
  }, []);

  // Initial load
  useEffect(() => {
    loadFiliais();
  }, [loadFiliais]);

  // Load users after filiais are ready — uses refs from state
  useEffect(() => {
    if (filiaisLoaded) {
      loadUsers(filiais, mesasDisponiveis);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filiaisLoaded]);

  // Reset page when search changes
  useEffect(() => {
    setCurrentPage(1);
  }, [search]);

  // Filtered list
  const filtered = users.filter(
    (u) =>
      u.full_name.toLowerCase().includes(search.toLowerCase()) ||
      u.email.toLowerCase().includes(search.toLowerCase()),
  );

  // Refresh function for use after mutations
  const refetchUsers = useCallback(() => {
    loadUsers(filiais, mesasDisponiveis);
  }, [loadUsers, filiais, mesasDisponiveis]);

  return {
    users,
    filiais,
    mesasDisponiveis,
    loading,
    search,
    setSearch,
    currentPage,
    setCurrentPage,
    filtered,
    refetchUsers,
    ITEMS_PER_PAGE,
  };
}
