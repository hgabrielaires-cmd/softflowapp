// ─── Data fetching hook for Pedidos module ────────────────────────────────
import { useState, useCallback, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import type { Cliente, Filial, Profile, Contrato } from "@/lib/supabase-types";
import type { PedidoWithJoins, ModuloOpcional, ModuloAdicionadoItem } from "./types";

interface ServicoCatalogo {
  id: string;
  nome: string;
  valor: number;
  unidade_medida: string;
}

interface UsePedidosQueriesReturn {
  // Main data
  pedidos: PedidoWithJoins[];
  clientes: Cliente[];
  planos: any[];
  filiais: Filial[];
  vendedores: Profile[];
  servicosCatalogo: ServicoCatalogo[];
  loading: boolean;
  zapsignMap: Record<string, string>;
  contratoStatusMap: Record<string, string>;
  loadData: () => Promise<void>;

  // Plan loading
  planoSelecionado: any | null;
  setPlanoSelecionado: React.Dispatch<React.SetStateAction<any | null>>;
  modulosDisponiveis: ModuloOpcional[];
  setModulosDisponiveis: React.Dispatch<React.SetStateAction<ModuloOpcional[]>>;
  precosFilialMap: Record<string, { valor_implantacao: number; valor_mensalidade: number }>;
  setPrecosFilialMap: React.Dispatch<React.SetStateAction<Record<string, { valor_implantacao: number; valor_mensalidade: number }>>>;
  loadingModulos: boolean;
  loadPlano: (planoId: string, modulosAdicionaisExistentes?: ModuloAdicionadoItem[], filialIdOverride?: string) => Promise<{
    planoData: any;
    disponiveis: ModuloOpcional[];
    precosMap: Record<string, { valor_implantacao: number; valor_mensalidade: number }>;
    planoImplantacao: number;
    planoMensalidade: number;
    updatedModulos: ModuloAdicionadoItem[];
  } | null>;

  // Filial parameters
  filialParametros: any | null;
  loadFilialParametros: (filialId: string) => Promise<void>;

  // Active contract
  contratoAtivo: Contrato | null;
  setContratoAtivo: React.Dispatch<React.SetStateAction<Contrato | null>>;
  loadingContrato: boolean;
  buscarContratoAtivo: (clienteId: string) => Promise<void>;

  // Discount limits
  limiteDesconto: { implantacao: number; mensalidade: number } | null;
  setLimiteDesconto: React.Dispatch<React.SetStateAction<{ implantacao: number; mensalidade: number } | null>>;
  carregarLimitesDesconto: (vendedorUserId: string) => Promise<void>;
}

export function usePedidosQueries(): UsePedidosQueriesReturn {
  // ─── Main data state ────────────────────────────────────────────────────
  const [pedidos, setPedidos] = useState<PedidoWithJoins[]>([]);
  const [clientes, setClientes] = useState<Cliente[]>([]);
  const [planos, setPlanos] = useState<any[]>([]);
  const [filiais, setFiliais] = useState<Filial[]>([]);
  const [vendedores, setVendedores] = useState<Profile[]>([]);
  const [servicosCatalogo, setServicosCatalogo] = useState<ServicoCatalogo[]>([]);
  const [loading, setLoading] = useState(true);
  const [zapsignMap, setZapsignMap] = useState<Record<string, string>>({});
  const [contratoStatusMap, setContratoStatusMap] = useState<Record<string, string>>({});

  // ─── Plan state ─────────────────────────────────────────────────────────
  const [planoSelecionado, setPlanoSelecionado] = useState<any | null>(null);
  const [modulosDisponiveis, setModulosDisponiveis] = useState<ModuloOpcional[]>([]);
  const [precosFilialMap, setPrecosFilialMap] = useState<Record<string, { valor_implantacao: number; valor_mensalidade: number }>>({});
  const [loadingModulos, setLoadingModulos] = useState(false);

  // ─── Filial parameters ──────────────────────────────────────────────────
  const [filialParametros, setFilialParametros] = useState<any | null>(null);

  // ─── Active contract ────────────────────────────────────────────────────
  const [contratoAtivo, setContratoAtivo] = useState<Contrato | null>(null);
  const [loadingContrato, setLoadingContrato] = useState(false);

  // ─── Discount limits ────────────────────────────────────────────────────
  const [limiteDesconto, setLimiteDesconto] = useState<{ implantacao: number; mensalidade: number } | null>(null);

  // ─── loadData ───────────────────────────────────────────────────────────
  const loadData = useCallback(async () => {
    setLoading(true);
    const [
      { data: pedidosData },
      { data: clientesData },
      { data: planosData },
      { data: filiaisData },
      { data: vendedoresData },
      { data: servicosData },
    ] = await Promise.all([
      supabase.from("pedidos").select("*, clientes(nome_fantasia), planos(nome), filiais(nome)").order("created_at", { ascending: false }),
      supabase.from("clientes").select("*").eq("ativo", true).order("nome_fantasia"),
      supabase.from("planos").select("*").eq("ativo", true).order("ordem").order("nome"),
      supabase.from("filiais").select("*").eq("ativa", true).order("nome"),
      supabase.from("profiles").select("*").eq("active", true).order("full_name"),
      supabase.from("servicos").select("id, nome, valor, unidade_medida").eq("ativo", true).order("nome"),
    ]);

    const pedidosList = (pedidosData || []) as unknown as PedidoWithJoins[];
    setPedidos(pedidosList);
    setClientes((clientesData || []) as Cliente[]);
    setPlanos(planosData || []);
    setFiliais((filiaisData || []) as Filial[]);
    setVendedores((vendedoresData || []) as Profile[]);
    setServicosCatalogo((servicosData || []) as ServicoCatalogo[]);

    // Fetch ZapSign status for orders
    const pedidoIds = pedidosList.map(p => p.id);
    if (pedidoIds.length > 0) {
      const { data: contratosData } = await supabase
        .from("contratos")
        .select("id, pedido_id, status_geracao, contratos_zapsign(status)")
        .in("pedido_id", pedidoIds);
      const map: Record<string, string> = {};
      const statusMap: Record<string, string> = {};
      (contratosData || []).forEach((c: any) => {
        if (c.pedido_id && c.contratos_zapsign?.status) {
          map[c.pedido_id] = c.contratos_zapsign.status;
        }
        if (c.pedido_id && c.status_geracao) {
          statusMap[c.pedido_id] = c.status_geracao;
        }
      });
      setZapsignMap(map);
      setContratoStatusMap(statusMap);
    } else {
      setZapsignMap({});
      setContratoStatusMap({});
    }

    setLoading(false);
  }, []);

  // Auto-load on mount
  useEffect(() => { loadData(); }, [loadData]);

  // ─── loadPlano ──────────────────────────────────────────────────────────
  const loadPlano = useCallback(async (
    planoId: string,
    modulosAdicionaisExistentes: ModuloAdicionadoItem[] = [],
    filialIdOverride?: string,
  ) => {
    if (!planoId) {
      setPlanoSelecionado(null);
      setModulosDisponiveis([]);
      setPrecosFilialMap({});
      return null;
    }

    setLoadingModulos(true);

    const [{ data: planoData }, { data: vinculosData }, { data: precosData }] = await Promise.all([
      supabase.from("planos").select("*").eq("id", planoId).single(),
      supabase.from("plano_modulos")
        .select("*, modulo:modulos(*)")
        .eq("plano_id", planoId)
        .order("ordem"),
      supabase.from("precos_filial").select("*").or(`and(tipo.eq.plano,referencia_id.eq.${planoId}),tipo.eq.modulo`),
    ]);

    setPlanoSelecionado(planoData);

    // Build precos map
    const pMap: Record<string, { valor_implantacao: number; valor_mensalidade: number }> = {};
    (precosData || []).forEach((p: any) => {
      pMap[`${p.tipo}:${p.referencia_id}:${p.filial_id}`] = {
        valor_implantacao: p.valor_implantacao,
        valor_mensalidade: p.valor_mensalidade,
      };
    });
    setPrecosFilialMap(pMap);

    const currentFilialId = filialIdOverride;

    // Resolve plan prices based on filial
    const planoPrecoFilial = currentFilialId ? pMap[`plano:${planoId}:${currentFilialId}`] : null;
    const planoImplantacao = planoPrecoFilial ? planoPrecoFilial.valor_implantacao : (planoData?.valor_implantacao_padrao ?? 0);
    const planoMensalidade = planoPrecoFilial ? planoPrecoFilial.valor_mensalidade : (planoData?.valor_mensalidade_padrao ?? 0);

    const disponiveis: ModuloOpcional[] = [];
    (vinculosData || []).forEach((v: any) => {
      if (v.modulo) {
        const modPrecoFilial = currentFilialId ? pMap[`modulo:${v.modulo.id}:${currentFilialId}`] : null;
        disponiveis.push({
          id: v.modulo.id,
          nome: v.modulo.nome,
          valor_implantacao_modulo: modPrecoFilial ? modPrecoFilial.valor_implantacao : (v.modulo.valor_implantacao_modulo ?? 0),
          valor_mensalidade_modulo: modPrecoFilial ? modPrecoFilial.valor_mensalidade : (v.modulo.valor_mensalidade_modulo ?? 0),
          incluso_no_plano: v.incluso_no_plano,
          permite_revenda: v.modulo.permite_revenda ?? false,
          quantidade_maxima: v.modulo.quantidade_maxima ?? null,
        });
      }
    });
    setModulosDisponiveis(disponiveis);

    // Update module prices in existing adicional list based on filial
    const updatedModulos = modulosAdicionaisExistentes.map((m) => {
      const modPrecoFilial = currentFilialId ? pMap[`modulo:${m.modulo_id}:${currentFilialId}`] : null;
      if (modPrecoFilial) {
        return { ...m, valor_implantacao_modulo: modPrecoFilial.valor_implantacao, valor_mensalidade_modulo: modPrecoFilial.valor_mensalidade };
      }
      return m;
    });

    setLoadingModulos(false);

    return {
      planoData,
      disponiveis,
      precosMap: pMap,
      planoImplantacao,
      planoMensalidade,
      updatedModulos,
    };
  }, []);

  // ─── loadFilialParametros ───────────────────────────────────────────────
  const loadFilialParametros = useCallback(async (filialId: string) => {
    if (!filialId) { setFilialParametros(null); return; }
    const { data } = await supabase
      .from("filial_parametros")
      .select("*")
      .eq("filial_id", filialId)
      .maybeSingle();
    setFilialParametros(data || null);
  }, []);

  // ─── buscarContratoAtivo ────────────────────────────────────────────────
  const buscarContratoAtivo = useCallback(async (clienteId: string) => {
    if (!clienteId) { setContratoAtivo(null); return; }
    setLoadingContrato(true);
    const { data } = await supabase
      .from("contratos")
      .select("*")
      .eq("cliente_id", clienteId)
      .eq("status", "Ativo")
      .eq("tipo", "Base")
      .order("created_at", { ascending: false })
      .limit(1);
    setContratoAtivo(data && data.length > 0 ? (data[0] as unknown as Contrato) : null);
    setLoadingContrato(false);
  }, []);

  // ─── carregarLimitesDesconto ────────────────────────────────────────────
  const carregarLimitesDesconto = useCallback(async (vendedorUserId: string) => {
    const { data } = await supabase
      .from("profiles")
      .select("desconto_limite_implantacao, desconto_limite_mensalidade")
      .eq("user_id", vendedorUserId)
      .single();
    if (data) {
      setLimiteDesconto({
        implantacao: data.desconto_limite_implantacao ?? 100,
        mensalidade: data.desconto_limite_mensalidade ?? 100,
      });
    } else {
      setLimiteDesconto({ implantacao: 100, mensalidade: 100 });
    }
  }, []);

  return {
    pedidos,
    clientes,
    planos,
    filiais,
    vendedores,
    servicosCatalogo,
    loading,
    zapsignMap,
    contratoStatusMap,
    loadData,
    planoSelecionado,
    setPlanoSelecionado,
    modulosDisponiveis,
    setModulosDisponiveis,
    precosFilialMap,
    setPrecosFilialMap,
    loadingModulos,
    loadPlano,
    filialParametros,
    loadFilialParametros,
    contratoAtivo,
    setContratoAtivo,
    loadingContrato,
    buscarContratoAtivo,
    limiteDesconto,
    setLimiteDesconto,
    carregarLimitesDesconto,
  };
}
