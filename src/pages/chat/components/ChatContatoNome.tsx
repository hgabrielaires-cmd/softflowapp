import { useEffect, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { UserPlus, Building2, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { ChatConversa } from "../types";

interface ContatoInfo { id: string; nome: string; cargo: string | null; cliente_id: string; empresa: string | null }

/** Últimos 8 dígitos: casa números com/sem 55 e com/sem nono dígito. */
function final8(numero: string) {
  return (numero || "").replace(/\D/g, "").slice(-8);
}

export function useContatoDaConversa(conversa: ChatConversa | null) {
  return useQuery({
    queryKey: ["chat-contato-conversa", conversa?.id, conversa?.contato_id, conversa?.numero_cliente],
    enabled: !!conversa,
    queryFn: async (): Promise<ContatoInfo | null> => {
      const sel = "id, nome, cargo, cliente_id, clientes(nome_fantasia)";
      let row: any = null;
      if (conversa!.contato_id) {
        const { data } = await supabase.from("cliente_contatos").select(sel).eq("id", conversa!.contato_id).maybeSingle();
        row = data;
      }
      if (!row) {
        const f = final8(conversa!.numero_cliente);
        if (f.length === 8) {
          const { data } = await supabase
            .from("cliente_contatos")
            .select(sel + ", telefone")
            .eq("ativo", true)
            .ilike("telefone", `%${f.slice(0, 4)}%${f.slice(4)}%`)
            .limit(20);
          row = (data || []).find((c: any) => final8(c.telefone) === f) || null;
          if (row && !conversa!.contato_id) {
            await supabase.from("chat_conversas").update({ contato_id: row.id }).eq("id", conversa!.id);
          }
        }
      }
      if (!row) return null;
      return { id: row.id, nome: row.nome, cargo: row.cargo, cliente_id: row.cliente_id, empresa: row.clientes?.nome_fantasia || null };
    },
  });
}

export function CadastrarContatoDialog({ open, onOpenChange, conversa }: { open: boolean; onOpenChange: (v: boolean) => void; conversa: ChatConversa }) {
  const qc = useQueryClient();
  const [nome, setNome] = useState("");
  const [cargo, setCargo] = useState("");
  const [busca, setBusca] = useState("");
  const [empresas, setEmpresas] = useState<{ id: string; nome_fantasia: string; cnpj_cpf: string }[]>([]);
  const [empresa, setEmpresa] = useState<{ id: string; nome_fantasia: string } | null>(null);
  const [salvando, setSalvando] = useState(false);

  useEffect(() => {
    if (!open) return;
    setNome(((conversa as any).nome_whatsapp as string) || ""); setCargo(""); setBusca("");
    const cid = (conversa as any).cliente_id as string | null;
    if (cid) {
      supabase.from("clientes").select("id, nome_fantasia").eq("id", cid).maybeSingle().then(({ data }) => setEmpresa(data));
    } else setEmpresa(null);
  }, [open, conversa]);

  useEffect(() => {
    if (!busca.trim()) { setEmpresas([]); return; }
    const t = setTimeout(async () => {
      const { data } = await supabase.from("clientes").select("id, nome_fantasia, cnpj_cpf").eq("ativo", true)
        .or(`nome_fantasia.ilike.%${busca}%,cnpj_cpf.ilike.%${busca}%`).order("nome_fantasia").limit(10);
      setEmpresas(data || []);
    }, 300);
    return () => clearTimeout(t);
  }, [busca]);

  async function salvar() {
    if (nome.trim().length < 2) { toast.error("Informe o nome do contato"); return; }
    if (!empresa) { toast.error("Selecione a empresa"); return; }
    setSalvando(true);
    try {
      const { data, error } = await supabase.from("cliente_contatos").insert({
        cliente_id: empresa.id,
        nome: nome.trim(),
        cargo: cargo.trim() || null,
        telefone: conversa.numero_cliente.replace(/\D/g, ""),
      }).select("id").single();
      if (error) throw error;
      await supabase.from("chat_conversas").update({ contato_id: data.id, cliente_id: empresa.id }).eq("id", conversa.id);
      toast.success("Contato cadastrado!");
      qc.invalidateQueries({ queryKey: ["chat-contato-conversa"] });
      qc.invalidateQueries({ queryKey: ["chat-conversas"] });
      onOpenChange(false);
    } catch (e: any) {
      toast.error("Erro ao cadastrar: " + e.message);
    } finally {
      setSalvando(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader><DialogTitle>Cadastrar contato</DialogTitle></DialogHeader>
        <div className="space-y-3">
          <div>
            <Label className="text-xs">Telefone</Label>
            <Input value={conversa.numero_cliente} disabled className="h-9 text-sm" />
          </div>
          <div>
            <Label className="text-xs">Nome *</Label>
            <Input value={nome} onChange={(e) => setNome(e.target.value)} className="h-9 text-sm" autoFocus />
          </div>
          <div>
            <Label className="text-xs">Cargo</Label>
            <Input value={cargo} onChange={(e) => setCargo(e.target.value)} className="h-9 text-sm" />
          </div>
          <div>
            <Label className="text-xs">Empresa *</Label>
            {empresa && (
              <div className="flex items-center justify-between rounded-md border p-2 text-sm mb-1">
                <span className="flex items-center gap-2 truncate"><Building2 className="h-4 w-4 text-primary" />{empresa.nome_fantasia}</span>
                <Button size="sm" variant="ghost" className="h-6 text-xs" onClick={() => setEmpresa(null)}>Trocar</Button>
              </div>
            )}
            {!empresa && (
              <>
                <Input placeholder="Buscar por nome ou CNPJ/CPF..." value={busca} onChange={(e) => setBusca(e.target.value)} className="h-9 text-sm" />
                <div className="max-h-48 overflow-y-auto space-y-1 mt-1">
                  {empresas.map((emp) => (
                    <button key={emp.id} onClick={() => setEmpresa(emp)}
                      className={cn("w-full text-left p-2 rounded-md border text-sm hover:bg-accent/50")}>
                      <p className="font-medium truncate">{emp.nome_fantasia}</p>
                      <p className="text-xs text-muted-foreground font-mono">{emp.cnpj_cpf}</p>
                    </button>
                  ))}
                </div>
              </>
            )}
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancelar</Button>
          <Button onClick={salvar} disabled={salvando}>
            {salvando ? <Loader2 className="h-4 w-4 animate-spin" /> : <UserPlus className="h-4 w-4 mr-1" />} Cadastrar
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
