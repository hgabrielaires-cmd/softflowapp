import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { startOfMonth, endOfMonth, addMonths } from "date-fns";
import type {
  KpiFinalizadas, VendedorRanking, MotivoPerda, ComparativoSemana,
  KpiAndamento, EtapaFunil, TarefasAnalise, AlertaAtencao,
} from "./types";
import { calcularPeriodoAnterior } from "./helpers";

interface Filters {
  funilId?: string;
  responsavelIds?: string[];
  filialId?: string;
  inicio: string;
  fim: string;
}

/** Busca IDs de clientes vinculados a uma filial — usado para filtrar oportunidades */
async function getClienteIdsByFilial(filialId: string): Promise<string[]> {
  const { data } = await supabase
    .from("clientes")
    .select("id")
    .eq("filial_id", filialId);
  return (data || []).map(c => c.id);
}

// ─── FINALIZADAS ──────────────────────────────────────────────

export function useKpiFinalizadas(filters: Filters) {
  return useQuery({
    queryKey: ["crm_dash_kpi_fin", filters],
    enabled: !!filters.funilId,
    queryFn: async (): Promise<KpiFinalizadas> => {
      const { inicio, fim, funilId, responsavelIds, filialId } = filters;
      const anterior = calcularPeriodoAnterior(inicio, fim);
      const clienteIds = filialId ? await getClienteIdsByFilial(filialId) : undefined;

      // Helper to fetch finalizadas (ganho by data_fechamento, perdido by data_perda)
      async function fetchFinalizadas(ini: string, fi: string) {
        let qGanho = supabase
          .from("crm_oportunidades")
          .select("id, status, responsavel_id, data_fechamento, pedido_id")
          .eq("funil_id", funilId!)
          .eq("status", "ganho")
          .gte("data_fechamento", ini)
          .lte("data_fechamento", fi);
        if (responsavelIds?.length) qGanho = qGanho.in("responsavel_id", responsavelIds);
        if (clienteIds) { if (clienteIds.length === 0) return []; qGanho = qGanho.in("cliente_id", clienteIds); }

        let qPerdido = supabase
          .from("crm_oportunidades")
          .select("id, status, responsavel_id, data_perda, pedido_id")
          .eq("funil_id", funilId!)
          .eq("status", "perdido")
          .gte("data_perda", ini)
          .lte("data_perda", fi);
        if (responsavelIds?.length) qPerdido = qPerdido.in("responsavel_id", responsavelIds);
        if (clienteIds) { if (clienteIds.length === 0) return []; qPerdido = qPerdido.in("cliente_id", clienteIds); }

        const [{ data: ganhoData }, { data: perdidoData }] = await Promise.all([qGanho, qPerdido]);
        return [...(ganhoData || []), ...(perdidoData || [])];
      }

      const [current, prev] = await Promise.all([
        fetchFinalizadas(inicio, fim),
        fetchFinalizadas(anterior.inicio, anterior.fim),
      ]);

      const ganhas = (current || []).filter(o => o.status === "ganho");
      const perdidas = (current || []).filter(o => o.status === "perdido");
      const ganhasAnt = (prev || []).filter(o => o.status === "ganho");
      const perdidasAnt = (prev || []).filter(o => o.status === "perdido");

      // Helper: compute impl+mens per oportunidade using pedido > produtos > 0
      async function computeValues(oportunidades: typeof ganhas) {
        if (oportunidades.length === 0) return { impl: 0, mens: 0 };

        const pIds = oportunidades.map(o => o.pedido_id).filter(Boolean) as string[];
        const oIds = oportunidades.map(o => o.id);

        // Fetch pedidos
        let pedidoMap: Record<string, { impl: number; mens: number }> = {};
        if (pIds.length > 0) {
          const { data: pedidos } = await supabase
            .from("pedidos")
            .select("id, valor_implantacao_final, valor_mensalidade_final")
            .in("id", pIds);
          (pedidos || []).forEach(p => {
            pedidoMap[p.id] = {
              impl: (p as any).valor_implantacao_final || 0,
              mens: (p as any).valor_mensalidade_final || 0,
            };
          });
        }

        // Fetch produtos as fallback
        let prodMap: Record<string, { impl: number; mens: number }> = {};
        if (oIds.length > 0) {
          const { data: prods } = await supabase
            .from("crm_oportunidade_produtos")
            .select("oportunidade_id, valor_implantacao, valor_mensalidade, quantidade")
            .in("oportunidade_id", oIds);
          (prods || []).forEach(p => {
            if (!prodMap[p.oportunidade_id]) prodMap[p.oportunidade_id] = { impl: 0, mens: 0 };
            prodMap[p.oportunidade_id].impl += (p.valor_implantacao || 0) * (p.quantidade || 1);
            prodMap[p.oportunidade_id].mens += (p.valor_mensalidade || 0) * (p.quantidade || 1);
          });
        }

        let impl = 0, mens = 0;
        oportunidades.forEach(o => {
          if (o.pedido_id && pedidoMap[o.pedido_id]) {
            impl += pedidoMap[o.pedido_id].impl;
            mens += pedidoMap[o.pedido_id].mens;
          } else if (prodMap[o.id]) {
            impl += prodMap[o.id].impl;
            mens += prodMap[o.id].mens;
          }
        });
        return { impl, mens };
      }

      const [valAtual, valAnterior] = await Promise.all([
        computeValues(ganhas),
        computeValues(ganhasAnt),
      ]);
      const implTotal = valAtual.impl, mensTotal = valAtual.mens;
      const implAnt = valAnterior.impl, mensAnt = valAnterior.mens;

      const ticketMedio = ganhas.length > 0 ? (implTotal + mensTotal) / ganhas.length : 0;
      const ticketMedioAnt = ganhasAnt.length > 0 ? (implAnt + mensAnt) / ganhasAnt.length : 0;
      const taxaGanho = (current || []).length > 0 ? (ganhas.length / (current || []).length) * 100 : 0;
      const taxaAnt = (prev || []).length > 0 ? (ganhasAnt.length / (prev || []).length) * 100 : 0;

      return {
        totalFinalizadas: (current || []).length,
        ganhas: ganhas.length,
        perdidas: perdidas.length,
        taxaGanho,
        valorImplantacao: implTotal,
        valorMensalidade: mensTotal,
        ticketMedio,
        valorImplantacaoAnterior: implAnt,
        valorMensalidadeAnterior: mensAnt,
        ticketMedioAnterior: ticketMedioAnt,
        taxaConversaoAnterior: taxaAnt,
        ganhasAnterior: ganhasAnt.length,
        perdidasAnterior: perdidasAnt.length,
      };
    },
  });
}

export function useRankingVendedores(filters: Filters, tipo: "ganho" | "andamento") {
  return useQuery({
    queryKey: ["crm_dash_ranking", filters, tipo],
    enabled: !!filters.funilId,
    queryFn: async (): Promise<VendedorRanking[]> => {
      const { funilId, responsavelIds, filialId, inicio, fim } = filters;
      const clienteIds = filialId ? await getClienteIdsByFilial(filialId) : undefined;
      let q = supabase
        .from("crm_oportunidades")
        .select("id, responsavel_id, status, valor, pedido_id")
        .eq("funil_id", funilId!);

      if (tipo === "ganho") {
        q = q.eq("status", "ganho").gte("data_fechamento", inicio).lte("data_fechamento", fim);
      } else {
        q = q.eq("status", "aberta");
      }
      if (responsavelIds?.length) q = q.in("responsavel_id", responsavelIds);
      if (clienteIds) { if (clienteIds.length === 0) return []; q = q.in("cliente_id", clienteIds); }
      const { data: ops } = await q;

      // For "ganho" ranking, also include lost deals filtered by data_perda (for count purposes if needed)
      // Actually ranking ganho only needs ganho deals, so this is fine.

      // Group by responsavel_id
      const map: Record<string, { count: number; valor: number; ids: string[] }> = {};
      (ops || []).forEach(o => {
        if (!o.responsavel_id) return;
        if (!map[o.responsavel_id]) map[o.responsavel_id] = { count: 0, valor: 0, ids: [] };
        map[o.responsavel_id].count++;
        map[o.responsavel_id].ids.push(o.id);
      });

      if (tipo === "ganho") {
        // Priority: pedido values > crm_oportunidade_produtos > campo valor
        const allIds = (ops || []).map(o => o.id);
        const pedidoIds = (ops || []).map(o => o.pedido_id).filter(Boolean) as string[];

        // Fetch pedido values
        let pedidoValorMap: Record<string, number> = {};
        if (pedidoIds.length > 0) {
          const { data: pedidos } = await supabase
            .from("pedidos")
            .select("id, valor_implantacao_final, valor_mensalidade_final")
            .in("id", pedidoIds);
          (pedidos || []).forEach(p => {
            pedidoValorMap[p.id] = ((p as any).valor_implantacao_final || 0) + ((p as any).valor_mensalidade_final || 0);
          });
        }

        // Fetch produto values as fallback
        let prodMap: Record<string, number> = {};
        if (allIds.length > 0) {
          const { data: prods } = await supabase
            .from("crm_oportunidade_produtos")
            .select("oportunidade_id, valor_implantacao, valor_mensalidade, quantidade")
            .in("oportunidade_id", allIds);
          (prods || []).forEach(p => {
            prodMap[p.oportunidade_id] = (prodMap[p.oportunidade_id] || 0) +
              ((p.valor_implantacao || 0) + (p.valor_mensalidade || 0)) * (p.quantidade || 1);
          });
        }

        // Map values to responsavel: pedido > produtos > campo valor
        Object.keys(map).forEach(uid => {
          const userOps = (ops || []).filter(o => o.responsavel_id === uid);
          let total = 0;
          userOps.forEach(o => {
            if (o.pedido_id && pedidoValorMap[o.pedido_id]) {
              total += pedidoValorMap[o.pedido_id];
            } else if (prodMap[o.id]) {
              total += prodMap[o.id];
            } else {
              total += o.valor || 0;
            }
          });
          map[uid].valor = total;
        });
      } else {
        // Andamento: use campo valor
        (ops || []).forEach(o => {
          if (o.responsavel_id && map[o.responsavel_id]) {
            map[o.responsavel_id].valor += o.valor || 0;
          }
        });
      }

      // Fetch profiles
      const uids = Object.keys(map);
      if (uids.length === 0) return [];
      const { data: profiles } = await supabase
        .from("profiles")
        .select("user_id, full_name, avatar_url")
        .in("user_id", uids);

      const profMap: Record<string, { full_name: string; avatar_url: string | null }> = {};
      (profiles || []).forEach(p => { profMap[p.user_id] = p; });

      return uids
        .map(uid => ({
          user_id: uid,
          full_name: profMap[uid]?.full_name || "Sem nome",
          avatar_url: profMap[uid]?.avatar_url || null,
          negocios: map[uid].count,
          valorTotal: map[uid].valor,
        }))
        .sort((a, b) => b.valorTotal - a.valorTotal);
    },
  });
}

export function useMotivosPerda(filters: Filters) {
  return useQuery({
    queryKey: ["crm_dash_motivos", filters],
    enabled: !!filters.funilId,
    queryFn: async (): Promise<MotivoPerda[]> => {
      const { funilId, responsavelIds, filialId, inicio, fim } = filters;
      const clienteIds = filialId ? await getClienteIdsByFilial(filialId) : undefined;
      let q = supabase
        .from("crm_oportunidades")
        .select("id, motivo_perda_id")
        .eq("funil_id", funilId!)
        .eq("status", "perdido")
        .gte("data_perda", inicio)
        .lte("data_perda", fim);
      if (responsavelIds?.length) q = q.in("responsavel_id", responsavelIds);
      if (clienteIds) { if (clienteIds.length === 0) return []; q = q.in("cliente_id", clienteIds); }
      const { data: ops } = await q;
      if (!ops?.length) return [];

      // Get motivo names
      const motivoIds = [...new Set(ops.map(o => o.motivo_perda_id).filter(Boolean))] as string[];
      let motivoMap: Record<string, string> = {};
      if (motivoIds.length > 0) {
        const { data: motivos } = await supabase.from("crm_motivos_perda").select("id, nome").in("id", motivoIds);
        (motivos || []).forEach(m => { motivoMap[m.id] = m.nome; });
      }

      const countMap: Record<string, number> = {};
      ops.forEach(o => {
        const nome = o.motivo_perda_id ? (motivoMap[o.motivo_perda_id] || "Não informado") : "Não informado";
        countMap[nome] = (countMap[nome] || 0) + 1;
      });

      const total = ops.length;
      return Object.entries(countMap)
        .map(([motivo, quantidade]) => ({ motivo, quantidade, percentual: (quantidade / total) * 100 }))
        .sort((a, b) => b.quantidade - a.quantidade);
    },
  });
}

export function useComparativoPeriodo(filters: Filters) {
  return useQuery({
    queryKey: ["crm_dash_comparativo", filters],
    enabled: !!filters.funilId,
    queryFn: async (): Promise<{ atual: ComparativoSemana[]; anterior: ComparativoSemana[] }> => {
      const { funilId, responsavelIds, filialId, inicio, fim } = filters;
      const clienteIds = filialId ? await getClienteIdsByFilial(filialId) : undefined;
      const ant = calcularPeriodoAnterior(inicio, fim);

      async function fetchPeriodo(ini: string, fi: string) {
        let qGanho = supabase
          .from("crm_oportunidades")
          .select("id, status, data_fechamento")
          .eq("funil_id", funilId!)
          .eq("status", "ganho")
          .gte("data_fechamento", ini)
          .lte("data_fechamento", fi);
        if (responsavelIds?.length) qGanho = qGanho.in("responsavel_id", responsavelIds);
        if (clienteIds) { if (clienteIds.length === 0) return []; qGanho = qGanho.in("cliente_id", clienteIds); }

        let qPerdido = supabase
          .from("crm_oportunidades")
          .select("id, status, data_perda")
          .eq("funil_id", funilId!)
          .eq("status", "perdido")
          .gte("data_perda", ini)
          .lte("data_perda", fi);
        if (responsavelIds?.length) qPerdido = qPerdido.in("responsavel_id", responsavelIds);
        if (clienteIds) { if (clienteIds.length === 0) return []; qPerdido = qPerdido.in("cliente_id", clienteIds); }

        const [{ data: g }, { data: p }] = await Promise.all([qGanho, qPerdido]);
        // Normalize: use data_fechamento for ganho, data_perda for perdido
        const ganhoNorm = (g || []).map(o => ({ ...o, data_fechamento: o.data_fechamento }));
        const perdidoNorm = (p || []).map(o => ({ ...o, data_fechamento: (o as any).data_perda }));
        return [...ganhoNorm, ...perdidoNorm];
      }

      const [atualData, anteriorData] = await Promise.all([
        fetchPeriodo(inicio, fim),
        fetchPeriodo(ant.inicio, ant.fim),
      ]);

      function agruparPorSemana(data: any[], ini: string): ComparativoSemana[] {
        const start = new Date(ini);
        const weeks: Record<string, { ganhas: number; perdidas: number }> = {};
        data.forEach(o => {
          const d = new Date(o.data_fechamento);
          const weekNum = Math.floor((d.getTime() - start.getTime()) / (7 * 24 * 60 * 60 * 1000));
          const label = `Sem ${weekNum + 1}`;
          if (!weeks[label]) weeks[label] = { ganhas: 0, perdidas: 0 };
          if (o.status === "ganho") weeks[label].ganhas++;
          else weeks[label].perdidas++;
        });
        return Object.entries(weeks)
          .map(([label, v]) => ({ label, ...v }))
          .sort((a, b) => a.label.localeCompare(b.label));
      }

      return {
        atual: agruparPorSemana(atualData, inicio),
        anterior: agruparPorSemana(anteriorData, ant.inicio),
      };
    },
  });
}

// ─── EM ANDAMENTO ──────────────────────────────────────────

export function useKpiAndamento(filters: Omit<Filters, "inicio" | "fim">) {
  return useQuery({
    queryKey: ["crm_dash_kpi_and", filters],
    enabled: !!filters.funilId,
    queryFn: async (): Promise<KpiAndamento> => {
      const { funilId, responsavelIds, filialId } = filters;
      const clienteIds = filialId ? await getClienteIdsByFilial(filialId) : undefined;
      let q = supabase
        .from("crm_oportunidades")
        .select("id, valor, data_previsao_fechamento")
        .eq("funil_id", funilId!)
        .eq("status", "aberta");
      if (responsavelIds?.length) q = q.in("responsavel_id", responsavelIds);
      const { data } = await q;
      const ops = data || [];

      const now = new Date();
      const mesAtualInicio = startOfMonth(now);
      const mesAtualFim = endOfMonth(now);
      const proxMesInicio = startOfMonth(addMonths(now, 1));
      const proxMesFim = endOfMonth(addMonths(now, 1));

      const prevEsteMes = ops.filter(o => {
        if (!o.data_previsao_fechamento) return false;
        const d = new Date(o.data_previsao_fechamento);
        return d >= mesAtualInicio && d <= mesAtualFim;
      });
      const prevProxMes = ops.filter(o => {
        if (!o.data_previsao_fechamento) return false;
        const d = new Date(o.data_previsao_fechamento);
        return d >= proxMesInicio && d <= proxMesFim;
      });
      const semPrev = ops.filter(o => !o.data_previsao_fechamento);

      return {
        totalAndamento: ops.length,
        valorTotalPipeline: ops.reduce((s, o) => s + (o.valor || 0), 0),
        previsaoEsteMes: prevEsteMes.length,
        valorPrevisaoEsteMes: prevEsteMes.reduce((s, o) => s + (o.valor || 0), 0),
        previsaoProximoMes: prevProxMes.length,
        valorPrevisaoProximoMes: prevProxMes.reduce((s, o) => s + (o.valor || 0), 0),
        semPrevisao: semPrev.length,
      };
    },
  });
}

export function useEtapasFunil(filters: Omit<Filters, "inicio" | "fim">) {
  return useQuery({
    queryKey: ["crm_dash_etapas", filters],
    enabled: !!filters.funilId,
    queryFn: async (): Promise<EtapaFunil[]> => {
      const { funilId, responsavelIds } = filters;
      const [{ data: etapas }, { data: ops }] = await Promise.all([
        supabase.from("crm_etapas").select("id, nome, cor, ordem")
          .eq("funil_id", funilId!).eq("ativo", true).order("ordem"),
        (() => {
          let q = supabase.from("crm_oportunidades").select("id, etapa_id, valor")
            .eq("funil_id", funilId!).eq("status", "aberta");
          if (responsavelIds?.length) q = q.in("responsavel_id", responsavelIds);
          return q;
        })(),
      ]);

      const totalOps = (ops || []).length;
      return (etapas || []).map(e => {
        const opsEtapa = (ops || []).filter(o => o.etapa_id === e.id);
        return {
          id: e.id,
          nome: e.nome,
          cor: e.cor,
          quantidade: opsEtapa.length,
          valorTotal: opsEtapa.reduce((s, o) => s + (o.valor || 0), 0),
          percentual: totalOps > 0 ? (opsEtapa.length / totalOps) * 100 : 0,
        };
      });
    },
  });
}

export function useTarefasAnalise(filters: Omit<Filters, "inicio" | "fim"> & { inicio: string; fim: string }) {
  return useQuery({
    queryKey: ["crm_dash_tarefas", filters],
    enabled: !!filters.funilId,
    queryFn: async (): Promise<TarefasAnalise> => {
      const { funilId, responsavelIds } = filters;

      // Get open ops
      let qOps = supabase.from("crm_oportunidades").select("id, etapa_id")
        .eq("funil_id", funilId!).eq("status", "aberta");
      if (responsavelIds?.length) qOps = qOps.in("responsavel_id", responsavelIds);
      const { data: ops } = await qOps;
      const opIds = (ops || []).map(o => o.id);
      if (opIds.length === 0) return { agendadas: 0, atrasadas: 0, diasMedioAtraso: 0, concluidas: 0, semTarefa: 0, porEtapa: [] };

      const { data: tarefas } = await supabase
        .from("crm_tarefas")
        .select("id, oportunidade_id, data_reuniao, concluido_em")
        .in("oportunidade_id", opIds);

      const { data: etapas } = await supabase
        .from("crm_etapas").select("id, nome").eq("funil_id", funilId!).eq("ativo", true);

      const now = new Date();
      let agendadas = 0, atrasadas = 0, concluidas = 0, totalDiasAtraso = 0;
      const tarefasPorOp: Record<string, boolean> = {};

      (tarefas || []).forEach(t => {
        tarefasPorOp[t.oportunidade_id] = true;
        if (t.concluido_em) {
          const conclDate = new Date(t.concluido_em);
          if (conclDate >= new Date(filters.inicio) && conclDate <= new Date(filters.fim)) {
            concluidas++;
          }
        } else if (t.data_reuniao) {
          const dr = new Date(t.data_reuniao);
          if (dr < now) {
            atrasadas++;
            totalDiasAtraso += Math.floor((now.getTime() - dr.getTime()) / (1000 * 60 * 60 * 24));
          } else {
            agendadas++;
          }
        }
      });

      const semTarefa = opIds.filter(id => !tarefasPorOp[id]).length;
      const diasMedioAtraso = atrasadas > 0 ? Math.round(totalDiasAtraso / atrasadas) : 0;

      // Por etapa
      const etapaMap: Record<string, string> = {};
      (etapas || []).forEach(e => { etapaMap[e.id] = e.nome; });

      const porEtapa = (etapas || []).map(e => {
        const opsEtapa = (ops || []).filter(o => o.etapa_id === e.id);
        const opsIds = opsEtapa.map(o => o.id);
        const tarefasEtapa = (tarefas || []).filter(t => opsIds.includes(t.oportunidade_id));
        const tarefaOps = new Set(tarefasEtapa.map(t => t.oportunidade_id));

        let ag = 0, at = 0;
        tarefasEtapa.forEach(t => {
          if (!t.concluido_em && t.data_reuniao) {
            if (new Date(t.data_reuniao) < now) at++;
            else ag++;
          }
        });

        return {
          etapa_id: e.id,
          etapa_nome: e.nome,
          agendadas: ag,
          atrasadas: at,
          semTarefa: opsIds.filter(id => !tarefaOps.has(id)).length,
        };
      });

      return { agendadas, atrasadas, diasMedioAtraso, concluidas, semTarefa, porEtapa };
    },
  });
}

export function useAlertasAtencao(filters: Omit<Filters, "inicio" | "fim"> & { diasSemInteracao: number }) {
  return useQuery({
    queryKey: ["crm_dash_alertas", filters],
    enabled: !!filters.funilId,
    queryFn: async (): Promise<AlertaAtencao[]> => {
      const { funilId, responsavelIds, diasSemInteracao } = filters;
      let q = supabase
        .from("crm_oportunidades")
        .select("id, titulo, etapa_id, responsavel_id, cliente_id, data_previsao_fechamento, updated_at, clientes(nome_fantasia)")
        .eq("funil_id", funilId!)
        .eq("status", "aberta");
      if (responsavelIds?.length) q = q.in("responsavel_id", responsavelIds);
      const { data: ops } = await q;
      if (!ops?.length) return [];

      const opIds = ops.map(o => o.id);
      const now = new Date();

      // Get etapas names
      const { data: etapas } = await supabase.from("crm_etapas").select("id, nome").eq("funil_id", funilId!);
      const etapaMap: Record<string, string> = {};
      (etapas || []).forEach(e => { etapaMap[e.id] = e.nome; });

      // Get responsaveis
      const rIds = [...new Set(ops.map(o => o.responsavel_id).filter(Boolean))] as string[];
      let profMap: Record<string, string> = {};
      if (rIds.length > 0) {
        const { data: profs } = await supabase.from("profiles").select("user_id, full_name").in("user_id", rIds);
        (profs || []).forEach(p => { profMap[p.user_id] = p.full_name; });
      }

      // Get latest tarefas
      const { data: tarefas } = await supabase
        .from("crm_tarefas")
        .select("oportunidade_id, data_reuniao, concluido_em")
        .in("oportunidade_id", opIds);

      const tarefaMap: Record<string, { atrasada: boolean; ultimaData: string | null }> = {};
      (tarefas || []).forEach(t => {
        if (!tarefaMap[t.oportunidade_id]) tarefaMap[t.oportunidade_id] = { atrasada: false, ultimaData: null };
        if (!t.concluido_em && t.data_reuniao && new Date(t.data_reuniao) < now) {
          tarefaMap[t.oportunidade_id].atrasada = true;
        }
        const d = t.data_reuniao || t.concluido_em;
        if (d && (!tarefaMap[t.oportunidade_id].ultimaData || d > tarefaMap[t.oportunidade_id].ultimaData!)) {
          tarefaMap[t.oportunidade_id].ultimaData = d;
        }
      });

      const alertas: AlertaAtencao[] = [];
      const limiteInteracao = new Date(now.getTime() - diasSemInteracao * 24 * 60 * 60 * 1000);

      ops.forEach(o => {
        const cliente = (o as any).clientes?.nome_fantasia || null;
        const base = {
          oportunidade_id: o.id,
          titulo: o.titulo,
          cliente_nome: cliente,
          etapa_nome: etapaMap[o.etapa_id] || "",
          responsavel_nome: o.responsavel_id ? profMap[o.responsavel_id] || null : null,
          ultimo_contato: tarefaMap[o.id]?.ultimaData || o.updated_at,
        };

        // Tarefa atrasada
        if (tarefaMap[o.id]?.atrasada) {
          alertas.push({ ...base, tipo: "tarefa_atrasada", dias: 0 });
        }

        // Previsão vencida
        if (o.data_previsao_fechamento && new Date(o.data_previsao_fechamento) < now) {
          const dias = Math.floor((now.getTime() - new Date(o.data_previsao_fechamento).getTime()) / (1000 * 60 * 60 * 24));
          alertas.push({ ...base, tipo: "previsao_vencida", dias });
        }

        // Sem interação
        const lastContact = new Date(base.ultimo_contato || o.updated_at);
        if (lastContact < limiteInteracao) {
          const dias = Math.floor((now.getTime() - lastContact.getTime()) / (1000 * 60 * 60 * 24));
          alertas.push({ ...base, tipo: "sem_interacao", dias });
        }
      });

      // Sort by urgency
      const prioridade = { tarefa_atrasada: 0, previsao_vencida: 1, sem_interacao: 2 };
      return alertas.sort((a, b) => prioridade[a.tipo] - prioridade[b.tipo]);
    },
  });
}
