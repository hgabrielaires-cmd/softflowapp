import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Eye, Loader2, Package, FileText, CheckCircle, DollarSign } from "lucide-react";


interface PlanoInfo {
  nome: string;
}

interface PedidoValores {
  valor_implantacao_original: number;
  valor_implantacao_final: number;
  desconto_implantacao_valor: number;
  valor_mensalidade_original: number;
  valor_mensalidade_final: number;
  desconto_mensalidade_valor: number;
}

interface ModuloInfo {
  nome: string;
  incluso_no_plano: boolean;
  inclui_treinamento: boolean;
  valor_implantacao_modulo: number | null;
  valor_mensalidade_modulo: number | null;
}

interface ModuloAdicional {
  modulo_id: string;
  nome: string;
  quantidade: number;
  valor_implantacao_modulo: number;
  valor_mensalidade_modulo: number;
}

interface EspelhoData {
  plano: PlanoInfo | null;
  pedidoValores: PedidoValores | null;
  modulosPlano: ModuloInfo[];
  modulosAdicionais: ModuloAdicional[];
  contratoNumero: string;
}

function fmtBRL(v: number) {
  return v.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

interface Props {
  clienteId: string;
  clienteNome?: string;
  variant?: "icon" | "text";
  className?: string;
}

export function ClientePlanViewer({ clienteId, clienteNome, variant = "icon", className }: Props) {
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [data, setData] = useState<EspelhoData | null>(null);

  async function fetchEspelho() {
    setLoading(true);
    setData(null);

    const { data: contratos } = await supabase
      .from("contratos")
      .select("id, numero_exibicao, plano_id, pedido_id")
      .eq("cliente_id", clienteId)
      .eq("status", "Ativo")
      .eq("tipo", "Base")
      .order("created_at", { ascending: false })
      .limit(1);

    const contrato = contratos?.[0];
    if (!contrato || !contrato.plano_id) {
      setData({ plano: null, pedidoValores: null, modulosPlano: [], modulosAdicionais: [], contratoNumero: "" });
      setLoading(false);
      return;
    }

    const [{ data: planoData }, { data: planoModulos }, pedidoResult] = await Promise.all([
      supabase.from("planos").select("nome").eq("id", contrato.plano_id).single(),
      supabase.from("plano_modulos")
        .select("incluso_no_plano, inclui_treinamento, modulos(nome, valor_implantacao_modulo, valor_mensalidade_modulo)")
        .eq("plano_id", contrato.plano_id)
        .order("ordem"),
      contrato.pedido_id
        ? supabase.from("pedidos")
            .select("modulos_adicionais, valor_implantacao_original, valor_implantacao_final, desconto_implantacao_valor, valor_mensalidade_original, valor_mensalidade_final, desconto_mensalidade_valor")
            .eq("id", contrato.pedido_id)
            .maybeSingle()
        : Promise.resolve({ data: null }),
    ]);

    const modulosPlano: ModuloInfo[] = (planoModulos || []).map((pm: any) => ({
      nome: pm.modulos?.nome || "—",
      incluso_no_plano: pm.incluso_no_plano,
      inclui_treinamento: pm.inclui_treinamento,
      valor_implantacao_modulo: pm.modulos?.valor_implantacao_modulo ?? null,
      valor_mensalidade_modulo: pm.modulos?.valor_mensalidade_modulo ?? null,
    }));

    const modulosAdicionais: ModuloAdicional[] = (pedidoResult?.data?.modulos_adicionais as any[]) || [];

    const pedidoValores: PedidoValores | null = pedidoResult?.data ? {
      valor_implantacao_original: pedidoResult.data.valor_implantacao_original ?? 0,
      valor_implantacao_final: pedidoResult.data.valor_implantacao_final ?? 0,
      desconto_implantacao_valor: pedidoResult.data.desconto_implantacao_valor ?? 0,
      valor_mensalidade_original: pedidoResult.data.valor_mensalidade_original ?? 0,
      valor_mensalidade_final: pedidoResult.data.valor_mensalidade_final ?? 0,
      desconto_mensalidade_valor: pedidoResult.data.desconto_mensalidade_valor ?? 0,
    } : null;

    // Aditivos
    const { data: aditivos } = await supabase
      .from("contratos")
      .select("pedido_id")
      .eq("cliente_id", clienteId)
      .eq("status", "Ativo")
      .eq("tipo", "Aditivo")
      .order("created_at");

    let todosAdicionais = [...modulosAdicionais];
    if (aditivos && aditivos.length > 0) {
      const pedidoIds = aditivos.map(a => a.pedido_id).filter(Boolean) as string[];
      if (pedidoIds.length > 0) {
        const { data: pedidosAditivos } = await supabase
          .from("pedidos")
          .select("modulos_adicionais")
          .in("id", pedidoIds);
        (pedidosAditivos || []).forEach((p: any) => {
          const mods = (p.modulos_adicionais as ModuloAdicional[]) || [];
          todosAdicionais = [...todosAdicionais, ...mods];
        });
      }
    }

    setData({
      plano: planoData as PlanoInfo | null,
      pedidoValores,
      modulosPlano,
      modulosAdicionais: todosAdicionais,
      contratoNumero: contrato.numero_exibicao || "",
    });
    setLoading(false);
  }

  function handleOpen() {
    setOpen(true);
    fetchEspelho();
  }

  const hasDescontoImpl = (data?.pedidoValores?.desconto_implantacao_valor ?? 0) > 0;
  const hasDescontoMens = (data?.pedidoValores?.desconto_mensalidade_valor ?? 0) > 0;

  return (
    <>
      {variant === "icon" ? (
        <Button type="button" variant="ghost" size="icon" className={`h-7 w-7 ${className || ""}`} onClick={handleOpen}>
          <Eye className="h-3.5 w-3.5" />
        </Button>
      ) : (
        <Button type="button" variant="outline" size="sm" className={`h-7 text-xs gap-1.5 ${className || ""}`} onClick={handleOpen}>
          <Eye className="h-3.5 w-3.5" /> Espelho
        </Button>
      )}

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-lg max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-base">
              <Eye className="h-4 w-4" />
              Espelho do Cliente{clienteNome ? ` — ${clienteNome}` : ""}
            </DialogTitle>
          </DialogHeader>

          {loading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
            </div>
          ) : !data?.plano ? (
            <p className="text-sm text-muted-foreground text-center py-8">Nenhum contrato ativo encontrado para este cliente.</p>
          ) : (
            <div className="space-y-4">
              {/* Contrato & Plano */}
              <div className="rounded-lg border border-border p-4 space-y-2">
                <div className="flex items-center gap-2">
                  <FileText className="h-4 w-4 text-primary" />
                  <span className="text-sm font-semibold">Contrato {data.contratoNumero}</span>
                </div>
                <div className="mt-2">
                  <p className="text-xs text-muted-foreground">Plano</p>
                  <p className="text-sm font-medium">{data.plano.nome}</p>
                </div>
              </div>

              {/* Valores do Pedido */}
              {data.pedidoValores && (
                <div className="rounded-lg border border-border p-4 space-y-3">
                  <div className="flex items-center gap-2">
                    <DollarSign className="h-4 w-4 text-primary" />
                    <span className="text-sm font-semibold">Valores do Pedido</span>
                  </div>
                  <div className="grid grid-cols-2 gap-4 mt-2">
                    {/* Implantação */}
                    <div className="space-y-1">
                      <p className="text-xs font-medium text-muted-foreground">Implantação</p>
                      {hasDescontoImpl ? (
                        <>
                          <p className="text-sm font-mono line-through text-muted-foreground">
                            {fmtBRL(data.pedidoValores.valor_implantacao_original)}
                          </p>
                          <p className="text-sm font-mono font-semibold text-foreground">
                            {fmtBRL(data.pedidoValores.valor_implantacao_final)}
                          </p>
                          <p className="text-[11px] text-emerald-600">
                            Desconto: {fmtBRL(data.pedidoValores.desconto_implantacao_valor)}
                          </p>
                        </>
                      ) : (
                        <p className="text-sm font-mono font-semibold">
                          {fmtBRL(data.pedidoValores.valor_implantacao_final)}
                        </p>
                      )}
                    </div>
                    {/* Mensalidade */}
                    <div className="space-y-1">
                      <p className="text-xs font-medium text-muted-foreground">Mensalidade</p>
                      {hasDescontoMens ? (
                        <>
                          <p className="text-sm font-mono line-through text-muted-foreground">
                            {fmtBRL(data.pedidoValores.valor_mensalidade_original)}
                          </p>
                          <p className="text-sm font-mono font-semibold text-foreground">
                            {fmtBRL(data.pedidoValores.valor_mensalidade_final)}
                          </p>
                          <p className="text-[11px] text-emerald-600">
                            Desconto: {fmtBRL(data.pedidoValores.desconto_mensalidade_valor)}
                          </p>
                        </>
                      ) : (
                        <p className="text-sm font-mono font-semibold">
                          {fmtBRL(data.pedidoValores.valor_mensalidade_final)}
                        </p>
                      )}
                    </div>
                  </div>
                </div>
              )}

              {/* Módulos do Plano */}
              {data.modulosPlano.length > 0 && (
                <div className="rounded-lg border border-border p-4 space-y-2">
                  <div className="flex items-center gap-2">
                    <Package className="h-4 w-4 text-primary" />
                    <span className="text-sm font-semibold">Módulos do Plano</span>
                  </div>
                  <div className="divide-y divide-border">
                    {data.modulosPlano.map((m, i) => (
                      <div key={i} className="flex items-center justify-between py-2 first:pt-0 last:pb-0">
                        <div className="flex items-center gap-2">
                          <CheckCircle className="h-3.5 w-3.5 text-emerald-500" />
                          <span className="text-sm">{m.nome}</span>
                          {!m.incluso_no_plano && (
                            <span className="text-[10px] px-1.5 py-0.5 rounded bg-amber-100 text-amber-700">Opcional</span>
                          )}
                          {m.inclui_treinamento && (
                            <span className="text-[10px] px-1.5 py-0.5 rounded bg-blue-100 text-blue-700">c/ Treinamento</span>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Módulos Adicionais */}
              {data.modulosAdicionais.length > 0 && (
                <div className="rounded-lg border border-border p-4 space-y-2">
                  <div className="flex items-center gap-2">
                    <Package className="h-4 w-4 text-indigo-500" />
                    <span className="text-sm font-semibold">Módulos Adicionais</span>
                  </div>
                  <div className="divide-y divide-border">
                    {data.modulosAdicionais.map((m, i) => (
                      <div key={i} className="flex items-center justify-between py-2 first:pt-0 last:pb-0">
                        <div className="flex items-center gap-2">
                          <Package className="h-3.5 w-3.5 text-indigo-400" />
                          <span className="text-sm">{m.nome}</span>
                          {m.quantidade > 1 && (
                            <span className="text-[10px] px-1.5 py-0.5 rounded bg-muted text-muted-foreground">x{m.quantidade}</span>
                          )}
                        </div>
                        <span className="text-xs font-mono text-muted-foreground">
                          {fmtBRL(m.valor_mensalidade_modulo * (m.quantidade || 1))}/mês
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}

          <DialogFooter>
            <Button variant="outline" onClick={() => setOpen(false)}>Fechar</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
