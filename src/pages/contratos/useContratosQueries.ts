import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/context/AuthContext";
import { useUserFiliais } from "@/hooks/useUserFiliais";
import { useCrudPermissions } from "@/hooks/useCrudPermissions";
import { Filial } from "@/lib/supabase-types";
import type { Contrato } from "./types";
import { toast } from "sonner";

// ─── Hook: camada de dados e filtros do módulo Contratos ─────────────────

export function useContratosQueries() {
  const { isAdmin, roles, profile } = useAuth();
  const isFinanceiro = roles.includes("financeiro");
  const { canIncluir: crudIncluir, canEditar: crudEditar, canExcluir: crudExcluir } = useCrudPermissions("contratos", roles);
  const canManage = crudEditar || crudIncluir;
  const { filiaisDoUsuario, filialPadraoId, isGlobal, todasFiliais } = useUserFiliais();

  // ── Data states ────────────────────────────────────────────────────────
  const [contratos, setContratos] = useState<Contrato[]>([]);
  const [filiais, setFiliais] = useState<Filial[]>([]);
  const [filialParametros, setFilialParametros] = useState<Record<string, any>>({});
  const [profilesMap, setProfilesMap] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(true);

  // ── Contatos do cliente selecionado ────────────────────────────────────
  const [contatosCliente, setContatosCliente] = useState<{ nome: string; telefone: string | null; decisor: boolean; ativo: boolean }[]>([]);
  const [linkedMessageTemplate, setLinkedMessageTemplate] = useState<{ conteudo: string } | null>(null);

  // ── Permissões especiais do usuário ────────────────────────────────────
  const [userPermissions, setUserPermissions] = useState<string[]>([]);

  useEffect(() => {
    async function loadPerms() {
      if (!profile?.user_id) return;
      const { data: userRoles } = await supabase.from("user_roles").select("role").eq("user_id", profile.user_id);
      if (!userRoles || userRoles.length === 0) return;
      const roleNames = userRoles.map(r => r.role);
      const { data } = await supabase.from("role_permissions").select("permissao, ativo").in("role", roleNames).eq("ativo", true);
      setUserPermissions((data || []).map(p => p.permissao));
    }
    loadPerms();
  }, [profile?.user_id]);

  const podeCadastroRetroativo = userPermissions.includes("acao.cadastro_retroativo");
  const podeRegerarContrato = userPermissions.includes("acao.regerar_contrato");

  // ── Filter states ──────────────────────────────────────────────────────
  const [filterFilial, setFilterFilial] = useState("_init_");
  const [filterStatus, setFilterStatus] = useState("all");
  const [filterDe, setFilterDe] = useState("");
  const [filterAte, setFilterAte] = useState("");
  const [filterBusca, setFilterBusca] = useState("");
  const [currentPage, setCurrentPage] = useState(1);

  // ── Load principal ─────────────────────────────────────────────────────
  async function loadData() {
    setLoading(true);
    const [{ data: contratosData, error: contratosError }, { data: filiaisData }, { data: paramsData }, { data: profilesData }] = await Promise.all([
      supabase
        .from("contratos")
        .select(`
          *,
          clientes(nome_fantasia, filial_id, razao_social, cnpj_cpf, inscricao_estadual, cidade, uf, cep, logradouro, numero, complemento, bairro, telefone, email, apelido, responsavel_nome),
          planos(nome, descricao, valor_mensalidade_padrao),
          pedidos(
            status_pedido, contrato_liberado, financeiro_status,
            valor_implantacao_final, valor_mensalidade_final,
            valor_implantacao_original, valor_mensalidade_original,
            valor_total, desconto_implantacao_tipo, desconto_implantacao_valor,
            desconto_mensalidade_tipo, desconto_mensalidade_valor,
            modulos_adicionais, observacoes, motivo_desconto,
            pagamento_mensalidade_observacao, pagamento_mensalidade_forma,
            pagamento_mensalidade_parcelas, pagamento_implantacao_observacao,
            pagamento_implantacao_forma, pagamento_implantacao_parcelas,
            filial_id, vendedor_id, tipo_pedido, servicos_pedido, tipo_atendimento
          )
        `)
        .order("numero_registro", { ascending: false }),
      supabase.from("filiais").select("*").eq("ativa", true).order("nome"),
      supabase.from("filial_parametros").select("*"),
      supabase.from("profiles").select("user_id, full_name").eq("active", true),
    ]);
    if (contratosError) {
      toast.error("Erro ao carregar contratos: " + contratosError.message);
    }
    setContratos((contratosData || []) as unknown as Contrato[]);
    setFiliais((filiaisData || []) as Filial[]);
    const paramsMap: Record<string, any> = {};
    (paramsData || []).forEach((p: any) => { paramsMap[p.filial_id] = p; });
    setFilialParametros(paramsMap);
    const pMap: Record<string, string> = {};
    (profilesData || []).forEach((p: any) => { pMap[p.user_id] = p.full_name; });
    setProfilesMap(pMap);
    setLoading(false);
  }

  // Initial load
  useEffect(() => { loadData(); }, []);

  // Default filial filter
  useEffect(() => {
    if (filterFilial === "_init_") {
      if (profile?.filial_favorita_id) {
        setFilterFilial(profile.filial_favorita_id);
      } else {
        setFilterFilial("all");
      }
    }
  }, [filialPadraoId, profile?.filial_favorita_id]);

  // Reset page when filters change
  useEffect(() => { setCurrentPage(1); }, [filterFilial, filterStatus, filterDe, filterAte, filterBusca]);

  // ── Load contatos do cliente ───────────────────────────────────────────
  async function loadContatosCliente(clienteId: string) {
    const { data } = await supabase
      .from("cliente_contatos")
      .select("nome, telefone, decisor, ativo")
      .eq("cliente_id", clienteId)
      .eq("ativo", true);
    setContatosCliente((data || []) as { nome: string; telefone: string | null; decisor: boolean; ativo: boolean }[]);
  }

  // ── Abrir detalhe (carrega contatos + template vinculado) ──────────────
  async function loadDetailData(contrato: Contrato) {
    setLinkedMessageTemplate(null);
    if (contrato.cliente_id) loadContatosCliente(contrato.cliente_id);
    const tipoTemplate = contrato.tipo === "OA" ? "ORDEM_ATENDIMENTO"
      : contrato.tipo === "Aditivo"
        ? (contrato.pedidos?.tipo_pedido === "Upgrade" ? "ADITIVO_UPGRADE" : "ADITIVO_MODULO")
        : contrato.tipo === "Cancelamento" ? "CANCELAMENTO"
        : "CONTRATO_BASE";
    try {
      const { data: docTemplate } = await supabase
        .from("document_templates")
        .select("message_template_id")
        .eq("tipo", tipoTemplate)
        .eq("ativo", true)
        .not("message_template_id", "is", null)
        .limit(1)
        .maybeSingle();
      if (docTemplate?.message_template_id) {
        const { data: msgTemplate } = await supabase
          .from("message_templates")
          .select("conteudo")
          .eq("id", docTemplate.message_template_id)
          .single();
        if (msgTemplate) setLinkedMessageTemplate(msgTemplate);
      }
    } catch { /* fallback */ }
  }

  // ── Filtro computado ───────────────────────────────────────────────────
  const filtered = contratos.filter((c) => {
    if (filterFilial !== "all" && filterFilial !== "_init_" && c.clientes?.filial_id !== filterFilial) return false;
    if (filterStatus !== "all" && c.status !== filterStatus) return false;
    if (filterDe && c.created_at < filterDe) return false;
    if (filterAte && c.created_at > filterAte + "T23:59:59") return false;
    if (filterBusca.trim()) {
      const q = filterBusca.trim().toLowerCase();
      const nome = (c.clientes?.nome_fantasia || "").toLowerCase();
      const razao = (c.clientes?.razao_social || "").toLowerCase();
      const apelido = ((c.clientes as any)?.apelido || "").toLowerCase();
      const cnpj = (c.clientes?.cnpj_cpf || "").toLowerCase().replace(/\D/g, "");
      const qNum = q.replace(/\D/g, "");
      const numero = (c.numero_exibicao || "").toLowerCase();
      if (
        !nome.includes(q) &&
        !razao.includes(q) &&
        !apelido.includes(q) &&
        !numero.includes(q) &&
        !(qNum && cnpj.includes(qNum))
      ) return false;
    }
    return true;
  });

  const ativos = filtered.filter((c) => c.status === "Ativo").length;

  return {
    // Auth / permissions
    isAdmin, roles, profile, isFinanceiro,
    canManage, crudIncluir, crudEditar, crudExcluir,
    podeCadastroRetroativo, podeRegerarContrato,
    // Filial helpers
    filiaisDoUsuario, filialPadraoId, isGlobal, todasFiliais,
    // Data
    contratos, setContratos,
    filiais, filialParametros, profilesMap,
    contatosCliente, setContatosCliente,
    linkedMessageTemplate, setLinkedMessageTemplate,
    loading,
    // Filters
    filterFilial, setFilterFilial,
    filterStatus, setFilterStatus,
    filterDe, setFilterDe,
    filterAte, setFilterAte,
    filterBusca, setFilterBusca,
    currentPage, setCurrentPage,
    // Computed
    filtered, ativos,
    // Actions
    loadData,
    loadContatosCliente,
    loadDetailData,
  };
}
