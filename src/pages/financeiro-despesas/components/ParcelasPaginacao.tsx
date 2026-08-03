import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

export const OPCOES_POR_PAGINA = ["5", "10", "20", "50", "100", "todas"] as const;

interface Props {
  total: number;
  porPagina: string;
  setPorPagina: (v: string) => void;
  pagina: number;
  setPagina: (v: number) => void;
  totalPaginas: number;
}

export function ParcelasPaginacao({ total, porPagina, setPorPagina, pagina, setPagina, totalPaginas }: Props) {
  if (total <= 5) return null;
  return (
    <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
      <div className="flex items-center gap-2">
        <Label className="text-xs text-muted-foreground whitespace-nowrap">Por página</Label>
        <Select value={porPagina} onValueChange={(v) => { setPorPagina(v); setPagina(1); }}>
          <SelectTrigger className="h-8 w-24"><SelectValue /></SelectTrigger>
          <SelectContent>
            {OPCOES_POR_PAGINA.map((o) => (
              <SelectItem key={o} value={o}>{o === "todas" ? "Todas" : o}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
      {totalPaginas > 1 && (
        <div className="flex items-center gap-2">
          <Button type="button" variant="outline" size="sm" disabled={pagina <= 1} onClick={() => setPagina(pagina - 1)}>
            Anterior
          </Button>
          <span className="text-xs text-muted-foreground whitespace-nowrap">
            Página {pagina} de {totalPaginas}
          </span>
          <Button
            type="button"
            variant="outline"
            size="sm"
            disabled={pagina >= totalPaginas}
            onClick={() => setPagina(pagina + 1)}
          >
            Próxima
          </Button>
        </div>
      )}
    </div>
  );
}

export function fatiar<T>(itens: T[], porPagina: string, pagina: number) {
  if (porPagina === "todas") return { visiveis: itens, totalPaginas: 1 };
  const n = Number(porPagina) || 5;
  const totalPaginas = Math.max(1, Math.ceil(itens.length / n));
  const p = Math.min(pagina, totalPaginas);
  return { visiveis: itens.slice((p - 1) * n, p * n), totalPaginas };
}
