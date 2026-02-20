import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { ContractClause } from "@/lib/supabase-types";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Loader2, Plus, Search, BookOpen } from "lucide-react";
import { toast } from "sonner";
import { ScrollArea } from "@/components/ui/scroll-area";

interface ClauseLibraryProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSelect: (clause: ContractClause) => void;
  onCreateNew: () => void;
}

export function ClauseLibrary({ open, onOpenChange, onSelect, onCreateNew }: ClauseLibraryProps) {
  const [clauses, setClauses] = useState<ContractClause[]>([]);
  const [loading, setLoading] = useState(false);
  const [search, setSearch] = useState("");

  useEffect(() => {
    if (!open) return;
    loadClauses();
  }, [open]);

  async function loadClauses() {
    setLoading(true);
    const { data, error } = await supabase
      .from("contract_clauses")
      .select("*")
      .eq("ativo", true)
      .order("ordem_padrao")
      .order("titulo");
    if (error) toast.error("Erro ao carregar cláusulas: " + error.message);
    setClauses((data || []) as ContractClause[]);
    setLoading(false);
  }

  const filtered = clauses.filter((c) =>
    c.titulo.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <BookOpen className="h-4 w-4 text-primary" />
            Biblioteca de Cláusulas
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-3">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Buscar cláusula..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-9"
            />
          </div>

          <ScrollArea className="h-[300px]">
            {loading ? (
              <div className="flex justify-center py-8">
                <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
              </div>
            ) : filtered.length === 0 ? (
              <div className="text-center py-8 text-sm text-muted-foreground">
                {clauses.length === 0
                  ? "Nenhuma cláusula na biblioteca ainda"
                  : "Nenhuma cláusula encontrada"}
              </div>
            ) : (
              <div className="space-y-1.5 pr-3">
                {filtered.map((c) => (
                  <button
                    key={c.id}
                    onClick={() => { onSelect(c); onOpenChange(false); }}
                    className="w-full text-left p-3 rounded-lg border border-border hover:border-primary/30 hover:bg-primary/5 transition-colors"
                  >
                    <div className="font-medium text-sm">{c.titulo}</div>
                    {c.conteudo_html && (
                      <div className="text-xs text-muted-foreground mt-1 truncate">
                        {c.conteudo_html.replace(/<[^>]+>/g, "").substring(0, 100)}...
                      </div>
                    )}
                  </button>
                ))}
              </div>
            )}
          </ScrollArea>

          <Button
            type="button" variant="outline" className="w-full gap-2"
            onClick={() => { onCreateNew(); onOpenChange(false); }}
          >
            <Plus className="h-4 w-4" /> Criar Cláusula Nova
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
