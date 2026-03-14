// ─── Coluna Central: Configuração da Cobrança ─────────────────────────────

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import { CreditCard, Building, Package, Wrench } from "lucide-react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import type { ConfigFaturamentoForm, ContratoEspelho, ModuloConfig } from "../types";
import { PARCELAS_OPTIONS, FORMAS_PAGAMENTO_CONFIG, DIAS_VENCIMENTO } from "../constants";
import { fmtCurrency, parseCurrencyInput, formatCurrencyInput } from "../helpers";

interface Props {
  form: ConfigFaturamentoForm;
  setForm: React.Dispatch<React.SetStateAction<ConfigFaturamentoForm>>;
  espelho: ContratoEspelho;
}

export function ConfiguracaoCobranca({ form, setForm, espelho }: Props) {
  const isOA = espelho.tipo === "OA";

  function updateField<K extends keyof ConfigFaturamentoForm>(key: K, value: ConfigFaturamentoForm[K]) {
    setForm((f) => ({ ...f, [key]: value }));
  }

  function handleCurrencyChange(field: keyof ConfigFaturamentoForm, raw: string) {
    updateField(field, parseCurrencyInput(raw) as any);
  }

  return (
    <div className="space-y-4">
      {/* Seção Implantação */}
      {form.valor_implantacao > 0 && (
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-semibold flex items-center gap-2">
              <Building className="h-4 w-4 text-primary" />
              Implantação
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <Label className="text-xs">Valor total da implantação</Label>
                <Input
                  type="number"
                  step="0.01"
                  min="0"
                  value={form.valor_implantacao || ""}
                  onChange={(e) => updateField("valor_implantacao", Number(e.target.value))}
                  className="h-9"
                />
              </div>
              <div className="space-y-1">
                <Label className="text-xs">Parcelamento</Label>
                <Select
                  value={String(form.parcelas_implantacao)}
                  onValueChange={(v) => updateField("parcelas_implantacao", Number(v))}
                >
                  <SelectTrigger className="h-9"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {PARCELAS_OPTIONS.map((p) => (
                      <SelectItem key={p} value={String(p)}>{p}x</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            {form.parcelas_implantacao > 1 && form.valor_implantacao > 0 && (
              <div className="flex items-center gap-2 text-xs">
                <Badge variant="outline" className="bg-primary/5 text-primary border-primary/20">
                  {fmtCurrency(Math.round((form.valor_implantacao / form.parcelas_implantacao) * 100) / 100)} por parcela
                </Badge>
                <span className="text-muted-foreground">
                  Será somado à mensalidade nos primeiros {form.parcelas_implantacao} meses
                </span>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Seção Mensalidade */}
      {!isOA && (
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-semibold flex items-center gap-2">
              <CreditCard className="h-4 w-4 text-primary" />
              Mensalidade
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <Label className="text-xs">Valor mensalidade base</Label>
                <Input
                  type="number"
                  step="0.01"
                  min="0"
                  value={form.valor_mensalidade || ""}
                  onChange={(e) => updateField("valor_mensalidade", Number(e.target.value))}
                  className="h-9"
                />
              </div>
              <div className="space-y-1">
                <Label className="text-xs">Dia de vencimento (1-28)</Label>
                <Select
                  value={String(form.dia_vencimento)}
                  onValueChange={(v) => updateField("dia_vencimento", Number(v))}
                >
                  <SelectTrigger className="h-9"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {DIAS_VENCIMENTO.map((d) => (
                      <SelectItem key={d} value={String(d)}>{d}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <Label className="text-xs">Forma de pagamento</Label>
                <Select
                  value={form.forma_pagamento}
                  onValueChange={(v) => updateField("forma_pagamento", v)}
                >
                  <SelectTrigger className="h-9"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {FORMAS_PAGAMENTO_CONFIG.map((f) => (
                      <SelectItem key={f.value} value={f.value}>{f.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1">
                <Label className="text-xs">Mês de início</Label>
                <div className="flex gap-2">
                  <Select
                    value={String(form.mes_inicio)}
                    onValueChange={(v) => updateField("mes_inicio", Number(v))}
                  >
                    <SelectTrigger className="h-9 flex-1"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {Array.from({ length: 12 }, (_, i) => (
                        <SelectItem key={i + 1} value={String(i + 1)}>
                          {format(new Date(2024, i, 1), "MMM", { locale: ptBR })}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <Input
                    type="number"
                    min="2024"
                    max="2030"
                    value={form.ano_inicio}
                    onChange={(e) => updateField("ano_inicio", Number(e.target.value))}
                    className="h-9 w-20"
                  />
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Seção Módulos Adicionais */}
      {!isOA && (
        <Card>
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <CardTitle className="text-sm font-semibold flex items-center gap-2">
                <Package className="h-4 w-4 text-primary" />
                Módulos Adicionais
              </CardTitle>
              <Button variant="outline" size="sm" className="h-7 text-xs gap-1" onClick={addModulo}>
                <Plus className="h-3 w-3" /> Adicionar
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            {form.modulos.length === 0 ? (
              <p className="text-xs text-muted-foreground text-center py-3">Nenhum módulo adicional</p>
            ) : (
              <div className="space-y-2">
                {form.modulos.map((mod, i) => (
                  <div key={mod.id} className="space-y-1.5 p-2 bg-muted/30 rounded-lg border border-border">
                    <div className="grid grid-cols-[1fr_auto] gap-2 items-end">
                      <div className="space-y-1">
                        <Label className="text-xs">Nome</Label>
                        <Input
                          value={mod.nome}
                          onChange={(e) => updateModulo(i, "nome", e.target.value)}
                          placeholder="Nome do módulo"
                          className="h-8 text-xs"
                        />
                      </div>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8 text-destructive hover:text-destructive"
                        onClick={() => removeModulo(i)}
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </Button>
                    </div>
                    <div className="grid grid-cols-[1fr_1fr_1fr_1fr] gap-2 items-end">
                      <div className="space-y-1">
                        <Label className="text-xs">Valor unit.</Label>
                        <Input
                          type="number"
                          step="0.01"
                          min="0"
                          value={mod.valor_unitario || ""}
                          onChange={(e) => updateModulo(i, "valor_unitario", Number(e.target.value))}
                          className="h-8 text-xs"
                        />
                      </div>
                      <div className="space-y-1">
                        <Label className="text-xs">Qtd</Label>
                        <Input
                          type="number"
                          min="1"
                          value={mod.quantidade || 1}
                          onChange={(e) => updateModulo(i, "quantidade", Number(e.target.value))}
                          className="h-8 text-xs"
                        />
                      </div>
                      <div className="space-y-1">
                        <Label className="text-xs">Valor/mês</Label>
                        <Input
                          value={fmtCurrency(mod.valor_mensal)}
                          disabled
                          className="h-8 text-xs bg-muted font-medium"
                        />
                      </div>
                      <div className="space-y-1">
                        <Label className="text-xs">Início</Label>
                        <Input
                          type="date"
                          value={mod.data_inicio}
                          onChange={(e) => updateModulo(i, "data_inicio", e.target.value)}
                          className="h-8 text-xs"
                        />
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Seção OA */}
      {isOA && (
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-semibold flex items-center gap-2">
              <Wrench className="h-4 w-4 text-primary" />
              Ordem de Atendimento
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1 col-span-2">
                <Label className="text-xs">Descrição da OA</Label>
                <Input
                  value={form.oa_descricao}
                  onChange={(e) => updateField("oa_descricao", e.target.value)}
                  className="h-9"
                />
              </div>
              <div className="space-y-1">
                <Label className="text-xs">Valor</Label>
                <Input
                  type="number"
                  step="0.01"
                  min="0"
                  value={form.oa_valor || ""}
                  onChange={(e) => updateField("oa_valor", Number(e.target.value))}
                  className="h-9"
                />
              </div>
              <div className="space-y-1">
                <Label className="text-xs">Mês de referência</Label>
                <div className="flex gap-2">
                  <Select
                    value={String(form.oa_mes_referencia)}
                    onValueChange={(v) => updateField("oa_mes_referencia", Number(v))}
                  >
                    <SelectTrigger className="h-9 flex-1"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {Array.from({ length: 12 }, (_, i) => (
                        <SelectItem key={i + 1} value={String(i + 1)}>
                          {format(new Date(2024, i, 1), "MMM", { locale: ptBR })}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <Input
                    type="number"
                    min="2024"
                    max="2030"
                    value={form.oa_ano_referencia}
                    onChange={(e) => updateField("oa_ano_referencia", Number(e.target.value))}
                    className="h-9 w-20"
                  />
                </div>
              </div>
            </div>
            <div className="space-y-1">
              <Label className="text-xs">Observação interna</Label>
              <Textarea
                value={form.oa_observacao}
                onChange={(e) => updateField("oa_observacao", e.target.value)}
                className="min-h-[60px]"
                placeholder="Observação opcional..."
              />
            </div>
          </CardContent>
        </Card>
      )}

      {/* Observações gerais */}
      <Card>
        <CardContent className="pt-4">
          <div className="space-y-1">
            <Label className="text-xs">Observações gerais</Label>
            <Textarea
              value={form.observacoes}
              onChange={(e) => updateField("observacoes", e.target.value)}
              className="min-h-[60px]"
              placeholder="Observações internas sobre este faturamento..."
            />
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
