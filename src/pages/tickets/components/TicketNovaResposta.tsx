import { useState, useCallback, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Send, Lock, Paperclip, X, Loader2 } from "lucide-react";
import { MentionInput } from "@/components/MentionInput";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

interface MentionUser {
  id: string;
  user_id: string;
  full_name: string;
}

export interface TicketAnexoUpload {
  nome: string;
  url: string;
  tipo?: string;
}

interface Props {
  onSubmit: (conteudo: string, visibilidade: "publico" | "interno", mentionedUserIds: string[], anexos: TicketAnexoUpload[]) => void;
  isLoading?: boolean;
  users: MentionUser[];
}

export function TicketNovaResposta({ onSubmit, isLoading, users }: Props) {
  const [text, setText] = useState("");
  const [interno, setInterno] = useState(false);
  const [mentionedIds, setMentionedIds] = useState<string[]>([]);
  const [files, setFiles] = useState<File[]>([]);
  const [uploading, setUploading] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  const handleMentionsChange = useCallback((ids: string[]) => {
    setMentionedIds(ids);
  }, []);

  const handleSubmit = async () => {
    if (!text.trim() && files.length === 0) return;
    setUploading(true);
    try {
      // Upload files to R2
      const anexos: TicketAnexoUpload[] = [];
      for (const file of files) {
        if (file.size > 10 * 1024 * 1024) {
          toast.error(`Arquivo "${file.name}" excede 10MB`);
          continue;
        }
        const base64 = await fileToBase64(file);
        const { data, error } = await supabase.functions.invoke("r2-upload", {
          body: { arquivo_base64: base64, nome_arquivo: file.name, mime_type: file.type, pasta: "tickets" },
        });
        if (error || !data?.url) {
          toast.error(`Erro ao enviar "${file.name}"`);
          continue;
        }
        anexos.push({ nome: file.name, url: data.url, tipo: file.type });
      }
      onSubmit(text.trim(), interno ? "interno" : "publico", mentionedIds, anexos);
      setText("");
      setMentionedIds([]);
      setFiles([]);
    } catch {
      toast.error("Erro ao enviar resposta.");
    } finally {
      setUploading(false);
    }
  };

  return (
    <div className="border-t pt-3 space-y-2">
      <div className="flex items-center gap-2">
        <Label className="text-xs font-medium">Nova Resposta</Label>
        <div className="flex items-center gap-1.5 ml-auto">
          {interno && <Lock className="h-3 w-3 text-amber-600" />}
          <Label className="text-xs">{interno ? "Interno" : "Público"}</Label>
          <Switch checked={interno} onCheckedChange={setInterno} />
        </div>
      </div>

      {/* File previews */}
      {files.length > 0 && (
        <div className="flex flex-wrap gap-1.5">
          {files.map((f, i) => (
            <Badge key={i} variant="secondary" className="text-[10px] gap-1 pr-1">
              <Paperclip className="h-2.5 w-2.5" />
              <span className="max-w-[120px] truncate">{f.name}</span>
              <button onClick={() => setFiles(prev => prev.filter((_, idx) => idx !== i))} className="hover:text-destructive">
                <X className="h-3 w-3" />
              </button>
            </Badge>
          ))}
        </div>
      )}

      <div className="flex gap-2">
        <div className="flex-1">
          <MentionInput
            value={text}
            onChange={setText}
            users={users}
            placeholder="Digite sua resposta... Use @nome para mencionar"
            className="min-h-[80px]"
            onMentionsChange={handleMentionsChange}
          />
        </div>
        <button
          type="button"
          className="self-end p-1.5 rounded hover:bg-muted"
          title="Anexar arquivo"
          onClick={() => fileRef.current?.click()}
        >
          <Paperclip className="h-4 w-4 text-muted-foreground" />
        </button>
        <input
          ref={fileRef}
          type="file"
          multiple
          className="hidden"
          onChange={(e) => {
            if (e.target.files) setFiles(prev => [...prev, ...Array.from(e.target.files!)]);
            e.target.value = "";
          }}
        />
      </div>

      <div className="flex justify-end">
        <Button size="sm" onClick={handleSubmit} disabled={(!text.trim() && files.length === 0) || isLoading || uploading}>
          {uploading ? <><Loader2 className="h-4 w-4 mr-1 animate-spin" />Enviando...</> : <><Send className="h-4 w-4 mr-1" />Enviar</>}
        </Button>
      </div>
    </div>
  );
}

function fileToBase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const result = reader.result as string;
      resolve(result.split(",")[1]);
    };
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}
