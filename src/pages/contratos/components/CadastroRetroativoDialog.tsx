import { Filial } from "@/lib/supabase-types";
import type { ModuloAdicionadoItem } from "../types";
import { fmtBRL } from "../helpers";
import { UF_LIST } from "../constants";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Checkbox } from "@/components/ui/checkbox";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Loader2,
  XCircle,
  UserPlus,
  Search,
  Plus,
  MapPin,
  AlertCircle,
  Star,
  Pencil,
  Trash2,
  Users,
  Tag,
  CheckCircle2,
} from "lucide-react";

// ─── Types ────────────────────────────────────────────────────────────────

export interface RetroCliente {
  id: string;
  nome_fantasia: string;
  filial_id: string | null;
  cnpj_cpf: string;
  razao_social: string | null;
}

export interface RetroPlano {
  id: string;
  nome: string;
  valor_implantacao_padrao: number | null;
  valor_mensalidade_padrao: number | null;
}

export interface RetroModulo {
  id: string;
  nome: string;
  valor_implantacao_modulo: number | null;
  valor_mensalidade_modulo: number | null;
}

export interface RetroVendedor {
  id: string;
  user_id: string;
  full_name: string;
  filial_id: string | null;
}

export interface RetroSegmento {
  id: string;
  nome: string;
}

export interface RetroFormState {
  cliente_id: string;
  plano_id: string;
  tipo: string;
  status: string;
  observacoes: string;
  segmento_id: string;
  data_lancamento: string;
  vendedor_id: string;
  filial_id: string;
  desconto_implantacao_tipo: "R$" | "%";
  desconto_implantacao_valor: string;
  desconto_mensalidade_tipo: "R$" | "%";
  desconto_mensalidade_valor: string;
  motivo_desconto: string;
  pagamento_implantacao_forma: string;
  pagamento_implantacao_parcelas: string;
  pagamento_implantacao_observacao: string;
  pagamento_mensalidade_forma: string;
  pagamento_mensalidade_observacao: string;
}

export interface RetroClienteFormState {
  nome_fantasia: string;
  razao_social: string;
  cnpj_cpf: string;
  contato_nome: string;
  telefone: string;
  email: string;
  cidade: string;
  uf: string;
  cep: string;
  logradouro: string;
  numero: string;
  complemento: string;
  bairro: string;
}

export interface RetroContatoForm {
  nome: string;
  cargo: string;
  telefone: string;
  email: string;
  decisor: boolean;
  ativo: boolean;
}

export interface CadastroRetroativoDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;

  // Main form
  retroForm: RetroFormState;
  setRetroForm: React.Dispatch<React.SetStateAction<RetroFormState>>;
  retroClientes: RetroCliente[];
  retroPlanos: RetroPlano[];
  retroModulos: RetroModulo[];
  retroVendedores: RetroVendedor[];
  retroSegmentos: RetroSegmento[];
  retroModulosSelecionados: ModuloAdicionadoItem[];
  setRetroModulosSelecionados: React.Dispatch<React.SetStateAction<ModuloAdicionadoItem[]>>;
  retroDescontoAtivo: boolean;
  setRetroDescontoAtivo: React.Dispatch<React.SetStateAction<boolean>>;
  retroClienteSearch: string;
  setRetroClienteSearch: React.Dispatch<React.SetStateAction<string>>;
  retroClienteSearchFocused: boolean;
  setRetroClienteSearchFocused: React.Dispatch<React.SetStateAction<boolean>>;
  retroSaving: boolean;
  handleRetroAddModulo: (moduloId: string) => void;
  handleSalvarRetroativo: () => void;

  // Computed values
  retroValorImpOriginal: number;
  retroValorMensOriginal: number;
  retroValorImpFinal: number;
  retroValorMensFinal: number;
  retroValorTotal: number;

  // Filiais list
  filiais: Filial[];

  // Nested client dialog
  openRetroClienteDialog: boolean;
  setOpenRetroClienteDialog: React.Dispatch<React.SetStateAction<boolean>>;
  retroClienteForm: RetroClienteFormState;
  setRetroClienteForm: React.Dispatch<React.SetStateAction<RetroClienteFormState>>;
  emptyRetroClienteForm: RetroClienteFormState;
  retroSavingCliente: boolean;
  retroLoadingCep: boolean;
  retroLoadingCnpj: boolean;
  retroCepError: string;
  retroCnpjError: string;
  setRetroCepError: React.Dispatch<React.SetStateAction<string>>;
  setRetroCnpjError: React.Dispatch<React.SetStateAction<string>>;
  handleRetroCepBlur: () => void;
  handleRetroCnpjBlur: () => void;
  handleRetroSaveCliente: (e: React.FormEvent) => void;

  // Contacts
  retroClienteContatos: RetroContatoForm[];
  setRetroClienteContatos: React.Dispatch<React.SetStateAction<RetroContatoForm[]>>;
  retroShowContatoForm: boolean;
  setRetroShowContatoForm: React.Dispatch<React.SetStateAction<boolean>>;
  retroEditingContatoIdx: number | null;
  setRetroEditingContatoIdx: React.Dispatch<React.SetStateAction<number | null>>;
  retroInlineContatoForm: RetroContatoForm;
  setRetroInlineContatoForm: React.Dispatch<React.SetStateAction<RetroContatoForm>>;
}

// ─── Component ────────────────────────────────────────────────────────────

export function CadastroRetroativoDialog(props: CadastroRetroativoDialogProps) {
  const {
    open, onOpenChange,
    retroForm, setRetroForm,
    retroClientes, retroPlanos, retroModulos, retroVendedores, retroSegmentos,
    retroModulosSelecionados, setRetroModulosSelecionados,
    retroDescontoAtivo, setRetroDescontoAtivo,
    retroClienteSearch, setRetroClienteSearch,
    retroClienteSearchFocused, setRetroClienteSearchFocused,
    retroSaving, handleRetroAddModulo, handleSalvarRetroativo,
    retroValorImpOriginal, retroValorMensOriginal,
    retroValorImpFinal, retroValorMensFinal, retroValorTotal,
    filiais,
    openRetroClienteDialog, setOpenRetroClienteDialog,
    retroClienteForm, setRetroClienteForm, emptyRetroClienteForm,
    retroSavingCliente, retroLoadingCep, retroLoadingCnpj,
    retroCepError, retroCnpjError, setRetroCepError, setRetroCnpjError,
    handleRetroCepBlur, handleRetroCnpjBlur, handleRetroSaveCliente,
    retroClienteContatos, setRetroClienteContatos,
    retroShowContatoForm, setRetroShowContatoForm,
    retroEditingContatoIdx, setRetroEditingContatoIdx,
    retroInlineContatoForm, setRetroInlineContatoForm,
  } = props;

  return (
    <>
      {/* Dialog Cadastro Retroativo */}
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="max-w-2xl flex flex-col h-[90vh] p-0 gap-0 overflow-hidden" onInteractOutside={(e) => e.preventDefault()}>
          <DialogHeader className="px-6 py-4 border-b border-border shrink-0">
            <DialogTitle>Cadastrar Contrato Retroativo</DialogTitle>
            <DialogDescription>
              Registre um contrato existente sem gerar documento, ZapSign ou WhatsApp.
            </DialogDescription>
          </DialogHeader>
          <div className="flex-1 overflow-y-auto px-6 py-4 space-y-5">

            {/* ── Cliente ── */}
            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <Label>Cliente *</Label>
                <Button type="button" variant="ghost" size="sm" className="h-6 px-2 text-xs gap-1 text-primary hover:text-primary"
                  onClick={() => { setRetroClienteForm(emptyRetroClienteForm); setRetroClienteContatos([]); setOpenRetroClienteDialog(true); }}>
                  <UserPlus className="h-3.5 w-3.5" /> Novo cliente
                </Button>
              </div>
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none" />
                <Input
                  className="pl-9 pr-8"
                  placeholder={retroForm.cliente_id ? retroClientes.find(c => c.id === retroForm.cliente_id)?.nome_fantasia || "Cliente selecionado" : "Buscar cliente pelo nome ou CNPJ..."}
                  value={retroClienteSearch}
                  autoComplete="off"
                  onFocus={() => setRetroClienteSearchFocused(true)}
                  onBlur={() => setTimeout(() => setRetroClienteSearchFocused(false), 300)}
                  onChange={(e) => {
                    setRetroClienteSearch(e.target.value);
                    if (!e.target.value && retroForm.cliente_id) setRetroForm(f => ({ ...f, cliente_id: "" }));
                  }}
                />
                {retroForm.cliente_id && (
                  <button type="button" className="absolute right-2.5 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                    onClick={() => { setRetroForm(f => ({ ...f, cliente_id: "" })); setRetroClienteSearch(""); }}>
                    <XCircle className="h-4 w-4" />
                  </button>
                )}
                {retroClienteSearchFocused && retroClienteSearch.trim() && !retroForm.cliente_id && (() => {
                  const q = retroClienteSearch.trim().toLowerCase();
                  const qNum = q.replace(/\D/g, "");
                  const filtered = retroClientes.filter(c =>
                    c.nome_fantasia.toLowerCase().includes(q) ||
                    (c.razao_social || "").toLowerCase().includes(q) ||
                    (qNum.length > 0 && (c.cnpj_cpf || "").replace(/\D/g, "").includes(qNum))
                  );
                  return (
                    <div className="absolute z-[9999] top-full mt-1 left-0 right-0 bg-background border border-border rounded-md shadow-xl max-h-52 overflow-y-auto">
                      {filtered.length === 0 ? (
                        <div className="px-3 py-2 text-sm text-muted-foreground">Nenhum cliente encontrado</div>
                      ) : filtered.slice(0, 20).map(c => (
                        <button key={c.id} type="button"
                          className="w-full text-left px-3 py-2 text-sm hover:bg-accent hover:text-accent-foreground transition-colors border-b border-border last:border-0"
                          onMouseDown={(e) => { e.preventDefault(); setRetroForm(f => ({ ...f, cliente_id: c.id })); setRetroClienteSearch(""); setRetroClienteSearchFocused(false); }}>
                          <div className="font-medium text-foreground">{c.nome_fantasia}</div>
                          {c.cnpj_cpf && <div className="text-xs text-muted-foreground font-mono">{c.cnpj_cpf}</div>}
                        </button>
                      ))}
                    </div>
                  );
                })()}
              </div>
              {retroForm.cliente_id && (
                <p className="text-xs text-emerald-600 flex items-center gap-1">
                  <CheckCircle2 className="h-3 w-3" />
                  {retroClientes.find(c => c.id === retroForm.cliente_id)?.nome_fantasia} selecionado
                </p>
              )}
            </div>

            {/* ── Data de Lançamento + Vendedor + Filial ── */}
            <div className="grid grid-cols-3 gap-3">
              <div className="space-y-1.5">
                <Label>Data de Lançamento *</Label>
                <Input type="date" value={retroForm.data_lancamento} onChange={(e) => setRetroForm(f => ({ ...f, data_lancamento: e.target.value }))} />
              </div>
              <div className="space-y-1.5">
                <Label>Vendedor *</Label>
                <Select value={retroForm.vendedor_id || "_none"} onValueChange={(v) => setRetroForm(f => ({ ...f, vendedor_id: v === "_none" ? "" : v }))}>
                  <SelectTrigger><SelectValue placeholder="Selecione..." /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="_none" disabled>Selecione...</SelectItem>
                    {retroVendedores.map(v => (
                      <SelectItem key={v.user_id} value={v.user_id}>{v.full_name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label>Filial *</Label>
                <Select value={retroForm.filial_id || "_none"} onValueChange={(v) => setRetroForm(f => ({ ...f, filial_id: v === "_none" ? "" : v }))}>
                  <SelectTrigger><SelectValue placeholder="Selecione..." /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="_none" disabled>Selecione...</SelectItem>
                    {filiais.filter(f => f.ativa).map(f => (
                      <SelectItem key={f.id} value={f.id}>{f.nome}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* ── Plano ── */}
            <div className="space-y-1.5">
              <Label>Plano</Label>
              <Select value={retroForm.plano_id || "_none"} onValueChange={(v) => setRetroForm(f => ({ ...f, plano_id: v === "_none" ? "" : v }))}>
                <SelectTrigger><SelectValue placeholder="Selecione o plano (opcional)" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="_none">Nenhum</SelectItem>
                  {retroPlanos.map(p => (
                    <SelectItem key={p.id} value={p.id}>{p.nome} {p.valor_mensalidade_padrao ? `— ${fmtBRL(p.valor_mensalidade_padrao)}/mês` : ""}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* ── Tipo + Status ── */}
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label>Tipo</Label>
                <Select value={retroForm.tipo} onValueChange={(v) => setRetroForm(f => ({ ...f, tipo: v }))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Base">Base</SelectItem>
                    <SelectItem value="Aditivo">Aditivo</SelectItem>
                    <SelectItem value="OA">OA</SelectItem>
                    <SelectItem value="Cancelamento">Cancelamento</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label>Status</Label>
                <Select value={retroForm.status} onValueChange={(v) => setRetroForm(f => ({ ...f, status: v }))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Ativo">Ativo</SelectItem>
                    <SelectItem value="Encerrado">Encerrado</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* ── Segmento ── */}
            <div className="space-y-1.5">
              <Label>Segmento *</Label>
              <Select value={retroForm.segmento_id || "_none"} onValueChange={(v) => setRetroForm(f => ({ ...f, segmento_id: v === "_none" ? "" : v }))}>
                <SelectTrigger><SelectValue placeholder="Selecione o segmento" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="_none" disabled>Selecione...</SelectItem>
                  {retroSegmentos.map(s => (
                    <SelectItem key={s.id} value={s.id}>{s.nome}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {retroForm.cliente_id && retroSegmentos.length === 0 && (
                <p className="text-xs text-amber-600">Nenhum segmento cadastrado para a filial deste cliente. Cadastre em Filiais → CRM.</p>
              )}
            </div>

            {/* ── Módulos Adicionais ── */}
            <div className="space-y-2">
              <Label>Módulos Adicionais</Label>
              <Select value="" onValueChange={handleRetroAddModulo}>
                <SelectTrigger><SelectValue placeholder="Adicionar módulo..." /></SelectTrigger>
                <SelectContent>
                  {retroModulos.filter(m => !retroModulosSelecionados.find(s => s.modulo_id === m.id)).map(m => (
                    <SelectItem key={m.id} value={m.id}>
                      {m.nome}
                      {(m.valor_implantacao_modulo || m.valor_mensalidade_modulo) && (
                        <span className="ml-2 text-xs text-muted-foreground">
                          {m.valor_implantacao_modulo ? `Impl: ${fmtBRL(m.valor_implantacao_modulo)}` : ""}
                          {m.valor_implantacao_modulo && m.valor_mensalidade_modulo ? " · " : ""}
                          {m.valor_mensalidade_modulo ? `Mens: ${fmtBRL(m.valor_mensalidade_modulo)}` : ""}
                        </span>
                      )}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {retroModulosSelecionados.length > 0 && (
                <div className="rounded-lg border border-border divide-y divide-border">
                  {retroModulosSelecionados.map((mod, idx) => (
                    <div key={mod.modulo_id} className="flex items-center gap-3 px-4 py-2.5">
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium truncate">{mod.nome}</p>
                        <p className="text-xs text-muted-foreground font-mono">
                          {mod.valor_implantacao_modulo > 0 && `Impl: ${fmtBRL(mod.valor_implantacao_modulo)}`}
                          {mod.valor_implantacao_modulo > 0 && mod.valor_mensalidade_modulo > 0 && " · "}
                          {mod.valor_mensalidade_modulo > 0 && `Mens: ${fmtBRL(mod.valor_mensalidade_modulo)}`}
                        </p>
                      </div>
                      <div className="flex items-center gap-2">
                        <Input type="number" min={1} value={mod.quantidade}
                          onChange={(e) => { const qty = parseInt(e.target.value) || 1; setRetroModulosSelecionados(prev => prev.map((m, i) => i === idx ? { ...m, quantidade: qty } : m)); }}
                          className="w-16 h-7 text-xs text-center" />
                        <div className="text-right text-xs font-mono text-foreground">
                          {mod.valor_implantacao_modulo > 0 && <div>Impl: {fmtBRL(mod.valor_implantacao_modulo * mod.quantidade)}</div>}
                          {mod.valor_mensalidade_modulo > 0 && <div>Mens: {fmtBRL(mod.valor_mensalidade_modulo * mod.quantidade)}</div>}
                        </div>
                        <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive hover:text-destructive"
                          onClick={() => setRetroModulosSelecionados(prev => prev.filter((_, i) => i !== idx))}>
                          <XCircle className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* ── Precificação ── */}
            {(retroForm.plano_id || retroModulosSelecionados.length > 0) && (
              <div className="rounded-xl border border-border bg-muted/30 p-4 space-y-4">
                <div className="flex items-center justify-between">
                  <p className="text-sm font-semibold text-foreground flex items-center gap-1.5">
                    <Tag className="h-4 w-4 text-muted-foreground" /> Precificação
                  </p>
                  <label className="flex items-center gap-2 cursor-pointer select-none">
                    <span className="text-xs text-muted-foreground">Aplicar desconto</span>
                    <Switch checked={retroDescontoAtivo} onCheckedChange={(v) => {
                      setRetroDescontoAtivo(v);
                      if (!v) setRetroForm(f => ({ ...f, desconto_implantacao_valor: "0", desconto_mensalidade_valor: "0" }));
                    }} />
                  </label>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1.5">
                    <Label className="text-xs text-muted-foreground">Implantação</Label>
                    <Input readOnly value={fmtBRL(retroDescontoAtivo ? retroValorImpOriginal : retroValorImpFinal)} className="bg-background font-mono text-sm" />
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-xs text-muted-foreground">Mensalidade</Label>
                    <Input readOnly value={fmtBRL(retroDescontoAtivo ? retroValorMensOriginal : retroValorMensFinal)} className="bg-background font-mono text-sm" />
                  </div>
                </div>

                {/* Dia da mensalidade */}
                <div className="space-y-1.5">
                  <Label className="text-xs text-muted-foreground">Dia da Mensalidade</Label>
                  <Input type="number" min="1" max="31" placeholder="Ex: 10" value={retroForm.dia_mensalidade || ""} onChange={(e) => setRetroForm(f => ({ ...f, dia_mensalidade: e.target.value }))} className="w-32" />
                </div>

                {retroDescontoAtivo && (
                  <div className="space-y-3 border-t border-border pt-3">
                    <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Descontos</p>
                    <div className="space-y-1.5">
                      <Label className="text-xs">Desconto — Implantação</Label>
                      <div className="flex gap-2">
                        <Select value={retroForm.desconto_implantacao_tipo} onValueChange={(v) => setRetroForm(f => ({ ...f, desconto_implantacao_tipo: v as "R$" | "%" }))}>
                          <SelectTrigger className="w-20"><SelectValue /></SelectTrigger>
                          <SelectContent><SelectItem value="R$">R$</SelectItem><SelectItem value="%">%</SelectItem></SelectContent>
                        </Select>
                        <Input type="number" min="0" step="0.01" value={retroForm.desconto_implantacao_valor} onChange={(e) => setRetroForm(f => ({ ...f, desconto_implantacao_valor: e.target.value }))} className="flex-1" placeholder="0" />
                        <Input readOnly value={fmtBRL(retroValorImpFinal)} className="w-36 bg-background font-mono text-sm text-primary font-semibold" />
                      </div>
                    </div>
                    <div className="space-y-1.5">
                      <Label className="text-xs">Desconto — Mensalidade</Label>
                      <div className="flex gap-2">
                        <Select value={retroForm.desconto_mensalidade_tipo} onValueChange={(v) => setRetroForm(f => ({ ...f, desconto_mensalidade_tipo: v as "R$" | "%" }))}>
                          <SelectTrigger className="w-20"><SelectValue /></SelectTrigger>
                          <SelectContent><SelectItem value="R$">R$</SelectItem><SelectItem value="%">%</SelectItem></SelectContent>
                        </Select>
                        <Input type="number" min="0" step="0.01" value={retroForm.desconto_mensalidade_valor} onChange={(e) => setRetroForm(f => ({ ...f, desconto_mensalidade_valor: e.target.value }))} className="flex-1" placeholder="0" />
                        <Input readOnly value={fmtBRL(retroValorMensFinal)} className="w-36 bg-background font-mono text-sm text-primary font-semibold" />
                      </div>
                    </div>
                    <div className="space-y-1.5">
                      <Label className="text-xs">Motivo do desconto</Label>
                      <Textarea placeholder="Informe o motivo do desconto..." value={retroForm.motivo_desconto} onChange={(e) => setRetroForm(f => ({ ...f, motivo_desconto: e.target.value }))} rows={2} />
                    </div>
                  </div>
                )}

                <div className="pt-2 border-t border-border">
                  <div className="space-y-1.5">
                    <Label className="text-xs text-muted-foreground">Valor total</Label>
                    <Input readOnly value={fmtBRL(retroValorTotal)} className="bg-background font-mono font-bold text-foreground" />
                  </div>
                </div>
              </div>
            )}

            {/* ── Forma de Pagamento ── */}
            <div className="rounded-xl border border-border bg-muted/30 p-4 space-y-4">
              <p className="text-sm font-semibold text-foreground">Forma de Pagamento</p>
              <div className="space-y-3 border-t border-border pt-3">
                <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Mensalidade</p>
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1.5">
                    <Label className="text-xs">Forma de pagamento</Label>
                    <Select value={retroForm.pagamento_mensalidade_forma} onValueChange={(v) => setRetroForm(f => ({ ...f, pagamento_mensalidade_forma: v }))}>
                      <SelectTrigger><SelectValue placeholder="Selecione..." /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="Boleto">Boleto</SelectItem>
                        <SelectItem value="PIX">PIX</SelectItem>
                        <SelectItem value="Cartão">Cartão</SelectItem>
                        <SelectItem value="Transferência">Transferência</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-xs">Observação</Label>
                    <Input placeholder="Ex: Vencimento todo dia 10" value={retroForm.pagamento_mensalidade_observacao} onChange={(e) => setRetroForm(f => ({ ...f, pagamento_mensalidade_observacao: e.target.value }))} />
                  </div>
                </div>
              </div>
              <div className="space-y-3 border-t border-border pt-3">
                <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Implantação</p>
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1.5">
                    <Label className="text-xs">Forma de pagamento</Label>
                    <Select value={retroForm.pagamento_implantacao_forma} onValueChange={(v) => setRetroForm(f => ({ ...f, pagamento_implantacao_forma: v }))}>
                      <SelectTrigger><SelectValue placeholder="Selecione..." /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="Boleto">Boleto</SelectItem>
                        <SelectItem value="PIX">PIX</SelectItem>
                        <SelectItem value="Cartão">Cartão</SelectItem>
                        <SelectItem value="Transferência">Transferência</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-xs">Parcelas</Label>
                    <Input type="number" min="1" placeholder="Nº de parcelas" value={retroForm.pagamento_implantacao_parcelas} onChange={(e) => setRetroForm(f => ({ ...f, pagamento_implantacao_parcelas: e.target.value }))} />
                  </div>
                  <div className="col-span-2 space-y-1.5">
                    <Label className="text-xs">Observação</Label>
                    <Input placeholder="Ex: À vista no ato da implantação" value={retroForm.pagamento_implantacao_observacao} onChange={(e) => setRetroForm(f => ({ ...f, pagamento_implantacao_observacao: e.target.value }))} />
                  </div>
                </div>
              </div>
            </div>

            {/* ── Observações ── */}
            <div className="space-y-1.5">
              <Label>Observações</Label>
              <Textarea placeholder="Observações adicionais..." value={retroForm.observacoes} onChange={(e) => setRetroForm(f => ({ ...f, observacoes: e.target.value }))} rows={3} />
            </div>
          </div>

          {/* Footer fixo */}
          <div className="px-6 py-4 border-t border-border shrink-0 flex justify-end gap-2">
            <Button variant="outline" onClick={() => onOpenChange(false)}>Cancelar</Button>
            <Button onClick={handleSalvarRetroativo} disabled={retroSaving}>
              {retroSaving ? <Loader2 className="h-4 w-4 animate-spin mr-1" /> : null}
              Cadastrar
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* ── Dialog Novo Cliente (dentro do retroativo) ── */}
      <Dialog open={openRetroClienteDialog} onOpenChange={(open) => { setOpenRetroClienteDialog(open); if (!open) { setRetroClienteContatos([]); setRetroShowContatoForm(false); } }}>
        <DialogContent className="max-w-xl max-h-[90vh] overflow-y-auto" onInteractOutside={(e) => e.preventDefault()}>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2"><UserPlus className="h-4 w-4" /> Cadastrar Novo Cliente</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleRetroSaveCliente} className="space-y-3">
            <div className="grid grid-cols-2 gap-3">
              <div className="col-span-2 space-y-1.5">
                <Label>CNPJ / CPF *</Label>
                <div className="relative">
                  <Input placeholder="00.000.000/0000-00" value={retroClienteForm.cnpj_cpf}
                    onChange={(e) => { setRetroCnpjError(""); setRetroClienteForm(f => ({ ...f, cnpj_cpf: e.target.value })); }}
                    onBlur={handleRetroCnpjBlur} required autoFocus
                    className={retroCnpjError ? "border-destructive pr-9" : "pr-9"} />
                  {retroLoadingCnpj && <Loader2 className="absolute right-2.5 top-1/2 -translate-y-1/2 h-4 w-4 animate-spin text-muted-foreground" />}
                </div>
                {retroCnpjError && <p className="flex items-center gap-1 text-xs text-destructive"><AlertCircle className="h-3 w-3" />{retroCnpjError}</p>}
              </div>
              <div className="col-span-2 space-y-1.5">
                <Label>Nome Fantasia *</Label>
                <Input placeholder="Nome fantasia..." value={retroClienteForm.nome_fantasia} onChange={(e) => setRetroClienteForm(f => ({ ...f, nome_fantasia: e.target.value }))} required />
              </div>
              <div className="col-span-2 space-y-1.5">
                <Label>Razão Social</Label>
                <Input placeholder="Razão social..." value={retroClienteForm.razao_social} onChange={(e) => setRetroClienteForm(f => ({ ...f, razao_social: e.target.value }))} />
              </div>

              <div className="col-span-2 pt-1">
                <div className="flex items-center gap-2 text-xs text-muted-foreground font-medium uppercase tracking-wide">
                  <MapPin className="h-3 w-3" /> Endereço
                </div>
              </div>
              <div className="space-y-1.5">
                <Label>CEP</Label>
                <div className="relative">
                  <Input placeholder="00000-000" value={retroClienteForm.cep}
                    onChange={(e) => { setRetroCepError(""); setRetroClienteForm(f => ({ ...f, cep: e.target.value })); }}
                    onBlur={handleRetroCepBlur} maxLength={9}
                    className={retroCepError ? "border-destructive pr-9" : "pr-9"} />
                  {retroLoadingCep && <Loader2 className="absolute right-2.5 top-1/2 -translate-y-1/2 h-4 w-4 animate-spin text-muted-foreground" />}
                </div>
                {retroCepError && <p className="flex items-center gap-1 text-xs text-destructive"><AlertCircle className="h-3 w-3" />{retroCepError}</p>}
              </div>
              <div className="space-y-1.5"><Label>Logradouro</Label><Input placeholder="Rua / Avenida..." value={retroClienteForm.logradouro} onChange={(e) => setRetroClienteForm(f => ({ ...f, logradouro: e.target.value }))} /></div>
              <div className="space-y-1.5"><Label>Número</Label><Input placeholder="Ex: 123" value={retroClienteForm.numero} onChange={(e) => setRetroClienteForm(f => ({ ...f, numero: e.target.value }))} /></div>
              <div className="space-y-1.5"><Label>Complemento</Label><Input placeholder="Apto, Sala..." value={retroClienteForm.complemento} onChange={(e) => setRetroClienteForm(f => ({ ...f, complemento: e.target.value }))} /></div>
              <div className="space-y-1.5"><Label>Bairro</Label><Input placeholder="Bairro" value={retroClienteForm.bairro} onChange={(e) => setRetroClienteForm(f => ({ ...f, bairro: e.target.value }))} /></div>
              <div className="space-y-1.5"><Label>Cidade</Label><Input placeholder="Cidade" value={retroClienteForm.cidade} onChange={(e) => setRetroClienteForm(f => ({ ...f, cidade: e.target.value }))} /></div>
              <div className="space-y-1.5">
                <Label>UF</Label>
                <Select value={retroClienteForm.uf} onValueChange={(v) => setRetroClienteForm(f => ({ ...f, uf: v }))}>
                  <SelectTrigger><SelectValue placeholder="UF" /></SelectTrigger>
                  <SelectContent>{UF_LIST.map(uf => <SelectItem key={uf} value={uf}>{uf}</SelectItem>)}</SelectContent>
                </Select>
              </div>

              {/* ── Contatos ── */}
              <div className="col-span-2 pt-2">
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-2 text-xs text-muted-foreground font-medium uppercase tracking-wide">
                    <Users className="h-3.5 w-3.5" /> Contatos <span className="text-destructive">*</span>
                    <span className="text-xs font-normal normal-case">(obrigatório ao menos 1)</span>
                  </div>
                  {!retroShowContatoForm && (
                    <Button type="button" size="sm" variant="outline" className="gap-1.5 h-7 text-xs"
                      onClick={() => { setRetroEditingContatoIdx(null); setRetroInlineContatoForm({ nome: "", cargo: "", telefone: "", email: "", decisor: false, ativo: true }); setRetroShowContatoForm(true); }}>
                      <Plus className="h-3 w-3" /> Adicionar contato
                    </Button>
                  )}
                </div>

                {retroClienteContatos.length > 0 && (
                  <div className="rounded-lg border border-border divide-y divide-border mb-2">
                    {retroClienteContatos.map((ct, idx) => (
                      <div key={idx} className="flex items-center gap-3 px-3 py-2">
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-1.5">
                            <p className="text-sm font-medium truncate">{ct.nome}</p>
                            {ct.decisor && <span className="inline-flex items-center gap-0.5 text-xs px-1.5 py-0.5 rounded-full bg-primary/10 text-primary font-medium shrink-0"><Star className="h-2.5 w-2.5 fill-current" /> Decisor</span>}
                          </div>
                          <div className="flex gap-2 mt-0.5">
                            {ct.cargo && <span className="text-xs text-muted-foreground">{ct.cargo}</span>}
                            {ct.telefone && <span className="text-xs text-muted-foreground">{ct.telefone}</span>}
                          </div>
                        </div>
                        <div className="flex items-center gap-0.5 shrink-0">
                          <Button type="button" variant="ghost" size="icon" className={`h-6 w-6 ${ct.decisor ? "text-primary" : "text-muted-foreground"}`}
                            onClick={() => setRetroClienteContatos(prev => prev.map((c, i) => ({ ...c, decisor: i === idx ? !c.decisor : (ct.decisor ? c.decisor : false) })))}>
                            <Star className={`h-3 w-3 ${ct.decisor ? "fill-current" : ""}`} />
                          </Button>
                          <Button type="button" variant="ghost" size="icon" className="h-6 w-6"
                            onClick={() => { setRetroEditingContatoIdx(idx); setRetroInlineContatoForm({ ...ct }); setRetroShowContatoForm(true); }}>
                            <Pencil className="h-3 w-3" />
                          </Button>
                          <Button type="button" variant="ghost" size="icon" className="h-6 w-6 text-destructive hover:text-destructive"
                            onClick={() => setRetroClienteContatos(prev => prev.filter((_, i) => i !== idx))}>
                            <Trash2 className="h-3 w-3" />
                          </Button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}

                {retroClienteContatos.length === 0 && !retroShowContatoForm && (
                  <div className="rounded-lg border border-dashed border-destructive/40 bg-destructive/5 px-4 py-3 text-sm text-muted-foreground text-center mb-2">
                    <Users className="h-4 w-4 mx-auto mb-1" /> Nenhum contato cadastrado. Adicione pelo menos um contato.
                  </div>
                )}

                {retroShowContatoForm && (
                  <div className="rounded-lg border border-border bg-muted/30 p-3 space-y-3">
                    <p className="text-xs font-medium text-foreground">{retroEditingContatoIdx !== null ? "Editar contato" : "Novo contato"}</p>
                    <div className="grid grid-cols-2 gap-2">
                      <div className="col-span-2 space-y-1"><Label className="text-xs">Nome *</Label><Input className="h-8 text-sm" value={retroInlineContatoForm.nome} onChange={(e) => setRetroInlineContatoForm(f => ({ ...f, nome: e.target.value }))} placeholder="Nome completo" /></div>
                      <div className="space-y-1"><Label className="text-xs">Cargo</Label><Input className="h-8 text-sm" value={retroInlineContatoForm.cargo} onChange={(e) => setRetroInlineContatoForm(f => ({ ...f, cargo: e.target.value }))} placeholder="Cargo / função" /></div>
                      <div className="space-y-1"><Label className="text-xs">Telefone</Label><Input className="h-8 text-sm" value={retroInlineContatoForm.telefone} onChange={(e) => setRetroInlineContatoForm(f => ({ ...f, telefone: e.target.value }))} placeholder="(00) 00000-0000" /></div>
                      <div className="col-span-2 space-y-1"><Label className="text-xs">E-mail</Label><Input className="h-8 text-sm" type="email" value={retroInlineContatoForm.email} onChange={(e) => setRetroInlineContatoForm(f => ({ ...f, email: e.target.value }))} placeholder="email@empresa.com" /></div>
                      <div className="col-span-2 flex items-center gap-3">
                        <Checkbox id="retro-cli-decisor" checked={retroInlineContatoForm.decisor} onCheckedChange={(v) => setRetroInlineContatoForm(f => ({ ...f, decisor: !!v }))} />
                        <Label htmlFor="retro-cli-decisor" className="text-xs cursor-pointer">Decisor (tomador de decisão)</Label>
                      </div>
                    </div>
                    <div className="flex gap-2 justify-end">
                      <Button type="button" variant="outline" size="sm" className="h-7 text-xs" onClick={() => { setRetroShowContatoForm(false); setRetroEditingContatoIdx(null); }}>Cancelar</Button>
                      <Button type="button" size="sm" className="h-7 text-xs" onClick={() => {
                        if (!retroInlineContatoForm.nome.trim()) { return; }
                        if (retroEditingContatoIdx !== null) {
                          setRetroClienteContatos(prev => prev.map((c, i) => i === retroEditingContatoIdx ? { ...retroInlineContatoForm } : c));
                        } else {
                          setRetroClienteContatos(prev => [...(retroInlineContatoForm.decisor ? prev.map(c => ({ ...c, decisor: false })) : prev), { ...retroInlineContatoForm }]);
                        }
                        setRetroShowContatoForm(false);
                        setRetroEditingContatoIdx(null);
                        setRetroInlineContatoForm({ nome: "", cargo: "", telefone: "", email: "", decisor: false, ativo: true });
                      }}>
                        {retroEditingContatoIdx !== null ? "Salvar" : "Adicionar"}
                      </Button>
                    </div>
                  </div>
                )}
              </div>
            </div>
            <div className="flex justify-end gap-2 pt-2">
              <Button type="button" variant="outline" onClick={() => setOpenRetroClienteDialog(false)}>Cancelar</Button>
              <Button type="submit" disabled={retroSavingCliente || retroLoadingCep || retroLoadingCnpj}>
                {retroLoadingCep || retroLoadingCnpj ? <><Loader2 className="h-4 w-4 animate-spin mr-2" />Consultando...</> :
                 retroSavingCliente ? <><Loader2 className="h-4 w-4 animate-spin mr-2" />Salvando...</> : "Cadastrar cliente"}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </>
  );
}
