// ─── Dialog: Composição da Fatura (Invoice Breakdown) ─────────────────────

import { useState, useEffect } from "react";
import { ContratoQuickViewDialog } from "./ContratoQuickViewDialog";
import { supabase } from "@/integrations/supabase/client";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription,
} from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Loader2, Package, Puzzle, Wrench, TrendingUp, CreditCard, FileText, ExternalLink } from "lucide-react";

interface Props {
  faturaId: string | null;
  onClose: () => void;
}

interface ModuloAgrupado {
  nome: string;
  valor_mensal: number;
  quantidade: number;
  valor_total: number;
}

interface ComposicaoData {
  fatura: {
    numero_fatura: string;
    valor_final: number;
    cliente_nome: string;
    referencia_mes: number | null;
    referencia_ano: number | null;
  };
  contrato_id: string | null;
  contrato_numero: string | null;
  plano: { nome: string; valor_mensalidade: number } | null;
  implantacao: {
    valor_total: number;
    parcelas_total: number;
    parcelas_pagas: number;
    valor_parcela: number;
  } | null;
  modulos: ModuloAgrupado[];
  oas: { descricao: string; valor: number; mes: number; ano: number }[];
  upgrades: { descricao: string; dados: any }[];
}

function fmtCurrency(val: number): string {
  return val.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

/** Agrupa módulos por nome+valor_mensal para evitar duplicatas visuais */
function agruparModulos(modulos: { nome: string; valor_mensal: number; data_inicio: string }[]): ModuloAgrupado[] {
  const map = new Map<string, ModuloAgrupado>();
  for (const m of modulos) {
    const key = `${m.nome}||${m.valor_mensal}`;
    const existing = map.get(key);
    if (existing) {
      existing.quantidade += 1;
      existing.valor_total += m.valor_mensal;
    } else {
      map.set(key, { nome: m.nome, valor_mensal: m.valor_mensal, quantidade: 1, valor_total: m.valor_mensal });
    }
  }
  return Array.from(map.values());
}

export function FaturaComposicaoDialog({ faturaId, onClose }: Props) {
  const [loading, setLoading] = useState(false);
  const [data, setData] = useState<ComposicaoData | null>(null);
  const [contratoViewId, setContratoViewId] = useState<string | null>(null);

  useEffect(() => {
    if (!faturaId) { setData(null); return; }
    loadComposicao(faturaId);
  }, [faturaId]);

  async function loadComposicao(id: string) {
    setLoading(true);
    try {
      // 1. Fetch fatura
      const { data: fatura } = await supabase
        .from("faturas")
        .select("numero_fatura, valor_final, referencia_mes, referencia_ano, contrato_financeiro_id, contrato_id, cliente_id, clientes(nome_fantasia)")
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
        contrato_id: null,
        contrato_numero: null,
        plano: null,
        implantacao: null,
        modulos: [],
        oas: [],
        upgrades: [],
      };

      // Resolve contrato_financeiro_id: direct or via contrato_id
      let cfId = fatura.contrato_financeiro_id;
      if (!cfId && fatura.contrato_id) {
        const { data: cfByContrato } = await supabase
          .from("contratos_financeiros")
          .select("id")
          .eq("contrato_id", fatura.contrato_id)
          .maybeSingle();
        if (cfByContrato) cfId = cfByContrato.id;
      }

      if (cfId) {
        // 2. Fetch contrato financeiro + contrato vinculado
        const { data: cf } = await supabase
          .from("contratos_financeiros")
          .select("valor_mensalidade, valor_implantacao, parcelas_implantacao, parcelas_pagas, plano_id, planos(nome), contrato_id, contratos(numero_exibicao)")
          .eq("id", cfId)
          .single();

        if (cf) {
          // Resolve contrato info for header badge
          result.contrato_id = cf.contrato_id || null;
          result.contrato_numero = (cf as any).contratos?.numero_exibicao || null;

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

        // 3. Fetch módulos adicionais e agrupar
        const { data: modulos } = await supabase
          .from("contrato_financeiro_modulos")
          .select("nome, valor_mensal, data_inicio")
          .eq("contrato_financeiro_id", cfId)
          .eq("ativo", true)
          .order("data_inicio");

        if (modulos && modulos.length > 0) {
          result.modulos = agruparModulos(modulos);
        }

        // 4. Fetch OAs for this month
        if (fatura.referencia_mes && fatura.referencia_ano) {
          const { data: oas } = await supabase
            .from("contrato_financeiro_oas")
            .select("descricao, valor, mes_referencia, ano_referencia")
            .eq("contrato_financeiro_id", cfId)
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
          .eq("contrato_financeiro_id", cfId)
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
  const totalModulos = data?.modulos.reduce((s, m) => s + m.valor_total, 0) || 0;
  const totalOAs = data?.oas.reduce((s, o) => s + o.valor, 0) || 0;

  function handleContratoClick() {
    if (!data?.contrato_id) return;
    setContratoViewId(data.contrato_id);
  }

  return (
    <Dialog open={!!faturaId} onOpenChange={() => onClose()}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <FileText className="h-5 w-5 text-primary" />
            Composição da Fatura
          </DialogTitle>
          {data && (
            <DialogDescription className="flex flex-wrap items-center gap-1">
              {data.fatura.numero_fatura} • {data.fatura.cliente_nome}
              {data.fatura.referencia_mes && data.fatura.referencia_ano && (
                <> • Ref. {String(data.fatura.referencia_mes).padStart(2, "0")}/{data.fatura.referencia_ano}</>
              )}
              {data.contrato_numero && (
                <>
                  {" • "}
                  <Badge
                    variant="outline"
                    className="cursor-pointer text-primary border-primary/30 hover:bg-primary/10 gap-1 inline-flex items-center"
                    onClick={handleContratoClick}
                  >
                    {data.contrato_numero}
                    <ExternalLink className="h-3 w-3" />
                  </Badge>
                </>
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

            {/* Módulos Adicionais (agrupados) */}
            {data.modulos.length > 0 && (
              <div className="p-3 rounded-lg bg-muted/50 space-y-2">
                <div className="flex items-center gap-2">
                  <Puzzle className="h-5 w-5 text-violet-500 shrink-0" />
                  <p className="text-sm font-medium text-foreground">Módulos Adicionais</p>
                  <Badge variant="secondary" className="text-xs ml-auto">
                    {data.modulos.reduce((s, m) => s + m.quantidade, 0)}
                  </Badge>
                </div>
                {data.modulos.map((m, i) => (
                  <div key={i} className="flex items-center justify-between pl-7 text-xs">
                    <span className="text-muted-foreground">
                      {m.nome}{m.quantidade > 1 ? ` (${m.quantidade}x)` : ""}
                    </span>
                    <span className="font-medium text-foreground">{fmtCurrency(m.valor_total)}</span>
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

    <ContratoQuickViewDialog
      contratoId={contratoViewId}
      onClose={() => setContratoViewId(null)}
    />
    </>
  );
}
