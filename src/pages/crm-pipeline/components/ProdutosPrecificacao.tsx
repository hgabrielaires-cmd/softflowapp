import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Tag, DollarSign, AlertTriangle } from "lucide-react";

const formatCurrency = (v: number) =>
  v.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });

interface Props {
  totalImplantacao: number;
  totalMensalidade: number;
  descontoAtivo: boolean;
  setDescontoAtivo: (v: boolean) => void;
  descontoImplantacao: number;
  setDescontoImplantacao: (v: number) => void;
  descontoImplantacaoTipo: "R$" | "%";
  setDescontoImplantacaoTipo: (v: "R$" | "%") => void;
  descontoMensalidade: number;
  setDescontoMensalidade: (v: number) => void;
  descontoMensalidadeTipo: "R$" | "%";
  setDescontoMensalidadeTipo: (v: "R$" | "%") => void;
  persistDescontos: (impl: number, implTipo: string, mens: number, mensTipo: string) => void;
  limiteImplantacao: number;
  limiteMensalidade: number;
}

export function ProdutosPrecificacao({
  totalImplantacao, totalMensalidade,
  descontoAtivo, setDescontoAtivo,
  descontoImplantacao, setDescontoImplantacao,
  descontoImplantacaoTipo, setDescontoImplantacaoTipo,
  descontoMensalidade, setDescontoMensalidade,
  descontoMensalidadeTipo, setDescontoMensalidadeTipo,
  persistDescontos,
  limiteImplantacao, limiteMensalidade,
}: Props) {
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

  return (
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
                persistDescontos(0, "R$", 0, "R$");
              }
            }}
          />
        </label>
      </div>

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
              <Select value={descontoImplantacaoTipo} onValueChange={(v) => { setDescontoImplantacaoTipo(v as "R$" | "%"); persistDescontos(descontoImplantacao, v, descontoMensalidade, descontoMensalidadeTipo); }}>
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
                onBlur={() => persistDescontos(descontoImplantacao, descontoImplantacaoTipo, descontoMensalidade, descontoMensalidadeTipo)}
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
                  persistDescontos(parseFloat(descontoCalc.toFixed(2)), "R$", descontoMensalidade, descontoMensalidadeTipo);
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
              <Select value={descontoMensalidadeTipo} onValueChange={(v) => { setDescontoMensalidadeTipo(v as "R$" | "%"); persistDescontos(descontoImplantacao, descontoImplantacaoTipo, descontoMensalidade, v); }}>
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
                onBlur={() => persistDescontos(descontoImplantacao, descontoImplantacaoTipo, descontoMensalidade, descontoMensalidadeTipo)}
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
                  persistDescontos(descontoImplantacao, descontoImplantacaoTipo, parseFloat(descontoCalc.toFixed(2)), "R$");
                }}
                className="w-36 bg-background font-mono text-sm text-primary font-semibold"
              />
            </div>
          </div>

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
  );
}
