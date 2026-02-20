import { useRef, useCallback } from "react";
import { TemplateClause } from "@/lib/supabase-types";
import { ContractVariablesPanel } from "@/components/ContractVariablesPanel";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  ChevronUp, ChevronDown, Trash2, ChevronRight, ChevronDown as ChevronDownIcon,
  GripVertical,
} from "lucide-react";
import { useState } from "react";

interface ClauseEditorProps {
  clause: TemplateClause;
  index: number;
  total: number;
  onChange: (id: string, field: keyof TemplateClause, value: string) => void;
  onMoveUp: (id: string) => void;
  onMoveDown: (id: string) => void;
  onRemove: (id: string) => void;
}

export function ClauseEditor({
  clause, index, total, onChange, onMoveUp, onMoveDown, onRemove,
}: ClauseEditorProps) {
  const [expanded, setExpanded] = useState(false);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const handleInsertVariable = useCallback((variable: string) => {
    const textarea = textareaRef.current;
    if (!textarea) {
      onChange(clause.id, "conteudo_html", clause.conteudo_html + variable);
      return;
    }
    const start = textarea.selectionStart;
    const end = textarea.selectionEnd;
    const text = clause.conteudo_html;
    const newText = text.substring(0, start) + variable + text.substring(end);
    onChange(clause.id, "conteudo_html", newText);
    requestAnimationFrame(() => {
      textarea.focus();
      const newPos = start + variable.length;
      textarea.setSelectionRange(newPos, newPos);
    });
  }, [clause.id, clause.conteudo_html, onChange]);

  return (
    <div className="border border-border rounded-lg bg-card overflow-hidden">
      {/* Header */}
      <div className="flex items-center gap-2 px-3 py-2 bg-muted/30 border-b border-border">
        <GripVertical className="h-4 w-4 text-muted-foreground/50 shrink-0" />
        <span className="text-xs font-bold text-primary w-8 shrink-0">
          {String(index + 1).padStart(2, "0")}
        </span>
        <Input
          value={clause.titulo}
          onChange={(e) => onChange(clause.id, "titulo", e.target.value)}
          className="h-7 text-sm font-medium flex-1 border-0 bg-transparent px-1 focus-visible:ring-1"
          placeholder="Título da cláusula"
        />
        <div className="flex items-center gap-0.5 shrink-0">
          <Button
            type="button" variant="ghost" size="icon"
            className="h-6 w-6" disabled={index === 0}
            onClick={() => onMoveUp(clause.id)}
          >
            <ChevronUp className="h-3.5 w-3.5" />
          </Button>
          <Button
            type="button" variant="ghost" size="icon"
            className="h-6 w-6" disabled={index === total - 1}
            onClick={() => onMoveDown(clause.id)}
          >
            <ChevronDown className="h-3.5 w-3.5" />
          </Button>
          <Button
            type="button" variant="ghost" size="icon"
            className="h-6 w-6 text-destructive hover:text-destructive"
            onClick={() => onRemove(clause.id)}
          >
            <Trash2 className="h-3.5 w-3.5" />
          </Button>
          <Button
            type="button" variant="ghost" size="icon"
            className="h-6 w-6"
            onClick={() => setExpanded(!expanded)}
          >
            {expanded ? <ChevronDownIcon className="h-3.5 w-3.5" /> : <ChevronRight className="h-3.5 w-3.5" />}
          </Button>
        </div>
      </div>

      {/* Body - expandable */}
      {expanded && (
        <div className="flex">
          <div className="flex-1 flex flex-col">
            <textarea
              ref={textareaRef}
              value={clause.conteudo_html}
              onChange={(e) => onChange(clause.id, "conteudo_html", e.target.value)}
              className="w-full resize-none p-3 font-mono text-xs bg-background text-foreground focus:outline-none border-0 min-h-[200px]"
              placeholder="Conteúdo HTML da cláusula... Use {{variavel}} para campos dinâmicos."
              spellCheck={false}
            />
          </div>
          <div className="w-[240px] border-l border-border bg-muted/20 shrink-0 max-h-[300px] overflow-auto">
            <ContractVariablesPanel onInsert={handleInsertVariable} />
          </div>
        </div>
      )}
    </div>
  );
}
