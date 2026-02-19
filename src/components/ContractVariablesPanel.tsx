import { useState } from "react";
import { CONTRACT_VARIABLE_CATEGORIES } from "@/lib/contract-variables";
import { ChevronDown, ChevronRight, Copy } from "lucide-react";
import { toast } from "sonner";
import { ScrollArea } from "@/components/ui/scroll-area";

interface ContractVariablesPanelProps {
  onInsert: (variable: string) => void;
}

export function ContractVariablesPanel({ onInsert }: ContractVariablesPanelProps) {
  const [expanded, setExpanded] = useState<Record<string, boolean>>(
    Object.fromEntries(CONTRACT_VARIABLE_CATEGORIES.map((c) => [c.label, true]))
  );

  function toggle(label: string) {
    setExpanded((prev) => ({ ...prev, [label]: !prev[label] }));
  }

  function handleClick(key: string) {
    onInsert(`{{${key}}}`);
    toast.success("Variável inserida", { duration: 1500 });
  }

  function handleCopy(key: string) {
    navigator.clipboard.writeText(`{{${key}}}`);
    toast.success("Copiado!", { duration: 1500 });
  }

  return (
    <ScrollArea className="h-full">
      <div className="p-3 space-y-1">
        <h3 className="text-xs font-semibold uppercase text-muted-foreground tracking-wider mb-3">
          Variáveis Disponíveis
        </h3>
        {CONTRACT_VARIABLE_CATEGORIES.map((cat) => (
          <div key={cat.label}>
            <button
              onClick={() => toggle(cat.label)}
              className="w-full flex items-center gap-2 py-1.5 px-2 rounded-md hover:bg-muted/50 text-sm font-medium text-foreground transition-colors"
            >
              <span>{cat.icon}</span>
              <span className="flex-1 text-left">{cat.label}</span>
              {expanded[cat.label] ? (
                <ChevronDown className="h-3.5 w-3.5 text-muted-foreground" />
              ) : (
                <ChevronRight className="h-3.5 w-3.5 text-muted-foreground" />
              )}
            </button>
            {expanded[cat.label] && (
              <div className="ml-2 pl-4 border-l border-border/50 space-y-0.5 mb-2">
                {cat.variables.map((v) => (
                  <div
                    key={v.key}
                    className="group flex items-center gap-1 py-1 px-2 rounded-md hover:bg-primary/5 cursor-pointer transition-colors"
                    onClick={() => handleClick(v.key)}
                    title={`Exemplo: ${v.example}`}
                  >
                    <code className="text-xs font-mono text-primary/80 flex-1 truncate">
                      {`{{${v.key}}}`}
                    </code>
                    <button
                      onClick={(e) => { e.stopPropagation(); handleCopy(v.key); }}
                      className="opacity-0 group-hover:opacity-100 transition-opacity p-0.5"
                      title="Copiar"
                    >
                      <Copy className="h-3 w-3 text-muted-foreground" />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        ))}
      </div>
    </ScrollArea>
  );
}
