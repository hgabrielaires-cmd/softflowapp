import { useState, useEffect } from "react";
import { TablePagination } from "@/components/TablePagination";
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
import { Plus, Loader2, Tag, Trash2, Search } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";

interface Segmento {
  id: string;
  nome: string;
  ativo: boolean;
  created_at: string;
}

export default function Segmentos() {
  const { isAdmin, roles } = useAuth();
  const { canIncluir: crudIncluir, canEditar: crudEditar, canExcluir: crudExcluir } = useCrudPermissions("segmentos", roles);
  const canAccess = isAdmin || crudIncluir || crudEditar;
  const [segmentos, setSegmentos] = useState<Segmento[]>([]);
  const [currentPage, setCurrentPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [novoSegmento, setNovoSegmento] = useState("");
  const [saving, setSaving] = useState(false);
  const [busca, setBusca] = useState("");

  if (!canAccess) return <Navigate to="/dashboard" replace />;

  async function loadSegmentos() {
    setLoading(true);
    const { data, error } = await supabase.from("segmentos").select("*").order("nome");
    if (error) toast.error("Erro ao carregar segmentos");
    else setSegmentos((data as Segmento[]) || []);
    setLoading(false);
  }

  useEffect(() => { loadSegmentos(); }, []);

  async function handleAdd() {
    if (!novoSegmento.trim()) return;
    setSaving(true);
    const { error } = await supabase.from("segmentos").insert({ nome: novoSegmento.trim() });
    if (error) toast.error("Erro ao adicionar segmento");
    else { toast.success("Segmento adicionado"); setNovoSegmento(""); loadSegmentos(); }
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

  const filtrados = segmentos.filter(s =>
    !busca || s.nome.toLowerCase().includes(busca.toLowerCase())
  );

  const ITEMS_PER_PAGE = 15;
  const totalPages = Math.max(1, Math.ceil(filtrados.length / ITEMS_PER_PAGE));
  const paginados = filtrados.slice((currentPage - 1) * ITEMS_PER_PAGE, currentPage * ITEMS_PER_PAGE);

  useEffect(() => { setCurrentPage(1); }, [busca]);

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

        {/* Busca */}
        <div className="flex gap-3 items-center flex-wrap">
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
                <TableHead>Status</TableHead>
                <TableHead>Criado em</TableHead>
                <TableHead className="text-right">Ações</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading ? (
                <TableRow>
                  <TableCell colSpan={4} className="text-center py-12">
                    <Loader2 className="h-6 w-6 animate-spin mx-auto text-muted-foreground" />
                  </TableCell>
                </TableRow>
              ) : filtrados.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={4} className="text-center py-12 text-muted-foreground">
                    <Tag className="h-8 w-8 mx-auto mb-2 opacity-30" />
                    Nenhum segmento encontrado
                  </TableCell>
                </TableRow>
              ) : (
                paginados.map(seg => (
                  <TableRow key={seg.id}>
                    <TableCell className="font-medium">{seg.nome}</TableCell>
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
