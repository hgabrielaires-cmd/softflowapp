import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { MessageSquare, Paperclip, Trash2 } from "lucide-react";
import { PRIORIDADES_DRAFT } from "../constants";
import { MentionInput } from "@/components/MentionInput";
import { toast } from "sonner";

const MAX_FILE_SIZE = 11 * 1024 * 1024; // 11MB

interface MentionUser {
  id: string;
  user_id: string;
  full_name: string;
}

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  texto: string;
  setTexto: (v: string) => void;
  prioridade: string;
  setPrioridade: (v: string) => void;
  arquivos: File[];
  setArquivos: (v: File[]) => void;
  fileRef: React.RefObject<HTMLInputElement>;
  isEditing: boolean;
  onSave: () => void;
  users?: MentionUser[];
}

export function ComentarioDraftDialog({
  open,
  onOpenChange,
  texto,
  setTexto,
  prioridade,
  setPrioridade,
  arquivos,
  setArquivos,
  fileRef,
  isEditing,
  onSave,
  users = [],
}: Props) {

  const handleFilesChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files) return;
    const newFiles: File[] = [];
    for (let i = 0; i < files.length; i++) {
      if (files[i].size > MAX_FILE_SIZE) {
        toast.error(`"${files[i].name}" excede o limite de 11MB.`);
        continue;
      }
      newFiles.push(files[i]);
    }
    if (newFiles.length > 0) {
      setArquivos([...arquivos, ...newFiles]);
    }
    if (fileRef.current) fileRef.current.value = "";
  };

  const removeFile = (index: number) => {
    setArquivos(arquivos.filter((_, i) => i !== index));
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-base">
            <MessageSquare className="h-4 w-4" /> {isEditing ? "Editar Comentário" : "Novo Comentário Interno"}
          </DialogTitle>
        </DialogHeader>
        <div className="space-y-3">
          <MentionInput
            value={texto}
            onChange={setTexto}
            users={users}
            placeholder="Escreva um comentário... Use @nome para mencionar"
            className="min-h-[80px]"
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
          <div className="space-y-2">
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="text-xs"
              onClick={() => fileRef.current?.click()}
            >
              <Paperclip className="h-3.5 w-3.5 mr-1" />
              Anexar arquivos (máx 11MB cada)
            </Button>
            <input
              type="file"
              ref={fileRef}
              className="hidden"
              multiple
              onChange={handleFilesChange}
            />
            {arquivos.length > 0 && (
              <div className="space-y-1">
                {arquivos.map((file, idx) => (
                  <div key={idx} className="flex items-center gap-2 bg-muted/50 rounded px-2 py-1">
                    <Paperclip className="h-3 w-3 text-muted-foreground shrink-0" />
                    <span className="text-xs truncate flex-1">{file.name}</span>
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      className="h-5 w-5 shrink-0"
                      onClick={() => removeFile(idx)}
                    >
                      <Trash2 className="h-3 w-3 text-destructive" />
                    </Button>
                  </div>
                ))}
              </div>
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
