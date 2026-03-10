import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Loader2, FileOutput, Send, CheckCircle2, XCircle } from "lucide-react";
import { ZAPSIGN_MSGS, WHATSAPP_MSGS, GERAR_MSGS_CONTRATO, GERAR_MSGS_OA } from "../constants";
import type { ZapsignPopupStep } from "../useContratoGeracaoZapsign";

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  step: ZapsignPopupStep;
  msgIndex: number;
  contratoTipo?: string;
  error: string | null;
}

export function ZapsignPopupDialog({ open, onOpenChange, step, msgIndex, contratoTipo, error }: Props) {
  const isOA = contratoTipo === "OA";
  const canClose = step === "done" || step === "erro" || step === "whatsapp_erro";

  return (
    <Dialog
      open={open}
      onOpenChange={(v) => { if (canClose) onOpenChange(v); }}
    >
      <DialogContent className="max-w-sm" aria-describedby="zapsign-popup-desc" onPointerDownOutside={(e) => {
        if (!canClose) e.preventDefault();
      }} onEscapeKeyDown={(e) => {
        if (!canClose) e.preventDefault();
      }}>
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-base">
            {step === "gerando" ? (
              <FileOutput className="h-5 w-5 text-primary" />
            ) : (
              <Send className="h-5 w-5 text-primary" />
            )}
            {step === "gerando"
              ? (isOA ? "Gerando OA" : "Gerando Contrato")
              : step === "whatsapp" ? "Enviando WhatsApp"
              : step === "done" ? "Tudo pronto!"
              : step === "erro" ? "Erro"
              : "Enviando para ZapSign"}
          </DialogTitle>
          <DialogDescription id="zapsign-popup-desc" className="sr-only">
            Progresso da geração, envio para assinatura e notificação
          </DialogDescription>
        </DialogHeader>

        <div className="py-6 flex flex-col items-center gap-5">
          {/* Passo 0: Gerando PDF */}
          {step === "gerando" && (
            <div className="flex flex-col items-center gap-4 animate-fade-in">
              <div className="relative flex items-center justify-center">
                <span className="absolute inline-flex h-20 w-20 rounded-full bg-primary/10 animate-ping" />
                <span className="absolute inline-flex h-14 w-14 rounded-full bg-primary/20 animate-ping [animation-delay:0.3s]" />
                <div className="relative flex items-center justify-center h-16 w-16 rounded-full bg-primary/15 border-2 border-primary/30">
                  <Loader2 className="h-7 w-7 text-primary animate-spin" />
                </div>
              </div>
              <div className="text-center space-y-1">
                <p className="font-semibold text-foreground">
                  {isOA ? "Gerando OA…" : "Gerando contrato…"}
                </p>
                <p className="text-sm text-muted-foreground transition-all duration-500 min-h-[1.5rem]">
                  {(isOA ? GERAR_MSGS_OA : GERAR_MSGS_CONTRATO)[msgIndex]}
                </p>
              </div>
            </div>
          )}

          {/* Passo 1: ZapSign */}
          {step === "zapsign" && (
            <div className="flex flex-col items-center gap-4 animate-fade-in">
              <div className="relative flex items-center justify-center">
                <span className="absolute inline-flex h-20 w-20 rounded-full bg-primary/10 animate-ping" />
                <span className="absolute inline-flex h-14 w-14 rounded-full bg-primary/20 animate-ping [animation-delay:0.3s]" />
                <div className="relative flex items-center justify-center h-16 w-16 rounded-full bg-primary/15 border-2 border-primary/30">
                  <Loader2 className="h-7 w-7 text-primary animate-spin" />
                </div>
              </div>
              <div className="text-center space-y-1">
                <p className="font-semibold text-foreground">Enviando para ZapSign…</p>
                <p className="text-sm text-muted-foreground transition-all duration-500 min-h-[1.5rem]">
                  {ZAPSIGN_MSGS[msgIndex]}
                </p>
              </div>
            </div>
          )}

          {/* Passo 2: WhatsApp */}
          {step === "whatsapp" && (
            <div className="flex flex-col items-center gap-4 animate-fade-in">
              <div className="relative flex items-center justify-center">
                <span className="absolute inline-flex h-20 w-20 rounded-full bg-emerald-500/10 animate-ping" />
                <span className="absolute inline-flex h-14 w-14 rounded-full bg-emerald-500/20 animate-ping [animation-delay:0.3s]" />
                <div className="relative flex items-center justify-center h-16 w-16 rounded-full bg-emerald-50 dark:bg-emerald-900/20 border-2 border-emerald-300 dark:border-emerald-700">
                  <Loader2 className="h-7 w-7 text-emerald-600 dark:text-emerald-400 animate-spin" />
                </div>
              </div>
              <div className="text-center space-y-1">
                <p className="font-semibold text-foreground">Disparando WhatsApp…</p>
                <p className="text-sm text-muted-foreground transition-all duration-500 min-h-[2.5rem]">
                  {WHATSAPP_MSGS[msgIndex]}
                </p>
              </div>
            </div>
          )}

          {/* Concluído */}
          {step === "done" && (
            <div className="flex flex-col items-center gap-4 animate-fade-in">
              <div className="relative flex items-center justify-center">
                <span className="absolute inline-flex h-20 w-20 rounded-full bg-emerald-500/10" />
                <div className="relative flex items-center justify-center h-16 w-16 rounded-full bg-emerald-50 dark:bg-emerald-900/20 border-2 border-emerald-300 dark:border-emerald-700">
                  <CheckCircle2 className="h-8 w-8 text-emerald-600 dark:text-emerald-400" />
                </div>
              </div>
              <div className="text-center space-y-2">
                <p className="font-semibold text-foreground text-base">
                  ✅ Tudo pronto!
                </p>
                <p className="text-sm text-muted-foreground leading-relaxed">
                  🤖 O Flowy acabou de disparar a mensagem no WhatsApp do cliente!
                </p>
              </div>
              <Button
                className="w-full gap-2 mt-2"
                onClick={() => onOpenChange(false)}
              >
                <CheckCircle2 className="h-4 w-4" />
                Fechar
              </Button>
            </div>
          )}

          {/* Erro */}
          {step === "erro" && (
            <div className="flex flex-col items-center gap-4 animate-fade-in">
              <div className="flex items-center justify-center h-16 w-16 rounded-full bg-destructive/10 border-2 border-destructive/30">
                <XCircle className="h-8 w-8 text-destructive" />
              </div>
              <div className="text-center space-y-1">
                <p className="font-semibold text-foreground">Falha no envio</p>
                <p className="text-xs text-muted-foreground">
                  {error || "Erro inesperado. Tente novamente."}
                </p>
              </div>
              <Button
                className="w-full"
                variant="outline"
                onClick={() => onOpenChange(false)}
              >
                Fechar
              </Button>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
