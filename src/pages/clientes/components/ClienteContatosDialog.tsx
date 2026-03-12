import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Plus, Phone, Mail, Pencil, Loader2, AlertCircle, Star, Users } from "lucide-react";
import { Cliente } from "@/lib/supabase-types";
import type { ClienteContato } from "@/pages/clientes/types";
import { formatPhoneDisplay } from "@/lib/utils";

interface ClienteContatosDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  cliente: Cliente | null;
  contatos: ClienteContato[];
  loading: boolean;
  canEditExisting: boolean;
  onNovoContato: () => void;
  onEditContato: (c: ClienteContato) => void;
  onToggleDecisor: (c: ClienteContato) => void;
  onDesativarContato: (c: ClienteContato) => void;
}

export function ClienteContatosDialog({
  open,
  onOpenChange,
  cliente,
  contatos,
  loading,
  canEditExisting,
  onNovoContato,
  onEditContato,
  onToggleDecisor,
  onDesativarContato,
}: ClienteContatosDialogProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Users className="h-4 w-4" />
            Contatos — {cliente?.nome_fantasia}
          </DialogTitle>
        </DialogHeader>

        {canEditExisting && (
          <div className="flex justify-end">
            <Button size="sm" className="gap-1.5" onClick={onNovoContato}>
              <Plus className="h-3.5 w-3.5" /> Novo contato
            </Button>
          </div>
        )}

        {loading ? (
          <div className="flex items-center justify-center py-10">
            <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
          </div>
        ) : contatos.length === 0 ? (
          <div className="text-center text-muted-foreground py-10 text-sm">
            Nenhum contato cadastrado. Clique em "Novo contato" para adicionar.
          </div>
        ) : (
          <div className="rounded-lg border border-border divide-y divide-border">
            {contatos.map((c) => (
              <div key={c.id} className={`flex items-start gap-3 px-4 py-3 ${!c.ativo ? "opacity-50" : ""}`}>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <p className="text-sm font-medium">{c.nome}</p>
                    {c.decisor && (
                      <span className="inline-flex items-center gap-1 text-xs px-1.5 py-0.5 rounded-full bg-primary/10 text-primary font-medium">
                        <Star className="h-2.5 w-2.5 fill-current" /> Decisor
                      </span>
                    )}
                    {!c.ativo && (
                      <span className="text-xs px-1.5 py-0.5 rounded-full bg-muted text-muted-foreground">Inativo</span>
                    )}
                  </div>
                  {c.cargo && <p className="text-xs text-muted-foreground">{c.cargo}</p>}
                  <div className="flex gap-3 mt-1">
                    {c.telefone && (
                      <span className="text-xs text-muted-foreground flex items-center gap-1">
                        <Phone className="h-3 w-3" />{c.telefone}
                      </span>
                    )}
                    {c.email && (
                      <span className="text-xs text-muted-foreground flex items-center gap-1">
                        <Mail className="h-3 w-3" />{c.email}
                      </span>
                    )}
                  </div>
                </div>
                {canEditExisting && (
                  <div className="flex items-center gap-1 shrink-0">
                    <Button
                      variant="ghost" size="icon" className={`h-7 w-7 ${c.decisor ? "text-primary" : "text-muted-foreground"}`}
                      onClick={() => onToggleDecisor(c)}
                      title={c.decisor ? "Remover como decisor" : "Marcar como decisor"}
                    >
                      <Star className={`h-3.5 w-3.5 ${c.decisor ? "fill-current" : ""}`} />
                    </Button>
                    <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => onEditContato(c)} title="Editar contato">
                      <Pencil className="h-3.5 w-3.5" />
                    </Button>
                    {c.ativo && (
                      <Button
                        variant="ghost" size="icon"
                        className="h-7 w-7 text-destructive hover:text-destructive"
                        onClick={() => onDesativarContato(c)}
                        title="Desativar contato"
                      >
                        <AlertCircle className="h-3.5 w-3.5" />
                      </Button>
                    )}
                  </div>
                )}
              </div>
            ))}
          </div>
        )}

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Fechar</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
