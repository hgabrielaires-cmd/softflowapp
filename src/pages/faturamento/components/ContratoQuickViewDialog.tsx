// ─── Quick View: Visualização rápida de contrato (standalone, read-only) ──
import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription,
} from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Loader2, FileCheck, ExternalLink, Download } from "lucide-react";
import { Button } from "@/components/ui/button";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";

interface Props {
  contratoId: string | null;
  onClose: () => void;
}

function fmtBRL(val: number) {
  return val.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

const statusColors: Record<string, string> = {
  Ativo: "bg-emerald-100 text-emerald-700 border-emerald-200",
  Encerrado: "bg-red-100 text-red-700 border-red-200",
  Pendente: "bg-amber-100 text-amber-700 border-amber-200",
};

const tipoColors: Record<string, string> = {
  Base: "bg-blue-100 text-blue-700 border-blue-200",
  Aditivo: "bg-violet-100 text-violet-700 border-violet-200",
  OA: "bg-orange-100 text-orange-700 border-orange-200",
  Cancelamento: "bg-red-100 text-red-700 border-red-200",
};

interface ContratoView {
  id: string;
  numero_exibicao: string;
  status: string;
  tipo: string;
  created_at: string;
  pdf_url: string | null;
  cliente_nome: string;
  plano_nome: string | null;
  pedido?: {
    tipo_pedido: string | null;
    valor_implantacao_final: number;
    valor_mensalidade_final: number;
    valor_total: number;
    observacoes: string | null;
    modulos_adicionais: any[];
  };
  vinculados: { id: string; numero_exibicao: string; tipo: string; status: string }[];
}

export function ContratoQuickViewDialog({ contratoId, onClose }: Props) {
  const [loading, setLoading] = useState(false);
  const [data, setData] = useState<ContratoView | null>(null);

  useEffect(() => {
    if (!contratoId) { setData(null); return; }
    load(contratoId);
  }, [contratoId]);

  async function load(id: string) {
    setLoading(true);
    try {
      const { data: c } = await supabase
        .from("contratos")
        .select(`
          id, numero_exibicao, status, tipo, created_at, pdf_url,
          clientes(nome_fantasia),
          planos(nome),
          pedidos(
            tipo_pedido, valor_implantacao_final, valor_mensalidade_final,
            valor_total, observacoes, modulos_adicionais
          )
        `)
        .eq("id", id)
        .single();

      if (!c) { setLoading(false); return; }

      // Fetch vinculados (aditivos do mesmo contrato base)
      const { data: vinculados } = await supabase
        .from("contratos")
        .select("id, numero_exibicao, tipo, status")
        .eq("contrato_origem_id", id)
        .order("numero_registro", { ascending: false });

      const pedido = c.pedidos as any;
      setData({
        id: c.id,
        numero_exibicao: c.numero_exibicao,
        status: c.status,
        tipo: c.tipo,
        created_at: c.created_at,
        pdf_url: c.pdf_url,
        cliente_nome: (c.clientes as any)?.nome_fantasia || "—",
        plano_nome: (c.planos as any)?.nome || null,
        pedido: pedido ? {
          tipo_pedido: pedido.tipo_pedido,
          valor_implantacao_final: pedido.valor_implantacao_final || 0,
          valor_mensalidade_final: pedido.valor_mensalidade_final || 0,
          valor_total: pedido.valor_total || 0,
          observacoes: pedido.observacoes,
          modulos_adicionais: pedido.modulos_adicionais || [],
        } : undefined,
        vinculados: (vinculados || []) as any,
      });
    } catch (err) {
      console.error("Erro ao carregar contrato:", err);
    } finally {
      setLoading(false);
    }
  }

  return (
    <Dialog open={!!contratoId} onOpenChange={() => onClose()}>
      <DialogContent className="max-w-lg max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <FileCheck className="h-5 w-5 text-emerald-600" />
            Contrato {data?.numero_exibicao || ""}
          </DialogTitle>
          <DialogDescription>Visualização rápida do contrato.</DialogDescription>
        </DialogHeader>

        {loading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
          </div>
        ) : !data ? (
          <p className="text-center text-muted-foreground py-8">Contrato não encontrado.</p>
        ) : (
          <div className="space-y-4 text-sm">
            {/* Dados básicos */}
            <div className="grid grid-cols-2 gap-x-4 gap-y-3">
              <div>
                <p className="text-muted-foreground text-xs">Número</p>
                <p className="font-mono font-semibold">{data.numero_exibicao}</p>
              </div>
              <div>
                <p className="text-muted-foreground text-xs">Status</p>
                <Badge className={`${statusColors[data.status] || "bg-muted text-foreground"} text-xs`}>
                  {data.status}
                </Badge>
              </div>
              <div>
                <p className="text-muted-foreground text-xs">Cliente</p>
                <p className="font-semibold">{data.cliente_nome}</p>
              </div>
              <div>
                <p className="text-muted-foreground text-xs">Plano</p>
                <p className="font-semibold">{data.plano_nome || "—"}</p>
              </div>
              <div>
                <p className="text-muted-foreground text-xs">Tipo</p>
                <Badge className={`${tipoColors[data.tipo] || "bg-muted text-foreground"} text-xs`}>
                  {data.tipo}
                </Badge>
              </div>
              <div>
                <p className="text-muted-foreground text-xs">Criado em</p>
                <p>{format(new Date(data.created_at), "dd/MM/yyyy HH:mm", { locale: ptBR })}</p>
              </div>
            </div>

            {/* Valores do pedido */}
            {data.pedido && (
              <div className="border-t border-border pt-3 space-y-3">
                <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Valores do Pedido</p>
                <div className="grid grid-cols-2 gap-3">
                  <div className="rounded-lg bg-muted/40 p-3 space-y-0.5">
                    <p className="text-xs text-muted-foreground">Implantação</p>
                    <p className="font-semibold text-foreground">{fmtBRL(data.pedido.valor_implantacao_final)}</p>
                  </div>
                  <div className="rounded-lg bg-muted/40 p-3 space-y-0.5">
                    <p className="text-xs text-muted-foreground">Mensalidade</p>
                    <p className="font-semibold text-foreground">{fmtBRL(data.pedido.valor_mensalidade_final)}</p>
                  </div>
                </div>
                <div className="rounded-lg border border-border bg-muted/20 p-3 flex items-center justify-between">
                  <span className="text-xs text-muted-foreground font-medium">Valor Total</span>
                  <span className="font-bold text-foreground">{fmtBRL(data.pedido.valor_total)}</span>
                </div>

                {data.pedido.modulos_adicionais.length > 0 && (
                  <div className="space-y-2">
                    <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Módulos Adicionais</p>
                    <div className="rounded-lg border border-border divide-y divide-border">
                      {data.pedido.modulos_adicionais.map((m: any, i: number) => (
                        <div key={i} className="flex items-center justify-between px-3 py-2 text-xs">
                          <span className="text-foreground">{m.nome} <span className="text-muted-foreground">× {m.quantidade}</span></span>
                          <span className="font-medium">{fmtBRL((m.valor_mensalidade_modulo || 0) * (m.quantidade || 1))}/mês</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {data.pedido.observacoes && (
                  <div className="space-y-1">
                    <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Observações</p>
                    <p className="text-xs text-foreground bg-muted/40 rounded-lg p-3">{data.pedido.observacoes}</p>
                  </div>
                )}
              </div>
            )}

            {/* Vinculados */}
            {data.vinculados.length > 0 && (
              <div className="border-t border-border pt-3 space-y-2">
                <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Contratos Vinculados</p>
                <div className="rounded-lg border border-border divide-y divide-border">
                  {data.vinculados.map(v => (
                    <div key={v.id} className="flex items-center justify-between px-3 py-2 text-xs">
                      <div className="flex items-center gap-2">
                        <span className="font-mono font-semibold">{v.numero_exibicao}</span>
                        <Badge className={`${tipoColors[v.tipo] || ""} text-[10px]`}>{v.tipo}</Badge>
                      </div>
                      <Badge className={`${statusColors[v.status] || ""} text-[10px]`}>{v.status}</Badge>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Download PDF */}
            {data.pdf_url && (
              <div className="border-t border-border pt-3">
                <Button
                  variant="outline"
                  className="w-full gap-2"
                  onClick={() => window.open(data.pdf_url!, "_blank")}
                >
                  <Download className="h-4 w-4" />
                  Baixar Contrato (PDF)
                </Button>
              </div>
            )}
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
