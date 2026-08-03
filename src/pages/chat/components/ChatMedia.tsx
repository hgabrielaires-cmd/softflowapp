import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";

const BUCKET = "chat-midias";

/** Extrai o caminho do objeto dentro do bucket a partir de uma URL armazenada. */
export function extractChatMediaPath(url: string): string | null {
  const match = url.match(/\/storage\/v1\/object\/(?:public|sign)\/chat-midias\/([^?]+)/);
  return match ? decodeURIComponent(match[1]) : null;
}

/** Gera uma URL assinada (temporária) para mídias do chat (bucket privado). */
export function useSignedChatMedia(url?: string | null) {
  const [signed, setSigned] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    if (!url) {
      setSigned(null);
      return;
    }
    const path = extractChatMediaPath(url);
    if (!path) {
      setSigned(url);
      return;
    }
    supabase.storage
      .from(BUCKET)
      .createSignedUrl(path, 3600)
      .then(({ data }) => {
        if (active) setSigned(data?.signedUrl ?? null);
      });
    return () => {
      active = false;
    };
  }, [url]);

  return signed;
}

interface ChatMediaProps {
  tipo: string;
  url: string;
  mediaTipo?: string | null;
  nome?: string | null;
  compact?: boolean;
  onImageClick?: (url: string) => void;
  docContent?: React.ReactNode;
}

export function ChatMedia({ tipo, url, mediaTipo, nome, compact, onImageClick, docContent }: ChatMediaProps) {
  const src = useSignedChatMedia(url);

  if (!src) {
    return <div className="h-10 w-full animate-pulse rounded bg-muted-foreground/10 mb-1" />;
  }

  if (tipo === "imagem") {
    return (
      <img
        src={src}
        alt={nome || ""}
        loading="lazy"
        className={
          compact
            ? "rounded-lg max-w-full max-h-40 mb-1"
            : "rounded-lg max-w-full max-h-60 mb-1 cursor-pointer hover:opacity-90 transition-opacity"
        }
        onClick={() => onImageClick?.(src)}
      />
    );
  }

  if (tipo === "audio") {
    return <audio controls src={src} className="max-w-full mb-1" />;
  }

  if (tipo === "video") {
    return (
      <video controls className="rounded-lg max-w-full mb-1" style={{ maxHeight: compact ? "200px" : "300px" }}>
        <source src={src} type={mediaTipo || "video/mp4"} />
        Seu navegador não suporta vídeo.
      </video>
    );
  }

  if (tipo === "documento") {
    if (docContent) {
      return (
        <a
          href={src}
          target="_blank"
          rel="noreferrer"
          className="flex items-center gap-2 text-xs mb-1 p-2 rounded bg-background/10 hover:bg-background/20 transition-colors"
        >
          {docContent}
        </a>
      );
    }
    return (
      <a href={src} target="_blank" rel="noreferrer" className="text-xs underline mb-1 block">
        📄 {nome || "Documento"}
      </a>
    );
  }

  return null;
}
