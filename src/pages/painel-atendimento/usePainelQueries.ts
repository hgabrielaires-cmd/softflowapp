import { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import type { PainelEtapa, PainelCard, AtividadeExecucao } from "./types";

export function usePainelQueries(profile: any) {
  const { data: etapas = [] } = useQuery({
    queryKey: ["painel_etapas"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("painel_etapas")
        .select("*")
        .eq("ativo", true)
        .order("ordem");
      if (error) throw error;
      return data as PainelEtapa[];
    },
  });

  const { data: cards = [], isLoading } = useQuery({
    queryKey: ["painel_atendimento"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("painel_atendimento")
        .select("*, clientes(nome_fantasia, apelido), filiais(nome), planos(nome, descricao), contratos(numero_exibicao), profiles(full_name)")
        .neq("status_projeto", "cancelado")
        .order("created_at", { ascending: true });
      if (error) throw error;
      return data as PainelCard[];
    },
  });

  const { data: responsaveis = [] } = useQuery({
    queryKey: ["profiles_painel"],
    queryFn: async () => {
      const { data } = await supabase.from("profiles").select("id, full_name, user_id, telefone, avatar_url").eq("active", true).order("full_name");
      return data || [];
    },
  });

  const { data: mesasAtendimento = [] } = useQuery({
    queryKey: ["mesas_atendimento_painel"],
    queryFn: async () => {
      const { data } = await supabase.from("mesas_atendimento").select("id, nome").eq("ativo", true).order("nome");
      return data || [];
    },
  });

  const { data: jornadaMesaMap = {} } = useQuery({
    queryKey: ["jornada_mesa_map"],
    queryFn: async () => {
      const { data: jornadas } = await supabase.from("jornadas").select("id").eq("ativo", true);
      if (!jornadas || jornadas.length === 0) return {};
      const jornadaIds = jornadas.map(j => j.id);
      const { data: etapasJ } = await supabase.from("jornada_etapas").select("id, jornada_id, mesa_atendimento_id").in("jornada_id", jornadaIds);
      if (!etapasJ || etapasJ.length === 0) return {};
      const etapaIds = etapasJ.map(e => e.id);
      const { data: atividades } = await supabase.from("jornada_atividades").select("etapa_id, mesa_atendimento_id").in("etapa_id", etapaIds);

      const jornadaEtapaMap: Record<string, string[]> = {};
      etapasJ.forEach(e => {
        if (!jornadaEtapaMap[e.jornada_id]) jornadaEtapaMap[e.jornada_id] = [];
        jornadaEtapaMap[e.jornada_id].push(e.id);
      });

      const result: Record<string, string[]> = {};
      jornadas.forEach(j => {
        const mesaSet = new Set<string>();
        const etapaIdsJ = jornadaEtapaMap[j.id] || [];
        etapasJ.filter(e => e.jornada_id === j.id && e.mesa_atendimento_id).forEach(e => mesaSet.add(e.mesa_atendimento_id!));
        (atividades || []).filter(a => etapaIdsJ.includes(a.etapa_id) && a.mesa_atendimento_id).forEach(a => mesaSet.add(a.mesa_atendimento_id!));
        if (mesaSet.size > 0) result[j.id] = [...mesaSet];
      });
      return result;
    },
  });

  const { data: tecnicos = [] } = useQuery({
    queryKey: ["tecnicos_painel"],
    queryFn: async () => {
      const { data: profiles } = await supabase
        .from("profiles")
        .select("id, full_name, tipo_tecnico")
        .eq("active", true)
        .eq("is_tecnico", true)
        .order("full_name");
      return profiles || [];
    },
  });

  const { data: userPermissions = [] } = useQuery({
    queryKey: ["user_permissions_painel", profile?.user_id],
    queryFn: async () => {
      if (!profile?.user_id) return [];
      const { data: userRoles } = await supabase
        .from("user_roles")
        .select("role")
        .eq("user_id", profile.user_id);
      if (!userRoles || userRoles.length === 0) return [];
      const roleNames = userRoles.map(r => r.role);
      const { data } = await supabase
        .from("role_permissions")
        .select("permissao, ativo")
        .in("role", roleNames)
        .eq("ativo", true);
      return (data || []).map(p => p.permissao);
    },
    enabled: !!profile?.user_id,
  });

  const { data: jornadaSlaMap = {} } = useQuery({
    queryKey: ["jornada_sla_map"],
    queryFn: async () => {
      const { data: jornadas } = await supabase
        .from("jornadas")
        .select("id, vinculo_id")
        .eq("ativo", true)
        .eq("vinculo_tipo", "plano");
      if (!jornadas || jornadas.length === 0) return {};

      const jornadaIds = jornadas.map(j => j.id);
      const { data: jornadaEtapas } = await supabase
        .from("jornada_etapas")
        .select("id, jornada_id, nome")
        .in("jornada_id", jornadaIds);
      if (!jornadaEtapas || jornadaEtapas.length === 0) return {};

      const etapaIds = jornadaEtapas.map(e => e.id);
      const { data: atividades } = await supabase
        .from("jornada_atividades")
        .select("etapa_id, horas_estimadas, checklist")
        .in("etapa_id", etapaIds);

      const result: Record<string, Record<string, number>> = {};
      const planoJornadaMap: Record<string, string> = {};
      jornadas.forEach(j => { planoJornadaMap[j.vinculo_id] = j.id; });

      jornadaEtapas.forEach(je => {
        if (!result[je.jornada_id]) result[je.jornada_id] = {};
        const total = (atividades || [])
          .filter(a => a.etapa_id === je.id)
          .reduce((acc, a) => acc + (a.horas_estimadas || 0), 0);
        result[je.jornada_id][je.nome] = total;
      });

      const finalMap: Record<string, Record<string, number>> = {};
      Object.entries(planoJornadaMap).forEach(([planoId, jornadaId]) => {
        finalMap[planoId] = result[jornadaId] || {};
      });
      return finalMap;
    },
  });

  const { data: totalChecklistPorPlano = {} } = useQuery({
    queryKey: ["total_checklist_por_plano"],
    queryFn: async () => {
      const { data: jornadas } = await supabase
        .from("jornadas")
        .select("id, vinculo_id")
        .eq("ativo", true)
        .eq("vinculo_tipo", "plano");
      if (!jornadas || jornadas.length === 0) return {};

      const jornadaIds = jornadas.map(j => j.id);
      const { data: jornadaEtapas } = await supabase
        .from("jornada_etapas")
        .select("id, jornada_id")
        .in("jornada_id", jornadaIds);
      if (!jornadaEtapas || jornadaEtapas.length === 0) return {};

      const etapaIds = jornadaEtapas.map(e => e.id);
      const { data: atividades } = await supabase
        .from("jornada_atividades")
        .select("etapa_id, checklist")
        .in("etapa_id", etapaIds);

      const planoJornadaMap: Record<string, string> = {};
      jornadas.forEach(j => { planoJornadaMap[j.vinculo_id] = j.id; });

      const jornadaTotals: Record<string, number> = {};
      jornadaEtapas.forEach(je => {
        const atividadesEtapa = (atividades || []).filter(a => a.etapa_id === je.id);
        const count = atividadesEtapa.reduce((acc, a) => {
          const cl = Array.isArray(a.checklist) ? a.checklist : [];
          return acc + cl.length;
        }, 0);
        jornadaTotals[je.jornada_id] = (jornadaTotals[je.jornada_id] || 0) + count;
      });

      const result: Record<string, number> = {};
      Object.entries(planoJornadaMap).forEach(([planoId, jornadaId]) => {
        result[planoId] = jornadaTotals[jornadaId] || 0;
      });
      return result;
    },
  });

  const pedidoIds = useMemo(() => [...new Set(cards.map(c => c.pedido_id).filter(Boolean))], [cards]);

  const PRIORIDADE_PESO_LOCAL: Record<string, number> = { prioridade: 4, urgente: 3, medio: 2, normal: 1 };

  const { data: pedidoPrioridadeMap = {} } = useQuery({
    queryKey: ["pedido_prioridade_map", pedidoIds.join(",")],
    enabled: pedidoIds.length > 0,
    queryFn: async () => {
      const { data } = await supabase
        .from("pedido_comentarios")
        .select("pedido_id, prioridade")
        .in("pedido_id", pedidoIds);
      const map: Record<string, string> = {};
      (data || []).forEach((r: any) => {
        const current = map[r.pedido_id];
        if (!current || (PRIORIDADE_PESO_LOCAL[r.prioridade] || 0) > (PRIORIDADE_PESO_LOCAL[current] || 0)) {
          map[r.pedido_id] = r.prioridade;
        }
      });
      return map;
    },
  });

  const { data: cardProgressMap = {} } = useQuery({
    queryKey: ["card_checklist_progress", cards.map(c => c.id).join(",")],
    enabled: cards.length > 0,
    queryFn: async () => {
      const { data } = await supabase
        .from("painel_checklist_progresso")
        .select("card_id, concluido")
        .eq("concluido", true);
      const counts: Record<string, number> = {};
      (data || []).forEach((r: any) => {
        counts[r.card_id] = (counts[r.card_id] || 0) + 1;
      });
      return counts;
    },
  });

  const { data: cardApontamentosRaw = [] } = useQuery({
    queryKey: ["card_apontamentos", cards.map(c => c.id).join(",")],
    enabled: cards.length > 0,
    queryFn: async () => {
      const { data } = await supabase
        .from("painel_apontamentos")
        .select("id, card_id, usuario_id, profiles:usuario_id(full_name, avatar_url)");
      return (data || []) as any[];
    },
  });

  const cardApontamentosMap = useMemo(() => {
    const map: Record<string, string[]> = {};
    cardApontamentosRaw.forEach((r: any) => {
      if (!map[r.card_id]) map[r.card_id] = [];
      const nome = r.profiles?.full_name?.split(" ")[0] || "Usuário";
      if (!map[r.card_id].includes(nome)) map[r.card_id].push(nome);
    });
    return map;
  }, [cardApontamentosRaw]);

  const cardApontamentosDetalhado = useMemo(() => {
    const map: Record<string, { id: string; usuario_id: string; nome: string; avatar_url: string | null }[]> = {};
    cardApontamentosRaw.forEach((r: any) => {
      if (!map[r.card_id]) map[r.card_id] = [];
      map[r.card_id].push({ id: r.id, usuario_id: r.usuario_id, nome: r.profiles?.full_name || "Usuário", avatar_url: r.profiles?.avatar_url || null });
    });
    return map;
  }, [cardApontamentosRaw]);

  // Derive permissions
  const permissions = {
    podeEditarConfigProjeto: userPermissions.includes("acao.editar_config_projeto"),
    podePausarProjeto: userPermissions.includes("acao.pausar_projeto"),
    podeRecusarProjeto: userPermissions.includes("acao.recusar_projeto"),
    podeGerenciarApontamento: userPermissions.includes("acao.gerenciar_apontamento"),
    podeVoltarEtapa: userPermissions.includes("acao.voltar_etapa"),
    podeEditarChecklist: userPermissions.includes("acao.editar_checklist"),
    podeVisualizarSeguidores: userPermissions.includes("acao.visualiza_seguidores_projeto"),
    podeResetarProjeto: (profile as any)?.permite_resetar_projeto === true,
    podeCancelarProjeto: (profile as any)?.permite_cancelar_projeto === true,
    podeVerValoresProjeto: (profile as any)?.permite_ver_valores_projeto === true,
  };

  return {
    etapas,
    cards,
    isLoading,
    responsaveis,
    mesasAtendimento,
    jornadaMesaMap,
    tecnicos,
    jornadaSlaMap,
    totalChecklistPorPlano,
    pedidoPrioridadeMap,
    cardProgressMap,
    cardApontamentosMap,
    cardApontamentosDetalhado,
    permissions,
  };
}
