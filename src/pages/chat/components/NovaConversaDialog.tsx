import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Checkbox } from "@/components/ui/checkbox";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { useAuth } from "@/context/AuthContext";

import {
  Building2, Search, User, Phone, ChevronLeft, ChevronRight, Ticket,
  MessageSquare, Send, SkipForward, Loader2,
} from "lucide-react";
import { cn, applyPhoneMask } from "@/lib/utils";

interface Props {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  onConversaCriada: (conversaId: string) => void;
}

interface ClienteResult {
  id: string;
  nome_fantasia: string;
  cnpj_cpf: string;
}

interface ContatoResult {
  id: string;
  nome: string;
  telefone: string | null;
  decisor: boolean;
}

interface TicketResult {
  id: string;
  numero_exibicao: string;
  titulo: string;
  status: string;
}

interface RespostaRapida {
  id: string;
  atalho: string;
  conteudo: string;
}

export default function NovaConversaDialog({ open, onOpenChange, onConversaCriada }: Props) {
  const { user } = useAuth();
  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(false);
  const [criando, setCriando] = useState(false);

  // Step 1 - Empresa
  const [buscaEmpresa, setBuscaEmpresa] = useState("");
  const [empresas, setEmpresas] = useState<ClienteResult[]>([]);
  const [empresaRecentes, setEmpresaRecentes] = useState<ClienteResult[]>([]);
  const [selectedEmpresa, setSelectedEmpresa] = useState<ClienteResult | null>(null);

  // Step 2 - Contato + Ticket
  const [contatos, setContatos] = useState<ContatoResult[]>([]);
  const [selectedContato, setSelectedContato] = useState<ContatoResult | null>(null);
  const [numeroManual, setNumeroManual] = useState("");
  const [tickets, setTickets] = useState<TicketResult[]>([]);
  const [selectedTicketId, setSelectedTicketId] = useState<string | null>(null);

  // Step 3 - Mensagem
  const [respostasRapidas, setRespostasRapidas] = useState<RespostaRapida[]>([]);
  const [mensagem, setMensagem] = useState("");

  // Reset on close
  useEffect(() => {
    if (!open) {
      setStep(1);
      setBuscaEmpresa("");
      setEmpresas([]);
      setSelectedEmpresa(null);
      setSelectedContato(null);
      setNumeroManual("");
      setSelectedTicketId(null);
      setMensagem("");
    }
  }, [open]);

  // Load recent companies on open
  useEffect(() => {
    if (open) {
      supabase
        .from("clientes")
        .select("id, nome_fantasia, cnpj_cpf")
        .eq("ativo", true)
        .order("updated_at", { ascending: false })
        .limit(5)
        .then(({ data }) => setEmpresaRecentes(data || []));
    }
  }, [open]);

  // Search empresas
  useEffect(() => {
    if (!buscaEmpresa.trim()) {
      setEmpresas([]);
      return;
    }
    const timeout = setTimeout(async () => {
      setLoading(true);
      const { data } = await supabase
        .from("clientes")
        .select("id, nome_fantasia, cnpj_cpf")
        .eq("ativo", true)
        .or(`nome_fantasia.ilike.%${buscaEmpresa}%,cnpj_cpf.ilike.%${buscaEmpresa}%`)
        .order("nome_fantasia")
        .limit(20);
      setEmpresas(data || []);
      setLoading(false);
    }, 300);
    return () => clearTimeout(timeout);
  }, [buscaEmpresa]);

  // Load contatos + tickets when empresa selected
  useEffect(() => {
    if (!selectedEmpresa) return;
    Promise.all([
      supabase
        .from("cliente_contatos")
        .select("id, nome, telefone, decisor")
        .eq("cliente_id", selectedEmpresa.id)
        .eq("ativo", true)
        .order("decisor", { ascending: false }),
      supabase
        .from("tickets")
        .select("id, numero_exibicao, titulo, status")
        .eq("cliente_id", selectedEmpresa.id)
        .not("status", "in", '("Fechado","Cancelado","Resolvido")')
        .order("created_at", { ascending: false })
        .limit(10),
    ]).then(([contatosRes, ticketsRes]) => {
      setContatos((contatosRes.data || []) as ContatoResult[]);
      setTickets((ticketsRes.data || []) as TicketResult[]);
    });
  }, [selectedEmpresa]);

  // Load respostas rapidas
  useEffect(() => {
    if (step === 3) {
      supabase
        .from("chat_respostas_rapidas")
        .select("id, atalho, conteudo")
        .eq("ativo", true)
        .order("atalho")
        .then(({ data }) => setRespostasRapidas((data || []) as RespostaRapida[]));
    }
  }, [step]);

  function selectEmpresa(emp: ClienteResult) {
    setSelectedEmpresa(emp);
    setSelectedContato(null);
    setNumeroManual("");
    setSelectedTicketId(null);
    setStep(2);
  }

  function getNumeroFinal(): string {
    if (selectedContato?.telefone) return selectedContato.telefone.replace(/\D/g, "");
    return numeroManual.replace(/\D/g, "");
  }

  const canAdvanceStep2 = getNumeroFinal().length >= 10;

  async function criarConversa(comMensagem: boolean) {
    if (!user?.id || !selectedEmpresa) return;
    const numero = getNumeroFinal();
    if (numero.length < 10) {
      toast.error("Número de telefone inválido");
      return;
    }

    setCriando(true);
    try {
      // Nova conversa sempre usa instância Helpdesk
      const instancia = "Helpdesk";

      // Create conversa
      const agora = new Date().toISOString();
      const { data: conv, error } = await supabase
        .from("chat_conversas")
        .insert({
          numero_cliente: numero,
          nome_cliente: selectedContato?.nome || selectedEmpresa.nome_fantasia,
          cliente_id: selectedEmpresa.id,
          contato_id: selectedContato?.id || null,
          ticket_id: selectedTicketId || null,
          status: "em_atendimento",
          atendente_id: user.id,
          canal: "whatsapp",
          canal_instancia: instancia,
          iniciado_em: agora,
          atendimento_iniciado_em: agora,
          updated_at: agora,
        })
        .select("id")
        .single();

      if (error) throw error;

      // System message
      const { data: profile } = await supabase
        .from("profiles")
        .select("full_name")
        .eq("user_id", user.id)
        .single();
      const userName = profile?.full_name || "Atendente";

      await supabase.from("chat_mensagens").insert({
        conversa_id: conv.id,
        tipo: "sistema",
        conteudo: `${userName} iniciou conversa ativa`,
        remetente: "sistema",
      });

      // Send initial message if provided
      if (comMensagem && mensagem.trim()) {
        // Save to DB
        await supabase.from("chat_mensagens").insert({
          conversa_id: conv.id,
          tipo: "texto",
          conteudo: mensagem.trim(),
          remetente: "atendente",
          atendente_id: user.id,
        });

        // Send via WhatsApp
        const textoWhatsApp = `*${userName}* diz:\n${mensagem.trim()}`;
        const { error: sendError } = await supabase.functions.invoke("evolution-api", {
          body: {
            action: "send_text",
            number: numero,
            text: textoWhatsApp,
            instance_name: instancia,
          },
        });
        if (sendError) {
          console.error("[NovaConversa] Erro WhatsApp:", sendError);
          toast.error("Conversa criada, mas falha ao enviar WhatsApp");
        }
      }

      toast.success("Conversa iniciada com sucesso!");
      onOpenChange(false);
      onConversaCriada(conv.id);
    } catch (e: any) {
      toast.error("Erro ao criar conversa: " + e.message);
    } finally {
      setCriando(false);
    }
  }

  const listaEmpresas = buscaEmpresa.trim() ? empresas : empresaRecentes;
  const labelEmpresas = buscaEmpresa.trim() ? "Resultados" : "Empresas recentes";

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg max-h-[85vh] flex flex-col" onInteractOutside={(e) => e.preventDefault()}>
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <MessageSquare className="h-5 w-5" />
            Nova Conversa
            <Badge variant="outline" className="text-[10px] ml-2">
              Passo {step}/3
            </Badge>
          </DialogTitle>
        </DialogHeader>

        <div className="flex-1 overflow-y-auto min-h-0 space-y-3 pr-1">
          {/* ===== STEP 1: Selecionar Empresa ===== */}
          {step === 1 && (
            <>
              <div className="relative">
                <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Buscar por nome ou CNPJ/CPF..."
                  value={buscaEmpresa}
                  onChange={(e) => setBuscaEmpresa(e.target.value)}
                  className="pl-9 h-9 text-sm"
                  autoFocus
                />
              </div>
              <Label className="text-xs text-muted-foreground">{labelEmpresas}</Label>
              <ScrollArea className="max-h-[350px]">
                <div className="space-y-1">
                  {loading && (
                    <div className="flex items-center justify-center py-6">
                      <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
                    </div>
                  )}
                  {!loading && listaEmpresas.length === 0 && (
                    <p className="text-sm text-muted-foreground text-center py-6">
                      {buscaEmpresa.trim() ? "Nenhuma empresa encontrada" : "Nenhuma empresa recente"}
                    </p>
                  )}
                  {!loading && listaEmpresas.map((emp) => (
                    <button
                      key={emp.id}
                      onClick={() => selectEmpresa(emp)}
                      className="w-full text-left p-3 rounded-lg border hover:bg-accent/50 transition-colors flex items-center gap-3"
                    >
                      <div className="h-8 w-8 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
                        <Building2 className="h-4 w-4 text-primary" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium truncate">{emp.nome_fantasia}</p>
                        <p className="text-xs text-muted-foreground font-mono">{emp.cnpj_cpf}</p>
                      </div>
                      <ChevronRight className="h-4 w-4 text-muted-foreground" />
                    </button>
                  ))}
                </div>
              </ScrollArea>
            </>
          )}

          {/* ===== STEP 2: Selecionar Contato + Ticket ===== */}
          {step === 2 && selectedEmpresa && (
            <>
              <div className="bg-muted/30 rounded-lg p-2 flex items-center gap-2 text-sm">
                <Building2 className="h-4 w-4 text-primary" />
                <span className="font-medium">{selectedEmpresa.nome_fantasia}</span>
                <span className="text-xs text-muted-foreground font-mono">{selectedEmpresa.cnpj_cpf}</span>
              </div>

              <Label className="text-xs font-semibold">Contatos</Label>
              {contatos.length > 0 ? (
                <div className="space-y-1">
                  {contatos.map((ct) => (
                    <button
                      key={ct.id}
                      onClick={() => {
                        setSelectedContato(ct);
                        setNumeroManual("");
                      }}
                      className={cn(
                        "w-full text-left p-2.5 rounded-lg border transition-colors flex items-center gap-3",
                        selectedContato?.id === ct.id ? "bg-primary/10 border-primary/40" : "hover:bg-accent/50"
                      )}
                    >
                      <div className="h-7 w-7 rounded-full bg-muted flex items-center justify-center flex-shrink-0">
                        <User className="h-3.5 w-3.5 text-muted-foreground" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium truncate flex items-center gap-1.5">
                          {ct.nome}
                          {ct.decisor && <Badge variant="secondary" className="text-[9px] h-3.5 px-1">Decisor</Badge>}
                        </p>
                        {ct.telefone && (
                          <p className="text-xs text-muted-foreground flex items-center gap-1">
                            <Phone className="h-2.5 w-2.5" /> {applyPhoneMask(ct.telefone)}
                          </p>
                        )}
                      </div>
                    </button>
                  ))}
                </div>
              ) : (
                <p className="text-xs text-muted-foreground">Nenhum contato cadastrado para esta empresa.</p>
              )}

              <div className="border-t pt-3 mt-2">
                <Label className="text-xs">Ou digite o número manualmente</Label>
                <Input
                  placeholder="(00) 00000-0000"
                  value={applyPhoneMask(numeroManual)}
                  onChange={(e) => {
                    setNumeroManual(e.target.value.replace(/\D/g, ""));
                    setSelectedContato(null);
                  }}
                  className="h-9 text-sm mt-1"
                />
              </div>

              {/* Tickets abertos */}
              {tickets.length > 0 && (
                <div className="border-t pt-3 mt-2 space-y-2">
                  <Label className="text-xs font-semibold flex items-center gap-1.5">
                    <Ticket className="h-3.5 w-3.5" /> Tickets abertos ({tickets.length})
                  </Label>
                  <div className="space-y-1 max-h-[120px] overflow-y-auto">
                    {tickets.map((tk) => (
                      <label
                        key={tk.id}
                        className={cn(
                          "flex items-center gap-2 p-2 rounded-lg border text-xs cursor-pointer transition-colors",
                          selectedTicketId === tk.id ? "bg-primary/10 border-primary/40" : "hover:bg-accent/50"
                        )}
                      >
                        <Checkbox
                          checked={selectedTicketId === tk.id}
                          onCheckedChange={(checked) => setSelectedTicketId(checked ? tk.id : null)}
                        />
                        <span className="font-mono text-muted-foreground">#{tk.numero_exibicao}</span>
                        <span className="truncate flex-1">{tk.titulo}</span>
                        <Badge variant="outline" className="text-[9px] h-4">{tk.status}</Badge>
                      </label>
                    ))}
                  </div>
                </div>
              )}
            </>
          )}

          {/* ===== STEP 3: Mensagem Inicial ===== */}
          {step === 3 && (
            <>
              <div className="bg-muted/30 rounded-lg p-2 flex items-center gap-2 text-sm">
                <Building2 className="h-4 w-4 text-primary" />
                <span className="font-medium">{selectedEmpresa?.nome_fantasia}</span>
                <span className="mx-1 text-muted-foreground">→</span>
                <Phone className="h-3.5 w-3.5 text-muted-foreground" />
                <span className="font-mono text-xs">{applyPhoneMask(getNumeroFinal())}</span>
              </div>

              {respostasRapidas.length > 0 && (
                <div>
                  <Label className="text-xs font-semibold">Respostas rápidas</Label>
                  <ScrollArea className="max-h-[140px] mt-1">
                    <div className="space-y-1">
                      {respostasRapidas.map((rr) => (
                        <button
                          key={rr.id}
                          onClick={() => setMensagem(rr.conteudo)}
                          className="w-full text-left p-2 rounded-lg border text-xs hover:bg-accent/50 transition-colors"
                        >
                          <span className="font-mono text-primary">/{rr.atalho}</span>
                          <span className="ml-2 text-muted-foreground truncate">{rr.conteudo.slice(0, 80)}...</span>
                        </button>
                      ))}
                    </div>
                  </ScrollArea>
                </div>
              )}

              <div>
                <Label className="text-xs">Mensagem inicial</Label>
                <Textarea
                  value={mensagem}
                  onChange={(e) => setMensagem(e.target.value)}
                  placeholder="Digite a primeira mensagem para o cliente..."
                  className="min-h-[100px] text-sm mt-1"
                />
              </div>
            </>
          )}
        </div>

        <DialogFooter className="gap-2 flex-wrap">
          {step > 1 && (
            <Button variant="outline" onClick={() => setStep(step - 1)} disabled={criando}>
              <ChevronLeft className="h-4 w-4 mr-1" /> Voltar
            </Button>
          )}
          {step === 1 && (
            <Button variant="outline" onClick={() => onOpenChange(false)}>
              Cancelar
            </Button>
          )}
          {step === 2 && (
            <Button onClick={() => setStep(3)} disabled={!canAdvanceStep2}>
              Próximo <ChevronRight className="h-4 w-4 ml-1" />
            </Button>
          )}
          {step === 3 && (
            <>
              <Button
                variant="outline"
                onClick={() => criarConversa(false)}
                disabled={criando}
                className="gap-1"
              >
                <SkipForward className="h-4 w-4" />
                Pular — abrir sem mensagem
              </Button>
              <Button
                onClick={() => criarConversa(true)}
                disabled={criando || !mensagem.trim()}
                className="gap-1"
              >
                {criando ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
                Iniciar Conversa
              </Button>
            </>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
