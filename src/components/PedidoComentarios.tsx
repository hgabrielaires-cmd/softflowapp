import { useState, useEffect, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/context/AuthContext";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Loader2, Paperclip, Download, Trash2, MessageSquare } from "lucide-react";
import { toast } from "sonner";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";

const PRIORIDADES = [
  { value: "normal", label: "Normal", emoji: "🟢" },
  { value: "medio", label: "Médio", emoji: "🟡" },
  { value: "urgente", label: "Urgente", emoji: "🔴" },
  { value: "prioridade", label: "Alta Prioridade", emoji: "⚡" },
] as const;

const PRIORIDADE_MAP: Record<string, { label: string; emoji: string }> = {
  normal: { label: "Normal", emoji: "🟢" },
  medio: { label: "Médio", emoji: "🟡" },
  urgente: { label: "Urgente", emoji: "🔴" },
  prioridade: { label: "Alta Prioridade", emoji: "⚡" },
};

const MAX_FILE_SIZE = 11 * 1024 * 1024; // 11MB

interface Comentario {
  id: string;
  pedido_id: string;
  user_id: string;
  texto: string;
  prioridade: string;
  anexo_url: string | null;
  anexo_nome: string | null;
  created_at: string;
}

interface Props {
  pedidoId: string;
}

export function PedidoComentarios({ pedidoId }: Props) {
  const { user } = useAuth();
  const [comentarios, setComentarios] = useState<Comentario[]>([]);
  const [profiles, setProfiles] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [texto, setTexto] = useState("");
  const [prioridade, setPrioridade] = useState("normal");
  const [arquivo, setArquivo] = useState<File | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  const fetchComentarios = async () => {
    const { data } = await supabase
      .from("pedido_comentarios")
      .select("*")
      .eq("pedido_id", pedidoId)
      .order("created_at", { ascending: false });

    if (data) {
      setComentarios(data as Comentario[]);
      // fetch profile names
      const userIds = [...new Set(data.map((c: any) => c.user_id))];
      if (userIds.length > 0) {
        const { data: profs } = await supabase
          .from("profiles")
          .select("user_id, full_name")
          .in("user_id", userIds);
        if (profs) {
          const map: Record<string, string> = {};
          profs.forEach((p: any) => { map[p.user_id] = p.full_name; });
          setProfiles(map);
        }
      }
    }
    setLoading(false);
  };

  useEffect(() => {
    fetchComentarios();
  }, [pedidoId]);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > MAX_FILE_SIZE) {
      toast.error("Arquivo excede o limite de 11 MB.");
      e.target.value = "";
      return;
    }
    setArquivo(file);
  };

  const handleEnviar = async () => {
    if (!texto.trim()) {
      toast.error("Digite um comentário.");
      return;
    }
    if (!user) return;
    setSending(true);

    let anexo_url: string | null = null;
    let anexo_nome: string | null = null;

    try {
      if (arquivo) {
        const ext = arquivo.name.split(".").pop();
        const path = `${pedidoId}/${crypto.randomUUID()}.${ext}`;
        const { error: uploadErr } = await supabase.storage
          .from("pedido-anexos")
          .upload(path, arquivo);
        if (uploadErr) throw uploadErr;
        
        const { data: urlData } = supabase.storage
          .from("pedido-anexos")
          .getPublicUrl(path);
        // bucket is private, use signed URL
        const { data: signedData } = await supabase.storage
          .from("pedido-anexos")
          .createSignedUrl(path, 60 * 60 * 24 * 365); // 1 year
        anexo_url = signedData?.signedUrl || urlData.publicUrl;
        anexo_nome = arquivo.name;
      }

      const { error } = await supabase.from("pedido_comentarios").insert({
        pedido_id: pedidoId,
        user_id: user.id,
        texto: texto.trim(),
        prioridade,
        anexo_url,
        anexo_nome,
      });

      if (error) throw error;

      setTexto("");
      setPrioridade("normal");
      setArquivo(null);
      if (fileRef.current) fileRef.current.value = "";
      toast.success("Comentário adicionado!");
      fetchComentarios();
    } catch (err: any) {
      toast.error("Erro ao enviar comentário: " + err.message);
    } finally {
      setSending(false);
    }
  };

  return (
    <div className="border-t border-border pt-3 space-y-3">
      <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide flex items-center gap-1.5">
        <MessageSquare className="h-3.5 w-3.5" /> Comentários Internos
      </p>

      {/* Form */}
      <div className="space-y-2 bg-muted/30 rounded-md p-3">
        <Textarea
          placeholder="Escreva um comentário..."
          value={texto}
          onChange={(e) => setTexto(e.target.value)}
          className="min-h-[60px] text-sm"
        />
        <div className="flex flex-wrap items-center gap-2">
          <Label className="text-xs text-muted-foreground">Prioridade:</Label>
          {PRIORIDADES.map((p) => (
            <button
              key={p.value}
              type="button"
              onClick={() => setPrioridade(p.value)}
              className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs border transition-colors ${
                prioridade === p.value
                  ? "border-primary bg-primary/10 font-semibold"
                  : "border-border hover:border-primary/50"
              }`}
            >
              {p.emoji} {p.label}
            </button>
          ))}
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
            onChange={handleFileChange}
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
          <Button
            size="sm"
            className="ml-auto text-xs"
            onClick={handleEnviar}
            disabled={sending || !texto.trim()}
          >
            {sending ? <Loader2 className="h-3.5 w-3.5 animate-spin mr-1" /> : null}
            Enviar
          </Button>
        </div>
      </div>

      {/* Lista */}
      {loading ? (
        <div className="flex justify-center py-4">
          <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
        </div>
      ) : comentarios.length === 0 ? (
        <p className="text-xs text-muted-foreground text-center py-2">Nenhum comentário ainda.</p>
      ) : (
        <div className="space-y-2 max-h-[250px] overflow-y-auto">
          {comentarios.map((c) => {
            const pri = PRIORIDADE_MAP[c.prioridade] || PRIORIDADE_MAP.normal;
            return (
              <div key={c.id} className="bg-background border border-border rounded-md p-2.5 space-y-1">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-medium">{profiles[c.user_id] || "Usuário"}</span>
                  <div className="flex items-center gap-2">
                    <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-muted">{pri.emoji} {pri.label}</span>
                    <span className="text-[10px] text-muted-foreground">
                      {format(new Date(c.created_at), "dd/MM/yy HH:mm", { locale: ptBR })}
                    </span>
                  </div>
                </div>
                <p className="text-xs whitespace-pre-wrap">{c.texto}</p>
                {c.anexo_url && c.anexo_nome && (
                  <a
                    href={c.anexo_url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1 text-[10px] text-primary hover:underline"
                  >
                    <Download className="h-3 w-3" /> {c.anexo_nome}
                  </a>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
