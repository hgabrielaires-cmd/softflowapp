import { useState, useEffect } from "react";
import { toast } from "sonner";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { OportunidadeComentarios } from "./OportunidadeComentarios";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Command, CommandInput, CommandList, CommandEmpty, CommandItem } from "@/components/ui/command";
import { Check, X, ChevronsUpDown, Plus, Trash2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { supabase } from "@/integrations/supabase/client";
import type { CrmOportunidade, CrmEtapaSimples } from "../types";
import { applyPhoneMask } from "@/lib/utils";
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
  open: boolean;
  onOpenChange: (v: boolean) => void;
  etapas: CrmEtapaSimples[];
  etapaIdInicial?: string;
  oportunidade?: CrmOportunidade | null;
  clientes: { id: string; nome_fantasia: string }[];
  responsaveis: { id: string; user_id: string; full_name: string }[];
  onSave: (data: Record<string, unknown>) => void;
  saving?: boolean;
  exibeCliente?: boolean;
  currentUserId?: string;
  camposPersonalizados?: CrmCampoPersonalizado[];
  segmentos?: { id: string; nome: string }[];
  cargos?: { id: string; nome: string }[];
}

const emptyContato = (): ContatoLocal => ({ nome: "", telefone: "", cargo_id: "", email: "" });

export function OportunidadeFormDialog({
  open, onOpenChange, etapas, etapaIdInicial, oportunidade, clientes, responsaveis, onSave, saving, exibeCliente = true, currentUserId, camposPersonalizados = [], segmentos = [], cargos = [],
}: Props) {
  const [titulo, setTitulo] = useState("");
  const [clienteId, setClienteId] = useState<string>("");
  const [responsavelId, setResponsavelId] = useState<string>("");
  const [etapaId, setEtapaId] = useState("");
  const [segmentoIds, setSegmentoIds] = useState<string[]>([]);
  const [camposValues, setCamposValues] = useState<Record<string, string>>({});
  const [segmentoPopoverOpen, setSegmentoPopoverOpen] = useState(false);
  const [contatos, setContatos] = useState<ContatoLocal[]>([emptyContato()]);

  const activeCampos = camposPersonalizados.filter(
    c => c.ativo && !CAMPOS_EXCLUIDOS.includes(c.nome.toLowerCase())
  );

  // Load existing contacts when editing
  useEffect(() => {
    if (open && oportunidade) {
      supabase
        .from("crm_oportunidade_contatos")
        .select("id, nome, telefone, cargo_id, email")
        .eq("oportunidade_id", oportunidade.id)
        .order("created_at")
        .then(({ data }) => {
          if (data && data.length > 0) {
            setContatos(data.map(c => ({
              id: c.id,
              nome: c.nome,
              telefone: c.telefone,
              cargo_id: c.cargo_id || "",
              email: c.email || "",
            })));
          } else {
            setContatos([emptyContato()]);
          }
        });
    }
  }, [open, oportunidade]);

  useEffect(() => {
    if (open) {
      if (oportunidade) {
        setTitulo(oportunidade.titulo);
        setClienteId(oportunidade.cliente_id || "");
        setResponsavelId(oportunidade.responsavel_id || "");
        setEtapaId(oportunidade.etapa_id);
        setSegmentoIds(oportunidade.segmento_ids || []);
        setCamposValues(oportunidade.campos_personalizados || {});
      } else {
        setTitulo("");
        setClienteId("");
        setResponsavelId(currentUserId || "");
        setEtapaId(etapaIdInicial || etapas[0]?.id || "");
        setSegmentoIds([]);
        setCamposValues({});
        setContatos([emptyContato()]);
        setTried(false);
      }
    }
  }, [open, oportunidade, etapaIdInicial, etapas]);

  const updateContato = (index: number, field: keyof ContatoLocal, value: string) => {
    setContatos(prev => prev.map((c, i) => i === index ? { ...c, [field]: value } : c));
  };

  const addContato = () => setContatos(prev => [...prev, emptyContato()]);

  const removeContato = (index: number) => {
    if (contatos.length <= 1) return;
    setContatos(prev => prev.filter((_, i) => i !== index));
  };

  const contatosValid = contatos.every(c => c.nome.trim() && c.telefone.trim());
  const [tried, setTried] = useState(false);

  const camposObrigatoriosPendentes = activeCampos.filter(
    c => c.obrigatorio && !camposValues[c.id]?.trim()
  );

  const hasErrors = !titulo.trim() || segmentoIds.length === 0 || !contatosValid || camposObrigatoriosPendentes.length > 0;

  const handleSave = () => {
    setTried(true);
    if (hasErrors) {
      toast.error("Preencha todos os campos obrigatórios antes de salvar.");
      return;
    }
    onSave({
      titulo: titulo.trim(),
      etapa_id: etapaId,
      cliente_id: clienteId || null,
      responsavel_id: responsavelId || null,
      segmento_ids: segmentoIds,
      valor: 0,
      origem: null,
      observacoes: null,
      data_previsao_fechamento: null,
      campos_personalizados: camposValues,
      _contatos: contatos,
    });
  };

  const setCampoValue = (campoId: string, value: string) => {
    setCamposValues(prev => ({ ...prev, [campoId]: value }));
  };

  const toggleSegmento = (id: string) => {
    setSegmentoIds(prev =>
      prev.includes(id) ? prev.filter(s => s !== id) : [...prev, id]
    );
  };

  const removeSegmento = (id: string) => {
    setSegmentoIds(prev => prev.filter(s => s !== id));
  };

  const getSegmentoNome = (id: string) => segmentos.find(s => s.id === id)?.nome || id;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg max-h-[90vh] flex flex-col" onInteractOutside={(e) => e.preventDefault()}>
        <DialogHeader>
          <DialogTitle>{oportunidade ? "Editar Oportunidade" : "Nova Oportunidade"}</DialogTitle>
        </DialogHeader>
        <div className="space-y-3 overflow-y-auto flex-1 pr-1 pb-2 min-h-0">
          <div>
            <Label className={tried && !titulo.trim() ? "text-destructive" : ""}>Nome/Nome da Empresa *</Label>
            <Input value={titulo} onChange={(e) => setTitulo(e.target.value)} placeholder="Nome/Empresa" className={tried && !titulo.trim() ? "border-destructive" : ""} />
          </div>

          {/* Contatos */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label className={cn("text-sm font-semibold", tried && !contatosValid && "text-destructive")}>Contatos *</Label>
              <Button type="button" variant="ghost" size="sm" className="h-7 text-xs gap-1" onClick={addContato}>
                <Plus className="h-3 w-3" /> Adicionar
              </Button>
            </div>
            {contatos.map((contato, idx) => (
              <div key={idx} className="border rounded-lg p-3 space-y-2 bg-muted/30 relative">
                {contatos.length > 1 && (
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    className="absolute top-1 right-1 h-6 w-6 text-destructive"
                    onClick={() => removeContato(idx)}
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </Button>
                )}
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <Label className="text-xs">Nome *</Label>
                    <Input
                      value={contato.nome}
                      onChange={(e) => updateContato(idx, "nome", e.target.value)}
                      placeholder="Nome do contato"
                      className="h-8 text-xs"
                    />
                  </div>
                  <div>
                    <Label className="text-xs">Telefone *</Label>
                    <Input
                      value={applyPhoneMask(contato.telefone)}
                      onChange={(e) => updateContato(idx, "telefone", e.target.value.replace(/\D/g, ""))}
                      placeholder="(00) 00000-0000"
                      className="h-8 text-xs"
                    />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <Label className="text-xs">Cargo</Label>
                    <Select value={contato.cargo_id || "__none__"} onValueChange={(v) => updateContato(idx, "cargo_id", v === "__none__" ? "" : v)}>
                      <SelectTrigger className="h-8 text-xs"><SelectValue placeholder="Selecione..." /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="__none__">Nenhum</SelectItem>
                        {cargos.map(c => (
                          <SelectItem key={c.id} value={c.id}>{c.nome}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label className="text-xs">Email</Label>
                    <Input
                      value={contato.email}
                      onChange={(e) => updateContato(idx, "email", e.target.value)}
                      placeholder="email@exemplo.com"
                      className="h-8 text-xs"
                      type="email"
                    />
                  </div>
                </div>
              </div>
            ))}
          </div>

          <div>
            <Label>Etapa</Label>
            <Select value={etapaId} onValueChange={setEtapaId}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                {etapas.map((e) => (
                  <SelectItem key={e.id} value={e.id}>{e.nome}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          {exibeCliente && (
            <div>
              <Label>Cliente</Label>
              <Select value={clienteId || "__none__"} onValueChange={(v) => setClienteId(v === "__none__" ? "" : v)}>
                <SelectTrigger><SelectValue placeholder="Selecione..." /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="__none__">Nenhum</SelectItem>
                  {clientes.map((c) => (
                    <SelectItem key={c.id} value={c.id}>{c.nome_fantasia}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}
          <div>
            <Label>Responsável</Label>
            <Select value={responsavelId || "__none__"} onValueChange={(v) => setResponsavelId(v === "__none__" ? "" : v)}>
              <SelectTrigger><SelectValue placeholder="Selecione..." /></SelectTrigger>
              <SelectContent>
                <SelectItem value="__none__">Nenhum</SelectItem>
                {responsaveis.map((r) => (
                  <SelectItem key={r.user_id} value={r.user_id}>{r.full_name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Segmento - Multi-select com busca */}
          <div>
            <Label>Segmento *</Label>
            <Popover open={segmentoPopoverOpen} onOpenChange={setSegmentoPopoverOpen}>
              <PopoverTrigger asChild>
                <Button
                  variant="outline"
                  role="combobox"
                  aria-expanded={segmentoPopoverOpen}
                  className="w-full justify-between font-normal h-auto min-h-10"
                >
                  {segmentoIds.length === 0 ? (
                    <span className="text-muted-foreground">Buscar segmento...</span>
                  ) : (
                    <div className="flex flex-wrap gap-1">
                      {segmentoIds.map(id => (
                        <Badge key={id} variant="secondary" className="text-xs gap-1">
                          {getSegmentoNome(id)}
                          <button
                            type="button"
                            className="ml-0.5 hover:text-destructive"
                            onClick={(e) => { e.stopPropagation(); removeSegmento(id); }}
                          >
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
                      <CommandItem
                        key={s.id}
                        value={s.nome}
                        onSelect={() => toggleSegmento(s.id)}
                      >
                        <Check className={cn("mr-2 h-4 w-4", segmentoIds.includes(s.id) ? "opacity-100" : "opacity-0")} />
                        {s.nome}
                      </CommandItem>
                    ))}
                  </CommandList>
                </Command>
              </PopoverContent>
            </Popover>
          </div>

          {/* Campos Personalizados */}
          {activeCampos.map((campo) => (
            <div key={campo.id}>
              <Label>{campo.nome}{campo.obrigatorio ? " *" : ""}</Label>
              {campo.tipo === "select" ? (
                <Select
                  value={camposValues[campo.id] || "__none__"}
                  onValueChange={(v) => setCampoValue(campo.id, v === "__none__" ? "" : v)}
                >
                  <SelectTrigger><SelectValue placeholder="Selecione..." /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="__none__">Nenhum</SelectItem>
                    {campo.opcoes.map((opcao) => (
                      <SelectItem key={opcao} value={opcao}>{opcao}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              ) : (
                <Input
                  value={camposValues[campo.id] || ""}
                  onChange={(e) => setCampoValue(campo.id, e.target.value)}
                  placeholder={campo.nome}
                />
              )}
            </div>
          ))}

          {/* Comunicação */}
          {oportunidade ? (
            <OportunidadeComentarios oportunidadeId={oportunidade.id} />
          ) : (
            <div className="border rounded-lg p-4 bg-muted/30 text-center">
              <Label className="text-sm font-semibold">Comunicação</Label>
              <p className="text-xs text-muted-foreground mt-1">Salve a oportunidade para habilitar os comentários.</p>
            </div>
          )}
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancelar</Button>
          <Button onClick={handleSave} disabled={!titulo.trim() || segmentoIds.length === 0 || !contatosValid || saving}>
            {saving ? "Salvando..." : "Salvar"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
