import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useSetores, useAtendentes } from "../useChatQueries";

interface Props {
  open: boolean;
  onClose: () => void;
  onConfirm: (setorId: string, atendenteId?: string, motivo?: string, setorNome?: string) => void;
}

export default function TransferirDialog({ open, onClose, onConfirm }: Props) {
  const [setorId, setSetorId] = useState("");
  const [atendenteId, setAtendenteId] = useState("");
  const [motivo, setMotivo] = useState("");
  const { data: setores } = useSetores();
  const { data: atendentes } = useAtendentes();

  const setorNome = setores?.find((s) => s.id === setorId)?.nome;

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Transferir conversa</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <div>
            <Label>Setor destino *</Label>
            <Select value={setorId} onValueChange={setSetorId}>
              <SelectTrigger><SelectValue placeholder="Selecione o setor" /></SelectTrigger>
              <SelectContent>
                {setores?.map((s) => (
                  <SelectItem key={s.id} value={s.id}>{s.nome}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label>Atendente (opcional)</Label>
            <Select value={atendenteId} onValueChange={setAtendenteId}>
              <SelectTrigger><SelectValue placeholder="Sem atribuição" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="none">Sem atribuição</SelectItem>
                {atendentes?.map((a) => (
                  <SelectItem key={a.user_id} value={a.user_id}>
                    {a.full_name || "Sem nome"}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label>Motivo</Label>
            <Input
              value={motivo}
              onChange={(e) => setMotivo(e.target.value)}
              placeholder="Motivo da transferência..."
            />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>Cancelar</Button>
          <Button disabled={!setorId} onClick={() => {
            onConfirm(setorId, atendenteId === "none" ? undefined : atendenteId, motivo, setorNome);
            onClose();
          }}>
            Transferir
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
