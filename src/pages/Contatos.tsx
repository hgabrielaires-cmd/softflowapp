import { useState, useEffect, useMemo } from "react";
import { AppLayout } from "@/components/AppLayout";
import { supabase } from "@/integrations/supabase/client";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import { TablePagination } from "@/components/TablePagination";
import { useUserFiliais } from "@/hooks/useUserFiliais";
import { Search, Phone, Mail, Star, Building2, Users, Link2 } from "lucide-react";
import { formatPhoneDisplay } from "@/lib/utils";
import {
  Tooltip, TooltipContent, TooltipTrigger,
} from "@/components/ui/tooltip";

interface ContatoRow {
  id: string;
  cliente_id: string;
  nome: string;
  cargo: string | null;
  telefone: string | null;
  email: string | null;
  decisor: boolean;
  ativo: boolean;
  created_at: string;
  clientes: {
    nome_fantasia: string;
    filial_id: string | null;
  } | null;
}
import { normalizeBRPhone } from "@/lib/utils";

/** Remove tudo que não é dígito para comparação */
function normalizePhone(phone: string | null): string {
  return normalizeBRPhone(phone);
}
  return phone.replace(/\D/g, "");
}

const ITEMS_PER_PAGE = 20;

export default function Contatos() {
  const { filiaisDoUsuario, isGlobal } = useUserFiliais();
  const [contatos, setContatos] = useState<ContatoRow[]>([]);
  const [filiais, setFiliais] = useState<{ id: string; nome: string }[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [filtroFilialId, setFiltroFilialId] = useState("__todas__");
  const [filtroStatus, setFiltroStatus] = useState<"todos" | "ativos" | "inativos">("ativos");
  const [currentPage, setCurrentPage] = useState(1);

  useEffect(() => {
    fetchData();
  }, []);

  async function fetchData() {
    setLoading(true);
    const [{ data: c }, { data: f }] = await Promise.all([
      supabase
        .from("cliente_contatos")
        .select("id, cliente_id, nome, cargo, telefone, email, decisor, ativo, created_at, clientes(nome_fantasia, filial_id)")
        .order("nome"),
      supabase.from("filiais").select("id, nome").order("nome"),
    ]);
    setContatos((c || []) as ContatoRow[]);
    setFiliais(f || []);
    setLoading(false);
  }

  const allowedFilialIds = filiaisDoUsuario.map((f) => f.id);

  // Mapa de telefone normalizado → lista de clientes vinculados (todos os contatos, sem filtro)
  const phoneClientsMap = useMemo(() => {
    const map: Record<string, { cliente_id: string; nome_fantasia: string }[]> = {};
    for (const c of contatos) {
      const norm = normalizePhone(c.telefone);
      if (!norm || !c.clientes) continue;
      if (!map[norm]) map[norm] = [];
      // Evitar duplicatas de cliente
      if (!map[norm].some((x) => x.cliente_id === c.cliente_id)) {
        map[norm].push({ cliente_id: c.cliente_id, nome_fantasia: c.clientes.nome_fantasia });
      }
    }
    return map;
  }, [contatos]);

  const filtered = useMemo(() => {
    let list = contatos;

    // Filial access
    if (!isGlobal) {
      list = list.filter((c) => c.clientes?.filial_id && allowedFilialIds.includes(c.clientes.filial_id));
    }

    // Filial filter
    if (filtroFilialId !== "__todas__") {
      list = list.filter((c) => c.clientes?.filial_id === filtroFilialId);
    }

    // Status filter
    if (filtroStatus === "ativos") list = list.filter((c) => c.ativo);
    else if (filtroStatus === "inativos") list = list.filter((c) => !c.ativo);

    // Search
    const term = search.toLowerCase().trim();
    const termDigits = term.replace(/\D/g, "");
    if (term) {
      list = list.filter(
        (c) =>
          c.nome.toLowerCase().includes(term) ||
          (c.cargo || "").toLowerCase().includes(term) ||
          (c.email || "").toLowerCase().includes(term) ||
          (termDigits.length >= 4 && normalizePhone(c.telefone).includes(termDigits)) ||
          (!termDigits.length && (c.telefone || "").includes(term)) ||
          (c.clientes?.nome_fantasia || "").toLowerCase().includes(term)
      );
    }

    // Deduplicate by name + phone — same person with same number appears once
    const seen = new Set<string>();
    const deduped: ContatoRow[] = [];
    for (const c of list) {
      const norm = normalizePhone(c.telefone);
      const key = norm ? `${c.nome.toLowerCase().trim()}::${norm}` : c.id;
      if (seen.has(key)) continue;
      seen.add(key);
      deduped.push(c);
    }

    return deduped;
  }, [contatos, isGlobal, allowedFilialIds, filtroFilialId, filtroStatus, search]);

  useEffect(() => { setCurrentPage(1); }, [search, filtroFilialId, filtroStatus]);

  const filialNome = (id: string | null) => filiais.find((f) => f.id === id)?.nome || "—";

  return (
    <AppLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold text-foreground flex items-center gap-2">
            <Users className="h-6 w-6" /> Contatos
          </h1>
          <p className="text-muted-foreground text-sm mt-1">
            Todos os contatos cadastrados no sistema
          </p>
        </div>

        {/* Filters */}
        <div className="flex items-center gap-3 flex-wrap">
          <div className="relative max-w-sm flex-1 min-w-[200px]">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none" />
            <Input
              placeholder="Buscar por nome, cargo, e-mail, telefone ou cliente..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-9"
              autoComplete="off"
            />
          </div>

          {filiaisDoUsuario.length > 1 && (
            <Select value={filtroFilialId} onValueChange={setFiltroFilialId}>
              <SelectTrigger className="w-[220px]">
                <Building2 className="h-4 w-4 mr-2 text-muted-foreground" />
                <SelectValue placeholder="Filial" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="__todas__">Todas as Filiais</SelectItem>
                {filiaisDoUsuario.map((fil) => (
                  <SelectItem key={fil.id} value={fil.id}>{fil.nome}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}

          <Select value={filtroStatus} onValueChange={(v) => setFiltroStatus(v as any)}>
            <SelectTrigger className="w-[150px]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="ativos">Ativos</SelectItem>
              <SelectItem value="inativos">Inativos</SelectItem>
              <SelectItem value="todos">Todos</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* Table */}
        <div className="rounded-lg border border-border bg-card overflow-hidden">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Nome</TableHead>
                <TableHead>Cargo</TableHead>
                <TableHead>Telefone</TableHead>
                <TableHead>E-mail</TableHead>
                <TableHead>Empresas vinculadas</TableHead>
                <TableHead>Filial</TableHead>
                <TableHead>Status</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading ? (
                <TableRow>
                  <TableCell colSpan={7} className="text-center text-muted-foreground py-10">
                    Carregando...
                  </TableCell>
                </TableRow>
              ) : filtered.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={7} className="text-center text-muted-foreground py-10">
                    Nenhum contato encontrado
                  </TableCell>
                </TableRow>
              ) : (
                filtered
                  .slice((currentPage - 1) * ITEMS_PER_PAGE, currentPage * ITEMS_PER_PAGE)
                  .map((c) => {
                    const norm = normalizePhone(c.telefone);
                    const linkedClients = norm ? (phoneClientsMap[norm] || []) : [];
                    const hasMultiple = linkedClients.length > 1;

                    return (
                      <TableRow key={c.id} className={!c.ativo ? "opacity-50" : ""}>
                        <TableCell>
                          <div className="flex items-center gap-1.5">
                            <span className="font-medium text-foreground">{c.nome}</span>
                            {c.decisor && (
                              <Star className="h-3 w-3 text-primary fill-primary" />
                            )}
                          </div>
                        </TableCell>
                        <TableCell className="text-sm text-muted-foreground">{c.cargo || "—"}</TableCell>
                        <TableCell>
                          {c.telefone ? (
                            <span className="text-sm flex items-center gap-1 text-muted-foreground">
                              <Phone className="h-3 w-3" />
                              {formatPhoneDisplay(c.telefone)}
                              {hasMultiple && (
                                <Tooltip>
                                  <TooltipTrigger asChild>
                                    <Badge variant="outline" className="ml-1 text-[10px] px-1.5 py-0 gap-0.5 border-primary/30 text-primary cursor-help">
                                      <Link2 className="h-2.5 w-2.5" />
                                      {linkedClients.length}
                                    </Badge>
                                  </TooltipTrigger>
                                  <TooltipContent side="bottom" className="max-w-xs">
                                    <p className="text-xs font-semibold mb-1">Empresas com este número:</p>
                                    <ul className="text-xs space-y-0.5">
                                      {linkedClients.map((lc) => (
                                        <li key={lc.cliente_id} className="flex items-center gap-1">
                                          <Building2 className="h-3 w-3 text-muted-foreground shrink-0" />
                                          {lc.nome_fantasia}
                                        </li>
                                      ))}
                                    </ul>
                                  </TooltipContent>
                                </Tooltip>
                              )}
                            </span>
                          ) : "—"}
                        </TableCell>
                        <TableCell>
                          {c.email ? (
                            <span className="text-sm flex items-center gap-1 text-muted-foreground">
                              <Mail className="h-3 w-3" />
                              {c.email}
                            </span>
                          ) : "—"}
                        </TableCell>
                        <TableCell>
                          {linkedClients.length > 0 ? (
                            <div className="space-y-0.5">
                              {linkedClients.map((lc) => (
                                <div
                                  key={lc.cliente_id}
                                  className={`text-sm flex items-center gap-1 ${
                                    lc.cliente_id === c.cliente_id
                                      ? "font-medium text-foreground"
                                      : "text-muted-foreground"
                                  }`}
                                >
                                  <Building2 className="h-3 w-3 shrink-0" />
                                  {lc.nome_fantasia}
                                  {lc.cliente_id === c.cliente_id && (
                                    <span className="text-[10px] text-muted-foreground">(atual)</span>
                                  )}
                                </div>
                              ))}
                            </div>
                          ) : (
                            <span className="text-sm text-muted-foreground">
                              {c.clientes?.nome_fantasia || "—"}
                            </span>
                          )}
                        </TableCell>
                        <TableCell>
                          <span className="flex items-center gap-1 text-sm text-muted-foreground">
                            <Building2 className="h-3 w-3" />
                            {filialNome(c.clientes?.filial_id || null)}
                          </span>
                        </TableCell>
                        <TableCell>
                          <Badge variant={c.ativo ? "default" : "secondary"}>
                            {c.ativo ? "Ativo" : "Inativo"}
                          </Badge>
                        </TableCell>
                      </TableRow>
                    );
                  })
              )}
            </TableBody>
          </Table>
          <TablePagination
            currentPage={currentPage}
            totalPages={Math.ceil(filtered.length / ITEMS_PER_PAGE)}
            totalItems={filtered.length}
            itemsPerPage={ITEMS_PER_PAGE}
            onPageChange={setCurrentPage}
          />
        </div>
      </div>
    </AppLayout>
  );
}
