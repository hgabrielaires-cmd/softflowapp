import { useRef, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useClienteDocumentos } from "@/hooks/useClienteDocumentos";
import { Button } from "@/components/ui/button";
import { Loader2, Plus, Download, Trash2, FileText } from "lucide-react";
import { toast } from "sonner";

const MAX_FILE_SIZE = 11 * 1024 * 1024;

interface Props {
  clienteId: string;
  readOnly?: boolean;
}

export function ClienteDocumentosSection({ clienteId, readOnly = false }: Props) {
  const { documentos, isLoading, invalidate } = useClienteDocumentos(clienteId);
  const [uploading, setUploading] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > MAX_FILE_SIZE) {
      toast.error("Arquivo excede o limite de 11 MB.");
      e.target.value = "";
      return;
    }

    setUploading(true);
    try {
      const arquivo_base64 = await new Promise<string>((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => resolve((reader.result as string).split(",")[1]);
        reader.onerror = () => reject(new Error("Erro ao ler arquivo"));
        reader.readAsDataURL(file);
      });

      const { data: r2Data, error: r2Error } = await supabase.functions.invoke("r2-upload", {
        body: { arquivo_base64, nome_arquivo: file.name, mime_type: file.type, pasta: "clientes" },
      });

      if (r2Error) throw new Error(r2Error.message || "Erro no upload");
      if (!r2Data?.sucesso) throw new Error(r2Data?.erro || "Erro no upload R2");

      const { error } = await (supabase as any).from("cliente_documentos").insert({
        cliente_id: clienteId,
        nome: file.name,
        url: r2Data.url,
      });

      if (error) throw error;
      toast.success("Documento adicionado!");
      invalidate();
    } catch (err: any) {
      toast.error("Erro ao enviar documento: " + (err?.message || ""));
    } finally {
      setUploading(false);
      if (fileRef.current) fileRef.current.value = "";
    }
  };

  const handleDelete = async (id: string) => {
    const { error } = await (supabase as any).from("cliente_documentos").delete().eq("id", id);
    if (error) {
      toast.error("Erro ao excluir documento.");
    } else {
      toast.success("Documento excluído.");
      invalidate();
    }
  };

  const handleDownload = async (url: string, nome: string) => {
    try {
      const isR2 = url.includes(".r2.dev/") || url.includes("r2.cloudflarestorage.com");
      if (isR2) {
        const key = new URL(url).pathname.replace(/^\//, "");
        const { data, error } = await supabase.functions.invoke("r2-download", {
          body: { key, filename: nome },
        });
        if (error) throw error;
        const blob = data instanceof Blob ? data : new Blob([data]);
        const blobUrl = URL.createObjectURL(blob);
        const link = document.createElement("a");
        link.href = blobUrl;
        link.download = nome;
        link.click();
        URL.revokeObjectURL(blobUrl);
      } else {
        window.open(url, "_blank");
      }
    } catch {
      window.open(url, "_blank");
    }
  };

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <p className="text-sm font-semibold text-foreground flex items-center gap-1.5">
          <FileText className="h-4 w-4" /> Documentos
        </p>
        {!readOnly && (
          <Button
            variant="outline"
            size="sm"
            className="text-xs gap-1"
            disabled={uploading}
            onClick={() => fileRef.current?.click()}
          >
            {uploading ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Plus className="h-3.5 w-3.5" />}
            {uploading ? "Enviando..." : "Adicionar Documento"}
          </Button>
        )}
        <input type="file" ref={fileRef} className="hidden" onChange={handleUpload} />
      </div>

      {isLoading ? (
        <div className="flex justify-center py-4">
          <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
        </div>
      ) : documentos.length === 0 ? (
        <p className="text-xs text-muted-foreground text-center py-2">Nenhum documento cadastrado.</p>
      ) : (
        <div className="space-y-1.5">
          {documentos.map((doc) => (
            <div key={doc.id} className="flex items-center justify-between bg-muted/40 rounded-md px-3 py-2 text-sm">
              <button
                type="button"
                onClick={() => handleDownload(doc.url, doc.nome)}
                className="flex items-center gap-2 text-primary hover:underline cursor-pointer bg-transparent border-none p-0 text-left"
              >
                <Download className="h-3.5 w-3.5 flex-shrink-0" />
                <span className="truncate max-w-[300px]">{doc.nome}</span>
              </button>
              <div className="flex items-center gap-2">
                <span className="text-[10px] text-muted-foreground">
                  {new Date(doc.criado_em).toLocaleDateString("pt-BR")}
                </span>
                {!readOnly && (
                  <button
                    type="button"
                    onClick={() => handleDelete(doc.id)}
                    className="text-destructive hover:text-destructive/80 transition-colors"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
