import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Plus, Trash2, MapPin } from "lucide-react";
import { toast } from "sonner";

interface PrecoFilial {
  id?: string;
  filial_id: string;
  filial_nome?: string;
  valor_implantacao: number;
  valor_mensalidade: number;
}

interface PrecosFilialSectionProps {
  tipo: "plano" | "modulo";
  referenciaId: string | null;
  /** Whether to show implantação field */
  showImplantacao?: boolean;
}

function fmtBRL(v: number) {
  return v.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

export function PrecosFilialSection({ tipo, referenciaId, showImplantacao = true }: PrecosFilialSectionProps) {
  const [filiais, setFiliais] = useState<{ id: string; nome: string }[]>([]);
  const [precos, setPrecos] = useState<PrecoFilial[]>([]);
  const [loading, setLoading] = useState(false);
  const [addFilialId, setAddFilialId] = useState("");
  const [addImplantacao, setAddImplantacao] = useState("0");
  const [addMensalidade, setAddMensalidade] = useState("0");
  const [saving, setSaving] = useState(false);

  async function fetchData() {
    if (!referenciaId) return;
    setLoading(true);
    const [{ data: filiaisData }, { data: precosData }] = await Promise.all([
      supabase.from("filiais").select("id, nome").eq("ativa", true).order("nome"),
      supabase.from("precos_filial").select("*").eq("tipo", tipo).eq("referencia_id", referenciaId),
    ]);
    setFiliais(filiaisData || []);
    const mapped = (precosData || []).map((p: any) => {
      const filial = (filiaisData || []).find((f: any) => f.id === p.filial_id);
      return {
        id: p.id,
        filial_id: p.filial_id,
        filial_nome: filial?.nome || "—",
        valor_implantacao: p.valor_implantacao,
        valor_mensalidade: p.valor_mensalidade,
      };
    });
    setPrecos(mapped);
    setLoading(false);
  }

  useEffect(() => {
    fetchData();
  }, [referenciaId, tipo]);

  const filiaisUsadas = new Set(precos.map((p) => p.filial_id));
  const filiaisDisponiveis = filiais.filter((f) => !filiaisUsadas.has(f.id));

  async function handleAdicionar() {
    if (!addFilialId || !referenciaId) {
      toast.error("Selecione uma filial");
      return;
    }
    setSaving(true);
    const { error } = await supabase.from("precos_filial").insert({
      tipo,
      referencia_id: referenciaId,
      filial_id: addFilialId,
      valor_implantacao: parseFloat(addImplantacao) || 0,
      valor_mensalidade: parseFloat(addMensalidade) || 0,
    });
    if (error) {
      toast.error("Erro ao adicionar preço por filial");
      setSaving(false);
      return;
    }
    toast.success("Preço por filial adicionado");
    setAddFilialId("");
    setAddImplantacao("0");
    setAddMensalidade("0");
    setSaving(false);
    fetchData();
  }

  async function handleRemover(id: string) {
    const { error } = await supabase.from("precos_filial").delete().eq("id", id);
    if (error) {
      toast.error("Erro ao remover");
      return;
    }
    toast.success("Preço removido");
    fetchData();
  }

  if (!referenciaId) {
    return (
      <div className="pt-2 border-t border-border">
        <div className="flex items-center gap-2 mb-2">
          <MapPin className="h-4 w-4 text-primary" />
          <p className="text-sm font-semibold text-foreground">Preços por Filial</p>
        </div>
        <p className="text-xs text-muted-foreground">Salve primeiro para configurar preços por filial.</p>
      </div>
    );
  }

  return (
    <div className="pt-2 border-t border-border space-y-3">
      <div className="flex items-center gap-2">
        <MapPin className="h-4 w-4 text-primary" />
        <p className="text-sm font-semibold text-foreground">Preços por Filial</p>
      </div>
      <p className="text-xs text-muted-foreground">
        Defina preços diferenciados por filial. Se não definido, será usado o preço padrão.
      </p>

      {/* Add new */}
      <div className="flex items-end gap-2 flex-wrap">
        <div className="space-y-1 flex-1 min-w-[140px]">
          <Label className="text-xs">Filial</Label>
          <Select value={addFilialId} onValueChange={setAddFilialId}>
            <SelectTrigger className="h-9">
              <SelectValue placeholder="Selecionar filial" />
            </SelectTrigger>
            <SelectContent>
              {filiaisDisponiveis.map((f) => (
                <SelectItem key={f.id} value={f.id}>{f.nome}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        {showImplantacao && (
          <div className="space-y-1 w-28">
            <Label className="text-xs">Implantação</Label>
            <Input
              type="number"
              min="0"
              step="0.01"
              value={addImplantacao}
              onChange={(e) => setAddImplantacao(e.target.value)}
              className="h-9"
            />
          </div>
        )}
        <div className="space-y-1 w-28">
          <Label className="text-xs">Mensalidade</Label>
          <Input
            type="number"
            min="0"
            step="0.01"
            value={addMensalidade}
            onChange={(e) => setAddMensalidade(e.target.value)}
            className="h-9"
          />
        </div>
        <Button
          size="sm"
          onClick={handleAdicionar}
          disabled={!addFilialId || saving || filiaisDisponiveis.length === 0}
          className="h-9 gap-1"
        >
          <Plus className="h-3.5 w-3.5" />
          Incluir
        </Button>
      </div>

      {/* List */}
      {loading ? (
        <p className="text-xs text-muted-foreground">Carregando...</p>
      ) : precos.length > 0 ? (
        <div className="rounded-md border border-border overflow-hidden">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="text-xs">Filial</TableHead>
                {showImplantacao && <TableHead className="text-xs text-right">Implantação</TableHead>}
                <TableHead className="text-xs text-right">Mensalidade</TableHead>
                <TableHead className="text-xs w-12"></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {precos.map((p) => (
                <TableRow key={p.id}>
                  <TableCell className="text-sm font-medium py-2">{p.filial_nome}</TableCell>
                  {showImplantacao && (
                    <TableCell className="text-sm text-right font-mono py-2">{fmtBRL(p.valor_implantacao)}</TableCell>
                  )}
                  <TableCell className="text-sm text-right font-mono py-2">{fmtBRL(p.valor_mensalidade)}</TableCell>
                  <TableCell className="py-2">
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-7 w-7 text-destructive hover:text-destructive"
                      onClick={() => p.id && handleRemover(p.id)}
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      ) : null}
    </div>
  );
}
