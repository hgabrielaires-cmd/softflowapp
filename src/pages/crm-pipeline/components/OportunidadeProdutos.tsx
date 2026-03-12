import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/context/AuthContext";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Plus, Trash2, Package, DollarSign, AlertTriangle, Tag } from "lucide-react";
import { toast } from "sonner";

interface Plano {
  id: string;
  nome: string;
  valor_implantacao_padrao: number;
  valor_mensalidade_padrao: number;
}

interface Modulo {
  id: string;
  nome: string;
  valor_implantacao_modulo: number | null;
  valor_mensalidade_modulo: number | null;
  permite_revenda: boolean;
  quantidade_maxima: number | null;
}

interface ProdutoItem {
  id?: string;
  tipo: "plano" | "modulo";
  referencia_id: string;
  quantidade: number;
  valor_implantacao: number;
  valor_mensalidade: number;
  nome?: string;
}

interface Props {
  oportunidadeId: string;
}

const formatCurrency = (v: number) =>
  v.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });

export function OportunidadeProdutos({ oportunidadeId }: Props) {
  const { profile } = useAuth();
  const queryClient = useQueryClient();
  const [items, setItems] = useState<ProdutoItem[]>([]);
  const [addType, setAddType] = useState<"plano" | "modulo">("plano");
  const [addRef, setAddRef] = useState("");
  const [descontoAtivo, setDescontoAtivo] = useState(false);
  const [descontoImplantacao, setDescontoImplantacao] = useState(0);
  const [descontoImplantacaoTipo, setDescontoImplantacaoTipo] = useState<"R$" | "%">("R$");
  const [descontoMensalidade, setDescontoMensalidade] = useState(0);
  const [descontoMensalidadeTipo, setDescontoMensalidadeTipo] = useState<"R$" | "%">("R$");
  const [descontosLoaded, setDescontosLoaded] = useState(false);

  const limiteImplantacao = profile?.desconto_limite_implantacao ?? 0;
  const limiteMensalidade = profile?.desconto_limite_mensalidade ?? 0;

  // Load discounts from oportunidade
  const descontosQuery = useQuery({
    queryKey: ["crm_oportunidade_descontos", oportunidadeId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("crm_oportunidades")
        .select("desconto_implantacao, desconto_implantacao_tipo, desconto_mensalidade, desconto_mensalidade_tipo")
        .eq("id", oportunidadeId)
        .single();
      if (error) throw error;
      return data;
    },
  });

  useEffect(() => {
    if (descontosQuery.data && !descontosLoaded) {
      const d = descontosQuery.data as any;
      const hasDesconto = (d.desconto_implantacao > 0 || d.desconto_mensalidade > 0);
      setDescontoAtivo(hasDesconto);
      setDescontoImplantacao(d.desconto_implantacao || 0);
      setDescontoImplantacaoTipo(d.desconto_implantacao_tipo || "R$");
      setDescontoMensalidade(d.desconto_mensalidade || 0);
      setDescontoMensalidadeTipo(d.desconto_mensalidade_tipo || "R$");
      setDescontosLoaded(true);
    }
  }, [descontosQuery.data, descontosLoaded]);

  // Save discounts mutation
  const saveDescontosMutation = useMutation({
    mutationFn: async (params: { desconto_implantacao: number; desconto_implantacao_tipo: string; desconto_mensalidade: number; desconto_mensalidade_tipo: string }) => {
      const { error } = await supabase
        .from("crm_oportunidades")
        .update(params)
        .eq("id", oportunidadeId);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["crm_oportunidade_descontos", oportunidadeId] });
    },
  });

  const persistDescontos = (
    impl: number, implTipo: string, mens: number, mensTipo: string
  ) => {
    saveDescontosMutation.mutate({
      desconto_implantacao: impl,
      desconto_implantacao_tipo: implTipo,
      desconto_mensalidade: mens,
      desconto_mensalidade_tipo: mensTipo,
    });
  };

  const planosQuery = useQuery({
    queryKey: ["crm_planos_catalogo"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("planos")
        .select("id, nome, valor_implantacao_padrao, valor_mensalidade_padrao")
        .eq("ativo", true)
        .order("ordem");
      if (error) throw error;
      return data as Plano[];
    },
  });

  const modulosQuery = useQuery({
    queryKey: ["crm_modulos_catalogo"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("modulos")
        .select("id, nome, valor_implantacao_modulo, valor_mensalidade_modulo, permite_revenda, quantidade_maxima")
        .eq("ativo", true)
        .order("nome");
      if (error) throw error;
      return data as Modulo[];
    },
  });

  const produtosQuery = useQuery({
    queryKey: ["crm_oportunidade_produtos", oportunidadeId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("crm_oportunidade_produtos")
        .select("*")
        .eq("oportunidade_id", oportunidadeId)
        .order("created_at");
      if (error) throw error;
      return data || [];
    },
  });

  useEffect(() => {
    if (produtosQuery.data && planosQuery.data && modulosQuery.data) {
      setItems(
        produtosQuery.data.map((p: any) => {
          const nome =
            p.tipo === "plano"
              ? planosQuery.data?.find((pl) => pl.id === p.referencia_id)?.nome
              : modulosQuery.data?.find((m) => m.id === p.referencia_id)?.nome;
          return { ...p, nome: nome || "Item removido" } as ProdutoItem;
        })
      );
    }
  }, [produtosQuery.data, planosQuery.data, modulosQuery.data]);

  const saveMutation = useMutation({
    mutationFn: async (item: ProdutoItem) => {
      if (item.id) {
        const { error } = await supabase
          .from("crm_oportunidade_produtos")
          .update({
            quantidade: item.quantidade,
            valor_implantacao: item.valor_implantacao,
            valor_mensalidade: item.valor_mensalidade,
          })
          .eq("id", item.id);
        if (error) throw error;
      } else {
        const { error } = await supabase
          .from("crm_oportunidade_produtos")
          .insert({
            oportunidade_id: oportunidadeId,
            tipo: item.tipo,
            referencia_id: item.referencia_id,
            quantidade: item.quantidade,
            valor_implantacao: item.valor_implantacao,
            valor_mensalidade: item.valor_mensalidade,
          });
        if (error) throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["crm_oportunidade_produtos", oportunidadeId] });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from("crm_oportunidade_produtos")
        .delete()
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["crm_oportunidade_produtos", oportunidadeId] });
      toast.success("Item removido");
    },
  });

  const handleAdd = () => {
    if (!addRef) return;
    let valor_implantacao = 0;
    let valor_mensalidade = 0;
    let nome = "";

    if (addType === "plano") {
      // Plano: só pode ter 1
      if (items.some(it => it.tipo === "plano")) {
        toast.error("Já existe um plano na proposta. Remova o atual para adicionar outro.");
        return;
      }
      const plano = planosQuery.data?.find((p) => p.id === addRef);
      if (!plano) return;
      valor_implantacao = plano.valor_implantacao_padrao;
      valor_mensalidade = plano.valor_mensalidade_padrao;
      nome = plano.nome;
    } else {
      const modulo = modulosQuery.data?.find((m) => m.id === addRef);
      if (!modulo) return;
      // Módulo sem revenda: não pode adicionar se já existe
      if (!modulo.permite_revenda && items.some(it => it.tipo === "modulo" && it.referencia_id === addRef)) {
        toast.error(`O módulo "${modulo.nome}" não permite venda duplicada.`);
        return;
      }
      // Módulo com quantidade_maxima: validar total
      if (modulo.quantidade_maxima) {
        const qtdExistente = items
          .filter(it => it.tipo === "modulo" && it.referencia_id === addRef)
          .reduce((sum, it) => sum + it.quantidade, 0);
        if (qtdExistente >= modulo.quantidade_maxima) {
          toast.error(`Limite máximo de ${modulo.quantidade_maxima} unidade(s) para "${modulo.nome}" já atingido.`);
          return;
        }
      }
      valor_implantacao = modulo.valor_implantacao_modulo || 0;
      valor_mensalidade = modulo.valor_mensalidade_modulo || 0;
      nome = modulo.nome;
    }

    const newItem: ProdutoItem = {
      tipo: addType,
      referencia_id: addRef,
      quantidade: 1,
      valor_implantacao,
      valor_mensalidade,
      nome,
    };

    saveMutation.mutate(newItem);
    setAddRef("");
  };

  const handleRemove = (item: ProdutoItem) => {
    if (item.id) {
      deleteMutation.mutate(item.id);
    }
  };

  const handleUpdateItem = (item: ProdutoItem) => {
    if (item.id) {
      saveMutation.mutate(item);
    }
  };

  const updateItemLocal = (index: number, field: keyof ProdutoItem, value: number) => {
    setItems((prev) =>
      prev.map((it, i) => {
        if (i !== index) return it;
        let newValue = value;
        // Validate quantidade limits
        if (field === "quantidade") {
          if (it.tipo === "plano") {
            newValue = 1; // plano always 1
          } else {
            const modulo = modulosQuery.data?.find(m => m.id === it.referencia_id);
            if (modulo && !modulo.permite_revenda) {
              newValue = 1;
            }
            if (modulo?.quantidade_maxima && newValue > modulo.quantidade_maxima) {
              toast.error(`Limite máximo: ${modulo.quantidade_maxima} unidade(s) para "${it.nome}".`);
              newValue = modulo.quantidade_maxima;
            }
          }
        }
        return { ...it, [field]: newValue };
      })
    );
  };

  const totalImplantacao = items.reduce((sum, it) => sum + it.valor_implantacao * it.quantidade, 0);
  const totalMensalidade = items.reduce((sum, it) => sum + it.valor_mensalidade * it.quantidade, 0);

  // Calculate actual discount values based on type (R$ or %)
  const descontoImplValor = descontoImplantacaoTipo === "%" 
    ? (totalImplantacao * descontoImplantacao) / 100 
    : descontoImplantacao;
  const descontoMensValor = descontoMensalidadeTipo === "%" 
    ? (totalMensalidade * descontoMensalidade) / 100 
    : descontoMensalidade;

  const percImplantacao = totalImplantacao > 0 ? (descontoImplValor / totalImplantacao) * 100 : 0;
  const percMensalidade = totalMensalidade > 0 ? (descontoMensValor / totalMensalidade) * 100 : 0;
  const excedeLimiteImpl = percImplantacao > limiteImplantacao && descontoImplValor > 0;
  const excedeLimiteMens = percMensalidade > limiteMensalidade && descontoMensValor > 0;
  const precisaAprovacao = excedeLimiteImpl || excedeLimiteMens;

  const totalImplFinal = Math.max(0, totalImplantacao - descontoImplValor);
  const totalMensFinal = Math.max(0, totalMensalidade - descontoMensValor);

  const catalogo = addType === "plano" ? planosQuery.data || [] : modulosQuery.data || [];

  return (
    <div className="space-y-4 pt-4">
      {/* Add item */}
      <div className="flex items-end gap-2 flex-wrap">
        <div className="w-32">
          <Label className="text-xs">Tipo</Label>
          <Select value={addType} onValueChange={(v) => { setAddType(v as "plano" | "modulo"); setAddRef(""); }}>
            <SelectTrigger className="h-9"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="plano">Plano</SelectItem>
              <SelectItem value="modulo">Módulo</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div className="flex-1 min-w-[200px]">
          <Label className="text-xs">{addType === "plano" ? "Plano" : "Módulo Adicional"}</Label>
          <Select value={addRef} onValueChange={setAddRef}>
            <SelectTrigger className="h-9"><SelectValue placeholder="Selecione..." /></SelectTrigger>
            <SelectContent>
              {catalogo.map((item: any) => (
                <SelectItem key={item.id} value={item.id}>{item.nome}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <Button size="sm" className="h-9 gap-1" onClick={handleAdd} disabled={!addRef || saveMutation.isPending}>
          <Plus className="h-3.5 w-3.5" /> Adicionar
        </Button>
      </div>

      {/* Items list */}
      {items.length === 0 ? (
        <div className="flex items-center justify-center h-40 text-muted-foreground">
          <div className="text-center space-y-2">
            <Package className="h-8 w-8 mx-auto opacity-40" />
            <p className="text-sm">Nenhum produto ou serviço adicionado.</p>
            <p className="text-xs">Selecione um plano ou módulo acima para montar a proposta.</p>
          </div>
        </div>
      ) : (
        <div className="space-y-2">
          {/* Header */}
          <div className="grid grid-cols-[1fr_80px_120px_120px_40px] gap-2 text-[11px] font-semibold text-muted-foreground px-2">
            <span>Item</span>
            <span className="text-center">Qtd</span>
            <span className="text-right">Implantação</span>
            <span className="text-right">Mensalidade</span>
            <span />
          </div>

          {items.map((item, idx) => {
            const isPlano = item.tipo === "plano";
            const modulo = !isPlano ? modulosQuery.data?.find(m => m.id === item.referencia_id) : null;
            const qtdLocked = isPlano || (modulo && !modulo.permite_revenda);
            return (
            <div
              key={item.id || idx}
              className="grid grid-cols-[1fr_80px_120px_120px_40px] gap-2 items-center border rounded-md px-2 py-2 bg-muted/20"
            >
              <div className="flex items-center gap-2 min-w-0">
                <Badge variant={isPlano ? "default" : "secondary"} className="text-[10px] shrink-0">
                  {isPlano ? "Plano" : "Módulo"}
                </Badge>
                <span className="text-sm font-medium truncate">{item.nome}</span>
              </div>
              <Input
                type="number"
                min={1}
                max={modulo?.quantidade_maxima || undefined}
                value={item.quantidade}
                onChange={(e) => updateItemLocal(idx, "quantidade", parseInt(e.target.value) || 1)}
                onBlur={() => handleUpdateItem(item)}
                className="h-8 text-xs text-center"
                disabled={!!qtdLocked}
              />
              <Input
                type="number"
                min={0}
                step="0.01"
                value={item.valor_implantacao}
                onChange={(e) => updateItemLocal(idx, "valor_implantacao", parseFloat(e.target.value) || 0)}
                onBlur={() => handleUpdateItem(item)}
                className="h-8 text-xs text-right"
              />
              <Input
                type="number"
                min={0}
                step="0.01"
                value={item.valor_mensalidade}
                onChange={(e) => updateItemLocal(idx, "valor_mensalidade", parseFloat(e.target.value) || 0)}
                onBlur={() => handleUpdateItem(item)}
                className="h-8 text-xs text-right"
              />
              <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8 text-destructive"
                onClick={() => handleRemove(item)}
                disabled={deleteMutation.isPending}
              >
                <Trash2 className="h-3.5 w-3.5" />
              </Button>
            </div>
            );
          })}

          {/* Pricing section */}
          <div className="rounded-xl border border-border bg-muted/30 p-4 space-y-4 mt-2">
            <div className="flex items-center justify-between flex-wrap gap-2">
              <p className="text-sm font-semibold text-foreground flex items-center gap-1.5">
                <Tag className="h-4 w-4 text-muted-foreground" /> Precificação
              </p>
              <label className="flex items-center gap-2 cursor-pointer select-none">
                <span className="text-xs text-muted-foreground">Desconto</span>
                <Switch
                  checked={descontoAtivo}
                  onCheckedChange={(v) => {
                    setDescontoAtivo(v);
                    if (!v) {
                      setDescontoImplantacao(0);
                      setDescontoMensalidade(0);
                    }
                  }}
                />
              </label>
            </div>

            {/* Original values */}
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label className="text-xs text-muted-foreground">Implantação</Label>
                <Input readOnly value={formatCurrency(totalImplantacao)} className="bg-background font-mono text-sm" />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs text-muted-foreground">Mensalidade</Label>
                <Input readOnly value={formatCurrency(totalMensalidade)} className="bg-background font-mono text-sm" />
              </div>
            </div>

            {/* Discount fields */}
            {descontoAtivo && (
              <div className="space-y-3 border-t border-border pt-3">
                <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Descontos</p>

                <div className="space-y-1.5">
                  <div className="flex items-center justify-between">
                    <Label className="text-xs">Desconto — Implantação</Label>
                    <span className={`text-xs font-medium ${excedeLimiteImpl ? "text-destructive" : "text-muted-foreground"}`}>
                      Limite: {limiteImplantacao}% · Aplicado: {percImplantacao.toFixed(1)}%
                    </span>
                  </div>
                  <div className={`flex gap-2 ${excedeLimiteImpl ? "ring-1 ring-destructive rounded-md p-1" : ""}`}>
                    <Select value={descontoImplantacaoTipo} onValueChange={(v) => setDescontoImplantacaoTipo(v as "R$" | "%")}>
                      <SelectTrigger className="w-20"><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="R$">R$</SelectItem>
                        <SelectItem value="%">%</SelectItem>
                      </SelectContent>
                    </Select>
                    <Input
                      type="number" min={0} step="0.01"
                      value={descontoImplantacao || ""}
                      onChange={(e) => setDescontoImplantacao(parseFloat(e.target.value) || 0)}
                      className={`flex-1 ${excedeLimiteImpl ? "border-destructive" : ""}`}
                      placeholder="0"
                    />
                    <Input
                      type="text" inputMode="decimal"
                      defaultValue={totalImplFinal.toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                      key={`impl-final-${totalImplFinal.toFixed(2)}`}
                      onBlur={(e) => {
                        const raw = e.target.value.replace(/[R$\s]/g, "").replace(/\./g, "").replace(",", ".");
                        const novoFinal = parseFloat(raw) || 0;
                        const descontoCalc = Math.max(0, totalImplantacao - novoFinal);
                        setDescontoImplantacaoTipo("R$");
                        setDescontoImplantacao(parseFloat(descontoCalc.toFixed(2)));
                      }}
                      className="w-36 bg-background font-mono text-sm text-primary font-semibold"
                    />
                  </div>
                </div>

                <div className="space-y-1.5">
                  <div className="flex items-center justify-between">
                    <Label className="text-xs">Desconto — Mensalidade</Label>
                    <span className={`text-xs font-medium ${excedeLimiteMens ? "text-destructive" : "text-muted-foreground"}`}>
                      Limite: {limiteMensalidade}% · Aplicado: {percMensalidade.toFixed(1)}%
                    </span>
                  </div>
                  <div className={`flex gap-2 ${excedeLimiteMens ? "ring-1 ring-destructive rounded-md p-1" : ""}`}>
                    <Select value={descontoMensalidadeTipo} onValueChange={(v) => setDescontoMensalidadeTipo(v as "R$" | "%")}>
                      <SelectTrigger className="w-20"><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="R$">R$</SelectItem>
                        <SelectItem value="%">%</SelectItem>
                      </SelectContent>
                    </Select>
                    <Input
                      type="number" min={0} step="0.01"
                      value={descontoMensalidade || ""}
                      onChange={(e) => setDescontoMensalidade(parseFloat(e.target.value) || 0)}
                      className={`flex-1 ${excedeLimiteMens ? "border-destructive" : ""}`}
                      placeholder="0"
                    />
                    <Input
                      type="text" inputMode="decimal"
                      defaultValue={totalMensFinal.toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                      key={`mens-final-${totalMensFinal.toFixed(2)}`}
                      onBlur={(e) => {
                        const raw = e.target.value.replace(/[R$\s]/g, "").replace(/\./g, "").replace(",", ".");
                        const novoFinal = parseFloat(raw) || 0;
                        const descontoCalc = Math.max(0, totalMensalidade - novoFinal);
                        setDescontoMensalidadeTipo("R$");
                        setDescontoMensalidade(parseFloat(descontoCalc.toFixed(2)));
                      }}
                      className="w-36 bg-background font-mono text-sm text-primary font-semibold"
                    />
                  </div>
                </div>

                {/* Warning */}
                {precisaAprovacao && (
                  <div className="flex items-center gap-2 p-2 rounded-md bg-amber-50 border border-amber-200 dark:bg-amber-950/30 dark:border-amber-800">
                    <AlertTriangle className="h-4 w-4 text-amber-500 shrink-0" />
                    <span className="text-xs text-amber-700 dark:text-amber-400">
                      Desconto acima do seu limite ({excedeLimiteImpl ? `Impl: ${percImplantacao.toFixed(1)}% > ${limiteImplantacao}%` : ""}
                      {excedeLimiteImpl && excedeLimiteMens ? " | " : ""}
                      {excedeLimiteMens ? `Mens: ${percMensalidade.toFixed(1)}% > ${limiteMensalidade}%` : ""}
                      ). Será necessária aprovação do gestor.
                    </span>
                  </div>
                )}
              </div>
            )}

            {/* Final totals */}
            <div className="grid grid-cols-2 gap-3 border-t border-border pt-3">
              <div className="space-y-1.5">
                <Label className="text-xs font-semibold flex items-center gap-1">
                  <DollarSign className="h-3.5 w-3.5 text-primary" /> Total Implantação
                </Label>
                <Input readOnly value={formatCurrency(totalImplFinal)} className="bg-background font-mono text-sm font-bold text-emerald-600" />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs font-semibold flex items-center gap-1">
                  <DollarSign className="h-3.5 w-3.5 text-primary" /> Total Mensalidade
                </Label>
                <Input readOnly value={formatCurrency(totalMensFinal)} className="bg-background font-mono text-sm font-bold text-primary" />
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
