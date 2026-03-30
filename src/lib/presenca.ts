export type PresencaStatus = "online" | "pausa" | "offline";

export const HEARTBEAT_INTERVAL_MS = 20_000;
export const HEARTBEAT_TIMEOUT_MS = 90_000;

export function resolvePresencaStatus(
  status: string | null | undefined,
  lastHeartbeat: string | null | undefined
): PresencaStatus {
  if (!status || status === "offline") return "offline";
  if (status === "pausa") return "pausa";
  if (status !== "online") return "offline";
  if (!lastHeartbeat) return "offline";

  const heartbeatTime = new Date(lastHeartbeat).getTime();
  if (Number.isNaN(heartbeatTime)) return "offline";

  return Date.now() - heartbeatTime > HEARTBEAT_TIMEOUT_MS ? "offline" : "online";
}