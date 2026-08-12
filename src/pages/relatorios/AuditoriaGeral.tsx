import { useMemo, useState } from "react";
import { AppLayout } from "@/components/AppLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { TablePagination } from "@/components/TablePagination";
import { ShieldCheck, X } from "lucide-react";
import {
  useAuditoriaGeralQuery,
  useAuditoriaProfilesQuery,
  type AuditoriaGeralRegistro,
} from "./useAuditoriaGeralQueries";
import { acaoLabel, acaoVariant, formatDataHora, moduloLabel, resumoDetalhes, tipoAcao } from "./helpers";

const TODOS = "todos";
const POR_PAGINA = 15;

const emptyFiltros = {
  data_inicio: "",
  data_fim: "",
  user_id: TODOS,
  modulo: TODOS,
  acao: TODOS,
};

export default function AuditoriaGeral() {
  const [filtros, setFiltrosRaw] = useState(emptyFiltros);
  const [page, setPage] = useState(1);

  const { data: registros = [], isLoading } = useAuditoriaGeralQuery();
  const { data: usuarios = [] } = useAuditoriaProfilesQuery();

  const setFiltros = (patch: Partial<typeof emptyFiltros>) => {
    setFiltrosRaw((prev) => ({ ...prev, ...patch }));
    setPage(1);
  };

  const nomeUsuario = (id: string | null) => {
    if (!id) return "Sistema";
    const u = usuarios.find((x) => x.user_id === id);
    return u?.full_name || u?.email || "Usuário removido";
  };

  const modulos = useMemo(
    () => Array.from(new Set(registros.map((r) => r.entity_type))).sort(),
    [registros],
  );

  const usuariosComEvento = useMemo(() => {
    const ids = new Set(registros.map((r) => r.user_id).filter(Boolean) as string[]);
    return usuarios.filter((u) => ids.has(u.user_id));
  }, [registros, usuarios]);

  const filtrados = useMemo(() => {
    return registros.filter((r: AuditoriaGeralRegistro) => {
      if (filtros.modulo !== TODOS && r.entity_type !== filtros.modulo) return false;
      if (filtros.user_id !== TODOS && r.user_id !== filtros.user_id) return false;
      if (filtros.acao !== TODOS && tipoAcao(r.action) !== filtros.acao) return false;
      const dia = r.created_at.slice(0, 10);
      if (filtros.data_inicio && dia < filtros.data_inicio) return false;
      if (filtros.data_fim && dia > filtros.data_fim) return false;
      return true;
    });
  }, [registros, filtros]);

  const totalPages = Math.ceil(filtrados.length / POR_PAGINA) || 1;
  const paginados = filtrados.slice((page - 1) * POR_PAGINA, page * POR_PAGINA);
  const temFiltro = JSON.stringify(filtros) !== JSON.stringify(emptyFiltros);

  return (
    <AppLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold text-foreground flex items-center gap-2">
            <ShieldCheck className="h-6 w-6" /> Auditoria do sistema
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            Registro de inclusões, edições e exclusões por usuário, módulo, data e hora
          </p>
        </div>

        <div className="rounded-lg border border-border bg-card p-4 space-y-4">
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
            <div className="space-y-1.5">
              <Label className="text-xs">De</Label>
              <Input type="date" value={filtros.data_inicio} onChange={(e) => setFiltros({ data_inicio: e.target.value })} />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">Até</Label>
              <Input type="date" value={filtros.data_fim} onChange={(e) => setFiltros({ data_fim: e.target.value })} />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">Usuário</Label>
              <Select value={filtros.user_id} onValueChange={(v) => setFiltros({ user_id: v })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value={TODOS}>Todos</SelectItem>
                  {usuariosComEvento.map((u) => (
                    <SelectItem key={u.user_id} value={u.user_id}>{u.full_name || u.email}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">Módulo</Label>
              <Select value={filtros.modulo} onValueChange={(v) => setFiltros({ modulo: v })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value={TODOS}>Todos</SelectItem>
                  {modulos.map((m) => (
                    <SelectItem key={m} value={m}>{moduloLabel(m)}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">Ação</Label>
              <Select value={filtros.acao} onValueChange={(v) => setFiltros({ acao: v })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value={TODOS}>Todas</SelectItem>
                  <SelectItem value="exclusao">Exclusão</SelectItem>
                  <SelectItem value="edicao">Edição</SelectItem>
                  <SelectItem value="criacao">Inclusão</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="flex items-center justify-between">
            <span className="text-sm text-muted-foreground">{filtrados.length} evento(s)</span>
            {temFiltro && (
              <Button variant="ghost" size="sm" onClick={() => { setFiltrosRaw(emptyFiltros); setPage(1); }}>
                <X className="h-4 w-4 mr-1" /> Limpar filtros
              </Button>
            )}
          </div>
        </div>

        <div className="rounded-lg border border-border bg-card overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="whitespace-nowrap">Data/hora</TableHead>
                <TableHead>Usuário</TableHead>
                <TableHead>Módulo</TableHead>
                <TableHead>Ação</TableHead>
                <TableHead>Detalhes</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                <TableRow>
                  <TableCell colSpan={5} className="text-center py-10 text-muted-foreground">Carregando...</TableCell>
                </TableRow>
              ) : paginados.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={5} className="text-center py-10 text-muted-foreground">
                    Nenhum evento de auditoria encontrado.
                  </TableCell>
                </TableRow>
              ) : (
                paginados.map((r) => (
                  <TableRow key={r.id}>
                    <TableCell className="whitespace-nowrap">{formatDataHora(r.created_at)}</TableCell>
                    <TableCell>{nomeUsuario(r.user_id)}</TableCell>
                    <TableCell>{moduloLabel(r.entity_type)}</TableCell>
                    <TableCell>
                      <Badge variant={acaoVariant(r.action)}>{acaoLabel(r.action)}</Badge>
                    </TableCell>
                    <TableCell className="text-sm max-w-[380px] truncate">
                      {resumoDetalhes(r.details)}
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>

        <TablePagination
          currentPage={page}
          totalPages={totalPages}
          totalItems={filtrados.length}
          itemsPerPage={POR_PAGINA}
          onPageChange={setPage}
        />
      </div>
    </AppLayout>
  );
}
