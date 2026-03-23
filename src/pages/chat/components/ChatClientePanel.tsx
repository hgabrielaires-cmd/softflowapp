import { useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { ExternalLink, Plus, Phone, Building2, Clock, Search, X, Star, User } from "lucide-react";
import { cn } from "@/lib/utils";
import { ChatConversa, STATUS_LABELS, ChatStatus } from "../types";
import { formatarTelefone, tempoRelativo } from "../helpers";
import { useChatHistorico } from "../useChatQueries";
import { format } from "date-fns";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { useQueryClient } from "@tanstack/react-query";
import ChatHistoricoDrawer from "./ChatHistoricoDrawer";

interface Props {
  conversa: ChatConversa | null;
  onSelectHistorico?: (id: string) => void;
}

export default function ChatClientePanel({ conversa, onSelectHistorico }: Props) {
  const qc = useQueryClient();
  const [termoBusca, setTermoBusca] = useState("");
  const [buscando, setBuscando] = useState(false);
  const [clientesEncontrados, setClientesEncontrados] = useState<any[]>([]);
  const [buscaFeita, setBuscaFeita] = useState(false);
  const [drawerAberto, setDrawerAberto] = useState(false);
  const [historicoSelecionado, setHistoricoSelecionado] = useState<any>(null);

  const { data: historico } = useChatHistorico(
    conversa?.numero_cliente || null,
    conversa?.id || null
  );

  if (!conversa) return null;

  const cliente = conversa.cliente as any;
  const atendente = conversa.atendente as any;

  async function buscarCliente() {
    const termo = termoBusca.trim();
    if (!termo) return;
    setBuscando(true);
    setBuscaFeita(true);
    try {
      const limpo = termo.replace(/\D/g, "");
      const isNumerico = limpo.length >= 3 && /^\d+$/.test(limpo);

      let query = supabase
        .from("clientes")
        .select("id, nome_fantasia, razao_social, cnpj_cpf, apelido, filial_id")
        .eq("ativo", true)
        .limit(10);

      if (isNumerico && limpo.length >= 11) {
        query = query.eq("cnpj_cpf", limpo);
      } else {
        query = query.or(
          `nome_fantasia.ilike.%${termo}%,razao_social.ilike.%${termo}%,apelido.ilike.%${termo}%,cnpj_cpf.ilike.%${limpo}%`
        );
      }

      const { data, error } = await query;
      if (error) throw error;
      setClientesEncontrados(data || []);
    } catch (e: any) {
      toast.error("Erro na busca: " + e.message);
    } finally {
      setBuscando(false);
    }
  }

  async function vincularCliente(clienteId: string) {
    try {
      const { error } = await supabase
        .from("chat_conversas")
        .update({ cliente_id: clienteId })
        .eq("id", conversa!.id);
      if (error) throw error;

      await supabase.from("chat_mensagens").insert({
        conversa_id: conversa!.id,
        tipo: "sistema",
        conteudo: `Cliente vinculado: ${clienteEncontrado?.nome_fantasia}`,
        remetente: "sistema",
      });

      toast.success("Cliente vinculado!");
      qc.invalidateQueries({ queryKey: ["chat-conversas"] });
      setClienteEncontrado(null);
      setCnpjBusca("");
      setBuscaFeita(false);
    } catch (e: any) {
      toast.error("Erro ao vincular: " + e.message);
    }
  }

  async function desvincularCliente() {
    try {
      const { error } = await supabase
        .from("chat_conversas")
        .update({ cliente_id: null })
        .eq("id", conversa!.id);
      if (error) throw error;

      await supabase.from("chat_mensagens").insert({
        conversa_id: conversa!.id,
        tipo: "sistema",
        conteudo: "Cliente desvinculado da conversa",
        remetente: "sistema",
      });

      toast.success("Cliente desvinculado!");
      qc.invalidateQueries({ queryKey: ["chat-conversas"] });
    } catch (e: any) {
      toast.error("Erro: " + e.message);
    }
  }

  function formatCnpj(v: string) {
    const n = v.replace(/\D/g, "").slice(0, 14);
    if (n.length <= 11) return n.replace(/(\d{3})(\d{3})(\d{3})(\d{0,2})/, "$1.$2.$3-$4");
    return n.replace(/(\d{2})(\d{3})(\d{3})(\d{4})(\d{0,2})/, "$1.$2.$3/$4-$5");
  }

  return (
    <>
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
                  {cliente.razao_social && <p className="text-muted-foreground">{cliente.razao_social}</p>}
                  <p className="text-muted-foreground">CNPJ: {formatCnpj(cliente.cnpj_cpf)}</p>
                  <div className="flex items-center gap-2 mt-1">
                    <a href={`/clientes`} className="text-primary hover:underline flex items-center gap-1">
                      Ver cadastro <ExternalLink className="h-3 w-3" />
                    </a>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-5 w-5 p-0 text-muted-foreground hover:text-destructive"
                      onClick={desvincularCliente}
                      title="Desvincular cliente"
                    >
                      <X className="h-3 w-3" />
                    </Button>
                  </div>
                </>
              ) : (
                <div className="space-y-2">
                  <div className="flex items-center gap-1.5">
                    <Phone className="h-3 w-3 text-muted-foreground" />
                    <span>{formatarTelefone(conversa.numero_cliente)}</span>
                  </div>
                  {conversa.nome_cliente && (
                    <p className="font-medium">{conversa.nome_cliente}</p>
                  )}
                  <p className="text-muted-foreground">Cliente não vinculado</p>

                  {/* CNPJ Search */}
                  <div className="space-y-1.5 pt-1">
                    <div className="flex gap-1">
                      <Input
                        placeholder="Buscar por CNPJ..."
                        value={cnpjBusca}
                        onChange={(e) => setCnpjBusca(formatCnpj(e.target.value))}
                        className="h-7 text-xs"
                      />
                      <Button size="sm" className="h-7 px-2" onClick={buscarPorCnpj} disabled={buscando}>
                        <Search className="h-3 w-3" />
                      </Button>
                    </div>

                    {buscaFeita && clienteEncontrado && (
                      <div className="border rounded-md p-2 space-y-1 bg-muted/30">
                        <p className="font-medium text-foreground">{clienteEncontrado.nome_fantasia}</p>
                        {clienteEncontrado.razao_social && <p className="text-muted-foreground">{clienteEncontrado.razao_social}</p>}
                        <p className="text-muted-foreground">CNPJ: {formatCnpj(clienteEncontrado.cnpj_cpf)}</p>
                        <Button size="sm" className="h-6 text-xs w-full mt-1" onClick={() => vincularCliente(clienteEncontrado.id)}>
                          Vincular este cliente
                        </Button>
                      </div>
                    )}

                    {buscaFeita && !clienteEncontrado && !buscando && (
                      <p className="text-muted-foreground text-center py-1">Nenhum cliente com este CNPJ.</p>
                    )}
                  </div>
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
                    onClick={() => {
                      setHistoricoSelecionado(h);
                      setDrawerAberto(true);
                    }}
                    className="w-full text-left text-xs p-2 rounded hover:bg-muted/50 transition-colors"
                  >
                    <div className="flex justify-between">
                      <span className="font-mono">{h.protocolo}</span>
                      <Badge variant="outline" className="text-[10px] h-4">
                        {h.status}
                      </Badge>
                    </div>
                    {h.nps_nota != null && (
                      <div className="flex items-center gap-0.5 mt-0.5">
                        {Array.from({ length: 5 }).map((_, i) => (
                          <Star key={i} className={cn("h-2.5 w-2.5", i < h.nps_nota ? "text-yellow-500 fill-yellow-500" : "text-muted-foreground/30")} />
                        ))}
                      </div>
                    )}
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

      <ChatHistoricoDrawer
        conversaId={historicoSelecionado?.id || null}
        open={drawerAberto}
        onClose={() => setDrawerAberto(false)}
        protocolo={historicoSelecionado?.protocolo}
        data={historicoSelecionado?.created_at}
      />
    </>
  );
}
