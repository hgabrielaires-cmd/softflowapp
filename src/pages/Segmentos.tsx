import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { AppLayout } from "@/components/AppLayout";
import { useAuth } from "@/context/AuthContext";
import { useCrudPermissions } from "@/hooks/useCrudPermissions";
import { Navigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { Plus, Loader2, Tag, Trash2, Search } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";

interface Segmento {
  id: string;
  nome: string;
  ativo: boolean;
  filial_id: string;
  created_at: string;
}

interface Filial {
  id: string;
  nome: string;
}

export default function Segmentos() {
  const { isAdmin, roles } = useAuth();
  const { canIncluir: crudIncluir, canEditar: crudEditar, canExcluir: crudExcluir } = useCrudPermissions("segmentos", roles);
  const canAccess = isAdmin || crudIncluir || crudEditar;
  const [segmentos, setSegmentos] = useState<Segmento[]>([]);
  const [currentPage, setCurrentPage] = useState(1);
  const [filiais, setFiliais] = useState<Filial[]>([]);
  const [loading, setLoading] = useState(true);
  const [novoSegmento, setNovoSegmento] = useState("");
  const [filialSelecionada, setFilialSelecionada] = useState<string>("todas");
  const [filtroFilial, setFiltroFilial] = useState<string>("todas");
  const [saving, setSaving] = useState(false);
  const [busca, setBusca] = useState("");

  if (!canAccess) return <Navigate to="/dashboard" replace />;

  async function loadFiliais() {
    const { data } = await supabase.from("filiais").select("id, nome").eq("ativa", true).order("nome");
    if (data) {
      setFiliais(data);
    }
  }

  async function loadSegmentos() {
    setLoading(true);
    let query = supabase.from("segmentos").select("*").order("nome");
    if (filtroFilial !== "todas") query = query.eq("filial_id", filtroFilial);
    const { data, error } = await query;
    if (error) toast.error("Erro ao carregar segmentos");
    else setSegmentos((data as Segmento[]) || []);
    setLoading(false);
  }

  useEffect(() => { loadFiliais(); }, []);
  useEffect(() => { loadSegmentos(); }, [filtroFilial]);

  async function handleAdd() {
    if (!novoSegmento.trim()) return;
    if (!filialSelecionada) { toast.error("Selecione uma filial"); return; }
    setSaving(true);

    if (filialSelecionada === "todas") {
      const inserts = filiais.map(f => ({ nome: novoSegmento.trim(), filial_id: f.id }));
      const { error } = await supabase.from("segmentos").insert(inserts);
      if (error) toast.error("Erro ao adicionar segmento");
      else { toast.success(`Segmento adicionado em ${filiais.length} filiais`); setNovoSegmento(""); loadSegmentos(); }
    } else {
      const { error } = await supabase.from("segmentos").insert({ nome: novoSegmento.trim(), filial_id: filialSelecionada });
      if (error) toast.error("Erro ao adicionar segmento");
      else { toast.success("Segmento adicionado"); setNovoSegmento(""); loadSegmentos(); }
    }

    setSaving(false);
  }

  async function toggleAtivo(seg: Segmento) {
    await supabase.from("segmentos").update({ ativo: !seg.ativo }).eq("id", seg.id);
    loadSegmentos();
  }

  async function handleDelete(id: string) {
    const { error } = await supabase.from("segmentos").delete().eq("id", id);
    if (error) toast.error("Erro ao remover segmento. Pode estar vinculado a contratos.");
    else { toast.success("Segmento removido"); loadSegmentos(); }
  }

  const filialNome = (filialId: string) => filiais.find(f => f.id === filialId)?.nome || "—";

  const filtrados = segmentos.filter(s =>
    !busca || s.nome.toLowerCase().includes(busca.toLowerCase())
  );

  const ITEMS_PER_PAGE = 15;
  const totalPages = Math.max(1, Math.ceil(filtrados.length / ITEMS_PER_PAGE));
  const paginados = filtrados.slice((currentPage - 1) * ITEMS_PER_PAGE, currentPage * ITEMS_PER_PAGE);

  // Reset page when filters change
  useEffect(() => { setCurrentPage(1); }, [busca, filtroFilial]);

  return (
    <AppLayout>
      <div className="space-y-5">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Segmentos</h1>
          <p className="text-sm text-muted-foreground">Gerencie os segmentos de mercado para o CRM</p>
        </div>

        {/* Adicionar */}
        <div className="bg-card rounded-xl border border-border shadow-card p-4 space-y-3">
          <h3 className="text-sm font-semibold text-foreground flex items-center gap-2">
            <Tag className="h-4 w-4 text-primary" />
            Novo Segmento
          </h3>
          <div className="flex gap-2 items-end flex-wrap">
            <div className="space-y-1 flex-1 min-w-[200px]">
              <Select value={filialSelecionada} onValueChange={setFilialSelecionada}>
                <SelectTrigger>
                  <SelectValue placeholder="Selecione a filial" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="todas">Todas as filiais</SelectItem>
                  {filiais.map(f => (
                    <SelectItem key={f.id} value={f.id}>{f.nome}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="flex-1 min-w-[200px]">
              <Input
                placeholder="Nome do segmento..."
                value={novoSegmento}
                onChange={e => setNovoSegmento(e.target.value)}
                onKeyDown={e => { if (e.key === "Enter") { e.preventDefault(); handleAdd(); } }}
              />
            </div>
            <Button onClick={handleAdd} disabled={saving || !novoSegmento.trim()} className="gap-2">
              {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />}
              Adicionar
            </Button>
          </div>
        </div>

        {/* Filtros */}
        <div className="flex gap-3 items-center flex-wrap">
          <Select value={filtroFilial} onValueChange={setFiltroFilial}>
            <SelectTrigger className="w-[220px]">
              <SelectValue placeholder="Filtrar por filial" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="todas">Todas as filiais</SelectItem>
              {filiais.map(f => (
                <SelectItem key={f.id} value={f.id}>{f.nome}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          <div className="relative flex-1 max-w-xs">
            <Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Buscar segmento..."
              value={busca}
              onChange={e => setBusca(e.target.value)}
              className="pl-9"
            />
          </div>
        </div>

        {/* Tabela */}
        <div className="bg-card rounded-xl border border-border shadow-card overflow-hidden">
          <Table>
            <TableHeader>
              <TableRow className="bg-muted/50">
                <TableHead>Segmento</TableHead>
                <TableHead>Filial</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Criado em</TableHead>
                <TableHead className="text-right">Ações</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading ? (
                <TableRow>
                  <TableCell colSpan={5} className="text-center py-12">
                    <Loader2 className="h-6 w-6 animate-spin mx-auto text-muted-foreground" />
                  </TableCell>
                </TableRow>
              ) : filtrados.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={5} className="text-center py-12 text-muted-foreground">
                    <Tag className="h-8 w-8 mx-auto mb-2 opacity-30" />
                    Nenhum segmento encontrado
                  </TableCell>
                </TableRow>
              ) : (
                paginados.map(seg => (
                  <TableRow key={seg.id}>
                    <TableCell className="font-medium">{seg.nome}</TableCell>
                    <TableCell className="text-sm text-muted-foreground">{filialNome(seg.filial_id)}</TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <Switch checked={seg.ativo} onCheckedChange={() => toggleAtivo(seg)} />
                        <Badge variant={seg.ativo ? "default" : "secondary"} className="text-xs">
                          {seg.ativo ? "Ativo" : "Inativo"}
                        </Badge>
                      </div>
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground">
                      {new Date(seg.created_at).toLocaleDateString("pt-BR")}
                    </TableCell>
                    <TableCell className="text-right">
                      <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive hover:text-destructive" onClick={() => handleDelete(seg.id)}>
                        <Trash2 className="h-3.5 w-3.5" />
                      </Button>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
          {!loading && (
            <>
              <div className="px-4 py-3 border-t border-border text-xs text-muted-foreground flex items-center gap-1.5">
                <Tag className="h-3.5 w-3.5" />
                {filtrados.length} segmento(s)
              </div>
              <TablePagination
                currentPage={currentPage}
                totalPages={totalPages}
                totalItems={filtrados.length}
                itemsPerPage={ITEMS_PER_PAGE}
                onPageChange={setCurrentPage}
              />
            </>
          )}
        </div>
      </div>
    </AppLayout>
  );
}
