import flowyCorpo from "@/assets/flowy-corpo.png";
import flowyAlegre from "@/assets/flowy-alegre.png";
import flowyTriste from "@/assets/flowy-triste.png";
import flowyAnimado from "@/assets/flowy-animado.gif";
import { cn } from "@/lib/utils";

export type FlowyMood = "alegre" | "triste" | "corpo" | "animado";

const flowyImages: Record<FlowyMood, string> = {
  corpo: flowyCorpo,
  alegre: flowyAlegre,
  triste: flowyTriste,
  animado: flowyAnimado,
};

interface FlowyProps {
  mood?: FlowyMood;
  size?: "sm" | "md" | "lg" | "xl";
  message?: string;
  className?: string;
  showMessage?: boolean;
}

const sizeClasses: Record<string, string> = {
  sm: "w-12 h-12",
  md: "w-24 h-24",
  lg: "w-40 h-40",
  xl: "w-60 h-60",
};

export function Flowy({ mood = "alegre", size = "md", message, className, showMessage = true }: FlowyProps) {
  return (
    <div className={cn("flex flex-col items-center gap-2", className)}>
      <img
        src={flowyImages[mood]}
        alt={`Flowy ${mood}`}
        className={cn("object-contain", sizeClasses[size])}
        draggable={false}
      />
      {showMessage && message && (
        <p className="text-sm text-muted-foreground text-center max-w-xs">{message}</p>
      )}
    </div>
  );
}
