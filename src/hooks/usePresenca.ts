import { useEffect, useRef, useState, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/context/AuthContext";
import {
  HEARTBEAT_INTERVAL_MS,
  HEARTBEAT_TIMEOUT_MS,
  type PresencaStatus,
} from "@/lib/presenca";

export function usePresenca() {
  const { user, profile, session } = useAuth();
  const [status, setStatusState] = useState<PresencaStatus>("offline");
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const isAtendente = !!(profile as any)?.is_atendente_chat;

  const upsertPresenca = useCallback(
    async (newStatus: PresencaStatus) => {
      if (!user) return;
      await supabase.from("atendente_presenca").upsert(
        {
          user_id: user.id,
          status: newStatus,
          last_heartbeat: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        },
        { onConflict: "user_id" }
      );
    },
    [user]
  );

  const setStatus = useCallback(
    async (newStatus: PresencaStatus) => {
      setStatusState(newStatus);
      if (newStatus === "offline") {
        try {
          sessionStorage.removeItem("softflow_presenca_restore");
        } catch {
          // ignore sessionStorage errors
        }
      }
      await upsertPresenca(newStatus);
      // Broadcast para atualizar outros clientes instantaneamente
      await supabase.channel('presenca-broadcast').send({
        type: 'broadcast',
        event: 'status_changed',
        payload: { user_id: user?.id, status: newStatus },
      });
    },
    [upsertPresenca, user]
  );

  const persistOfflineOnExit = useCallback(() => {
    if (!user || !session?.access_token || !isAtendente || status === "offline") return;

    const nowIso = new Date().toISOString();

    try {
      sessionStorage.setItem("softflow_presenca_restore", status);
    } catch {
      // ignore sessionStorage errors
    }

    void fetch(
      `${import.meta.env.VITE_SUPABASE_URL}/rest/v1/atendente_presenca?user_id=eq.${encodeURIComponent(user.id)}`,
      {
        method: "PATCH",
        keepalive: true,
        headers: {
          apikey: import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY,
          Authorization: `Bearer ${session.access_token}`,
          "Content-Type": "application/json",
          Prefer: "return=minimal",
        },
        body: JSON.stringify({
          status: "offline",
          last_heartbeat: nowIso,
          updated_at: nowIso,
        }),
      }
    ).catch(() => undefined);
  }, [isAtendente, session?.access_token, status, user]);

  // Heartbeat: update last_heartbeat when online
  useEffect(() => {
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }

    if (status === "online" && user) {
      intervalRef.current = setInterval(async () => {
        await supabase
          .from("atendente_presenca")
          .update({
            last_heartbeat: new Date().toISOString(),
            updated_at: new Date().toISOString(),
          })
          .eq("user_id", user.id);
      }, HEARTBEAT_INTERVAL_MS);
    }

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
    };
  }, [status, user]);

  useEffect(() => {
    if (!user || !isAtendente) return;

    const handlePageExit = () => {
      persistOfflineOnExit();
    };

    window.addEventListener("pagehide", handlePageExit);
    window.addEventListener("beforeunload", handlePageExit);

    return () => {
      window.removeEventListener("pagehide", handlePageExit);
      window.removeEventListener("beforeunload", handlePageExit);
    };
  }, [isAtendente, persistOfflineOnExit, user]);

  // On mount: restore or correct status
  useEffect(() => {
    if (!user) return;

    (async () => {
      try {
        const restoreStatus = sessionStorage.getItem("softflow_presenca_restore");
        sessionStorage.removeItem("softflow_presenca_restore");

        if (restoreStatus === "online" || restoreStatus === "pausa") {
          setStatusState(restoreStatus);
          await upsertPresenca(restoreStatus);
          return;
        }
      } catch {
        // ignore sessionStorage errors
      }

      const { data } = await supabase
        .from("atendente_presenca")
        .select("status, last_heartbeat")
        .eq("user_id", user.id)
        .maybeSingle();

      if (!data) {
        // No record yet — start offline
        setStatusState("offline");
        return;
      }

      const savedStatus = data.status as PresencaStatus;
      const lastHb = data.last_heartbeat ? new Date(data.last_heartbeat).getTime() : 0;
      const now = Date.now();

      if (savedStatus === "online") {
        if (now - lastHb > HEARTBEAT_TIMEOUT_MS) {
          // Stale online (janela estava fechada) → marcar offline
          setStatusState("offline");
          await upsertPresenca("offline");
        } else {
          // Heartbeat recente → restaurar online
          setStatusState("online");
        }
      } else if (savedStatus === "pausa") {
        // Pausa é intencional → restaurar sempre
        setStatusState("pausa");
      } else {
        // offline → manter
        setStatusState("offline");
      }
    })();
  }, [user, upsertPresenca]);

  return { status, setStatus, isAtendente };
}
