import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from "@/components/ui/dialog";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { Loader2, Building2, Trash2, Plus } from "lucide-react";
import { useCargos } from "@/hooks/useCargos";
import { applyPhoneMask, normalizeBRPhone } from "@/lib/utils";
import { toast } from "sonner";

interface ContatoRow {
  id: string;
  cliente_id: string;
  nome: string;
  cargo: string | null;
  telefone: string | null;
  email: string | null;
  decisor: boolean;
  ativo: boolean;
  clientes: { nome_fantasia: string; filial_id: string | null } | null;
}

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** The representative contact row (one of potentially many with same phone) */
  contato: ContatoRow | null;
  /** All raw contact rows sharing the same normalized phone+name */
  allRows: ContatoRow[];
  /** All clients available for linking */
  clientesList: { id: string; nome_fantasia: string }[];
  onSaved: () => void;
}

export function EditContatoDialog({ open, onOpenChange, contato, allRows, clientesList, onSaved }: Props) {
  const { data: cargos } = useCargos();
  const [nome, setNome] = useState("");
  const [cargo, setCargo] = useState("");
  const [telefone, setTelefone] = useState("");
  const [email, setEmail] = useState("");
  const [decisor, setDecisor] = useState(false);
  const [ativo, setAtivo] = useState(true);
  const [saving, setSaving] = useState(false);

  // Linked companies = all rows sharing same phone+name
  const [linkedIds, setLinkedIds] = useState<string[]>([]);
  const [addingCliente, setAddingCliente] = useState(false);
  const [newClienteId, setNewClienteId] = useState("");

  useEffect(() => {
    if (contato && open) {
      setNome(contato.nome);
      setCargo(contato.cargo || "");
      setTelefone(contato.telefone || "");
      setEmail(contato.email || "");
      setDecisor(contato.decisor);
      setAtivo(contato.ativo);
      setLinkedIds(allRows.map((r) => r.cliente_id));
      setAddingCliente(false);
      setNewClienteId("");
    }
  }, [contato, open, allRows]);

  if (!contato) return null;

  const availableClients = clientesList.filter((c) => !linkedIds.includes(c.id));

  async function handleSave() {
    if (!nome.trim()) { toast.error("Nome é obrigatório"); return; }
    setSaving(true);
    try {
      const normalizedPhone = normalizeBRPhone(telefone);
      const payload = {
        nome: nome.trim(),
        cargo: cargo || null,
        telefone: normalizedPhone || null,
        email: email.trim() || null,
        decisor,
        ativo,
      };

      // Update all existing rows that belong to this contact group
      const existingClienteIds = allRows.map((r) => r.cliente_id);
      for (const row of allRows) {
        if (linkedIds.includes(row.cliente_id)) {
          // Still linked → update
          await supabase.from("cliente_contatos").update(payload).eq("id", row.id);
        } else {
          // Unlinked → delete this row
          await supabase.from("cliente_contatos").delete().eq("id", row.id);
        }
      }

      // Create new links
      const newClienteIds = linkedIds.filter((id) => !existingClienteIds.includes(id));
      for (const clienteId of newClienteIds) {
        await supabase.from("cliente_contatos").insert({
          ...payload,
          cliente_id: clienteId,
        });
      }

      toast.success("Contato atualizado com sucesso!");
      onOpenChange(false);
      onSaved();
    } catch (err) {
      toast.error("Erro ao salvar contato");
    } finally {
      setSaving(false);
    }
  }

  function handleRemoveCliente(clienteId: string) {
    if (linkedIds.length <= 1) {
      toast.error("O contato precisa estar vinculado a pelo menos uma empresa");
      return;
    }
    setLinkedIds((prev) => prev.filter((id) => id !== clienteId));
  }

  function handleAddCliente() {
    if (!newClienteId) return;
    setLinkedIds((prev) => [...prev, newClienteId]);
    setNewClienteId("");
    setAddingCliente(false);
  }

  const getClienteName = (id: string) => {
    const row = allRows.find((r) => r.cliente_id === id);
    if (row?.clientes) return row.clientes.nome_fantasia;
    return clientesList.find((c) => c.id === id)?.nome_fantasia || "—";
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>Editar Contato</DialogTitle>
        </DialogHeader>

        <div className="grid grid-cols-2 gap-3 py-2">
          <div className="col-span-2 space-y-1.5">
            <Label>Nome *</Label>
            <Input value={nome} onChange={(e) => setNome(e.target.value)} placeholder="Nome completo" />
          </div>

          <div className="col-span-2 space-y-1.5">
            <Label>Cargo</Label>
            <Select value={cargo} onValueChange={setCargo}>
              <SelectTrigger>
                <SelectValue placeholder="Selecione o cargo" />
              </SelectTrigger>
              <SelectContent>
                {(cargos || []).map((c) => (
                  <SelectItem key={c.id} value={c.nome}>{c.nome}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-1.5">
            <Label>Telefone</Label>
            <Input
              value={applyPhoneMask(telefone)}
              onChange={(e) => setTelefone(e.target.value.replace(/\D/g, ""))}
              placeholder="(00) 00000-0000"
            />
          </div>

          <div className="space-y-1.5">
            <Label>E-mail</Label>
            <Input type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="email@empresa.com" />
          </div>

          <div className="col-span-2 flex items-center gap-3 pt-1">
            <Checkbox id="edit-decisor" checked={decisor} onCheckedChange={(v) => setDecisor(!!v)} />
            <div>
              <Label htmlFor="edit-decisor" className="cursor-pointer">Decisor</Label>
              <p className="text-xs text-muted-foreground">Este contato é o tomador de decisão</p>
            </div>
          </div>

          <div className="col-span-2 flex items-center gap-3">
            <Switch checked={ativo} onCheckedChange={setAtivo} />
            <Label>Contato ativo</Label>
          </div>

          {/* Empresas vinculadas */}
          <div className="col-span-2 space-y-2 pt-2 border-t border-border">
            <Label className="flex items-center gap-1.5">
              <Building2 className="h-4 w-4" /> Empresas vinculadas
            </Label>
            <div className="space-y-1.5">
              {linkedIds.map((clienteId) => (
                <div key={clienteId} className="flex items-center justify-between bg-muted/50 rounded-md px-3 py-1.5">
                  <span className="text-sm font-medium">{getClienteName(clienteId)}</span>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-7 w-7 text-destructive hover:text-destructive"
                    onClick={() => handleRemoveCliente(clienteId)}
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </Button>
                </div>
              ))}
            </div>

            {addingCliente ? (
              <div className="flex items-center gap-2">
                <Select value={newClienteId} onValueChange={setNewClienteId}>
                  <SelectTrigger className="flex-1">
                    <SelectValue placeholder="Selecione a empresa" />
                  </SelectTrigger>
                  <SelectContent>
                    {availableClients.map((c) => (
                      <SelectItem key={c.id} value={c.id}>{c.nome_fantasia}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <Button size="sm" onClick={handleAddCliente} disabled={!newClienteId}>Vincular</Button>
                <Button size="sm" variant="outline" onClick={() => { setAddingCliente(false); setNewClienteId(""); }}>
                  Cancelar
                </Button>
              </div>
            ) : (
              <Button variant="outline" size="sm" onClick={() => setAddingCliente(true)} className="gap-1.5">
                <Plus className="h-3.5 w-3.5" /> Vincular empresa
              </Button>
            )}
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancelar</Button>
          <Button onClick={handleSave} disabled={saving}>
            {saving && <Loader2 className="h-4 w-4 animate-spin mr-2" />}
            Salvar
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
