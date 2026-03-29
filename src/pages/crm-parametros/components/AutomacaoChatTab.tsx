import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { MessageSquare, Save } from "lucide-react";
import { useUserFiliais } from "@/hooks/useUserFiliais";

export function AutomacaoChatTab() {
  const qc = useQueryClient();
  const { filiais } = useUserFiliais();
  const [filialId, setFilialId] = useState<string>("");
  const [ativo, setAtivo] = useState(false);
  const [setorId, setSetorId] = useState<string>("");
  const [destinatarioId, setDestinatarioId] = useState<string>("");

  // Set first filial as default
  useEffect(() => {
    if (filiais.length > 0 && !filialId) {
      setFilialId(filiais[0].id);
    }
  }, [filiais]);

  // Load config for selected filial
  const { data: config, isLoading } = useQuery({
    queryKey: ["crm-automacao-chat-config", filialId],
    queryFn: async () => {
      const { data } = await (supabase as any)
        .from("crm_automacao_chat_config")
        .select("*")
        .eq("filial_id", filialId)
        .maybeSingle();
      return data;
    },
    enabled: !!filialId,
  });

  // Load setores
  const { data: setores = [] } = useQuery({
    queryKey: ["setores-list"],
    queryFn: async () => {
      const { data } = await supabase
        .from("setores")
        .select("id, nome")
        .eq("ativo", true)
        .order("nome");
      return data || [];
    },
  });

  // Load users (profiles)
  const { data: usuarios = [] } = useQuery({
    queryKey: ["profiles-list"],
    queryFn: async () => {
      const { data } = await supabase
        .from("profiles")
        .select("user_id, full_name")
        .eq("ativo", true)
        .order("full_name");
      return data || [];
    },
  });

  // Update form when config loads
  useEffect(() => {
    if (config) {
      setAtivo(config.ativo || false);
      setSetorId(config.setor_id || "");
      setDestinatarioId(config.destinatario_user_id || "");
    } else {
      setAtivo(false);
      setSetorId("");
      setDestinatarioId("");
    }
  }, [config]);

  const saveMutation = useMutation({
    mutationFn: async () => {
      if (!filialId || !destinatarioId) throw new Error("Selecione a filial e o destinatário");

      const payload = {
        filial_id: filialId,
        ativo,
        setor_id: setorId || null,
        destinatario_user_id: destinatarioId,
        updated_at: new Date().toISOString(),
      };

      if (config?.id) {
        const { error } = await (supabase as any)
          .from("crm_automacao_chat_config")
          .update(payload)
          .eq("id", config.id);
        if (error) throw error;
      } else {
        const { error } = await (supabase as any)
          .from("crm_automacao_chat_config")
          .insert(payload);
        if (error) throw error;
      }
    },
    onSuccess: () => {
      toast.success("Configuração salva!");
      qc.invalidateQueries({ queryKey: ["crm-automacao-chat-config", filialId] });
    },
    onError: (e: any) => toast.error("Erro: " + e.message),
  });

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-base">
          <MessageSquare className="h-5 w-5" />
          Automação — Notificação WhatsApp (CRM via Chat)
        </CardTitle>
        <p className="text-sm text-muted-foreground">
          Quando uma oportunidade é criada a partir do Chat, envia automaticamente uma notificação via WhatsApp com os dados da oportunidade.
        </p>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Filial selector */}
        <div>
          <Label>Filial</Label>
          <Select value={filialId} onValueChange={setFilialId}>
            <SelectTrigger><SelectValue placeholder="Selecione a filial" /></SelectTrigger>
            <SelectContent>
              {filiais.map(f => (
                <SelectItem key={f.id} value={f.id}>{f.nome}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {filialId && !isLoading && (
          <>
            {/* Ativo toggle */}
            <div className="flex items-center justify-between border rounded-lg p-3">
              <div>
                <Label className="text-sm font-medium">Automação ativa</Label>
                <p className="text-xs text-muted-foreground">Ativa ou desativa o envio automático de WhatsApp</p>
              </div>
              <Switch checked={ativo} onCheckedChange={setAtivo} />
            </div>

            {/* Setor (instância para envio) */}
            <div>
              <Label>Setor (instância de envio)</Label>
              <Select value={setorId || "__none__"} onValueChange={v => setSetorId(v === "__none__" ? "" : v)}>
                <SelectTrigger><SelectValue placeholder="Selecione..." /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="__none__">Nenhum (usar padrão)</SelectItem>
                  {setores.map(s => (
                    <SelectItem key={s.id} value={s.id}>{s.nome}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <p className="text-xs text-muted-foreground mt-1">Setor usado para determinar a instância de envio do WhatsApp</p>
            </div>

            {/* Destinatário */}
            <div>
              <Label>Destinatário da notificação *</Label>
              <Select value={destinatarioId || "__none__"} onValueChange={v => setDestinatarioId(v === "__none__" ? "" : v)}>
                <SelectTrigger><SelectValue placeholder="Selecione o usuário..." /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="__none__">Nenhum</SelectItem>
                  {usuarios.map(u => (
                    <SelectItem key={u.user_id} value={u.user_id}>{u.full_name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <p className="text-xs text-muted-foreground mt-1">Usuário que receberá a mensagem no WhatsApp pessoal</p>
            </div>

            <Button onClick={() => saveMutation.mutate()} disabled={saveMutation.isPending || !destinatarioId} className="gap-2">
              <Save className="h-4 w-4" />
              {saveMutation.isPending ? "Salvando..." : "Salvar configuração"}
            </Button>
          </>
        )}
      </CardContent>
    </Card>
  );
}
