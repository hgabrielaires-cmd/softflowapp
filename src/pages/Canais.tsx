import { useState, useEffect } from "react";
import { TablePagination } from "@/components/TablePagination";
import { supabase } from "@/integrations/supabase/client";
import { AppLayout } from "@/components/AppLayout";
import { useAuth } from "@/context/AuthContext";
import { useCrudPermissions } from "@/hooks/useCrudPermissions";
import { useUserFiliais } from "@/hooks/useUserFiliais";
import { Navigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import { Plus, Loader2, Share2, Trash2, Search } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";

interface Canal {
  id: string;
  nome: string;
  filial_id: string | null;
  ativo: boolean;
  created_at: string;
}

export default function Canais() {
  const { isAdmin, roles } = useAuth();
  const { canIncluir: crudIncluir, canEditar: crudEditar } = useCrudPermissions("canais", roles);
  const canAccess = isAdmin || crudIncluir || crudEditar;
  const { filiaisDoUsuario, filialPadraoId } = useUserFiliais();
  const [canais, setCanais] = useState<Canal[]>([]);
  const [currentPage, setCurrentPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [novo, setNovo] = useState("");
  const [novoFilialId, setNovoFilialId] = useState<string>("");
  const [saving, setSaving] = useState(false);
  const [busca, setBusca] = useState("");
  const [filtroFilial, setFiltroFilial] = useState<string>("todas");

  if (!canAccess) return <Navigate to="/dashboard" replace />;

  async function load() {
    setLoading(true);
    const { data, error } = await supabase.from("crm_canais").select("*").order("nome");
    if (error) toast.error("Erro ao carregar canais");
    else setCanais((data as Canal[]) || []);
    setLoading(false);
  }

  useEffect(() => { load(); }, []);
  useEffect(() => { if (!novoFilialId && filialPadraoId) setNovoFilialId(filialPadraoId); }, [filialPadraoId]);

  async function handleAdd() {
    if (!novo.trim()) return;
    setSaving(true);
    const { error } = await supabase.from("crm_canais").insert({
      nome: novo.trim(),
      filial_id: novoFilialId || null,
    });
    if (error) toast.error("Erro ao adicionar canal");
    else { toast.success("Canal adicionado"); setNovo(""); load(); }
    setSaving(false);
  }

  async function toggleAtivo(c: Canal) {
    await supabase.from("crm_canais").update({ ativo: !c.ativo }).eq("id", c.id);
    load();
  }

  async function handleDelete(id: string) {
    const { error } = await supabase.from("crm_canais").delete().eq("id", id);
    if (error) toast.error("Erro ao remover canal. Pode estar vinculado a oportunidades.");
    else { toast.success("Canal removido"); load(); }
  }

  const nomeFilial = (id: string | null) =>
    filiaisDoUsuario.find(f => f.id === id)?.nome || "—";

  const filtrados = canais.filter(c =>
    (!busca || c.nome.toLowerCase().includes(busca.toLowerCase())) &&
    (filtroFilial === "todas" || c.filial_id === filtroFilial)
  );

  const ITEMS_PER_PAGE = 15;
  const totalPages = Math.max(1, Math.ceil(filtrados.length / ITEMS_PER_PAGE));
  const paginados = filtrados.slice((currentPage - 1) * ITEMS_PER_PAGE, currentPage * ITEMS_PER_PAGE);

  useEffect(() => { setCurrentPage(1); }, [busca, filtroFilial]);

  return (
    <AppLayout>
      <div className="space-y-5">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Canais</h1>
          <p className="text-sm text-muted-foreground">Gerencie os canais de origem para o CRM</p>
        </div>

        {/* Adicionar */}
        <div className="bg-card rounded-xl border border-border shadow-card p-4 space-y-3">
          <h3 className="text-sm font-semibold text-foreground flex items-center gap-2">
            <Share2 className="h-4 w-4 text-primary" />
            Novo Canal
          </h3>
          <div className="flex gap-2 items-end flex-wrap">
            <div className="flex-1 min-w-[200px]">
              <Input
                placeholder="Nome do canal..."
                value={novo}
                onChange={e => setNovo(e.target.value)}
                onKeyDown={e => { if (e.key === "Enter") { e.preventDefault(); handleAdd(); } }}
              />
            </div>
            <div className="min-w-[200px]">
              <Select value={novoFilialId} onValueChange={setNovoFilialId}>
                <SelectTrigger><SelectValue placeholder="Filial" /></SelectTrigger>
                <SelectContent>
                  {filiaisDoUsuario.map(f => (
                    <SelectItem key={f.id} value={f.id}>{f.nome}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <Button onClick={handleAdd} disabled={saving || !novo.trim()} className="gap-2">
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
              placeholder="Buscar canal..."
              value={busca}
              onChange={e => setBusca(e.target.value)}
              className="pl-9"
            />
          </div>
          <div className="w-56">
            <Select value={filtroFilial} onValueChange={setFiltroFilial}>
              <SelectTrigger><SelectValue placeholder="Filial" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="todas">Todas as filiais</SelectItem>
                {filiaisDoUsuario.map(f => (
                  <SelectItem key={f.id} value={f.id}>{f.nome}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        {/* Tabela */}
        <div className="bg-card rounded-xl border border-border shadow-card overflow-hidden">
          <Table>
            <TableHeader>
              <TableRow className="bg-muted/50">
                <TableHead>Canal</TableHead>
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
                    <Share2 className="h-8 w-8 mx-auto mb-2 opacity-30" />
                    Nenhum canal encontrado
                  </TableCell>
                </TableRow>
              ) : (
                paginados.map(c => (
                  <TableRow key={c.id}>
                    <TableCell className="font-medium">{c.nome}</TableCell>
                    <TableCell className="text-sm text-muted-foreground">{nomeFilial(c.filial_id)}</TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <Switch checked={c.ativo} onCheckedChange={() => toggleAtivo(c)} />
                        <Badge variant={c.ativo ? "default" : "secondary"} className="text-xs">
                          {c.ativo ? "Ativo" : "Inativo"}
                        </Badge>
                      </div>
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground">
                      {new Date(c.created_at).toLocaleDateString("pt-BR")}
                    </TableCell>
                    <TableCell className="text-right">
                      <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive hover:text-destructive" onClick={() => handleDelete(c.id)}>
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
                <Share2 className="h-3.5 w-3.5" />
                {filtrados.length} canal(is)
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
