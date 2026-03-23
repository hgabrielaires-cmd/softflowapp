import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useSetores, useAtendentes } from "../useChatQueries";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { cn } from "@/lib/utils";

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

  // Count active conversations per attendant
  const { data: conversasAtivas } = useQuery({
    queryKey: ["chat-conversas-ativas-count"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("chat_conversas")
        .select("atendente_id")
        .eq("status", "em_atendimento");
      if (error) throw error;
      const map: Record<string, number> = {};
      (data || []).forEach((c: any) => {
        if (c.atendente_id) map[c.atendente_id] = (map[c.atendente_id] || 0) + 1;
      });
      return map;
    },
    enabled: open,
  });

  // Get max conversations config
  const { data: config } = useQuery({
    queryKey: ["chat-config-max"],
    queryFn: async () => {
      const { data } = await supabase
        .from("chat_configuracoes")
        .select("max_conversas_por_atendente")
        .limit(1)
        .maybeSingle();
      return data?.max_conversas_por_atendente || 10;
    },
    enabled: open,
  });

  const maxConversas = config || 10;
  const setorNome = setores?.find((s) => s.id === setorId)?.nome;

  // Filter attendants - show all but highlight availability
  const atendentesList = atendentes || [];

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Transferir conversa</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <div>
            <Label>Setor destino *</Label>
            <Select value={setorId} onValueChange={(v) => { setSetorId(v); setAtendenteId(""); }}>
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
              <SelectTrigger><SelectValue placeholder="Sem atribuição (vai para fila)" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="none">Sem atribuição (fila)</SelectItem>
                {atendentesList.map((a) => {
                  const qtd = conversasAtivas?.[a.user_id] || 0;
                  const ocupado = qtd >= maxConversas;
                  return (
                    <SelectItem key={a.user_id} value={a.user_id}>
                      <div className="flex items-center gap-2 w-full">
                        <span>{a.full_name || "Sem nome"}</span>
                        <Badge
                          variant="outline"
                          className={cn(
                            "text-[10px] h-4 ml-auto",
                            ocupado ? "border-destructive text-destructive" : "border-green-500 text-green-600"
                          )}
                        >
                          {qtd}/{maxConversas}
                        </Badge>
                      </div>
                    </SelectItem>
                  );
                })}
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
