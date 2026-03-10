// ─── Helpers for Usuarios module ─────────────────────────────────────────

/** Generate a secure 12-char password with at least 1 uppercase, 1 lowercase, 1 digit and 1 special char */
export function gerarSenhaSegura(): string {
  const upper = "ABCDEFGHIJKLMNOPQRSTUVWXYZ";
  const lower = "abcdefghijklmnopqrstuvwxyz";
  const digits = "0123456789";
  const special = "!@#$%&*";
  const all = upper + lower + digits + special;
  const securePick = (s: string) => {
    const arr = new Uint32Array(1);
    crypto.getRandomValues(arr);
    return s[arr[0] % s.length];
  };
  const mandatory = [securePick(upper), securePick(lower), securePick(digits), securePick(special)];
  const rest = Array.from({ length: 8 }, () => securePick(all));
  const combined = [...mandatory, ...rest];
  for (let i = combined.length - 1; i > 0; i--) {
    const arr = new Uint32Array(1);
    crypto.getRandomValues(arr);
    const j = arr[0] % (i + 1);
    [combined[i], combined[j]] = [combined[j], combined[i]];
  }
  return combined.join("");
}
