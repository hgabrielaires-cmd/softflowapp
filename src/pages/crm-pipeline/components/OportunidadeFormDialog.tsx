import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
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
  const [segmentoId, setSegmentoId] = useState<string>("");
  const [observacoes, setObservacoes] = useState("");
  const [camposValues, setCamposValues] = useState<Record<string, string>>({});

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
        setSegmentoId((oportunidade as any).segmento_id || "");
        setObservacoes(oportunidade.observacoes || "");
        setCamposValues(oportunidade.campos_personalizados || {});
      } else {
        setTitulo("");
        setClienteId("");
        setResponsavelId(currentUserId || "");
        setEtapaId(etapaIdInicial || etapas[0]?.id || "");
        setSegmentoId("");
        setObservacoes("");
        setCamposValues({});
      }
    }
  }, [open, oportunidade, etapaIdInicial, etapas]);

  const handleSave = () => {
    if (!titulo.trim() || !segmentoId) return;
    for (const campo of activeCampos) {
      if (campo.obrigatorio && !camposValues[campo.id]?.trim()) return;
    }
    onSave({
      titulo: titulo.trim(),
      etapa_id: etapaId,
      cliente_id: clienteId || null,
      responsavel_id: responsavelId || null,
      segmento_id: segmentoId || null,
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
          <div>
            <Label>Segmento *</Label>
            <Select value={segmentoId || "__none__"} onValueChange={(v) => setSegmentoId(v === "__none__" ? "" : v)}>
              <SelectTrigger><SelectValue placeholder="Selecione..." /></SelectTrigger>
              <SelectContent>
                <SelectItem value="__none__">Nenhum</SelectItem>
                {segmentos.map((s) => (
                  <SelectItem key={s.id} value={s.id}>{s.nome}</SelectItem>
                ))}
              </SelectContent>
            </Select>
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

          <div>
            <Label>Observações</Label>
            <Textarea value={observacoes} onChange={(e) => setObservacoes(e.target.value)} rows={3} />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancelar</Button>
          <Button onClick={handleSave} disabled={!titulo.trim() || !segmentoId || saving}>
            {saving ? "Salvando..." : "Salvar"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
