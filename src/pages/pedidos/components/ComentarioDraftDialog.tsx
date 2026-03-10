import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { MessageSquare, Paperclip, Trash2 } from "lucide-react";
import { PRIORIDADES_DRAFT } from "../constants";

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  texto: string;
  setTexto: (v: string) => void;
  prioridade: string;
  setPrioridade: (v: string) => void;
  arquivo: File | null;
  setArquivo: (v: File | null) => void;
  fileRef: React.RefObject<HTMLInputElement>;
  isEditing: boolean;
  onSave: () => void;
  onFileChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
}

export function ComentarioDraftDialog({
  open,
  onOpenChange,
  texto,
  setTexto,
  prioridade,
  setPrioridade,
  arquivo,
  setArquivo,
  fileRef,
  isEditing,
  onSave,
  onFileChange,
}: Props) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-base">
            <MessageSquare className="h-4 w-4" /> {isEditing ? "Editar Comentário" : "Novo Comentário Interno"}
          </DialogTitle>
        </DialogHeader>
        <div className="space-y-3">
          <Textarea
            placeholder="Escreva um comentário..."
            value={texto}
            onChange={(e) => setTexto(e.target.value)}
            className="min-h-[80px] text-sm"
          />
          <div>
            <Label className="text-xs text-muted-foreground mb-1 block">Prioridade:</Label>
            <div className="flex flex-wrap gap-2">
              {PRIORIDADES_DRAFT.map((p) => (
                <button
                  key={p.value}
                  type="button"
                  onClick={() => setPrioridade(p.value)}
                  className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs border transition-colors ${
                    prioridade === p.value
                      ? "border-primary bg-primary/10 font-semibold"
                      : "border-border hover:border-primary/50"
                  }`}
                >
                  {p.emoji} {p.label}
                </button>
              ))}
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="text-xs"
              onClick={() => fileRef.current?.click()}
            >
              <Paperclip className="h-3.5 w-3.5 mr-1" />
              {arquivo ? arquivo.name : "Anexar (máx 11MB)"}
            </Button>
            <input
              type="file"
              ref={fileRef}
              className="hidden"
              onChange={onFileChange}
            />
            {arquivo && (
              <Button
                type="button"
                variant="ghost"
                size="icon"
                className="h-6 w-6"
                onClick={() => { setArquivo(null); if (fileRef.current) fileRef.current.value = ""; }}
              >
                <Trash2 className="h-3 w-3 text-destructive" />
              </Button>
            )}
          </div>
        </div>
        <DialogFooter>
          <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>Cancelar</Button>
          <Button type="button" onClick={onSave} disabled={!texto.trim()}>
            {isEditing ? "Salvar" : "Adicionar"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
