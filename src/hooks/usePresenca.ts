import { useEffect, useRef, useState, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/context/AuthContext";

type PresencaStatus = "online" | "pausa" | "offline";

const HEARTBEAT_INTERVAL_MS = 20_000; // 20s
const HEARTBEAT_TIMEOUT_MS = 90_000; // 90s

export function usePresenca() {
  const { user, profile } = useAuth();
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

  // Heartbeat: update last_heartbeat every 30s when online
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

  // On mount: restore or correct status
  useEffect(() => {
    if (!user) return;

    (async () => {
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

      if (savedStatus === "online" && now - lastHb > HEARTBEAT_TIMEOUT_MS) {
        // Stale online → mark offline
        setStatusState("offline");
        await upsertPresenca("offline");
      } else {
        // Restore saved status (pausa, offline, or valid online)
        setStatusState(savedStatus);
      }
    })();
  }, [user, upsertPresenca]);

  return { status, setStatus, isAtendente };
}
