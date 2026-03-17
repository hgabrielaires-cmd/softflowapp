// ─── Query hooks for Faturamento module ───────────────────────────────────

import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { format } from "date-fns";

import type {
  Fatura, NotaFiscal, ClienteOption, ContratoOption,
  PagamentoFormState,
} from "./types";
import { PAGE_SIZE } from "./constants";

// ═══════════════════════════════════════════════════════════════════════════════
// FATURAS
// ═══════════════════════════════════════════════════════════════════════════════

export function useFaturasQueries(filialFilter: string = "all") {
  const [faturas, setFaturas] = useState<Fatura[]>([]);
  const [loading, setLoading] = useState(true);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [tipoFilter, setTipoFilter] = useState("all");
  const [clientes, setClientes] = useState<ClienteOption[]>([]);
  const [contratos, setContratos] = useState<ContratoOption[]>([]);
  const [registrarPagamentoId, setRegistrarPagamentoId] = useState<string | null>(null);
  const [pagamentoForm, setPagamentoForm] = useState<PagamentoFormState>({ data_pagamento: "", forma_pagamento: "" });

  const loadFaturas = useCallback(async () => {
    setLoading(true);
    let query = supabase
      .from("faturas")
      .select("*, clientes(nome_fantasia), contratos(numero_exibicao)", { count: "exact" });

    if (filialFilter !== "all") query = query.eq("filial_id", filialFilter);
    if (statusFilter !== "all") query = query.eq("status", statusFilter);
    if (tipoFilter !== "all") query = query.eq("tipo", tipoFilter);
    if (search.trim()) {
      query = query.ilike("numero_fatura", `%${search.trim()}%`);
    }

    const from = (page - 1) * PAGE_SIZE;
    const to = from + PAGE_SIZE - 1;

    const { data, count, error } = await query
      .order("data_vencimento", { ascending: false })
      .range(from, to);

    if (error) toast.error("Erro ao carregar faturas: " + error.message);
    setFaturas((data || []) as unknown as Fatura[]);
    setTotal(count || 0);
    setLoading(false);
  }, [page, search, statusFilter, tipoFilter, filialFilter]);

  const loadClientes = useCallback(async () => {
    const { data } = await supabase
      .from("clientes")
      .select("id, nome_fantasia")
      .eq("ativo", true)
      .order("nome_fantasia")
      .limit(500);
    setClientes((data || []) as ClienteOption[]);
  }, []);

  const loadContratos = useCallback(async (clienteId: string) => {
    if (!clienteId) { setContratos([]); return; }
    const { data } = await supabase
      .from("contratos")
      .select("id, numero_exibicao")
      .eq("cliente_id", clienteId)
      .eq("status", "Ativo")
      .order("numero_exibicao");
    setContratos((data || []) as ContratoOption[]);
  }, []);

  useEffect(() => { loadFaturas(); }, [loadFaturas]);
  useEffect(() => { loadClientes(); }, [loadClientes]);

  async function handleRegistrarPagamento() {
    if (!registrarPagamentoId) return;
    if (!pagamentoForm.data_pagamento) { toast.error("Informe a data do pagamento"); return; }

    const { error } = await supabase.from("faturas").update({
      status: "Pago",
      data_pagamento: pagamentoForm.data_pagamento,
      forma_pagamento: pagamentoForm.forma_pagamento || null,
    }).eq("id", registrarPagamentoId);

    if (error) { toast.error("Erro: " + error.message); return; }
    toast.success("Pagamento registrado!");
    setRegistrarPagamentoId(null);
    loadFaturas();
  }

  function openRegistrarPagamento(faturaId: string, formaPagamento: string | null) {
    setRegistrarPagamentoId(faturaId);
    setPagamentoForm({
      data_pagamento: format(new Date(), "yyyy-MM-dd"),
      forma_pagamento: formaPagamento || "",
    });
  }

  const totalPages = Math.ceil(total / PAGE_SIZE);

  return {
    faturas,
    loading,
    total,
    totalPages,
    page, setPage,
    search, setSearch,
    statusFilter, setStatusFilter,
    tipoFilter, setTipoFilter,
    clientes,
    contratos, setContratos,
    loadContratos,
    loadFaturas,
    registrarPagamentoId, setRegistrarPagamentoId,
    pagamentoForm, setPagamentoForm,
    handleRegistrarPagamento,
    openRegistrarPagamento,
  };
}

// ═══════════════════════════════════════════════════════════════════════════════
// NOTAS FISCAIS
// ═══════════════════════════════════════════════════════════════════════════════

export function useNotasFiscaisQueries(filialFilter: string = "all") {
  const [notas, setNotas] = useState<NotaFiscal[]>([]);
  const [loading, setLoading] = useState(true);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState("");
  const [clientes, setClientes] = useState<ClienteOption[]>([]);
  const [faturasOptions, setFaturasOptions] = useState<{ id: string; numero_fatura: string }[]>([]);

  const loadNotas = useCallback(async () => {
    setLoading(true);
    let query = supabase
      .from("notas_fiscais")
      .select("*, clientes(nome_fantasia), faturas(numero_fatura)", { count: "exact" });

    if (filialFilter !== "all") query = query.eq("filial_id", filialFilter);
    if (search.trim()) {
      query = query.or(`numero_nf.ilike.%${search.trim()}%,clientes.nome_fantasia.ilike.%${search.trim()}%`);
    }

    const from = (page - 1) * PAGE_SIZE;
    const to = from + PAGE_SIZE - 1;

    const { data, count, error } = await query
      .order("data_emissao", { ascending: false })
      .range(from, to);

    if (error) toast.error("Erro ao carregar notas: " + error.message);
    setNotas((data || []) as unknown as NotaFiscal[]);
    setTotal(count || 0);
    setLoading(false);
  }, [page, search, filialFilter]);

  const loadClientes = useCallback(async () => {
    const { data } = await supabase.from("clientes").select("id, nome_fantasia").eq("ativo", true).order("nome_fantasia").limit(500);
    setClientes((data || []) as ClienteOption[]);
  }, []);

  const loadFaturasOptions = useCallback(async (clienteId: string) => {
    if (!clienteId) { setFaturasOptions([]); return; }
    const { data } = await supabase
      .from("faturas")
      .select("id, numero_fatura")
      .eq("cliente_id", clienteId)
      .order("numero_fatura", { ascending: false })
      .limit(50);
    setFaturasOptions((data || []) as { id: string; numero_fatura: string }[]);
  }, []);

  useEffect(() => { loadNotas(); }, [loadNotas]);
  useEffect(() => { loadClientes(); }, [loadClientes]);

  const totalPages = Math.ceil(total / PAGE_SIZE);

  return {
    notas,
    loading,
    total,
    totalPages,
    page, setPage,
    search, setSearch,
    clientes,
    faturasOptions, setFaturasOptions,
    loadFaturasOptions,
    loadNotas,
  };
}
