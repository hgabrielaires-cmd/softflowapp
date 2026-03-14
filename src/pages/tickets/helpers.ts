export interface SlaInfo {
  remaining: string;
  percent: number;
  color: "green" | "yellow" | "red";
  vencido: boolean;
}

export function calcSla(slaDeadline: string | null, slaHoras: number): SlaInfo {
  if (!slaDeadline) return { remaining: "--", percent: 100, color: "green", vencido: false };

  const now = new Date();
  const deadline = new Date(slaDeadline);
  const diffMs = deadline.getTime() - now.getTime();
  const totalMs = slaHoras * 3600 * 1000;
  const percent = totalMs > 0 ? Math.max(0, Math.min(100, (diffMs / totalMs) * 100)) : 0;

  if (diffMs <= 0) {
    return { remaining: "VENCIDO ⚠️", percent: 0, color: "red", vencido: true };
  }

  const hours = Math.floor(diffMs / 3600000);
  const minutes = Math.floor((diffMs % 3600000) / 60000);
  const remaining = hours > 0 ? `${hours}h ${minutes}min` : `${minutes}min`;

  let color: SlaInfo["color"] = "green";
  if (percent < 20) color = "red";
  else if (percent < 50) color = "yellow";

  return { remaining, percent, color, vencido: false };
}

export function formatRelativeTime(dateStr: string): string {
  const now = new Date();
  const date = new Date(dateStr);
  const diffMs = now.getTime() - date.getTime();
  const minutes = Math.floor(diffMs / 60000);
  const hours = Math.floor(minutes / 60);
  const days = Math.floor(hours / 24);

  if (minutes < 1) return "agora";
  if (minutes < 60) return `há ${minutes}min`;
  if (hours < 24) return `há ${hours}h`;
  if (days < 30) return `há ${days}d`;
  return date.toLocaleDateString("pt-BR");
}

export function formatDate(dateStr: string): string {
  return new Date(dateStr).toLocaleDateString("pt-BR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  });
}

export function formatDateTime(dateStr: string): string {
  return new Date(dateStr).toLocaleString("pt-BR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}
