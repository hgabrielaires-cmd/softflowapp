import { useEffect, useRef, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";

// ─── Sound ──────────────────────────────────────────────────────────────────

function tocarBip() {
  try {
    const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
    if (!AudioCtx) return;
    const ctx = new AudioCtx();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.type = "sine";
    osc.frequency.setValueAtTime(880, ctx.currentTime);
    osc.frequency.setValueAtTime(660, ctx.currentTime + 0.1);
    gain.gain.setValueAtTime(0.3, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.4);
    osc.start(ctx.currentTime);
    osc.stop(ctx.currentTime + 0.4);
  } catch {
    // silently fail
  }
}

// ─── Preferences ─────────────────────────────────────────────────────────────

function getPref(userId: string, key: string, fallback = true): boolean {
  try {
    const v = localStorage.getItem(`chat_notif_${key}_${userId}`);
    return v === null ? fallback : v === "true";
  } catch {
    return fallback;
  }
}

export function setPref(userId: string, key: string, value: boolean) {
  try {
    localStorage.setItem(`chat_notif_${key}_${userId}`, String(value));
  } catch {
    // ignore
  }
}

// ─── Title Blink ─────────────────────────────────────────────────────────────

const ORIGINAL_TITLE = "Softflow";
let blinkInterval: ReturnType<typeof setInterval> | null = null;

function startTitleBlink() {
  if (blinkInterval) return;
  let alt = false;
  blinkInterval = setInterval(() => {
    document.title = alt ? "💬 Nova mensagem — Softflow" : ORIGINAL_TITLE;
    alt = !alt;
  }, 1000);
}

function stopTitleBlink() {
  if (blinkInterval) {
    clearInterval(blinkInterval);
    blinkInterval = null;
  }
  document.title = ORIGINAL_TITLE;
}

// ─── Browser Notification ────────────────────────────────────────────────────

function showBrowserNotification(
  nomeCliente: string,
  preview: string,
  conversaId: string,
) {
  if (typeof Notification === "undefined" || Notification.permission !== "granted") return;
  const notif = new Notification("💬 Softflow Chat", {
    body: `${nomeCliente}: ${preview}`,
    icon: "/favicon.ico",
    tag: `chat-${conversaId}`,
  });
  notif.onclick = () => {
    window.focus();
    notif.close();
  };
}

// ─── Hook ────────────────────────────────────────────────────────────────────

interface UseNotificacaoChatOpts {
  userId: string | undefined;
  conversaAbertaId: string | null;
}

export function useNotificacaoChat({ userId, conversaAbertaId }: UseNotificacaoChatOpts) {
  const conversaAbertaRef = useRef(conversaAbertaId);
  conversaAbertaRef.current = conversaAbertaId;

  // Request permission on mount
  useEffect(() => {
    if (typeof Notification !== "undefined" && Notification.permission === "default") {
      Notification.requestPermission();
    }
  }, []);

  // Stop blink on focus
  useEffect(() => {
    const handler = () => stopTitleBlink();
    window.addEventListener("focus", handler);
    return () => window.removeEventListener("focus", handler);
  }, []);

  // Realtime listener for new messages
  useEffect(() => {
    if (!userId) return;

    const channel = supabase
      .channel("chat-notif-mensagens")
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "chat_mensagens" },
        async (payload) => {
          const msg = payload.new as any;
          if (!msg) return;

          // Only notify for client messages
          if (msg.remetente !== "cliente") return;

          // Skip if user is viewing this conversation and tab is focused
          if (msg.conversa_id === conversaAbertaRef.current && document.hasFocus()) return;

          // Fetch conversation status and owner
          const { data: conv } = await supabase
            .from("chat_conversas")
            .select("status, atendente_id, nome_cliente")
            .eq("id", msg.conversa_id)
            .maybeSingle();
          if (!conv) return;

          const status = conv.status;

          // Never notify for triagem (bot) or encerrado
          if (status === "bot" || status === "encerrado") return;

          // Determine if sound should play
          const ehMinhaConversa = conv.atendente_id === userId;
          let deveTocarSom = false;

          if (status === "aguardando") {
            // Fila: notify everyone
            deveTocarSom = true;
          } else if (status === "em_atendimento" && ehMinhaConversa) {
            // Only the assigned agent hears it
            deveTocarSom = true;
          }
          // Other cases (em_atendimento of another agent, fora_horario): no sound

          // Sound
          if (deveTocarSom && getPref(userId, "som")) tocarBip();

          // Title blink (only if sound-eligible)
          if (deveTocarSom && !document.hasFocus()) startTitleBlink();

          // Browser notification
          if (deveTocarSom && getPref(userId, "browser")) {
            const nome = (conv as any)?.nome_cliente || "Cliente";
            const preview = (msg.conteudo || "📎 Mídia").substring(0, 60);
            showBrowserNotification(nome, preview, msg.conversa_id);
          }
        },
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [userId]);

  // Realtime for new conversations entering queue
  useEffect(() => {
    if (!userId) return;

    const channel = supabase
      .channel("chat-notif-fila")
      .on(
        "postgres_changes",
        { event: "UPDATE", schema: "public", table: "chat_conversas", filter: "status=eq.aguardando" },
        () => {
          if (getPref(userId, "som")) tocarBip();
          if (!document.hasFocus()) startTitleBlink();
        },
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [userId]);

  // Stop blink when user opens a conversation
  useEffect(() => {
    if (conversaAbertaId && document.hasFocus()) {
      stopTitleBlink();
    }
  }, [conversaAbertaId]);

  return { tocarBip };
}

// ─── Badge counter hook ──────────────────────────────────────────────────────

export function useChatBadgeCount(userId: string | undefined) {
  const countRef = useRef(0);
  const callbacksRef = useRef<Set<() => void>>(new Set());

  const subscribe = useCallback((cb: () => void) => {
    callbacksRef.current.add(cb);
    return () => { callbacksRef.current.delete(cb); };
  }, []);

  useEffect(() => {
    if (!userId) return;

    async function fetchCount() {
      const { count: filaCount } = await supabase
        .from("chat_conversas")
        .select("id", { count: "exact", head: true })
        .in("status", ["bot", "aguardando"]);

      const { count: meusCount } = await supabase
        .from("chat_mensagens")
        .select("id", { count: "exact", head: true })
        .eq("lida", false)
        .eq("remetente", "cliente");

      countRef.current = (filaCount || 0) + (meusCount || 0);
      callbacksRef.current.forEach((cb) => cb());
    }

    fetchCount();

    const channel = supabase
      .channel("chat-badge-count")
      .on("postgres_changes", { event: "*", schema: "public", table: "chat_conversas" }, fetchCount)
      .on("postgres_changes", { event: "*", schema: "public", table: "chat_mensagens" }, fetchCount)
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [userId]);

  return { getCount: () => countRef.current, subscribe };
}
