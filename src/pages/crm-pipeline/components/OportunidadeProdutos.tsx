import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/context/AuthContext";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Plus, Trash2, Package, DollarSign, AlertTriangle } from "lucide-react";
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
  const [descontoImplantacao, setDescontoImplantacao] = useState(0);
  const [descontoMensalidade, setDescontoMensalidade] = useState(0);

  const limiteImplantacao = profile?.desconto_limite_implantacao ?? 0;
  const limiteMensalidade = profile?.desconto_limite_mensalidade ?? 0;

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

          {/* Totals */}
          <div className="grid grid-cols-[1fr_80px_120px_120px_40px] gap-2 items-center px-2 pt-2 border-t">
            <span className="text-sm font-bold flex items-center gap-1">
              <DollarSign className="h-4 w-4 text-primary" /> Total
            </span>
            <span />
            <span className="text-sm font-bold text-right text-emerald-600">
              {formatCurrency(totalImplantacao)}
            </span>
            <span className="text-sm font-bold text-right text-primary">
              {formatCurrency(totalMensalidade)}
            </span>
            <span />
          </div>
        </div>
      )}
    </div>
  );
}
