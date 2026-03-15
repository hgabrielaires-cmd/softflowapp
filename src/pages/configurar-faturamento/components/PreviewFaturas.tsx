// ─── Coluna Direita: Preview das Próximas Faturas ─────────────────────────

import { useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Eye, User, Mail, Phone, ArrowRight } from "lucide-react";
import type { ConfigFaturamentoForm, ContratoEspelho, ContratoFinanceiroBase, FaturaPreviewMes } from "../types";
import { calcularPreviewFaturas, calcularPreviewConsolidado, fmtCurrency } from "../helpers";

interface Props {
  form: ConfigFaturamentoForm;
  setForm: React.Dispatch<React.SetStateAction<ConfigFaturamentoForm>>;
  espelho: ContratoEspelho;
  contratoFinanceiroBase?: ContratoFinanceiroBase | null;
}

export function PreviewFaturas({ form, setForm, espelho, contratoFinanceiroBase }: Props) {
  const planoNome = espelho.plano?.nome || "Plano";
  const isSubRegistro = !!espelho.contrato_origem_id && !!contratoFinanceiroBase && !form.force_novo;
  const tipoPedido = espelho.pedido?.tipo_pedido || "";

  const preview = useMemo(() => {
    if (isSubRegistro && contratoFinanceiroBase) {
      return calcularPreviewConsolidado(form, contratoFinanceiroBase, espelho);
    }
    return calcularPreviewFaturas(form, planoNome);
  }, [form, planoNome, isSubRegistro, contratoFinanceiroBase, espelho]);

  // Calcular valor do boleto atual (antes da alteração) para comparação
  const valorBoletoAtual = useMemo(() => {
    if (!contratoFinanceiroBase) return 0;
    return contratoFinanceiroBase.valor_mensalidade
      + contratoFinanceiroBase.parcelas_pendentes.reduce((s, p) => s + p.valor_por_parcela, 0)
      + contratoFinanceiroBase.modulos_ativos.reduce((s, m) => s + m.valor_mensal, 0);
  }, [contratoFinanceiroBase]);

  return (
    <div className="space-y-4">
      {/* Comparação Antes × Depois para sub-registros */}
      {isSubRegistro && contratoFinanceiroBase && (
        <Card className="border-primary/20">
          <CardContent className="pt-4 space-y-2">
            <div className="flex items-center gap-2 justify-center">
              <div className="text-center">
                <p className="text-xs text-muted-foreground">Boleto atual</p>
                <p className="text-base font-bold text-muted-foreground">{fmtCurrency(valorBoletoAtual)}</p>
              </div>
              <ArrowRight className="h-4 w-4 text-primary" />
              <div className="text-center">
                <p className="text-xs text-muted-foreground">Após {tipoPedido.toLowerCase()}</p>
                <p className="text-base font-bold text-primary">{fmtCurrency(preview[0]?.total || 0)}</p>
              </div>
            </div>
            {preview[0] && preview[0].total !== valorBoletoAtual && (
              <p className="text-xs text-center text-muted-foreground">
                Diferença: <span className={preview[0].total > valorBoletoAtual ? "text-red-600 dark:text-red-400" : "text-emerald-600 dark:text-emerald-400"}>
                  {preview[0].total > valorBoletoAtual ? "+" : ""}{fmtCurrency(preview[0].total - valorBoletoAtual)}/mês
                </span>
              </p>
            )}
          </CardContent>
        </Card>
      )}

      {/* Preview dinâmico */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-sm font-semibold flex items-center gap-2">
            <Eye className="h-4 w-4 text-primary" />
            {isSubRegistro ? "Próximos boletos (consolidado):" : "Como ficarão as cobranças:"}
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {preview.map((mes, i) => (
            <MesPreviewCard key={`${mes.mes}-${mes.ano}`} mes={mes} index={i} />
          ))}

          {preview.length > 1 && (
            <p className="text-xs text-muted-foreground text-center pt-1">
              {preview[preview.length - 1].total === preview[preview.length - 2]?.total
                ? `Valor fixo recorrente: ${fmtCurrency(preview[preview.length - 1].total)}/mês`
                : `Mostrando os primeiros ${preview.length} meses`
              }
            </p>
          )}
        </CardContent>
      </Card>

      {/* Dados do cliente para cobrança */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-sm font-semibold flex items-center gap-2">
            <User className="h-4 w-4 text-primary" />
            Dados do Cliente para Cobrança
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="space-y-1">
            <Label className="text-xs text-muted-foreground">Nome / Razão Social</Label>
            <p className="text-sm font-medium">
              {espelho.cliente.razao_social || espelho.cliente.nome_fantasia}
            </p>
          </div>
          <div className="space-y-1">
            <Label className="text-xs text-muted-foreground">CPF / CNPJ</Label>
            <p className="text-sm font-medium font-mono">{espelho.cliente.cnpj_cpf}</p>
          </div>

          <Separator />

          <div className="space-y-1">
            <Label className="text-xs flex items-center gap-1">
              <Mail className="h-3 w-3" /> E-mail para cobrança
            </Label>
            <Input
              type="email"
              value={form.email_cobranca}
              onChange={(e) => setForm((f) => ({ ...f, email_cobranca: e.target.value }))}
              placeholder={espelho.cliente.email || "email@exemplo.com"}
              className="h-9"
            />
          </div>
          <div className="space-y-1">
            <Label className="text-xs flex items-center gap-1">
              <Phone className="h-3 w-3" /> WhatsApp para cobrança
            </Label>
            <Input
              type="tel"
              value={form.whatsapp_cobranca}
              onChange={(e) => setForm((f) => ({ ...f, whatsapp_cobranca: e.target.value }))}
              placeholder={espelho.cliente.telefone || "(00) 00000-0000"}
              className="h-9"
            />
          </div>
          <p className="text-xs text-muted-foreground">
            Estes dados serão utilizados para envio de cobranças.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}

function MesPreviewCard({ mes, index }: { mes: FaturaPreviewMes; index: number }) {
  if (mes.itens.length === 0) return null;

  return (
    <div className="rounded-lg border border-border p-3 space-y-1.5">
      <div className="flex items-center justify-between">
        <span className="text-xs font-semibold text-muted-foreground uppercase">
          Mês {index + 1} — {mes.label}
        </span>
      </div>
      {mes.itens.map((item, i) => (
        <div key={i} className={`flex justify-between text-xs py-0.5 ${item.riscado ? "line-through opacity-50" : ""}`}>
          <span className="flex items-center gap-1.5">
            <ItemDot tipo={item.tipo} />
            {item.descricao}
            {item.riscado && (
              <Badge variant="outline" className="text-[9px] px-1 py-0 border-red-300 text-red-500">já paga</Badge>
            )}
          </span>
          <span className="font-medium">{fmtCurrency(item.valor)}</span>
        </div>
      ))}
      <Separator className="my-1" />
      <div className="flex justify-between text-sm font-bold text-primary">
        <span>TOTAL (1 boleto)</span>
        <span>{fmtCurrency(mes.total)}</span>
      </div>
    </div>
  );
}

function ItemDot({ tipo }: { tipo: string }) {
  const colors: Record<string, string> = {
    mensalidade: "bg-primary",
    implantacao: "bg-amber-500",
    modulo: "bg-cyan-500",
    oa: "bg-blue-500",
  };
  return <span className={`inline-block h-1.5 w-1.5 rounded-full ${colors[tipo] || "bg-muted-foreground"}`} />;
}
