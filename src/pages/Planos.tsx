import { useState, useEffect } from "react";
import { AppLayout } from "@/components/AppLayout";
import { supabase } from "@/integrations/supabase/client";
import { Modulo, Plano, PlanoModulo } from "@/lib/supabase-types";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
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
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { toast } from "sonner";
import { Plus, Pencil, Trash2, Link, CopyPlus, DollarSign } from "lucide-react";

// ─── Helpers ─────────────────────────────────────────────────────────────────

function fmtBRL(v: number) {
  return v.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

// ─── Shared Custo Types ─────────────────────────────────────────────────────

interface CustoForm {
  preco_fornecedor: string;
  imposto_tipo: string;
  imposto_valor: string;
  imposto_base: string;
  taxa_boleto: string;
  despesas_adicionais: string;
  despesas_adicionais_descricao: string;
}

const CUSTO_EMPTY: CustoForm = {
  preco_fornecedor: "0",
  imposto_tipo: "%",
  imposto_valor: "0",
  imposto_base: "compra",
  taxa_boleto: "0",
  despesas_adicionais: "0",
  despesas_adicionais_descricao: "",
};

function CustoFormFields({ custoForm, setCustoForm }: { custoForm: CustoForm; setCustoForm: React.Dispatch<React.SetStateAction<CustoForm>> }) {
  return (
    <>
      <div className="pt-2 border-t border-border">
        <p className="text-sm font-semibold text-foreground mb-3">Custos</p>
      </div>
      <div className="space-y-1.5">
        <Label>Preço fornecedor (R$)</Label>
        <Input type="number" min="0" step="0.01" value={custoForm.preco_fornecedor} onChange={(e) => setCustoForm((f) => ({ ...f, preco_fornecedor: e.target.value }))} />
      </div>
      <div className="space-y-2">
        <Label>Impostos</Label>
        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-1.5">
            <Label className="text-xs text-muted-foreground">Tipo</Label>
            <Select value={custoForm.imposto_tipo} onValueChange={(v) => setCustoForm((f) => ({ ...f, imposto_tipo: v }))}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="%">Percentual (%)</SelectItem>
                <SelectItem value="R$">Valor fixo (R$)</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs text-muted-foreground">Valor</Label>
            <Input type="number" min="0" step="0.01" value={custoForm.imposto_valor} onChange={(e) => setCustoForm((f) => ({ ...f, imposto_valor: e.target.value }))} />
          </div>
        </div>
        {custoForm.imposto_tipo === "%" && (
          <div className="space-y-1.5">
            <Label className="text-xs text-muted-foreground">Cálculo sobre</Label>
            <RadioGroup value={custoForm.imposto_base} onValueChange={(v) => setCustoForm((f) => ({ ...f, imposto_base: v }))}>
              <div className="flex items-center gap-2">
                <RadioGroupItem value="compra" id="base-compra" />
                <Label htmlFor="base-compra" className="font-normal">Preço de compra (fornecedor)</Label>
              </div>
              <div className="flex items-center gap-2">
                <RadioGroupItem value="venda" id="base-venda" />
                <Label htmlFor="base-venda" className="font-normal">Preço de venda</Label>
              </div>
            </RadioGroup>
          </div>
        )}
      </div>
      <div className="space-y-1.5">
        <Label>Taxa de boleto (R$)</Label>
        <Input type="number" min="0" step="0.01" value={custoForm.taxa_boleto} onChange={(e) => setCustoForm((f) => ({ ...f, taxa_boleto: e.target.value }))} />
      </div>
      <div className="space-y-1.5">
        <Label>Despesas adicionais (R$)</Label>
        <Input type="number" min="0" step="0.01" value={custoForm.despesas_adicionais} onChange={(e) => setCustoForm((f) => ({ ...f, despesas_adicionais: e.target.value }))} />
      </div>
      {(parseFloat(custoForm.despesas_adicionais) || 0) > 0 && (
        <div className="space-y-1.5">
          <Label>Discriminação das despesas *</Label>
          <Textarea value={custoForm.despesas_adicionais_descricao} onChange={(e) => setCustoForm((f) => ({ ...f, despesas_adicionais_descricao: e.target.value }))} placeholder="Descreva as despesas adicionais..." rows={2} />
        </div>
      )}
    </>
  );
}

// ─── Planos Tab ─────────────────────────────────────────────────────────────────

interface PlanoForm {
  nome: string;
  descricao: string;
  ativo: boolean;
  valor_implantacao_padrao: string;
  valor_mensalidade_padrao: string;
  fornecedor_id: string;
}

function PlanosTab() {
  const [planos, setPlanos] = useState<any[]>([]);
  const [fornecedores, setFornecedores] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<any | null>(null);
  const [form, setForm] = useState<PlanoForm>({
    nome: "", descricao: "", ativo: true,
    valor_implantacao_padrao: "0", valor_mensalidade_padrao: "0",
    fornecedor_id: "",
  });
  const [custoForm, setCustoForm] = useState<CustoForm>({ ...CUSTO_EMPTY });
  const [saving, setSaving] = useState(false);

  async function fetch() {
    setLoading(true);
    const [{ data: p }, { data: f }] = await Promise.all([
      supabase.from("planos").select("*, fornecedores(id, nome_fantasia)").order("nome"),
      supabase.from("fornecedores").select("id, nome_fantasia").eq("ativo", true).order("nome_fantasia"),
    ]);
    setPlanos(p || []);
    setFornecedores(f || []);
    setLoading(false);
  }

  useEffect(() => { fetch(); }, []);

  function openCreate() {
    setEditing(null);
    setForm({ nome: "", descricao: "", ativo: true, valor_implantacao_padrao: "0", valor_mensalidade_padrao: "0", fornecedor_id: "" });
    setCustoForm({ ...CUSTO_EMPTY });
    setDialogOpen(true);
  }

  async function openEdit(p: any) {
    setEditing(p);
    setForm({
      nome: p.nome,
      descricao: p.descricao || "",
      ativo: p.ativo,
      valor_implantacao_padrao: (p.valor_implantacao_padrao ?? 0).toString(),
      valor_mensalidade_padrao: (p.valor_mensalidade_padrao ?? 0).toString(),
      fornecedor_id: p.fornecedor_id || "",
    });
    // Load existing custos
    const { data: custo } = await supabase.from("custos").select("*").eq("plano_id", p.id).maybeSingle();
    if (custo) {
      setCustoForm({
        preco_fornecedor: (custo.preco_fornecedor ?? 0).toString(),
        imposto_tipo: custo.imposto_tipo || "%",
        imposto_valor: (custo.imposto_valor ?? 0).toString(),
        imposto_base: custo.imposto_base || "compra",
        taxa_boleto: (custo.taxa_boleto ?? 0).toString(),
        despesas_adicionais: (custo.despesas_adicionais ?? 0).toString(),
        despesas_adicionais_descricao: custo.despesas_adicionais_descricao || "",
      });
    } else {
      setCustoForm({ ...CUSTO_EMPTY });
    }
    setDialogOpen(true);
  }

  async function handleSave() {
    if (!form.nome.trim()) { toast.error("Nome é obrigatório"); return; }
    const despAdic = parseFloat(custoForm.despesas_adicionais) || 0;
    if (despAdic > 0 && !custoForm.despesas_adicionais_descricao.trim()) {
      toast.error("Descreva as despesas adicionais");
      return;
    }
    setSaving(true);
    const payload: any = {
      nome: form.nome.trim(),
      descricao: form.descricao.trim() || null,
      ativo: form.ativo,
      valor_implantacao_padrao: parseFloat(form.valor_implantacao_padrao) || 0,
      valor_mensalidade_padrao: parseFloat(form.valor_mensalidade_padrao) || 0,
      fornecedor_id: form.fornecedor_id || null,
    };
    let planoId: string;
    if (editing) {
      const { error } = await supabase.from("planos").update(payload).eq("id", editing.id);
      if (error) { toast.error("Erro ao salvar"); setSaving(false); return; }
      planoId = editing.id;
    } else {
      const { data, error } = await supabase.from("planos").insert(payload).select("id").single();
      if (error || !data) { toast.error("Erro ao criar"); setSaving(false); return; }
      planoId = data.id;
    }
    // Save custos (upsert)
    const custoPayload: any = {
      plano_id: planoId,
      preco_fornecedor: parseFloat(custoForm.preco_fornecedor) || 0,
      imposto_tipo: custoForm.imposto_tipo,
      imposto_valor: parseFloat(custoForm.imposto_valor) || 0,
      imposto_base: custoForm.imposto_base,
      taxa_boleto: parseFloat(custoForm.taxa_boleto) || 0,
      despesas_adicionais: despAdic,
      despesas_adicionais_descricao: despAdic > 0 ? custoForm.despesas_adicionais_descricao.trim() : null,
    };
    const { data: existingCusto } = await supabase.from("custos").select("id").eq("plano_id", planoId).maybeSingle();
    if (existingCusto) {
      await supabase.from("custos").update(custoPayload).eq("id", existingCusto.id);
    } else {
      await supabase.from("custos").insert(custoPayload);
    }
    toast.success(editing ? "Plano atualizado" : "Plano criado");
    setSaving(false);
    setDialogOpen(false);
    fetch();
  }

  async function handleDelete(p: any) {
    if (!confirm(`Excluir o plano "${p.nome}"?`)) return;
    const { error } = await supabase.from("planos").delete().eq("id", p.id);
    if (error) { toast.error("Erro ao excluir"); return; }
    toast.success("Plano excluído");
    fetch();
  }

  async function toggleAtivo(p: any) {
    await supabase.from("planos").update({ ativo: !p.ativo }).eq("id", p.id);
    setPlanos((prev) => prev.map((x) => x.id === p.id ? { ...x, ativo: !x.ativo } : x));
  }

  return (
    <div className="space-y-4">
      <div className="flex justify-end">
        <Button onClick={openCreate} className="gap-2"><Plus className="h-4 w-4" /> Novo plano</Button>
      </div>
      <div className="rounded-lg border border-border bg-card overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Nome</TableHead>
              <TableHead>Fornecedor</TableHead>
              <TableHead>Descrição</TableHead>
              <TableHead className="text-right">Implantação</TableHead>
              <TableHead className="text-right">Mensalidade</TableHead>
              <TableHead>Status</TableHead>
              <TableHead className="w-28">Ações</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading ? (
              <TableRow><TableCell colSpan={7} className="text-center py-10 text-muted-foreground">Carregando...</TableCell></TableRow>
            ) : planos.length === 0 ? (
              <TableRow><TableCell colSpan={7} className="text-center py-10 text-muted-foreground">Nenhum plano cadastrado</TableCell></TableRow>
            ) : planos.map((p) => (
              <TableRow key={p.id}>
                <TableCell className="font-medium">{p.nome}</TableCell>
                <TableCell className="text-sm text-muted-foreground">{p.fornecedores?.nome_fantasia || "—"}</TableCell>
                <TableCell className="text-muted-foreground text-sm">{p.descricao || "—"}</TableCell>
                <TableCell className="text-right font-mono text-sm">{fmtBRL(p.valor_implantacao_padrao ?? 0)}</TableCell>
                <TableCell className="text-right font-mono text-sm">{fmtBRL(p.valor_mensalidade_padrao ?? 0)}</TableCell>
                <TableCell><Switch checked={p.ativo} onCheckedChange={() => toggleAtivo(p)} /></TableCell>
                <TableCell>
                  <div className="flex gap-1">
                    <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => openEdit(p)}><Pencil className="h-3.5 w-3.5" /></Button>
                    <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive hover:text-destructive" onClick={() => handleDelete(p)}><Trash2 className="h-3.5 w-3.5" /></Button>
                  </div>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader><DialogTitle>{editing ? "Editar plano" : "Novo plano"}</DialogTitle></DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-1.5">
              <Label>Nome *</Label>
              <Input value={form.nome} onChange={(e) => setForm((f) => ({ ...f, nome: e.target.value }))} placeholder="Ex: Essencial, Pro, Premium" />
            </div>
            <div className="space-y-1.5">
              <Label>Fornecedor</Label>
              <Select value={form.fornecedor_id} onValueChange={(v) => setForm((f) => ({ ...f, fornecedor_id: v === "__none__" ? "" : v }))}>
                <SelectTrigger><SelectValue placeholder="Selecionar fornecedor (opcional)" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="__none__">Nenhum</SelectItem>
                  {fornecedores.map((f) => (
                    <SelectItem key={f.id} value={f.id}>{f.nome_fantasia}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label>Descrição</Label>
              <Textarea value={form.descricao} onChange={(e) => setForm((f) => ({ ...f, descricao: e.target.value }))} placeholder="Descrição opcional do plano" rows={2} />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label>Implantação padrão (R$)</Label>
                <Input
                  type="number" min="0" step="0.01"
                  value={form.valor_implantacao_padrao}
                  onChange={(e) => setForm((f) => ({ ...f, valor_implantacao_padrao: e.target.value }))}
                />
              </div>
              <div className="space-y-1.5">
                <Label>Mensalidade padrão (R$)</Label>
                <Input
                  type="number" min="0" step="0.01"
                  value={form.valor_mensalidade_padrao}
                  onChange={(e) => setForm((f) => ({ ...f, valor_mensalidade_padrao: e.target.value }))}
                />
              </div>
            </div>
            <div className="flex items-center gap-3">
              <Switch checked={form.ativo} onCheckedChange={(v) => setForm((f) => ({ ...f, ativo: v }))} />
              <Label>Plano ativo</Label>
            </div>
            <CustoFormFields custoForm={custoForm} setCustoForm={setCustoForm} />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>Cancelar</Button>
            <Button onClick={handleSave} disabled={saving}>{saving ? "Salvando..." : editing ? "Salvar" : "Criar plano"}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

// ─── Módulos Tab ─────────────────────────────────────────────────────────────────

interface ModuloForm {
  nome: string;
  ativo: boolean;
  valor_implantacao_modulo: string;
  valor_mensalidade_modulo: string;
  fornecedor_id: string;
}

function ModulosTab() {
  const [modulos, setModulos] = useState<any[]>([]);
  const [fornecedores, setFornecedores] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<any | null>(null);
  const [form, setForm] = useState<ModuloForm>({ nome: "", ativo: true, valor_implantacao_modulo: "", valor_mensalidade_modulo: "", fornecedor_id: "" });
  const [saving, setSaving] = useState(false);

  const [custoForm, setCustoForm] = useState<CustoForm>({ ...CUSTO_EMPTY });

  async function fetch() {
    setLoading(true);
    const [{ data: m }, { data: f }] = await Promise.all([
      supabase.from("modulos").select("*, fornecedores(id, nome_fantasia)").order("nome"),
      supabase.from("fornecedores").select("id, nome_fantasia").eq("ativo", true).order("nome_fantasia"),
    ]);
    setModulos(m || []);
    setFornecedores(f || []);
    setLoading(false);
  }

  useEffect(() => { fetch(); }, []);

  function openCreate() {
    setEditing(null);
    setForm({ nome: "", ativo: true, valor_implantacao_modulo: "", valor_mensalidade_modulo: "", fornecedor_id: "" });
    setCustoForm({ ...CUSTO_EMPTY });
    setDialogOpen(true);
  }

  async function openEdit(m: any) {
    setEditing(m);
    setForm({ nome: m.nome, ativo: m.ativo, valor_implantacao_modulo: m.valor_implantacao_modulo != null ? m.valor_implantacao_modulo.toString() : "", valor_mensalidade_modulo: m.valor_mensalidade_modulo != null ? m.valor_mensalidade_modulo.toString() : "", fornecedor_id: m.fornecedor_id || "" });
    const { data: custo } = await supabase.from("custos").select("*").eq("modulo_id", m.id).maybeSingle();
    setCustoForm(custo ? { preco_fornecedor: (custo.preco_fornecedor ?? 0).toString(), imposto_tipo: custo.imposto_tipo || "%", imposto_valor: (custo.imposto_valor ?? 0).toString(), imposto_base: custo.imposto_base || "compra", taxa_boleto: (custo.taxa_boleto ?? 0).toString(), despesas_adicionais: (custo.despesas_adicionais ?? 0).toString(), despesas_adicionais_descricao: custo.despesas_adicionais_descricao || "" } : { ...CUSTO_EMPTY });
    setDialogOpen(true);
  }

  async function handleSave() {
    if (!form.nome.trim()) { toast.error("Nome é obrigatório"); return; }
    const despAdic = parseFloat(custoForm.despesas_adicionais) || 0;
    if (despAdic > 0 && !custoForm.despesas_adicionais_descricao.trim()) { toast.error("Descreva as despesas adicionais"); return; }
    setSaving(true);
    const payload: any = { nome: form.nome.trim(), ativo: form.ativo, valor_implantacao_modulo: form.valor_implantacao_modulo !== "" ? parseFloat(form.valor_implantacao_modulo) : null, valor_mensalidade_modulo: form.valor_mensalidade_modulo !== "" ? parseFloat(form.valor_mensalidade_modulo) : null, fornecedor_id: form.fornecedor_id || null };
    let moduloId: string;
    if (editing) {
      const { error } = await supabase.from("modulos").update(payload).eq("id", editing.id);
      if (error) { toast.error("Erro ao salvar"); setSaving(false); return; }
      moduloId = editing.id;
    } else {
      const { data, error } = await supabase.from("modulos").insert(payload).select("id").single();
      if (error || !data) { toast.error("Erro ao criar"); setSaving(false); return; }
      moduloId = data.id;
    }
    const custoPayload: any = { modulo_id: moduloId, preco_fornecedor: parseFloat(custoForm.preco_fornecedor) || 0, imposto_tipo: custoForm.imposto_tipo, imposto_valor: parseFloat(custoForm.imposto_valor) || 0, imposto_base: custoForm.imposto_base, taxa_boleto: parseFloat(custoForm.taxa_boleto) || 0, despesas_adicionais: despAdic, despesas_adicionais_descricao: despAdic > 0 ? custoForm.despesas_adicionais_descricao.trim() : null };
    const { data: ex } = await supabase.from("custos").select("id").eq("modulo_id", moduloId).maybeSingle();
    if (ex) { await supabase.from("custos").update(custoPayload).eq("id", ex.id); }
    else { await supabase.from("custos").insert(custoPayload); }
    toast.success(editing ? "Módulo atualizado" : "Módulo criado");
    setSaving(false); setDialogOpen(false); fetch();
  }

  async function handleDelete(m: any) {
    if (!confirm(`Excluir o módulo "${m.nome}"?`)) return;
    const { error } = await supabase.from("modulos").delete().eq("id", m.id);
    if (error) { toast.error("Erro ao excluir"); return; }
    toast.success("Módulo excluído"); fetch();
  }

  async function toggleAtivo(m: any) {
    await supabase.from("modulos").update({ ativo: !m.ativo }).eq("id", m.id);
    setModulos((prev) => prev.map((x) => x.id === m.id ? { ...x, ativo: !x.ativo } : x));
  }

  return (
    <div className="space-y-4">
      <div className="flex justify-end">
        <Button onClick={openCreate} className="gap-2"><Plus className="h-4 w-4" /> Novo módulo</Button>
      </div>
      <div className="rounded-lg border border-border bg-card overflow-hidden">
        <Table>
          <TableHeader><TableRow><TableHead>Nome</TableHead><TableHead>Fornecedor</TableHead><TableHead className="text-right">Implantação</TableHead><TableHead className="text-right">Mensalidade</TableHead><TableHead>Status</TableHead><TableHead className="w-28">Ações</TableHead></TableRow></TableHeader>
          <TableBody>
            {loading ? (<TableRow><TableCell colSpan={6} className="text-center py-10 text-muted-foreground">Carregando...</TableCell></TableRow>
            ) : modulos.length === 0 ? (<TableRow><TableCell colSpan={6} className="text-center py-10 text-muted-foreground">Nenhum módulo cadastrado</TableCell></TableRow>
            ) : modulos.map((m) => (
              <TableRow key={m.id}>
                <TableCell className="font-medium">{m.nome}</TableCell>
                <TableCell className="text-sm text-muted-foreground">{m.fornecedores?.nome_fantasia || "—"}</TableCell>
                <TableCell className="text-right font-mono text-sm text-muted-foreground">{m.valor_implantacao_modulo != null ? fmtBRL(m.valor_implantacao_modulo) : "—"}</TableCell>
                <TableCell className="text-right font-mono text-sm text-muted-foreground">{m.valor_mensalidade_modulo != null ? fmtBRL(m.valor_mensalidade_modulo) : "—"}</TableCell>
                <TableCell><Switch checked={m.ativo} onCheckedChange={() => toggleAtivo(m)} /></TableCell>
                <TableCell><div className="flex gap-1"><Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => openEdit(m)}><Pencil className="h-3.5 w-3.5" /></Button><Button variant="ghost" size="icon" className="h-8 w-8 text-destructive hover:text-destructive" onClick={() => handleDelete(m)}><Trash2 className="h-3.5 w-3.5" /></Button></div></TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader><DialogTitle>{editing ? "Editar módulo" : "Novo módulo"}</DialogTitle></DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-1.5"><Label>Nome *</Label><Input value={form.nome} onChange={(e) => setForm((f) => ({ ...f, nome: e.target.value }))} placeholder="Ex: PDV, iFood, Gestão Estoque" /></div>
            <div className="space-y-1.5"><Label>Fornecedor</Label><Select value={form.fornecedor_id} onValueChange={(v) => setForm((f) => ({ ...f, fornecedor_id: v === "__none__" ? "" : v }))}><SelectTrigger><SelectValue placeholder="Selecionar fornecedor (opcional)" /></SelectTrigger><SelectContent><SelectItem value="__none__">Nenhum</SelectItem>{fornecedores.map((f) => (<SelectItem key={f.id} value={f.id}>{f.nome_fantasia}</SelectItem>))}</SelectContent></Select></div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5"><Label>Implantação (R$)</Label><Input type="number" min="0" step="0.01" value={form.valor_implantacao_modulo} onChange={(e) => setForm((f) => ({ ...f, valor_implantacao_modulo: e.target.value }))} placeholder="Opcional" /></div>
              <div className="space-y-1.5"><Label>Mensalidade (R$)</Label><Input type="number" min="0" step="0.01" value={form.valor_mensalidade_modulo} onChange={(e) => setForm((f) => ({ ...f, valor_mensalidade_modulo: e.target.value }))} placeholder="Opcional" /></div>
            </div>
            <div className="flex items-center gap-3"><Switch checked={form.ativo} onCheckedChange={(v) => setForm((f) => ({ ...f, ativo: v }))} /><Label>Módulo ativo</Label></div>
            <CustoFormFields custoForm={custoForm} setCustoForm={setCustoForm} />
          </div>
          <DialogFooter><Button variant="outline" onClick={() => setDialogOpen(false)}>Cancelar</Button><Button onClick={handleSave} disabled={saving}>{saving ? "Salvando..." : editing ? "Salvar" : "Criar módulo"}</Button></DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

// ─── Vínculos Tab ─────────────────────────────────────────────────────────────────

function VinculosTab() {
  const [planos, setPlanos] = useState<any[]>([]);
  const [modulos, setModulos] = useState<any[]>([]);
  const [selectedPlano, setSelectedPlano] = useState("");
  const [vinculos, setVinculos] = useState<any[]>([]);
  const [loadingVinculos, setLoadingVinculos] = useState(false);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingVinculo, setEditingVinculo] = useState<any | null>(null);
  const [addingAll, setAddingAll] = useState(false);
  const [form, setForm] = useState({
    modulo_id: "",
    inclui_treinamento: false,
    ordem: 0,
    duracao_minutos: "",
    obrigatorio: false,
    incluso_no_plano: true,
  });
  const [saving, setSaving] = useState(false);

  async function fetchBase() {
    const [{ data: p }, { data: m }] = await Promise.all([
      supabase.from("planos").select("*").eq("ativo", true).order("nome"),
      supabase.from("modulos").select("*").eq("ativo", true).order("nome"),
    ]);
    setPlanos(p || []);
    setModulos(m || []);
  }

  async function fetchVinculos(planoId: string) {
    setLoadingVinculos(true);
    const { data } = await supabase
      .from("plano_modulos")
      .select("*, modulo:modulos(*)")
      .eq("plano_id", planoId)
      .order("ordem");
    setVinculos(data || []);
    setLoadingVinculos(false);
  }

  useEffect(() => { fetchBase(); }, []);

  useEffect(() => {
    if (selectedPlano) fetchVinculos(selectedPlano);
    else setVinculos([]);
  }, [selectedPlano]);

  const modulosVinculados = new Set(vinculos.map((v) => v.modulo_id));
  const modulosDisponiveis = modulos.filter((m) => !modulosVinculados.has(m.id));

  function openCreate() {
    setEditingVinculo(null);
    setForm({ modulo_id: "", inclui_treinamento: false, ordem: vinculos.length, duracao_minutos: "", obrigatorio: false, incluso_no_plano: true });
    setDialogOpen(true);
  }

  function openEdit(v: any) {
    setEditingVinculo(v);
    setForm({
      modulo_id: v.modulo_id,
      inclui_treinamento: v.inclui_treinamento,
      ordem: v.ordem,
      duracao_minutos: v.duracao_minutos != null ? v.duracao_minutos.toString() : "",
      obrigatorio: v.obrigatorio,
      incluso_no_plano: v.incluso_no_plano,
    });
    setDialogOpen(true);
  }

  async function handleSalvar() {
    setSaving(true);
    const payload = {
      inclui_treinamento: form.inclui_treinamento,
      ordem: Number(form.ordem) || 0,
      duracao_minutos: form.duracao_minutos ? Number(form.duracao_minutos) : null,
      obrigatorio: form.obrigatorio,
      incluso_no_plano: form.incluso_no_plano,
    };

    if (editingVinculo) {
      const { error } = await supabase.from("plano_modulos").update(payload).eq("id", editingVinculo.id);
      if (error) { toast.error("Erro ao salvar vínculo"); setSaving(false); return; }
      toast.success("Vínculo atualizado");
    } else {
      if (!form.modulo_id) { toast.error("Selecione um módulo"); setSaving(false); return; }
      const { error } = await supabase.from("plano_modulos").insert({
        plano_id: selectedPlano,
        modulo_id: form.modulo_id,
        ...payload,
      });
      if (error) { toast.error("Erro ao vincular módulo"); setSaving(false); return; }
      toast.success("Módulo vinculado ao plano");
    }

    setSaving(false);
    setDialogOpen(false);
    setEditingVinculo(null);
    setForm({ modulo_id: "", inclui_treinamento: false, ordem: 0, duracao_minutos: "", obrigatorio: false, incluso_no_plano: true });
    fetchVinculos(selectedPlano);
  }

  async function handleAdicionarTodos() {
    if (modulosDisponiveis.length === 0) { toast.info("Todos os módulos já estão vinculados"); return; }
    if (!confirm(`Adicionar todos os ${modulosDisponiveis.length} módulos disponíveis a este plano?`)) return;
    setAddingAll(true);
    const inserts = modulosDisponiveis.map((m, i) => ({
      plano_id: selectedPlano,
      modulo_id: m.id,
      inclui_treinamento: false,
      ordem: vinculos.length + i,
      duracao_minutos: null,
      obrigatorio: false,
      incluso_no_plano: true,
    }));
    const { error } = await supabase.from("plano_modulos").insert(inserts);
    if (error) { toast.error("Erro ao adicionar módulos"); setAddingAll(false); return; }
    toast.success(`${inserts.length} módulos adicionados ao plano`);
    setAddingAll(false);
    fetchVinculos(selectedPlano);
  }

  async function handleRemover(v: any) {
    if (!confirm(`Remover "${v.modulo?.nome}" deste plano?`)) return;
    const { error } = await supabase.from("plano_modulos").delete().eq("id", v.id);
    if (error) { toast.error("Erro ao remover"); return; }
    toast.success("Módulo removido do plano");
    fetchVinculos(selectedPlano);
  }

  return (
    <div className="space-y-4">
      <div className="flex items-end gap-4 flex-wrap">
        <div className="flex-1 max-w-xs space-y-1">
          <Label>Selecionar plano</Label>
          <Select value={selectedPlano} onValueChange={setSelectedPlano}>
            <SelectTrigger>
              <SelectValue placeholder="Escolha um plano..." />
            </SelectTrigger>
            <SelectContent>
              {planos.map((p) => (
                <SelectItem key={p.id} value={p.id}>{p.nome}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        {selectedPlano && (
          <div className="flex gap-2">
            <Button
              variant="outline"
              onClick={handleAdicionarTodos}
              disabled={addingAll || modulosDisponiveis.length === 0}
              className="gap-2"
            >
              <CopyPlus className="h-4 w-4" />
              {addingAll ? "Adicionando..." : `Adicionar todos (${modulosDisponiveis.length})`}
            </Button>
            <Button onClick={openCreate} className="gap-2" disabled={modulosDisponiveis.length === 0}>
              <Link className="h-4 w-4" /> Adicionar módulo
            </Button>
          </div>
        )}
      </div>

      {selectedPlano && (
        <div className="rounded-lg border border-border bg-card overflow-hidden">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-12">Ordem</TableHead>
                <TableHead>Módulo</TableHead>
                <TableHead>Incluso no plano</TableHead>
                <TableHead>Treinamento</TableHead>
                <TableHead>Duração</TableHead>
                <TableHead>Obrigatório</TableHead>
                <TableHead className="w-24">Ações</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loadingVinculos ? (
                <TableRow><TableCell colSpan={7} className="text-center py-8 text-muted-foreground">Carregando...</TableCell></TableRow>
              ) : vinculos.length === 0 ? (
                <TableRow><TableCell colSpan={7} className="text-center py-8 text-muted-foreground">Nenhum módulo vinculado a este plano</TableCell></TableRow>
              ) : vinculos.map((v) => (
                <TableRow key={v.id}>
                  <TableCell className="text-center text-muted-foreground">{v.ordem}</TableCell>
                  <TableCell className="font-medium">{v.modulo?.nome}</TableCell>
                  <TableCell>
                    <Badge variant={v.incluso_no_plano ? "default" : "secondary"}>
                      {v.incluso_no_plano ? "Incluso" : "Opcional"}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <Badge variant={v.inclui_treinamento ? "default" : "secondary"}>
                      {v.inclui_treinamento ? "Sim" : "Não"}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-sm text-muted-foreground">
                    {v.duracao_minutos ? `${v.duracao_minutos} min` : "—"}
                  </TableCell>
                  <TableCell>
                    <Badge variant={v.obrigatorio ? "default" : "outline"}>
                      {v.obrigatorio ? "Obrigatório" : "Opcional"}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <div className="flex gap-1">
                      <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => openEdit(v)}>
                        <Pencil className="h-3.5 w-3.5" />
                      </Button>
                      <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive hover:text-destructive" onClick={() => handleRemover(v)}>
                        <Trash2 className="h-3.5 w-3.5" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}

      <Dialog open={dialogOpen} onOpenChange={(o) => { setDialogOpen(o); if (!o) setEditingVinculo(null); }}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>{editingVinculo ? `Editar vínculo: ${editingVinculo.modulo?.nome}` : "Vincular módulo ao plano"}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            {!editingVinculo && (
              <div className="space-y-1.5">
                <Label>Módulo *</Label>
                <Select value={form.modulo_id} onValueChange={(v) => setForm((f) => ({ ...f, modulo_id: v }))}>
                  <SelectTrigger><SelectValue placeholder="Selecionar módulo" /></SelectTrigger>
                  <SelectContent>
                    {modulosDisponiveis.map((m) => (
                      <SelectItem key={m.id} value={m.id}>{m.nome}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label>Ordem</Label>
                <Input type="number" min={0} value={form.ordem} onChange={(e) => setForm((f) => ({ ...f, ordem: Number(e.target.value) }))} />
              </div>
              <div className="space-y-1.5">
                <Label>Duração (minutos)</Label>
                <Input type="number" min={0} value={form.duracao_minutos} onChange={(e) => setForm((f) => ({ ...f, duracao_minutos: e.target.value }))} placeholder="Opcional" />
              </div>
            </div>
            <div className="flex items-center gap-3">
              <Switch checked={form.incluso_no_plano} onCheckedChange={(v) => setForm((f) => ({ ...f, incluso_no_plano: v }))} />
              <Label>Incluso no plano (desmarcado = módulo opcional/adicional)</Label>
            </div>
            <div className="flex items-center gap-3">
              <Switch checked={form.inclui_treinamento} onCheckedChange={(v) => setForm((f) => ({ ...f, inclui_treinamento: v }))} />
              <Label>Inclui treinamento</Label>
            </div>
            <div className="flex items-center gap-3">
              <Switch checked={form.obrigatorio} onCheckedChange={(v) => setForm((f) => ({ ...f, obrigatorio: v }))} />
              <Label>Módulo obrigatório</Label>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => { setDialogOpen(false); setEditingVinculo(null); }}>Cancelar</Button>
            <Button onClick={handleSalvar} disabled={saving}>
              {saving ? "Salvando..." : editingVinculo ? "Salvar alterações" : "Vincular módulo"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}




// ─── Page ─────────────────────────────────────────────────────────────────────

export default function Planos() {
  return (
    <AppLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Planos e Módulos</h1>
          <p className="text-muted-foreground text-sm mt-1">Gerencie planos de serviço, módulos disponíveis e seus vínculos</p>
        </div>
        <Tabs defaultValue="planos">
          <TabsList>
            <TabsTrigger value="planos">Planos</TabsTrigger>
            <TabsTrigger value="modulos">Módulos</TabsTrigger>
            <TabsTrigger value="vinculos">Vínculos</TabsTrigger>
          </TabsList>
          <TabsContent value="planos" className="mt-4"><PlanosTab /></TabsContent>
          <TabsContent value="modulos" className="mt-4"><ModulosTab /></TabsContent>
          <TabsContent value="vinculos" className="mt-4"><VinculosTab /></TabsContent>
        </Tabs>
      </div>
    </AppLayout>
  );
}
