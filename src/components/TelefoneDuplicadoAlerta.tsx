import { AlertTriangle, User, Building2, Phone } from "lucide-react";
import { Button } from "@/components/ui/button";
import { formatPhoneDisplay } from "@/lib/utils";
import type { ContatoDuplicado } from "@/lib/validarTelefoneContato";

interface Props {
  contatos: ContatoDuplicado[];
  onUsar: (contato: ContatoDuplicado) => void;
  onIgnorar: () => void;
}

export function TelefoneDuplicadoAlerta({ contatos, onUsar, onIgnorar }: Props) {
  if (contatos.length === 0) return null;

  return (
    <div className="rounded-lg border border-yellow-400/50 bg-yellow-50 dark:bg-yellow-950/20 p-3 space-y-2 animate-in fade-in slide-in-from-top-1 duration-200">
      <div className="flex items-center gap-2 text-yellow-700 dark:text-yellow-400">
        <AlertTriangle className="h-4 w-4 shrink-0" />
        <span className="text-xs font-semibold">Número já cadastrado no sistema</span>
      </div>

      <div className="space-y-1.5">
        {contatos.map((c) => (
          <div
            key={c.id}
            className="flex items-center gap-3 rounded-md border border-border bg-background p-2"
          >
            <div className="flex-1 min-w-0 space-y-0.5">
              <div className="flex items-center gap-1.5 text-sm font-medium text-foreground">
                <User className="h-3 w-3 shrink-0 text-muted-foreground" />
                <span className="truncate">{c.nome}</span>
              </div>
              {c.empresa && (
                <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                  <Building2 className="h-3 w-3 shrink-0" />
                  <span className="truncate">{c.empresa}</span>
                </div>
              )}
              <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                <Phone className="h-3 w-3 shrink-0" />
                {formatPhoneDisplay(c.telefone)}
                <span className="ml-1 text-[10px] px-1.5 py-0 rounded-full bg-muted">
                  {c.origem === "cliente" ? "Cliente" : "CRM"}
                </span>
              </div>
            </div>
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="h-7 text-xs shrink-0"
              onClick={() => onUsar(c)}
            >
              Usar este
            </Button>
          </div>
        ))}
      </div>

      <button
        type="button"
        className="text-xs text-muted-foreground hover:text-foreground underline underline-offset-2 transition-colors"
        onClick={onIgnorar}
      >
        Não é o mesmo contato, cadastrar mesmo assim
      </button>
    </div>
  );
}
