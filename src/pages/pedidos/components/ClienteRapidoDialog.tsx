import { useState, useCallback } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { UserPlus, Loader2, AlertCircle, MapPin, Users, Plus, Star, Pencil, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { UF_LIST } from "../constants";
import type { ClienteFormState, ClienteContatoInline } from "../types";
import { verificarTelefoneDuplicado, type ContatoDuplicado } from "@/lib/validarTelefoneContato";
import { TelefoneDuplicadoAlerta } from "@/components/TelefoneDuplicadoAlerta";
import type { ClienteFormState, ClienteContatoInline } from "../types";

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  clienteForm: ClienteFormState;
  setClienteForm: React.Dispatch<React.SetStateAction<ClienteFormState>>;
  clienteContatos: ClienteContatoInline[];
  setClienteContatos: React.Dispatch<React.SetStateAction<ClienteContatoInline[]>>;
  savingCliente: boolean;
  isQuerying: boolean;
  loadingCep: boolean;
  loadingCnpj: boolean;
  cepError: string;
  cnpjError: string;
  setCepError: (v: string) => void;
  setCnpjError: (v: string) => void;
  onSave: (e: React.FormEvent) => void;
  onCepBlur: () => void;
  onCnpjBlur: () => void;
}

export function ClienteRapidoDialog({
  open,
  onOpenChange,
  clienteForm,
  setClienteForm,
  clienteContatos,
  setClienteContatos,
  savingCliente,
  isQuerying,
  loadingCep,
  loadingCnpj,
  cepError,
  cnpjError,
  setCepError,
  setCnpjError,
  onSave,
  onCepBlur,
  onCnpjBlur,
}: Props) {
  // Inline contact form state (local to this dialog)
  const [showContatoForm, setShowContatoForm] = useState(false);
  const [editingContatoIdx, setEditingContatoIdx] = useState<number | null>(null);
  const [inlineContatoForm, setInlineContatoForm] = useState<ClienteContatoInline>({
    nome: "", cargo: "", telefone: "", email: "", decisor: false, ativo: true,
  });

  function handleSaveContato() {
    if (!inlineContatoForm.nome.trim()) { toast.error("Nome do contato é obrigatório"); return; }
    if (!inlineContatoForm.email?.trim()) { toast.error("E-mail do contato é obrigatório"); return; }
    if (!inlineContatoForm.cargo?.trim()) { toast.error("Cargo do contato é obrigatório"); return; }
    if (editingContatoIdx !== null) {
      setClienteContatos((prev) => prev.map((c, i) => i === editingContatoIdx ? { ...inlineContatoForm } : c));
    } else {
      setClienteContatos((prev) => [
        ...(inlineContatoForm.decisor ? prev.map((c) => ({ ...c, decisor: false })) : prev),
        { ...inlineContatoForm },
      ]);
    }
    setShowContatoForm(false);
    setEditingContatoIdx(null);
    setInlineContatoForm({ nome: "", cargo: "", telefone: "", email: "", decisor: false, ativo: true });
  }

  return (
    <Dialog open={open} onOpenChange={(v) => { onOpenChange(v); if (!v) { setClienteContatos([]); setShowContatoForm(false); } }}>
      <DialogContent className="max-w-xl max-h-[90vh] overflow-y-auto" onInteractOutside={(e) => e.preventDefault()}>
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <UserPlus className="h-4 w-4" /> Cadastrar Novo Cliente
          </DialogTitle>
        </DialogHeader>
        <form onSubmit={onSave} className="space-y-3">
          <div className="grid grid-cols-2 gap-3">
            {/* CNPJ */}
            <div className="col-span-2 space-y-1.5">
              <Label>CNPJ / CPF *</Label>
              <div className="relative">
                <Input
                  placeholder="00.000.000/0000-00"
                  value={clienteForm.cnpj_cpf}
                  onChange={(e) => { setCnpjError(""); setClienteForm((f) => ({ ...f, cnpj_cpf: e.target.value })); }}
                  onBlur={onCnpjBlur}
                  required
                  autoFocus
                  className={cnpjError ? "border-destructive pr-9" : "pr-9"}
                />
                {loadingCnpj && <Loader2 className="absolute right-2.5 top-1/2 -translate-y-1/2 h-4 w-4 animate-spin text-muted-foreground" />}
              </div>
              {cnpjError && (
                <p className="flex items-center gap-1 text-xs text-destructive">
                  <AlertCircle className="h-3 w-3" />{cnpjError}
                </p>
              )}
            </div>

            <div className="col-span-2 space-y-1.5">
              <Label>Nome Fantasia *</Label>
              <Input placeholder="Nome fantasia..." value={clienteForm.nome_fantasia} onChange={(e) => setClienteForm((f) => ({ ...f, nome_fantasia: e.target.value }))} required />
            </div>
            <div className="col-span-2 space-y-1.5">
              <Label>Razão Social *</Label>
              <Input placeholder="Razão social..." value={clienteForm.razao_social} onChange={(e) => setClienteForm((f) => ({ ...f, razao_social: e.target.value }))} required />
            </div>
            <div className="col-span-2 space-y-1.5">
              <Label>Apelido</Label>
              <Input placeholder="Ex: Bar do João Loja 01 Centro" value={clienteForm.apelido} onChange={(e) => setClienteForm((f) => ({ ...f, apelido: e.target.value }))} />
              <p className="text-xs text-muted-foreground">Identificação interna da loja/unidade</p>
            </div>

            {/* IE */}
            <div className="space-y-1.5">
              <Label>Inscrição estadual *</Label>
              <Input
                value={clienteForm.inscricao_estadual}
                onChange={(e) => setClienteForm((f) => ({ ...f, inscricao_estadual: e.target.value }))}
                placeholder="000.000.000.000"
                disabled={clienteForm.ie_isento}
              />
            </div>
            <div className="flex items-center gap-2 h-10">
              <Switch
                checked={clienteForm.ie_isento}
                onCheckedChange={(v) => setClienteForm((f) => ({ ...f, ie_isento: v, inscricao_estadual: v ? "" : f.inscricao_estadual }))}
              />
              <Label className="cursor-pointer select-none">Isento de IE</Label>
            </div>

            {/* Responsável */}
            <div className="col-span-2 space-y-1.5">
              <Label>Nome completo do responsável *</Label>
              <Input value={clienteForm.responsavel_nome} onChange={(e) => setClienteForm((f) => ({ ...f, responsavel_nome: e.target.value }))} placeholder="Nome completo do responsável pela empresa" />
            </div>

            {/* Endereço */}
            <div className="col-span-2 pt-1">
              <div className="flex items-center gap-2 text-xs text-muted-foreground font-medium uppercase tracking-wide">
                <MapPin className="h-3 w-3" /> Endereço
              </div>
            </div>

            <div className="space-y-1.5">
              <Label>CEP</Label>
              <div className="relative">
                <Input
                  placeholder="00000-000"
                  value={clienteForm.cep}
                  onChange={(e) => { setCepError(""); setClienteForm((f) => ({ ...f, cep: e.target.value })); }}
                  onBlur={onCepBlur}
                  maxLength={9}
                  className={cepError ? "border-destructive pr-9" : "pr-9"}
                />
                {loadingCep && <Loader2 className="absolute right-2.5 top-1/2 -translate-y-1/2 h-4 w-4 animate-spin text-muted-foreground" />}
              </div>
              {cepError && (
                <p className="flex items-center gap-1 text-xs text-destructive">
                  <AlertCircle className="h-3 w-3" />{cepError}
                </p>
              )}
            </div>
            <div className="space-y-1.5">
              <Label>Logradouro</Label>
              <Input placeholder="Rua / Avenida..." value={clienteForm.logradouro} onChange={(e) => setClienteForm((f) => ({ ...f, logradouro: e.target.value }))} />
            </div>
            <div className="space-y-1.5">
              <Label>Número</Label>
              <Input placeholder="Ex: 123" value={clienteForm.numero} onChange={(e) => setClienteForm((f) => ({ ...f, numero: e.target.value }))} />
            </div>
            <div className="space-y-1.5">
              <Label>Complemento</Label>
              <Input placeholder="Apto, Sala, Bloco..." value={clienteForm.complemento} onChange={(e) => setClienteForm((f) => ({ ...f, complemento: e.target.value }))} />
            </div>
            <div className="space-y-1.5">
              <Label>Bairro</Label>
              <Input placeholder="Bairro" value={clienteForm.bairro} onChange={(e) => setClienteForm((f) => ({ ...f, bairro: e.target.value }))} />
            </div>
            <div className="space-y-1.5">
              <Label>Cidade</Label>
              <Input placeholder="Cidade" value={clienteForm.cidade} onChange={(e) => setClienteForm((f) => ({ ...f, cidade: e.target.value }))} />
            </div>
            <div className="space-y-1.5">
              <Label>UF</Label>
              <Select value={clienteForm.uf} onValueChange={(v) => setClienteForm((f) => ({ ...f, uf: v }))}>
                <SelectTrigger><SelectValue placeholder="UF" /></SelectTrigger>
                <SelectContent>
                  {UF_LIST.map((uf) => <SelectItem key={uf} value={uf}>{uf}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>

            {/* ── Seção Contatos ── */}
            <div className="col-span-2 pt-2">
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2 text-xs text-muted-foreground font-medium uppercase tracking-wide">
                  <Users className="h-3.5 w-3.5" />
                  Contatos <span className="text-destructive">*</span>
                  <span className="text-xs font-normal normal-case">(obrigatório ao menos 1)</span>
                </div>
                {!showContatoForm && (
                  <Button type="button" size="sm" variant="outline" className="gap-1.5 h-7 text-xs"
                    onClick={() => { setEditingContatoIdx(null); setInlineContatoForm({ nome: "", cargo: "", telefone: "", email: "", decisor: false, ativo: true }); setShowContatoForm(true); }}>
                    <Plus className="h-3 w-3" /> Adicionar contato
                  </Button>
                )}
              </div>

              {clienteContatos.length > 0 && (
                <div className="rounded-lg border border-border divide-y divide-border mb-2">
                  {clienteContatos.map((ct, idx) => (
                    <div key={idx} className="flex items-center gap-3 px-3 py-2">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-1.5">
                          <p className="text-sm font-medium truncate">{ct.nome}</p>
                          {ct.decisor && (
                            <span className="inline-flex items-center gap-0.5 text-xs px-1.5 py-0.5 rounded-full bg-primary/10 text-primary font-medium shrink-0">
                              <Star className="h-2.5 w-2.5 fill-current" /> Decisor
                            </span>
                          )}
                        </div>
                        <div className="flex gap-2 mt-0.5">
                          {ct.cargo && <span className="text-xs text-muted-foreground">{ct.cargo}</span>}
                          {ct.telefone && <span className="text-xs text-muted-foreground">{ct.telefone}</span>}
                        </div>
                      </div>
                      <div className="flex items-center gap-0.5 shrink-0">
                        <Button type="button" variant="ghost" size="icon" className={`h-6 w-6 ${ct.decisor ? "text-primary" : "text-muted-foreground"}`}
                          onClick={() => setClienteContatos((prev) => prev.map((c, i) => ({ ...c, decisor: i === idx ? !c.decisor : (ct.decisor ? c.decisor : false) })))}>
                          <Star className={`h-3 w-3 ${ct.decisor ? "fill-current" : ""}`} />
                        </Button>
                        <Button type="button" variant="ghost" size="icon" className="h-6 w-6"
                          onClick={() => { setEditingContatoIdx(idx); setInlineContatoForm({ ...ct }); setShowContatoForm(true); }}>
                          <Pencil className="h-3 w-3" />
                        </Button>
                        <Button type="button" variant="ghost" size="icon" className="h-6 w-6 text-destructive hover:text-destructive"
                          onClick={() => setClienteContatos((prev) => prev.filter((_, i) => i !== idx))}>
                          <Trash2 className="h-3 w-3" />
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {clienteContatos.length === 0 && !showContatoForm && (
                <div className="rounded-lg border border-dashed border-destructive/40 bg-destructive/5 px-4 py-3 text-sm text-muted-foreground text-center mb-2">
                  <Users className="h-4 w-4 mx-auto mb-1" />
                  Nenhum contato cadastrado. Adicione pelo menos um contato.
                </div>
              )}

              {showContatoForm && (
                <div className="rounded-lg border border-border bg-muted/30 p-3 space-y-3">
                  <p className="text-xs font-medium text-foreground">{editingContatoIdx !== null ? "Editar contato" : "Novo contato"}</p>
                  <div className="grid grid-cols-2 gap-2">
                    <div className="col-span-2 space-y-1">
                      <Label className="text-xs">Nome *</Label>
                      <Input className="h-8 text-sm" value={inlineContatoForm.nome} onChange={(e) => setInlineContatoForm((f) => ({ ...f, nome: e.target.value }))} placeholder="Nome completo" />
                    </div>
                    <div className="space-y-1">
                      <Label className="text-xs">Cargo *</Label>
                      <Input className="h-8 text-sm" value={inlineContatoForm.cargo} onChange={(e) => setInlineContatoForm((f) => ({ ...f, cargo: e.target.value }))} placeholder="Cargo / função" />
                    </div>
                    <div className="space-y-1">
                      <Label className="text-xs">Telefone</Label>
                      <Input className="h-8 text-sm" value={inlineContatoForm.telefone} onChange={(e) => setInlineContatoForm((f) => ({ ...f, telefone: e.target.value }))} placeholder="(00) 00000-0000" />
                    </div>
                    <div className="col-span-2 space-y-1">
                      <Label className="text-xs">E-mail *</Label>
                      <Input className="h-8 text-sm" type="email" value={inlineContatoForm.email} onChange={(e) => setInlineContatoForm((f) => ({ ...f, email: e.target.value }))} placeholder="email@empresa.com" />
                    </div>
                    <div className="col-span-2 flex items-center gap-3">
                      <Checkbox id="cli-decisor" checked={inlineContatoForm.decisor} onCheckedChange={(v) => setInlineContatoForm((f) => ({ ...f, decisor: !!v }))} />
                      <Label htmlFor="cli-decisor" className="text-xs cursor-pointer">Decisor (tomador de decisão)</Label>
                    </div>
                  </div>
                  <div className="flex gap-2 justify-end">
                    <Button type="button" variant="outline" size="sm" className="h-7 text-xs" onClick={() => { setShowContatoForm(false); setEditingContatoIdx(null); }}>Cancelar</Button>
                    <Button type="button" size="sm" className="h-7 text-xs" onClick={handleSaveContato}>
                      {editingContatoIdx !== null ? "Salvar" : "Adicionar"}
                    </Button>
                  </div>
                </div>
              )}
            </div>
          </div>
          <DialogFooter className="pt-2">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>Cancelar</Button>
            <Button type="submit" disabled={savingCliente || isQuerying}>
              {isQuerying ? (
                <><Loader2 className="h-4 w-4 animate-spin mr-2" />Consultando...</>
              ) : savingCliente ? (
                <><Loader2 className="h-4 w-4 animate-spin mr-2" />Salvando...</>
              ) : "Cadastrar cliente"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
