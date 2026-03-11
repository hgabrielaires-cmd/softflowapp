import { useRef } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
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
import { ClientePlanViewer } from "@/components/ClientePlanViewer";
import {
  Plus, Search, Pencil, XCircle, Loader2, Tag,
  ArrowUpCircle, FileText, AlertCircle, CheckCircle,
  UserPlus, MessageSquare, Paperclip, Trash2,
} from "lucide-react";
import type {
  FormState, ModuloOpcional, ModuloAdicionadoItem,
  ServicoAdicionadoItem, DraftComentario, ClienteContatoInline,
  ClienteFormState,
} from "../types";
import { PRIORIDADE_MAP_DRAFT, emptyClienteForm } from "../constants";
import { fmtBRL } from "../helpers";
import type { Cliente, Filial, Profile, Contrato } from "@/lib/supabase-types";

interface FilialOption { id: string; nome: string; }

// ─── Props ────────────────────────────────────────────────────────────────────

export interface PedidoFormDialogProps {
  // Dialog state
  open: boolean;
  onOpenChange: (v: boolean) => void;
  editingPedido: any | null;
  saving: boolean;
  onSubmit: (e: React.FormEvent) => void;

  // Form state
  form: FormState;
  setForm: React.Dispatch<React.SetStateAction<FormState>>;

  // Client search
  clienteSearch: string;
  setClienteSearch: (v: string) => void;
  clienteSearchFocused: boolean;
  setClienteSearchFocused: (v: boolean) => void;
  clientesDisponiveis: Cliente[];
  onClienteChange: (clienteId: string) => void;

  // Client dialog
  setClienteContatos: React.Dispatch<React.SetStateAction<ClienteContatoInline[]>>;
  setOpenClienteDialog: (v: boolean) => void;
  setClienteForm: React.Dispatch<React.SetStateAction<ClienteFormState>>;

  // Contrato
  contratoAtivo: Contrato | null;
  loadingContrato: boolean;
  onIniciarUpgrade: () => void;
  onIniciarAditivo: () => void;
  onIniciarOA: () => void;

  // Plan
  planos: any[];
  planoSelecionado: any | null;
  onPlanoChange: (planoId: string) => void;
  planoAnteriorValores: { implantacao: number; mensalidade: number } | null;
  planoImplFilial: number;
  planoMensFilial: number;

  // Modules
  modulosDisponiveis: ModuloOpcional[];
  loadingModulos: boolean;
  moduloBuscaId: string;
  setModuloBuscaId: (v: string) => void;
  moduloBuscaQtd: string;
  setModuloBuscaQtd: (v: string) => void;
  modulosJaContratados: ModuloAdicionadoItem[];
  onAdicionarModulo: () => void;
  onRemoverModulo: (moduloId: string) => void;

  // Services (OA)
  servicosCatalogo: any[];
  servicoBuscaId: string;
  setServicoBuscaId: (v: string) => void;
  servicoBuscaQtd: string;
  setServicoBuscaQtd: (v: string) => void;
  onAdicionarServico: () => void;
  onRemoverServico: (servicoId: string) => void;
  totalServicosOA: number;

  // Filial / Vendedor
  filiais: Filial[];
  filiaisDoUsuario: FilialOption[];
  todasFiliais: FilialOption[];
  vendedores: any[];
  isAdmin: boolean;
  profile: Profile | null;
  loadPlano: (planoId: string, modulos: ModuloAdicionadoItem[], filialIdOverride?: string) => void;

  // Pricing
  descontoAtivo: boolean;
  setDescontoAtivo: (v: boolean) => void;
  acrescimoAtivo: boolean;
  setAcrescimoAtivo: (v: boolean) => void;
  valorImplantacaoOriginal: number;
  valorMensalidadeOriginal: number;
  valorImpComAcrescimo: number;
  valorMensComAcrescimo: number;
  valorImplantacaoFinal: number;
  valorMensalidadeFinal: number;
  valorTotal: number;

  // Discount limits
  limiteDesconto: { implantacao: number; mensalidade: number } | null;
  descontoImpExcedido: boolean;
  descontoMensExcedido: boolean;
  descontoExcedido: boolean;
  bloqueadoPorDesconto: boolean;
  descontoImpPercAtual: number;
  descontoMensPercAtual: number;
  limiteImpAtual: number;
  limiteMensAtual: number;

  // Filial params
  filialParametros: any | null;

  // Draft comments
  draftComentarios: DraftComentario[];
  setDraftComentarios: React.Dispatch<React.SetStateAction<DraftComentario[]>>;
  setOpenComentarioDialog: (v: boolean) => void;
  setEditingDraftIdx: (v: number | null) => void;
  setDraftTexto: (v: string) => void;
  setDraftPrioridade: (v: string) => void;
  setDraftArquivo: (v: File | null) => void;

  // Data for lists
  clientes: Cliente[];
}

// ─── Component ────────────────────────────────────────────────────────────────

export function PedidoFormDialog(props: PedidoFormDialogProps) {
  const {
    open, onOpenChange, editingPedido, saving, onSubmit,
    form, setForm,
    clienteSearch, setClienteSearch, clienteSearchFocused, setClienteSearchFocused,
    clientesDisponiveis, onClienteChange,
    setClienteContatos, setOpenClienteDialog, setClienteForm,
    contratoAtivo, loadingContrato,
    onIniciarUpgrade, onIniciarAditivo, onIniciarOA,
    planos, planoSelecionado, onPlanoChange, planoAnteriorValores,
    planoImplFilial, planoMensFilial,
    modulosDisponiveis, loadingModulos, moduloBuscaId, setModuloBuscaId,
    moduloBuscaQtd, setModuloBuscaQtd, modulosJaContratados,
    onAdicionarModulo, onRemoverModulo,
    servicosCatalogo, servicoBuscaId, setServicoBuscaId,
    servicoBuscaQtd, setServicoBuscaQtd,
    onAdicionarServico, onRemoverServico, totalServicosOA,
    filiais, filiaisDoUsuario, todasFiliais, vendedores,
    isAdmin, profile, loadPlano,
    descontoAtivo, setDescontoAtivo, acrescimoAtivo, setAcrescimoAtivo,
    valorImplantacaoOriginal, valorMensalidadeOriginal,
    valorImpComAcrescimo, valorMensComAcrescimo,
    valorImplantacaoFinal, valorMensalidadeFinal, valorTotal,
    limiteDesconto, descontoImpExcedido, descontoMensExcedido,
    descontoExcedido, bloqueadoPorDesconto,
    descontoImpPercAtual, descontoMensPercAtual, limiteImpAtual, limiteMensAtual,
    filialParametros,
    draftComentarios, setDraftComentarios,
    setOpenComentarioDialog, setEditingDraftIdx,
    setDraftTexto, setDraftPrioridade, setDraftArquivo,
    clientes,
  } = props;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl flex flex-col h-[90vh] p-0 gap-0 overflow-hidden" onInteractOutside={(e) => e.preventDefault()}>
        <DialogHeader className="px-6 py-4 border-b border-border shrink-0">
          <DialogTitle className="flex items-center gap-2">
            {form.tipo_pedido === "Upgrade" && <ArrowUpCircle className="h-4 w-4 text-primary" />}
            {form.tipo_pedido === "Aditivo" && <FileText className="h-4 w-4 text-primary" />}
            {form.tipo_pedido === "OA" && <Tag className="h-4 w-4 text-teal-600" />}
            {editingPedido ? "Editar Pedido" : `Novo Pedido${form.tipo_pedido !== "Novo" ? ` — ${form.tipo_pedido === "OA" ? "Ordem de Atendimento" : form.tipo_pedido}` : ""}`}
          </DialogTitle>
        </DialogHeader>
        <form onSubmit={onSubmit} className="flex flex-col flex-1 min-h-0">
          <div className="flex-1 overflow-y-auto px-6 py-4 space-y-5">

          {/* ── Cliente ── */}
          <div className="space-y-1.5">
            <div className="flex items-center justify-between">
              <Label>Cliente *</Label>
              <Button type="button" variant="ghost" size="sm" className="h-6 px-2 text-xs gap-1 text-primary hover:text-primary"
                tabIndex={-1}
                onClick={() => { setClienteForm(emptyClienteForm); setClienteContatos([]); setOpenClienteDialog(true); }}>
                <UserPlus className="h-3.5 w-3.5" /> Novo cliente
              </Button>
            </div>
            {/* Campo de busca com dropdown de clientes */}
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none" />
              <Input
                className="pl-9 pr-8"
                placeholder={form.cliente_id
                  ? clientesDisponiveis.find(c => c.id === form.cliente_id)?.nome_fantasia || "Cliente selecionado"
                  : "Buscar cliente pelo nome ou CNPJ..."}
                value={clienteSearch}
                autoComplete="off"
                onFocus={() => setClienteSearchFocused(true)}
                onBlur={() => setTimeout(() => setClienteSearchFocused(false), 300)}
                onChange={(e) => {
                  setClienteSearch(e.target.value);
                  if (!e.target.value && form.cliente_id) {
                    setForm(f => ({ ...f, cliente_id: "", plano_id: "", tipo_pedido: "Novo", contrato_id: null }));
                  }
                }}
              />
              {form.cliente_id && (
                <button type="button" className="absolute right-2.5 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                  onClick={() => { setForm(f => ({ ...f, cliente_id: "", plano_id: "", tipo_pedido: "Novo", contrato_id: null })); setClienteSearch(""); }}>
                  <XCircle className="h-4 w-4" />
                </button>
              )}
              {/* Dropdown de resultados */}
              {clienteSearchFocused && clienteSearch.trim() && !form.cliente_id && (() => {
                const q = clienteSearch.trim().toLowerCase();
                const qNum = q.replace(/\D/g, "");
                const filtered = clientesDisponiveis.filter(c =>
                  c.nome_fantasia.toLowerCase().includes(q) ||
                  (c.razao_social || "").toLowerCase().includes(q) ||
                  (qNum.length > 0 && (c.cnpj_cpf || "").replace(/\D/g, "").includes(qNum))
                );
                return (
                  <div className="absolute z-[9999] top-full mt-1 left-0 right-0 bg-white border border-border rounded-md shadow-xl max-h-52 overflow-y-auto">
                    {filtered.length === 0 ? (
                      <div className="px-3 py-2 text-sm text-muted-foreground">Nenhum cliente encontrado</div>
                    ) : (
                      filtered.slice(0, 20).map(c => (
                        <button
                          key={c.id}
                          type="button"
                          className="w-full text-left px-3 py-2 text-sm hover:bg-accent hover:text-accent-foreground transition-colors border-b border-border last:border-0"
                          onMouseDown={(e) => {
                            e.preventDefault();
                            e.stopPropagation();
                            onClienteChange(c.id);
                            setClienteSearch("");
                            setClienteSearchFocused(false);
                          }}
                        >
                          <div className="font-medium text-foreground">{c.nome_fantasia}</div>
                          {c.razao_social && c.razao_social !== c.nome_fantasia && (
                            <div className="text-xs text-muted-foreground">{c.razao_social}</div>
                          )}
                          {c.cnpj_cpf && <div className="text-xs text-muted-foreground font-mono">{c.cnpj_cpf}</div>}
                        </button>
                      ))
                    )}
                  </div>
                );
              })()}
            </div>
            {form.cliente_id && (
              <p className="text-xs text-success flex items-center gap-1">
                <CheckCircle className="h-3 w-3" />
                {clientesDisponiveis.find(c => c.id === form.cliente_id)?.nome_fantasia} selecionado
              </p>
            )}

            {/* Contrato ativo detectado */}
            {loadingContrato && (
              <p className="text-xs text-muted-foreground flex items-center gap-1.5">
                <Loader2 className="h-3 w-3 animate-spin" /> Verificando contratos...
              </p>
            )}
            {!loadingContrato && contratoAtivo && form.tipo_pedido === "Novo" && (
              <div className="rounded-lg border border-amber-200 bg-amber-50 px-3 py-2.5 flex items-start gap-2.5">
                <AlertCircle className="h-4 w-4 text-amber-600 mt-0.5 shrink-0" />
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-amber-800">
                    Contrato ativo: Nº {contratoAtivo.numero_registro} ({contratoAtivo.numero_exibicao})
                  </p>
                  <p className="text-xs text-amber-700 mt-0.5">Este cliente já possui contrato ativo. Selecione a ação desejada:</p>
                  <div className="flex flex-wrap gap-2 mt-2 items-center">
                    <Button type="button" size="sm" variant="outline" className="h-7 text-xs gap-1.5 border-amber-300 text-amber-800 hover:bg-amber-100"
                      onClick={onIniciarUpgrade}>
                      <ArrowUpCircle className="h-3.5 w-3.5" /> Upgrade de Plano
                    </Button>
                    <Button type="button" size="sm" variant="outline" className="h-7 text-xs gap-1.5 border-amber-300 text-amber-800 hover:bg-amber-100"
                      onClick={onIniciarAditivo}>
                      <FileText className="h-3.5 w-3.5" /> Adicionar Módulo (Aditivo)
                    </Button>
                    <Button type="button" size="sm" variant="outline" className="h-7 text-xs gap-1.5 border-teal-300 text-teal-800 hover:bg-teal-100"
                      onClick={onIniciarOA}>
                      <Tag className="h-3.5 w-3.5" /> Ordem de Atendimento
                    </Button>
                    <ClientePlanViewer
                      clienteId={form.cliente_id}
                      clienteNome={clientes.find(c => c.id === form.cliente_id)?.nome_fantasia}
                      variant="text"
                      className="border-primary/30 text-primary hover:bg-primary/10"
                    />
                  </div>
                </div>
              </div>
            )}
            {!loadingContrato && contratoAtivo && form.tipo_pedido === "Aditivo" && (
              <div className="rounded-lg border border-blue-200 bg-blue-50 px-3 py-2 text-xs text-blue-800">
                <FileText className="h-3 w-3 inline mr-1" />
                Aditivo ao contrato Nº {contratoAtivo.numero_registro} ({contratoAtivo.numero_exibicao})
              </div>
            )}
            {!loadingContrato && contratoAtivo && form.tipo_pedido === "Upgrade" && (
              <div className="rounded-lg border border-green-200 bg-green-50 px-3 py-2 space-y-1">
                <p className="text-xs text-green-800">
                  <ArrowUpCircle className="h-3 w-3 inline mr-1" />
                  Upgrade do contrato Nº {contratoAtivo.numero_registro} ({contratoAtivo.numero_exibicao})
                </p>
                {planoAnteriorValores && planoSelecionado && (
                  <p className="text-xs text-green-700 font-mono">
                    Diferença Impl: {fmtBRL(Math.max(0, planoImplFilial - planoAnteriorValores.implantacao))}
                    {" · "}
                    Diferença Mens: {fmtBRL(Math.max(0, planoMensFilial - planoAnteriorValores.mensalidade))}
                  </p>
                )}
              </div>
            )}
            {!loadingContrato && contratoAtivo && form.tipo_pedido === "OA" && (
              <div className="rounded-lg border border-teal-200 bg-teal-50 px-3 py-2 text-xs text-teal-800">
                <Tag className="h-3 w-3 inline mr-1" />
                Ordem de Atendimento vinculada ao contrato Nº {contratoAtivo.numero_registro} ({contratoAtivo.numero_exibicao})
              </div>
            )}
          </div>

          {/* ── Plano ── */}
          {form.tipo_pedido !== "Aditivo" && form.tipo_pedido !== "OA" && (
            <div className="space-y-1.5">
              <Label>Plano *</Label>
              {contratoAtivo && form.tipo_pedido === "Novo" ? (
                <div className="rounded-md border border-input bg-muted px-3 py-2 text-sm text-muted-foreground cursor-not-allowed">
                  Selecione uma ação acima (Upgrade, Aditivo ou OA)
                </div>
              ) : (
                <Select value={form.plano_id} onValueChange={onPlanoChange} disabled={form.tipo_pedido === "Upgrade" && !!form.plano_id}>
                  <SelectTrigger><SelectValue placeholder="Selecione o plano..." /></SelectTrigger>
                  <SelectContent>
                    {planos.map((p) => <SelectItem key={p.id} value={p.id}>{p.nome}</SelectItem>)}
                  </SelectContent>
                </Select>
              )}
            </div>
          )}
          {form.tipo_pedido === "Aditivo" && form.plano_id && (
            <div className="space-y-1.5">
              <Label>Plano de referência</Label>
              <Input readOnly value={planos.find(p => p.id === form.plano_id)?.nome || "—"} className="bg-muted cursor-not-allowed" />
            </div>
          )}
          {form.tipo_pedido === "OA" && form.plano_id && (
            <div className="space-y-1.5">
              <Label>Plano de referência</Label>
              <Input readOnly value={planos.find(p => p.id === form.plano_id)?.nome || "—"} className="bg-muted cursor-not-allowed" />
            </div>
          )}

          {/* ── Serviços (para OA) ── */}
          {form.tipo_pedido === "OA" && (
            <div className="space-y-3">
              <Label>Serviços *</Label>
              <div className="flex gap-2 items-end">
                <div className="flex-1 space-y-1">
                  <Label className="text-xs text-muted-foreground">Serviço</Label>
                  <Select value={servicoBuscaId} onValueChange={setServicoBuscaId}>
                    <SelectTrigger>
                      <SelectValue placeholder="Selecione o serviço..." />
                    </SelectTrigger>
                    <SelectContent>
                      {servicosCatalogo.length === 0
                        ? <SelectItem value="_none" disabled>Nenhum serviço cadastrado</SelectItem>
                        : servicosCatalogo.map((s) => (
                          <SelectItem key={s.id} value={s.id}>
                            {s.nome} — {fmtBRL(s.valor)}/{s.unidade_medida}
                          </SelectItem>
                        ))
                      }
                    </SelectContent>
                  </Select>
                </div>
                <div className="w-24 space-y-1">
                  <Label className="text-xs text-muted-foreground">Qtd</Label>
                  <Input
                    type="number" min="1" step="1"
                    value={servicoBuscaQtd}
                    onChange={(e) => setServicoBuscaQtd(e.target.value)}
                  />
                </div>
                <Button type="button" variant="outline" onClick={onAdicionarServico} className="gap-1.5">
                  <Plus className="h-4 w-4" /> Adicionar
                </Button>
              </div>

              {form.servicos_pedido.length > 0 && (
                <div className="rounded-lg border border-border divide-y divide-border">
                  {form.servicos_pedido.map((s) => (
                    <div key={s.servico_id} className="flex items-center gap-3 px-4 py-2.5">
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium truncate">{s.nome}</p>
                        <p className="text-xs text-muted-foreground font-mono">
                          {fmtBRL(s.valor_unitario)}/{s.unidade_medida}
                        </p>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="text-sm text-muted-foreground">Qtd: <strong>{s.quantidade}</strong></span>
                        <div className="text-right text-xs font-mono text-foreground">
                          {fmtBRL(s.valor_unitario * s.quantidade)}
                        </div>
                        <Button
                          type="button" variant="ghost" size="icon"
                          className="h-7 w-7 text-destructive hover:text-destructive"
                          onClick={() => onRemoverServico(s.servico_id)}
                        >
                          <XCircle className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  ))}
                  <div className="px-4 py-2 bg-muted/50 text-sm font-semibold flex justify-between">
                    <span>Total Serviços</span>
                    <span className="font-mono">{fmtBRL(totalServicosOA)}</span>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* ── Tipo de Atendimento (OA) ── */}
          {form.tipo_pedido === "OA" && (
            <div className="space-y-1.5">
              <Label>Tipo de Atendimento *</Label>
              <Select value={form.tipo_atendimento} onValueChange={(v) => setForm((f) => ({ ...f, tipo_atendimento: v as "Interno" | "Externo" }))}>
                <SelectTrigger className={!form.tipo_atendimento ? "border-destructive" : ""}>
                  <SelectValue placeholder="Selecione..." />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Interno">Interno</SelectItem>
                  <SelectItem value="Externo">Externo</SelectItem>
                </SelectContent>
              </Select>
            </div>
          )}

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label>Filial *</Label>
              {isAdmin || filiaisDoUsuario.length > 1 ? (
                <Select value={form.filial_id} onValueChange={(v) => {
                  setForm((f) => ({ ...f, filial_id: v }));
                  if (form.plano_id) {
                    loadPlano(form.plano_id, form.modulos_adicionais, v);
                  }
                }}>
                  <SelectTrigger><SelectValue placeholder="Selecione..." /></SelectTrigger>
                  <SelectContent>
                    {(filiaisDoUsuario.length > 0 ? filiaisDoUsuario : todasFiliais).map((f) => <SelectItem key={f.id} value={f.id}>{f.nome}</SelectItem>)}
                  </SelectContent>
                </Select>
              ) : (
                <Input readOnly value={filiaisDoUsuario.find((f) => f.id === form.filial_id)?.nome || filiais.find((f) => f.id === form.filial_id)?.nome || "—"} className="bg-muted cursor-not-allowed" />
              )}
            </div>
            <div className="space-y-1.5">
              <Label>Vendedor *</Label>
              {isAdmin ? (
                 <Select value={form.vendedor_id} onValueChange={(v) => {
                   const vend = vendedores.find((vv) => vv.user_id === v);
                   setForm((f) => ({
                     ...f,
                     vendedor_id: v,
                     comissao_percentual: vend?.comissao_implantacao_percentual?.toString() ?? vend?.comissao_percentual?.toString() ?? f.comissao_percentual,
                     comissao_implantacao_percentual: vend?.comissao_implantacao_percentual?.toString() ?? vend?.comissao_percentual?.toString() ?? f.comissao_implantacao_percentual,
                     comissao_mensalidade_percentual: vend?.comissao_mensalidade_percentual?.toString() ?? vend?.comissao_percentual?.toString() ?? f.comissao_mensalidade_percentual,
                     comissao_servico_percentual: vend?.comissao_servico_percentual?.toString() ?? f.comissao_servico_percentual,
                   }));
                 }}>
                   <SelectTrigger><SelectValue placeholder="Selecione..." /></SelectTrigger>
                   <SelectContent>
                     {vendedores.map((v) => <SelectItem key={v.user_id} value={v.user_id}>{v.full_name}</SelectItem>)}
                  </SelectContent>
                </Select>
              ) : (
                <Input readOnly value={vendedores.find((v: any) => v.user_id === form.vendedor_id)?.full_name || profile?.full_name || "—"} className="bg-muted cursor-not-allowed" />
              )}
            </div>
          </div>

          {/* ── Módulos Adicionais ── */}
          {form.plano_id && form.tipo_pedido !== "OA" && form.tipo_pedido !== "Upgrade" && (
            <div className="space-y-3">
              <Label>Módulos Adicionais</Label>

              {/* Info: módulos já contratados (Aditivo) */}
              {form.tipo_pedido === "Aditivo" && modulosJaContratados.length > 0 && (
                <div className="rounded-lg border border-blue-200 bg-blue-50 px-3 py-2 space-y-1">
                  <p className="text-xs font-medium text-blue-800">Módulos já contratados (não serão cobrados novamente):</p>
                  {modulosJaContratados.map((m) => (
                    <p key={m.modulo_id} className="text-xs text-blue-700">
                      • {m.nome} (Qtd: {m.quantidade})
                      {m.valor_mensalidade_modulo > 0 && ` — Mens: ${fmtBRL(m.valor_mensalidade_modulo * m.quantidade)}`}
                    </p>
                  ))}
                </div>
              )}

              {/* Seletor + quantidade + botão adicionar */}
              <div className="flex gap-2 items-end">
                <div className="flex-1 space-y-1">
                  <Label className="text-xs text-muted-foreground">Módulo</Label>
                  {loadingModulos ? (
                    <p className="text-sm text-muted-foreground">Carregando...</p>
                  ) : (
                    <Select value={moduloBuscaId} onValueChange={setModuloBuscaId}>
                      <SelectTrigger>
                        <SelectValue placeholder="Selecione o módulo..." />
                      </SelectTrigger>
                      <SelectContent>
                        {(() => {
                          const idsJaContratados = form.tipo_pedido === "Aditivo"
                            ? modulosJaContratados.map(m => m.modulo_id)
                            : [];
                          const modulosFiltrados = modulosDisponiveis.filter(
                            m => !idsJaContratados.includes(m.id) || m.permite_revenda
                          );
                          return modulosFiltrados.length === 0
                            ? <SelectItem value="_none" disabled>
                                {form.tipo_pedido === "Aditivo" ? "Todos os módulos já estão contratados" : "Nenhum módulo disponível"}
                              </SelectItem>
                            : modulosFiltrados.map((m) => (
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
                            ));
                        })()}
                      </SelectContent>
                    </Select>
                  )}
                </div>
                <div className="w-24 space-y-1">
                  <Label className="text-xs text-muted-foreground">Qtd</Label>
                  <Input
                    type="number" min="1" step="1"
                    value={moduloBuscaQtd}
                    onChange={(e) => setModuloBuscaQtd(e.target.value)}
                  />
                </div>
                <Button type="button" variant="outline" onClick={onAdicionarModulo} className="gap-1.5">
                  <Plus className="h-4 w-4" /> Adicionar
                </Button>
              </div>

              {/* Lista dos módulos adicionados */}
              {form.modulos_adicionais.length > 0 && (
                <div className="rounded-lg border border-border divide-y divide-border">
                  {form.modulos_adicionais.map((m) => (
                    <div key={m.modulo_id} className="flex items-center gap-3 px-4 py-2.5">
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium truncate">{m.nome}</p>
                        <p className="text-xs text-muted-foreground font-mono">
                          {m.valor_implantacao_modulo > 0 && `Impl: ${fmtBRL(m.valor_implantacao_modulo)}`}
                          {m.valor_implantacao_modulo > 0 && m.valor_mensalidade_modulo > 0 && " · "}
                          {m.valor_mensalidade_modulo > 0 && `Mens: ${fmtBRL(m.valor_mensalidade_modulo)}`}
                        </p>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="text-sm text-muted-foreground">Qtd: <strong>{m.quantidade}</strong></span>
                        <div className="text-right text-xs font-mono text-foreground">
                          {m.valor_implantacao_modulo > 0 && <div>Impl: {fmtBRL(m.valor_implantacao_modulo * m.quantidade)}</div>}
                          {m.valor_mensalidade_modulo > 0 && <div>Mens: {fmtBRL(m.valor_mensalidade_modulo * m.quantidade)}</div>}
                        </div>
                        <Button
                          type="button" variant="ghost" size="icon"
                          className="h-7 w-7 text-destructive hover:text-destructive"
                          onClick={() => onRemoverModulo(m.modulo_id)}
                        >
                          <XCircle className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* ── Precificação ── */}
          {(form.plano_id || (form.tipo_pedido === "OA" && form.servicos_pedido.length > 0)) && (
            <div className="rounded-xl border border-border bg-muted/30 p-4 space-y-4">
              {/* Header com toggles de acréscimo e desconto */}
              <div className="flex items-center justify-between flex-wrap gap-2">
                <p className="text-sm font-semibold text-foreground flex items-center gap-1.5">
                  <Tag className="h-4 w-4 text-muted-foreground" /> Precificação
                </p>
                <div className="flex items-center gap-4">
                  <label className="flex items-center gap-2 cursor-pointer select-none">
                    <span className="text-xs text-muted-foreground">Acréscimo</span>
                    <Switch
                      checked={acrescimoAtivo}
                      onCheckedChange={(v) => {
                        setAcrescimoAtivo(v);
                        if (!v) {
                          setForm((f) => ({
                            ...f,
                            acrescimo_implantacao_valor: "0",
                            acrescimo_mensalidade_valor: "0",
                          }));
                        }
                      }}
                    />
                  </label>
                  <label className="flex items-center gap-2 cursor-pointer select-none">
                    <span className="text-xs text-muted-foreground">Desconto</span>
                    <Switch
                      checked={descontoAtivo}
                      onCheckedChange={(v) => {
                        setDescontoAtivo(v);
                        if (!v) {
                          setForm((f) => ({
                            ...f,
                            desconto_implantacao_valor: "0",
                            desconto_mensalidade_valor: "0",
                          }));
                        }
                      }}
                    />
                  </label>
                </div>
              </div>

              {/* Valores originais (readonly) */}
              {form.tipo_pedido === "OA" ? (
                <div className="space-y-1.5">
                  <Label className="text-xs text-muted-foreground">Valor do Serviço</Label>
                  <Input readOnly value={fmtBRL((acrescimoAtivo || descontoAtivo) ? valorImplantacaoOriginal : valorImplantacaoFinal)} className="bg-background font-mono text-sm" />
                </div>
              ) : (
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1.5">
                    <Label className="text-xs text-muted-foreground">Implantação</Label>
                    <Input readOnly value={fmtBRL((acrescimoAtivo || descontoAtivo) ? valorImplantacaoOriginal : valorImplantacaoFinal)} className="bg-background font-mono text-sm" />
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-xs text-muted-foreground">Mensalidade</Label>
                    <Input readOnly value={fmtBRL((acrescimoAtivo || descontoAtivo) ? valorMensalidadeOriginal : valorMensalidadeFinal)} className="bg-background font-mono text-sm" />
                  </div>
                </div>
              )}

              {/* Acréscimos */}
              {acrescimoAtivo && (
                <div className="space-y-3 border-t border-border pt-3">
                  <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Acréscimos</p>

                  <div className="space-y-1.5">
                    <Label className="text-xs">Acréscimo — {form.tipo_pedido === "OA" ? "Serviço" : "Implantação"}</Label>
                    <div className="flex gap-2">
                      <Select value={form.acrescimo_implantacao_tipo} onValueChange={(v) => setForm((f) => ({ ...f, acrescimo_implantacao_tipo: v as "R$" | "%" }))}>
                        <SelectTrigger className="w-20"><SelectValue /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="R$">R$</SelectItem>
                          <SelectItem value="%">%</SelectItem>
                        </SelectContent>
                      </Select>
                      <Input
                        type="number" min="0" step="0.01"
                        value={form.acrescimo_implantacao_valor}
                        onChange={(e) => setForm((f) => ({ ...f, acrescimo_implantacao_valor: e.target.value }))}
                        className="flex-1"
                        placeholder="0"
                      />
                      <Input readOnly value={fmtBRL(valorImpComAcrescimo)} className="w-36 bg-background font-mono text-sm text-emerald-600 font-semibold" />
                    </div>
                  </div>

                  {form.tipo_pedido !== "OA" && (
                    <div className="space-y-1.5">
                      <Label className="text-xs">Acréscimo — Mensalidade</Label>
                      <div className="flex gap-2">
                        <Select value={form.acrescimo_mensalidade_tipo} onValueChange={(v) => setForm((f) => ({ ...f, acrescimo_mensalidade_tipo: v as "R$" | "%" }))}>
                          <SelectTrigger className="w-20"><SelectValue /></SelectTrigger>
                          <SelectContent>
                            <SelectItem value="R$">R$</SelectItem>
                            <SelectItem value="%">%</SelectItem>
                          </SelectContent>
                        </Select>
                        <Input
                          type="number" min="0" step="0.01"
                          value={form.acrescimo_mensalidade_valor}
                          onChange={(e) => setForm((f) => ({ ...f, acrescimo_mensalidade_valor: e.target.value }))}
                          className="flex-1"
                          placeholder="0"
                        />
                        <Input readOnly value={fmtBRL(valorMensComAcrescimo)} className="w-36 bg-background font-mono text-sm text-emerald-600 font-semibold" />
                      </div>
                    </div>
                  )}
                </div>
              )}
              {descontoAtivo && (
                <div className="space-y-3 border-t border-border pt-3">
                  <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Descontos</p>

                  <div className="space-y-1.5">
                    <div className="flex items-center justify-between">
                      <Label className="text-xs">Desconto — {form.tipo_pedido === "OA" ? "Serviço" : "Implantação"}</Label>
                      {limiteDesconto && (
                        <span className={`text-xs font-medium ${descontoImpExcedido ? "text-destructive" : "text-muted-foreground"}`}>
                          Limite: {limiteDesconto.implantacao}% · Aplicado: {descontoImpPercAtual.toFixed(1)}%
                        </span>
                      )}
                    </div>
                    <div className={`flex gap-2 ${descontoImpExcedido ? "ring-1 ring-destructive rounded-md p-1" : ""}`}>
                      <Select value={form.desconto_implantacao_tipo} onValueChange={(v) => setForm((f) => ({ ...f, desconto_implantacao_tipo: v as "R$" | "%" }))}>
                        <SelectTrigger className="w-20"><SelectValue /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="R$">R$</SelectItem>
                          <SelectItem value="%">%</SelectItem>
                        </SelectContent>
                      </Select>
                      <Input
                        type="number" min="0" step="0.01"
                        value={form.desconto_implantacao_valor}
                        onChange={(e) => setForm((f) => ({ ...f, desconto_implantacao_valor: e.target.value }))}
                        className={`flex-1 ${descontoImpExcedido ? "border-destructive" : ""}`}
                        placeholder="0"
                      />
                      <Input
                        type="text" inputMode="decimal"
                        defaultValue={valorImplantacaoFinal.toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                        key={`imp-final-${valorImplantacaoFinal.toFixed(2)}`}
                        onBlur={(e) => {
                          const raw = e.target.value.replace(/[R$\s]/g, "").replace(/\./g, "").replace(",", ".");
                          const novoFinal = parseFloat(raw) || 0;
                          const descontoCalc = Math.max(0, valorImpComAcrescimo - novoFinal);
                          setForm((f) => ({
                            ...f,
                            desconto_implantacao_tipo: "R$" as const,
                            desconto_implantacao_valor: descontoCalc.toFixed(2),
                          }));
                        }}
                        className="w-36 bg-background font-mono text-sm text-primary font-semibold"
                      />
                    </div>
                  </div>

                  {form.tipo_pedido !== "OA" && (
                    <div className="space-y-1.5">
                      <div className="flex items-center justify-between">
                        <Label className="text-xs">Desconto — Mensalidade</Label>
                        {limiteDesconto && (
                          <span className={`text-xs font-medium ${descontoMensExcedido ? "text-destructive" : "text-muted-foreground"}`}>
                            Limite: {limiteDesconto.mensalidade}% · Aplicado: {descontoMensPercAtual.toFixed(1)}%
                          </span>
                        )}
                      </div>
                      <div className={`flex gap-2 ${descontoMensExcedido ? "ring-1 ring-destructive rounded-md p-1" : ""}`}>
                        <Select value={form.desconto_mensalidade_tipo} onValueChange={(v) => setForm((f) => ({ ...f, desconto_mensalidade_tipo: v as "R$" | "%" }))}>
                          <SelectTrigger className="w-20"><SelectValue /></SelectTrigger>
                          <SelectContent>
                            <SelectItem value="R$">R$</SelectItem>
                            <SelectItem value="%">%</SelectItem>
                          </SelectContent>
                        </Select>
                        <Input
                          type="number" min="0" step="0.01"
                          value={form.desconto_mensalidade_valor}
                          onChange={(e) => setForm((f) => ({ ...f, desconto_mensalidade_valor: e.target.value }))}
                          className={`flex-1 ${descontoMensExcedido ? "border-destructive" : ""}`}
                          placeholder="0"
                        />
                          <Input
                          type="text" inputMode="decimal"
                          defaultValue={valorMensalidadeFinal.toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                          key={`mens-final-${valorMensalidadeFinal.toFixed(2)}`}
                          onBlur={(e) => {
                            const raw = e.target.value.replace(/[R$\s]/g, "").replace(/\./g, "").replace(",", ".");
                            const novoFinal = parseFloat(raw) || 0;
                            const descontoCalc = Math.max(0, valorMensComAcrescimo - novoFinal);
                            setForm((f) => ({
                              ...f,
                              desconto_mensalidade_tipo: "R$" as const,
                              desconto_mensalidade_valor: descontoCalc.toFixed(2),
                            }));
                          }}
                          className="w-36 bg-background font-mono text-sm text-primary font-semibold"
                        />
                      </div>
                    </div>
                  )}

                  {/* Motivo do desconto */}
                  <div className="space-y-1.5">
                    <Label className="text-xs">Motivo do desconto</Label>
                    <Textarea
                      placeholder="Informe o motivo do desconto..."
                      value={form.motivo_desconto}
                      onChange={(e) => setForm((f) => ({ ...f, motivo_desconto: e.target.value }))}
                      rows={2}
                    />
                  </div>
                </div>
              )}

              {/* Total */}
              <div className="pt-2 border-t border-border">
                <div className="space-y-1.5">
                  <Label className="text-xs text-muted-foreground">Valor total</Label>
                  <Input readOnly value={fmtBRL(valorTotal)} className="bg-background font-mono font-bold text-foreground" />
                </div>
              </div>
            </div>
          )}

          {/* ── Forma de Pagamento ── */}
          <div className="rounded-xl border border-border bg-muted/30 p-4 space-y-4">
            <p className="text-sm font-semibold text-foreground">Forma de Pagamento</p>

            {filialParametros && (
              <div className="rounded-lg border border-border bg-card px-3 py-2 text-xs text-muted-foreground space-y-0.5">
                <p className="font-medium text-foreground">Parâmetros da Filial</p>
                {filialParametros.parcelas_maximas_cartao && <p>Cartão: até {filialParametros.parcelas_maximas_cartao}x sem juros</p>}
                {filialParametros.pix_desconto_percentual > 0 && <p>PIX: {filialParametros.pix_desconto_percentual}% de desconto</p>}
              </div>
            )}

            {form.tipo_pedido === "OA" ? (
              <div className="space-y-3 border-t border-border pt-3">
                <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Pagamento do Serviço</p>
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1.5">
                    <Label className="text-xs">Forma de pagamento <span className="text-destructive">*</span></Label>
                    <Select value={form.pagamento_implantacao_forma} onValueChange={(v) => setForm((f) => ({ ...f, pagamento_implantacao_forma: v }))}>
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
                    <Input
                      type="number" min="1"
                      placeholder={filialParametros ? `Máx ${filialParametros.parcelas_maximas_cartao}x` : "Nº de parcelas"}
                      value={form.pagamento_implantacao_parcelas}
                      onChange={(e) => setForm((f) => ({ ...f, pagamento_implantacao_parcelas: e.target.value }))}
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-xs">Observação</Label>
                    <Input
                      placeholder="Ex: Pagamento após conclusão do serviço"
                      value={form.pagamento_implantacao_observacao}
                      onChange={(e) => setForm((f) => ({ ...f, pagamento_implantacao_observacao: e.target.value }))}
                    />
                  </div>
                </div>
              </div>
            ) : (
              <>
                {/* Mensalidade */}
                <div className="space-y-3 border-t border-border pt-3">
                  <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Mensalidade</p>
                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-1.5">
                      <Label className="text-xs">Tipo de cobrança</Label>
                      <Select
                        value={form.pagamento_mensalidade_tipo}
                        onValueChange={(v) => setForm((f) => ({ ...f, pagamento_mensalidade_tipo: v as "Pré-pago" | "Pós-pago" }))}
                      >
                        <SelectTrigger><SelectValue /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="Pré-pago">Pré-pago</SelectItem>
                          <SelectItem value="Pós-pago">Pós-pago</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-1.5">
                      <Label className="text-xs">Observação</Label>
                      <Input
                        placeholder={filialParametros?.regras_padrao_mensalidade || "Ex: Vencimento todo dia 10"}
                        value={form.pagamento_mensalidade_observacao}
                        onChange={(e) => setForm((f) => ({ ...f, pagamento_mensalidade_observacao: e.target.value }))}
                      />
                    </div>
                  </div>
                </div>

                {/* Implantação */}
                <div className="space-y-3 border-t border-border pt-3">
                  <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Implantação</p>
                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-1.5">
                      <Label className="text-xs">Forma de pagamento <span className="text-destructive">*</span></Label>
                      <Select value={form.pagamento_implantacao_forma} onValueChange={(v) => setForm((f) => ({ ...f, pagamento_implantacao_forma: v }))}>
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
                      <Input
                        type="number" min="1"
                        placeholder={filialParametros ? `Máx ${filialParametros.parcelas_maximas_cartao}x` : "Nº de parcelas"}
                        value={form.pagamento_implantacao_parcelas}
                        onChange={(e) => setForm((f) => ({ ...f, pagamento_implantacao_parcelas: e.target.value }))}
                      />
                    </div>
                    <div className="space-y-1.5">
                      <Label className="text-xs">Observação</Label>
                      <Input
                        placeholder={filialParametros?.regras_padrao_implantacao || "Ex: À vista no ato da implantação"}
                        value={form.pagamento_implantacao_observacao}
                        onChange={(e) => setForm((f) => ({ ...f, pagamento_implantacao_observacao: e.target.value }))}
                      />
                    </div>
                  </div>
                </div>
              </>
            )}
          </div>

          {/* ── Observações ── */}
          <div className="space-y-1.5">
            <Label>Observações</Label>
            <Textarea placeholder="Observações opcionais..." value={form.observacoes} onChange={(e) => setForm((f) => ({ ...f, observacoes: e.target.value }))} rows={3} />
          </div>

          {/* ── Alerta de desconto excedido ── */}
          {descontoExcedido && (
            <div className="mx-6 mb-2 rounded-lg border border-destructive/40 bg-destructive/10 p-3 flex items-start gap-2.5">
              <AlertCircle className="h-4 w-4 mt-0.5 shrink-0 text-destructive" />
              <div className="flex-1 min-w-0 text-sm">
                <p className="font-semibold text-destructive">Desconto acima do limite permitido</p>
                <p className="text-muted-foreground mt-0.5">
                  {descontoImpExcedido && `Implantação: ${descontoImpPercAtual.toFixed(1)}% (limite: ${limiteImpAtual}%)`}
                  {descontoImpExcedido && descontoMensExcedido && " · "}
                  {descontoMensExcedido && `Mensalidade: ${descontoMensPercAtual.toFixed(1)}% (limite: ${limiteMensAtual}%)`}
                </p>
                <p className="text-muted-foreground mt-1 text-xs">Você pode <strong>enviar para aprovação do gestor</strong> — o pedido ficará aguardando revisão.</p>
              </div>
            </div>
          )}

          {/* ─── Comentários Internos (draft) ──────────────────────────── */}
          <div className="border border-border rounded-md p-3 space-y-2">
            <div className="flex items-center justify-between">
              <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide flex items-center gap-1.5">
                <MessageSquare className="h-3.5 w-3.5" /> Comentários Internos
                {draftComentarios.length > 0 && (
                  <span className="ml-1 bg-primary text-primary-foreground text-[10px] rounded-full px-1.5 py-0.5">{draftComentarios.length}</span>
                )}
              </p>
              <Button
                type="button"
                variant="outline"
                size="sm"
                className="text-xs gap-1"
                onClick={() => {
                  setEditingDraftIdx(null);
                  setDraftTexto("");
                  setDraftPrioridade("normal");
                  setDraftArquivo(null);
                  setOpenComentarioDialog(true);
                }}
              >
                <Plus className="h-3.5 w-3.5" /> Comentário
              </Button>
            </div>
            {draftComentarios.length > 0 && (
              <div className="space-y-1.5 max-h-[150px] overflow-y-auto">
                {draftComentarios.map((dc, idx) => {
                  const pri = PRIORIDADE_MAP_DRAFT[dc.prioridade] || PRIORIDADE_MAP_DRAFT.normal;
                  return (
                    <div key={idx} className="bg-muted/40 border border-border rounded-md p-2 space-y-0.5">
                      <div className="flex items-center justify-between">
                        <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-muted">{pri.emoji} {pri.label}</span>
                        <div className="flex items-center gap-1">
                          <Button
                            type="button"
                            variant="ghost"
                            size="icon"
                            className="h-5 w-5"
                            onClick={() => {
                              setEditingDraftIdx(idx);
                              setDraftTexto(dc.texto);
                              setDraftPrioridade(dc.prioridade);
                              setDraftArquivo(dc.arquivo);
                              setOpenComentarioDialog(true);
                            }}
                          >
                            <Pencil className="h-3 w-3" />
                          </Button>
                          <Button
                            type="button"
                            variant="ghost"
                            size="icon"
                            className="h-5 w-5"
                            onClick={() => setDraftComentarios(prev => prev.filter((_, i) => i !== idx))}
                          >
                            <Trash2 className="h-3 w-3 text-destructive" />
                          </Button>
                        </div>
                      </div>
                      <p className="text-xs whitespace-pre-wrap">{dc.texto}</p>
                      {dc.arquivo_nome && (
                        <span className="inline-flex items-center gap-1 text-[10px] text-muted-foreground">
                          <Paperclip className="h-3 w-3" /> {dc.arquivo_nome}
                        </span>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          </div>{/* end scrollable area */}
          <DialogFooter className="px-6 py-4 border-t border-border shrink-0">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>Cancelar</Button>
            {(() => {
              const canSubmit = form.cliente_id && (form.tipo_pedido === "OA" ? form.servicos_pedido.length > 0 : !!form.plano_id);
              return bloqueadoPorDesconto ? (
                <Button type="submit" disabled={saving || !canSubmit} variant="secondary" className="gap-2">
                  {saving && <Loader2 className="h-4 w-4 animate-spin" />}
                  <ArrowUpCircle className="h-4 w-4" />
                  Enviar para aprovação
                </Button>
              ) : (
                <Button type="submit" disabled={saving || !canSubmit}>
                  {saving && <Loader2 className="h-4 w-4 animate-spin mr-2" />}
                  {editingPedido ? "Salvar alterações" : "Criar pedido"}
                </Button>
              );
            })()}
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
