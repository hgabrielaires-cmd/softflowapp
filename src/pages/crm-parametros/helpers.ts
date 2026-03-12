import type { CrmEtapa } from "./types";

export function sortByOrdem<T extends { ordem: number }>(items: T[]): T[] {
  return [...items].sort((a, b) => a.ordem - b.ordem);
}

export function nextOrdem<T extends { ordem: number }>(items: T[]): number {
  if (items.length === 0) return 0;
  return Math.max(...items.map((i) => i.ordem)) + 1;
}
