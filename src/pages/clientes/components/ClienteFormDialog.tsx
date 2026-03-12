import { Cliente } from "@/lib/supabase-types";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Checkbox } from "@/components/ui/checkbox";
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
import { toast } from "sonner";
import { Plus, Pencil, Loader2, MapPin, AlertCircle, Users, Star, Trash2 } from "lucide-react";
import { UF_LIST, emptyContatoForm } from "@/pages/clientes/constants";
import type { ClienteFormState, ContatoFormState } from "@/pages/clientes/types";
import { applyPhoneMask } from "@/lib/utils";
import type { InlineContato } from "@/pages/clientes/useClienteForm";

interface ClienteFormDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  viewOnly: boolean;
  editing: Cliente | null;
  form: ClienteFormState;
  setForm: React.Dispatch<React.SetStateAction<ClienteFormState>>;
  saving: boolean;
  isQuerying: boolean;
  loadingCep: boolean;
  loadingCnpj: boolean;
  cepError: string;
  setCepError: (v: string) => void;
  cnpjError: string;
  setCnpjError: (v: string) => void;
  handleCepBlur: () => void;
  handleCnpjBlur: () => void;
  handleSave: () => void;
  canEditExisting: boolean;
  crudIncluir: boolean;
  filiaisDoUsuario: { id: string; nome: string }[];
  formContatos: InlineContato[];
  setFormContatos: React.Dispatch<React.SetStateAction<InlineContato[]>>;
  showContatoInlineForm: boolean;
  setShowContatoInlineForm: (v: boolean) => void;
  editingInlineIdx: number | null;
  setEditingInlineIdx: (v: number | null) => void;
  inlineContatoForm: ContatoFormState;
  setInlineContatoForm: React.Dispatch<React.SetStateAction<ContatoFormState>>;
}

export function ClienteFormDialog({
  open,
  onOpenChange,
  viewOnly,
  editing,
  form,
  setForm,
  saving,
  isQuerying,
  loadingCep,
  loadingCnpj,
  cepError,
  setCepError,
  cnpjError,
  setCnpjError,
  handleCepBlur,
  handleCnpjBlur,
  handleSave,
  canEditExisting,
  crudIncluir,
  filiaisDoUsuario,
  formContatos,
  setFormContatos,
  showContatoInlineForm,
  setShowContatoInlineForm,
  editingInlineIdx,
  setEditingInlineIdx,
  inlineContatoForm,
  setInlineContatoForm,
}: ClienteFormDialogProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{viewOnly ? "Visualizar cliente" : editing ? "Editar cliente" : "Novo cliente"}</DialogTitle>
        </DialogHeader>
        <div className={`grid grid-cols-2 gap-4 py-2 ${viewOnly ? "pointer-events-none opacity-75" : ""}`}>

          {/* CNPJ/CPF com busca automatica */}
          <div className="space-y-1.5">
            <Label>CNPJ / CPF *</Label>
            <div className="relative">
              <Input
                value={form.cnpj_cpf}
                onChange={(e) => { setCnpjError(""); setForm((prev) => ({ ...prev, cnpj_cpf: e.target.value })); }}
                onBlur={handleCnpjBlur}
                placeholder="00.000.000/0001-00"
                className={cnpjError ? "border-destructive pr-9" : "pr-9"}
              />
              {loadingCnpj && (
                <Loader2 className="absolute right-2.5 top-1/2 -translate-y-1/2 h-4 w-4 animate-spin text-muted-foreground" />
              )}
            </div>
            {cnpjError && (
              <p className="flex items-center gap-1 text-xs text-destructive">
                <AlertCircle className="h-3 w-3" />{cnpjError}
              </p>
            )}
          </div>

          {/* Filial */}
          <div className="space-y-1.5">
            <Label>Filial responsável</Label>
            <Select value={form.filial_id} onValueChange={(v) => setForm((prev) => ({ ...prev, filial_id: v }))} disabled={!canEditExisting && !crudIncluir}>
              <SelectTrigger>
                <SelectValue placeholder="Selecionar filial" />
              </SelectTrigger>
              <SelectContent>
                {filiaisDoUsuario.map((fil) => (
                  <SelectItem key={fil.id} value={fil.id}>{fil.nome}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Nome fantasia */}
          <div className="col-span-2 space-y-1.5">
            <Label>Nome fantasia *</Label>
            <Input value={form.nome_fantasia} onChange={(e) => setForm((prev) => ({ ...prev, nome_fantasia: e.target.value }))} placeholder="Ex: Restaurante do João" />
          </div>

          {/* Razao social */}
          <div className="col-span-2 space-y-1.5">
            <Label>Razão social *</Label>
            <Input value={form.razao_social} onChange={(e) => setForm((prev) => ({ ...prev, razao_social: e.target.value }))} placeholder="Razão social" />
          </div>

          {/* Apelido */}
          <div className="col-span-2 space-y-1.5">
            <Label>Apelido</Label>
            <Input value={form.apelido} onChange={(e) => setForm((prev) => ({ ...prev, apelido: e.target.value }))} placeholder="Ex: Bar do João Loja 01 Centro" />
            <p className="text-xs text-muted-foreground">Identificação interna da loja/unidade</p>
          </div>

          {/* Inscrição estadual */}
          <div className="space-y-1.5">
            <Label>Inscrição estadual *</Label>
            <Input
              value={form.inscricao_estadual}
              onChange={(e) => setForm((prev) => ({ ...prev, inscricao_estadual: e.target.value }))}
              placeholder="Ex: 123.456.789.012"
              disabled={form.ie_isento}
              className={form.ie_isento ? "opacity-50" : ""}
            />
          </div>
          <div className="space-y-1.5 flex flex-col justify-end">
            <div className="flex items-center gap-2 h-10">
              <Switch
                checked={form.ie_isento}
                onCheckedChange={(v) => setForm((prev) => ({ ...prev, ie_isento: v, inscricao_estadual: v ? "" : prev.inscricao_estadual }))}
              />
              <Label className="cursor-pointer select-none">Isento de IE</Label>
            </div>
          </div>

          {/* Separador endereco */}
          <div className="col-span-2 pt-1">
            <div className="flex items-center gap-2 text-xs text-muted-foreground font-medium uppercase tracking-wide">
              <MapPin className="h-3.5 w-3.5" />
              Endereço
            </div>
          </div>

          {/* CEP com busca automatica */}
          <div className="space-y-1.5">
            <Label>CEP</Label>
            <div className="relative">
              <Input
                value={form.cep}
                onChange={(e) => { setCepError(""); setForm((prev) => ({ ...prev, cep: e.target.value })); }}
                onBlur={handleCepBlur}
                placeholder="00000-000"
                maxLength={9}
                className={cepError ? "border-destructive pr-9" : "pr-9"}
              />
              {loadingCep && (
                <Loader2 className="absolute right-2.5 top-1/2 -translate-y-1/2 h-4 w-4 animate-spin text-muted-foreground" />
              )}
            </div>
            {cepError && (
              <p className="flex items-center gap-1 text-xs text-destructive">
                <AlertCircle className="h-3 w-3" />{cepError}
              </p>
            )}
          </div>

          {/* Logradouro */}
          <div className="space-y-1.5">
            <Label>Logradouro</Label>
            <Input value={form.logradouro} onChange={(e) => setForm((prev) => ({ ...prev, logradouro: e.target.value }))} placeholder="Rua / Avenida..." />
          </div>

          {/* Número */}
          <div className="space-y-1.5">
            <Label>Número</Label>
            <Input value={form.numero} onChange={(e) => setForm((prev) => ({ ...prev, numero: e.target.value }))} placeholder="Ex: 123" />
          </div>

          {/* Complemento */}
          <div className="space-y-1.5">
            <Label>Complemento</Label>
            <Input value={form.complemento} onChange={(e) => setForm((prev) => ({ ...prev, complemento: e.target.value }))} placeholder="Apto, Sala, Bloco..." />
          </div>

          {/* Bairro */}
          <div className="space-y-1.5">
            <Label>Bairro</Label>
            <Input value={form.bairro} onChange={(e) => setForm((prev) => ({ ...prev, bairro: e.target.value }))} placeholder="Bairro" />
          </div>

          {/* Cidade e UF */}
          <div className="space-y-1.5">
            <Label>Cidade</Label>
            <Input value={form.cidade} onChange={(e) => setForm((prev) => ({ ...prev, cidade: e.target.value }))} placeholder="Ex: São Paulo" />
          </div>
          <div className="space-y-1.5">
            <Label>UF</Label>
            <Select value={form.uf} onValueChange={(v) => setForm((prev) => ({ ...prev, uf: v }))}>
              <SelectTrigger>
                <SelectValue placeholder="UF" />
              </SelectTrigger>
              <SelectContent>
                {UF_LIST.map((uf) => (
                  <SelectItem key={uf} value={uf}>{uf}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {canEditExisting && (
            <div className="col-span-2 flex items-center gap-3">
              <Switch checked={form.ativo} onCheckedChange={(v) => setForm((prev) => ({ ...prev, ativo: v }))} />
              <Label>Cliente ativo</Label>
            </div>
          )}

          {/* ── Responsável ── */}
          <div className="col-span-2 space-y-1.5">
            <Label>Nome completo do responsável *</Label>
            <Input value={form.responsavel_nome} onChange={(e) => setForm((prev) => ({ ...prev, responsavel_nome: e.target.value }))} placeholder="Nome completo do responsável pela empresa" />
          </div>

          {/* ── Seção Contatos ── */}
          <div className="col-span-2 pt-2">
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-2 text-xs text-muted-foreground font-medium uppercase tracking-wide">
                <Users className="h-3.5 w-3.5" />
                Contatos <span className="text-destructive">*</span>
                <span className="text-xs font-normal normal-case text-muted-foreground">(obrigatório ao menos 1)</span>
              </div>
              {canEditExisting && !viewOnly && !showContatoInlineForm && (
                <Button type="button" size="sm" variant="outline" className="gap-1.5 h-7 text-xs"
                  onClick={() => { setEditingInlineIdx(null); setInlineContatoForm(emptyContatoForm); setShowContatoInlineForm(true); }}>
                  <Plus className="h-3 w-3" /> Adicionar contato
                </Button>
              )}
            </div>

            {/* Lista de contatos */}
            {formContatos.length > 0 && (
              <div className="rounded-lg border border-border divide-y divide-border mb-2">
                {formContatos.map((ct, idx) => (
                  <div key={idx} className={`flex items-center gap-3 px-3 py-2 ${!ct.ativo ? "opacity-50" : ""}`}>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-1.5">
                        <p className="text-sm font-medium truncate">{ct.nome}</p>
                        {ct.decisor && (
                          <span className="inline-flex items-center gap-0.5 text-xs px-1.5 py-0.5 rounded-full bg-primary/10 text-primary font-medium shrink-0">
                            <Star className="h-2.5 w-2.5 fill-current" /> Decisor
                          </span>
                        )}
                        {ct.ativo === false && (
                          <span className="text-xs px-1.5 py-0.5 rounded-full bg-muted text-muted-foreground shrink-0">Inativo</span>
                        )}
                      </div>
                      <div className="flex gap-2 mt-0.5">
                        {ct.cargo && <span className="text-xs text-muted-foreground">{ct.cargo}</span>}
                        {ct.telefone && <span className="text-xs text-muted-foreground">{ct.telefone}</span>}
                        {ct.email && <span className="text-xs text-muted-foreground">{ct.email}</span>}
                      </div>
                    </div>
                    {canEditExisting && !viewOnly && (
                      <div className="flex items-center gap-0.5 shrink-0">
                        <Button type="button" variant="ghost" size="icon" className={`h-6 w-6 ${ct.decisor ? "text-primary" : "text-muted-foreground"}`}
                          title={ct.decisor ? "Remover como decisor" : "Marcar como decisor"}
                          onClick={() => setFormContatos((prev) => prev.map((c, i) => ({ ...c, decisor: i === idx ? !c.decisor : (ct.decisor ? c.decisor : false) })))}>
                          <Star className={`h-3 w-3 ${ct.decisor ? "fill-current" : ""}`} />
                        </Button>
                        <Button type="button" variant="ghost" size="icon" className="h-6 w-6"
                          onClick={() => { setEditingInlineIdx(idx); setInlineContatoForm({ nome: ct.nome, cargo: ct.cargo || "", telefone: ct.telefone || "", email: ct.email || "", decisor: ct.decisor, ativo: ct.ativo }); setShowContatoInlineForm(true); }}>
                          <Pencil className="h-3 w-3" />
                        </Button>
                        {ct.ativo !== false ? (
                          <Button type="button" variant="ghost" size="icon" className="h-6 w-6 text-destructive hover:text-destructive"
                            title="Desativar contato"
                            onClick={() => {
                              if (ct.decisor) {
                                const outroDecisorAtivo = formContatos.some((c, i) => i !== idx && c.ativo !== false && c.decisor);
                                if (!outroDecisorAtivo) {
                                  toast.error("Defina um novo contato como decisor antes de desativar este.");
                                  return;
                                }
                              }
                              if (ct._id) {
                                setFormContatos((prev) => prev.map((c, i) => i === idx ? { ...c, ativo: false, decisor: false } : c));
                              } else {
                                setFormContatos((prev) => prev.filter((_, i) => i !== idx));
                              }
                            }}>
                            <Trash2 className="h-3 w-3" />
                          </Button>
                        ) : (
                          <Button type="button" variant="ghost" size="icon" className="h-6 w-6 text-emerald-600 hover:text-emerald-700"
                            title="Reativar contato"
                            onClick={() => setFormContatos((prev) => prev.map((c, i) => i === idx ? { ...c, ativo: true } : c))}>
                            <AlertCircle className="h-3 w-3" />
                          </Button>
                        )}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}

            {formContatos.length === 0 && !showContatoInlineForm && (
              <div className="rounded-lg border border-dashed border-destructive/40 bg-destructive/5 px-4 py-3 text-sm text-muted-foreground text-center">
                <Users className="h-4 w-4 mx-auto mb-1 text-muted-foreground" />
                Nenhum contato cadastrado. Adicione pelo menos um contato.
              </div>
            )}

            {/* Formulário inline de contato */}
            {showContatoInlineForm && (
              <div className="rounded-lg border border-border bg-muted/30 p-3 space-y-3">
                <p className="text-xs font-medium text-foreground">{editingInlineIdx !== null ? "Editar contato" : "Novo contato"}</p>
                <div className="grid grid-cols-2 gap-2">
                  <div className="col-span-2 space-y-1">
                    <Label className="text-xs">Nome *</Label>
                    <Input className="h-8 text-sm" value={inlineContatoForm.nome} onChange={(e) => setInlineContatoForm((prev) => ({ ...prev, nome: e.target.value }))} placeholder="Nome completo" />
                  </div>
                  <div className="space-y-1">
                    <Label className="text-xs">Cargo *</Label>
                    <Input className="h-8 text-sm" value={inlineContatoForm.cargo} onChange={(e) => setInlineContatoForm((prev) => ({ ...prev, cargo: e.target.value }))} placeholder="Cargo / função" />
                  </div>
                  <div className="space-y-1">
                    <Label className="text-xs">Telefone</Label>
                    <Input className="h-8 text-sm" value={inlineContatoForm.telefone} onChange={(e) => setInlineContatoForm((prev) => ({ ...prev, telefone: e.target.value }))} placeholder="(00) 00000-0000" />
                  </div>
                  <div className="col-span-2 space-y-1">
                    <Label className="text-xs">E-mail *</Label>
                    <Input className="h-8 text-sm" type="email" value={inlineContatoForm.email} onChange={(e) => setInlineContatoForm((prev) => ({ ...prev, email: e.target.value }))} placeholder="email@empresa.com" />
                  </div>
                  <div className="col-span-2 flex items-center gap-3">
                    <Checkbox id="inline-decisor" checked={inlineContatoForm.decisor} onCheckedChange={(v) => setInlineContatoForm((prev) => ({ ...prev, decisor: !!v }))} />
                    <Label htmlFor="inline-decisor" className="text-xs cursor-pointer">Decisor (tomador de decisão)</Label>
                  </div>
                </div>
                <div className="flex gap-2 justify-end">
                  <Button type="button" variant="outline" size="sm" className="h-7 text-xs" onClick={() => { setShowContatoInlineForm(false); setEditingInlineIdx(null); }}>Cancelar</Button>
                  <Button type="button" size="sm" className="h-7 text-xs" onClick={() => {
                    if (!inlineContatoForm.nome.trim()) { toast.error("Nome do contato é obrigatório"); return; }
                    if (!inlineContatoForm.email?.trim()) { toast.error("E-mail do contato é obrigatório"); return; }
                    if (!inlineContatoForm.cargo?.trim()) { toast.error("Cargo do contato é obrigatório"); return; }
                    if (editingInlineIdx !== null) {
                      setFormContatos((prev) => prev.map((c, i) => i === editingInlineIdx ? { ...c, ...inlineContatoForm, _id: c._id } : c));
                    } else {
                      setFormContatos((prev) => [
                        ...(inlineContatoForm.decisor ? prev.map((c) => ({ ...c, decisor: false })) : prev),
                        { ...inlineContatoForm },
                      ]);
                    }
                    setShowContatoInlineForm(false);
                    setEditingInlineIdx(null);
                    setInlineContatoForm(emptyContatoForm);
                  }}>
                    {editingInlineIdx !== null ? "Salvar" : "Adicionar"}
                  </Button>
                </div>
              </div>
            )}
          </div>

        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>{viewOnly ? "Fechar" : "Cancelar"}</Button>
          {!viewOnly && (
            <Button onClick={handleSave} disabled={saving || isQuerying}>
              {isQuerying ? (
                <><Loader2 className="h-4 w-4 animate-spin mr-2" />Consultando...</>
              ) : saving ? "Salvando..." : editing ? "Salvar alterações" : "Cadastrar cliente"}
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
