import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

/**
 * Normaliza telefones brasileiros para o formato correto com 9 dígitos.
 * - Remove tudo que não é número
 * - Remove código de país 55 se presente
 * - Se 10 dígitos (DDD + 8), insere "9" após o DDD
 * - Se 11 dígitos (DDD + 9 + 8), mantém
 * - Retorna apenas dígitos
 */
export function normalizeBRPhone(phone: string | null | undefined): string {
  if (!phone) return "";
  let digits = phone.replace(/\D/g, "");
  if (!digits) return "";
  // Remove country code 55
  if (digits.length >= 12 && digits.startsWith("55")) {
    digits = digits.slice(2);
  }
  // 10 digits = DDD(2) + number(8) → insert 9 after DDD
  if (digits.length === 10) {
    digits = digits.slice(0, 2) + "9" + digits.slice(2);
  }
  return digits;
}

/**
 * Formats a phone number for display: (DD) 99999-9999 or (DD) 9999-9999
 * Only strips non-digits for formatting; returns original if too short.
 * Does NOT alter the stored value — use for display only.
 */
export function formatPhoneDisplay(phone: string | null | undefined): string {
  if (!phone) return "";
  const digits = phone.replace(/\D/g, "");
  // Remove country code 55 if present
  const local = digits.length >= 12 && digits.startsWith("55") ? digits.slice(2) : digits;
  if (local.length === 11) {
    return `(${local.slice(0, 2)}) ${local.slice(2, 7)}-${local.slice(7)}`;
  }
  if (local.length === 10) {
    return `(${local.slice(0, 2)}) ${local.slice(2, 6)}-${local.slice(6)}`;
  }
  return phone; // return as-is if unexpected length
}

/**
 * Applies phone mask as the user types. Use on input onChange.
 */
export function applyPhoneMask(value: string): string {
  const digits = value.replace(/\D/g, "").slice(0, 11);
  if (digits.length <= 2) return digits.length ? `(${digits}` : "";
  if (digits.length <= 6) return `(${digits.slice(0, 2)}) ${digits.slice(2)}`;
  if (digits.length <= 10) return `(${digits.slice(0, 2)}) ${digits.slice(2, 6)}-${digits.slice(6)}`;
  return `(${digits.slice(0, 2)}) ${digits.slice(2, 7)}-${digits.slice(7)}`;
}
