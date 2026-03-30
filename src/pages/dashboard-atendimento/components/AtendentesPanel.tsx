import { Card } from "@/components/ui/card";
import { cn } from "@/lib/utils";

interface AtendentePresenca {
  user_id: string;
  full_name: string | null;
  avatar_url: string | null;
  presenca_status: "online" | "pausa" | "offline";
}

interface AtendentesPanelProps {
  atendentes?: AtendentePresenca[];
  loading?: boolean;
}

const HEARTBEAT_TIMEOUT_MS = 90_000;

function resolveStatus(
  status: string | null,
  lastHeartbeat: string | null
): "online" | "pausa" | "offline" {
  if (!status || status === "offline") return "offline";
  if (status === "pausa") return "pausa";
  if (status === "online") {
    if (!lastHeartbeat) return "offline";
    const elapsed = Date.now() - new Date(lastHeartbeat).getTime();
    return elapsed > HEARTBEAT_TIMEOUT_MS ? "offline" : "online";
  }
  return "offline";
}

function primeiroNome(name: string | null): string {
  if (!name) return "?";
  return name.split(" ")[0];
}

function initials(name: string | null): string {
  if (!name) return "?";
  return name
    .split(" ")
    .map((n) => n[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();
}

const statusOrder = { online: 0, pausa: 1, offline: 2 };

const dotColors = {
  online: "bg-green-500",
  pausa: "bg-yellow-500",
  offline: "bg-red-500",
};

const fallbackBg = {
  online: "bg-green-100 text-green-700",
  pausa: "bg-yellow-100 text-yellow-700",
  offline: "bg-gray-100 text-gray-400",
};

export function AtendentesPanel({ atendentes, loading }: AtendentesPanelProps) {
  if (loading) {
    return (
      <Card className="p-4">
        <div className="h-5 w-40 bg-muted animate-pulse rounded mb-3" />
        <div className="flex gap-4">
          {[1, 2, 3].map((i) => (
            <div key={i} className="flex flex-col items-center gap-1">
              <div className="w-12 h-12 rounded-full bg-muted animate-pulse" />
              <div className="h-3 w-10 bg-muted animate-pulse rounded" />
            </div>
          ))}
        </div>
      </Card>
    );
  }

  const list = atendentes ?? [];
  const sorted = [...list].sort(
    (a, b) => statusOrder[a.presenca_status] - statusOrder[b.presenca_status]
  );

  const countOnline = list.filter((a) => a.presenca_status === "online").length;
  const countPausa = list.filter((a) => a.presenca_status === "pausa").length;
  const countOffline = list.filter((a) => a.presenca_status === "offline").length;

  const subtitle = [
    countOnline > 0 && `${countOnline} online`,
    countPausa > 0 && `${countPausa} pausa`,
    countOffline > 0 && `${countOffline} offline`,
  ]
    .filter(Boolean)
    .join(" · ");

  return (
    <Card className="p-4">
      <h2 className="text-sm font-semibold text-foreground mb-3">
        Atendentes{" "}
        <span className="text-muted-foreground font-normal">
          ({subtitle || "nenhum"})
        </span>
      </h2>

      {sorted.length === 0 ? (
        <p className="text-xs text-muted-foreground">
          Nenhum atendente configurado.
        </p>
      ) : (
        <div className="flex flex-wrap gap-4">
          {sorted.map((a) => (
            <div key={a.user_id} className="flex flex-col items-center gap-1">
              {/* Avatar wrapper */}
              <div className="relative">
                <div
                  className={cn(
                    "w-12 h-12 rounded-full overflow-hidden flex items-center justify-center shrink-0",
                    a.presenca_status === "pausa" && "opacity-75",
                    a.presenca_status === "offline" && "grayscale"
                  )}
                  style={
                    a.presenca_status === "offline"
                      ? { filter: "grayscale(100%)" }
                      : undefined
                  }
                >
                  {a.avatar_url ? (
                    <img
                      src={a.avatar_url}
                      alt={a.full_name || "Avatar"}
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <div
                      className={cn(
                        "w-full h-full flex items-center justify-center text-sm font-bold",
                        fallbackBg[a.presenca_status]
                      )}
                    >
                      {initials(a.full_name)}
                    </div>
                  )}
                </div>
                {/* Status dot */}
                <span
                  className={cn(
                    "absolute bottom-0 right-0 w-3 h-3 rounded-full border-2 border-background",
                    dotColors[a.presenca_status]
                  )}
                />
              </div>
              {/* Name */}
              <span
                className={cn(
                  "text-xs leading-tight text-center max-w-[56px] truncate",
                  a.presenca_status === "offline"
                    ? "text-muted-foreground"
                    : "text-foreground"
                )}
              >
                {primeiroNome(a.full_name)}
              </span>
            </div>
          ))}
        </div>
      )}
    </Card>
  );
}

export { resolveStatus };
export type { AtendentePresenca };
