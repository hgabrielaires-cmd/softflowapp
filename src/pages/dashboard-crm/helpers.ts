import { startOfMonth, endOfMonth, subMonths, subDays, format, startOfDay, endOfDay } from "date-fns";

export function calcularPeriodo(tipo: string, customInicio?: string, customFim?: string) {
  const now = new Date();
  let inicio: Date;
  let fim: Date;

  switch (tipo) {
    case "mes_anterior":
      inicio = startOfMonth(subMonths(now, 1));
      fim = endOfMonth(subMonths(now, 1));
      break;
    case "30d":
      inicio = startOfDay(subDays(now, 30));
      fim = endOfDay(now);
      break;
    case "60d":
      inicio = startOfDay(subDays(now, 60));
      fim = endOfDay(now);
      break;
    case "90d":
      inicio = startOfDay(subDays(now, 90));
      fim = endOfDay(now);
      break;
    case "personalizado":
      inicio = customInicio ? startOfDay(new Date(customInicio)) : startOfMonth(now);
      fim = customFim ? endOfDay(new Date(customFim)) : endOfDay(now);
      break;
    default: // mes_atual
      inicio = startOfMonth(now);
      fim = endOfDay(now);
      break;
  }

  return {
    inicio: format(inicio, "yyyy-MM-dd'T'HH:mm:ss"),
    fim: format(fim, "yyyy-MM-dd'T'HH:mm:ss"),
  };
}

export function calcularPeriodoAnterior(inicio: string, fim: string) {
  const i = new Date(inicio);
  const f = new Date(fim);
  const diffMs = f.getTime() - i.getTime();
  const anteriorFim = new Date(i.getTime() - 1);
  const anteriorInicio = new Date(anteriorFim.getTime() - diffMs);
  return {
    inicio: format(anteriorInicio, "yyyy-MM-dd'T'HH:mm:ss"),
    fim: format(anteriorFim, "yyyy-MM-dd'T'HH:mm:ss"),
  };
}

export function formatValor(valor: number): string {
  return new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(valor);
}

export function calcVariacao(atual: number, anterior: number): number {
  if (anterior === 0) return atual > 0 ? 100 : 0;
  return ((atual - anterior) / anterior) * 100;
}
