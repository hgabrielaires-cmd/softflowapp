import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import type { CrmOportunidade, CrmEtapaSimples } from "../types";
import { ORIGENS } from "../constants";

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
}

export function OportunidadeFormDialog({
  open, onOpenChange, etapas, etapaIdInicial, oportunidade, clientes, responsaveis, onSave, saving, exibeCliente = true,
}: Props) {
  const [titulo, setTitulo] = useState("");
  const [clienteId, setClienteId] = useState<string>("");
  const [responsavelId, setResponsavelId] = useState<string>("");
  const [etapaId, setEtapaId] = useState("");
  const [valor, setValor] = useState("");
  const [origem, setOrigem] = useState("");
  const [observacoes, setObservacoes] = useState("");
  const [dataPrevisao, setDataPrevisao] = useState("");

  useEffect(() => {
    if (open) {
      if (oportunidade) {
        setTitulo(oportunidade.titulo);
        setClienteId(oportunidade.cliente_id || "");
        setResponsavelId(oportunidade.responsavel_id || "");
        setEtapaId(oportunidade.etapa_id);
        setValor(oportunidade.valor?.toString() || "");
        setOrigem(oportunidade.origem || "");
        setObservacoes(oportunidade.observacoes || "");
        setDataPrevisao(oportunidade.data_previsao_fechamento || "");
      } else {
        setTitulo("");
        setClienteId("");
        setResponsavelId("");
        setEtapaId(etapaIdInicial || etapas[0]?.id || "");
        setValor("");
        setOrigem("");
        setObservacoes("");
        setDataPrevisao("");
      }
    }
  }, [open, oportunidade, etapaIdInicial, etapas]);

  const handleSave = () => {
    if (!titulo.trim()) return;
    onSave({
      titulo: titulo.trim(),
      etapa_id: etapaId,
      cliente_id: clienteId || null,
      responsavel_id: responsavelId || null,
      valor: parseFloat(valor) || 0,
      origem: origem || null,
      observacoes: observacoes || null,
      data_previsao_fechamento: dataPrevisao || null,
    });
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
            <Label>Valor (R$)</Label>
            <Input type="number" min="0" step="0.01" value={valor} onChange={(e) => setValor(e.target.value)} placeholder="0,00" />
          </div>
          <div>
            <Label>Origem</Label>
            <Select value={origem || "__none__"} onValueChange={(v) => setOrigem(v === "__none__" ? "" : v)}>
              <SelectTrigger><SelectValue placeholder="Selecione..." /></SelectTrigger>
              <SelectContent>
                <SelectItem value="__none__">Nenhuma</SelectItem>
                {ORIGENS.map((o) => (
                  <SelectItem key={o} value={o}>{o}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label>Previsão de Fechamento</Label>
            <Input type="date" value={dataPrevisao} onChange={(e) => setDataPrevisao(e.target.value)} />
          </div>
          <div>
            <Label>Observações</Label>
            <Textarea value={observacoes} onChange={(e) => setObservacoes(e.target.value)} rows={3} />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancelar</Button>
          <Button onClick={handleSave} disabled={!titulo.trim() || saving}>
            {saving ? "Salvando..." : "Salvar"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
