import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Skeleton } from "@/components/ui/skeleton";
import { TrendingUp, TrendingDown, Target, DollarSign, Repeat, BarChart3, CheckCircle2 } from "lucide-react";
import type { KpiFinalizadas as KpiType } from "../types";
import { formatValor, calcVariacao } from "../helpers";

function VariacaoBadge({ atual, anterior }: { atual: number; anterior: number }) {
  if (anterior === 0 && atual === 0) return null;
  if (anterior === 0) return <span className="text-xs text-muted-foreground">—</span>;
  const v = calcVariacao(atual, anterior);
  if (v === 0) return null;
  const up = v > 0;
  return (
    <span className={`inline-flex items-center gap-0.5 text-xs font-semibold ${up ? "text-emerald-600" : "text-red-500"}`}>
      {up ? <TrendingUp className="h-3 w-3" /> : <TrendingDown className="h-3 w-3" />}
      {Math.abs(v).toFixed(1)}%
    </span>
  );
}

export function KpiFinalizadasCards({ data, isLoading }: { data?: KpiType; isLoading: boolean }) {
  if (isLoading) {
    return (
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-3">
        {[1, 2, 3, 4, 5].map(i => (
          <Card key={i}><CardContent className="p-4"><Skeleton className="h-16" /></CardContent></Card>
        ))}
      </div>
    );
  }
  if (!data) return null;

  return (
    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-3">
      {/* Total Finalizadas */}
      <Card className="border-none shadow-card">
        <CardContent className="p-4">
          <div className="flex items-center gap-2 mb-2">
            <div className="p-1.5 rounded-lg bg-primary/10">
              <Target className="h-4 w-4 text-primary" />
            </div>
            <span className="text-xs text-muted-foreground font-medium">Finalizadas</span>
          </div>
          <p className="text-2xl font-bold text-foreground">{data.totalFinalizadas}</p>
          <div className="flex items-center gap-2 mt-1 text-xs">
            <span className="text-emerald-600">✅ {data.ganhas}</span>
            <span className="text-red-500">❌ {data.perdidas}</span>
          </div>
          <Badge variant="secondary" className="mt-1.5 text-[10px]">
            {data.taxaGanho.toFixed(0)}% taxa ganho
          </Badge>
        </CardContent>
      </Card>

      {/* Valor Implantação */}
      <Card className="border-none shadow-card">
        <CardContent className="p-4">
          <div className="flex items-center gap-2 mb-2">
            <div className="p-1.5 rounded-lg bg-purple-500/10">
              <DollarSign className="h-4 w-4 text-purple-600" />
            </div>
            <span className="text-xs text-muted-foreground font-medium">Implantação</span>
          </div>
          <p className="text-lg font-bold text-foreground">{formatValor(data.valorImplantacao)}</p>
          <VariacaoBadge atual={data.valorImplantacao} anterior={data.valorImplantacaoAnterior} />
        </CardContent>
      </Card>

      {/* Valor Mensalidade */}
      <Card className="border-none shadow-card">
        <CardContent className="p-4">
          <div className="flex items-center gap-2 mb-2">
            <div className="p-1.5 rounded-lg bg-emerald-500/10">
              <Repeat className="h-4 w-4 text-emerald-600" />
            </div>
            <span className="text-xs text-muted-foreground font-medium">Mensalidade</span>
          </div>
          <p className="text-lg font-bold text-foreground">{formatValor(data.valorMensalidade)}</p>
          <VariacaoBadge atual={data.valorMensalidade} anterior={data.valorMensalidadeAnterior} />
        </CardContent>
      </Card>

      {/* Ticket Médio */}
      <Card className="border-none shadow-card">
        <CardContent className="p-4">
          <div className="flex items-center gap-2 mb-2">
            <div className="p-1.5 rounded-lg bg-blue-500/10">
              <BarChart3 className="h-4 w-4 text-blue-600" />
            </div>
            <span className="text-xs text-muted-foreground font-medium">Ticket Médio</span>
          </div>
          <p className="text-lg font-bold text-foreground">{formatValor(data.ticketMedio)}</p>
          <VariacaoBadge atual={data.ticketMedio} anterior={data.ticketMedioAnterior} />
        </CardContent>
      </Card>

      {/* Taxa de Conversão */}
      <Card className="border-none shadow-card">
        <CardContent className="p-4">
          <div className="flex items-center gap-2 mb-2">
            <div className="p-1.5 rounded-lg bg-green-500/10">
              <CheckCircle2 className="h-4 w-4 text-green-600" />
            </div>
            <span className="text-xs text-muted-foreground font-medium">Conversão</span>
          </div>
          <p className="text-2xl font-bold text-foreground">{data.taxaGanho.toFixed(1)}%</p>
          <Progress value={data.taxaGanho} className="h-1.5 mt-2" />
          <VariacaoBadge atual={data.taxaGanho} anterior={data.taxaConversaoAnterior} />
        </CardContent>
      </Card>
    </div>
  );
}
