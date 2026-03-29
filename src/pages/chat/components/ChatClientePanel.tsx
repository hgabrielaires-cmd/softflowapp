import { useState, useEffect } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Tooltip, TooltipContent, TooltipTrigger, TooltipProvider } from "@/components/ui/tooltip";
import { ExternalLink, Plus, Phone, Building2, Clock, Search, X, Star, User, CheckCircle2, RefreshCw } from "lucide-react";
import { cn, normalizeBRPhone } from "@/lib/utils";
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

interface EmpresaContato {
  contato_id: string;
  contato_nome: string;
  contato_telefone: string;
  empresa_id: string;
  empresa_nome: string;
  empresa_cnpj: string;
}

export default function ChatClientePanel({ conversa, onSelectHistorico }: Props) {
  const qc = useQueryClient();
  const [termoBusca, setTermoBusca] = useState("");
  const [buscando, setBuscando] = useState(false);
  const [clientesEncontrados, setClientesEncontrados] = useState<any[]>([]);
  const [buscaFeita, setBuscaFeita] = useState(false);
  const [drawerAberto, setDrawerAberto] = useState(false);
  const [historicoSelecionado, setHistoricoSelecionado] = useState<any>(null);
  const [trocarOpen, setTrocarOpen] = useState(false);
  const [trocarTermo, setTrocarTermo] = useState("");
  const [trocarResultados, setTrocarResultados] = useState<any[]>([]);
  const [trocarBuscando, setTrocarBuscando] = useState(false);

  // Auto-link state
  const [empresasDetectadas, setEmpresasDetectadas] = useState<EmpresaContato[]>([]);
  const [autoLinkFeito, setAutoLinkFeito] = useState(false);
  const [autoLinkMsg, setAutoLinkMsg] = useState<string | null>(null);

  const { data: historico } = useChatHistorico(
    conversa?.numero_cliente || null,
    conversa?.id || null
  );

  // Auto-detect company by phone number
  useEffect(() => {
    if (!conversa?.id || !conversa.numero_cliente) return;
    // If already linked, skip
    if (conversa.cliente_id) {
      setEmpresasDetectadas([]);
      setAutoLinkFeito(false);
      setAutoLinkMsg(null);
      return;
    }

    const detectar = async () => {
      const limpo = conversa.numero_cliente.replace(/\D/g, "");
      if (limpo.length < 8) return;
      const ultimos8 = limpo.slice(-8);

      // Search contacts by phone
      const { data: contatos } = await supabase
        .from("cliente_contatos")
        .select("id, nome, telefone, cliente_id, clientes(id, nome_fantasia, cnpj_cpf)")
        .ilike("telefone", `%${ultimos8}%`)
        .eq("ativo", true)
        .limit(10);

      if (!contatos || contatos.length === 0) {
        // Try last closed conversation for this number (flexible match)
        const { data: lastConvs } = await supabase
          .from("chat_conversas")
          .select("cliente_id, numero_cliente, clientes:clientes!chat_conversas_cliente_id_fkey(id, nome_fantasia, cnpj_cpf)")
          .eq("status", "encerrado")
          .not("cliente_id", "is", null)
          .ilike("numero_cliente", `%${ultimos8}%`)
          .neq("id", conversa.id)
          .order("encerrado_em", { ascending: false })
          .limit(1);

        const lastConv = lastConvs?.[0] || null;

        if (lastConv?.cliente_id && lastConv.clientes) {
          // Auto-link from previous conversation
          await vincularClienteAuto(lastConv.cliente_id, (lastConv.clientes as any).nome_fantasia, true);
        }
        setEmpresasDetectadas([]);
        return;
      }

      // Build unique companies list
      const empresasMap = new Map<string, EmpresaContato>();
      for (const c of contatos) {
        const cli = c.clientes as any;
        if (cli?.id && !empresasMap.has(cli.id)) {
          empresasMap.set(cli.id, {
            contato_id: c.id,
            contato_nome: c.nome,
            contato_telefone: c.telefone || "",
            empresa_id: cli.id,
            empresa_nome: cli.nome_fantasia,
            empresa_cnpj: cli.cnpj_cpf,
          });
        }
      }

      const empresas = Array.from(empresasMap.values());

      if (empresas.length === 1) {
        // Single company → auto-link
        await vincularClienteAuto(empresas[0].empresa_id, empresas[0].empresa_nome, false);
        setEmpresasDetectadas([]);
      } else if (empresas.length > 1) {
        // Multiple companies → show selector
        setEmpresasDetectadas(empresas);
      }
    };

    detectar();
  }, [conversa?.id, conversa?.numero_cliente, conversa?.cliente_id]);

  /** Garante que existe um registro em cliente_contatos para este número/empresa */
  async function garantirContato(clienteId: string) {
    if (!conversa) return;
    const telefone = conversa.numero_cliente?.replace(/\D/g, "") || "";
    if (telefone.length < 8) return;
    const ultimos8 = telefone.slice(-8);

    // Check if contact already exists for this client + phone
    const { data: existing } = await supabase
      .from("cliente_contatos")
      .select("id")
      .eq("cliente_id", clienteId)
      .ilike("telefone", `%${ultimos8}%`)
      .eq("ativo", true)
      .limit(1);

    if (existing && existing.length > 0) return; // already exists

    // Create contact record with normalized phone
    await supabase.from("cliente_contatos").insert({
      cliente_id: clienteId,
      nome: conversa.nome_cliente || "Contato via Chat",
      telefone: normalizeBRPhone(conversa.numero_cliente),
      decisor: false,
      ativo: true,
    });
  }

  async function vincularClienteAuto(clienteId: string, nomeEmpresa: string, fromHistory: boolean) {
    if (!conversa) return;
    try {
      const { error } = await supabase
        .from("chat_conversas")
        .update({ cliente_id: clienteId })
        .eq("id", conversa.id);
      if (error) throw error;

      // Ensure contact record exists
      await garantirContato(clienteId);

      await supabase.from("chat_mensagens").insert({
        conversa_id: conversa.id,
        tipo: "sistema",
        conteudo: `Cliente vinculado automaticamente: ${nomeEmpresa}`,
        remetente: "sistema",
      });

      setAutoLinkFeito(true);
      setAutoLinkMsg(`Vinculado automaticamente${fromHistory ? " (histórico)" : ""}`);
      qc.invalidateQueries({ queryKey: ["chat-conversas"] });
    } catch {
      // silent
    }
  }

  async function selecionarEmpresa(emp: EmpresaContato) {
    if (!conversa) return;
    try {
      const { error } = await supabase
        .from("chat_conversas")
        .update({ cliente_id: emp.empresa_id })
        .eq("id", conversa.id);
      if (error) throw error;

      await garantirContato(emp.empresa_id);

      await supabase.from("chat_mensagens").insert({
        conversa_id: conversa.id,
        tipo: "sistema",
        conteudo: `Cliente vinculado: ${emp.empresa_nome}`,
        remetente: "sistema",
      });

      toast.success("Empresa vinculada!");
      setEmpresasDetectadas([]);
      qc.invalidateQueries({ queryKey: ["chat-conversas"] });
    } catch (e: any) {
      toast.error("Erro: " + e.message);
    }
  }

  // Trocar empresa - busca
  useEffect(() => {
    if (!trocarOpen) {
      setTrocarTermo("");
      setTrocarResultados([]);
      return;
    }
    const loadRecentes = async () => {
      const { data } = await supabase
        .from("clientes")
        .select("id, nome_fantasia, cnpj_cpf")
        .eq("ativo", true)
        .order("created_at", { ascending: false })
        .limit(5);
      if (data) setTrocarResultados(data);
    };
    loadRecentes();
  }, [trocarOpen]);

  useEffect(() => {
    if (!trocarOpen) return;
    const termo = trocarTermo.trim();
    if (!termo) {
      supabase
        .from("clientes")
        .select("id, nome_fantasia, cnpj_cpf")
        .eq("ativo", true)
        .order("created_at", { ascending: false })
        .limit(5)
        .then(({ data }) => { if (data) setTrocarResultados(data); });
      return;
    }
    const timeout = setTimeout(async () => {
      setTrocarBuscando(true);
      const limpo = termo.replace(/\D/g, "");
      let query = supabase
        .from("clientes")
        .select("id, nome_fantasia, cnpj_cpf")
        .eq("ativo", true)
        .limit(10);
      const filters = [`nome_fantasia.ilike.%${termo}%`];
      if (limpo.length >= 3) filters.push(`cnpj_cpf.ilike.%${limpo}%`);
      query = query.or(filters.join(","));
      const { data } = await query;
      setTrocarResultados(data || []);
      setTrocarBuscando(false);
    }, 300);
    return () => clearTimeout(timeout);
  }, [trocarTermo, trocarOpen]);

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
        const filters = [
          `nome_fantasia.ilike.%${termo}%`,
          `razao_social.ilike.%${termo}%`,
          `apelido.ilike.%${termo}%`,
        ];
        if (limpo.length >= 3) {
          filters.push(`cnpj_cpf.ilike.%${limpo}%`);
        }
        query = query.or(filters.join(","));
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

  async function vincularCliente(cli: any) {
    try {
      const { error } = await supabase
        .from("chat_conversas")
        .update({ cliente_id: cli.id })
        .eq("id", conversa!.id);
      if (error) throw error;

      await garantirContato(cli.id);

      await supabase.from("chat_mensagens").insert({
        conversa_id: conversa!.id,
        tipo: "sistema",
        conteudo: `Cliente vinculado: ${cli.nome_fantasia}`,
        remetente: "sistema",
      });

      toast.success("Cliente vinculado!");
      qc.invalidateQueries({ queryKey: ["chat-conversas"] });
      setClientesEncontrados([]);
      setTermoBusca("");
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
      setAutoLinkFeito(false);
      setAutoLinkMsg(null);
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


  async function trocarEmpresa(cli: any) {
    if (!conversa) return;
    try {
      const { error } = await supabase
        .from("chat_conversas")
        .update({ cliente_id: cli.id })
        .eq("id", conversa.id);
      if (error) throw error;
      await garantirContato(cli.id);
      await supabase.from("chat_mensagens").insert({
        conversa_id: conversa.id,
        tipo: "sistema",
        conteudo: `Empresa alterada para: ${cli.nome_fantasia}`,
        remetente: "sistema",
      });
      toast.success("Empresa vinculada com sucesso");
      setTrocarOpen(false);
      qc.invalidateQueries({ queryKey: ["chat-conversas"] });
    } catch (e: any) {
      toast.error("Erro: " + e.message);
    }
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
                  {autoLinkMsg && (
                    <div className="flex items-center gap-1 text-green-600">
                      <CheckCircle2 className="h-3 w-3" />
                      <span className="text-[10px]">{autoLinkMsg}</span>
                    </div>
                  )}
                  <div className="flex items-center gap-2 mt-1">
                    <a href={`/clientes`} className="text-primary hover:underline flex items-center gap-1">
                      Ver cadastro <ExternalLink className="h-3 w-3" />
                    </a>
                    <TooltipProvider>
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-5 w-5 p-0 text-muted-foreground hover:text-primary"
                            onClick={() => setTrocarOpen(true)}
                          >
                            <RefreshCw className="h-3 w-3" />
                          </Button>
                        </TooltipTrigger>
                        <TooltipContent>Trocar empresa</TooltipContent>
                      </Tooltip>
                    </TooltipProvider>
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

                  {/* Multiple companies detected */}
                  {empresasDetectadas.length > 1 && (
                    <div className="space-y-1.5 pt-1">
                      <p className="text-muted-foreground font-medium">
                        Este contato possui múltiplas empresas. Selecione:
                      </p>
                      <div className="space-y-1 max-h-40 overflow-y-auto">
                        {empresasDetectadas.map((emp) => (
                          <div key={emp.empresa_id} className="border rounded-md p-2 bg-muted/30 flex items-center gap-2">
                            <Building2 className="h-4 w-4 text-muted-foreground shrink-0" />
                            <div className="flex-1 min-w-0">
                              <p className="font-medium text-foreground truncate">{emp.empresa_nome}</p>
                              <p className="text-muted-foreground">{formatCnpj(emp.empresa_cnpj)}</p>
                            </div>
                            <Button size="sm" className="h-6 text-xs shrink-0" onClick={() => selecionarEmpresa(emp)}>
                              Selecionar
                            </Button>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {empresasDetectadas.length === 0 && (
                    <>
                      <p className="text-muted-foreground">Cliente não vinculado</p>
                      {/* CNPJ Search */}
                      <div className="space-y-1.5 pt-1">
                        <div className="flex gap-1">
                          <Input
                            placeholder="Nome, apelido ou CNPJ..."
                            value={termoBusca}
                            onChange={(e) => setTermoBusca(e.target.value)}
                            onKeyDown={(e) => e.key === "Enter" && buscarCliente()}
                            className="h-7 text-xs"
                          />
                          <Button size="sm" className="h-7 px-2" onClick={buscarCliente} disabled={buscando}>
                            <Search className="h-3 w-3" />
                          </Button>
                        </div>

                        {buscaFeita && clientesEncontrados.length > 0 && (
                          <div className="space-y-1 max-h-40 overflow-y-auto">
                            {clientesEncontrados.map((cli: any) => (
                              <div key={cli.id} className="border rounded-md p-2 space-y-1 bg-muted/30">
                                <p className="font-medium text-foreground">{cli.nome_fantasia}</p>
                                {cli.apelido && <p className="text-muted-foreground">({cli.apelido})</p>}
                                {cli.razao_social && <p className="text-muted-foreground">{cli.razao_social}</p>}
                                <p className="text-muted-foreground">CNPJ: {formatCnpj(cli.cnpj_cpf)}</p>
                                <Button size="sm" className="h-6 text-xs w-full mt-1" onClick={() => vincularCliente(cli)}>
                                  Vincular este cliente
                                </Button>
                              </div>
                            ))}
                          </div>
                        )}

                        {buscaFeita && clientesEncontrados.length === 0 && !buscando && (
                          <p className="text-muted-foreground text-center py-1">Nenhum cliente encontrado.</p>
                        )}
                      </div>
                    </>
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
                    {h.titulo_atendimento && (
                      <p className="text-muted-foreground italic mt-0.5 truncate">"{h.titulo_atendimento}"</p>
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

      {/* Dialog Trocar Empresa */}
      <Dialog open={trocarOpen} onOpenChange={setTrocarOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Vincular empresa à conversa</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            {cliente && (
              <div className="flex items-center justify-between rounded-md border p-2 bg-muted/30">
                <div className="text-xs">
                  <span className="text-muted-foreground">Empresa atual: </span>
                  <span className="font-medium text-foreground">{cliente.nome_fantasia}</span>
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  className="h-6 text-xs text-destructive border-destructive/50 hover:bg-destructive/10"
                  onClick={() => { desvincularCliente(); setTrocarOpen(false); }}
                >
                  Desvincular
                </Button>
              </div>
            )}
            <Input
              placeholder="Buscar empresa pelo nome ou CNPJ..."
              value={trocarTermo}
              onChange={(e) => setTrocarTermo(e.target.value)}
              className="h-9 text-sm"
              autoFocus
            />
            <div className="space-y-1 max-h-60 overflow-y-auto">
              {trocarBuscando && <p className="text-xs text-muted-foreground text-center py-2">Buscando...</p>}
              {!trocarBuscando && trocarResultados.length === 0 && trocarTermo.trim() && (
                <p className="text-xs text-muted-foreground text-center py-2">Nenhuma empresa encontrada.</p>
              )}
              {!trocarBuscando && trocarResultados.map((cli: any) => (
                <button
                  key={cli.id}
                  className="w-full text-left border rounded-md p-2 hover:bg-accent transition-colors"
                  onClick={() => trocarEmpresa(cli)}
                >
                  <p className="font-medium text-sm text-foreground">{cli.nome_fantasia}</p>
                  <p className="text-xs text-muted-foreground">{formatCnpj(cli.cnpj_cpf)}</p>
                </button>
              ))}
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
