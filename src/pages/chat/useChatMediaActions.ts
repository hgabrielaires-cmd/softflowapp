import { useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

function getMediaType(file: File): "imagem" | "audio" | "documento" {
  if (file.type.startsWith("image/")) return "imagem";
  if (file.type.startsWith("audio/")) return "audio";
  return "documento";
}

function getEvolutionMediaType(file: File): "image" | "audio" | "document" {
  if (file.type.startsWith("image/")) return "image";
  if (file.type.startsWith("audio/")) return "audio";
  return "document";
}

export function useChatMediaActions() {
  const qc = useQueryClient();

  const enviarMidia = useMutation({
    mutationFn: async ({
      conversaId,
      file,
      caption,
      atendenteId,
      numero,
      instanceName,
    }: {
      conversaId: string;
      file: File;
      caption: string;
      atendenteId: string;
      numero: string;
      instanceName?: string;
    }) => {
      // 1. Upload to storage
      const timestamp = Date.now();
      const path = `${conversaId}/${timestamp}_${file.name}`;
      const { error: uploadError } = await supabase.storage
        .from("chat-midias")
        .upload(path, file, { contentType: file.type });
      if (uploadError) throw new Error("Erro no upload: " + uploadError.message);

      // 2. Get public URL
      const { data: urlData } = supabase.storage.from("chat-midias").getPublicUrl(path);
      const publicUrl = urlData.publicUrl;

      // 3. Send via Evolution API
      const mediatype = getEvolutionMediaType(file);
      const { error: sendError } = await supabase.functions.invoke("evolution-api", {
        body: {
          action: "send_media",
          instance_name: instanceName,
          number: numero,
          mediatype,
          media: publicUrl,
          fileName: file.name,
          caption: caption || undefined,
        },
      });
      if (sendError) console.error("Erro ao enviar mídia WhatsApp:", sendError);

      // 4. Save message in DB
      const tipo = getMediaType(file);
      const { error: dbError } = await supabase.from("chat_mensagens").insert({
        conversa_id: conversaId,
        tipo,
        conteudo: caption || null,
        media_url: publicUrl,
        media_tipo: file.type,
        media_nome: file.name,
        remetente: "atendente",
        atendente_id: atendenteId,
      });
      if (dbError) throw dbError;

      // 5. Update conversation timestamp
      await supabase
        .from("chat_conversas")
        .update({ updated_at: new Date().toISOString() })
        .eq("id", conversaId);
    },
    onSuccess: () => {
      toast.success("Mídia enviada!");
      qc.invalidateQueries({ queryKey: ["chat-mensagens"] });
      qc.invalidateQueries({ queryKey: ["chat-conversas"] });
    },
    onError: (e) => toast.error("Erro ao enviar mídia: " + e.message),
  });

  return { enviarMidia };
}
