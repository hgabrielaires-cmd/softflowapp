/**
 * Gera todas as variações plausíveis de um número brasileiro:
 * com/sem código do país e com/sem o nono dígito de celular.
 */
export function normalizarNumero(numero: string): string[] {
  const limpo = (numero || "").replace(/\D/g, "");
  const variantes = new Set<string>();
  if (!limpo) return [];

  let semPais = limpo;
  if (semPais.startsWith("55") && semPais.length >= 12) {
    semPais = semPais.slice(2);
  }

  const ddd = semPais.slice(0, 2);
  const local = semPais.slice(2);

  let com9 = local;
  let sem9 = local;
  if (local.length === 9) {
    sem9 = local.slice(1);
  } else if (local.length === 8) {
    com9 = "9" + local;
  }

  if (ddd && local) {
    for (const n of [com9, sem9]) {
      variantes.add(ddd + n);
      variantes.add("55" + ddd + n);
      variantes.add("+55" + ddd + n);
    }
  }
  variantes.add(limpo);
  return Array.from(variantes);
}

/** Formato que a Meta usa ao devolver números brasileiros: 55 + DDD + 8 dígitos. */
export function normalizarNumeroParaMeta(numero: string): string {
  const limpo = (numero || "").replace(/\D/g, "");
  let semPais = limpo.startsWith("55") && limpo.length >= 12 ? limpo.slice(2) : limpo;
  const ddd = semPais.slice(0, 2);
  let local = semPais.slice(2);
  if (local.length === 9 && local.startsWith("9")) local = local.slice(1);
  return "55" + ddd + local;
}
