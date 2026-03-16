import { useState, useEffect, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/context/AuthContext";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { MessageCircle, Send, Eye, AlertTriangle } from "lucide-react";
import { toast } from "sonner";
import { getInstanciaDoUsuario, type InstanciaResult } from "@/lib/getInstanciaDoUsuario";
import {
  buildPropostaMessage,
  type PropostaItem,
  type PropostaDescontos,
} from "../helpers/buildPropostaMessage";

interface Contato {
  id: string;
  nome: string;
  telefone: string;
}

interface Props {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  oportunidadeId: string;
  titulo: string;
}

export function EnviarPropostaDialog({ open, onOpenChange, oportunidadeId, titulo }: Props) {
  const { user } = useAuth();
  const [selectedContatoId, setSelectedContatoId] = useState("");
  const [motivoImplantacao, setMotivoImplantacao] = useState("");
  const [motivoMensalidade, setMotivoMensalidade] = useState("");
  const [sending, setSending] = useState(false);
  const [instanciaInfo, setInstanciaInfo] = useState<InstanciaResult | null>(null);
  const [loadingInstancia, setLoadingInstancia] = useState(false);

  // Resolve instância when dialog opens
  useEffect(() => {
    if (open && user?.id) {
      setLoadingInstancia(true);
      getInstanciaDoUsuario(user.id)
        .then(setInstanciaInfo)
        .catch(() => setInstanciaInfo({ instancia: "Softflow_WhatsApp", setor_nome: null, fonte: "padrao" }))
        .finally(() => setLoadingInstancia(false));
    }
  }, [open, user?.id]);

  // Fetch contatos
  const contatosQuery = useQuery({
    queryKey: ["crm_proposta_contatos", oportunidadeId],
    enabled: open,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("crm_oportunidade_contatos")
        .select("id, nome, telefone")
        .eq("oportunidade_id", oportunidadeId)
        .order("created_at");
      if (error) throw error;
      return (data || []) as Contato[];
    },
  });

  // Fetch products + plano descriptions
  const produtosQuery = useQuery({
    queryKey: ["crm_proposta_produtos", oportunidadeId],
    enabled: open,
    queryFn: async () => {
      const { data: items, error } = await supabase
        .from("crm_oportunidade_produtos")
        .select("*")
        .eq("oportunidade_id", oportunidadeId)
        .order("created_at");
      if (error) throw error;

      const planoIds = (items || []).filter(i => i.tipo === "plano").map(i => i.referencia_id);
      const moduloIds = (items || []).filter(i => i.tipo === "modulo").map(i => i.referencia_id);

      const [planosRes, modulosRes] = await Promise.all([
        planoIds.length > 0
          ? supabase.from("planos").select("id, nome, descricao").in("id", planoIds)
          : { data: [] },
        moduloIds.length > 0
          ? supabase.from("modulos").select("id, nome").in("id", moduloIds)
          : { data: [] },
      ]);

      const planosMap = new Map((planosRes.data || []).map(p => [p.id, p]));
      const modulosMap = new Map((modulosRes.data || []).map(m => [m.id, m]));

      return (items || []).map((item: any): PropostaItem => {
        if (item.tipo === "plano") {
          const plano = planosMap.get(item.referencia_id);
          return {
            tipo: "plano",
            nome: plano?.nome || "Plano",
            descricao: plano?.descricao || "",
            quantidade: item.quantidade,
            valor_implantacao: item.valor_implantacao,
            valor_mensalidade: item.valor_mensalidade,
          };
        }
        const modulo = modulosMap.get(item.referencia_id);
        return {
          tipo: "modulo",
          nome: modulo?.nome || "Módulo",
          quantidade: item.quantidade,
          valor_implantacao: item.valor_implantacao,
          valor_mensalidade: item.valor_mensalidade,
        };
      });
    },
  });

  // Fetch descontos
  const descontosQuery = useQuery({
    queryKey: ["crm_proposta_descontos", oportunidadeId],
    enabled: open,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("crm_oportunidades")
        .select("desconto_implantacao, desconto_implantacao_tipo, desconto_mensalidade, desconto_mensalidade_tipo")
        .eq("id", oportunidadeId)
        .single();
      if (error) throw error;
      return data;
    },
  });

  const contatos = contatosQuery.data || [];
  const items = produtosQuery.data || [];
  const descontosData = descontosQuery.data;

  // Auto-select first contato
  useEffect(() => {
    if (contatos.length > 0 && !selectedContatoId) {
      setSelectedContatoId(contatos[0].id);
    }
  }, [contatos, selectedContatoId]);

  const selectedContato = contatos.find(c => c.id === selectedContatoId);

  const hasDescontoImpl = (descontosData?.desconto_implantacao || 0) > 0;
  const hasDescontoMens = (descontosData?.desconto_mensalidade || 0) > 0;

  const preview = useMemo(() => {
    if (!selectedContato || items.length === 0) return "";

    const descontos: PropostaDescontos = {
      descontoImplantacao: descontosData?.desconto_implantacao || 0,
      descontoImplantacaoTipo: (descontosData?.desconto_implantacao_tipo || "R$") as "R$" | "%",
      descontoMensalidade: descontosData?.desconto_mensalidade || 0,
      descontoMensalidadeTipo: (descontosData?.desconto_mensalidade_tipo || "R$") as "R$" | "%",
      motivoImplantacao,
      motivoMensalidade,
    };

    return buildPropostaMessage({
      titulo,
      contatoNome: selectedContato.nome,
      items,
      descontos,
    });
  }, [selectedContato, items, descontosData, motivoImplantacao, motivoMensalidade, titulo]);

  const handleSend = async () => {
    if (!selectedContato) {
      toast.error("Selecione um contato.");
      return;
    }
    if (!selectedContato.telefone) {
      toast.error("O contato selecionado não possui telefone.");
      return;
    }

    const instanceName = instanciaInfo?.instancia || "Softflow_WhatsApp";

    setSending(true);
    try {
      const { error } = await supabase.functions.invoke("evolution-api", {
        body: {
          action: "send_text",
          number: selectedContato.telefone,
          text: preview,
          instance_name: instanceName,
        },
      });

      if (error) throw error;

      // Log the send
      await supabase.from("crm_proposta_envios").insert({
        oportunidade_id: oportunidadeId,
        usuario_id: user?.id || "",
        instancia_usada: instanceName,
        setor_nome: instanciaInfo?.setor_nome || null,
        numero_destino: selectedContato.telefone,
        contato_nome: selectedContato.nome,
        status_envio: "enviado",
        tipo: "proposta",
      });

      toast.success("Proposta enviada com sucesso!");
      onOpenChange(false);
    } catch (err: any) {
      console.error("[Proposta WhatsApp]", err);

      // Log error
      await supabase.from("crm_proposta_envios").insert({
        oportunidade_id: oportunidadeId,
        usuario_id: user?.id || "",
        instancia_usada: instanceName,
        setor_nome: instanciaInfo?.setor_nome || null,
        numero_destino: selectedContato.telefone,
        contato_nome: selectedContato.nome,
        status_envio: "erro",
        tipo: "proposta",
        erro: err.message || "Erro desconhecido",
      });

      toast.error("Erro ao enviar proposta: " + (err.message || "Tente novamente."));
    } finally {
      setSending(false);
    }
  };

  // Render WhatsApp-formatted preview
  const renderPreview = (text: string) => {
    return text
      .replace(/\*([^*]+)\*/g, '<strong>$1</strong>')
      .replace(/~([^~]+)~/g, '<del>$1</del>')
      .replace(/_([^_]+)_/g, '<em>$1</em>')
      .replace(/\n/g, '<br/>');
  };

  const isPadrao = instanciaInfo?.fonte === "padrao";

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl w-[95vw] max-h-[85vh] flex flex-col overflow-hidden">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <MessageCircle className="h-5 w-5 text-primary" />
            Enviar Proposta via WhatsApp
          </DialogTitle>
          <DialogDescription>
            Revise a proposta antes de enviar para o contato selecionado.
          </DialogDescription>
        </DialogHeader>

        <ScrollArea className="flex-1 min-h-0 pr-2">
          <div className="space-y-4">
            {/* Warning for default instance */}
            {isPadrao && !loadingInstancia && (
              <Alert variant="default" className="border-yellow-500/50 bg-yellow-50 dark:bg-yellow-950/20">
                <AlertTriangle className="h-4 w-4 text-yellow-600" />
                <AlertDescription className="text-xs text-yellow-800 dark:text-yellow-300">
                  ⚠️ Nenhuma instância WhatsApp vinculada ao seu usuário. O envio será feito pela instância padrão{" "}
                  <strong>[{instanciaInfo?.instancia}]</strong>. Para usar sua instância pessoal, peça ao admin vincular seu usuário
                  ao setor correto em Configurações {">"} Setores.
                </AlertDescription>
              </Alert>
            )}

            {/* Contato selection */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label className="text-xs">Contato *</Label>
                <Select value={selectedContatoId} onValueChange={setSelectedContatoId}>
                  <SelectTrigger className="h-9">
                    <SelectValue placeholder="Selecione o contato..." />
                  </SelectTrigger>
                  <SelectContent>
                    {contatos.map(c => (
                      <SelectItem key={c.id} value={c.id}>
                        {c.nome} — {c.telefone}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {items.length === 0 && (
                <div className="flex items-center text-sm text-destructive">
                  Adicione produtos antes de enviar a proposta.
                </div>
              )}
            </div>

            {/* Motivo desconto fields */}
            {(hasDescontoImpl || hasDescontoMens) && (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {hasDescontoImpl && (
                  <div className="space-y-1.5">
                    <Label className="text-xs">Motivo do desconto (Implantação)</Label>
                    <Input
                      value={motivoImplantacao}
                      onChange={e => setMotivoImplantacao(e.target.value)}
                      placeholder="Ex: Condição especial de lançamento"
                      className="h-9 text-sm"
                    />
                  </div>
                )}
                {hasDescontoMens && (
                  <div className="space-y-1.5">
                    <Label className="text-xs">Motivo do desconto (Mensalidade)</Label>
                    <Input
                      value={motivoMensalidade}
                      onChange={e => setMotivoMensalidade(e.target.value)}
                      placeholder="Ex: Fidelidade 12 meses"
                      className="h-9 text-sm"
                    />
                  </div>
                )}
              </div>
            )}

            {/* Preview */}
            {preview && (
              <div className="space-y-1.5">
                <Label className="text-xs flex items-center gap-1">
                  <Eye className="h-3.5 w-3.5" /> Pré-visualização
                </Label>
                <div className="rounded-lg border bg-[#e5ddd5] dark:bg-[#0b141a] p-4">
                  <div
                    className="bg-[#dcf8c6] dark:bg-[#005c4b] text-[13px] leading-relaxed rounded-lg p-3 max-w-[95%] ml-auto text-foreground shadow-sm whitespace-pre-wrap break-words"
                    dangerouslySetInnerHTML={{ __html: renderPreview(preview) }}
                  />
                </div>
              </div>
            )}
          </div>
        </ScrollArea>

        <DialogFooter className="flex-col sm:flex-row gap-2 sm:gap-0">
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancelar
          </Button>
          <div className="flex flex-col items-end">
            <Button
              onClick={handleSend}
              disabled={!selectedContato || items.length === 0 || sending || loadingInstancia}
              className="gap-2"
            >
              <Send className="h-4 w-4" />
              {sending ? "Enviando..." : "Enviar Proposta"}
            </Button>
            {instanciaInfo && !loadingInstancia && (
              <span className="text-[10px] text-muted-foreground mt-1">
                via [{instanciaInfo.instancia}]
                {instanciaInfo.setor_nome && ` — ${instanciaInfo.setor_nome}`}
              </span>
            )}
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
