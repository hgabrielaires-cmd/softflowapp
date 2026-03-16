import { useState, useEffect } from "react";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import { Plus, Pencil, Loader2, MapPin, AlertCircle, Users, Star, Trash2, Info } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/context/AuthContext";
import { useUserFiliais } from "@/hooks/useUserFiliais";
import { applyPhoneMask } from "@/lib/utils";

const UF_LIST = [
  "AC","AL","AP","AM","BA","CE","DF","ES","GO","MA","MT","MS","MG",
  "PA","PB","PR","PE","PI","RJ","RN","RS","RO","RR","SC","SP","SE","TO",
];

interface ContatoInline {
  _id?: string;
  nome: string;
  cargo: string;
  telefone: string;
  email: string;
  decisor: boolean;
  ativo: boolean;
}

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  oportunidadeId: string;
  oportunidadeTitulo: string;
  onSaved: (clienteId: string, clienteNome: string) => void;
  /** If editing an existing client */
  editingClienteId?: string | null;
}

export function GanhoClienteDrawer({ open, onOpenChange, oportunidadeId, oportunidadeTitulo, onSaved, editingClienteId }: Props) {
  const { profile, isAdmin } = useAuth();
  const { filiaisDoUsuario, filialPadraoId } = useUserFiliais();

  const [form, setForm] = useState({
    nome_fantasia: "", razao_social: "", apelido: "", cnpj_cpf: "",
    inscricao_estadual: "", ie_isento: false, responsavel_nome: "",
    contato_nome: "", telefone: "", email: "", cidade: "", uf: "",
    cep: "", logradouro: "", numero: "", complemento: "", bairro: "",
    filial_id: "", ativo: true,
  });
  const [contatos, setContatos] = useState<ContatoInline[]>([]);
  const [showContatoForm, setShowContatoForm] = useState(false);
  const [editingIdx, setEditingIdx] = useState<number | null>(null);
  const [inlineForm, setInlineForm] = useState<ContatoInline>({ nome: "", cargo: "", telefone: "", email: "", decisor: false, ativo: true });
  const [saving, setSaving] = useState(false);
  const [loadingCep, setLoadingCep] = useState(false);
  const [loadingCnpj, setLoadingCnpj] = useState(false);
  const [cepError, setCepError] = useState("");
  const [cnpjError, setCnpjError] = useState("");

  // Pre-fill from oportunidade on open
  useEffect(() => {
    if (!open) return;
    if (editingClienteId) {
      loadExistingCliente(editingClienteId);
      return;
    }
    const defaultFilial = filialPadraoId || profile?.filial_id || "";
    setForm(f => ({
      ...f, nome_fantasia: oportunidadeTitulo, apelido: oportunidadeTitulo,
      filial_id: defaultFilial, razao_social: "", cnpj_cpf: "", inscricao_estadual: "",
      ie_isento: false, responsavel_nome: "", contato_nome: "", telefone: "", email: "",
      cidade: "", uf: "", cep: "", logradouro: "", numero: "", complemento: "", bairro: "", ativo: true,
    }));
    loadContatosFromOportunidade();
  }, [open, oportunidadeId, editingClienteId]);

  async function loadExistingCliente(clienteId: string) {
    const { data: c } = await supabase.from("clientes").select("*").eq("id", clienteId).single();
    if (!c) return;
    setForm({
      nome_fantasia: c.nome_fantasia, razao_social: c.razao_social || "",
      apelido: (c as any).apelido || "", cnpj_cpf: c.cnpj_cpf,
      inscricao_estadual: (c as any).inscricao_estadual === "ISENTO" ? "" : ((c as any).inscricao_estadual || ""),
      ie_isento: (c as any).inscricao_estadual === "ISENTO",
      responsavel_nome: (c as any).responsavel_nome || "",
      contato_nome: c.contato_nome || "", telefone: c.telefone || "", email: c.email || "",
      cidade: c.cidade || "", uf: c.uf || "", cep: (c as any).cep || "",
      logradouro: (c as any).logradouro || "", numero: (c as any).numero || "",
      complemento: (c as any).complemento || "", bairro: (c as any).bairro || "",
      filial_id: c.filial_id || "", ativo: c.ativo,
    });
    const { data: cts } = await supabase.from("cliente_contatos").select("*").eq("cliente_id", clienteId);
    setContatos((cts || []).map(ct => ({
      _id: ct.id, nome: ct.nome, cargo: ct.cargo || "", telefone: ct.telefone || "",
      email: ct.email || "", decisor: ct.decisor, ativo: ct.ativo,
    })));
  }

  async function loadContatosFromOportunidade() {
    const { data } = await supabase.from("crm_oportunidade_contatos")
      .select("nome, telefone, email").eq("oportunidade_id", oportunidadeId);
    if (data && data.length > 0) {
      const imported: ContatoInline[] = data.map((c, i) => ({
        nome: c.nome, cargo: "", telefone: c.telefone || "", email: c.email || "",
        decisor: i === 0, ativo: true,
      }));
      setContatos(imported);
      setForm(f => ({ ...f, responsavel_nome: data[0]?.nome || "" }));
    } else {
      setContatos([]);
    }
  }

  async function handleCepBlur() {
    const cep = form.cep.replace(/\D/g, "");
    if (cep.length !== 8) return;
    setCepError(""); setLoadingCep(true);
    try {
      const res = await fetch(`https://viacep.com.br/ws/${cep}/json/`);
      const data = await res.json();
      if (data.erro) { setCepError("CEP não encontrado"); }
      else { setForm(f => ({ ...f, logradouro: f.logradouro || data.logradouro || "", bairro: f.bairro || data.bairro || "", cidade: f.cidade || data.localidade || "", uf: f.uf || data.uf || "" })); }
    } catch { setCepError("Erro ao consultar CEP"); }
    finally { setLoadingCep(false); }
  }

  async function handleCnpjBlur() {
    const cnpj = form.cnpj_cpf.replace(/\D/g, "");
    if (cnpj.length !== 14) return;
    setCnpjError(""); setLoadingCnpj(true);
    try {
      const res = await fetch(`https://brasilapi.com.br/api/cnpj/v1/${cnpj}`);
      if (!res.ok) { setCnpjError("CNPJ não encontrado"); }
      else {
        const data = await res.json();
        setForm(f => ({
          ...f, razao_social: f.razao_social || data.razao_social || "",
          nome_fantasia: f.nome_fantasia || data.nome_fantasia || "",
          email: f.email || data.email || "", cidade: f.cidade || data.municipio || "",
          uf: f.uf || data.uf || "", logradouro: f.logradouro || `${data.tipo_logradouro || ""} ${data.logradouro || ""}`.trim(),
          bairro: f.bairro || data.bairro || "", cep: f.cep || (data.cep ? data.cep.replace(/\D/g, "") : ""),
        }));
      }
    } catch { setCnpjError("CNPJ não encontrado"); }
    finally { setLoadingCnpj(false); }
  }

  function saveInlineContato() {
    if (!inlineForm.nome.trim()) { toast.error("Nome do contato é obrigatório"); return; }
    if (!inlineForm.email?.trim()) { toast.error("E-mail do contato é obrigatório"); return; }
    if (!inlineForm.cargo?.trim()) { toast.error("Cargo do contato é obrigatório"); return; }
    if (editingIdx !== null) {
      setContatos(prev => prev.map((c, i) => i === editingIdx ? { ...c, ...inlineForm, _id: c._id } : c));
    } else {
      setContatos(prev => [...(inlineForm.decisor ? prev.map(c => ({ ...c, decisor: false })) : prev), { ...inlineForm }]);
    }
    setShowContatoForm(false); setEditingIdx(null);
    setInlineForm({ nome: "", cargo: "", telefone: "", email: "", decisor: false, ativo: true });
  }

  async function handleSave() {
    if (loadingCep || loadingCnpj) return;
    if (!form.nome_fantasia.trim() || !form.cnpj_cpf.trim() || !form.razao_social.trim()) {
      toast.error("Nome fantasia, Razão social e CNPJ/CPF são obrigatórios"); return;
    }
    if (!form.responsavel_nome.trim()) { toast.error("Nome do responsável é obrigatório"); return; }
    if (!form.ie_isento && !form.inscricao_estadual.trim()) {
      toast.error("Inscrição Estadual é obrigatória. Se não possuir, marque 'Isento de IE'."); return;
    }
    if (contatos.length === 0) { toast.error("Cadastre pelo menos um contato"); return; }
    const invalid = contatos.find(c => !c.email?.trim() || !c.cargo?.trim());
    if (invalid) { toast.error("Todos os contatos devem ter E-mail e Cargo"); return; }

    setSaving(true);
    const payload: any = {
      nome_fantasia: form.nome_fantasia.trim(), razao_social: form.razao_social.trim(),
      apelido: form.apelido.trim() || null, cnpj_cpf: form.cnpj_cpf.trim(),
      inscricao_estadual: form.ie_isento ? "ISENTO" : (form.inscricao_estadual.trim() || null),
      responsavel_nome: form.responsavel_nome.trim() || null,
      contato_nome: contatos[0]?.nome || null, telefone: contatos[0]?.telefone || null,
      email: contatos[0]?.email || null, cidade: form.cidade.trim() || null,
      uf: form.uf || null, cep: form.cep.replace(/\D/g, "") || null,
      logradouro: form.logradouro.trim() || null, numero: form.numero.trim() || null,
      complemento: form.complemento.trim() || null, bairro: form.bairro.trim() || null,
      filial_id: form.filial_id || null, ativo: form.ativo,
    };

    let clienteId = editingClienteId;
    if (editingClienteId) {
      payload.atualizado_por = profile?.user_id || null;
      const { error } = await supabase.from("clientes").update(payload).eq("id", editingClienteId);
      if (error) { toast.error("Erro: " + error.message); setSaving(false); return; }
      for (const ct of contatos) {
        if (ct._id) {
          await supabase.from("cliente_contatos").update({ nome: ct.nome, cargo: ct.cargo || null, telefone: ct.telefone || null, email: ct.email || null, decisor: ct.decisor, ativo: ct.ativo }).eq("id", ct._id);
        } else {
          await supabase.from("cliente_contatos").insert({ cliente_id: editingClienteId, nome: ct.nome, cargo: ct.cargo || null, telefone: ct.telefone || null, email: ct.email || null, decisor: ct.decisor, ativo: ct.ativo });
        }
      }
    } else {
      payload.criado_por = profile?.user_id || null;
      const { data: newCliente, error } = await supabase.from("clientes").insert(payload).select().single();
      if (error || !newCliente) { toast.error("Erro: " + (error?.message || "")); setSaving(false); return; }
      clienteId = newCliente.id;
      for (const ct of contatos) {
        await supabase.from("cliente_contatos").insert({ cliente_id: newCliente.id, nome: ct.nome, cargo: ct.cargo || null, telefone: ct.telefone || null, email: ct.email || null, decisor: ct.decisor, ativo: ct.ativo });
      }
    }
    setSaving(false);
    if (clienteId) onSaved(clienteId, form.nome_fantasia);
  }

  const isQuerying = loadingCep || loadingCnpj;

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="right" className="!max-w-none !w-[60vw] p-0 flex flex-col">
        {/* Header */}
        <div className="px-6 py-4 border-b border-border space-y-1 shrink-0">
          <SheetTitle className="text-lg">Cadastro de Cliente</SheetTitle>
          <Badge className="bg-primary/10 text-primary border-0">Dados importados da oportunidade</Badge>
          <SheetDescription>Complete os campos obrigatórios para continuar para o pedido</SheetDescription>
        </div>

        {/* Form */}
        <div className="flex-1 overflow-y-auto px-6 py-4">
          <div className="grid grid-cols-2 gap-4">
            {/* CNPJ */}
            <div className="space-y-1.5">
              <Label>CNPJ / CPF *</Label>
              <div className="relative">
                <Input value={form.cnpj_cpf} onChange={e => { setCnpjError(""); setForm(f => ({ ...f, cnpj_cpf: e.target.value })); }} onBlur={handleCnpjBlur} placeholder="00.000.000/0001-00" className={cnpjError ? "border-destructive" : ""} />
                {loadingCnpj && <Loader2 className="absolute right-2.5 top-1/2 -translate-y-1/2 h-4 w-4 animate-spin text-muted-foreground" />}
              </div>
              {cnpjError && <p className="flex items-center gap-1 text-xs text-destructive"><AlertCircle className="h-3 w-3" />{cnpjError}</p>}
            </div>
            {/* Filial */}
            <div className="space-y-1.5">
              <Label>Filial responsável</Label>
              <Select value={form.filial_id} onValueChange={v => setForm(f => ({ ...f, filial_id: v }))}>
                <SelectTrigger><SelectValue placeholder="Selecionar filial" /></SelectTrigger>
                <SelectContent>{filiaisDoUsuario.map(fil => <SelectItem key={fil.id} value={fil.id}>{fil.nome}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            {/* Nome fantasia */}
            <div className="col-span-2 space-y-1.5">
              <Label>Nome fantasia *</Label>
              <Input value={form.nome_fantasia} onChange={e => setForm(f => ({ ...f, nome_fantasia: e.target.value }))} />
            </div>
            {/* Razão social */}
            <div className="col-span-2 space-y-1.5">
              <Label>Razão social *</Label>
              <Input value={form.razao_social} onChange={e => setForm(f => ({ ...f, razao_social: e.target.value }))} />
            </div>
            {/* Apelido */}
            <div className="col-span-2 space-y-1.5">
              <Label>Apelido</Label>
              <Input value={form.apelido} onChange={e => setForm(f => ({ ...f, apelido: e.target.value }))} />
            </div>
            {/* IE */}
            <div className="space-y-1.5">
              <Label>Inscrição estadual *</Label>
              <Input value={form.inscricao_estadual} onChange={e => setForm(f => ({ ...f, inscricao_estadual: e.target.value }))} disabled={form.ie_isento} className={form.ie_isento ? "opacity-50" : ""} />
            </div>
            <div className="flex flex-col justify-end">
              <div className="flex items-center gap-2 h-10">
                <Switch checked={form.ie_isento} onCheckedChange={v => setForm(f => ({ ...f, ie_isento: v, inscricao_estadual: v ? "" : f.inscricao_estadual }))} />
                <Label>Isento de IE</Label>
              </div>
            </div>
            {/* Endereço */}
            <div className="col-span-2 pt-1">
              <div className="flex items-center gap-2 text-xs text-muted-foreground font-medium uppercase tracking-wide"><MapPin className="h-3.5 w-3.5" />Endereço</div>
            </div>
            <div className="space-y-1.5">
              <Label>CEP</Label>
              <div className="relative">
                <Input value={form.cep} onChange={e => { setCepError(""); setForm(f => ({ ...f, cep: e.target.value })); }} onBlur={handleCepBlur} maxLength={9} className={cepError ? "border-destructive" : ""} />
                {loadingCep && <Loader2 className="absolute right-2.5 top-1/2 -translate-y-1/2 h-4 w-4 animate-spin text-muted-foreground" />}
              </div>
              {cepError && <p className="flex items-center gap-1 text-xs text-destructive"><AlertCircle className="h-3 w-3" />{cepError}</p>}
            </div>
            <div className="space-y-1.5"><Label>Logradouro</Label><Input value={form.logradouro} onChange={e => setForm(f => ({ ...f, logradouro: e.target.value }))} /></div>
            <div className="space-y-1.5"><Label>Número</Label><Input value={form.numero} onChange={e => setForm(f => ({ ...f, numero: e.target.value }))} /></div>
            <div className="space-y-1.5"><Label>Complemento</Label><Input value={form.complemento} onChange={e => setForm(f => ({ ...f, complemento: e.target.value }))} /></div>
            <div className="space-y-1.5"><Label>Bairro</Label><Input value={form.bairro} onChange={e => setForm(f => ({ ...f, bairro: e.target.value }))} /></div>
            <div className="space-y-1.5"><Label>Cidade</Label><Input value={form.cidade} onChange={e => setForm(f => ({ ...f, cidade: e.target.value }))} /></div>
            <div className="space-y-1.5">
              <Label>UF</Label>
              <Select value={form.uf} onValueChange={v => setForm(f => ({ ...f, uf: v }))}>
                <SelectTrigger><SelectValue placeholder="UF" /></SelectTrigger>
                <SelectContent>{UF_LIST.map(uf => <SelectItem key={uf} value={uf}>{uf}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            {/* Responsável */}
            <div className="col-span-2 space-y-1.5">
              <Label>Nome completo do responsável *</Label>
              <Input value={form.responsavel_nome} onChange={e => setForm(f => ({ ...f, responsavel_nome: e.target.value }))} />
            </div>
            {/* Contatos */}
            <div className="col-span-2 pt-2">
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2 text-xs text-muted-foreground font-medium uppercase tracking-wide">
                  <Users className="h-3.5 w-3.5" />Contatos <span className="text-destructive">*</span>
                </div>
                {!showContatoForm && (
                  <Button type="button" size="sm" variant="outline" className="gap-1.5 h-7 text-xs"
                    onClick={() => { setEditingIdx(null); setInlineForm({ nome: "", cargo: "", telefone: "", email: "", decisor: false, ativo: true }); setShowContatoForm(true); }}>
                    <Plus className="h-3 w-3" /> Adicionar
                  </Button>
                )}
              </div>
              {contatos.length > 0 && (
                <div className="rounded-lg border border-border divide-y divide-border mb-2">
                  {contatos.map((ct, idx) => (
                    <div key={idx} className={`flex items-center gap-3 px-3 py-2 ${!ct.ativo ? "opacity-50" : ""}`}>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-1.5">
                          <p className="text-sm font-medium truncate">{ct.nome}</p>
                          {ct.decisor && <span className="inline-flex items-center gap-0.5 text-xs px-1.5 py-0.5 rounded-full bg-primary/10 text-primary font-medium"><Star className="h-2.5 w-2.5 fill-current" /> Decisor</span>}
                        </div>
                        <div className="flex gap-2 mt-0.5">
                          {ct.cargo && <span className="text-xs text-muted-foreground">{ct.cargo}</span>}
                          {ct.telefone && <span className="text-xs text-muted-foreground">{ct.telefone}</span>}
                          {ct.email && <span className="text-xs text-muted-foreground">{ct.email}</span>}
                        </div>
                      </div>
                      <div className="flex items-center gap-0.5 shrink-0">
                        <Button type="button" variant="ghost" size="icon" className={`h-6 w-6 ${ct.decisor ? "text-primary" : "text-muted-foreground"}`}
                          onClick={() => setContatos(prev => prev.map((c, i) => ({ ...c, decisor: i === idx ? !c.decisor : false })))}>
                          <Star className={`h-3 w-3 ${ct.decisor ? "fill-current" : ""}`} />
                        </Button>
                        <Button type="button" variant="ghost" size="icon" className="h-6 w-6"
                          onClick={() => { setEditingIdx(idx); setInlineForm({ nome: ct.nome, cargo: ct.cargo, telefone: ct.telefone, email: ct.email, decisor: ct.decisor, ativo: ct.ativo }); setShowContatoForm(true); }}>
                          <Pencil className="h-3 w-3" />
                        </Button>
                        <Button type="button" variant="ghost" size="icon" className="h-6 w-6 text-destructive"
                          onClick={() => setContatos(prev => prev.filter((_, i) => i !== idx))}>
                          <Trash2 className="h-3 w-3" />
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
              {contatos.length === 0 && !showContatoForm && (
                <div className="rounded-lg border border-dashed border-destructive/40 bg-destructive/5 px-4 py-3 text-sm text-muted-foreground text-center">
                  <Users className="h-4 w-4 mx-auto mb-1" /> Nenhum contato. Adicione pelo menos um.
                </div>
              )}
              {showContatoForm && (
                <div className="rounded-lg border border-border bg-muted/30 p-3 space-y-3">
                  <p className="text-xs font-medium">{editingIdx !== null ? "Editar contato" : "Novo contato"}</p>
                  <div className="grid grid-cols-2 gap-2">
                    <div className="col-span-2"><Label className="text-xs">Nome *</Label><Input className="h-8 text-sm" value={inlineForm.nome} onChange={e => setInlineForm(f => ({ ...f, nome: e.target.value }))} /></div>
                    <div><Label className="text-xs">Cargo *</Label><Input className="h-8 text-sm" value={inlineForm.cargo} onChange={e => setInlineForm(f => ({ ...f, cargo: e.target.value }))} /></div>
                    <div><Label className="text-xs">Telefone</Label><Input className="h-8 text-sm" value={applyPhoneMask(inlineForm.telefone)} onChange={e => setInlineForm(f => ({ ...f, telefone: e.target.value.replace(/\D/g, "") }))} /></div>
                    <div className="col-span-2"><Label className="text-xs">E-mail *</Label><Input className="h-8 text-sm" type="email" value={inlineForm.email} onChange={e => setInlineForm(f => ({ ...f, email: e.target.value }))} /></div>
                    <div className="col-span-2 flex items-center gap-3">
                      <Checkbox checked={inlineForm.decisor} onCheckedChange={v => setInlineForm(f => ({ ...f, decisor: !!v }))} />
                      <Label className="text-xs cursor-pointer">Decisor</Label>
                    </div>
                  </div>
                  <div className="flex gap-2 justify-end">
                    <Button type="button" variant="outline" size="sm" className="h-7 text-xs" onClick={() => { setShowContatoForm(false); setEditingIdx(null); }}>Cancelar</Button>
                    <Button type="button" size="sm" className="h-7 text-xs" onClick={saveInlineContato}>{editingIdx !== null ? "Salvar" : "Adicionar"}</Button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-border flex justify-end gap-2 shrink-0">
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancelar</Button>
          <Button onClick={handleSave} disabled={saving || isQuerying}>
            {isQuerying ? <><Loader2 className="h-4 w-4 animate-spin mr-2" />Consultando...</> :
             saving ? <><Loader2 className="h-4 w-4 animate-spin mr-2" />Salvando...</> :
             "Salvar Cliente e Continuar →"}
          </Button>
        </div>
      </SheetContent>
    </Sheet>
  );
}
