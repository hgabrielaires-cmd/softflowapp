import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/context/AuthContext";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Eye, Loader2, Package, FileText, CheckCircle, DollarSign, XCircle, ArrowUpCircle, MessageCircle, Send } from "lucide-react";
import { toast } from "sonner";

interface PlanoInfo {
  nome: string;
  descricao: string | null;
  valor_implantacao_padrao: number;
  valor_mensalidade_padrao: number;
}

interface PedidoValores {
  valor_implantacao_original: number;
  valor_implantacao_final: number;
  desconto_implantacao_valor: number;
  valor_mensalidade_original: number;
  valor_mensalidade_final: number;
  desconto_mensalidade_valor: number;
}

interface ModuloAdicional {
  modulo_id: string;
  nome: string;
  quantidade: number;
  valor_implantacao_modulo: number;
  valor_mensalidade_modulo: number;
}

interface AditivoValores {
  numero_exibicao: string;
  valor_implantacao_final: number;
  valor_mensalidade_final: number;
  modulosAdicionais: ModuloAdicional[];
}

interface CancelamentoInfo {
  numero_exibicao: string;
  modulosCancelados: ModuloAdicional[];
  valor_mensalidade_cancelada: number;
  valor_implantacao_cancelada: number;
}

interface EspelhoData {
  plano: PlanoInfo | null;
  planoAtual: PlanoInfo | null; // plano após upgrade/downgrade
  pedidoValores: PedidoValores | null;
  modulosDescricao: string[]; // módulos do plano via descrição
  modulosAdicionais: ModuloAdicional[];
  contratoNumero: string;
  aditivos: AditivoValores[];
  cancelamentos: CancelamentoInfo[];
  upgradeNumero: string | null;
}

function fmtBRL(v: number) {
  return v.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

interface Props {
  clienteId: string;
  clienteNome?: string;
  variant?: "icon" | "text";
  className?: string;
}

export function ClientePlanViewer({ clienteId, clienteNome, variant = "icon", className }: Props) {
  const { roles, profile } = useAuth();
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [data, setData] = useState<EspelhoData | null>(null);
  const [canSendWhatsapp, setCanSendWhatsapp] = useState(false);
  const [showWhatsappChoice, setShowWhatsappChoice] = useState(false);
  const [contatosCliente, setContatosCliente] = useState<{ nome: string; telefone: string | null; decisor: boolean }[]>([]);
  const [sendingWhatsapp, setSendingWhatsapp] = useState(false);

  // Check permission for sending espelho via WhatsApp
  useEffect(() => {
    async function checkPerm() {
      if (!roles.length) return;
      // Admin always can
      if (roles.includes("admin")) { setCanSendWhatsapp(true); return; }
      const { data: perms } = await supabase
        .from("role_permissions")
        .select("ativo")
        .in("role", roles)
        .eq("permissao", "acao.enviar_espelho_whatsapp")
        .eq("ativo", true)
        .limit(1);
      setCanSendWhatsapp((perms || []).length > 0);
    }
    checkPerm();
  }, [roles]);

  async function fetchEspelho() {
    setLoading(true);
    setData(null);

    // Busca contrato base ativo
    const { data: contratos } = await supabase
      .from("contratos")
      .select("id, numero_exibicao, plano_id, pedido_id")
      .eq("cliente_id", clienteId)
      .eq("status", "Ativo")
      .eq("tipo", "Base")
      .order("created_at", { ascending: false })
      .limit(1);

    const contrato = contratos?.[0];
    if (!contrato || !contrato.plano_id) {
      setData({
        plano: null, planoAtual: null, pedidoValores: null,
        modulosDescricao: [], modulosAdicionais: [],
        contratoNumero: "", aditivos: [], cancelamentos: [],
        upgradeNumero: null,
      });
      setLoading(false);
      return;
    }

    // Busca plano base e pedido base
    const [{ data: planoData }, pedidoResult] = await Promise.all([
      supabase.from("planos").select("nome, descricao, valor_implantacao_padrao, valor_mensalidade_padrao").eq("id", contrato.plano_id).single(),
      contrato.pedido_id
        ? supabase.from("pedidos")
            .select("modulos_adicionais, valor_implantacao_original, valor_implantacao_final, desconto_implantacao_valor, valor_mensalidade_original, valor_mensalidade_final, desconto_mensalidade_valor")
            .eq("id", contrato.pedido_id)
            .maybeSingle()
        : Promise.resolve({ data: null }),
    ]);

    const modulosAdicionaisBase: ModuloAdicional[] = (pedidoResult?.data?.modulos_adicionais as any[]) || [];

    const pedidoValores: PedidoValores | null = pedidoResult?.data ? {
      valor_implantacao_original: pedidoResult.data.valor_implantacao_original ?? 0,
      valor_implantacao_final: pedidoResult.data.valor_implantacao_final ?? 0,
      desconto_implantacao_valor: pedidoResult.data.desconto_implantacao_valor ?? 0,
      valor_mensalidade_original: pedidoResult.data.valor_mensalidade_original ?? 0,
      valor_mensalidade_final: pedidoResult.data.valor_mensalidade_final ?? 0,
      desconto_mensalidade_valor: pedidoResult.data.desconto_mensalidade_valor ?? 0,
    } : null;

    // Módulos do plano via descrição (separados por vírgula)
    const modulosDescricao = planoData?.descricao
      ? planoData.descricao.split(",").map((s: string) => s.trim()).filter(Boolean)
      : [];

    // Busca todos os contratos ativos (Aditivo, Cancelamento) e upgrade/downgrade
    const [{ data: aditivosContratos }, { data: cancelamentoContratos }, { data: upgradeContratos }] = await Promise.all([
      supabase.from("contratos")
        .select("pedido_id, numero_exibicao")
        .eq("cliente_id", clienteId)
        .eq("status", "Ativo")
        .eq("tipo", "Aditivo")
        .order("created_at"),
      supabase.from("contratos")
        .select("pedido_id, numero_exibicao")
        .eq("cliente_id", clienteId)
        .eq("status", "Ativo")
        .eq("tipo", "Cancelamento")
        .order("created_at"),
      supabase.from("contratos")
        .select("pedido_id, numero_exibicao, plano_id")
        .eq("cliente_id", clienteId)
        .eq("status", "Ativo")
        .in("tipo", ["Aditivo"])
        .order("created_at", { ascending: false }),
    ]);

    // Processa aditivos
    let todosAdicionais = [...modulosAdicionaisBase];
    const aditivosInfo: AditivoValores[] = [];

    if (aditivosContratos && aditivosContratos.length > 0) {
      const pedidoIds = aditivosContratos.map(a => a.pedido_id).filter(Boolean) as string[];
      if (pedidoIds.length > 0) {
        const { data: pedidosAditivos } = await supabase
          .from("pedidos")
          .select("id, modulos_adicionais, valor_implantacao_final, valor_mensalidade_final")
          .in("id", pedidoIds);
        (pedidosAditivos || []).forEach((p: any) => {
          const mods = (p.modulos_adicionais as ModuloAdicional[]) || [];
          todosAdicionais = [...todosAdicionais, ...mods];
          const adContr = aditivosContratos.find(a => a.pedido_id === p.id);
          aditivosInfo.push({
            numero_exibicao: adContr?.numero_exibicao || "",
            valor_implantacao_final: p.valor_implantacao_final || 0,
            valor_mensalidade_final: p.valor_mensalidade_final || 0,
            modulosAdicionais: mods,
          });
        });
      }
    }

    // Processa cancelamentos
    const cancelamentosInfo: CancelamentoInfo[] = [];
    if (cancelamentoContratos && cancelamentoContratos.length > 0) {
      const cancelPedidoIds = cancelamentoContratos.map(c => c.pedido_id).filter(Boolean) as string[];
      if (cancelPedidoIds.length > 0) {
        const { data: pedidosCancelamento } = await supabase
          .from("pedidos")
          .select("id, modulos_adicionais, valor_implantacao_final, valor_mensalidade_final")
          .in("id", cancelPedidoIds);
        (pedidosCancelamento || []).forEach((p: any) => {
          const mods = (p.modulos_adicionais as ModuloAdicional[]) || [];
          const cancelContr = cancelamentoContratos.find(c => c.pedido_id === p.id);
          cancelamentosInfo.push({
            numero_exibicao: cancelContr?.numero_exibicao || "",
            modulosCancelados: mods,
            valor_mensalidade_cancelada: mods.reduce((s: number, m: ModuloAdicional) => s + (m.valor_mensalidade_modulo || 0) * (m.quantidade || 1), 0),
            valor_implantacao_cancelada: 0,
          });
        });
      }
    }

    // Verifica se houve upgrade/downgrade — busca pedido de tipo Upgrade/Downgrade com contrato ativo
    let planoAtual: PlanoInfo | null = null;
    let upgradeNumero: string | null = null;

    // Busca pedidos de upgrade vinculados a contratos ativos do tipo Aditivo
    if (upgradeContratos && upgradeContratos.length > 0) {
      const upgPedidoIds = upgradeContratos.map(u => u.pedido_id).filter(Boolean) as string[];
      if (upgPedidoIds.length > 0) {
        const { data: pedidosUpgrade } = await supabase
          .from("pedidos")
          .select("id, tipo_pedido, plano_id")
          .in("id", upgPedidoIds)
          .in("tipo_pedido", ["Upgrade", "Downgrade"]);

        if (pedidosUpgrade && pedidosUpgrade.length > 0) {
          // Pega o mais recente (último upgrade/downgrade)
          const lastUpgrade = pedidosUpgrade[pedidosUpgrade.length - 1];
          const upgContr = upgradeContratos.find(u => u.pedido_id === lastUpgrade.id);
          upgradeNumero = upgContr?.numero_exibicao || null;

          if (lastUpgrade.plano_id) {
            const { data: novoPlano } = await supabase
              .from("planos")
              .select("nome, descricao, valor_implantacao_padrao, valor_mensalidade_padrao")
              .eq("id", lastUpgrade.plano_id)
              .single();
            if (novoPlano) {
              planoAtual = novoPlano as PlanoInfo;
            }
          }
        }
      }
    }

    setData({
      plano: planoData as PlanoInfo | null,
      planoAtual,
      pedidoValores,
      modulosDescricao,
      modulosAdicionais: todosAdicionais,
      contratoNumero: contrato.numero_exibicao || "",
      aditivos: aditivosInfo,
      cancelamentos: cancelamentosInfo,
      upgradeNumero,
    });
    setLoading(false);
  }

  function handleOpen() {
    setOpen(true);
    fetchEspelho();
    // Load client contacts for WhatsApp
    supabase
      .from("cliente_contatos")
      .select("nome, telefone, decisor")
      .eq("cliente_id", clienteId)
      .eq("ativo", true)
      .then(({ data: contatos }) => setContatosCliente(contatos || []));
  }

  function buildEspelhoMessage(destinatarioNome: string): string {
    if (!data || !planoEfetivo) return "";
    const planoNome = planoEfetivo.nome;
    const modulosAdTexto = (data.modulosAdicionais || [])
      .map(m => `• ${m.nome}${m.quantidade > 1 ? ` (${m.quantidade}x)` : ""} — ${fmtBRL(m.valor_mensalidade_modulo * (m.quantidade || 1))}/mês`)
      .join("\n");
    const canceladosTexto = (data.cancelamentos || [])
      .flatMap(c => c.modulosCancelados.map(m => `• ~${m.nome}${m.quantidade > 1 ? ` (${m.quantidade}x)` : ""}~ — -${fmtBRL(m.valor_mensalidade_modulo * (m.quantidade || 1))}/mês`))
      .join("\n");

    return `Olá ${destinatarioNome}! 👋

Segue o *resumo do seu plano* na Softflow:

📋 *Contrato:* ${data.contratoNumero}
📦 *Plano:* ${planoNome}

💰 *Valores:*
• Implantação: ${fmtBRL(implantacaoTotal)}
• Mensalidade: ${fmtBRL(planoMensalidade)}/mês
${modulosAdTexto ? `\n📦 *Módulos Adicionais:*\n${modulosAdTexto}` : ""}${canceladosTexto ? `\n❌ *Módulos Cancelados:*\n${canceladosTexto}` : ""}

💵 *Valor Total Mensal:* ${fmtBRL(mensalidadeTotal)}/mês

Em caso de dúvidas, estamos à disposição! 😊
_Softflow — Tecnologia que conecta._`;
  }

  async function handleSendWhatsapp(tipo: "decisor" | "usuario") {
    setSendingWhatsapp(true);
    setShowWhatsappChoice(false);
    try {
      let telefone = "";
      let nome = "";
      if (tipo === "decisor") {
        const decisor = contatosCliente.find(c => c.decisor) || contatosCliente[0];
        if (!decisor?.telefone) { toast.error("Nenhum contato decisor com telefone cadastrado."); setSendingWhatsapp(false); return; }
        telefone = decisor.telefone;
        nome = decisor.nome;
      } else {
        if (!profile?.telefone) { toast.error("Seu perfil não possui telefone cadastrado."); setSendingWhatsapp(false); return; }
        telefone = profile.telefone;
        nome = profile.full_name || "Usuário";
      }

      const mensagem = buildEspelhoMessage(nome);

      // Load WhatsApp config
      const { data: config } = await supabase
        .from("integracoes_config")
        .select("server_url, token, ativo")
        .eq("nome", "whatsapp")
        .single();

      if (!config?.ativo || !config?.server_url || !config?.token) {
        toast.error("WhatsApp não configurado ou desativado.");
        setSendingWhatsapp(false);
        return;
      }

      const numLimpo = telefone.replace(/\D/g, "");
      const numFinal = numLimpo.startsWith("55") ? numLimpo : `55${numLimpo}`;

      const { data: result, error } = await supabase.functions.invoke("evolution-api", {
        body: {
          action: "send_text",
          server_url: config.server_url,
          api_key: config.token,
          instance_name: "Softflow_WhatsApp",
          number: numFinal,
          text: mensagem,
        },
      });

      if (error || result?.error) {
        toast.error("Erro ao enviar WhatsApp: " + (result?.error || error?.message));
      } else {
        toast.success(`Resumo enviado para ${nome} via WhatsApp!`);
      }
    } catch (e: any) {
      toast.error("Erro ao enviar: " + e.message);
    }
    setSendingWhatsapp(false);
  }

  // Plano efetivo (após upgrade/downgrade, se houver)
  const planoEfetivo = data?.planoAtual || data?.plano;
  const planoImplantacao = planoEfetivo?.valor_implantacao_padrao ?? 0;
  const planoMensalidade = planoEfetivo?.valor_mensalidade_padrao ?? 0;
  const modulosDescricaoEfetivo = data?.planoAtual
    ? (data.planoAtual.descricao?.split(",").map(s => s.trim()).filter(Boolean) || [])
    : (data?.modulosDescricao || []);

  // Total de adicionais
  const totalAdicionaisMensalidade = (data?.modulosAdicionais || []).reduce((s, m) => s + (m.valor_mensalidade_modulo || 0) * (m.quantidade || 1), 0);
  const totalAdicionaisImplantacao = (data?.modulosAdicionais || []).reduce((s, m) => s + (m.valor_implantacao_modulo || 0) * (m.quantidade || 1), 0);

  // Cancelamentos
  const totalCanceladoMensalidade = (data?.cancelamentos || []).reduce((s, c) => s + c.valor_mensalidade_cancelada, 0);

  // Descontos
  const descontoImpl = data?.pedidoValores?.desconto_implantacao_valor ?? 0;
  const descontoMens = data?.pedidoValores?.desconto_mensalidade_valor ?? 0;

  // Total consolidado
  const mensalidadeTotal = planoMensalidade + totalAdicionaisMensalidade - totalCanceladoMensalidade - descontoMens;
  const implantacaoTotal = planoImplantacao + totalAdicionaisImplantacao - descontoImpl;

  const hasDescontoImpl = descontoImpl > 0;
  const hasDescontoMens = descontoMens > 0;

  return (
    <>
      {variant === "icon" ? (
        <Button type="button" variant="ghost" size="icon" className={`h-7 w-7 ${className || ""}`} onClick={handleOpen}>
          <Eye className="h-3.5 w-3.5" />
        </Button>
      ) : (
        <Button type="button" variant="outline" size="sm" className={`h-7 text-xs gap-1.5 ${className || ""}`} onClick={handleOpen}>
          <Eye className="h-3.5 w-3.5" /> Espelho
        </Button>
      )}

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-lg max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-base">
              <Eye className="h-4 w-4" />
              Espelho do Cliente{clienteNome ? ` — ${clienteNome}` : ""}
            </DialogTitle>
          </DialogHeader>

          {loading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
            </div>
          ) : !data?.plano ? (
            <p className="text-sm text-muted-foreground text-center py-8">Nenhum contrato ativo encontrado para este cliente.</p>
          ) : (
            <div className="space-y-4">
              {/* Contrato & Plano */}
              <div className="rounded-lg border border-border p-4 space-y-2">
                <div className="flex items-center gap-2">
                  <FileText className="h-4 w-4 text-primary" />
                  <span className="text-sm font-semibold">Contrato {data.contratoNumero}</span>
                </div>
                <div className="mt-2">
                  <p className="text-xs text-muted-foreground">Plano</p>
                  {data.planoAtual ? (
                    <>
                      <p className="text-sm text-muted-foreground line-through">{data.plano.nome}</p>
                      <div className="flex items-center gap-1.5 mt-1">
                        <ArrowUpCircle className="h-3.5 w-3.5 text-primary" />
                        <p className="text-sm font-medium">{data.planoAtual.nome}</p>
                        {data.upgradeNumero && (
                          <span className="text-[10px] px-1.5 py-0.5 rounded bg-primary/10 text-primary">{data.upgradeNumero}</span>
                        )}
                      </div>
                    </>
                  ) : (
                    <p className="text-sm font-medium">{data.plano.nome}</p>
                  )}
                </div>
              </div>

              {/* Valores do Plano */}
              <div className="rounded-lg border border-border p-4 space-y-3">
                <div className="flex items-center gap-2">
                  <DollarSign className="h-4 w-4 text-primary" />
                  <span className="text-sm font-semibold">Valores do Plano</span>
                </div>
                <div className="grid grid-cols-2 gap-4 mt-2">
                  <div className="space-y-1">
                    <p className="text-xs font-medium text-muted-foreground">Implantação</p>
                    <p className="text-sm font-mono font-semibold">{fmtBRL(planoImplantacao)}</p>
                  </div>
                  <div className="space-y-1">
                    <p className="text-xs font-medium text-muted-foreground">Mensalidade</p>
                    <p className="text-sm font-mono font-semibold">{fmtBRL(planoMensalidade)}/mês</p>
                  </div>
                </div>
              </div>

              {/* Módulos do Plano (via descrição) */}
              {modulosDescricaoEfetivo.length > 0 && (
                <div className="rounded-lg border border-border p-4 space-y-2">
                  <div className="flex items-center gap-2">
                    <Package className="h-4 w-4 text-primary" />
                    <span className="text-sm font-semibold">Módulos do Plano</span>
                  </div>
                  <div className="divide-y divide-border">
                    {modulosDescricaoEfetivo.map((nome, i) => (
                      <div key={i} className="flex items-center gap-2 py-2 first:pt-0 last:pb-0">
                        <CheckCircle className="h-3.5 w-3.5 text-emerald-500 flex-shrink-0" />
                        <span className="text-sm">{nome}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Módulos Adicionais */}
              {data.modulosAdicionais.length > 0 && (
                <div className="rounded-lg border border-border p-4 space-y-2">
                  <div className="flex items-center gap-2">
                    <Package className="h-4 w-4 text-indigo-500" />
                    <span className="text-sm font-semibold">Módulos Adicionais</span>
                  </div>
                  <div className="divide-y divide-border">
                    {data.modulosAdicionais.map((m, i) => (
                      <div key={i} className="flex items-center justify-between py-2 first:pt-0 last:pb-0">
                        <div className="flex items-center gap-2">
                          <Package className="h-3.5 w-3.5 text-indigo-400" />
                          <span className="text-sm">{m.nome}</span>
                          {m.quantidade > 1 && (
                            <span className="text-[10px] px-1.5 py-0.5 rounded bg-muted text-muted-foreground">x{m.quantidade}</span>
                          )}
                        </div>
                        <span className="text-xs font-mono text-muted-foreground">
                          {fmtBRL(m.valor_mensalidade_modulo * (m.quantidade || 1))}/mês
                        </span>
                      </div>
                    ))}
                  </div>
                  <div className="pt-2 border-t border-border flex justify-between">
                    <span className="text-xs font-medium text-muted-foreground">Subtotal Adicionais</span>
                    <span className="text-xs font-mono font-semibold">{fmtBRL(totalAdicionaisMensalidade)}/mês</span>
                  </div>
                </div>
              )}

              {/* Cancelamentos Parciais */}
              {data.cancelamentos.length > 0 && (
                <div className="rounded-lg border border-destructive/30 bg-destructive/5 p-4 space-y-2">
                  <div className="flex items-center gap-2">
                    <XCircle className="h-4 w-4 text-destructive" />
                    <span className="text-sm font-semibold text-destructive">Módulos Cancelados</span>
                  </div>
                  <div className="divide-y divide-destructive/20">
                    {data.cancelamentos.map((cancel, ci) => (
                      <div key={ci} className="py-2 first:pt-0 last:pb-0">
                        <p className="text-[10px] font-medium text-destructive/70 mb-1">{cancel.numero_exibicao}</p>
                        {cancel.modulosCancelados.map((m, j) => (
                          <div key={j} className="flex items-center justify-between py-1">
                            <div className="flex items-center gap-2">
                              <XCircle className="h-3.5 w-3.5 text-destructive/60" />
                              <span className="text-sm line-through text-destructive/70">{m.nome}</span>
                              {m.quantidade > 1 && (
                                <span className="text-[10px] px-1.5 py-0.5 rounded bg-destructive/10 text-destructive/60">x{m.quantidade}</span>
                              )}
                            </div>
                            <span className="text-xs font-mono line-through text-destructive/60">
                              -{fmtBRL(m.valor_mensalidade_modulo * (m.quantidade || 1))}/mês
                            </span>
                          </div>
                        ))}
                      </div>
                    ))}
                  </div>
                  <div className="pt-2 border-t border-destructive/20 flex justify-between">
                    <span className="text-xs font-medium text-destructive/70">Total Cancelado</span>
                    <span className="text-xs font-mono font-semibold text-destructive">-{fmtBRL(totalCanceladoMensalidade)}/mês</span>
                  </div>
                </div>
              )}

              {/* Aditivos (contratos) */}
              {data.aditivos.length > 0 && (
                <div className="rounded-lg border border-border p-4 space-y-3">
                  <div className="flex items-center gap-2">
                    <FileText className="h-4 w-4 text-primary" />
                    <span className="text-sm font-semibold">Termos Aditivos</span>
                  </div>
                  <div className="divide-y divide-border">
                    {data.aditivos.map((ad, i) => (
                      <div key={i} className="py-2 first:pt-0 last:pb-0">
                        <p className="text-xs font-medium">{ad.numero_exibicao}</p>
                        {ad.modulosAdicionais.length > 0 && (
                          <div className="mt-1 space-y-0.5">
                            {ad.modulosAdicionais.map((m, j) => (
                              <p key={j} className="text-xs text-muted-foreground pl-2">
                                • {m.nome} {m.quantidade > 1 ? `x${m.quantidade}` : ""} — {fmtBRL(m.valor_mensalidade_modulo * (m.quantidade || 1))}/mês
                              </p>
                            ))}
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Valor Total Consolidado */}
              <div className="rounded-lg border-2 border-primary/30 bg-primary/5 p-4 space-y-2">
                <div className="flex items-center gap-2">
                  <DollarSign className="h-4 w-4 text-primary" />
                  <span className="text-sm font-semibold">Valor Total</span>
                </div>
                <div className="grid grid-cols-2 gap-4 mt-2">
                  <div className="space-y-1">
                    <p className="text-xs font-medium text-muted-foreground">Implantação</p>
                    {hasDescontoImpl ? (
                      <>
                        <p className="text-xs font-mono line-through text-muted-foreground">
                          {fmtBRL(planoImplantacao + totalAdicionaisImplantacao)}
                        </p>
                        <p className="text-sm font-mono font-bold">{fmtBRL(implantacaoTotal)}</p>
                        <p className="text-[11px] text-emerald-600">Desc: -{fmtBRL(descontoImpl)}</p>
                      </>
                    ) : (
                      <p className="text-sm font-mono font-bold">{fmtBRL(implantacaoTotal)}</p>
                    )}
                  </div>
                  <div className="space-y-1">
                    <p className="text-xs font-medium text-muted-foreground">Mensalidade</p>
                    {(hasDescontoMens || totalCanceladoMensalidade > 0) ? (
                      <>
                        <p className="text-xs font-mono line-through text-muted-foreground">
                          {fmtBRL(planoMensalidade + totalAdicionaisMensalidade)}/mês
                        </p>
                        <p className="text-sm font-mono font-bold">{fmtBRL(mensalidadeTotal)}/mês</p>
                        {hasDescontoMens && <p className="text-[11px] text-emerald-600">Desc: -{fmtBRL(descontoMens)}/mês</p>}
                        {totalCanceladoMensalidade > 0 && <p className="text-[11px] text-destructive">Cancel: -{fmtBRL(totalCanceladoMensalidade)}/mês</p>}
                      </>
                    ) : (
                      <p className="text-sm font-mono font-bold">{fmtBRL(mensalidadeTotal)}/mês</p>
                    )}
                  </div>
                </div>
                {(data.modulosAdicionais.length > 0 || hasDescontoImpl || hasDescontoMens || totalCanceladoMensalidade > 0) && (
                  <p className="text-[10px] text-muted-foreground mt-1">
                    Plano {fmtBRL(planoMensalidade)}
                    {totalAdicionaisMensalidade > 0 ? ` + Adicionais ${fmtBRL(totalAdicionaisMensalidade)}` : ""}
                    {totalCanceladoMensalidade > 0 ? ` - Cancelados ${fmtBRL(totalCanceladoMensalidade)}` : ""}
                    {descontoMens > 0 ? ` - Desconto ${fmtBRL(descontoMens)}` : ""}
                    {" "}= {fmtBRL(mensalidadeTotal)}/mês
                  </p>
                )}
              </div>
            </div>
          )}

          <DialogFooter className="flex-col sm:flex-row gap-2">
            {canSendWhatsapp && data?.plano && (
              <Button
                variant="default"
                size="sm"
                className="gap-1.5"
                disabled={sendingWhatsapp}
                onClick={() => setShowWhatsappChoice(true)}
              >
                {sendingWhatsapp ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <MessageCircle className="h-3.5 w-3.5" />}
                Enviar Resumo no WhatsApp
              </Button>
            )}
            <Button variant="outline" onClick={() => setOpen(false)}>Fechar</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Dialog de escolha: Decisor ou Usuário */}
      <Dialog open={showWhatsappChoice} onOpenChange={setShowWhatsappChoice}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-sm">
              <MessageCircle className="h-4 w-4" />
              Enviar resumo para quem?
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-2 py-2">
            <Button
              variant="outline"
              className="w-full justify-start gap-2"
              onClick={() => handleSendWhatsapp("decisor")}
              disabled={sendingWhatsapp}
            >
              <Send className="h-3.5 w-3.5" />
              Decisor do cliente
              {contatosCliente.find(c => c.decisor) && (
                <span className="text-xs text-muted-foreground ml-auto">
                  {contatosCliente.find(c => c.decisor)?.nome}
                </span>
              )}
            </Button>
            <Button
              variant="outline"
              className="w-full justify-start gap-2"
              onClick={() => handleSendWhatsapp("usuario")}
              disabled={sendingWhatsapp}
            >
              <Send className="h-3.5 w-3.5" />
              Meu WhatsApp
              <span className="text-xs text-muted-foreground ml-auto">
                {profile?.full_name || "Você"}
              </span>
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
