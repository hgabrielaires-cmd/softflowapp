// ─── Query hook for "Aguardando Faturamento" tab ──────────────────────────

import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import type { ContratoAguardando } from "./types";

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

    // 2. Get signed/active contracts
    let query = supabase
      .from("contratos")
      .select(`
        id, numero_exibicao, tipo, status, created_at, updated_at,
        cliente_id, plano_id, pedido_id, contrato_origem_id,
        clientes(nome_fantasia, cnpj_cpf, email, telefone, filial_id),
        planos(nome, valor_mensalidade_padrao, valor_implantacao_padrao),
        pedidos(tipo_pedido, vendedor_id, valor_mensalidade_final, valor_implantacao_final, pagamento_implantacao_parcelas, filial_id)
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

    // Filter: not already billed AND actually signed (ZapSign = Assinado, or no ZapSign record but contract status = Assinado)
    let pendentes = (data || []).filter((c: any) => {
      if (idsFaturados.has(c.id)) return false;
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

    // Map to typed structure
    const mapped: ContratoAguardando[] = pendentes.map((c: any) => {
      const diasAguardando = Math.floor(
        (Date.now() - new Date(c.updated_at).getTime()) / (1000 * 60 * 60 * 24)
      );

      let badgeTipo: ContratoAguardando["badge_tipo"] = "Não Faturado";
      if (c.tipo === "Aditivo" && c.pedidos?.tipo_pedido === "Upgrade") badgeTipo = "Upgrade Pendente";
      else if (c.tipo === "Aditivo" && c.pedidos?.tipo_pedido === "Módulo Adicional") badgeTipo = "Módulo Pendente";
      else if (c.tipo === "Aditivo" && c.pedidos?.tipo_pedido === "Downgrade") badgeTipo = "Downgrade Pendente";
      else if (c.tipo === "OA") badgeTipo = "OA Pendente";
      else if (c.tipo === "Aditivo") badgeTipo = "Upgrade Pendente";

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
