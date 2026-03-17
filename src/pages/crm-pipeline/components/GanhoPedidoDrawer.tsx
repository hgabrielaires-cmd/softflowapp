import { useState, useEffect, useCallback } from "react";
import { Sheet, SheetContent, SheetTitle, SheetDescription } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import { Loader2, Plus, XCircle, Tag, ArrowLeft, CheckCircle } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/context/AuthContext";
import { useUserFiliais } from "@/hooks/useUserFiliais";
import { usePedidosQueries } from "@/pages/pedidos/usePedidosQueries";
import { usePedidoSave } from "@/pages/pedidos/usePedidoSave";
import { fmtBRL, applyDesconto, applyAcrescimo, validatePedidoForm } from "@/pages/pedidos/helpers";
import type { FormState, ModuloAdicionadoItem } from "@/pages/pedidos/types";
import { emptyForm } from "@/pages/pedidos/constants";

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  clienteId: string;
  clienteNome: string;
  clienteFilialId?: string | null;
  observacoesOportunidade?: string | null;
  onBack: () => void;
  onSaved: (pedidoId: string, pedidoNumero: string, pedidoStatus: string) => void;
}

export function GanhoPedidoDrawer({ open, onOpenChange, clienteId, clienteNome, clienteFilialId, observacoesOportunidade, onBack, onSaved }: Props) {
  const { profile, isAdmin } = useAuth();
  const { filiaisDoUsuario, filialPadraoId, todasFiliais } = useUserFiliais();

  const {
    clientes, planos, filiais, vendedores, servicosCatalogo,
    planoSelecionado, setPlanoSelecionado, modulosDisponiveis, setModulosDisponiveis,
    precosFilialMap, loadingModulos, loadPlano: loadPlanoRaw,
    filialParametros, loadFilialParametros,
    contratoAtivo, setContratoAtivo, loadingContrato, buscarContratoAtivo,
    limiteDesconto, setLimiteDesconto, carregarLimitesDesconto,
    loadData,
  } = usePedidosQueries();
  const { savePedido } = usePedidoSave();

  const [form, setForm] = useState<FormState>(emptyForm);
  const [descontoAtivo, setDescontoAtivo] = useState(false);
  const [acrescimoAtivo, setAcrescimoAtivo] = useState(false);
  const [saving, setSaving] = useState(false);
  const [moduloBuscaId, setModuloBuscaId] = useState("");
  const [moduloBuscaQtd, setModuloBuscaQtd] = useState("1");

  // Initialize form on open
  useEffect(() => {
    if (!open || !clienteId) return;
    loadData();
    const defaultFilial = clienteFilialId || filialPadraoId || profile?.filial_id || "";
    const defaultVendedor = profile?.user_id || "";
    const defaultImp = (profile as any)?.comissao_implantacao_percentual?.toString() ?? "5";
    const defaultMens = (profile as any)?.comissao_mensalidade_percentual?.toString() ?? "5";
    setForm({
      ...emptyForm,
      cliente_id: clienteId,
      filial_id: defaultFilial,
      vendedor_id: defaultVendedor,
      comissao_percentual: defaultImp,
      comissao_implantacao_percentual: defaultImp,
      comissao_mensalidade_percentual: defaultMens,
      comissao_servico_percentual: "5",
    });
    setDescontoAtivo(false);
    setAcrescimoAtivo(false);
    setPlanoSelecionado(null);
    setModulosDisponiveis([]);
    setContratoAtivo(null);
    setLimiteDesconto(null);
    if (defaultFilial) loadFilialParametros(defaultFilial);
    if (defaultVendedor) carregarLimitesDesconto(defaultVendedor);
    buscarContratoAtivo(clienteId);
  }, [open, clienteId]);

  useEffect(() => {
    if (form.filial_id) loadFilialParametros(form.filial_id);
  }, [form.filial_id]);

  // Computed values
  const totalAdicionaisImp = form.modulos_adicionais.reduce((s, m) => s + m.valor_implantacao_modulo * m.quantidade, 0);
  const totalAdicionaisMens = form.modulos_adicionais.reduce((s, m) => s + m.valor_mensalidade_modulo * m.quantidade, 0);
  const planoImplFilial = form.filial_id && planoSelecionado
    ? (precosFilialMap[`plano:${planoSelecionado.id}:${form.filial_id}`]?.valor_implantacao ?? planoSelecionado.valor_implantacao_padrao ?? 0)
    : (planoSelecionado?.valor_implantacao_padrao ?? 0);
  const planoMensFilial = form.filial_id && planoSelecionado
    ? (precosFilialMap[`plano:${planoSelecionado.id}:${form.filial_id}`]?.valor_mensalidade ?? planoSelecionado.valor_mensalidade_padrao ?? 0)
    : (planoSelecionado?.valor_mensalidade_padrao ?? 0);
  const valorImplantacaoOriginal = (planoSelecionado ? planoImplFilial : 0) + totalAdicionaisImp;
  const valorMensalidadeOriginal = (planoSelecionado ? planoMensFilial : 0) + totalAdicionaisMens;
  const valorImpComAcrescimo = applyAcrescimo(valorImplantacaoOriginal, form.acrescimo_implantacao_tipo, parseFloat(form.acrescimo_implantacao_valor) || 0);
  const valorMensComAcrescimo = applyAcrescimo(valorMensalidadeOriginal, form.acrescimo_mensalidade_tipo, parseFloat(form.acrescimo_mensalidade_valor) || 0);
  const valorImplantacaoFinal = applyDesconto(valorImpComAcrescimo, form.desconto_implantacao_tipo, parseFloat(form.desconto_implantacao_valor) || 0);
  const valorMensalidadeFinal = applyDesconto(valorMensComAcrescimo, form.desconto_mensalidade_tipo, parseFloat(form.desconto_mensalidade_valor) || 0);
  const valorTotal = valorImplantacaoFinal + valorMensalidadeFinal;
  const comissaoImpPerc = parseFloat(form.comissao_implantacao_percentual) || 0;
  const comissaoMensPerc = parseFloat(form.comissao_mensalidade_percentual) || 0;
  const comissaoServPerc = parseFloat(form.comissao_servico_percentual) || 0;
  const comissaoImpValor = valorImplantacaoFinal * comissaoImpPerc / 100;
  const comissaoMensValor = valorMensalidadeFinal * comissaoMensPerc / 100;
  const comissaoValorTotal = comissaoImpValor + comissaoMensValor;
  const comissaoPercentualLegado = parseFloat(form.comissao_percentual) || 0;

  const descontoImpPercAtual = form.desconto_implantacao_tipo === "%" ? parseFloat(form.desconto_implantacao_valor) || 0 : valorImplantacaoOriginal > 0 ? ((parseFloat(form.desconto_implantacao_valor) || 0) / valorImplantacaoOriginal) * 100 : 0;
  const descontoMensPercAtual = form.desconto_mensalidade_tipo === "%" ? parseFloat(form.desconto_mensalidade_valor) || 0 : valorMensalidadeOriginal > 0 ? ((parseFloat(form.desconto_mensalidade_valor) || 0) / valorMensalidadeOriginal) * 100 : 0;
  const limiteImpAtual = limiteDesconto?.implantacao ?? 100;
  const limiteMensAtual = limiteDesconto?.mensalidade ?? 100;
  const descontoImpExcedido = descontoAtivo && (parseFloat(form.desconto_implantacao_valor) || 0) > 0 && limiteDesconto !== null && descontoImpPercAtual > limiteImpAtual;
  const descontoMensExcedido = descontoAtivo && (parseFloat(form.desconto_mensalidade_valor) || 0) > 0 && limiteDesconto !== null && descontoMensPercAtual > limiteMensAtual;
  const bloqueadoPorDesconto = descontoImpExcedido || descontoMensExcedido;

  const loadPlano = useCallback(async (planoId: string, modulos: ModuloAdicionadoItem[] = []) => {
    const result = await loadPlanoRaw(planoId, modulos, form.filial_id);
    if (result) {
      setForm(f => ({ ...f, valor_implantacao_original: result.planoImplantacao, valor_mensalidade_original: result.planoMensalidade, modulos_adicionais: result.updatedModulos }));
    }
  }, [form.filial_id, loadPlanoRaw]);

  function handlePlanoChange(planoId: string) {
    setModuloBuscaId(""); setModuloBuscaQtd("1");
    setForm(f => ({ ...f, plano_id: planoId, modulos_adicionais: [], desconto_implantacao_valor: "0", desconto_mensalidade_valor: "0" }));
    loadPlano(planoId, []);
  }

  function handleAdicionarModulo() {
    if (!moduloBuscaId) { toast.error("Selecione um módulo"); return; }
    const qtd = parseInt(moduloBuscaQtd) || 1;
    const modulo = modulosDisponiveis.find(m => m.id === moduloBuscaId);
    if (!modulo) return;
    const existing = form.modulos_adicionais.find(m => m.modulo_id === moduloBuscaId);
    if (existing) {
      setForm(f => ({ ...f, modulos_adicionais: f.modulos_adicionais.map(m => m.modulo_id === moduloBuscaId ? { ...m, quantidade: m.quantidade + qtd } : m) }));
    } else {
      setForm(f => ({ ...f, modulos_adicionais: [...f.modulos_adicionais, { modulo_id: modulo.id, nome: modulo.nome, quantidade: qtd, valor_implantacao_modulo: modulo.valor_implantacao_modulo ?? 0, valor_mensalidade_modulo: modulo.valor_mensalidade_modulo ?? 0 }] }));
    }
    setModuloBuscaId(""); setModuloBuscaQtd("1");
  }

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    const err = validatePedidoForm(form);
    if (err) { toast.error(err); return; }
    const vendedorId = form.vendedor_id || profile?.user_id || "";
    const filialId = form.filial_id || profile?.filial_id || "";
    if (!vendedorId || !filialId) { toast.error("Vendedor/Filial não identificados"); return; }
    setSaving(true);
    try {
      const result = await savePedido({
        form, computed: { valorImplantacaoOriginal, valorMensalidadeOriginal, valorImplantacaoFinal, valorMensalidadeFinal, valorTotal, comissaoPercentualLegado, comissaoValorTotal, comissaoImpPerc, comissaoImpValor, comissaoMensPerc, comissaoMensValor, comissaoServPerc, comissaoServValor: 0 },
        vendedorId, filialId, descontoAtivo, editingPedido: null,
        salvarDraftComentarios: async () => {},
      });
      // Fetch the created pedido to get its number
      const { data: pedidos } = await supabase.from("pedidos").select("id, numero_exibicao, status_pedido")
        .eq("cliente_id", clienteId).order("created_at", { ascending: false }).limit(1);
      const pedido = pedidos?.[0];
      if (pedido) {
        onSaved(pedido.id, pedido.numero_exibicao || "", pedido.status_pedido);
      }
    } catch (err: any) {
      toast.error(err?.message || "Erro ao salvar pedido");
    }
    setSaving(false);
  }

  const filialOptions = filiaisDoUsuario.length > 0 ? filiaisDoUsuario : todasFiliais;

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="right" className="!max-w-none !w-[75vw] p-0 flex flex-col">
        {/* Header */}
        <div className="px-6 py-4 border-b border-border space-y-1 shrink-0">
          <div className="flex items-center gap-2">
            <SheetTitle className="text-lg">Novo Pedido</SheetTitle>
            <Badge className="bg-primary/10 text-primary border-0">{clienteNome}</Badge>
          </div>
          <SheetDescription>Selecione o plano e configure o pedido</SheetDescription>
        </div>

        {/* Form */}
        <form onSubmit={handleSave} className="flex flex-col flex-1 min-h-0">
          <div className="flex-1 overflow-y-auto px-6 py-4 space-y-5">
            {/* Cliente (readonly) */}
            <div className="space-y-1.5">
              <Label>Cliente</Label>
              <div className="flex items-center gap-2">
                <Input readOnly value={clienteNome} className="bg-muted cursor-not-allowed" />
                <CheckCircle className="h-4 w-4 text-emerald-500 shrink-0" />
              </div>
            </div>

            {/* Filial + Vendedor */}
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label>Filial *</Label>
                <Select value={form.filial_id} onValueChange={v => { setForm(f => ({ ...f, filial_id: v })); if (form.plano_id) loadPlano(form.plano_id, form.modulos_adicionais); }}>
                  <SelectTrigger><SelectValue placeholder="Selecione..." /></SelectTrigger>
                  <SelectContent>{filialOptions.map(f => <SelectItem key={f.id} value={f.id}>{f.nome}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label>Vendedor *</Label>
                {isAdmin ? (
                  <Select value={form.vendedor_id} onValueChange={v => setForm(f => ({ ...f, vendedor_id: v }))}>
                    <SelectTrigger><SelectValue placeholder="Selecione..." /></SelectTrigger>
                    <SelectContent>{vendedores.map(v => <SelectItem key={v.user_id} value={v.user_id}>{v.full_name}</SelectItem>)}</SelectContent>
                  </Select>
                ) : (
                  <Input readOnly value={profile?.full_name || "—"} className="bg-muted cursor-not-allowed" />
                )}
              </div>
            </div>

            {/* Plano */}
            <div className="space-y-1.5">
              <Label>Plano *</Label>
              <Select value={form.plano_id} onValueChange={handlePlanoChange}>
                <SelectTrigger><SelectValue placeholder="Selecione o plano..." /></SelectTrigger>
                <SelectContent>{planos.map(p => <SelectItem key={p.id} value={p.id}>{p.nome}</SelectItem>)}</SelectContent>
              </Select>
            </div>

            {/* Módulos */}
            {form.plano_id && (
              <div className="space-y-3">
                <Label>Módulos Adicionais</Label>
                <div className="flex gap-2 items-end">
                  <div className="flex-1 space-y-1">
                    <Label className="text-xs text-muted-foreground">Módulo</Label>
                    {loadingModulos ? <p className="text-sm text-muted-foreground">Carregando...</p> : (
                      <Select value={moduloBuscaId} onValueChange={setModuloBuscaId}>
                        <SelectTrigger><SelectValue placeholder="Selecione..." /></SelectTrigger>
                        <SelectContent>
                          {modulosDisponiveis.length === 0
                            ? <SelectItem value="_none" disabled>Nenhum módulo</SelectItem>
                            : modulosDisponiveis.map(m => (
                              <SelectItem key={m.id} value={m.id}>
                                {m.nome} {m.valor_mensalidade_modulo ? `(${fmtBRL(m.valor_mensalidade_modulo)}/mês)` : ""}
                              </SelectItem>
                            ))}
                        </SelectContent>
                      </Select>
                    )}
                  </div>
                  <div className="w-20 space-y-1">
                    <Label className="text-xs text-muted-foreground">Qtd</Label>
                    <Input type="number" min="1" value={moduloBuscaQtd} onChange={e => setModuloBuscaQtd(e.target.value)} />
                  </div>
                  <Button type="button" variant="outline" onClick={handleAdicionarModulo} className="gap-1"><Plus className="h-4 w-4" /> Adicionar</Button>
                </div>
                {form.modulos_adicionais.length > 0 && (
                  <div className="rounded-lg border border-border divide-y">
                    {form.modulos_adicionais.map(m => (
                      <div key={m.modulo_id} className="flex items-center gap-3 px-4 py-2.5">
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium truncate">{m.nome}</p>
                          <p className="text-xs text-muted-foreground font-mono">
                            {m.valor_implantacao_modulo > 0 && `Impl: ${fmtBRL(m.valor_implantacao_modulo)}`}
                            {m.valor_implantacao_modulo > 0 && m.valor_mensalidade_modulo > 0 && " · "}
                            {m.valor_mensalidade_modulo > 0 && `Mens: ${fmtBRL(m.valor_mensalidade_modulo)}`}
                          </p>
                        </div>
                        <span className="text-sm text-muted-foreground">Qtd: <strong>{m.quantidade}</strong></span>
                        <Button type="button" variant="ghost" size="icon" className="h-7 w-7 text-destructive" onClick={() => setForm(f => ({ ...f, modulos_adicionais: f.modulos_adicionais.filter(x => x.modulo_id !== m.modulo_id) }))}>
                          <XCircle className="h-4 w-4" />
                        </Button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* Precificação */}
            {form.plano_id && (
              <div className="rounded-xl border border-border bg-muted/30 p-4 space-y-4">
                <div className="flex items-center justify-between flex-wrap gap-2">
                  <p className="text-sm font-semibold flex items-center gap-1.5"><Tag className="h-4 w-4 text-muted-foreground" /> Precificação</p>
                  <div className="flex items-center gap-4">
                    <label className="flex items-center gap-2 cursor-pointer select-none">
                      <span className="text-xs text-muted-foreground">Acréscimo</span>
                      <Switch checked={acrescimoAtivo} onCheckedChange={v => { setAcrescimoAtivo(v); if (!v) setForm(f => ({ ...f, acrescimo_implantacao_valor: "0", acrescimo_mensalidade_valor: "0" })); }} />
                    </label>
                    <label className="flex items-center gap-2 cursor-pointer select-none">
                      <span className="text-xs text-muted-foreground">Desconto</span>
                      <Switch checked={descontoAtivo} onCheckedChange={v => { setDescontoAtivo(v); if (!v) setForm(f => ({ ...f, desconto_implantacao_valor: "0", desconto_mensalidade_valor: "0" })); }} />
                    </label>
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1.5"><Label className="text-xs text-muted-foreground">Implantação</Label><Input readOnly value={fmtBRL(valorImplantacaoOriginal)} className="bg-background font-mono text-sm" /></div>
                  <div className="space-y-1.5"><Label className="text-xs text-muted-foreground">Mensalidade</Label><Input readOnly value={fmtBRL(valorMensalidadeOriginal)} className="bg-background font-mono text-sm" /></div>
                </div>
                {descontoAtivo && (
                  <div className="space-y-3 border-t pt-3">
                    <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Descontos</p>
                    <div className="space-y-1.5">
                      <Label className="text-xs">Desconto — Implantação {descontoImpExcedido && <span className="text-destructive">(Excede limite!)</span>}</Label>
                      <div className="flex gap-2">
                        <Select value={form.desconto_implantacao_tipo} onValueChange={v => setForm(f => ({ ...f, desconto_implantacao_tipo: v as "R$" | "%" }))}>
                          <SelectTrigger className="w-20"><SelectValue /></SelectTrigger>
                          <SelectContent><SelectItem value="R$">R$</SelectItem><SelectItem value="%">%</SelectItem></SelectContent>
                        </Select>
                        <Input type="number" min="0" step="0.01" value={form.desconto_implantacao_valor} onChange={e => setForm(f => ({ ...f, desconto_implantacao_valor: e.target.value }))} className="flex-1" />
                        <Input readOnly value={fmtBRL(valorImplantacaoFinal)} className="w-36 bg-background font-mono text-sm text-emerald-600 font-semibold" />
                      </div>
                    </div>
                    <div className="space-y-1.5">
                      <Label className="text-xs">Desconto — Mensalidade {descontoMensExcedido && <span className="text-destructive">(Excede limite!)</span>}</Label>
                      <div className="flex gap-2">
                        <Select value={form.desconto_mensalidade_tipo} onValueChange={v => setForm(f => ({ ...f, desconto_mensalidade_tipo: v as "R$" | "%" }))}>
                          <SelectTrigger className="w-20"><SelectValue /></SelectTrigger>
                          <SelectContent><SelectItem value="R$">R$</SelectItem><SelectItem value="%">%</SelectItem></SelectContent>
                        </Select>
                        <Input type="number" min="0" step="0.01" value={form.desconto_mensalidade_valor} onChange={e => setForm(f => ({ ...f, desconto_mensalidade_valor: e.target.value }))} className="flex-1" />
                        <Input readOnly value={fmtBRL(valorMensalidadeFinal)} className="w-36 bg-background font-mono text-sm text-emerald-600 font-semibold" />
                      </div>
                    </div>
                    {descontoAtivo && (parseFloat(form.desconto_implantacao_valor) || 0) > 0 && (
                      <div className="space-y-1.5">
                        <Label className="text-xs">Motivo do Desconto</Label>
                        <Textarea value={form.motivo_desconto} onChange={e => setForm(f => ({ ...f, motivo_desconto: e.target.value }))} rows={2} placeholder="Justificativa..." />
                      </div>
                    )}
                  </div>
                )}
                {/* Valor total editável - auto-calcula desconto */}
                <div className="border-t pt-3 space-y-2">
                  <div className="flex justify-between items-center">
                    <span className="text-sm font-semibold">Valor Final — Implantação</span>
                    <Input
                      type="number" min="0" step="0.01"
                      value={valorImplantacaoFinal.toFixed(2)}
                      onChange={e => {
                        const desejado = parseFloat(e.target.value) || 0;
                        const diff = valorImpComAcrescimo - desejado;
                        if (diff >= 0) {
                          setForm(f => ({ ...f, desconto_implantacao_tipo: "R$" as const, desconto_implantacao_valor: diff.toFixed(2) }));
                          if (!descontoAtivo) setDescontoAtivo(true);
                        }
                      }}
                      className="w-44 font-mono text-sm text-right"
                    />
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-sm font-semibold">Valor Final — Mensalidade</span>
                    <Input
                      type="number" min="0" step="0.01"
                      value={valorMensalidadeFinal.toFixed(2)}
                      onChange={e => {
                        const desejado = parseFloat(e.target.value) || 0;
                        const diff = valorMensComAcrescimo - desejado;
                        if (diff >= 0) {
                          setForm(f => ({ ...f, desconto_mensalidade_tipo: "R$" as const, desconto_mensalidade_valor: diff.toFixed(2) }));
                          if (!descontoAtivo) setDescontoAtivo(true);
                        }
                      }}
                      className="w-44 font-mono text-sm text-right"
                    />
                  </div>
                  <div className="flex justify-between items-center pt-1">
                    <span className="text-sm font-semibold">Valor Total</span>
                    <span className="text-lg font-bold text-foreground">{fmtBRL(valorTotal)}</span>
                  </div>
                </div>
              </div>
            )}

            {/* Forma de pagamento implantação */}
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label>Forma de Pagamento — Implantação *</Label>
                <Select value={form.pagamento_implantacao_forma} onValueChange={v => setForm(f => ({ ...f, pagamento_implantacao_forma: v }))}>
                  <SelectTrigger><SelectValue placeholder="Selecione..." /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Boleto">Boleto</SelectItem>
                    <SelectItem value="Pix">Pix</SelectItem>
                    <SelectItem value="Cartão de Crédito">Cartão de Crédito</SelectItem>
                    <SelectItem value="Transferência">Transferência</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label>Parcelas da Implantação</Label>
                <Select value={form.pagamento_implantacao_parcelas || "1"} onValueChange={v => setForm(f => ({ ...f, pagamento_implantacao_parcelas: v }))}>
                  <SelectTrigger><SelectValue placeholder="1x" /></SelectTrigger>
                  <SelectContent>
                    {[1,2,3,4,5,6,7,8,9,10,11,12].map(n => (
                      <SelectItem key={n} value={String(n)}>{n}x {valorImplantacaoFinal > 0 ? `(${fmtBRL(valorImplantacaoFinal / n)})` : ""}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* Observações */}
            <div className="space-y-1.5">
              <Label>Observações</Label>
              <Textarea value={form.observacoes} onChange={e => setForm(f => ({ ...f, observacoes: e.target.value }))} rows={3} placeholder="Observações do pedido..." />
            </div>
          </div>

          {/* Footer */}
          <div className="px-6 py-4 border-t border-border flex justify-between items-center shrink-0">
            <Button type="button" variant="ghost" className="gap-1.5" onClick={onBack}>
              <ArrowLeft className="h-4 w-4" /> Voltar para Cliente
            </Button>
            <div className="flex gap-2">
              {bloqueadoPorDesconto ? (
                <Button type="submit" disabled={saving || !form.plano_id} variant="secondary" className="gap-2">
                  {saving && <Loader2 className="h-4 w-4 animate-spin" />} Enviar para aprovação
                </Button>
              ) : (
                <Button type="submit" disabled={saving || !form.plano_id}>
                  {saving && <Loader2 className="h-4 w-4 animate-spin mr-2" />} Criar Pedido
                </Button>
              )}
            </div>
          </div>
        </form>
      </SheetContent>
    </Sheet>
  );
}
