import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";
import { ExternalLink, Plus, Phone, Mail, Building2, Clock } from "lucide-react";
import { ChatConversa, STATUS_LABELS, ChatStatus } from "../types";
import { formatarTelefone, tempoRelativo } from "../helpers";
import { useChatHistorico } from "../useChatQueries";
import { format } from "date-fns";

interface Props {
  conversa: ChatConversa | null;
  onSelectHistorico?: (id: string) => void;
}

export default function ChatClientePanel({ conversa, onSelectHistorico }: Props) {
  const { data: historico } = useChatHistorico(
    conversa?.numero_cliente || null,
    conversa?.id || null
  );

  if (!conversa) return null;

  const cliente = conversa.cliente as any;
  const atendente = conversa.atendente as any;

  return (
    <ScrollArea className="h-full border-l border-border bg-card">
      <div className="p-3 space-y-3">
        {/* Client Info */}
        <Card className="shadow-none border">
          <CardHeader className="p-3 pb-1">
            <CardTitle className="text-sm flex items-center gap-1.5">
              <Building2 className="h-4 w-4" /> Cliente
            </CardTitle>
          </CardHeader>
          <CardContent className="p-3 pt-0 space-y-1.5 text-xs">
            {cliente ? (
              <>
                <p className="font-medium text-sm text-foreground">{cliente.nome_fantasia}</p>
                <p className="text-muted-foreground">CNPJ: {cliente.cnpj_cpf}</p>
                <a href={`/clientes`} className="text-primary hover:underline flex items-center gap-1 mt-1">
                  Ver cadastro <ExternalLink className="h-3 w-3" />
                </a>
              </>
            ) : (
              <div className="space-y-1.5">
                <p className="text-muted-foreground">Cliente não vinculado</p>
                <div className="flex items-center gap-1.5">
                  <Phone className="h-3 w-3 text-muted-foreground" />
                  <span>{formatarTelefone(conversa.numero_cliente)}</span>
                </div>
                {conversa.nome_cliente && (
                  <p className="font-medium">{conversa.nome_cliente}</p>
                )}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Conversation Info */}
        <Card className="shadow-none border">
          <CardHeader className="p-3 pb-1">
            <CardTitle className="text-sm flex items-center gap-1.5">
              <Clock className="h-4 w-4" /> Conversa
            </CardTitle>
          </CardHeader>
          <CardContent className="p-3 pt-0 space-y-1.5 text-xs">
            {conversa.protocolo && (
              <div className="flex justify-between">
                <span className="text-muted-foreground">Protocolo</span>
                <span className="font-mono font-medium">{conversa.protocolo}</span>
              </div>
            )}
            <div className="flex justify-between">
              <span className="text-muted-foreground">Status</span>
              <Badge variant="outline" className="text-[10px] h-4">
                {STATUS_LABELS[conversa.status as ChatStatus]}
              </Badge>
            </div>
            {conversa.setor && (
              <div className="flex justify-between">
                <span className="text-muted-foreground">Setor</span>
                <span>{(conversa.setor as any)?.nome}</span>
              </div>
            )}
            {atendente?.full_name && (
              <div className="flex justify-between">
                <span className="text-muted-foreground">Atendente</span>
                <span>{atendente.full_name}</span>
              </div>
            )}
            {conversa.iniciado_em && (
              <div className="flex justify-between">
                <span className="text-muted-foreground">Iniciada em</span>
                <span>{format(new Date(conversa.iniciado_em), "dd/MM HH:mm")}</span>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Quick Actions */}
        <Card className="shadow-none border">
          <CardHeader className="p-3 pb-1">
            <CardTitle className="text-sm">Ações rápidas</CardTitle>
          </CardHeader>
          <CardContent className="p-3 pt-0 space-y-1.5">
            <Button variant="ghost" size="sm" className="w-full justify-start text-xs h-8 gap-2" disabled>
              <Plus className="h-3 w-3" /> Abrir Ticket
            </Button>
            <Button variant="ghost" size="sm" className="w-full justify-start text-xs h-8 gap-2" disabled>
              <Plus className="h-3 w-3" /> Vincular CRM
            </Button>
          </CardContent>
        </Card>

        {/* History */}
        {historico && historico.length > 0 && (
          <Card className="shadow-none border">
            <CardHeader className="p-3 pb-1">
              <CardTitle className="text-sm">Histórico</CardTitle>
            </CardHeader>
            <CardContent className="p-3 pt-0 space-y-1.5">
              {historico.map((h: any) => (
                <button
                  key={h.id}
                  onClick={() => onSelectHistorico?.(h.id)}
                  className="w-full text-left text-xs p-2 rounded hover:bg-muted/50 transition-colors"
                >
                  <div className="flex justify-between">
                    <span className="font-mono">{h.protocolo}</span>
                    <Badge variant="outline" className="text-[10px] h-4">
                      {h.status}
                    </Badge>
                  </div>
                  <span className="text-muted-foreground">
                    {tempoRelativo(h.created_at)}
                  </span>
                </button>
              ))}
            </CardContent>
          </Card>
        )}
      </div>
    </ScrollArea>
  );
}
