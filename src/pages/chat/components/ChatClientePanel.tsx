import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Sheet, SheetContent } from "@/components/ui/sheet";
import { Tooltip, TooltipContent, TooltipTrigger, TooltipProvider } from "@/components/ui/tooltip";
import { ExternalLink, Plus, Phone, Building2, Clock, Search, X, Star, User, CheckCircle2, RefreshCw, Ticket, Eye, TrendingUp } from "lucide-react";
import { TicketDetailDrawer } from "@/pages/tickets/components/TicketDetailDrawer";
import { OportunidadeFormDialog } from "@/pages/crm-pipeline/components/OportunidadeFormDialog";
import { OportunidadeDetailView } from "@/pages/crm-pipeline/components/OportunidadeDetailView";
import { useCrmPipelineQueries } from "@/pages/crm-pipeline/useCrmPipelineQueries";
import { useCrmCamposPersonalizados, useCrmFunis, useCrmEtapas } from "@/pages/crm-parametros/useCrmParametrosQueries";
import { useCrmPipelineForm } from "@/pages/crm-pipeline/useCrmPipelineForm";
import ChatHistoricoDrawer from "./ChatHistoricoDrawer";
import { cn, normalizeBRPhone, applyPhoneMask } from "@/lib/utils";
import { ChatConversa, STATUS_LABELS, ChatStatus } from "../types";
import { formatarTelefone, tempoRelativo } from "../helpers";
import { useChatHistorico } from "../useChatQueries";
import { format } from "date-fns";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { useAuth } from "@/context/AuthContext";

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
  const navigate = useNavigate();
  const qc = useQueryClient();
  const { user } = useAuth();
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
  const [ticketDrawerOpen, setTicketDrawerOpen] = useState(false);
  const [crmDialogOpen, setCrmDialogOpen] = useState(false);
  const [crmDetailConversaId, setCrmDetailConversaId] = useState<string | null>(null);
  const [crmDetailOpen, setCrmDetailOpen] = useState(false);

  // Auto-link state
  const [empresasDetectadas, setEmpresasDetectadas] = useState<EmpresaContato[]>([]);
  const [autoLinkFeito, setAutoLinkFeito] = useState(false);
  const [autoLinkMsg, setAutoLinkMsg] = useState<string | null>(null);

  const { data: historico } = useChatHistorico(
    conversa?.numero_cliente || null,
    conversa?.id || null
  );

  // Fetch linked ticket info
  const ticketId = (conversa as any)?.ticket_id || null;
  const { data: ticketInfo } = useQuery({
    queryKey: ["chat-ticket-info", ticketId],
    queryFn: async () => {
      const { data } = await supabase
        .from("tickets")
        .select("id, numero_exibicao, status")
        .eq("id", ticketId!)
        .single();
      return data;
    },
    enabled: !!ticketId,
    refetchInterval: 15000,
  });

  // Fetch linked CRM opportunity (light for sidebar badge)
  const { data: linkedOportunidade } = useQuery({
    queryKey: ["chat-crm-oportunidade", conversa?.id],
    queryFn: async () => {
      const { data } = await supabase
        .from("crm_oportunidades")
        .select("id, titulo, status, etapa_id, crm_etapas(nome)")
        .eq("conversa_id", conversa!.id)
        .maybeSingle();
      return data;
    },
    enabled: !!conversa?.id,
    refetchInterval: 15000,
  });

  // Fetch full opportunity for detail view
  const { data: fullOportunidade } = useQuery({
    queryKey: ["chat-crm-oportunidade-full", linkedOportunidade?.id],
    queryFn: async () => {
      const { data } = await supabase
        .from("crm_oportunidades")
        .select("*, crm_etapas(id, nome, cor, funil_id)")
        .eq("id", linkedOportunidade!.id)
        .single();
      return data;
    },
    enabled: !!linkedOportunidade?.id && crmDetailOpen,
  });

  // CRM form dependencies
  const { data: funis = [] } = useCrmFunis();
  const firstFunilId = funis.find(f => f.ativo)?.id || "";
  const { data: crmEtapas = [] } = useCrmEtapas(firstFunilId);
  const { data: camposPersonalizados = [] } = useCrmCamposPersonalizados();
  const { createMutation } = useCrmPipelineForm(firstFunilId);

  // Load responsaveis, segmentos, clientes, cargos for the CRM form
  const { responsaveisQuery, segmentosQuery, clientesQuery, cargosQuery } = useCrmPipelineQueries(firstFunilId, "em_andamento");

  // Auto-detect company by phone number
  useEffect(() => {
    if (!conversa?.id || !conversa.numero_cliente) return;
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

      const { data: contatos } = await supabase
        .from("cliente_contatos")
        .select("id, nome, telefone, cliente_id, clientes(id, nome_fantasia, cnpj_cpf)")
        .ilike("telefone", `%${ultimos8}%`)
        .eq("ativo", true)
        .limit(10);

      if (!contatos || contatos.length === 0) {
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
          await vincularClienteAuto(lastConv.cliente_id, (lastConv.clientes as any).nome_fantasia, true);
        }
        setEmpresasDetectadas([]);
        return;
      }

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
        await vincularClienteAuto(empresas[0].empresa_id, empresas[0].empresa_nome, false);
        setEmpresasDetectadas([]);
      } else if (empresas.length > 1) {
        setEmpresasDetectadas(empresas);
      }
    };

    detectar();
  }, [conversa?.id, conversa?.numero_cliente, conversa?.cliente_id]);

  async function garantirContato(clienteId: string) {
    if (!conversa) return;
    const telefone = conversa.numero_cliente?.replace(/\D/g, "") || "";
    if (telefone.length < 8) return;
    const ultimos8 = telefone.slice(-8);

    const { data: existing } = await supabase
      .from("cliente_contatos")
      .select("id")
      .eq("cliente_id", clienteId)
      .ilike("telefone", `%${ultimos8}%`)
      .eq("ativo", true)
      .limit(1);

    if (existing && existing.length > 0) return;

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

  // Trocar empresa
  useEffect(() => {
    if (!trocarOpen) {
      setTrocarTermo("");
      setTrocarResultados([]);
      return;
    }
    const loadEmpresasContato = async () => {
      if (!conversa?.numero_cliente) return;
      const limpo = conversa.numero_cliente.replace(/\D/g, "");
      if (limpo.length < 8) return;
      const ultimos8 = limpo.slice(-8);
      const { data: contatos } = await supabase
        .from("cliente_contatos")
        .select("cliente_id, clientes(id, nome_fantasia, cnpj_cpf)")
        .ilike("telefone", `%${ultimos8}%`)
        .eq("ativo", true)
        .limit(20);
      if (contatos && contatos.length > 0) {
        const empresasMap = new Map<string, any>();
        for (const c of contatos) {
          const cli = c.clientes as any;
          if (cli?.id && !empresasMap.has(cli.id)) {
            empresasMap.set(cli.id, { id: cli.id, nome_fantasia: cli.nome_fantasia, cnpj_cpf: cli.cnpj_cpf });
          }
        }
        setTrocarResultados(Array.from(empresasMap.values()));
      } else {
        setTrocarResultados([]);
      }
    };
    loadEmpresasContato();
  }, [trocarOpen, conversa?.numero_cliente]);

  useEffect(() => {
    if (!trocarOpen) return;
    const termo = trocarTermo.trim();
    if (!termo) {
      if (!conversa?.numero_cliente) return;
      const limpo = conversa.numero_cliente.replace(/\D/g, "");
      if (limpo.length < 8) return;
      const ultimos8 = limpo.slice(-8);
      supabase
        .from("cliente_contatos")
        .select("cliente_id, clientes(id, nome_fantasia, cnpj_cpf)")
        .ilike("telefone", `%${ultimos8}%`)
        .eq("ativo", true)
        .limit(20)
        .then(({ data }) => {
          if (data && data.length > 0) {
            const empresasMap = new Map<string, any>();
            for (const c of data) {
              const cli = c.clientes as any;
              if (cli?.id && !empresasMap.has(cli.id)) {
                empresasMap.set(cli.id, { id: cli.id, nome_fantasia: cli.nome_fantasia, cnpj_cpf: cli.cnpj_cpf });
              }
            }
            setTrocarResultados(Array.from(empresasMap.values()));
          } else {
            setTrocarResultados([]);
          }
        });
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
  }, [trocarTermo, trocarOpen, conversa?.numero_cliente]);

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

  // CRM form prefill
  const crmPrefill = {
    titulo: conversa.nome_cliente || "",
    contatos: [{
      nome: conversa.nome_cliente || "",
      telefone: conversa.numero_cliente?.replace(/\D/g, "") || "",
      cargo_id: "",
      email: "",
    }],
    origem: "Chat Softplus",
    origemLocked: true,
    conversa_id: conversa.id,
  };

  const handleCrmSave = async (data: Record<string, unknown>) => {
    createMutation.mutate({ funil_id: firstFunilId, ...data } as any, {
      onSuccess: async (created: any) => {
        setCrmDialogOpen(false);
        if (created?.id) {
          // Get profile name from DB
          const { data: { user: authUser } } = await supabase.auth.getUser();
          const { data: profile } = await supabase
            .from("profiles")
            .select("full_name")
            .eq("user_id", authUser?.id || "")
            .single();
          const userName = profile?.full_name || "Usuário";

          // Add note to chat
          await supabase.from("chat_mensagens").insert({
            conversa_id: conversa.id,
            tipo: "nota_interna",
            conteudo: `Oportunidade CRM criada por @${userName} — ${created.titulo}`,
            remetente: "sistema",
            atendente_id: authUser?.id || null,
          });

          // Log in timeline
          await (supabase as any).from("crm_historico").insert({
            oportunidade_id: created.id,
            tipo: "criacao",
            descricao: `Oportunidade criada por @${userName} — Origem: Chat Softplus`,
            user_id: authUser?.id || null,
          });

          // WhatsApp automation dispatch
          try {
            const filialId = data.filial_id as string;
            if (filialId) {
              const { data: autoConfig } = await (supabase as any)
                .from("crm_automacao_chat_config")
                .select("*")
                .eq("filial_id", filialId)
                .eq("ativo", true)
                .maybeSingle();

              if (autoConfig?.destinatario_user_id) {
                const { data: destProfile } = await supabase
                  .from("profiles")
                  .select("full_name, telefone")
                  .eq("user_id", autoConfig.destinatario_user_id)
                  .single();

                if (destProfile?.telefone) {
                  const contatos = (data._contatos as any[]) || [];
                  const contatoNome = contatos[0]?.nome || created.titulo;
                  const contatoTel = contatos[0]?.telefone || "";
                  const empresaNome = (conversa.cliente as any)?.nome_fantasia || conversa.nome_cliente || "";
                  const segIds = (data.segmento_ids as string[]) || [];
                  let segmentoNomes = "";
                  if (segIds.length > 0) {
                    const { data: segs } = await supabase
                      .from("segmentos")
                      .select("nome")
                      .in("id", segIds);
                    segmentoNomes = segs?.map((s: any) => s.nome).join(", ") || "";
                  }
                  const obs = (data.observacoes as string) || "Sem observações";
                  const linkSoftflow = window.location.origin + "/crm";
                  const mensagem = `🎯 *Nova oportunidade no seu pipeline!*\n\n` +
                    `Olá, *${destProfile.full_name}*! Uma nova oportunidade foi atribuída a você no Softflow.\n\n` +
                    `📋 *${created.titulo}*\n\n` +
                    `👤 Contato: ${contatoNome}\n\n` +
                    `📱 Telefone: ${contatoTel}\n\n` +
                    `🏢 Empresa: ${empresaNome || "Não informada"}\n\n` +
                    `🏷️ Segmento: ${segmentoNomes || "Não informado"}\n\n` +
                    `📝 Obs: ${obs}\n\n` +
                    `Acesse o pipeline e entre em contato agora — cada minuto conta para fechar esse negócio! 🚀\n\n` +
                    `👉 ${linkSoftflow}`;

                  let instancia = "Softflow_WhatsApp";
                  if (autoConfig.setor_id) {
                    const { data: setor } = await supabase
                      .from("setores")
                      .select("instance_name")
                      .eq("id", autoConfig.setor_id)
                      .single();
                    if (setor?.instance_name) instancia = setor.instance_name;
                  }

                  const telDestino = destProfile.telefone.replace(/\D/g, "");
                  await supabase.functions.invoke("evolution-api", {
                    body: {
                      action: "send_text",
                      instance_name: instancia,
                      number: telDestino,
                      text: mensagem,
                    },
                  });
                }
              }
            }
          } catch (whatsErr) {
            console.error("Erro na automação WhatsApp CRM:", whatsErr);
          }

          qc.invalidateQueries({ queryKey: ["chat-mensagens"] });
          qc.invalidateQueries({ queryKey: ["chat-crm-oportunidade", conversa.id] });
          toast.success("Oportunidade CRM criada!");
        }
      },
    });
  };

  const crmStatusLabel: Record<string, string> = {
    em_andamento: "Em Andamento",
    ganho: "Ganho",
    perdido: "Perdido",
  };

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
              {ticketInfo && (
                <div
                  className="flex justify-between items-center pt-1 border-t border-border mt-1 cursor-pointer hover:bg-accent/50 rounded px-1 -mx-1 transition-colors"
                  onClick={() => setTicketDrawerOpen(true)}
                  title="Clique para ver detalhes do ticket"
                >
                  <span className="text-muted-foreground flex items-center gap-1">
                    <Ticket className="h-3 w-3" /> Ticket
                  </span>
                  <div className="flex items-center gap-1.5">
                    <span className="font-mono font-medium">{ticketInfo.numero_exibicao}</span>
                    <Badge
                      variant="outline"
                      className={cn(
                        "text-[10px] h-4",
                        ticketInfo.status === "Aberto" && "border-blue-400 text-blue-600",
                        ticketInfo.status === "Em Andamento" && "border-amber-400 text-amber-600",
                        ticketInfo.status === "Aguardando Cliente" && "border-orange-400 text-orange-600",
                        ticketInfo.status === "Resolvido" && "border-green-400 text-green-600",
                        ticketInfo.status === "Fechado" && "border-muted-foreground text-muted-foreground",
                      )}
                    >
                      {ticketInfo.status}
                    </Badge>
                  </div>
                </div>
              )}
              {/* CRM Oportunidade */}
              {linkedOportunidade && (
                <div
                  className="flex justify-between items-center pt-1 border-t border-border mt-1 cursor-pointer hover:bg-accent/50 rounded px-1 -mx-1 transition-colors"
                  onClick={() => setCrmDetailOpen(true)}
                  title="Clique para ver detalhes da oportunidade"
                >
                  <span className="text-muted-foreground flex items-center gap-1">
                    <TrendingUp className="h-3 w-3" /> CRM
                  </span>
                  <div className="flex items-center gap-1.5 min-w-0">
                    <span className="font-medium truncate max-w-[120px]">{linkedOportunidade.titulo}</span>
                    <Badge
                      variant="outline"
                      className={cn(
                        "text-[10px] h-4 shrink-0",
                        linkedOportunidade.status === "em_andamento" && "border-blue-400 text-blue-600",
                        linkedOportunidade.status === "ganho" && "border-green-400 text-green-600",
                        linkedOportunidade.status === "perdido" && "border-red-400 text-red-600",
                      )}
                    >
                      {crmStatusLabel[linkedOportunidade.status] || linkedOportunidade.status}
                    </Badge>
                  </div>
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
              <Button
                variant="ghost"
                size="sm"
                className="w-full justify-start text-xs h-8 gap-2"
                onClick={() => {
                  if (!conversa?.cliente_id) {
                    toast.error("Vincule um cliente antes de abrir ticket");
                    return;
                  }
                  navigate("/tickets/novo", {
                    state: {
                      fromChat: true,
                      conversaId: conversa.id,
                      clienteId: conversa.cliente_id,
                      clienteNome: (conversa.cliente as any)?.nome_fantasia || "",
                    },
                  });
                }}
              >
                <Plus className="h-3 w-3" /> Abrir Ticket
              </Button>
              <Button
                variant="ghost"
                size="sm"
                className="w-full justify-start text-xs h-8 gap-2"
                disabled={!!linkedOportunidade || !firstFunilId || crmEtapas.length === 0}
                onClick={() => setCrmDialogOpen(true)}
              >
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
            {!trocarTermo.trim() && (
              <p className="text-xs text-muted-foreground">
                Empresas vinculadas ao contato ({trocarResultados.length})
              </p>
            )}
            <div className="space-y-1 max-h-60 overflow-y-auto">
              {trocarBuscando && <p className="text-xs text-muted-foreground text-center py-2">Buscando...</p>}
              {!trocarBuscando && trocarResultados.length === 0 && trocarTermo.trim() && (
                <p className="text-xs text-muted-foreground text-center py-2">Nenhuma empresa encontrada.</p>
              )}
              {!trocarBuscando && trocarResultados.map((cli: any) => {
                const isAtual = cliente?.id === cli.id;
                return (
                  <button
                    key={cli.id}
                    className={cn(
                      "w-full text-left border rounded-md p-2 transition-colors",
                      isAtual
                        ? "border-green-300 bg-green-50 dark:bg-green-950/30 dark:border-green-700"
                        : "hover:bg-accent"
                    )}
                    onClick={() => !isAtual && trocarEmpresa(cli)}
                    disabled={isAtual}
                  >
                    <div className="flex items-center justify-between">
                      <p className={cn("font-medium text-sm", isAtual ? "text-green-700 dark:text-green-400" : "text-foreground")}>
                        {cli.nome_fantasia}
                      </p>
                      {isAtual && (
                        <Badge className="bg-green-100 text-green-700 dark:bg-green-900 dark:text-green-300 text-[10px] h-4 border-0">
                          Atual vinculada
                        </Badge>
                      )}
                    </div>
                    <p className={cn("text-xs", isAtual ? "text-green-600/70 dark:text-green-400/70" : "text-muted-foreground")}>
                      {formatCnpj(cli.cnpj_cpf)}
                    </p>
                  </button>
                );
              })}
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Ticket Detail Drawer */}
      {ticketId && (
        <TicketDetailDrawer
          ticketId={ticketDrawerOpen ? ticketId : null}
          open={ticketDrawerOpen}
          onClose={() => setTicketDrawerOpen(false)}
        />
      )}

      {/* CRM Oportunidade Form Dialog */}
      {firstFunilId && crmEtapas.length > 0 && (
        <OportunidadeFormDialog
          open={crmDialogOpen}
          onOpenChange={setCrmDialogOpen}
          etapas={crmEtapas}
          etapaIdInicial={crmEtapas[0]?.id}
          clientes={clientesQuery.data || []}
          responsaveis={responsaveisQuery.data || []}
          onSave={handleCrmSave}
          saving={createMutation.isPending}
          currentUserId={user?.id}
          camposPersonalizados={camposPersonalizados}
          segmentos={segmentosQuery.data || []}
          cargos={cargosQuery.data || []}
          prefill={crmPrefill}
        />
      )}

      {/* CRM Detail Sheet */}
      <Sheet open={crmDetailOpen} onOpenChange={setCrmDetailOpen}>
        <SheetContent side="right" className="w-[75vw] sm:max-w-[75vw] p-0 overflow-y-auto">
          {fullOportunidade && (
            <OportunidadeDetailView
              oportunidade={fullOportunidade as any}
              etapas={crmEtapas}
              clientes={clientesQuery.data || []}
              responsaveis={responsaveisQuery.data || []}
              onBack={() => setCrmDetailOpen(false)}
              camposPersonalizados={camposPersonalizados}
              segmentos={segmentosQuery.data || []}
              cargos={cargosQuery.data || []}
              funilId={firstFunilId}
            />
          )}
        </SheetContent>
      </Sheet>
    </>
  );
}
