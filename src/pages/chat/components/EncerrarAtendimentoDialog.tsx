import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Building2, Search, X, Link2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { ChatConversa } from "../types";
import { useAuth } from "@/context/AuthContext";
import { cn } from "@/lib/utils";

interface Props {
  open: boolean;
  onClose: () => void;
  conversa: ChatConversa | null;
  onConfirm: (clienteId: string, titulo: string) => void;
  isPending?: boolean;
}

export default function EncerrarAtendimentoDialog({ open, onClose, conversa, onConfirm, isPending }: Props) {
  const { roles } = useAuth();
  const isAdmin = roles.includes("admin");

  const [titulo, setTitulo] = useState("");
  const [empresaId, setEmpresaId] = useState<string | null>(null);
  const [empresaNome, setEmpresaNome] = useState<string | null>(null);
  const [termoBusca, setTermoBusca] = useState("");
  const [resultados, setResultados] = useState<any[]>([]);
  const [buscando, setBuscando] = useState(false);

  // Empresas do contato (pelo telefone)
  const [empresasContato, setEmpresasContato] = useState<any[]>([]);
  const [loadingContato, setLoadingContato] = useState(false);

  // Permission check
  const [canVincular, setCanVincular] = useState(isAdmin);
  const [permLoaded, setPermLoaded] = useState(isAdmin);

  useEffect(() => {
    if (isAdmin) {
      setCanVincular(true);
      setPermLoaded(true);
      return;
    }
    if (roles.length === 0) {
      setCanVincular(false);
      setPermLoaded(true);
      return;
    }
    supabase
      .from("role_permissions")
      .select("permissao")
      .in("role", roles)
      .eq("permissao", "acao.vincular_contato_empresa")
      .eq("ativo", true)
      .then(({ data }) => {
        setCanVincular((data || []).length > 0);
        setPermLoaded(true);
      });
  }, [roles.join(","), isAdmin]);

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

  // Load empresas vinculadas ao contato pelo telefone
  useEffect(() => {
    if (!open || !conversa?.numero_cliente) {
      setEmpresasContato([]);
      return;
    }
    // Only load if no empresa linked yet
    if (conversa.cliente_id) {
      setEmpresasContato([]);
      return;
    }

    const loadEmpresas = async () => {
      setLoadingContato(true);
      const limpo = conversa.numero_cliente.replace(/\D/g, "");
      if (limpo.length < 8) {
        setEmpresasContato([]);
        setLoadingContato(false);
        return;
      }
      const ultimos8 = limpo.slice(-8);

      const { data: contatos } = await supabase
        .from("cliente_contatos")
        .select("cliente_id, clientes(id, nome_fantasia, cnpj_cpf)")
        .ilike("telefone", `%${ultimos8}%`)
        .eq("ativo", true)
        .limit(20);

      if (contatos && contatos.length > 0) {
        const empresasMap = new Map<string, any>();
        for (const c of contatos) {
          const cli = c.clientes as any;
          if (cli?.id && !empresasMap.has(cli.id)) {
            empresasMap.set(cli.id, { id: cli.id, nome_fantasia: cli.nome_fantasia, cnpj_cpf: cli.cnpj_cpf });
          }
        }
        setEmpresasContato(Array.from(empresasMap.values()));
      } else {
        setEmpresasContato([]);
      }
      setLoadingContato(false);
    };

    loadEmpresas();
  }, [open, conversa?.numero_cliente, conversa?.cliente_id]);

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
          <DialogDescription>
            {conversa?.protocolo ? `Protocolo: ${conversa.protocolo}` : "Preencha os dados para encerrar o atendimento."}
          </DialogDescription>
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
              <div className="space-y-2">
                {/* Empresas do contato */}
                {empresasContato.length > 0 && (
                  <div className="space-y-1.5">
                    <p className="text-xs text-muted-foreground font-medium">
                      Empresas vinculadas ao contato ({empresasContato.length})
                    </p>
                    <div className="border rounded-lg max-h-40 overflow-y-auto divide-y">
                      {empresasContato.map((cli) => (
                        <button
                          key={cli.id}
                          type="button"
                          className="w-full text-left px-3 py-2 hover:bg-muted/50 transition-colors flex items-center gap-2"
                          onClick={() => selecionarEmpresa(cli)}
                        >
                          <Building2 className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-medium truncate">{cli.nome_fantasia}</p>
                            <p className="text-xs text-muted-foreground">{cli.cnpj_cpf}</p>
                          </div>
                          <Link2 className="h-3.5 w-3.5 text-primary shrink-0" />
                        </button>
                      ))}
                    </div>
                  </div>
                )}

                {empresasContato.length === 0 && !loadingContato && !conversa?.cliente_id && (
                  <p className="text-xs text-muted-foreground italic">
                    Nenhuma empresa vinculada a este contato.
                  </p>
                )}

                {/* Search field - only for users with permission */}
                {canVincular ? (
                  <div className="space-y-1.5">
                    {empresasContato.length > 0 && (
                      <div className="flex items-center gap-2 py-1">
                        <div className="flex-1 border-t border-border" />
                        <span className="text-[10px] text-muted-foreground">ou buscar outra empresa</span>
                        <div className="flex-1 border-t border-border" />
                      </div>
                    )}
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
                ) : (
                  empresasContato.length === 0 && (
                    <p className="text-xs text-amber-600 dark:text-amber-400">
                      Você não tem permissão para vincular novas empresas. Solicite a um gestor.
                    </p>
                  )
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
