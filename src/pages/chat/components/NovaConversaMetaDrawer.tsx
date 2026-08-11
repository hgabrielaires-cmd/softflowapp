import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { useAuth } from "@/context/AuthContext";
import { MetaVariavel, sincronizarVariaveis, resolverVariaveis } from "@/lib/meta-variaveis";

import {
  Building2, Search, User, Phone, ChevronLeft, ChevronRight,
  BadgeCheck, Send, Loader2,
} from "lucide-react";
import { cn, applyPhoneMask } from "@/lib/utils";

interface Props {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  onConversaCriada: (conversaId: string) => void;
}

interface ClienteResult { id: string; nome_fantasia: string; cnpj_cpf: string }
interface ContatoResult { id: string; nome: string; telefone: string | null; decisor: boolean }
interface TemplateMeta {
  id: string;
  nome: string;
  conteudo: string;
  meta_template_name: string | null;
  meta_language: string | null;
  meta_template_status: string | null;
  meta_variaveis: MetaVariavel[] | null;
}

const VAR_REGEX = /\{\{(\d+)\}\}/g;


export default function NovaConversaMetaDrawer({ open, onOpenChange, onConversaCriada }: Props) {
  const { user, profile } = useAuth();
  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(false);
  const [enviando, setEnviando] = useState(false);

  const [busca, setBusca] = useState("");
  const [empresas, setEmpresas] = useState<ClienteResult[]>([]);
  const [recentes, setRecentes] = useState<ClienteResult[]>([]);
  const [empresa, setEmpresa] = useState<ClienteResult | null>(null);

  const [contatos, setContatos] = useState<ContatoResult[]>([]);
  const [contato, setContato] = useState<ContatoResult | null>(null);
  const [numeroManual, setNumeroManual] = useState("");

  const [templates, setTemplates] = useState<TemplateMeta[]>([]);
  const [template, setTemplate] = useState<TemplateMeta | null>(null);
  const [params, setParams] = useState<string[]>([]);

  useEffect(() => {
    if (open) {
      supabase
        .from("clientes")
        .select("id, nome_fantasia, cnpj_cpf")
        .eq("ativo", true)
        .order("updated_at", { ascending: false })
        .limit(5)
        .then(({ data }) => setRecentes(data || []));
    } else {
      setStep(1); setBusca(""); setEmpresas([]); setEmpresa(null);
      setContato(null); setNumeroManual(""); setTemplate(null); setParams([]);
    }
  }, [open]);

  useEffect(() => {
    if (!busca.trim()) { setEmpresas([]); return; }
    const t = setTimeout(async () => {
      setLoading(true);
      const { data } = await supabase
        .from("clientes")
        .select("id, nome_fantasia, cnpj_cpf")
        .eq("ativo", true)
        .or(`nome_fantasia.ilike.%${busca}%,cnpj_cpf.ilike.%${busca}%`)
        .order("nome_fantasia")
        .limit(20);
      setEmpresas(data || []);
      setLoading(false);
    }, 300);
    return () => clearTimeout(t);
  }, [busca]);

  useEffect(() => {
    if (!empresa) return;
    supabase
      .from("cliente_contatos")
      .select("id, nome, telefone, decisor")
      .eq("cliente_id", empresa.id)
      .eq("ativo", true)
      .order("decisor", { ascending: false })
      .then(({ data }) => setContatos((data || []) as ContatoResult[]));
  }, [empresa]);

  useEffect(() => {
    if (step !== 3) return;
    supabase
      .from("message_templates")
      .select("id, nome, conteudo, meta_template_name, meta_language, meta_template_status, meta_variaveis")
      .eq("tipo", "whatsapp_meta")
      .eq("ativo", true)
      .order("nome")
      .then(({ data }) => setTemplates(((data || []) as unknown as TemplateMeta[]).filter(t => t.meta_template_name)));
  }, [step]);

  function numeroFinal() {
    if (contato?.telefone) return contato.telefone.replace(/\D/g, "");
    return numeroManual.replace(/\D/g, "");
  }

  function selecionarTemplate(t: TemplateMeta) {
    setTemplate(t);
    const vars = sincronizarVariaveis(
      t.conteudo,
      Array.isArray(t.meta_variaveis) ? t.meta_variaveis : [],
    );
    const resolvidos = resolverVariaveis(vars, {
      contato: contato ? { nome: contato.nome, telefone: contato.telefone } : null,
      cliente: empresa ? { nome_fantasia: empresa.nome_fantasia, cnpj_cpf: (empresa as any).cnpj_cpf } : null,
      usuario: { nome: (user?.user_metadata as any)?.full_name || "" },
    });
    setParams(resolvidos.map((v, i) => v || (i === 0 ? (contato?.nome || empresa?.nome_fantasia || "") : "")));
  }


  const preview = template
    ? template.conteudo.replace(VAR_REGEX, (_m, i) => params[Number(i) - 1] || `{{${i}}}`)
    : "";

  async function enviar() {
    if (!user?.id || !empresa || !template?.meta_template_name) return;
    const numero = numeroFinal();
    if (numero.length < 10) { toast.error("Número inválido"); return; }
    if (params.some((p) => !p.trim())) { toast.error("Preencha todas as variáveis do template"); return; }

    setEnviando(true);
    try {
      const agora = new Date();
      const hoje = agora.toISOString().slice(0, 10).replace(/-/g, "");
      const { count } = await supabase
        .from("chat_conversas")
        .select("id", { count: "exact", head: true })
        .gte("created_at", agora.toISOString().slice(0, 10));
      const protocolo = `#${hoje}${((count || 0) + 1).toString().padStart(3, "0")}`;
      const agoraISO = agora.toISOString();

      const { data: conv, error } = await supabase
        .from("chat_conversas")
        .insert({
          protocolo,
          numero_cliente: numero,
          nome_cliente: contato?.nome || empresa.nome_fantasia,
          cliente_id: empresa.id,
          contato_id: contato?.id || null,
          status: "aguardando_cliente",
          atendente_id: user.id,
          canal: "whatsapp_meta",
          canal_instancia: "meta_oficial",
          iniciado_em: agoraISO,
          updated_at: agoraISO,
        })
        .select("id")
        .single();
      if (error) throw error;

      const userName = (profile as any)?.full_name || "Atendente";
      await supabase.from("chat_mensagens").insert({
        conversa_id: conv.id,
        tipo: "sistema",
        conteudo: `${userName} enviou o template oficial "${template.nome}" — aguardando resposta do cliente`,
        remetente: "sistema",
      });

      const { data: res, error: fnErr } = await supabase.functions.invoke("whatsapp-meta", {
        body: {
          action: "send_template",
          to: numero,
          template_name: template.meta_template_name,
          language: template.meta_language || "pt_BR",
          params,
        },
      });
      if (fnErr || (res && res.ok === false)) {
        throw new Error(fnErr?.message || res?.error?.error?.message || "Falha ao enviar template");
      }

      await supabase.from("chat_mensagens").insert({
        conversa_id: conv.id,
        tipo: "texto",
        conteudo: preview,
        remetente: "atendente",
        atendente_id: user.id,
      });

      toast.success("Template enviado! Aguardando o cliente iniciar a conversa.");
      onOpenChange(false);
      onConversaCriada(conv.id);
    } catch (e: any) {
      toast.error("Erro: " + e.message);
    } finally {
      setEnviando(false);
    }
  }

  const lista = busca.trim() ? empresas : recentes;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg max-h-[85vh] flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <BadgeCheck className="h-5 w-5 text-emerald-600" />
            Nova Conversa Oficial (Meta)
            <Badge variant="outline" className="text-[10px] ml-2">Passo {step}/3</Badge>
          </DialogTitle>
        </DialogHeader>

        <div className="flex-1 overflow-y-auto min-h-0 space-y-3 pr-1">
          {step === 1 && (
            <>
              <div className="relative">
                <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Buscar por nome ou CNPJ/CPF..."
                  value={busca}
                  onChange={(e) => setBusca(e.target.value)}
                  className="pl-9 h-9 text-sm"
                  autoFocus
                />
              </div>
              <Label className="text-xs text-muted-foreground">
                {busca.trim() ? "Resultados" : "Empresas recentes"}
              </Label>
              <ScrollArea className="max-h-[350px]">
                <div className="space-y-1">
                  {loading && (
                    <div className="flex justify-center py-6">
                      <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
                    </div>
                  )}
                  {!loading && lista.length === 0 && (
                    <p className="text-sm text-muted-foreground text-center py-6">Nenhuma empresa encontrada</p>
                  )}
                  {!loading && lista.map((emp) => (
                    <button
                      key={emp.id}
                      onClick={() => { setEmpresa(emp); setContato(null); setStep(2); }}
                      className="w-full text-left p-3 rounded-lg border hover:bg-accent/50 transition-colors flex items-center gap-3"
                    >
                      <div className="h-8 w-8 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
                        <Building2 className="h-4 w-4 text-primary" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium truncate">{emp.nome_fantasia}</p>
                        <p className="text-xs text-muted-foreground font-mono">{emp.cnpj_cpf}</p>
                      </div>
                      <ChevronRight className="h-4 w-4 text-muted-foreground" />
                    </button>
                  ))}
                </div>
              </ScrollArea>
            </>
          )}

          {step === 2 && empresa && (
            <>
              <div className="bg-muted/30 rounded-lg p-2 flex items-center gap-2 text-sm">
                <Building2 className="h-4 w-4 text-primary" />
                <span className="font-medium">{empresa.nome_fantasia}</span>
              </div>
              <Label className="text-xs font-semibold">Contatos</Label>
              {contatos.length > 0 ? (
                <div className="space-y-1">
                  {contatos.map((ct) => (
                    <button
                      key={ct.id}
                      onClick={() => { setContato(ct); setNumeroManual(""); }}
                      className={cn(
                        "w-full text-left p-2.5 rounded-lg border transition-colors flex items-center gap-3",
                        contato?.id === ct.id ? "bg-primary/10 border-primary/40" : "hover:bg-accent/50"
                      )}
                    >
                      <div className="h-7 w-7 rounded-full bg-muted flex items-center justify-center flex-shrink-0">
                        <User className="h-3.5 w-3.5 text-muted-foreground" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium truncate flex items-center gap-1.5">
                          {ct.nome}
                          {ct.decisor && <Badge variant="secondary" className="text-[9px] h-3.5 px-1">Decisor</Badge>}
                        </p>
                        {ct.telefone && (
                          <p className="text-xs text-muted-foreground flex items-center gap-1">
                            <Phone className="h-2.5 w-2.5" /> {applyPhoneMask(ct.telefone)}
                          </p>
                        )}
                      </div>
                    </button>
                  ))}
                </div>
              ) : (
                <p className="text-xs text-muted-foreground">Nenhum contato cadastrado.</p>
              )}
              <div className="border-t pt-3 mt-2">
                <Label className="text-xs">Ou digite o número manualmente</Label>
                <Input
                  placeholder="(00) 00000-0000"
                  value={applyPhoneMask(numeroManual)}
                  onChange={(e) => { setNumeroManual(e.target.value.replace(/\D/g, "")); setContato(null); }}
                  className="h-9 text-sm mt-1"
                />
              </div>
            </>
          )}

          {step === 3 && (
            <>
              <div className="bg-muted/30 rounded-lg p-2 flex items-center gap-2 text-sm">
                <Building2 className="h-4 w-4 text-primary" />
                <span className="font-medium">{empresa?.nome_fantasia}</span>
                <span className="mx-1 text-muted-foreground">→</span>
                <span className="font-mono text-xs">{applyPhoneMask(numeroFinal())}</span>
              </div>

              <Label className="text-xs font-semibold">Template aprovado</Label>
              {templates.length === 0 && (
                <p className="text-xs text-muted-foreground">
                  Nenhum template Meta ativo. Cadastre em Parâmetros → Modelos de Mensagens.
                </p>
              )}
              <div className="space-y-1">
                {templates.map((t) => (
                  <button
                    key={t.id}
                    onClick={() => selecionarTemplate(t)}
                    className={cn(
                      "w-full text-left p-2.5 rounded-lg border text-xs transition-colors",
                      template?.id === t.id ? "bg-primary/10 border-primary/40" : "hover:bg-accent/50"
                    )}
                  >
                    <div className="flex items-center gap-2">
                      <span className="font-medium text-sm">{t.nome}</span>
                      <span className="font-mono text-[10px] text-muted-foreground">{t.meta_template_name}</span>
                      {t.meta_template_status === "approved" && (
                        <Badge variant="outline" className="text-[9px] h-4 text-emerald-600 border-emerald-200">Aprovado</Badge>
                      )}
                    </div>
                  </button>
                ))}
              </div>

              {template && params.length > 0 && (
                <div className="space-y-2 border-t pt-3">
                  <Label className="text-xs font-semibold">Variáveis</Label>
                  {params.map((p, i) => (
                    <div key={i} className="flex items-center gap-2">
                      <span className="font-mono text-xs text-muted-foreground w-10">{`{{${i + 1}}}`}</span>
                      <Input
                        value={p}
                        onChange={(e) => setParams((arr) => arr.map((x, ix) => ix === i ? e.target.value : x))}
                        className="h-8 text-xs"
                      />
                    </div>
                  ))}
                </div>
              )}

              {template && (
                <div className="border-t pt-3">
                  <Label className="text-xs font-semibold">Preview</Label>
                  <div className="mt-1 rounded-lg bg-emerald-50 dark:bg-emerald-950/20 border border-emerald-200 dark:border-emerald-900 p-3 text-sm whitespace-pre-wrap">
                    {preview}
                  </div>
                </div>
              )}
            </>
          )}
        </div>

        <DialogFooter className="gap-2 flex-wrap">
          {step > 1 && (
            <Button variant="outline" onClick={() => setStep(step - 1)} disabled={enviando}>
              <ChevronLeft className="h-4 w-4 mr-1" /> Voltar
            </Button>
          )}
          {step === 1 && (
            <Button variant="outline" onClick={() => onOpenChange(false)}>Cancelar</Button>
          )}
          {step === 2 && (
            <Button onClick={() => setStep(3)} disabled={numeroFinal().length < 10}>
              Próximo <ChevronRight className="h-4 w-4 ml-1" />
            </Button>
          )}
          {step === 3 && (
            <Button onClick={enviar} disabled={enviando || !template} className="gap-1">
              {enviando ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
              Enviar template
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
