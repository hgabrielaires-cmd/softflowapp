import { useEffect, useState } from "react";
import { CheckCircle, MessageSquare, Star, ClipboardList } from "lucide-react";
import { cn } from "@/lib/utils";

interface Props {
  onComplete: () => void;
}

const STEPS = [
  { icon: MessageSquare, label: "Enviando mensagem de encerramento..." },
  { icon: Star, label: "Enviando pesquisa de satisfação..." },
  { icon: ClipboardList, label: "Salvando histórico do atendimento..." },
  { icon: CheckCircle, label: "Atendimento encerrado com sucesso!" },
];

const STEP_DURATION = 1200;

export default function EncerramentoAtendimento({ onComplete }: Props) {
  const [currentStep, setCurrentStep] = useState(0);

  useEffect(() => {
    if (currentStep < STEPS.length - 1) {
      const timer = setTimeout(() => setCurrentStep((s) => s + 1), STEP_DURATION);
      return () => clearTimeout(timer);
    } else {
      const timer = setTimeout(onComplete, 1500);
      return () => clearTimeout(timer);
    }
  }, [currentStep, onComplete]);

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-background/80 backdrop-blur-sm animate-fade-in">
      <div className="bg-card border rounded-2xl shadow-2xl p-8 w-full max-w-sm space-y-6 animate-scale-in">
        {/* Spinner */}
        <div className="flex justify-center">
          <div className="relative h-16 w-16">
            {currentStep < STEPS.length - 1 ? (
              <div className="h-16 w-16 rounded-full border-4 border-muted border-t-primary animate-spin" />
            ) : (
              <div className="h-16 w-16 rounded-full bg-green-100 dark:bg-green-900/30 flex items-center justify-center animate-scale-in">
                <CheckCircle className="h-9 w-9 text-green-600 dark:text-green-400" />
              </div>
            )}
          </div>
        </div>

        {/* Title */}
        <h3 className="text-center text-lg font-semibold text-foreground">
          {currentStep < STEPS.length - 1 ? "Encerrando atendimento..." : "Concluído!"}
        </h3>

        {/* Steps */}
        <div className="space-y-3">
          {STEPS.map((step, i) => {
            const Icon = step.icon;
            const isDone = i < currentStep;
            const isActive = i === currentStep;
            const isPending = i > currentStep;

            return (
              <div
                key={i}
                className={cn(
                  "flex items-center gap-3 px-3 py-2 rounded-lg transition-all duration-500",
                  isActive && "bg-primary/10",
                  isDone && "opacity-60",
                  isPending && "opacity-30"
                )}
              >
                {isDone ? (
                  <CheckCircle className="h-5 w-5 text-green-600 dark:text-green-400 shrink-0" />
                ) : (
                  <Icon
                    className={cn(
                      "h-5 w-5 shrink-0 transition-colors",
                      isActive ? "text-primary" : "text-muted-foreground"
                    )}
                  />
                )}
                <span
                  className={cn(
                    "text-sm transition-colors",
                    isActive && "text-foreground font-medium",
                    isDone && "text-muted-foreground line-through",
                    isPending && "text-muted-foreground"
                  )}
                >
                  {step.label}
                </span>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
