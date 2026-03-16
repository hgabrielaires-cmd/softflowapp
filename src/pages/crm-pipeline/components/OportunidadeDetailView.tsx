import { useState, useEffect, useCallback, useRef } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Command, CommandInput, CommandList, CommandEmpty, CommandItem } from "@/components/ui/command";
import { ArrowLeft, Check, X, ChevronsUpDown, Plus, Trash2, ListChecks, Package, FolderOpen, Star, Phone, Mail, Pencil, Loader2, Clock, RotateCcw } from "lucide-react";
import { cn } from "@/lib/utils";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { OportunidadeComentarios } from "./OportunidadeComentarios";
import { formatPhoneDisplay, applyPhoneMask } from "@/lib/utils";
import { OportunidadeTarefas } from "./OportunidadeTarefas";
import { OportunidadeProdutos } from "./OportunidadeProdutos";
import { OportunidadeTimeline } from "./OportunidadeTimeline";
import { ContatoOportunidadeDialog } from "./ContatoOportunidadeDialog";
import { NegocioPerdidoDialog } from "./NegocioPerdidoDialog";
import { GanhoClienteDrawer } from "./GanhoClienteDrawer";
import { GanhoPedidoDrawer } from "./GanhoPedidoDrawer";
import type { CrmOportunidade, CrmEtapaSimples } from "../types";
import type { CrmCampoPersonalizado } from "@/pages/crm-parametros/types";

const CAMPOS_EXCLUIDOS = ["sistema anterior", "tipo de atendimento"];

interface ContatoLocal {
  id?: string;
  nome: string;
  telefone: string;
  cargo_id: string;
  email: string;
}

interface Props {
  oportunidade: CrmOportunidade;
  etapas: CrmEtapaSimples[];
  clientes: { id: string; nome_fantasia: string }[];
  responsaveis: { id: string; user_id: string; full_name: string }[];
  onBack: () => void;
  exibeCliente?: boolean;
  camposPersonalizados?: CrmCampoPersonalizado[];
  segmentos?: { id: string; nome: string }[];
  cargos?: { id: string; nome: string }[];
  defaultTab?: string;
  funilId?: string;
}

const emptyContato = (): ContatoLocal => ({ nome: "", telefone: "", cargo_id: "", email: "" });

export function OportunidadeDetailView({
  oportunidade, etapas, clientes, responsaveis, onBack,
  exibeCliente = true, camposPersonalizados = [], segmentos = [], cargos = [],
  defaultTab, funilId,
}: Props) {
  const queryClient = useQueryClient();
  const [titulo, setTitulo] = useState(oportunidade.titulo);
  const [localStatus, setLocalStatus] = useState(oportunidade.status || "em_andamento");
  const [clienteId, setClienteId] = useState(oportunidade.cliente_id || "");
  const [responsavelId, setResponsavelId] = useState(oportunidade.responsavel_id || "");
  const [etapaId, setEtapaId] = useState(oportunidade.etapa_id);
  const [segmentoIds, setSegmentoIds] = useState<string[]>(oportunidade.segmento_ids || []);
  const [camposValues, setCamposValues] = useState<Record<string, string>>(oportunidade.campos_personalizados || {});
  const [segmentoPopoverOpen, setSegmentoPopoverOpen] = useState(false);
  const [contatos, setContatos] = useState<ContatoLocal[]>([]);
  const [contatoDialogOpen, setContatoDialogOpen] = useState(false);
  const [contatoEditIdx, setContatoEditIdx] = useState<number | null>(null);
  const [classificacao, setClassificacao] = useState(oportunidade.classificacao || 0);
  const [savingField, setSavingField] = useState<string | null>(null);
  const [savingContatos, setSavingContatos] = useState(false);
  const [perdidoDialogOpen, setPerdidoDialogOpen] = useState(false);
  const [ganhoStep, setGanhoStep] = useState<"idle" | "cliente" | "pedido">("idle");
  const [ganhoClienteId, setGanhoClienteId] = useState<string | null>(null);
  const [ganhoClienteNome, setGanhoClienteNome] = useState("");
  const debounceRef = useRef<ReturnType<typeof setTimeout>>();

  // Fetch linked pedido
  const { data: pedidoVinculado } = useQuery({
    queryKey: ["crm_pedido_vinculado", oportunidade.id],
    queryFn: async () => {
      const { data } = await supabase
        .from("crm_oportunidades")
        .select("pedido_id")
        .eq("id", oportunidade.id)
        .single();
      if (!data?.pedido_id) return null;
      const { data: pedido } = await supabase
        .from("pedidos")
        .select("id, numero_exibicao, status_pedido")
        .eq("id", data.pedido_id)
        .single();
      return pedido || null;
    },
  });

  const activeCampos = camposPersonalizados.filter(
    c => c.ativo && !CAMPOS_EXCLUIDOS.includes(c.nome.toLowerCase())
  );

  const currentEtapa = etapas.find(e => e.id === etapaId);

  const formatCurrency = (v: number) =>
    v.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });

  const invalidate = useCallback(() => {
    queryClient.invalidateQueries({ queryKey: ["crm_oportunidades", funilId] });
  }, [queryClient, funilId]);

  const { data: produtosTotais } = useQuery({
    queryKey: ["crm-produtos-totais", oportunidade.id],
    queryFn: async () => {
      const [{ data: items }, { data: oport }] = await Promise.all([
        supabase
          .from("crm_oportunidade_produtos")
          .select("valor_implantacao, valor_mensalidade, quantidade")
          .eq("oportunidade_id", oportunidade.id),
        supabase
          .from("crm_oportunidades")
          .select("desconto_implantacao, desconto_implantacao_tipo, desconto_mensalidade, desconto_mensalidade_tipo")
          .eq("id", oportunidade.id)
          .single(),
      ]);
      if (!items) return { implantacao: 0, mensalidade: 0 };
      const totalImpl = items.reduce((s, i) => s + (i.valor_implantacao || 0) * (i.quantidade || 1), 0);
      const totalMens = items.reduce((s, i) => s + (i.valor_mensalidade || 0) * (i.quantidade || 1), 0);
      const di = oport?.desconto_implantacao || 0;
      const dit = oport?.desconto_implantacao_tipo || "R$";
      const dm = oport?.desconto_mensalidade || 0;
      const dmt = oport?.desconto_mensalidade_tipo || "R$";
      const descImpl = dit === "%" ? totalImpl * di / 100 : di;
      const descMens = dmt === "%" ? totalMens * dm / 100 : dm;
      return {
        implantacao: Math.max(0, totalImpl - descImpl),
        mensalidade: Math.max(0, totalMens - descMens),
      };
    },
  });

  const { data: motivosPerda = [] } = useQuery({
    queryKey: ["crm_motivos_perda_dialog"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("crm_motivos_perda")
        .select("id, nome")
        .eq("ativo", true)
        .order("ordem");
      if (error) throw error;
      return (data || []) as { id: string; nome: string }[];
    },
  });

  // ─── Auto-save: update oportunidade fields directly ───
  const saveField = useCallback(async (fields: Record<string, unknown>, fieldLabel?: string) => {
    setSavingField(fieldLabel || "campo");
    const { error } = await supabase
      .from("crm_oportunidades")
      .update(fields)
      .eq("id", oportunidade.id);
    setSavingField(null);
    if (error) {
      toast.error("Erro ao salvar: " + error.message);
    } else {
      invalidate();
    }
  }, [oportunidade.id, invalidate]);

  // Debounced save for text inputs
  const debouncedSave = useCallback((fields: Record<string, unknown>, fieldLabel?: string) => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => saveField(fields, fieldLabel), 800);
  }, [saveField]);

  // Cleanup debounce on unmount
  useEffect(() => {
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, []);

  // ─── Contacts: load from DB ───
  const loadContatos = useCallback(async () => {
    const { data } = await supabase
      .from("crm_oportunidade_contatos")
      .select("id, nome, telefone, cargo_id, email")
      .eq("oportunidade_id", oportunidade.id)
      .order("created_at");
    if (data && data.length > 0) {
      setContatos(data.map(c => ({
        id: c.id, nome: c.nome, telefone: c.telefone,
        cargo_id: c.cargo_id || "", email: c.email || "",
      })));
    } else {
      setContatos([emptyContato()]);
    }
  }, [oportunidade.id]);

  useEffect(() => { loadContatos(); }, [loadContatos]);

  // ─── Contacts: save all to DB ───
  const persistContatos = useCallback(async (newContatos: ContatoLocal[]) => {
    const validContatos = newContatos.filter(c => c.nome.trim() && c.telefone.trim());
    if (validContatos.length === 0) return;

    setSavingContatos(true);
    // Delete all, re-insert
    await supabase.from("crm_oportunidade_contatos").delete().eq("oportunidade_id", oportunidade.id);
    const rows = validContatos.map(c => ({
      oportunidade_id: oportunidade.id,
      nome: c.nome,
      telefone: c.telefone,
      cargo_id: c.cargo_id || null,
      email: c.email || null,
    }));
    const { error } = await supabase.from("crm_oportunidade_contatos").insert(rows);
    setSavingContatos(false);
    if (error) {
      toast.error("Erro ao salvar contatos: " + error.message);
    } else {
      toast.success("Contatos salvos!");
      await loadContatos(); // reload to get IDs
      invalidate();
    }
  }, [oportunidade.id, loadContatos, invalidate]);

  const addContato = () => {
    setContatoEditIdx(null);
    setContatoDialogOpen(true);
  };
  const editContato = (idx: number) => {
    setContatoEditIdx(idx);
    setContatoDialogOpen(true);
  };
  const handleContatoDialogSave = async (data: ContatoLocal) => {
    let newContatos: ContatoLocal[];
    if (contatoEditIdx !== null) {
      newContatos = contatos.map((c, i) => i === contatoEditIdx ? data : c);
    } else {
      const hasOnlyEmptyPlaceholder = contatos.length === 1 && !contatos[0].nome.trim() && !contatos[0].telefone.trim();
      newContatos = hasOnlyEmptyPlaceholder ? [data] : [...contatos, data];
    }
    setContatos(newContatos);
    await persistContatos(newContatos);
  };
  const removeContato = async (index: number) => {
    if (contatos.length <= 1) return;
    const newContatos = contatos.filter((_, i) => i !== index);
    setContatos(newContatos);
    await persistContatos(newContatos);
  };

  // ─── Field change handlers with auto-save ───
  const handleTituloBlur = () => {
    if (titulo.trim() && titulo.trim() !== oportunidade.titulo) {
      saveField({ titulo: titulo.trim() }, "titulo");
    }
  };
  const handleTituloChange = (val: string) => {
    setTitulo(val);
    if (val.trim() && val.trim() !== oportunidade.titulo) {
      debouncedSave({ titulo: val.trim() }, "titulo");
    }
  };

  const handleEtapaChange = (val: string) => {
    setEtapaId(val);
    saveField({ etapa_id: val }, "etapa");
  };
  const handleResponsavelChange = (val: string) => {
    const v = val === "__none__" ? "" : val;
    setResponsavelId(v);
    saveField({ responsavel_id: v || null }, "responsável");
  };
  const handleClienteChange = (val: string) => {
    const v = val === "__none__" ? "" : val;
    setClienteId(v);
    saveField({ cliente_id: v || null }, "cliente");
  };
  const handleClassificacao = (i: number) => {
    const newVal = i === classificacao ? 0 : i;
    setClassificacao(newVal);
    saveField({ classificacao: newVal }, "classificação");
  };

  const handleToggleSegmento = (id: string) => {
    const newIds = segmentoIds.includes(id) ? segmentoIds.filter(s => s !== id) : [...segmentoIds, id];
    setSegmentoIds(newIds);
    saveField({ segmento_ids: newIds }, "segmento");
  };
  const handleRemoveSegmento = (id: string) => {
    const newIds = segmentoIds.filter(s => s !== id);
    setSegmentoIds(newIds);
    saveField({ segmento_ids: newIds }, "segmento");
  };

  const handleCampoChange = (campoId: string, value: string) => {
    const newValues = { ...camposValues, [campoId]: value };
    setCamposValues(newValues);
    debouncedSave({ campos_personalizados: newValues }, "campo");
  };
  const handleCampoSelectChange = (campoId: string, value: string) => {
    const v = value === "__none__" ? "" : value;
    const newValues = { ...camposValues, [campoId]: v };
    setCamposValues(newValues);
    saveField({ campos_personalizados: newValues }, "campo");
  };

  const getSegmentoNome = (id: string) => segmentos.find(s => s.id === id)?.nome || id;

  const isSaving = !!savingField || savingContatos;

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="flex items-center gap-3 px-4 py-3 border-b bg-background">
        <Button variant="ghost" size="icon" className="h-8 w-8 shrink-0" onClick={onBack}>
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <div className="flex items-center gap-2 flex-1 min-w-0">
          {currentEtapa && (
            <div className="h-3 w-3 rounded-full shrink-0" style={{ backgroundColor: currentEtapa.cor }} />
          )}
          <h2 className="text-base font-bold truncate">{titulo || oportunidade.titulo}</h2>
          {currentEtapa && (
            <Badge variant="outline" className="text-[10px] shrink-0">{currentEtapa.nome}</Badge>
          )}
          {/* Classificação estrelas */}
          <div className="flex items-center gap-0.5 shrink-0">
            {[1, 2, 3, 4, 5].map(i => (
              <button key={i} type="button" onClick={() => handleClassificacao(i)} className="focus:outline-none">
                <Star className={cn("h-4 w-4 transition-colors", i <= classificacao ? "text-primary fill-primary" : "text-muted-foreground/30")} />
              </button>
            ))}
          </div>
        </div>
        {/* Saving indicator + Action buttons */}
        <div className="flex items-center gap-2 shrink-0">
          {isSaving && (
            <div className="flex items-center gap-1.5 text-muted-foreground text-xs">
              <Loader2 className="h-3.5 w-3.5 animate-spin" />
              Salvando...
            </div>
          )}
          {(localStatus === "perdido" || localStatus === "ganho") ? (
            <Button
              variant="outline"
              size="sm"
              className="text-xs gap-1.5"
              onClick={async () => {
                const { data: { user } } = await supabase.auth.getUser();
                const statusAnterior = localStatus;
                await supabase.from("crm_oportunidades")
                  .update({ status: "em_andamento", motivo_perda: null, motivo_perda_id: null, concorrente: null, observacao_perda: null, data_perda: null, etapa_perda_id: null } as any)
                  .eq("id", oportunidade.id);
                await (supabase as any).from("crm_historico").insert({
                  oportunidade_id: oportunidade.id,
                  tipo: "revertido",
                  descricao: `Oportunidade revertida de "${statusAnterior === "perdido" ? "Perdido" : "Ganho"}" para Em Andamento`,
                  user_id: user?.id || null,
                });
                setLocalStatus("em_andamento");
                invalidate();
                queryClient.invalidateQueries({ queryKey: ["crm_timeline", oportunidade.id] });
                toast.success("Oportunidade revertida para Em Andamento! 🔄");
              }}
            >
              🔄 Reverter
            </Button>
          ) : (
            <>
              <Button
                variant="outline"
                size="sm"
                className="text-xs gap-1.5 border-destructive/50 text-destructive hover:bg-destructive hover:text-destructive-foreground"
                onClick={() => setPerdidoDialogOpen(true)}
              >
                😢 Negócio Perdido
              </Button>
              <Button
                size="sm"
                className="text-xs gap-1.5 bg-emerald-600 hover:bg-emerald-700 text-white"
                onClick={async () => {
                  const { data: { user } } = await supabase.auth.getUser();
                  await supabase.from("crm_tarefas").update({
                    concluido_em: new Date().toISOString(),
                    concluido_por: user?.id || null,
                  } as any).eq("oportunidade_id", oportunidade.id).is("concluido_em", null);
                  await (supabase as any).from("crm_historico").insert({
                    oportunidade_id: oportunidade.id,
                    tipo: "ganho",
                    descricao: `Negócio marcado como Ganho 🎉`,
                    user_id: user?.id || null,
                  });
                  await supabase.from("crm_oportunidades").update({ status: "ganho", data_fechamento: new Date().toISOString() } as any).eq("id", oportunidade.id);
                  setLocalStatus("ganho");
                  invalidate();
                  queryClient.invalidateQueries({ queryKey: ["crm_timeline", oportunidade.id] });
                  toast.success("Negócio ganho! 🎉🥳");
                  // Open cliente drawer (or pedido if client exists)
                  if (oportunidade.cliente_id) {
                    setGanhoClienteId(oportunidade.cliente_id);
                    setGanhoClienteNome(oportunidade.clientes?.nome_fantasia || oportunidade.titulo);
                    setGanhoStep("pedido");
                  } else {
                    setGanhoStep("cliente");
                  }
                }}
              >
                🥳 Negócio Ganho
              </Button>
            </>
          )}
        </div>
      </div>

      {/* Tabs */}
      <Tabs defaultValue={defaultTab || "geral"} className="flex-1 flex flex-col min-h-0">
        <div className="flex items-center justify-between mx-4 mt-2">
          <TabsList className="w-fit">
            <TabsTrigger value="geral">Geral</TabsTrigger>
            <TabsTrigger value="tarefas" className="gap-1"><ListChecks className="h-3.5 w-3.5" /> Tarefas</TabsTrigger>
            <TabsTrigger value="produtos" className="gap-1"><Package className="h-3.5 w-3.5" /> Produtos e Serviços</TabsTrigger>
            <TabsTrigger value="arquivos" className="gap-1"><FolderOpen className="h-3.5 w-3.5" /> Arquivos</TabsTrigger>
            <TabsTrigger value="timeline" className="gap-1"><Clock className="h-3.5 w-3.5" /> Linha do Tempo</TabsTrigger>
          </TabsList>
          <div className="flex items-center gap-4 pr-1">
            <div className="flex items-center gap-1.5" title="Valor Implantação (com desconto)">
              <span className="h-3 w-3 rounded-full bg-purple-500 shrink-0" />
              <span className="text-sm font-semibold">{formatCurrency(produtosTotais?.implantacao ?? 0)}</span>
            </div>
            <div className="flex items-center gap-1.5" title="Valor Mensalidade (com desconto)">
              <span className="h-3 w-3 rounded-full bg-green-500 shrink-0" />
              <span className="text-sm font-semibold">{formatCurrency(produtosTotais?.mensalidade ?? 0)}</span>
            </div>
          </div>
        </div>

        {/* Geral */}
        <TabsContent value="geral" className="flex-1 overflow-y-auto px-4 pb-4 mt-0">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 pt-4">
            {/* Left: Form */}
            <div className="space-y-3">
              <div>
                <Label>Nome/Nome da Empresa *</Label>
                <Input
                  value={titulo}
                  onChange={(e) => handleTituloChange(e.target.value)}
                  onBlur={handleTituloBlur}
                  placeholder="Nome/Empresa"
                />
              </div>

              {/* Contatos */}
              <div className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <Label className="text-sm font-semibold">Contatos *</Label>
                  <div className="flex items-center gap-1">
                    {savingContatos && <Loader2 className="h-3 w-3 animate-spin text-muted-foreground" />}
                    <Button type="button" variant="ghost" size="sm" className="h-7 text-xs gap-1" onClick={addContato}>
                      <Plus className="h-3 w-3" /> Adicionar
                    </Button>
                  </div>
                </div>
                <div className="rounded-lg border border-border divide-y divide-border">
                  {contatos.map((contato, idx) => {
                    const cargoNome = cargos.find(c => c.id === contato.cargo_id)?.nome;
                    const isEmpty = !contato.nome.trim() && !contato.telefone.trim();
                    if (isEmpty) return null;
                    return (
                      <div key={contato.id || idx} className="flex items-start gap-3 px-4 py-3">
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2">
                            <p className="text-sm font-medium">{contato.nome || "Sem nome"}</p>
                          </div>
                          {cargoNome && <p className="text-xs text-muted-foreground">{cargoNome}</p>}
                          <div className="flex gap-3 mt-1">
                            {contato.telefone && (
                              <span className="text-xs text-muted-foreground flex items-center gap-1">
                                <Phone className="h-3 w-3" />{formatPhoneDisplay(contato.telefone)}
                              </span>
                            )}
                            {contato.email && (
                              <span className="text-xs text-muted-foreground flex items-center gap-1">
                                <Mail className="h-3 w-3" />{contato.email}
                              </span>
                            )}
                          </div>
                        </div>
                        <div className="flex items-center gap-1 shrink-0">
                          <Button type="button" variant="ghost" size="icon" className="h-7 w-7" onClick={() => editContato(idx)} title="Editar contato">
                            <Pencil className="h-3.5 w-3.5 text-muted-foreground" />
                          </Button>
                          {contatos.filter(c => c.nome.trim()).length > 1 && (
                            <Button type="button" variant="ghost" size="icon" className="h-7 w-7 text-destructive hover:text-destructive" onClick={() => removeContato(idx)} title="Remover contato">
                              <Trash2 className="h-3.5 w-3.5" />
                            </Button>
                          )}
                        </div>
                      </div>
                    );
                  })}
                  {contatos.every(c => !c.nome.trim()) && (
                    <div className="px-4 py-3 text-sm text-muted-foreground text-center">
                      Nenhum contato. Clique em "Adicionar".
                    </div>
                  )}
                </div>
              </div>

              <ContatoOportunidadeDialog
                open={contatoDialogOpen}
                onOpenChange={setContatoDialogOpen}
                contato={contatoEditIdx !== null ? contatos[contatoEditIdx] : null}
                cargos={cargos}
                onSave={handleContatoDialogSave}
              />

              {/* Etapa + Responsável lado a lado */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label>Etapa</Label>
                  <Select value={etapaId} onValueChange={handleEtapaChange}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {etapas.map((e) => (<SelectItem key={e.id} value={e.id}>{e.nome}</SelectItem>))}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label>Responsável</Label>
                  <Select value={responsavelId || "__none__"} onValueChange={handleResponsavelChange}>
                    <SelectTrigger><SelectValue placeholder="Selecione..." /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="__none__">Nenhum</SelectItem>
                      {responsaveis.map((r) => (<SelectItem key={r.user_id} value={r.user_id}>{r.full_name}</SelectItem>))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              {/* Cliente + Segmento lado a lado */}
              <div className={cn("grid gap-3", exibeCliente ? "grid-cols-2" : "grid-cols-1")}>
                {exibeCliente && (
                  <div>
                    <Label>Cliente</Label>
                    <Select value={clienteId || "__none__"} onValueChange={handleClienteChange}>
                      <SelectTrigger><SelectValue placeholder="Selecione..." /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="__none__">Nenhum</SelectItem>
                        {clientes.map((c) => (<SelectItem key={c.id} value={c.id}>{c.nome_fantasia}</SelectItem>))}
                      </SelectContent>
                    </Select>
                  </div>
                )}
                <div>
                  <Label>Segmento *</Label>
                  <Popover open={segmentoPopoverOpen} onOpenChange={setSegmentoPopoverOpen}>
                    <PopoverTrigger asChild>
                      <Button variant="outline" role="combobox" aria-expanded={segmentoPopoverOpen} className="w-full justify-between font-normal h-auto min-h-10">
                        {segmentoIds.length === 0 ? (
                          <span className="text-muted-foreground">Buscar segmento...</span>
                        ) : (
                          <div className="flex flex-wrap gap-1">
                            {segmentoIds.map(id => (
                              <Badge key={id} variant="secondary" className="text-xs gap-1">
                                {getSegmentoNome(id)}
                                <button type="button" className="ml-0.5 hover:text-destructive" onClick={(e) => { e.stopPropagation(); handleRemoveSegmento(id); }}>
                                  <X className="h-3 w-3" />
                                </button>
                              </Badge>
                            ))}
                          </div>
                        )}
                        <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-[--radix-popover-trigger-width] p-0" align="start">
                      <Command>
                        <CommandInput placeholder="Digitar para buscar..." />
                        <CommandList>
                          <CommandEmpty>Nenhum segmento encontrado</CommandEmpty>
                          {segmentos.map((s) => (
                            <CommandItem key={s.id} value={s.nome} onSelect={() => handleToggleSegmento(s.id)}>
                              <Check className={cn("mr-2 h-4 w-4", segmentoIds.includes(s.id) ? "opacity-100" : "opacity-0")} />
                              {s.nome}
                            </CommandItem>
                          ))}
                        </CommandList>
                      </Command>
                    </PopoverContent>
                  </Popover>
                </div>
              </div>

              {/* Campos Personalizados em grid de 2 colunas */}
              {activeCampos.length > 0 && (
                <div className="grid grid-cols-2 gap-3">
                  {activeCampos.map((campo) => (
                    <div key={campo.id}>
                      <Label>{campo.nome}{campo.obrigatorio ? " *" : ""}</Label>
                      {campo.tipo === "select" ? (
                        <Select value={camposValues[campo.id] || "__none__"} onValueChange={(v) => handleCampoSelectChange(campo.id, v)}>
                          <SelectTrigger><SelectValue placeholder="Selecione..." /></SelectTrigger>
                          <SelectContent>
                            <SelectItem value="__none__">Nenhum</SelectItem>
                            {campo.opcoes.map((opcao) => (<SelectItem key={opcao} value={opcao}>{opcao}</SelectItem>))}
                          </SelectContent>
                        </Select>
                      ) : (
                        <Input
                          value={camposValues[campo.id] || ""}
                          onChange={(e) => handleCampoChange(campo.id, e.target.value)}
                          placeholder={campo.nome}
                        />
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Right: Comunicação */}
            <div>
              <OportunidadeComentarios oportunidadeId={oportunidade.id} />
            </div>
          </div>
        </TabsContent>

        {/* Tarefas */}
        <TabsContent value="tarefas" className="flex-1 overflow-y-auto px-4 pb-4 mt-0">
          <OportunidadeTarefas
            oportunidadeId={oportunidade.id}
            tiposAtendimento={
              (camposPersonalizados.find(c => c.nome.toLowerCase() === "tipo de atendimento")?.opcoes || []) as string[]
            }
            canais={
              (camposPersonalizados.find(c => c.nome.toLowerCase() === "canal")?.opcoes || []) as string[]
            }
            onNegocioPerdido={() => setPerdidoDialogOpen(true)}
            onNegocioGanho={async () => {
              const { data: { user } } = await supabase.auth.getUser();
              await supabase.from("crm_tarefas").update({
                concluido_em: new Date().toISOString(),
                concluido_por: user?.id || null,
              } as any).eq("oportunidade_id", oportunidade.id).is("concluido_em", null);
              await (supabase as any).from("crm_historico").insert({
                oportunidade_id: oportunidade.id,
                tipo: "ganho",
                descricao: `Negócio marcado como Ganho 🎉`,
                user_id: user?.id || null,
              });
              await supabase.from("crm_oportunidades").update({ status: "ganho", data_fechamento: new Date().toISOString() } as any).eq("id", oportunidade.id);
              setLocalStatus("ganho");
              invalidate();
              queryClient.invalidateQueries({ queryKey: ["crm_timeline", oportunidade.id] });
              toast.success("Negócio ganho! 🎉🥳");
              if (oportunidade.cliente_id) {
                setGanhoClienteId(oportunidade.cliente_id);
                setGanhoClienteNome(oportunidade.clientes?.nome_fantasia || oportunidade.titulo);
                setGanhoStep("pedido");
              } else {
                setGanhoStep("cliente");
              }
            }}
          />
        </TabsContent>

        {/* Produtos e Serviços */}
        <TabsContent value="produtos" className="flex-1 overflow-y-auto px-4 pb-4 mt-0">
          <OportunidadeProdutos oportunidadeId={oportunidade.id} titulo={oportunidade.titulo} />
        </TabsContent>

        {/* Arquivos */}
        <TabsContent value="arquivos" className="flex-1 overflow-y-auto px-4 pb-4 mt-0">
          <div className="flex items-center justify-center h-64 text-muted-foreground">
            <div className="text-center space-y-2">
              <FolderOpen className="h-10 w-10 mx-auto opacity-40" />
              <p className="text-sm">Em breve: Arquivos da oportunidade.</p>
            </div>
          </div>
        </TabsContent>

        {/* Linha do Tempo */}
        <TabsContent value="timeline" className="flex-1 overflow-y-auto px-4 pb-4 mt-0">
          <OportunidadeTimeline oportunidadeId={oportunidade.id} />
        </TabsContent>
      </Tabs>

      {/* Pedido status card - shown when ganho */}
      {localStatus === "ganho" && (
        <div className="mx-4 mb-4">
          {pedidoVinculado ? (
            <div className="rounded-lg border border-emerald-200 bg-emerald-50 px-4 py-3 flex items-center justify-between">
              <div>
                <p className="text-sm font-semibold text-emerald-800">Pedido Vinculado: #{pedidoVinculado.numero_exibicao}</p>
                <Badge className={
                  pedidoVinculado.status_pedido === "Aprovado Financeiro" ? "bg-emerald-100 text-emerald-700" :
                  pedidoVinculado.status_pedido === "Aguardando Financeiro" ? "bg-blue-100 text-blue-700" :
                  pedidoVinculado.status_pedido === "Aguardando Aprovação de Desconto" ? "bg-amber-100 text-amber-700" :
                  pedidoVinculado.status_pedido === "Reprovado Financeiro" ? "bg-red-100 text-red-600" :
                  "bg-muted text-muted-foreground"
                }>{pedidoVinculado.status_pedido}</Badge>
              </div>
            </div>
          ) : (
            <div className="rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="text-amber-600">⚠️</span>
                <p className="text-sm font-medium text-amber-800">Pedido não criado</p>
              </div>
              <Button size="sm" variant="outline" className="gap-1 border-amber-300 text-amber-800 hover:bg-amber-100"
                onClick={() => {
                  if (oportunidade.cliente_id) {
                    setGanhoClienteId(oportunidade.cliente_id);
                    setGanhoClienteNome(oportunidade.clientes?.nome_fantasia || oportunidade.titulo);
                    setGanhoStep("pedido");
                  } else {
                    setGanhoStep("cliente");
                  }
                }}>
                <Plus className="h-3.5 w-3.5" /> Criar Pedido
              </Button>
            </div>
          )}
        </div>
      )}

      <NegocioPerdidoDialog
        open={perdidoDialogOpen}
        onOpenChange={setPerdidoDialogOpen}
        oportunidadeId={oportunidade.id}
        etapaNome={currentEtapa?.nome || "Desconhecida"}
        motivosPerda={motivosPerda}
        camposPersonalizados={oportunidade.campos_personalizados || {}}
        onSuccess={() => {
          setLocalStatus("perdido");
          invalidate();
          queryClient.invalidateQueries({ queryKey: ["crm_timeline", oportunidade.id] });
        }}
      />

      {/* Ganho Flow Drawers */}
      <GanhoClienteDrawer
        open={ganhoStep === "cliente"}
        onOpenChange={(open) => { if (!open) setGanhoStep("idle"); }}
        oportunidadeId={oportunidade.id}
        oportunidadeTitulo={oportunidade.titulo}
        editingClienteId={ganhoClienteId}
        onSaved={async (clienteId, clienteNome) => {
          // Link client to oportunidade
          await supabase.from("crm_oportunidades").update({ cliente_id: clienteId } as any).eq("id", oportunidade.id);
          const { data: { user } } = await supabase.auth.getUser();
          await (supabase as any).from("crm_historico").insert({
            oportunidade_id: oportunidade.id, tipo: "campo_alterado",
            descricao: `Cliente cadastrado: ${clienteNome}`, user_id: user?.id || null,
          });
          setGanhoClienteId(clienteId);
          setGanhoClienteNome(clienteNome);
          invalidate();
          queryClient.invalidateQueries({ queryKey: ["crm_timeline", oportunidade.id] });
          setGanhoStep("pedido");
        }}
      />

      <GanhoPedidoDrawer
        open={ganhoStep === "pedido"}
        onOpenChange={(open) => { if (!open) setGanhoStep("idle"); }}
        clienteId={ganhoClienteId || ""}
        clienteNome={ganhoClienteNome}
        onBack={() => setGanhoStep("cliente")}
        onSaved={async (pedidoId, pedidoNumero, pedidoStatus) => {
          await supabase.from("crm_oportunidades").update({ pedido_id: pedidoId } as any).eq("id", oportunidade.id);
          const { data: { user } } = await supabase.auth.getUser();
          await (supabase as any).from("crm_historico").insert({
            oportunidade_id: oportunidade.id, tipo: "campo_alterado",
            descricao: `Pedido criado: #${pedidoNumero} — ${pedidoStatus}`, user_id: user?.id || null,
          });
          setGanhoStep("idle");
          invalidate();
          queryClient.invalidateQueries({ queryKey: ["crm_timeline", oportunidade.id] });
          queryClient.invalidateQueries({ queryKey: ["crm_pedido_vinculado", oportunidade.id] });
          toast.success("Pedido criado com sucesso! 🎉");
        }}
      />
    </div>
  );
}
