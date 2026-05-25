import { useEffect, useState } from "react";
import { toast } from "sonner";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Loader2, Send } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { getInstanciaDoUsuario } from "@/lib/getInstanciaDoUsuario";

interface Contato {
  nome: string;
  telefone: string;
}

interface Props {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  contato: Contato | null;
  vendedorUserId: string;
  vendedorNome: string;
  onSent?: () => void;
}

export function FispalWhatsAppDialog({ open, onOpenChange, contato, vendedorUserId, vendedorNome, onSent }: Props) {
  const [loading, setLoading] = useState(false);
  const [sending, setSending] = useState(false);
  const [mensagem, setMensagem] = useState("");

  useEffect(() => {
    if (!open) return;
    setMensagem("");
    setLoading(true);
    (async () => {
      const { data, error } = await supabase
        .from("message_templates")
        .select("conteudo")
        .ilike("nome", "fispal 2026")
        .eq("ativo", true)
        .maybeSingle();
      if (error || !data?.conteudo) {
        toast.error("Template 'Fispal 2026' não encontrado em Modelos de Documentos.");
        setLoading(false);
        return;
      }
      const texto = data.conteudo
        .split("{contato.nome}").join(contato?.nome || "")
        .split("{vendedor.nome}").join(vendedorNome || "");
      setMensagem(texto);
      setLoading(false);
    })();
  }, [open, contato?.nome, vendedorNome]);

  const handleEnviar = async () => {
    if (!contato?.telefone) {
      toast.error("Contato sem telefone cadastrado.");
      return;
    }
    if (!mensagem.trim()) {
      toast.error("Mensagem vazia.");
      return;
    }
    setSending(true);
    try {
      const { instancia } = await getInstanciaDoUsuario(vendedorUserId);
      let number = contato.telefone.replace(/\D/g, "");
      if (number.startsWith("0")) number = "55" + number.substring(1);
      if (!number.startsWith("55")) number = "55" + number;

      const { error } = await supabase.functions.invoke("evolution-api", {
        body: { action: "send_text", instance_name: instancia, number, text: mensagem },
      });
      if (error) throw error;
      toast.success("Mensagem enviada via WhatsApp!");
      onSent?.();
      onOpenChange(false);
    } catch (err: any) {
      toast.error(`Falha ao enviar: ${err?.message || "erro desconhecido"}`);
    } finally {
      setSending(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={(v) => { if (!sending) onOpenChange(v); }}>
      <DialogContent className="max-w-lg" onInteractOutside={(e) => e.preventDefault()}>
        <DialogHeader>
          <DialogTitle>Enviar mensagem Fispal 2026</DialogTitle>
          <DialogDescription>
            Revise a mensagem que será enviada via WhatsApp para <strong>{contato?.nome || "—"}</strong>
            {contato?.telefone ? ` (${contato.telefone})` : ""}.
          </DialogDescription>
        </DialogHeader>
        {loading ? (
          <div className="flex items-center justify-center py-10">
            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
          </div>
        ) : (
          <div className="space-y-2">
            <Label>Mensagem</Label>
            <Textarea
              value={mensagem}
              onChange={(e) => setMensagem(e.target.value)}
              className="min-h-[260px] text-sm"
            />
          </div>
        )}
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={sending}>
            Pular envio
          </Button>
          <Button onClick={handleEnviar} disabled={sending || loading}>
            {sending ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Send className="h-4 w-4 mr-2" />}
            Enviar WhatsApp
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
