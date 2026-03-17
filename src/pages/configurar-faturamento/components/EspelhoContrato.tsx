// ─── Coluna Esquerda: Espelho do Contrato (readonly) ──────────────────────

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { ExternalLink, FileText, Package, Briefcase, DollarSign } from "lucide-react";
import { format, parseISO } from "date-fns";
import type { ContratoEspelho, ContratoFinanceiroBase, ModuloAdicionalPedido } from "../types";
import { fmtCurrency, getBadgeTipoLabel, getBadgeTipoColor } from "../helpers";

interface Props {
  espelho: ContratoEspelho;
  contratoFinanceiroBase?: ContratoFinanceiroBase | null;
}

export function EspelhoContrato({ espelho, contratoFinanceiroBase }: Props) {
  const tipoLabel = getBadgeTipoLabel(espelho.tipo, espelho.pedido?.tipo_pedido);
  const tipoColor = getBadgeTipoColor(tipoLabel);

  const valorMensalidade = espelho.pedido?.valor_mensalidade_final ?? espelho.plano?.valor_mensalidade_padrao ?? 0;
  const valorImplantacao = espelho.pedido?.valor_implantacao_final ?? espelho.plano?.valor_implantacao_padrao ?? 0;

  const toNumber = (value: unknown) => {
    if (typeof value === "number") return value;
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : 0;
  };

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-sm font-semibold flex items-center gap-2">
            <FileText className="h-4 w-4 text-primary" />
            Espelho do Contrato
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3 text-sm">
          <FieldReadonly label="Plano" value={espelho.plano?.nome || "—"} />
          <div className="grid grid-cols-2 gap-3">
            <FieldReadonly label="Mensalidade" value={fmtCurrency(valorMensalidade)} highlight />
            <FieldReadonly label="Implantação" value={fmtCurrency(valorImplantacao)} />
          </div>

          {espelho.pedido?.pagamento_implantacao_parcelas && (
            <FieldReadonly
              label="Parcelas previstas"
              value={`${espelho.pedido.pagamento_implantacao_parcelas}x de ${fmtCurrency(valorImplantacao / espelho.pedido.pagamento_implantacao_parcelas)}`}
            />
          )}

          <FieldReadonly
            label="Data de assinatura"
            value={format(parseISO(espelho.updated_at), "dd/MM/yyyy 'às' HH:mm")}
          />

          {/* Módulos do pedido */}
          {espelho.pedido?.modulos_adicionais && espelho.pedido.modulos_adicionais.length > 0 && (
            <>
              <Separator />
              <div className="space-y-2">
                <span className="text-xs font-medium text-muted-foreground flex items-center gap-1">
                  <Package className="h-3 w-3" /> Produtos/Serviços contratados
                </span>
                {espelho.pedido.modulos_adicionais.map((m: ModuloAdicionalPedido, i) => {
                  const qtd = Math.max(1, toNumber(m.quantidade ?? 1));
                  const valorPadraoUnit = toNumber(m.valor_mensalidade ?? m.valor_mensalidade_modulo ?? 0);
                  const valorNegociadoUnit = toNumber(
                    m.valor_mensalidade_final ?? m.valor_mensalidade_modulo ?? m.valor_mensalidade ?? 0,
                  );
                  const valorPadraoTotal = valorPadraoUnit * qtd;
                  const valorNegociadoTotal = valorNegociadoUnit * qtd;
                  const temDesconto = valorNegociadoTotal < valorPadraoTotal;

                  return (
                    <div key={i} className="rounded border border-border bg-muted/40 px-2 py-2 space-y-0.5">
                      <p className="text-xs font-medium">{m.nome}</p>
                      <p className="text-[11px] text-muted-foreground">Qtd: {qtd}</p>
                      <p className={`text-[11px] ${temDesconto ? "line-through text-muted-foreground" : "text-muted-foreground"}`}>
                        Valor padrão: {fmtCurrency(valorPadraoTotal)}/mês
                      </p>
                      <p className="text-[11px] font-semibold text-success">
                        Valor negociado: {fmtCurrency(valorNegociadoTotal)}/mês
                      </p>
                    </div>
                  );
                })}
              </div>
            </>
          )}

          {/* ZapSign link */}
          {espelho.zapsign?.sign_url && (
            <>
              <Separator />
              <a
                href={espelho.zapsign.sign_url}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-1.5 text-xs text-primary hover:underline"
              >
                <ExternalLink className="h-3 w-3" />
                Visualizar documento ZapSign
              </a>
            </>
          )}
        </CardContent>
      </Card>

      {/* Sub-registro: contrato base vinculado */}
      {espelho.contrato_base && (
        <Card className="border-dashed">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-semibold flex items-center gap-2">
              <Briefcase className="h-4 w-4 text-muted-foreground" />
              Contrato Base Vinculado
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 text-sm">
            <FieldReadonly label="Contrato" value={`#${espelho.contrato_base.numero_exibicao}`} />
            <FieldReadonly label="Cliente" value={espelho.contrato_base.cliente_nome} />
            <p className="text-xs text-muted-foreground bg-muted/50 rounded p-2">
              As alterações serão aplicadas ao contrato financeiro base #{espelho.contrato_base.numero_exibicao}
            </p>
          </CardContent>
        </Card>
      )}

      {/* Situação atual do contrato financeiro base */}
      {contratoFinanceiroBase && (
        <Card className="border-dashed border-primary/20">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-semibold flex items-center gap-2">
              <DollarSign className="h-4 w-4 text-primary" />
              Composição Atual do Boleto
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 text-xs">
            <div className="flex justify-between py-1">
              <span>Mensalidade ({contratoFinanceiroBase.plano_nome || "Plano"})</span>
              <span className="font-medium">{fmtCurrency(contratoFinanceiroBase.valor_mensalidade)}</span>
            </div>

            {contratoFinanceiroBase.parcelas_pendentes.map((p) => (
              <div key={p.id} className="flex justify-between py-1 text-amber-700 dark:text-amber-400">
                <span>{p.descricao} ({p.parcelas_pagas}/{p.numero_parcelas})</span>
                <span className="font-medium">{fmtCurrency(p.valor_por_parcela)}</span>
              </div>
            ))}

            {contratoFinanceiroBase.modulos_ativos.map((m) => (
              <div key={m.id} className="flex justify-between py-1 text-cyan-700 dark:text-cyan-400">
                <span>{m.nome}</span>
                <span className="font-medium">{fmtCurrency(m.valor_mensal)}</span>
              </div>
            ))}

            <Separator />
            <div className="flex justify-between font-bold text-sm text-foreground">
              <span>Total atual</span>
              <span>{fmtCurrency(
                contratoFinanceiroBase.valor_mensalidade
                + contratoFinanceiroBase.parcelas_pendentes.reduce((s, p) => s + p.valor_por_parcela, 0)
                + contratoFinanceiroBase.modulos_ativos.reduce((s, m) => s + m.valor_mensal, 0)
              )}</span>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

function FieldReadonly({ label, value, highlight }: { label: string; value: string; highlight?: boolean }) {
  return (
    <div>
      <span className="text-xs text-muted-foreground">{label}</span>
      <p className={`font-medium ${highlight ? "text-primary" : ""}`}>{value}</p>
    </div>
  );
}
