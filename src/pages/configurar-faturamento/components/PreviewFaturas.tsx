// ─── Coluna Direita: Preview das Próximas Faturas ─────────────────────────

import { useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Eye, User, Mail, Phone } from "lucide-react";
import type { ConfigFaturamentoForm, ContratoEspelho, FaturaPreviewMes } from "../types";
import { calcularPreviewFaturas, fmtCurrency } from "../helpers";

interface Props {
  form: ConfigFaturamentoForm;
  setForm: React.Dispatch<React.SetStateAction<ConfigFaturamentoForm>>;
  espelho: ContratoEspelho;
}

export function PreviewFaturas({ form, setForm, espelho }: Props) {
  const planoNome = espelho.plano?.nome || "Plano";

  const preview = useMemo(
    () => calcularPreviewFaturas(form, planoNome),
    [form, planoNome]
  );

  return (
    <div className="space-y-4">
      {/* Preview dinâmico */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-sm font-semibold flex items-center gap-2">
            <Eye className="h-4 w-4 text-primary" />
            Como ficarão as cobranças:
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {preview.map((mes, i) => (
            <MesPreviewCard key={`${mes.mes}-${mes.ano}`} mes={mes} index={i} />
          ))}

          {preview.length > 0 && (
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
        <div key={i} className="flex justify-between text-xs py-0.5">
          <span className="flex items-center gap-1.5">
            <ItemDot tipo={item.tipo} />
            {item.descricao}
          </span>
          <span className="font-medium">{fmtCurrency(item.valor)}</span>
        </div>
      ))}
      <Separator className="my-1" />
      <div className="flex justify-between text-sm font-bold text-primary">
        <span>TOTAL</span>
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
