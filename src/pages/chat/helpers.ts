import { formatDistanceToNow } from "date-fns";
import { ptBR } from "date-fns/locale";

export function tempoRelativo(data: string | null): string {
  if (!data) return "";
  return formatDistanceToNow(new Date(data), { addSuffix: true, locale: ptBR });
}

export function previewMensagem(texto: string | null, max = 40): string {
  if (!texto) return "";
  return texto.length > max ? texto.slice(0, max) + "…" : texto;
}

export function formatarTelefone(numero: string): string {
  if (!numero) return "";
  const limpo = numero.replace(/\D/g, "");
  if (limpo.length === 13) {
    return `+${limpo.slice(0, 2)} (${limpo.slice(2, 4)}) ${limpo.slice(4, 9)}-${limpo.slice(9)}`;
  }
  if (limpo.length === 12) {
    return `+${limpo.slice(0, 2)} (${limpo.slice(2, 4)}) ${limpo.slice(4, 8)}-${limpo.slice(8)}`;
  }
  return numero;
}
