// ─── Data fetching hook for JornadaImplantacao module ─────────────────────
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import type { Jornada, Filial, MesaAtendimento } from "@/lib/supabase-types";

interface VinculoItem {
  id: string;
  nome: string;
  descricao?: string;
}

interface PainelEtapaItem {
  id: string;
  nome: string;
}

export interface UseJornadaQueriesReturn {
  jornadas: Jornada[];
  isLoading: boolean;
  filiais: Filial[];
  planos: VinculoItem[];
  modulos: VinculoItem[];
  servicos: VinculoItem[];
  mesas: MesaAtendimento[];
  painelEtapas: PainelEtapaItem[];
}

export function useJornadaQueries(): UseJornadaQueriesReturn {
  const { data: jornadas = [], isLoading } = useQuery({
    queryKey: ["jornadas"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("jornadas")
        .select("*, filiais(nome), jornada_etapas(id, nome, jornada_atividades(horas_estimadas))")
        .order("nome");
      if (error) throw error;
      return data.map((j: any) => ({
        ...j,
        filial: j.filiais ? { nome: j.filiais.nome } : null,
      })) as Jornada[];
    },
  });

  const { data: filiais = [] } = useQuery({
    queryKey: ["filiais"],
    queryFn: async () => {
      const { data } = await supabase.from("filiais").select("*").eq("ativa", true).order("nome");
      return (data || []) as Filial[];
    },
  });

  const { data: planos = [] } = useQuery({
    queryKey: ["planos_ativos"],
    queryFn: async () => {
      const { data } = await supabase.from("planos").select("id, nome, descricao").eq("ativo", true).order("nome");
      return (data || []) as VinculoItem[];
    },
  });

  const { data: modulos = [] } = useQuery({
    queryKey: ["modulos_ativos"],
    queryFn: async () => {
      const { data } = await supabase.from("modulos").select("id, nome").eq("ativo", true).order("nome");
      return (data || []) as VinculoItem[];
    },
  });

  const { data: servicos = [] } = useQuery({
    queryKey: ["servicos_ativos"],
    queryFn: async () => {
      const { data } = await supabase.from("servicos").select("id, nome, descricao").eq("ativo", true).order("nome");
      return (data || []) as VinculoItem[];
    },
  });

  const { data: mesas = [] } = useQuery({
    queryKey: ["mesas_atendimento"],
    queryFn: async () => {
      const { data } = await supabase.from("mesas_atendimento").select("*").eq("ativo", true).order("nome");
      return (data || []) as MesaAtendimento[];
    },
  });

  const { data: painelEtapas = [] } = useQuery({
    queryKey: ["painel_etapas_for_jornada"],
    queryFn: async () => {
      const { data } = await supabase.from("painel_etapas").select("id, nome").eq("ativo", true).order("ordem");
      return (data || []) as PainelEtapaItem[];
    },
  });

  return {
    jornadas,
    isLoading,
    filiais,
    planos,
    modulos,
    servicos,
    mesas,
    painelEtapas,
  };
}
