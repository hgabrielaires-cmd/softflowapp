import { useState, useEffect, useRef } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { OportunidadeComentarios } from "./OportunidadeComentarios";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Command, CommandInput, CommandList, CommandEmpty, CommandItem } from "@/components/ui/command";
import { Check, X, ChevronsUpDown } from "lucide-react";
import { cn } from "@/lib/utils";
import type { CrmOportunidade, CrmEtapaSimples } from "../types";
import type { CrmCampoPersonalizado } from "@/pages/crm-parametros/types";

const CAMPOS_EXCLUIDOS = ["sistema anterior", "tipo de atendimento"];

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
}

export function OportunidadeFormDialog({
  open, onOpenChange, etapas, etapaIdInicial, oportunidade, clientes, responsaveis, onSave, saving, exibeCliente = true, currentUserId, camposPersonalizados = [], segmentos = [],
}: Props) {
  const [titulo, setTitulo] = useState("");
  const [clienteId, setClienteId] = useState<string>("");
  const [responsavelId, setResponsavelId] = useState<string>("");
  const [etapaId, setEtapaId] = useState("");
  const [segmentoIds, setSegmentoIds] = useState<string[]>([]);
  const [observacoes, setObservacoes] = useState("");
  const [camposValues, setCamposValues] = useState<Record<string, string>>({});
  const [segmentoPopoverOpen, setSegmentoPopoverOpen] = useState(false);

  const activeCampos = camposPersonalizados.filter(
    c => c.ativo && !CAMPOS_EXCLUIDOS.includes(c.nome.toLowerCase())
  );

  useEffect(() => {
    if (open) {
      if (oportunidade) {
        setTitulo(oportunidade.titulo);
        setClienteId(oportunidade.cliente_id || "");
        setResponsavelId(oportunidade.responsavel_id || "");
        setEtapaId(oportunidade.etapa_id);
        setSegmentoIds((oportunidade as any).segmento_ids || []);
        setObservacoes(oportunidade.observacoes || "");
        setCamposValues(oportunidade.campos_personalizados || {});
      } else {
        setTitulo("");
        setClienteId("");
        setResponsavelId(currentUserId || "");
        setEtapaId(etapaIdInicial || etapas[0]?.id || "");
        setSegmentoIds([]);
        setObservacoes("");
        setCamposValues({});
      }
    }
  }, [open, oportunidade, etapaIdInicial, etapas]);

  const handleSave = () => {
    if (!titulo.trim() || segmentoIds.length === 0) return;
    for (const campo of activeCampos) {
      if (campo.obrigatorio && !camposValues[campo.id]?.trim()) return;
    }
    onSave({
      titulo: titulo.trim(),
      etapa_id: etapaId,
      cliente_id: clienteId || null,
      responsavel_id: responsavelId || null,
      segmento_ids: segmentoIds,
      valor: 0,
      origem: null,
      observacoes: observacoes || null,
      data_previsao_fechamento: null,
      campos_personalizados: camposValues,
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
            <Label>Nome/Nome da Empresa *</Label>
            <Input value={titulo} onChange={(e) => setTitulo(e.target.value)} placeholder="Nome/Empresa" />
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

          {/* Comunicação - apenas ao editar */}
          {oportunidade && (
            <OportunidadeComentarios oportunidadeId={oportunidade.id} />
          )}
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancelar</Button>
          <Button onClick={handleSave} disabled={!titulo.trim() || segmentoIds.length === 0 || saving}>
            {saving ? "Salvando..." : "Salvar"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
