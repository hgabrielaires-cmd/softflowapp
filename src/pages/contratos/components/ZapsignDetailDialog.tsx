import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Send, ClipboardCopy, ExternalLink, RefreshCw, Loader2, CheckCircle2 } from "lucide-react";
import { toast } from "sonner";
import type { Contrato, ZapSignRecord } from "../types";

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  contrato: Contrato | null;
  zapsignRecord: ZapSignRecord | undefined;
  getZapSignStatusBadge: (status: string | undefined, contratoStatus?: string) => React.ReactNode;
  onAtualizarStatus: (contratoId: string) => void;
  onReenviarWhatsapp: (contrato: Contrato) => void;
  reenviandoWhatsapp: boolean;
}

export function ZapsignDetailDialog({
  open,
  onOpenChange,
  contrato,
  zapsignRecord,
  getZapSignStatusBadge,
  onAtualizarStatus,
  onReenviarWhatsapp,
  reenviandoWhatsapp,
}: Props) {
  if (!contrato || !zapsignRecord) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md" aria-describedby="zapsign-desc">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-base">
            <Send className="h-5 w-5 text-primary" />
            ZapSign — {contrato.numero_exibicao}
          </DialogTitle>
          <DialogDescription id="zapsign-desc" className="sr-only">
            Detalhes da assinatura no ZapSign
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <span className="text-sm text-muted-foreground">Status</span>
            {getZapSignStatusBadge(zapsignRecord.status)}
          </div>

          <div className="space-y-2">
            <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Signatários</p>
            {zapsignRecord.signers.map((signer, i) => (
              <div key={i} className="rounded-lg border border-border p-3 space-y-1">
                <span className="text-sm font-medium">{signer.name}</span>
                {signer.email && <p className="text-xs text-muted-foreground">{signer.email}</p>}
                {signer.sign_url && (
                  <div className="flex gap-1 pt-1">
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-6 px-2 text-xs gap-1"
                      onClick={() => {
                        navigator.clipboard.writeText(signer.sign_url);
                        toast.success("Link copiado!");
                      }}
                    >
                      <ClipboardCopy className="h-3 w-3" />
                      Copiar Link
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-6 px-2 text-xs gap-1"
                      onClick={() => window.open(signer.sign_url, "_blank")}
                    >
                      <ExternalLink className="h-3 w-3" />
                      Abrir
                    </Button>
                  </div>
                )}
                <div className="pt-1">
                  {(() => {
                    const s = signer.status?.toLowerCase();
                    if (s === "signed")
                      return <Badge className="bg-emerald-100 text-emerald-700 border-emerald-200 hover:bg-emerald-100 text-xs">Assinado</Badge>;
                    if (s === "refused" || s === "canceled")
                      return <Badge className="bg-red-100 text-red-700 border-red-200 hover:bg-red-100 text-xs">Recusado</Badge>;
                    return <Badge className="bg-amber-100 text-amber-700 border-amber-200 hover:bg-amber-100 text-xs">Aguardando assinatura</Badge>;
                  })()}
                </div>
              </div>
            ))}
          </div>

          <div className="flex gap-2 pt-2">
            <Button
              variant="outline"
              className="flex-1 gap-1"
              onClick={() => onAtualizarStatus(contrato.id)}
            >
              <RefreshCw className="h-4 w-4" />
              Atualizar Status
            </Button>
            <Button
              variant="outline"
              className="flex-1 gap-1"
              disabled={reenviandoWhatsapp}
              onClick={() => onReenviarWhatsapp(contrato)}
            >
              {reenviandoWhatsapp ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
              Reenviar WhatsApp
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
