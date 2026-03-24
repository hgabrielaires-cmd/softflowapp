import { useState, useRef, useEffect, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import {
  Send, Paperclip, Lock, Mic, X, Image, Video, FileText,
  ChevronDown, Square,
} from "lucide-react";
import { cn } from "@/lib/utils";
import {
  DropdownMenu, DropdownMenuTrigger, DropdownMenuContent, DropdownMenuItem,
} from "@/components/ui/dropdown-menu";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

const MAX_FILE_SIZE = 20 * 1024 * 1024; // 20MB

interface Props {
  onSend: (texto: string, tipo?: string) => void;
  onSendMedia: (file: File, caption: string) => void;
  modoNota: boolean;
  setModoNota: (v: boolean) => void;
  userId: string | null;
  userName: string;
  conversaId: string;
  protocolo: string | null;
  nomeCliente: string | null;
}

export default function ChatInputArea({
  onSend, onSendMedia, modoNota, setModoNota,
  userId, userName, conversaId, protocolo, nomeCliente,
}: Props) {
  const [texto, setTexto] = useState("");

  // Audio recording
  const [gravando, setGravando] = useState(false);
  const [tempoGravacao, setTempoGravacao] = useState(0);
  const [audioBlob, setAudioBlob] = useState<Blob | null>(null);
  const [audioUrl, setAudioUrl] = useState<string | null>(null);
  const mediaRecorder = useRef<MediaRecorder | null>(null);
  const chunks = useRef<Blob[]>([]);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // Mentions
  const [showMentions, setShowMentions] = useState(false);
  const [mentionSearch, setMentionSearch] = useState("");
  const [mentionIndex, setMentionIndex] = useState(0);
  const [atendentes, setAtendentes] = useState<{ user_id: string; full_name: string }[]>([]);
  const mentionStartRef = useRef<number | null>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // File inputs
  const imageInputRef = useRef<HTMLInputElement>(null);
  const videoInputRef = useRef<HTMLInputElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Load atendentes for mentions
  useEffect(() => {
    supabase.from("profiles").select("user_id, full_name").eq("ativo" as any, true)
      .then(({ data }: any) => { if (data) setAtendentes(data); });
  }, []);

  // Timer for recording
  useEffect(() => {
    if (gravando) {
      setTempoGravacao(0);
      timerRef.current = setInterval(() => setTempoGravacao((t) => t + 1), 1000);
    } else {
      if (timerRef.current) clearInterval(timerRef.current);
    }
    return () => { if (timerRef.current) clearInterval(timerRef.current); };
  }, [gravando]);

  // Cleanup audio URL
  useEffect(() => {
    return () => { if (audioUrl) URL.revokeObjectURL(audioUrl); };
  }, [audioUrl]);

  const filteredAtendentes = atendentes.filter((a) =>
    a.full_name?.toLowerCase().includes(mentionSearch.toLowerCase())
  ).slice(0, 6);

  // ── File handling ──
  function handleFileSelect(e: React.ChangeEvent<HTMLInputElement>) {
    const f = e.target.files?.[0];
    if (!f) return;
    if (f.size > MAX_FILE_SIZE) {
      toast.error("Arquivo muito grande. Máximo permitido: 20MB");
      e.target.value = "";
      return;
    }
    onSendMedia(f, "");
    e.target.value = "";
  }

  // ── Audio recording ──
  async function iniciarGravacao() {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const recorder = new MediaRecorder(stream);
      chunks.current = [];

      recorder.ondataavailable = (e) => { chunks.current.push(e.data); };
      recorder.onstop = () => {
        const blob = new Blob(chunks.current, { type: "audio/webm" });
        setAudioBlob(blob);
        setAudioUrl(URL.createObjectURL(blob));
        stream.getTracks().forEach((t) => t.stop());
      };

      recorder.start();
      mediaRecorder.current = recorder;
      setGravando(true);
    } catch {
      toast.error("Não foi possível acessar o microfone");
    }
  }

  function pararGravacao() {
    mediaRecorder.current?.stop();
    setGravando(false);
  }

  function cancelarAudio() {
    setAudioBlob(null);
    if (audioUrl) URL.revokeObjectURL(audioUrl);
    setAudioUrl(null);
  }

  function enviarAudio() {
    if (!audioBlob) return;
    const file = new File([audioBlob], "audio.webm", { type: "audio/webm" });
    onSendMedia(file, "");
    cancelarAudio();
  }

  // ── Mention handling ──
  const handleTextChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const newValue = e.target.value;
    const cursorPos = e.target.selectionStart || 0;
    setTexto(newValue);

    if (!modoNota) {
      setShowMentions(false);
      return;
    }

    const textBefore = newValue.slice(0, cursorPos);
    const atIndex = textBefore.lastIndexOf("@");
    if (atIndex !== -1) {
      const charBefore = atIndex > 0 ? newValue[atIndex - 1] : " ";
      const textAfterAt = textBefore.slice(atIndex + 1);
      if ((charBefore === " " || charBefore === "\n" || atIndex === 0) && !textAfterAt.includes("\n")) {
        setMentionSearch(textAfterAt);
        mentionStartRef.current = atIndex;
        setShowMentions(true);
        setMentionIndex(0);
        return;
      }
    }
    setShowMentions(false);
    mentionStartRef.current = null;
  };

  function insertMention(user: { user_id: string; full_name: string }) {
    if (mentionStartRef.current === null) return;
    const before = texto.slice(0, mentionStartRef.current);
    const cursorPos = textareaRef.current?.selectionStart || texto.length;
    const after = texto.slice(cursorPos);
    const name = user.full_name;
    const newValue = `${before}@${name} ${after}`;
    setTexto(newValue);
    setShowMentions(false);
    mentionStartRef.current = null;
    setTimeout(() => {
      if (textareaRef.current) {
        const pos = before.length + name.length + 2;
        textareaRef.current.focus();
        textareaRef.current.setSelectionRange(pos, pos);
      }
    }, 0);
  }

  function handleKeyDown(e: React.KeyboardEvent) {
    if (showMentions && filteredAtendentes.length > 0) {
      if (e.key === "ArrowDown") { e.preventDefault(); setMentionIndex((i) => Math.min(i + 1, filteredAtendentes.length - 1)); return; }
      if (e.key === "ArrowUp") { e.preventDefault(); setMentionIndex((i) => Math.max(i - 1, 0)); return; }
      if (e.key === "Enter" || e.key === "Tab") { e.preventDefault(); insertMention(filteredAtendentes[mentionIndex]); return; }
      if (e.key === "Escape") { setShowMentions(false); return; }
    }
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSubmit();
    }
  }

  // ── Submit ──
  async function handleSubmit() {
    if (!texto.trim()) return;
    const finalTexto = texto.trim();
    const tipo = modoNota ? "nota_interna" : "texto";
    onSend(finalTexto, tipo);

    // Process mentions for notifications
    if (modoNota && userId) {
      const mentionRegex = /@([^\s@]+(?:\s[^\s@]+)*?)(?=\s@|\s*$)/g;
      let match;
      const mentionedIds: string[] = [];
      while ((match = mentionRegex.exec(finalTexto)) !== null) {
        const name = match[1].trim();
        const user = atendentes.find(
          (a) => a.full_name?.toLowerCase() === name.toLowerCase()
        );
        if (user && user.user_id !== userId && !mentionedIds.includes(user.user_id)) {
          mentionedIds.push(user.user_id);
        }
      }

      if (mentionedIds.length > 0) {
        const notifs = mentionedIds.map((uid) => ({
          destinatario_user_id: uid,
          titulo: "💬 Menção no chat",
          mensagem: `${userName} mencionou você na conversa ${protocolo || ""} de ${nomeCliente || "cliente"}`,
          tipo: "chat",
          criado_por: userId,
          metadata: { link: "/chat", conversa_id: conversaId },
        }));
        await supabase.from("notificacoes").insert(notifs as any);
      }
    }

    setTexto("");
    setModoNota(false);
  }

  const formatTime = (s: number) => `${Math.floor(s / 60)}:${String(s % 60).padStart(2, "0")}`;

  // ── Recording state ──
  if (gravando) {
    return (
      <div className="border-t border-border p-3 bg-card">
        <div className="flex items-center gap-3">
          <span className="w-3 h-3 rounded-full bg-destructive animate-pulse" />
          <span className="text-sm font-medium text-foreground">Gravando... {formatTime(tempoGravacao)}</span>
          <div className="flex-1" />
          <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => { pararGravacao(); cancelarAudio(); setGravando(false); }}>
            <X className="h-4 w-4" />
          </Button>
          <Button size="icon" className="h-8 w-8" onClick={pararGravacao}>
            <Square className="h-4 w-4" />
          </Button>
        </div>
      </div>
    );
  }

  // ── Audio preview state ──
  if (audioBlob && audioUrl) {
    return (
      <div className="border-t border-border p-3 bg-card">
        <div className="flex items-center gap-3">
          <audio controls src={audioUrl} className="flex-1 h-8" />
          <Button variant="ghost" size="icon" className="h-8 w-8" onClick={cancelarAudio}>
            <X className="h-4 w-4" />
          </Button>
          <Button size="sm" className="gap-1" onClick={enviarAudio}>
            <Mic className="h-3 w-3" /> Enviar
          </Button>
        </div>
      </div>
    );
  }

  // ── Normal input state ──
  return (
    <div className="border-t border-border p-3 bg-card">
      {/* Hidden file inputs */}
      <input ref={imageInputRef} type="file" className="hidden" accept="image/*" onChange={handleFileSelect} />
      <input ref={videoInputRef} type="file" className="hidden" accept="video/*" onChange={handleFileSelect} />
      <input ref={fileInputRef} type="file" className="hidden" accept=".pdf,.doc,.docx,.xls,.xlsx,.txt,.zip" onChange={handleFileSelect} />

      {/* Toolbar */}
      <div className="flex items-center gap-2 mb-2">
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="sm" className="h-7 text-xs gap-1">
              <Paperclip className="h-3 w-3" />
              Mídia
              <ChevronDown className="h-3 w-3" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="start" className="w-48">
            <DropdownMenuItem onClick={() => imageInputRef.current?.click()} className="gap-2 text-xs">
              <Image className="h-4 w-4" /> Foto / Imagem
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => videoInputRef.current?.click()} className="gap-2 text-xs">
              <Video className="h-4 w-4" /> Vídeo
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => fileInputRef.current?.click()} className="gap-2 text-xs">
              <FileText className="h-4 w-4" /> Arquivo
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>

        <Button
          variant={modoNota ? "secondary" : "ghost"}
          size="sm"
          className="h-7 text-xs gap-1"
          onClick={() => setModoNota(!modoNota)}
        >
          <Lock className="h-3 w-3" /> Nota interna
        </Button>

        <div className="flex-1" />

        <Button
          variant="ghost"
          size="icon"
          className="h-7 w-7"
          onClick={iniciarGravacao}
          title="Gravar áudio"
        >
          <Mic className="h-4 w-4" />
        </Button>
      </div>

      {/* Text input with mentions */}
      <div className="relative">
        {showMentions && filteredAtendentes.length > 0 && (
          <div className="absolute bottom-full mb-1 left-0 z-50 bg-popover border border-border rounded-md shadow-lg max-h-48 overflow-y-auto w-56">
            {filteredAtendentes.map((user, idx) => (
              <button
                key={user.user_id}
                type="button"
                className={cn(
                  "w-full text-left px-3 py-2 text-xs hover:bg-accent transition-colors flex items-center gap-2",
                  idx === mentionIndex && "bg-accent"
                )}
                onMouseDown={(e) => { e.preventDefault(); insertMention(user); }}
                onMouseEnter={() => setMentionIndex(idx)}
              >
                <div className="w-6 h-6 rounded-full bg-primary/10 flex items-center justify-center text-[10px] font-semibold text-primary">
                  {(user.full_name || "?")[0].toUpperCase()}
                </div>
                <span className="font-medium">{user.full_name}</span>
              </button>
            ))}
          </div>
        )}

        <div className="flex items-end gap-2">
          <Textarea
            ref={textareaRef}
            placeholder={modoNota ? "Nota interna (não enviada ao cliente)... Use @ para mencionar" : "Digite sua mensagem..."}
            value={texto}
            onChange={handleTextChange}
            onKeyDown={handleKeyDown}
            className={cn(
              "flex-1 min-h-[40px] max-h-[120px] resize-none text-sm",
              modoNota && "border-yellow-400 bg-yellow-50"
            )}
            rows={1}
          />
          <Button
            size="icon"
            className="h-9 w-9 flex-shrink-0"
            disabled={!texto.trim()}
            onClick={handleSubmit}
          >
            <Send className="h-4 w-4" />
          </Button>
        </div>
      </div>
    </div>
  );
}
