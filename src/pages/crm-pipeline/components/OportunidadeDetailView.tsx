import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Command, CommandInput, CommandList, CommandEmpty, CommandItem } from "@/components/ui/command";
import { ArrowLeft, Check, X, ChevronsUpDown, Plus, Trash2, ListChecks, Package, FolderOpen, Save, Eye, EyeOff, Star } from "lucide-react";
import { cn } from "@/lib/utils";
import { supabase } from "@/integrations/supabase/client";
import { OportunidadeComentarios } from "./OportunidadeComentarios";
import { OportunidadeTarefas } from "./OportunidadeTarefas";
import { OportunidadeProdutos } from "./OportunidadeProdutos";
import type { CrmOportunidade, CrmEtapaSimples } from "../types";
import type { CrmCampoPersonalizado } from "@/pages/crm-parametros/types";

const CAMPOS_EXCLUIDOS = ["sistema anterior", "tipo de atendimento"];

interface ContatoLocal {
  id?: string;
  nome: string;
  telefone: string;
  cargo_id: string;
  email: string;
}

interface Props {
  oportunidade: CrmOportunidade;
  etapas: CrmEtapaSimples[];
  clientes: { id: string; nome_fantasia: string }[];
  responsaveis: { id: string; user_id: string; full_name: string }[];
  onSave: (data: Record<string, unknown>) => void;
  onBack: () => void;
  saving?: boolean;
  exibeCliente?: boolean;
  camposPersonalizados?: CrmCampoPersonalizado[];
  segmentos?: { id: string; nome: string }[];
  cargos?: { id: string; nome: string }[];
}

const emptyContato = (): ContatoLocal => ({ nome: "", telefone: "", cargo_id: "", email: "" });

export function OportunidadeDetailView({
  oportunidade, etapas, clientes, responsaveis, onSave, onBack, saving,
  exibeCliente = true, camposPersonalizados = [], segmentos = [], cargos = [],
}: Props) {
  const [titulo, setTitulo] = useState(oportunidade.titulo);
  const [clienteId, setClienteId] = useState(oportunidade.cliente_id || "");
  const [responsavelId, setResponsavelId] = useState(oportunidade.responsavel_id || "");
  const [etapaId, setEtapaId] = useState(oportunidade.etapa_id);
  const [segmentoIds, setSegmentoIds] = useState<string[]>(oportunidade.segmento_ids || []);
  const [camposValues, setCamposValues] = useState<Record<string, string>>(oportunidade.campos_personalizados || {});
  const [segmentoPopoverOpen, setSegmentoPopoverOpen] = useState(false);
  const [contatos, setContatos] = useState<ContatoLocal[]>([emptyContato()]);
  const [editingContatoIdx, setEditingContatoIdx] = useState<number | null>(null);
  const [classificacao, setClassificacao] = useState(oportunidade.classificacao || 0);

  const activeCampos = camposPersonalizados.filter(
    c => c.ativo && !CAMPOS_EXCLUIDOS.includes(c.nome.toLowerCase())
  );

  const currentEtapa = etapas.find(e => e.id === etapaId);

  useEffect(() => {
    supabase
      .from("crm_oportunidade_contatos")
      .select("id, nome, telefone, cargo_id, email")
      .eq("oportunidade_id", oportunidade.id)
      .order("created_at")
      .then(({ data }) => {
        if (data && data.length > 0) {
          setContatos(data.map(c => ({
            id: c.id, nome: c.nome, telefone: c.telefone,
            cargo_id: c.cargo_id || "", email: c.email || "",
          })));
        } else {
          setContatos([emptyContato()]);
        }
      });
  }, [oportunidade.id]);

  const updateContato = (index: number, field: keyof ContatoLocal, value: string) => {
    setContatos(prev => prev.map((c, i) => i === index ? { ...c, [field]: value } : c));
  };
  const addContato = () => setContatos(prev => [...prev, emptyContato()]);
  const removeContato = (index: number) => {
    if (contatos.length <= 1) return;
    setContatos(prev => prev.filter((_, i) => i !== index));
  };
  const contatosValid = contatos.every(c => c.nome.trim() && c.telefone.trim());

  const handleSave = () => {
    if (!titulo.trim() || segmentoIds.length === 0 || !contatosValid) return;
    for (const campo of activeCampos) {
      if (campo.obrigatorio && !camposValues[campo.id]?.trim()) return;
    }
    onSave({
      titulo: titulo.trim(), etapa_id: etapaId,
      cliente_id: clienteId || null, responsavel_id: responsavelId || null,
      segmento_ids: segmentoIds, valor: 0, origem: null, observacoes: null,
      data_previsao_fechamento: null, campos_personalizados: camposValues,
      classificacao,
      _contatos: contatos,
    });
  };

  const setCampoValue = (campoId: string, value: string) => {
    setCamposValues(prev => ({ ...prev, [campoId]: value }));
  };
  const toggleSegmento = (id: string) => {
    setSegmentoIds(prev => prev.includes(id) ? prev.filter(s => s !== id) : [...prev, id]);
  };
  const removeSegmento = (id: string) => {
    setSegmentoIds(prev => prev.filter(s => s !== id));
  };
  const getSegmentoNome = (id: string) => segmentos.find(s => s.id === id)?.nome || id;

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="flex items-center gap-3 px-4 py-3 border-b bg-background">
        <Button variant="ghost" size="icon" className="h-8 w-8 shrink-0" onClick={onBack}>
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <div className="flex items-center gap-2 flex-1 min-w-0">
          {currentEtapa && (
            <div className="h-3 w-3 rounded-full shrink-0" style={{ backgroundColor: currentEtapa.cor }} />
          )}
          <h2 className="text-base font-bold truncate">{oportunidade.titulo}</h2>
          {currentEtapa && (
            <Badge variant="outline" className="text-[10px] shrink-0">{currentEtapa.nome}</Badge>
          )}
          {/* Classificação estrelas */}
          <div className="flex items-center gap-0.5 shrink-0">
            {[1, 2, 3, 4, 5].map(i => (
              <button key={i} type="button" onClick={() => setClassificacao(i === classificacao ? 0 : i)} className="focus:outline-none">
                <Star className={cn("h-4 w-4 transition-colors", i <= classificacao ? "text-primary fill-primary" : "text-muted-foreground/30")} />
              </button>
            ))}
          </div>
        </div>
        <Button size="sm" className="h-8 shrink-0 gap-1" onClick={handleSave} disabled={!titulo.trim() || segmentoIds.length === 0 || !contatosValid || saving}>
          <Save className="h-3.5 w-3.5" />
          {saving ? "Salvando..." : "Salvar"}
        </Button>
      </div>

      {/* Tabs */}
      <Tabs defaultValue="geral" className="flex-1 flex flex-col min-h-0">
        <TabsList className="mx-4 mt-2 w-fit">
          <TabsTrigger value="geral">Geral</TabsTrigger>
          <TabsTrigger value="tarefas" className="gap-1"><ListChecks className="h-3.5 w-3.5" /> Tarefas</TabsTrigger>
          <TabsTrigger value="produtos" className="gap-1"><Package className="h-3.5 w-3.5" /> Produtos e Serviços</TabsTrigger>
          <TabsTrigger value="arquivos" className="gap-1"><FolderOpen className="h-3.5 w-3.5" /> Arquivos</TabsTrigger>
        </TabsList>

        {/* Geral */}
        <TabsContent value="geral" className="flex-1 overflow-y-auto px-4 pb-4 mt-0">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 pt-4">
            {/* Left: Form */}
            <div className="space-y-3">
              <div>
                <Label>Nome/Nome da Empresa *</Label>
                <Input value={titulo} onChange={(e) => setTitulo(e.target.value)} placeholder="Nome/Empresa" />
              </div>

              {/* Contatos */}
              <div className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <Label className="text-sm font-semibold">Contatos *</Label>
                  <Button type="button" variant="ghost" size="sm" className="h-7 text-xs gap-1" onClick={addContato}>
                    <Plus className="h-3 w-3" /> Adicionar
                  </Button>
                </div>
                {contatos.map((contato, idx) => {
                  const isEditing = editingContatoIdx === idx;
                  const cargoNome = cargos.find(c => c.id === contato.cargo_id)?.nome;
                  return (
                    <div key={idx}>
                      {/* Linha compacta */}
                      <div className="flex items-center gap-2 border rounded-md px-3 py-1.5 bg-muted/30">
                        <span className="text-xs font-medium truncate">{contato.nome || "Sem nome"}</span>
                        <span className="text-[10px] text-muted-foreground">•</span>
                        <span className="text-xs text-muted-foreground truncate">{contato.telefone || "Sem telefone"}</span>
                        {cargoNome && (
                          <>
                            <span className="text-[10px] text-muted-foreground">•</span>
                            <span className="text-xs text-muted-foreground truncate">{cargoNome}</span>
                          </>
                        )}
                        {contato.email && (
                          <>
                            <span className="text-[10px] text-muted-foreground">•</span>
                            <span className="text-xs text-muted-foreground truncate">{contato.email}</span>
                          </>
                        )}
                        <div className="ml-auto flex items-center gap-1 shrink-0">
                          <Button type="button" variant="ghost" size="icon" className="h-6 w-6" onClick={() => setEditingContatoIdx(isEditing ? null : idx)}>
                            {isEditing ? <EyeOff className="h-3.5 w-3.5 text-muted-foreground" /> : <Eye className="h-3.5 w-3.5 text-muted-foreground" />}
                          </Button>
                          {contatos.length > 1 && (
                            <Button type="button" variant="ghost" size="icon" className="h-6 w-6 text-destructive" onClick={() => removeContato(idx)}>
                              <Trash2 className="h-3.5 w-3.5" />
                            </Button>
                          )}
                        </div>
                      </div>
                      {/* Formulário expandido */}
                      {isEditing && (
                        <div className="border border-t-0 rounded-b-md p-3 space-y-2 bg-muted/20">
                          <div className="grid grid-cols-2 gap-2">
                            <div>
                              <Label className="text-xs">Nome *</Label>
                              <Input value={contato.nome} onChange={(e) => updateContato(idx, "nome", e.target.value)} placeholder="Nome do contato" className="h-8 text-xs" />
                            </div>
                            <div>
                              <Label className="text-xs">Telefone *</Label>
                              <Input value={contato.telefone} onChange={(e) => updateContato(idx, "telefone", e.target.value)} placeholder="(00) 00000-0000" className="h-8 text-xs" />
                            </div>
                          </div>
                          <div className="grid grid-cols-2 gap-2">
                            <div>
                              <Label className="text-xs">Cargo</Label>
                              <Select value={contato.cargo_id || "__none__"} onValueChange={(v) => updateContato(idx, "cargo_id", v === "__none__" ? "" : v)}>
                                <SelectTrigger className="h-8 text-xs"><SelectValue placeholder="Selecione..." /></SelectTrigger>
                                <SelectContent>
                                  <SelectItem value="__none__">Nenhum</SelectItem>
                                  {cargos.map(c => (<SelectItem key={c.id} value={c.id}>{c.nome}</SelectItem>))}
                                </SelectContent>
                              </Select>
                            </div>
                            <div>
                              <Label className="text-xs">Email</Label>
                              <Input value={contato.email} onChange={(e) => updateContato(idx, "email", e.target.value)} placeholder="email@exemplo.com" className="h-8 text-xs" type="email" />
                            </div>
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>

              {/* Etapa + Responsável lado a lado */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label>Etapa</Label>
                  <Select value={etapaId} onValueChange={setEtapaId}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {etapas.map((e) => (<SelectItem key={e.id} value={e.id}>{e.nome}</SelectItem>))}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label>Responsável</Label>
                  <Select value={responsavelId || "__none__"} onValueChange={(v) => setResponsavelId(v === "__none__" ? "" : v)}>
                    <SelectTrigger><SelectValue placeholder="Selecione..." /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="__none__">Nenhum</SelectItem>
                      {responsaveis.map((r) => (<SelectItem key={r.user_id} value={r.user_id}>{r.full_name}</SelectItem>))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              {/* Cliente + Segmento lado a lado */}
              <div className={cn("grid gap-3", exibeCliente ? "grid-cols-2" : "grid-cols-1")}>
                {exibeCliente && (
                  <div>
                    <Label>Cliente</Label>
                    <Select value={clienteId || "__none__"} onValueChange={(v) => setClienteId(v === "__none__" ? "" : v)}>
                      <SelectTrigger><SelectValue placeholder="Selecione..." /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="__none__">Nenhum</SelectItem>
                        {clientes.map((c) => (<SelectItem key={c.id} value={c.id}>{c.nome_fantasia}</SelectItem>))}
                      </SelectContent>
                    </Select>
                  </div>
                )}
                <div>
                  <Label>Segmento *</Label>
                  <Popover open={segmentoPopoverOpen} onOpenChange={setSegmentoPopoverOpen}>
                    <PopoverTrigger asChild>
                      <Button variant="outline" role="combobox" aria-expanded={segmentoPopoverOpen} className="w-full justify-between font-normal h-auto min-h-10">
                        {segmentoIds.length === 0 ? (
                          <span className="text-muted-foreground">Buscar segmento...</span>
                        ) : (
                          <div className="flex flex-wrap gap-1">
                            {segmentoIds.map(id => (
                              <Badge key={id} variant="secondary" className="text-xs gap-1">
                                {getSegmentoNome(id)}
                                <button type="button" className="ml-0.5 hover:text-destructive" onClick={(e) => { e.stopPropagation(); removeSegmento(id); }}>
                                  <X className="h-3 w-3" />
                                </button>
                              </Badge>
                            ))}
                          </div>
                        )}
                        <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-[--radix-popover-trigger-width] p-0" align="start">
                      <Command>
                        <CommandInput placeholder="Digitar para buscar..." />
                        <CommandList>
                          <CommandEmpty>Nenhum segmento encontrado</CommandEmpty>
                          {segmentos.map((s) => (
                            <CommandItem key={s.id} value={s.nome} onSelect={() => toggleSegmento(s.id)}>
                              <Check className={cn("mr-2 h-4 w-4", segmentoIds.includes(s.id) ? "opacity-100" : "opacity-0")} />
                              {s.nome}
                            </CommandItem>
                          ))}
                        </CommandList>
                      </Command>
                    </PopoverContent>
                  </Popover>
                </div>
              </div>

              {/* Campos Personalizados em grid de 2 colunas */}
              {activeCampos.length > 0 && (
                <div className="grid grid-cols-2 gap-3">
                  {activeCampos.map((campo) => (
                    <div key={campo.id}>
                      <Label>{campo.nome}{campo.obrigatorio ? " *" : ""}</Label>
                      {campo.tipo === "select" ? (
                        <Select value={camposValues[campo.id] || "__none__"} onValueChange={(v) => setCampoValue(campo.id, v === "__none__" ? "" : v)}>
                          <SelectTrigger><SelectValue placeholder="Selecione..." /></SelectTrigger>
                          <SelectContent>
                            <SelectItem value="__none__">Nenhum</SelectItem>
                            {campo.opcoes.map((opcao) => (<SelectItem key={opcao} value={opcao}>{opcao}</SelectItem>))}
                          </SelectContent>
                        </Select>
                      ) : (
                        <Input value={camposValues[campo.id] || ""} onChange={(e) => setCampoValue(campo.id, e.target.value)} placeholder={campo.nome} />
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Right: Comunicação */}
            <div>
              <OportunidadeComentarios oportunidadeId={oportunidade.id} />
            </div>
          </div>
        </TabsContent>

        {/* Tarefas */}
        <TabsContent value="tarefas" className="flex-1 overflow-y-auto px-4 pb-4 mt-0">
          <OportunidadeTarefas
            oportunidadeId={oportunidade.id}
            tiposAtendimento={
              (camposPersonalizados.find(c => c.nome.toLowerCase() === "tipo de atendimento")?.opcoes || []) as string[]
            }
          />
        </TabsContent>

        {/* Produtos e Serviços */}
        <TabsContent value="produtos" className="flex-1 overflow-y-auto px-4 pb-4 mt-0">
          <OportunidadeProdutos oportunidadeId={oportunidade.id} />
        </TabsContent>

        {/* Arquivos */}
        <TabsContent value="arquivos" className="flex-1 overflow-y-auto px-4 pb-4 mt-0">
          <div className="flex items-center justify-center h-64 text-muted-foreground">
            <div className="text-center space-y-2">
              <FolderOpen className="h-10 w-10 mx-auto opacity-40" />
              <p className="text-sm">Em breve: Arquivos da oportunidade.</p>
            </div>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}
