import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { AlertTriangle, ExternalLink } from "lucide-react";
import { useNavigate } from "react-router-dom";
import type { AlertaAtencao } from "../types";

const TIPO_CONFIG = {
  tarefa_atrasada: { label: "Tarefa atrasada", icon: "🟡", color: "bg-amber-500" },
  previsao_vencida: { label: "Previsão vencida", icon: "🟠", color: "bg-orange-500" },
  sem_interacao: { label: "Sem interação", icon: "🔴", color: "bg-red-500" },
} as const;

export function AlertasAtencaoPanel({ data, isLoading }: { data?: AlertaAtencao[]; isLoading: boolean }) {
  const navigate = useNavigate();

  if (isLoading) {
    return (
      <Card className="border-none shadow-card">
        <CardHeader className="pb-2"><CardTitle className="text-sm">Alertas</CardTitle></CardHeader>
        <CardContent><Skeleton className="h-32" /></CardContent>
      </Card>
    );
  }

  const items = (data || []).slice(0, 20);

  return (
    <Card className="border-none shadow-card">
      <CardHeader className="pb-2">
        <div className="flex items-center gap-2">
          <AlertTriangle className="h-4 w-4 text-amber-500" />
          <CardTitle className="text-sm">⚠️ Requer Atenção</CardTitle>
          {items.length > 0 && (
            <Badge variant="destructive" className="text-[10px] h-5">{items.length}</Badge>
          )}
        </div>
      </CardHeader>
      <CardContent>
        {items.length === 0 ? (
          <div className="flex flex-col items-center py-6 text-muted-foreground">
            <span className="text-2xl mb-1">✅</span>
            <p className="text-xs">Tudo em dia! Nenhum alerta.</p>
          </div>
        ) : (
          <div className="max-h-64 overflow-y-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="text-[10px] h-7">Cliente</TableHead>
                  <TableHead className="text-[10px] h-7">Etapa</TableHead>
                  <TableHead className="text-[10px] h-7">Responsável</TableHead>
                  <TableHead className="text-[10px] h-7">Motivo</TableHead>
                  <TableHead className="text-[10px] h-7 w-8"></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {items.map((a, i) => {
                  const cfg = TIPO_CONFIG[a.tipo];
                  return (
                    <TableRow key={`${a.oportunidade_id}-${a.tipo}-${i}`}>
                      <TableCell className="text-xs py-1.5">
                        <div>
                          <p className="font-medium truncate max-w-[120px]">{a.titulo}</p>
                          {a.cliente_nome && <p className="text-muted-foreground text-[10px] truncate">{a.cliente_nome}</p>}
                        </div>
                      </TableCell>
                      <TableCell className="text-xs py-1.5">{a.etapa_nome}</TableCell>
                      <TableCell className="text-xs py-1.5">{a.responsavel_nome || "-"}</TableCell>
                      <TableCell className="text-xs py-1.5">
                        <Badge variant="outline" className="text-[9px] gap-0.5">
                          {cfg.icon} {cfg.label}
                          {a.dias > 0 && ` (${a.dias}d)`}
                        </Badge>
                      </TableCell>
                      <TableCell className="py-1.5">
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-6 w-6"
                          onClick={() => navigate(`/crm-pipeline?oportunidade=${a.oportunidade_id}`)}
                        >
                          <ExternalLink className="h-3 w-3" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
