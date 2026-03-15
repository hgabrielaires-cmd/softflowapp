// ─── Dialog: Composição da Fatura (Invoice Breakdown) ─────────────────────

import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription,
} from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Loader2, Package, Puzzle, Wrench, TrendingUp, CreditCard, FileText } from "lucide-react";

interface Props {
  faturaId: string | null;
  onClose: () => void;
}

interface ComposicaoData {
  fatura: {
    numero_fatura: string;
    valor_final: number;
    cliente_nome: string;
    referencia_mes: number | null;
    referencia_ano: number | null;
  };
  plano: { nome: string; valor_mensalidade: number } | null;
  implantacao: {
    valor_total: number;
    parcelas_total: number;
    parcelas_pagas: number;
    valor_parcela: number;
  } | null;
  modulos: { nome: string; valor_mensal: number; data_inicio: string }[];
  oas: { descricao: string; valor: number; mes: number; ano: number }[];
  upgrades: { descricao: string; dados: any }[];
}

function fmtCurrency(val: number): string {
  return val.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

export function FaturaComposicaoDialog({ faturaId, onClose }: Props) {
  const [loading, setLoading] = useState(false);
  const [data, setData] = useState<ComposicaoData | null>(null);

  useEffect(() => {
    if (!faturaId) { setData(null); return; }
    loadComposicao(faturaId);
  }, [faturaId]);

  async function loadComposicao(id: string) {
    setLoading(true);
    try {
      // 1. Fetch fatura with contrato_financeiro_id
      const { data: fatura } = await supabase
        .from("faturas")
        .select("numero_fatura, valor_final, referencia_mes, referencia_ano, contrato_financeiro_id, cliente_id, clientes(nome_fantasia)")
        .eq("id", id)
        .single();

      if (!fatura) { setLoading(false); return; }

      const result: ComposicaoData = {
        fatura: {
          numero_fatura: fatura.numero_fatura,
          valor_final: fatura.valor_final,
          cliente_nome: (fatura.clientes as any)?.nome_fantasia || "—",
          referencia_mes: fatura.referencia_mes,
          referencia_ano: fatura.referencia_ano,
        },
        plano: null,
        implantacao: null,
        modulos: [],
        oas: [],
        upgrades: [],
      };

      if (fatura.contrato_financeiro_id) {
        // 2. Fetch contrato financeiro
        const { data: cf } = await supabase
          .from("contratos_financeiros")
          .select("valor_mensalidade, valor_implantacao, parcelas_implantacao, parcelas_pagas, plano_id, planos(nome)")
          .eq("id", fatura.contrato_financeiro_id)
          .single();

        if (cf) {
          if (cf.plano_id && (cf as any).planos) {
            result.plano = {
              nome: (cf as any).planos.nome,
              valor_mensalidade: cf.valor_mensalidade,
            };
          } else if (cf.valor_mensalidade > 0) {
            result.plano = {
              nome: "Mensalidade",
              valor_mensalidade: cf.valor_mensalidade,
            };
          }

          if (cf.valor_implantacao > 0 && cf.parcelas_implantacao > 0) {
            const parcelasPagas = cf.parcelas_pagas || 0;
            const restantes = cf.parcelas_implantacao - parcelasPagas;
            if (restantes > 0) {
              result.implantacao = {
                valor_total: cf.valor_implantacao,
                parcelas_total: cf.parcelas_implantacao,
                parcelas_pagas: parcelasPagas,
                valor_parcela: cf.valor_implantacao / cf.parcelas_implantacao,
              };
            }
          }
        }

        // 3. Fetch módulos adicionais
        const { data: modulos } = await supabase
          .from("contrato_financeiro_modulos")
          .select("nome, valor_mensal, data_inicio")
          .eq("contrato_financeiro_id", fatura.contrato_financeiro_id)
          .eq("ativo", true)
          .order("data_inicio");

        if (modulos && modulos.length > 0) {
          result.modulos = modulos;
        }

        // 4. Fetch OAs for this month
        if (fatura.referencia_mes && fatura.referencia_ano) {
          const { data: oas } = await supabase
            .from("contrato_financeiro_oas")
            .select("descricao, valor, mes_referencia, ano_referencia")
            .eq("contrato_financeiro_id", fatura.contrato_financeiro_id)
            .eq("mes_referencia", fatura.referencia_mes)
            .eq("ano_referencia", fatura.referencia_ano);

          if (oas && oas.length > 0) {
            result.oas = oas.map(o => ({
              descricao: o.descricao,
              valor: o.valor,
              mes: o.mes_referencia,
              ano: o.ano_referencia,
            }));
          }
        }

        // 5. Fetch upgrade history
        const { data: historico } = await supabase
          .from("contrato_financeiro_historico")
          .select("tipo, descricao, dados_novos, created_at")
          .eq("contrato_financeiro_id", fatura.contrato_financeiro_id)
          .in("tipo", ["upgrade", "downgrade"])
          .order("created_at", { ascending: false })
          .limit(5);

        if (historico && historico.length > 0) {
          result.upgrades = historico.map(h => ({
            descricao: h.descricao,
            dados: h.dados_novos,
          }));
        }
      }

      setData(result);
    } catch (err) {
      console.error("Erro ao carregar composição:", err);
    } finally {
      setLoading(false);
    }
  }

  const hasContent = data && (data.plano || data.implantacao || data.modulos.length > 0 || data.oas.length > 0 || data.upgrades.length > 0);

  // Calculate totals
  const totalMensalidade = data?.plano?.valor_mensalidade || 0;
  const totalModulos = data?.modulos.reduce((s, m) => s + m.valor_mensal, 0) || 0;
  const totalImplantacao = data?.implantacao?.valor_parcela || 0;
  const totalOAs = data?.oas.reduce((s, o) => s + o.valor, 0) || 0;

  return (
    <Dialog open={!!faturaId} onOpenChange={() => onClose()}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <FileText className="h-5 w-5 text-primary" />
            Composição da Fatura
          </DialogTitle>
          {data && (
            <DialogDescription>
              {data.fatura.numero_fatura} • {data.fatura.cliente_nome}
              {data.fatura.referencia_mes && data.fatura.referencia_ano && (
                <> • Ref. {String(data.fatura.referencia_mes).padStart(2, "0")}/{data.fatura.referencia_ano}</>
              )}
            </DialogDescription>
          )}
        </DialogHeader>

        {loading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
          </div>
        ) : !data ? (
          <p className="text-center text-muted-foreground py-8">Fatura não encontrada.</p>
        ) : !hasContent ? (
          <div className="text-center text-muted-foreground py-8">
            <FileText className="h-8 w-8 mx-auto mb-2 opacity-30" />
            <p className="text-sm">Fatura avulsa — sem vínculo com contrato financeiro.</p>
            <p className="text-lg font-semibold text-foreground mt-2">{fmtCurrency(data.fatura.valor_final)}</p>
          </div>
        ) : (
          <div className="space-y-4">
            {/* Plano */}
            {data.plano && (
              <div className="flex items-start gap-3 p-3 rounded-lg bg-muted/50">
                <Package className="h-5 w-5 text-primary mt-0.5 shrink-0" />
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between gap-2">
                    <div>
                      <p className="text-sm font-medium text-foreground">Plano</p>
                      <p className="text-xs text-muted-foreground">{data.plano.nome}</p>
                    </div>
                    <span className="text-sm font-semibold text-foreground whitespace-nowrap">
                      {fmtCurrency(data.plano.valor_mensalidade)}
                    </span>
                  </div>
                </div>
              </div>
            )}

            {/* Módulos Adicionais */}
            {data.modulos.length > 0 && (
              <div className="p-3 rounded-lg bg-muted/50 space-y-2">
                <div className="flex items-center gap-2">
                  <Puzzle className="h-5 w-5 text-violet-500 shrink-0" />
                  <p className="text-sm font-medium text-foreground">Módulos Adicionais</p>
                  <Badge variant="secondary" className="text-xs ml-auto">{data.modulos.length}</Badge>
                </div>
                {data.modulos.map((m, i) => (
                  <div key={i} className="flex items-center justify-between pl-7 text-xs">
                    <span className="text-muted-foreground">{m.nome}</span>
                    <span className="font-medium text-foreground">{fmtCurrency(m.valor_mensal)}</span>
                  </div>
                ))}
                {data.modulos.length > 1 && (
                  <div className="flex items-center justify-between pl-7 text-xs pt-1 border-t border-border/50">
                    <span className="text-muted-foreground font-medium">Subtotal Módulos</span>
                    <span className="font-semibold text-foreground">{fmtCurrency(totalModulos)}</span>
                  </div>
                )}
              </div>
            )}

            {/* Implantação */}
            {data.implantacao && (
              <div className="flex items-start gap-3 p-3 rounded-lg bg-muted/50">
                <CreditCard className="h-5 w-5 text-amber-500 mt-0.5 shrink-0" />
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between gap-2">
                    <div>
                      <p className="text-sm font-medium text-foreground">Implantação</p>
                      <p className="text-xs text-muted-foreground">
                        Parcela {data.implantacao.parcelas_pagas + 1}/{data.implantacao.parcelas_total}
                        {" "}• Total {fmtCurrency(data.implantacao.valor_total)}
                      </p>
                    </div>
                    <span className="text-sm font-semibold text-foreground whitespace-nowrap">
                      {fmtCurrency(data.implantacao.valor_parcela)}
                    </span>
                  </div>
                </div>
              </div>
            )}

            {/* OAs */}
            {data.oas.length > 0 && (
              <div className="p-3 rounded-lg bg-muted/50 space-y-2">
                <div className="flex items-center gap-2">
                  <Wrench className="h-5 w-5 text-orange-500 shrink-0" />
                  <p className="text-sm font-medium text-foreground">Ordens de Atendimento</p>
                  <Badge variant="secondary" className="text-xs ml-auto">{data.oas.length}</Badge>
                </div>
                {data.oas.map((o, i) => (
                  <div key={i} className="flex items-center justify-between pl-7 text-xs">
                    <span className="text-muted-foreground truncate mr-2">{o.descricao}</span>
                    <span className="font-medium text-foreground whitespace-nowrap">{fmtCurrency(o.valor)}</span>
                  </div>
                ))}
                {data.oas.length > 1 && (
                  <div className="flex items-center justify-between pl-7 text-xs pt-1 border-t border-border/50">
                    <span className="text-muted-foreground font-medium">Subtotal OAs</span>
                    <span className="font-semibold text-foreground">{fmtCurrency(totalOAs)}</span>
                  </div>
                )}
              </div>
            )}

            {/* Upgrades */}
            {data.upgrades.length > 0 && (
              <div className="p-3 rounded-lg bg-muted/50 space-y-2">
                <div className="flex items-center gap-2">
                  <TrendingUp className="h-5 w-5 text-emerald-500 shrink-0" />
                  <p className="text-sm font-medium text-foreground">Upgrades Aplicados</p>
                </div>
                {data.upgrades.map((u, i) => (
                  <p key={i} className="text-xs text-muted-foreground pl-7">{u.descricao}</p>
                ))}
              </div>
            )}

            {/* Total */}
            <Separator />
            <div className="flex items-center justify-between px-1">
              <span className="text-sm font-medium text-muted-foreground">Total da Fatura</span>
              <span className="text-lg font-bold text-foreground">{fmtCurrency(data.fatura.valor_final)}</span>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
