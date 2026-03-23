import { useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { X, Send, FileText, FileSpreadsheet, File, ImageIcon, Music } from "lucide-react";
import { cn } from "@/lib/utils";

interface Props {
  onConfirm: (file: File, caption: string) => void;
  onCancel: () => void;
}

function getFileIcon(type: string) {
  if (type.startsWith("image/")) return <ImageIcon className="h-8 w-8 text-primary" />;
  if (type.startsWith("audio/")) return <Music className="h-8 w-8 text-purple-500" />;
  if (type === "application/pdf") return <FileText className="h-8 w-8 text-destructive" />;
  if (type.includes("spreadsheet") || type.includes("excel") || type.includes(".xls"))
    return <FileSpreadsheet className="h-8 w-8 text-green-600" />;
  if (type.includes("word") || type.includes(".doc"))
    return <FileText className="h-8 w-8 text-blue-600" />;
  return <File className="h-8 w-8 text-muted-foreground" />;
}

function formatSize(bytes: number) {
  if (bytes < 1024) return bytes + " B";
  if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + " KB";
  return (bytes / (1024 * 1024)).toFixed(1) + " MB";
}

export default function ChatMediaUpload({ onConfirm, onCancel }: Props) {
  const [file, setFile] = useState<File | null>(null);
  const [caption, setCaption] = useState("");
  const [preview, setPreview] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0];
    if (!f) return;
    setFile(f);
    if (f.type.startsWith("image/")) {
      const reader = new FileReader();
      reader.onload = () => setPreview(reader.result as string);
      reader.readAsDataURL(f);
    }
  };

  if (!file) {
    return (
      <div className="border-t border-border p-3 bg-card">
        <input
          ref={inputRef}
          type="file"
          className="hidden"
          accept="image/*,audio/*,.pdf,.doc,.docx,.xls,.xlsx"
          onChange={handleFileChange}
        />
        <div
          onClick={() => inputRef.current?.click()}
          className="border-2 border-dashed border-muted-foreground/30 rounded-lg p-6 text-center cursor-pointer hover:border-primary/50 transition-colors"
        >
          <p className="text-sm text-muted-foreground">Clique para selecionar um arquivo</p>
          <p className="text-xs text-muted-foreground/60 mt-1">Imagens, áudios, PDF, Word, Excel</p>
        </div>
        <Button variant="ghost" size="sm" className="mt-2" onClick={onCancel}>
          Cancelar
        </Button>
      </div>
    );
  }

  const isImage = file.type.startsWith("image/");

  return (
    <div className="border-t border-border p-3 bg-card space-y-2">
      <div className="flex items-center gap-3 p-2 bg-muted/50 rounded-lg">
        {isImage && preview ? (
          <img src={preview} alt="" className="w-16 h-16 object-cover rounded" />
        ) : (
          <div className="w-16 h-16 flex items-center justify-center bg-muted rounded">
            {getFileIcon(file.type)}
          </div>
        )}
        <div className="flex-1 min-w-0">
          <p className="text-sm font-medium truncate">{file.name}</p>
          <p className="text-xs text-muted-foreground">{formatSize(file.size)}</p>
        </div>
        <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => { setFile(null); setPreview(null); }}>
          <X className="h-4 w-4" />
        </Button>
      </div>
      {isImage && (
        <input
          type="text"
          placeholder="Legenda (opcional)..."
          value={caption}
          onChange={(e) => setCaption(e.target.value)}
          className="w-full text-sm border border-input rounded-md px-3 py-1.5 bg-background"
        />
      )}
      <div className="flex gap-2 justify-end">
        <Button variant="outline" size="sm" onClick={onCancel}>Cancelar</Button>
        <Button size="sm" onClick={() => onConfirm(file, caption)} className="gap-1">
          <Send className="h-3 w-3" /> Enviar
        </Button>
      </div>
    </div>
  );
}
