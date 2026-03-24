import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Building2, Search, X } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { ChatConversa } from "../types";

interface Props {
  open: boolean;
  onClose: () => void;
  conversa: ChatConversa | null;
  onConfirm: (clienteId: string, titulo: string) => void;
  isPending?: boolean;
}

export default function EncerrarAtendimentoDialog({ open, onClose, conversa, onConfirm, isPending }: Props) {
  const [titulo, setTitulo] = useState("");
  const [empresaId, setEmpresaId] = useState<string | null>(null);
  const [empresaNome, setEmpresaNome] = useState<string | null>(null);
  const [termoBusca, setTermoBusca] = useState("");
  const [resultados, setResultados] = useState<any[]>([]);
  const [buscando, setBuscando] = useState(false);

  // Pre-fill when dialog opens
  useEffect(() => {
    if (open && conversa) {
      setTitulo((conversa as any).titulo_atendimento || "");
      if (conversa.cliente_id && conversa.cliente) {
        setEmpresaId(conversa.cliente_id);
        setEmpresaNome((conversa.cliente as any)?.nome_fantasia || null);
      } else {
        setEmpresaId(null);
        setEmpresaNome(null);
      }
      setTermoBusca("");
      setResultados([]);
    }
  }, [open, conversa]);

  async function buscarEmpresa(termo: string) {
    setTermoBusca(termo);
    if (termo.trim().length < 2) {
      setResultados([]);
      return;
    }
    setBuscando(true);
    try {
      const limpo = termo.replace(/\D/g, "");
      let query = supabase
        .from("clientes")
        .select("id, nome_fantasia, razao_social, cnpj_cpf")
        .eq("ativo", true)
        .limit(8);

      const filters = [
        `nome_fantasia.ilike.%${termo}%`,
        `razao_social.ilike.%${termo}%`,
      ];
      if (limpo.length >= 3) filters.push(`cnpj_cpf.ilike.%${limpo}%`);
      query = query.or(filters.join(","));

      const { data } = await query;
      setResultados(data || []);
    } finally {
      setBuscando(false);
    }
  }

  function selecionarEmpresa(cli: any) {
    setEmpresaId(cli.id);
    setEmpresaNome(cli.nome_fantasia);
    setTermoBusca("");
    setResultados([]);
  }

  function limparEmpresa() {
    setEmpresaId(null);
    setEmpresaNome(null);
  }

  const podeConfirmar = !!empresaId && titulo.trim().length >= 5;

  return (
    <Dialog open={open} onOpenChange={(v) => { if (!v) onClose(); }}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            📋 Encerrar Atendimento
          </DialogTitle>
          {conversa?.protocolo && (
            <p className="text-sm text-muted-foreground">Protocolo: {conversa.protocolo}</p>
          )}
        </DialogHeader>

        <div className="space-y-4 py-2">
          {/* Empresa */}
          <div className="space-y-2">
            <Label>Empresa <span className="text-destructive">*</span></Label>
            {empresaId && empresaNome ? (
              <div className="flex items-center gap-2 border rounded-lg p-2.5 bg-muted/30">
                <Building2 className="h-4 w-4 text-muted-foreground shrink-0" />
                <span className="text-sm font-medium flex-1 truncate">{empresaNome}</span>
                <Badge variant="outline" className="text-[10px] text-green-600 border-green-300">✓</Badge>
                <Button type="button" variant="ghost" size="sm" className="h-6 w-6 p-0" onClick={limparEmpresa}>
                  <X className="h-3 w-3" />
                </Button>
              </div>
            ) : (
              <div className="space-y-1.5">
                <div className="relative">
                  <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                  <Input
                    placeholder="Buscar por nome ou CNPJ..."
                    value={termoBusca}
                    onChange={(e) => buscarEmpresa(e.target.value)}
                    className="pl-9"
                  />
                </div>
                {resultados.length > 0 && (
                  <div className="border rounded-lg max-h-40 overflow-y-auto divide-y">
                    {resultados.map((cli) => (
                      <button
                        key={cli.id}
                        type="button"
                        className="w-full text-left px-3 py-2 hover:bg-muted/50 transition-colors"
                        onClick={() => selecionarEmpresa(cli)}
                      >
                        <p className="text-sm font-medium">{cli.nome_fantasia}</p>
                        <p className="text-xs text-muted-foreground">{cli.cnpj_cpf}</p>
                      </button>
                    ))}
                  </div>
                )}
                {termoBusca.length >= 2 && resultados.length === 0 && !buscando && (
                  <p className="text-xs text-muted-foreground text-center py-1">Nenhuma empresa encontrada</p>
                )}
              </div>
            )}
          </div>

          {/* Título */}
          <div className="space-y-2">
            <Label>Título do atendimento <span className="text-destructive">*</span></Label>
            <Input
              placeholder="Ex: Problema no PDV, dúvida sobre faturamento..."
              value={titulo}
              onChange={(e) => setTitulo(e.target.value)}
              maxLength={200}
            />
            {titulo.length > 0 && titulo.length < 5 && (
              <p className="text-xs text-destructive">Mínimo 5 caracteres</p>
            )}
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose} disabled={isPending}>Cancelar</Button>
          <Button
            variant="destructive"
            onClick={() => onConfirm(empresaId!, titulo.trim())}
            disabled={!podeConfirmar || isPending}
          >
            {isPending ? "Encerrando..." : "Confirmar Encerramento"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
