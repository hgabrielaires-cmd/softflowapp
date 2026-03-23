import { BotOpcao } from "./types";

export function parseOpcoes(raw: any): BotOpcao[] {
  if (!raw) return [];
  if (Array.isArray(raw)) return raw as BotOpcao[];
  try {
    return JSON.parse(raw) as BotOpcao[];
  } catch {
    return [];
  }
}

export function formatarHorario(time: string | null): string {
  if (!time) return "--:--";
  return time.slice(0, 5);
}
