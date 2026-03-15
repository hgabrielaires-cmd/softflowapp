// ─── Query hook for "Aguardando Faturamento" tab ──────────────────────────

import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import type { ContratoAguardando, AditivoPendente } from "./types";

const PAGE_SIZE = 15;

export function useAguardandoFaturamentoQueries(filialFilter: string = "all") {
  const [contratos, setContratos] = useState<ContratoAguardando[]>([]);
  const [loading, setLoading] = useState(true);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState("");

  const loadContratos = useCallback(async () => {
    setLoading(true);

    // 1. Get all contrato IDs that already have a contratos_financeiros record
    const { data: jaFaturados } = await supabase
      .from("contratos_financeiros")
      .select("contrato_id");
    const idsFaturados = new Set((jaFaturados || []).map((r: any) => r.contrato_id));

    // 1b. Get all contratos that have ZapSign status "Assinado"
    const { data: zapsignData } = await supabase
      .from("contratos_zapsign")
      .select("contrato_id, status");
    const zapsignMap = new Map((zapsignData || []).map((r: any) => [r.contrato_id, r.status]));

    // 2. Get signed/active contracts (include retroactive with status_geracao = 'Manual')
    let query = supabase
      .from("contratos")
      .select(`
        id, numero_exibicao, tipo, status, status_geracao, created_at, updated_at,
        cliente_id, plano_id, pedido_id, contrato_origem_id,
        clientes(nome_fantasia, cnpj_cpf, email, telefone, filial_id),
        planos(nome, valor_mensalidade_padrao, valor_implantacao_padrao),
        pedidos(tipo_pedido, vendedor_id, valor_mensalidade_final, valor_implantacao_final, pagamento_implantacao_parcelas, filial_id, modulos_adicionais)
      `, { count: "exact" })
      .in("status", ["Assinado", "Ativo"]);

    if (search.trim()) {
      query = query.or(`numero_exibicao.ilike.%${search.trim()}%,clientes.nome_fantasia.ilike.%${search.trim()}%`);
    }

    const { data, count, error } = await query
      .order("updated_at", { ascending: false });

    if (error) {
      toast.error("Erro ao carregar contratos: " + error.message);
      setContratos([]);
      setTotal(0);
      setLoading(false);
      return;
    }

    // Filter: not already billed AND (ZapSign = Assinado, or manual/retroactive, or no ZapSign + status = Assinado)
    let pendentes = (data || []).filter((c: any) => {
      if (idsFaturados.has(c.id)) return false;
      // Retroactive contracts (status_geracao = 'Manual') always qualify
      if (c.status_geracao === "Manual" && c.status === "Ativo") return true;
      const zStatus = zapsignMap.get(c.id);
      // Include if: ZapSign says "Assinado", OR no ZapSign record and contract itself is "Assinado"
      if (zStatus === "Assinado") return true;
      if (!zStatus && c.status === "Assinado") return true;
      return false;
    });

    // Filter by filial if selected
    if (filialFilter !== "all") {
      pendentes = pendentes.filter((c: any) => {
        const filialId = c.pedidos?.filial_id || c.clientes?.filial_id;
        return filialId === filialFilter;
      });
    }

    // ── CORREÇÃO 2: Detectar aditivos pendentes vinculados a cada contrato Base ──
    // Build a set of all pending contract IDs (not billed)
    const pendentesIds = new Set(pendentes.map((c: any) => c.id));

    // For each Base contract, find linked additives that are also pending
    const aditivosPendentesMap = new Map<string, AditivoPendente[]>();
    for (const c of pendentes) {
      if ((c as any).tipo !== "Base") continue;
      // Find contracts that reference this base as contrato_origem_id and are also pending
      const linked = pendentes.filter((p: any) =>
        p.contrato_origem_id === (c as any).id && p.id !== (c as any).id
      );
      if (linked.length > 0) {
        aditivosPendentesMap.set((c as any).id, linked.map((l: any) => ({
          id: l.id,
          numero_exibicao: l.numero_exibicao,
          tipo_pedido: l.pedidos?.tipo_pedido || l.tipo,
        })));
      }
    }

    // Also check DB for additives that might not be in the current pending list
    // (e.g. different status combinations) - check contratos with contrato_origem_id pointing to base IDs
    const baseIds = pendentes.filter((c: any) => c.tipo === "Base").map((c: any) => c.id);
    if (baseIds.length > 0) {
      const { data: aditivosDb } = await supabase
        .from("contratos")
        .select("id, numero_exibicao, contrato_origem_id, pedidos(tipo_pedido)")
        .in("contrato_origem_id", baseIds)
        .in("status", ["Assinado", "Ativo"]);

      for (const ad of (aditivosDb || [])) {
        if (idsFaturados.has(ad.id)) continue; // already billed
        const baseId = ad.contrato_origem_id!;
        const existing = aditivosPendentesMap.get(baseId) || [];
        if (!existing.find(e => e.id === ad.id)) {
          existing.push({
            id: ad.id,
            numero_exibicao: ad.numero_exibicao,
            tipo_pedido: (ad.pedidos as any)?.tipo_pedido || "Aditivo",
          });
          aditivosPendentesMap.set(baseId, existing);
        }
      }
    }

    // Map to typed structure
    const mapped: ContratoAguardando[] = pendentes.map((c: any) => {
      const diasAguardando = Math.floor(
        (Date.now() - new Date(c.updated_at).getTime()) / (1000 * 60 * 60 * 24)
      );

      const isRetroativo = c.status_geracao === "Manual";

      let badgeTipo: ContratoAguardando["badge_tipo"] = isRetroativo ? "Retroativo" : "Não Faturado";
      if (!isRetroativo) {
        if (c.tipo === "Aditivo" && c.pedidos?.tipo_pedido === "Upgrade") badgeTipo = "Upgrade Pendente";
        else if (c.tipo === "Aditivo" && c.pedidos?.tipo_pedido === "Módulo Adicional") badgeTipo = "Módulo Pendente";
        else if (c.tipo === "Aditivo" && c.pedidos?.tipo_pedido === "Downgrade") badgeTipo = "Downgrade Pendente";
        else if (c.tipo === "OA") badgeTipo = "OA Pendente";
        else if (c.tipo === "Aditivo") badgeTipo = "Upgrade Pendente";
      }

      const modulos = c.pedidos?.modulos_adicionais as any[] | null;

      return {
        id: c.id,
        numero_exibicao: c.numero_exibicao,
        tipo: c.tipo,
        status: c.status,
        created_at: c.created_at,
        updated_at: c.updated_at,
        cliente_id: c.cliente_id,
        plano_id: c.plano_id,
        pedido_id: c.pedido_id,
        contrato_origem_id: c.contrato_origem_id,
        cliente_nome: c.clientes?.nome_fantasia || "—",
        plano_nome: c.planos?.nome || "—",
        valor_mensalidade: c.pedidos?.valor_mensalidade_final ?? c.planos?.valor_mensalidade_padrao ?? 0,
        valor_implantacao: c.pedidos?.valor_implantacao_final ?? c.planos?.valor_implantacao_padrao ?? 0,
        parcelas_implantacao: c.pedidos?.pagamento_implantacao_parcelas ?? 1,
        data_assinatura: c.updated_at,
        dias_aguardando: diasAguardando,
        badge_tipo: badgeTipo,
        is_retroativo: isRetroativo,
        modulos_adicionais: modulos,
        aditivos_pendentes: aditivosPendentesMap.get(c.id) || [],
      };
    });

    // Client-side pagination
    const from = (page - 1) * PAGE_SIZE;
    const paginated = mapped.slice(from, from + PAGE_SIZE);

    setContratos(paginated);
    setTotal(mapped.length);
    setLoading(false);
  }, [page, search, filialFilter]);

  useEffect(() => { loadContratos(); }, [loadContratos]);

  const totalPages = Math.ceil(total / PAGE_SIZE);

  return {
    contratos,
    loading,
    total,
    totalPages,
    page, setPage,
    search, setSearch,
    loadContratos,
  };
}
