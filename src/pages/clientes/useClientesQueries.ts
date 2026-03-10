import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/context/AuthContext";
import { useCrudPermissions } from "@/hooks/useCrudPermissions";
import { useUserFiliais } from "@/hooks/useUserFiliais";
import { Cliente, Filial, Contrato } from "@/lib/supabase-types";
import type { ClienteContato, PedidoHistorico, RentabilidadeConsolidada } from "./types";

// ─── Hook: camada de dados, filtros e permissões do módulo Clientes ─────

export function useClientesQueries() {
  const { roles, profile } = useAuth();
  const isAdmin = roles.includes("admin");
  const { canIncluir: crudIncluir, canEditar: crudEditar, canExcluir: crudExcluir } = useCrudPermissions("clientes", roles);
  const canEditExisting = isAdmin || crudEditar;
  const vendedorSomenteLeitura = !canEditExisting;
  const { filiaisDoUsuario, filialPadraoId, isGlobal } = useUserFiliais();

  // ── Data states ────────────────────────────────────────────────────────
  const [clientes, setClientes] = useState<Cliente[]>([]);
  const [decisoresMap, setDecisoresMap] = useState<Record<string, { nome: string; telefone: string | null }>>({});
  const [filiais, setFiliais] = useState<Filial[]>([]);
  const [loading, setLoading] = useState(true);

  // ── Filter states ──────────────────────────────────────────────────────
  const [search, setSearch] = useState("");
  const [filtroFilialId, setFiltroFilialId] = useState<string>("__todas__");
  const [currentPage, setCurrentPage] = useState(1);

  // ── Permissões especiais ───────────────────────────────────────────────
  const [podeImportar, setPodeImportar] = useState(false);
  const [podeVerHistorico, setPodeVerHistorico] = useState(false);
  const [podeVerRentabilidade, setPodeVerRentabilidade] = useState(false);

  // ── Histórico contratual ───────────────────────────────────────────────
  const [historicoOpen, setHistoricoOpen] = useState(false);
  const [clienteHistorico, setClienteHistorico] = useState<Cliente | null>(null);
  const [contratosList, setContratosList] = useState<Contrato[]>([]);
  const [pedidosHistorico, setPedidosHistorico] = useState<PedidoHistorico[]>([]);
  const [loadingHistorico, setLoadingHistorico] = useState(false);
  const [rentabilidadeConsolidada, setRentabilidadeConsolidada] = useState<RentabilidadeConsolidada | null>(null);
  const [margemIdealHistorico, setMargemIdealHistorico] = useState<number | null>(null);

  // ── Load permissões especiais ──────────────────────────────────────────
  useEffect(() => {
    if (!profile?.user_id) return;
    (async () => {
      const { data: rolesData } = await supabase
        .from("user_roles")
        .select("role")
        .eq("user_id", profile.user_id);
      const userRoles = (rolesData || []).map((r: any) => r.role);
      const { data: perms } = await supabase
        .from("role_permissions")
        .select("permissao, ativo")
        .in("role", userRoles)
        .in("permissao", ["acao.importar_clientes", "acao.ver_rentabilidade_historico", "acao.ver_historico_clientes"])
        .eq("ativo", true);
      const permSet = new Set((perms || []).map((p: any) => p.permissao));
      setPodeImportar(permSet.has("acao.importar_clientes"));
      setPodeVerRentabilidade(isAdmin || permSet.has("acao.ver_rentabilidade_historico"));
      setPodeVerHistorico(isAdmin || permSet.has("acao.ver_historico_clientes"));
    })();
  }, [profile?.user_id, isAdmin]);

  // ── Fetch principal ────────────────────────────────────────────────────
  async function fetchData() {
    setLoading(true);
    const [{ data: c }, { data: f }, { data: decisores }] = await Promise.all([
      supabase.from("clientes").select("*").order("nome_fantasia"),
      supabase.from("filiais").select("*").order("nome"),
      supabase.from("cliente_contatos").select("cliente_id, nome, telefone").eq("decisor", true).eq("ativo", true),
    ]);
    setClientes(c || []);
    setFiliais(f || []);
    const dMap: Record<string, { nome: string; telefone: string | null }> = {};
    (decisores || []).forEach((d: any) => {
      if (!dMap[d.cliente_id]) dMap[d.cliente_id] = { nome: d.nome, telefone: d.telefone };
    });
    setDecisoresMap(dMap);
    setLoading(false);
  }

  useEffect(() => { fetchData(); }, []);

  // ── Filtro computado ───────────────────────────────────────────────────
  const allowedFilialIds = filiaisDoUsuario.map(f => f.id);
  const clientesFiltradosPorFilial = isGlobal
    ? clientes
    : clientes.filter((c) => c.filial_id && allowedFilialIds.includes(c.filial_id));

  const clientesFiltradosPorFilialSelecionada = filtroFilialId === "__todas__"
    ? clientesFiltradosPorFilial
    : clientesFiltradosPorFilial.filter((c) => c.filial_id === filtroFilialId);

  const searchTerm = search.toLowerCase().trim();
  const searchDigits = searchTerm.replace(/\D/g, "");
  const filtered = searchTerm
    ? clientesFiltradosPorFilialSelecionada.filter((c) =>
        c.nome_fantasia.toLowerCase().includes(searchTerm) ||
        (c.razao_social || "").toLowerCase().includes(searchTerm) ||
        ((c as any).apelido || "").toLowerCase().includes(searchTerm) ||
        (searchDigits.length > 0 && (c.cnpj_cpf || "").replace(/\D/g, "").includes(searchDigits)) ||
        (c.cnpj_cpf || "").toLowerCase().includes(searchTerm) ||
        (c.contato_nome || "").toLowerCase().includes(searchTerm) ||
        (c.telefone || "").includes(searchTerm)
      )
    : clientesFiltradosPorFilialSelecionada;

  // Reset page when filters change
  useEffect(() => { setCurrentPage(1); }, [search, filtroFilialId]);

  // ── Helper de filial ───────────────────────────────────────────────────
  const filialNome = (id: string | null) => filiais.find((f) => f.id === id)?.nome || "—";

  // ── Fetch contatos do cliente ──────────────────────────────────────────
  async function fetchContatos(clienteId: string): Promise<ClienteContato[]> {
    const { data } = await supabase
      .from("cliente_contatos")
      .select("*")
      .eq("cliente_id", clienteId)
      .order("decisor", { ascending: false })
      .order("nome");
    return (data || []) as ClienteContato[];
  }

  // ── Histórico contratual ───────────────────────────────────────────────
  async function calcularRentabilidadeConsolidada(contratos: any[], pedidos: PedidoHistorico[], filialId: string | null) {
    const contratosAtivos = contratos.filter((c) => c.status === "Ativo" && c.tipo !== "OA");
    if (contratosAtivos.length === 0) return;

    const contratoIds = new Set(contratosAtivos.map((c) => c.id));
    const pedidosRelevantes = pedidos.filter(
      (p) => p.contrato_id && contratoIds.has(p.contrato_id) &&
        p.status_pedido !== "Cancelado" &&
        !["OA", "Serviço"].includes(p.tipo_pedido)
    );

    const planoIds = [...new Set(pedidosRelevantes.map((p) => p.plano_id).filter(Boolean))];

    const [{ data: custosPlanos }, { data: custosModulos }, { data: paramFilial }] = await Promise.all([
      supabase.from("custos").select("*").in("plano_id", planoIds.length ? planoIds : [""]).is("modulo_id", null),
      supabase.from("custos").select("*").not("modulo_id", "is", null),
      filialId ? supabase.from("filial_parametros").select("margem_venda_ideal").eq("filial_id", filialId).maybeSingle() : Promise.resolve({ data: null }),
    ]);

    if (paramFilial) setMargemIdealHistorico((paramFilial as any)?.margem_venda_ideal ?? null);

    const calcCustoPlano = (cp: any, receitaRef: number) => {
      if (!cp) return 0;
      const impostoBase = cp.imposto_base === 'venda' ? receitaRef : cp.preco_fornecedor;
      const impostoVal = cp.imposto_tipo === '%' ? impostoBase * (cp.imposto_valor / 100) : cp.imposto_valor;
      return cp.preco_fornecedor + impostoVal + cp.taxa_boleto + cp.despesas_adicionais;
    };

    let receitaMensalTotal = 0;
    let custoMensalTotal = 0;
    const processedPlanos = new Set<string>();

    for (const ped of pedidosRelevantes) {
      const mensFinal = ped.valor_mensalidade_final || 0;
      receitaMensalTotal += mensFinal;

      if (ped.tipo_pedido === "Upgrade" && ped.contrato_id) {
        const contrato = contratosAtivos.find((c) => c.id === ped.contrato_id);
        const planoAnteriorId = contrato?.contrato_origem_id
          ? contratosAtivos.find((c2) => c2.id === contrato.contrato_origem_id)?.plano_id
          : null;
        const custoNovo = (custosPlanos || []).find((c: any) => c.plano_id === ped.plano_id);
        let custoAnterior: any = null;
        if (planoAnteriorId) {
          custoAnterior = (custosPlanos || []).find((c: any) => c.plano_id === planoAnteriorId);
        }
        const diff = Math.max(0, calcCustoPlano(custoNovo, mensFinal) - calcCustoPlano(custoAnterior, 0));
        custoMensalTotal += diff;
      } else if (!processedPlanos.has(ped.plano_id)) {
        processedPlanos.add(ped.plano_id);
        const custoPlano = (custosPlanos || []).find((c: any) => c.plano_id === ped.plano_id);
        custoMensalTotal += calcCustoPlano(custoPlano, mensFinal);
      }

      const adicionais = Array.isArray(ped.modulos_adicionais) ? ped.modulos_adicionais : [];
      adicionais.forEach((m: any) => {
        const custoMod = (custosModulos || []).find((c: any) => c.modulo_id === m.modulo_id);
        if (custoMod) {
          const qty = m.quantidade || 1;
          const impostoBase = custoMod.imposto_base === 'venda' ? (m.valor_mensalidade_modulo || 0) * qty : custoMod.preco_fornecedor * qty;
          const impostoVal = custoMod.imposto_tipo === '%' ? impostoBase * (custoMod.imposto_valor / 100) : custoMod.imposto_valor * qty;
          custoMensalTotal += (custoMod.preco_fornecedor * qty) + impostoVal + (custoMod.taxa_boleto * qty) + (custoMod.despesas_adicionais * qty);
        }
      });
    }

    const lucro = receitaMensalTotal - custoMensalTotal;
    const margem = receitaMensalTotal > 0 ? (lucro / receitaMensalTotal) * 100 : 0;
    const markup = custoMensalTotal > 0 ? (lucro / custoMensalTotal) * 100 : 0;
    setRentabilidadeConsolidada({ receitaMensal: receitaMensalTotal, custoMensal: custoMensalTotal, lucro, margem, markup });
  }

  async function openHistorico(c: Cliente) {
    setClienteHistorico(c);
    setHistoricoOpen(true);
    setLoadingHistorico(true);
    setRentabilidadeConsolidada(null);
    setMargemIdealHistorico(null);
    const [{ data: cData }, { data: pData }] = await Promise.all([
      supabase.from("contratos").select("*").eq("cliente_id", c.id).order("created_at", { ascending: false }),
      supabase.from("pedidos")
        .select("id, tipo_pedido, status_pedido, financeiro_status, valor_implantacao_final, valor_mensalidade_final, valor_total, created_at, modulos_adicionais, plano_id, contrato_id, planos(nome)")
        .eq("cliente_id", c.id)
        .order("created_at", { ascending: false }),
    ]);
    const contratos = (cData || []) as any[];
    const pedidos = (pData || []) as PedidoHistorico[];
    setContratosList(contratos as unknown as Contrato[]);
    setPedidosHistorico(pedidos);

    if (podeVerRentabilidade) {
      try {
        await calcularRentabilidadeConsolidada(contratos, pedidos, c.filial_id);
      } catch (e) {
        console.error("Erro ao calcular rentabilidade:", e);
      }
    }
    setLoadingHistorico(false);
  }

  // ── Toggle ativo ───────────────────────────────────────────────────────
  async function toggleAtivo(c: Cliente) {
    const { error } = await supabase.from("clientes").update({ ativo: !c.ativo }).eq("id", c.id);
    if (error) { return false; }
    setClientes((prev) => prev.map((x) => x.id === c.id ? { ...x, ativo: !x.ativo } : x));
    return true;
  }

  return {
    // Auth / permissions
    isAdmin, roles, profile,
    crudIncluir, crudEditar, crudExcluir,
    canEditExisting, vendedorSomenteLeitura,
    podeImportar, podeVerHistorico, podeVerRentabilidade,
    // Filial helpers
    filiaisDoUsuario, filialPadraoId, isGlobal,
    // Data
    clientes, setClientes, decisoresMap, filiais, loading,
    // Filters
    search, setSearch,
    filtroFilialId, setFiltroFilialId,
    currentPage, setCurrentPage,
    // Computed
    filtered, filialNome,
    // Historico
    historicoOpen, setHistoricoOpen,
    clienteHistorico, contratosList, pedidosHistorico,
    loadingHistorico, rentabilidadeConsolidada,
    margemIdealHistorico,
    // Actions
    fetchData, fetchContatos, openHistorico, toggleAtivo,
  };
}
