import { useQuery } from "@tanstack/react-query";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";
import { Building2, User, Phone, Mail, MapPin, FileText, Package, Loader2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useClienteDocumentos } from "@/hooks/useClienteDocumentos";
import { Button } from "@/components/ui/button";
import { Download } from "lucide-react";

interface Props {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  clienteId: string | null;
}

export default function ChatClienteCadastroDialog({ open, onOpenChange, clienteId }: Props) {
  const { data: cliente, isLoading } = useQuery({
    queryKey: ["chat-cliente-cadastro", clienteId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("clientes")
        .select("*")
        .eq("id", clienteId!)
        .single();
      if (error) throw error;
      return data;
    },
    enabled: !!clienteId && open,
  });

  const { data: contatos = [] } = useQuery({
    queryKey: ["chat-cliente-cadastro-contatos", clienteId],
    queryFn: async () => {
      const { data } = await supabase
        .from("cliente_contatos")
        .select("*")
        .eq("cliente_id", clienteId!)
        .eq("ativo", true)
        .order("decisor", { ascending: false })
        .limit(50);
      return data || [];
    },
    enabled: !!clienteId && open,
  });

  const { documentos, isLoading: loadingDocs } = useClienteDocumentos(open ? clienteId : null);

  // Fetch active contracts with plan info + modules
  const { data: servicos, isLoading: loadingServicos } = useQuery({
    queryKey: ["chat-cliente-servicos", clienteId],
    queryFn: async () => {
      // Get active contratos_financeiros
      const { data: cfs } = await supabase
        .from("contratos_financeiros")
        .select("id, tipo, plano_id, contrato_id, planos(nome, descricao)")
        .eq("cliente_id", clienteId!)
        .ilike("status", "ativo");
      if (!cfs || cfs.length === 0) return null;

      // Get active modules for these contracts
      const cfIds = cfs.map(c => c.id);
      const { data: modulos } = await supabase
        .from("contrato_financeiro_modulos")
        .select("id, nome, ativo")
        .in("contrato_financeiro_id", cfIds)
        .eq("ativo", true);

      return { contratos: cfs, modulos: modulos || [] };
    },
    enabled: !!clienteId && open,
  });

  function formatCnpj(v: string) {
    const n = (v || "").replace(/\D/g, "").slice(0, 14);
    if (n.length <= 11) return n.replace(/(\d{3})(\d{3})(\d{3})(\d{0,2})/, "$1.$2.$3-$4");
    return n.replace(/(\d{2})(\d{3})(\d{3})(\d{4})(\d{0,2})/, "$1.$2.$3/$4-$5");
  }

  const handleDownload = async (url: string, nome: string) => {
    try {
      const isR2 = url.includes(".r2.dev/") || url.includes("r2.cloudflarestorage.com");
      if (isR2) {
        const key = new URL(url).pathname.replace(/^\//, "");
        const { data, error } = await supabase.functions.invoke("r2-download", {
          body: { key, filename: nome },
        });
        if (error) throw error;
        const blob = data instanceof Blob ? data : new Blob([data]);
        const blobUrl = URL.createObjectURL(blob);
        const link = document.createElement("a");
        link.href = blobUrl;
        link.download = nome;
        link.click();
        URL.revokeObjectURL(blobUrl);
      } else {
        window.open(url, "_blank");
      }
    } catch {
      window.open(url, "_blank");
    }
  };

  const endereco = cliente
    ? [cliente.logradouro, cliente.numero, cliente.complemento, cliente.bairro, cliente.cidade, cliente.uf, cliente.cep]
        .filter(Boolean)
        .join(", ")
    : "";

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg max-h-[85vh] p-0">
        <DialogHeader className="p-4 pb-2">
          <DialogTitle className="flex items-center gap-2 text-base">
            <Building2 className="h-4 w-4" />
            {cliente?.nome_fantasia || "Cadastro do Cliente"}
          </DialogTitle>
        </DialogHeader>

        {isLoading ? (
          <div className="flex justify-center py-10">
            <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
          </div>
        ) : cliente ? (
          <Tabs defaultValue="geral" className="px-4 pb-4">
            <TabsList className="w-full">
              <TabsTrigger value="geral" className="flex-1 text-xs">Dados Gerais</TabsTrigger>
              <TabsTrigger value="anexos" className="flex-1 text-xs">Anexos</TabsTrigger>
              <TabsTrigger value="servicos" className="flex-1 text-xs">Serviços / Produtos</TabsTrigger>
            </TabsList>

            {/* DADOS GERAIS */}
            <TabsContent value="geral">
              <ScrollArea className="max-h-[55vh]">
                <div className="space-y-4 pr-2">
                  {/* Empresa */}
                  <div className="space-y-2">
                    <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Empresa</h4>
                    <div className="grid grid-cols-2 gap-2 text-sm">
                      <div>
                        <p className="text-[11px] text-muted-foreground">Nome Fantasia</p>
                        <p className="font-medium text-foreground">{cliente.nome_fantasia}</p>
                      </div>
                      {cliente.razao_social && (
                        <div className="col-span-2">
                          <p className="text-[11px] text-muted-foreground">Razão Social</p>
                          <p className="text-foreground">{cliente.razao_social}</p>
                        </div>
                      )}
                      <div>
                        <p className="text-[11px] text-muted-foreground">CNPJ / CPF</p>
                        <p className="font-mono text-foreground">{formatCnpj(cliente.cnpj_cpf)}</p>
                      </div>
                      <div>
                        <p className="text-[11px] text-muted-foreground">Inscrição Estadual</p>
                        <p className="text-foreground">{cliente.inscricao_estadual || "Isento / Não informado"}</p>
                      </div>
                    </div>
                    {endereco && (
                      <div>
                        <p className="text-[11px] text-muted-foreground flex items-center gap-1"><MapPin className="h-3 w-3" /> Endereço</p>
                        <p className="text-sm text-foreground">{endereco}</p>
                      </div>
                    )}
                  </div>

                  {/* Contatos */}
                  <div className="space-y-2">
                    <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Contatos</h4>
                    {contatos.length === 0 ? (
                      <p className="text-xs text-muted-foreground">Nenhum contato cadastrado.</p>
                    ) : (
                      <div className="space-y-2">
                        {contatos.map((ct: any) => (
                          <div key={ct.id} className="bg-muted/40 rounded-md p-2.5 space-y-0.5">
                            <div className="flex items-center gap-2">
                              <User className="h-3 w-3 text-muted-foreground" />
                              <span className="text-sm font-medium text-foreground">{ct.nome}</span>
                              {ct.decisor && <Badge variant="outline" className="text-[10px] h-4">Decisor</Badge>}
                            </div>
                            {ct.cargo && (
                              <p className="text-[11px] text-muted-foreground ml-5">{ct.cargo}</p>
                            )}
                            {ct.telefone && (
                              <p className="text-[11px] text-muted-foreground ml-5 flex items-center gap-1">
                                <Phone className="h-2.5 w-2.5" /> {ct.telefone}
                              </p>
                            )}
                            {ct.email && (
                              <p className="text-[11px] text-muted-foreground ml-5 flex items-center gap-1">
                                <Mail className="h-2.5 w-2.5" /> {ct.email}
                              </p>
                            )}
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              </ScrollArea>
            </TabsContent>

            {/* ANEXOS */}
            <TabsContent value="anexos">
              <ScrollArea className="max-h-[55vh]">
                <div className="space-y-2 pr-2">
                  {loadingDocs ? (
                    <div className="flex justify-center py-6">
                      <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
                    </div>
                  ) : documentos.length === 0 ? (
                    <p className="text-xs text-muted-foreground text-center py-6">Nenhum documento cadastrado.</p>
                  ) : (
                    documentos.map((doc) => (
                      <div key={doc.id} className="flex items-center justify-between bg-muted/40 rounded-md px-3 py-2 text-sm">
                        <button
                          type="button"
                          onClick={() => handleDownload(doc.url, doc.nome)}
                          className="flex items-center gap-2 text-primary hover:underline cursor-pointer bg-transparent border-none p-0 text-left"
                        >
                          <FileText className="h-3.5 w-3.5 flex-shrink-0" />
                          <span className="truncate max-w-[280px]">{doc.nome}</span>
                        </button>
                        <span className="text-[10px] text-muted-foreground whitespace-nowrap ml-2">
                          {new Date(doc.criado_em).toLocaleDateString("pt-BR")}
                        </span>
                      </div>
                    ))
                  )}
                </div>
              </ScrollArea>
            </TabsContent>

            {/* SERVIÇOS / PRODUTOS */}
            <TabsContent value="servicos">
              <ScrollArea className="max-h-[55vh]">
                <div className="space-y-3 pr-2">
                  {loadingServicos ? (
                    <div className="flex justify-center py-6">
                      <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
                    </div>
                  ) : !servicos || servicos.contratos.length === 0 ? (
                    <p className="text-xs text-muted-foreground text-center py-6">Nenhum serviço/produto ativo.</p>
                  ) : (
                    <>
                      {servicos.contratos.map((cf: any) => {
                        const plano = cf.planos as any;
                        return (
                          <div key={cf.id} className="bg-muted/40 rounded-md p-3 space-y-1.5">
                            <div className="flex items-center gap-2">
                              <Package className="h-3.5 w-3.5 text-primary" />
                              <span className="text-sm font-medium text-foreground">
                                {plano?.nome || "Plano não informado"}
                              </span>
                              <Badge variant="outline" className="text-[10px] h-4">{cf.tipo}</Badge>
                            </div>
                            {plano?.descricao && (
                              <p className="text-[11px] text-muted-foreground ml-5">{plano.descricao}</p>
                            )}
                          </div>
                        );
                      })}

                      {servicos.modulos.length > 0 && (
                        <div className="space-y-1.5">
                          <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Módulos Adicionais</h4>
                          {servicos.modulos.map((m: any) => (
                            <div key={m.id} className="flex items-center gap-2 bg-muted/40 rounded-md px-3 py-2">
                              <Package className="h-3 w-3 text-muted-foreground" />
                              <span className="text-sm text-foreground">{m.nome}</span>
                            </div>
                          ))}
                        </div>
                      )}
                    </>
                  )}
                </div>
              </ScrollArea>
            </TabsContent>
          </Tabs>
        ) : null}
      </DialogContent>
    </Dialog>
  );
}
