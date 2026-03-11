// ─── Helpers for Contratos module ────────────────────────────────────────

import React from "react";
import { Badge } from "@/components/ui/badge";
import { CheckCircle2, XCircle, Send, MinusCircle, FilePen, FileOutput } from "lucide-react";
import type { Contrato, ModuloAdicionadoItem } from "./types";

export function fmtBRL(v: number): string {
  return v.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

// ─── Contexto necessário para gerar o Termo de Aceite ─────────────────────

export interface GerarTermoAceiteContext {
  profilesMap: Record<string, string>;
  profileFullName: string | undefined;
  contatosCliente: { nome: string; telefone: string | null; decisor: boolean; ativo: boolean; email?: string | null }[];
  linkedMessageTemplate: { conteudo: string } | null;
  filialParametros: Record<string, any>;
  contratos: Contrato[];
}

// ─── gerarTermoAceite ─────────────────────────────────────────────────────

export function gerarTermoAceite(
  contrato: Contrato,
  ctx: GerarTermoAceiteContext,
  linkAssinatura?: string,
  templateOverride?: { conteudo: string },
  contatosOverride?: { nome: string; telefone: string | null; decisor: boolean; ativo: boolean }[],
): string {
  const pedido = contrato.pedidos;
  const plano = contrato.planos;
  const nomeVendedorPedido = pedido?.vendedor_id
    ? (ctx.profilesMap[pedido.vendedor_id] || ctx.profileFullName || "{vendedor}")
    : (ctx.profileFullName || "{vendedor}");
  const nomeUsuario = ctx.profileFullName || "{nome_usuario}";
  const hora = new Date().getHours();
  const saudacao = hora >= 0 && hora < 12 ? "bom dia" : hora < 18 ? "boa tarde" : "boa noite";
  const nomeFantasia = contrato.clientes?.nome_fantasia || "{nome_fantasia}";
  const razaoSocial = contrato.clientes?.razao_social || "{razao_social}";
  const nomePlano = plano?.nome || "{plano}";
  const descricaoPlano = plano?.descricao || "";
  const modulosTexto = descricaoPlano
    ? descricaoPlano.split(",").map((m: string) => `• ${m.trim()}`).join("\n")
    : "";
  const valorMensBaseCheio = plano?.valor_mensalidade_padrao ?? 0;
  let valorMensBase = fmtBRL(valorMensBaseCheio);
  const adicionais = (pedido?.modulos_adicionais || []) as ModuloAdicionadoItem[];
  const totalAdicionais = adicionais.reduce((s, m) => s + m.valor_mensalidade_modulo * m.quantidade, 0);
  const adicionaisTexto = adicionais.length > 0
    ? adicionais.map(m => `✔️ ${m.nome} (${m.quantidade}x ${fmtBRL(m.valor_mensalidade_modulo)}) - ${fmtBRL(m.valor_mensalidade_modulo * m.quantidade)}`).join("\n")
    : "";

  const impFinal = pedido?.valor_implantacao_final ?? 0;
  const mensFinal = pedido?.valor_mensalidade_final ?? 0;

  // Parâmetros da filial do pedido
  const filialId = pedido?.filial_id || "";
  const params = ctx.filialParametros[filialId] || {};
  const regrasMens = pedido?.pagamento_mensalidade_observacao || params.regras_padrao_mensalidade || "";
  const regrasImpl = pedido?.pagamento_implantacao_observacao || params.regras_padrao_implantacao || "";
  const parcelasCartao = params.parcelas_maximas_cartao;
  const pixDesconto = params.pix_desconto_percentual;

  // Nome do decisor
  const contatosEfetivos = contatosOverride || ctx.contatosCliente;
  const decisor = contatosEfetivos.find(c => c.decisor) || contatosEfetivos[0];
  const nomeDecisor = decisor?.nome || "{nome_decisor}";

  // Se há template vinculado, usa ele com substituição de variáveis
  const effectiveTemplate = templateOverride || ctx.linkedMessageTemplate;
  if (effectiveTemplate) {
    const formasPagamento = parcelasCartao || pixDesconto > 0
      ? `Formas disponíveis:${parcelasCartao ? `\n- Até ${parcelasCartao}x no cartão sem juros` : ""}${pixDesconto > 0 ? `\n- PIX ${pixDesconto}% desconto` : ""}`
      : "";
    const adicionaisBlock = adicionais.length > 0
      ? `🔘 *ADICIONAIS*\n\n${adicionaisTexto}\n\nTotal adicionais: ${fmtBRL(totalAdicionais)}`
      : "";

    // Variáveis específicas para aditivo de módulos adicionais
    const adicionaisNovosTexto = adicionais.length > 0
      ? adicionais.map(m => `• ${m.nome} (${m.quantidade}x) - ${fmtBRL(m.valor_mensalidade_modulo * m.quantidade)}/mês`).join("\n")
      : "";
    const totalAdicionaisNovos = fmtBRL(totalAdicionais);

    // Variáveis específicas para upgrade de plano
    let planoNomeAnterior = "";
    let planoValorAnterior = "";
    let adicionaisAnterioresTexto = "";
    let valorAdicionaisAnteriores = "";
    let totalAnterior = "";
    let mensalidadeTotalUpgrade = mensFinal;

    if (contrato.contrato_origem_id) {
      const contratoOrigem = ctx.contratos.find(c => c.id === contrato.contrato_origem_id);
      if (contratoOrigem) {
        const contratoBaseId = contrato.contrato_origem_id;
        let contratoPlanoVigente = contratoOrigem;
        
        if (pedido?.tipo_pedido === "Upgrade") {
          const upgradesAnteriores = ctx.contratos.filter(c =>
            c.status === "Ativo" &&
            c.id !== contrato.id &&
            c.contrato_origem_id === contratoBaseId &&
            c.pedidos?.tipo_pedido === "Upgrade" &&
            c.plano_id
          ).sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
          
          if (upgradesAnteriores.length > 0) {
            contratoPlanoVigente = upgradesAnteriores[0];
          }
        }

        const planoAnterior = contratoPlanoVigente.planos;
        planoNomeAnterior = planoAnterior?.nome || "";
        const valorMensPlanoAntCheio = planoAnterior?.valor_mensalidade_padrao ?? 0;

        const contratosHierarquia = ctx.contratos.filter(c => 
          c.status === "Ativo" &&
          c.id !== contrato.id &&
          (c.id === contratoBaseId || c.contrato_origem_id === contratoBaseId)
        );
        const todosAdicionaisExistentes: ModuloAdicionadoItem[] = [];
        for (const c of contratosHierarquia) {
          const tipoPed = c.pedidos?.tipo_pedido;
          if (tipoPed === "Novo" || tipoPed === "Módulo Adicional" || tipoPed === "Aditivo") {
            const mods = (c.pedidos?.modulos_adicionais || []) as ModuloAdicionadoItem[];
            todosAdicionaisExistentes.push(...mods);
          }
        }
        const totalAdAnt = todosAdicionaisExistentes.reduce((s, m) => s + m.valor_mensalidade_modulo * m.quantidade, 0);
        adicionaisAnterioresTexto = todosAdicionaisExistentes.length > 0
          ? todosAdicionaisExistentes.map(m => `• ${m.nome} (${m.quantidade}x) - ${fmtBRL(m.valor_mensalidade_modulo * m.quantidade)}/mês`).join("\n")
          : "Nenhum";
        valorAdicionaisAnteriores = todosAdicionaisExistentes.length > 0 ? fmtBRL(totalAdAnt) : fmtBRL(0);

        const pedidoVigente = contratoPlanoVigente.pedidos;
        const valorMensPlanoAntReal = pedidoVigente?.valor_mensalidade_final != null
          ? Number(pedidoVigente.valor_mensalidade_final)
          : valorMensPlanoAntCheio;
        const mensOrigVigente = pedidoVigente?.valor_mensalidade_original != null ? Number(pedidoVigente.valor_mensalidade_original) : valorMensPlanoAntCheio;
        const descontoMensBase = mensOrigVigente - valorMensPlanoAntReal;
        
        const valorPlanoAntComDesconto = descontoMensBase > 0
          ? valorMensPlanoAntCheio - descontoMensBase
          : valorMensPlanoAntCheio;
        if (descontoMensBase > 0) {
          planoValorAnterior = `~${fmtBRL(valorMensPlanoAntCheio)}~ Desconto: ${fmtBRL(descontoMensBase)} — ${fmtBRL(valorPlanoAntComDesconto)}`;
          totalAnterior = `~${fmtBRL(valorMensPlanoAntCheio + totalAdAnt)}~ ${fmtBRL(valorPlanoAntComDesconto + totalAdAnt)}`;
        } else {
          planoValorAnterior = fmtBRL(valorMensPlanoAntCheio);
          totalAnterior = fmtBRL(valorMensPlanoAntCheio + totalAdAnt);
        }

        if (pedido?.tipo_pedido === "Upgrade") {
          const novoPlanoMens = plano?.valor_mensalidade_padrao ?? 0;
          const novaMensTotal = novoPlanoMens + totalAdAnt;
          const descontoMens = (pedido?.valor_mensalidade_original ?? 0) - (pedido?.valor_mensalidade_final ?? 0);
          mensalidadeTotalUpgrade = descontoMens > 0 ? novaMensTotal - descontoMens : novaMensTotal;
        }
      }
    }

    // Variáveis de valor do plano com desconto para upgrade
    let planoValorFinal = fmtBRL(plano?.valor_mensalidade_padrao ?? 0);
    let planoDescontoTexto = "";
    let novoTotalDescontoTexto = "";
    let mensalidadeUpgradeComDesconto = "";
    if (pedido?.tipo_pedido === "Upgrade") {
      const novoPlanoMens = plano?.valor_mensalidade_padrao ?? 0;
      const descontoMens = (pedido?.valor_mensalidade_original ?? 0) - (pedido?.valor_mensalidade_final ?? 0);
      if (descontoMens > 0) {
        const planoComDesconto = novoPlanoMens - descontoMens;
        planoValorFinal = `~${fmtBRL(novoPlanoMens)}~ Desconto: ${fmtBRL(descontoMens)} — ${fmtBRL(planoComDesconto)}`;
        valorMensBase = `~${fmtBRL(novoPlanoMens)}~ Desconto: ${fmtBRL(descontoMens)} — ${fmtBRL(planoComDesconto)}`;
        planoDescontoTexto = `⚡ Desconto na mensalidade: ${fmtBRL(descontoMens)}`;
        novoTotalDescontoTexto = `~${fmtBRL(novoPlanoMens)}~ *${fmtBRL(planoComDesconto)}*`;
        const totalAdAntUpgrade = contrato.contrato_origem_id
          ? (() => {
              const contratoOrigem = ctx.contratos.find(c => c.id === contrato.contrato_origem_id);
              if (!contratoOrigem) return 0;
              const contratoBaseId = contrato.contrato_origem_id;
              const contratosHierarquia = ctx.contratos.filter(c =>
                c.status === "Ativo" && c.id !== contrato.id &&
                (c.id === contratoBaseId || c.contrato_origem_id === contratoBaseId)
              );
              let total = 0;
              for (const c of contratosHierarquia) {
                const tipoPed = c.pedidos?.tipo_pedido;
                if (tipoPed === "Novo" || tipoPed === "Módulo Adicional" || tipoPed === "Aditivo") {
                  const mods = (c.pedidos?.modulos_adicionais || []) as ModuloAdicionadoItem[];
                  total += mods.reduce((s, m) => s + m.valor_mensalidade_modulo * m.quantidade, 0);
                }
              }
              return total;
            })()
          : 0;
        const novoTotalComDesconto = planoComDesconto + totalAdAntUpgrade;
        const totalSemDesconto = novoPlanoMens + totalAdAntUpgrade;
        mensalidadeUpgradeComDesconto = `~${fmtBRL(totalSemDesconto)}~ Desconto: ${fmtBRL(descontoMens)} — *${fmtBRL(novoTotalComDesconto)}*`;
      }
    }

    // Variáveis de serviços (OA)
    const servicosPedido = (pedido?.servicos_pedido || []) as any[];
    const servicosListaTexto = servicosPedido.length > 0
      ? servicosPedido.map((s: any) => {
          const qty = s.quantidade || 1;
          const valor = s.valor_unitario || s.valor || 0;
          return `• ${s.nome} - ${qty}x ${s.unidade_medida || "un."} - ${fmtBRL(valor * qty)}`;
        }).join("\n")
      : "";
    const servicosValorTotal = fmtBRL(servicosPedido.reduce((sum: number, s: any) => sum + ((s.valor_unitario || s.valor || 0) * (s.quantidade || 1)), 0));
    const servicosQtdTotal = String(servicosPedido.reduce((sum: number, s: any) => sum + (s.quantidade || 1), 0));

    // Número do contrato de origem
    let numeroContratoOrigem = "";
    if (contrato.contrato_origem_id) {
      const cOrigem = ctx.contratos.find(c => c.id === contrato.contrato_origem_id);
      if (cOrigem) numeroContratoOrigem = cOrigem.numero_exibicao;
    }

    // Variáveis de desconto (original vs final)
    const impOriginal = pedido?.valor_implantacao_original ?? 0;
    const mensOriginal = pedido?.valor_mensalidade_original ?? 0;
    const descontoImpl = impOriginal - impFinal;
    const descontoMens = mensOriginal - mensFinal;
    const implantacaoComDesconto = descontoImpl > 0
      ? `~${fmtBRL(impOriginal)}~ *${fmtBRL(impFinal)}*`
      : `*${fmtBRL(impFinal)}*`;
    const mensalidadeComDesconto = descontoMens > 0
      ? `~${fmtBRL(mensOriginal)}~ *${fmtBRL(mensFinal)}*`
      : `*${fmtBRL(mensFinal)}*`;

    const obsPagamentoImpl = pedido?.pagamento_implantacao_observacao || "";
    const obsPagamentoMens = pedido?.pagamento_mensalidade_observacao || "";

    return effectiveTemplate.conteudo
      .replace(/\{saudacao\}/g, saudacao)
      .replace(/\{contato\.nome\}/g, nomeDecisor)
      .replace(/\{nome_decisor\}/g, nomeDecisor)
      .replace(/\{cliente\.nome_fantasia\}/g, nomeFantasia)
      .replace(/\{cliente\.razao_social\}/g, razaoSocial)
      .replace(/\{contrato\.numero\}/g, contrato.numero_exibicao)
      .replace(/\{contrato\.numero_origem\}/g, numeroContratoOrigem)
      .replace(/\{plano\.nome\}/g, nomePlano)
      .replace(/\{plano\.nome_anterior\}/g, planoNomeAnterior)
      .replace(/\{plano\.modulos\}/g, modulosTexto)
      .replace(/\{plano\.valor_base\}/g, valorMensBase)
      .replace(/\{plano\.valor_final\}/g, planoValorFinal)
      .replace(/\{plano\.desconto_texto\}/g, planoDescontoTexto)
      .replace(/\{plano\.valor_com_desconto\}/g, novoTotalDescontoTexto || `*${valorMensBase}*`)
      .replace(/\{valores\.plano_anterior\}/g, planoValorAnterior)
      .replace(/\{modulos\.adicionais\}/g, adicionaisBlock)
      .replace(/\{modulos\.adicionais_novos\}/g, adicionaisNovosTexto)
      .replace(/\{modulos\.adicionais_anteriores\}/g, adicionaisAnterioresTexto)
      .replace(/\{valores\.total_adicionais_novos\}/g, totalAdicionaisNovos)
      .replace(/\{valores\.adicionais_anteriores\}/g, valorAdicionaisAnteriores)
      .replace(/\{valores\.total_anterior\}/g, totalAnterior)
      .replace(/\{valores\.implantacao\}/g, fmtBRL(impFinal))
      .replace(/\{valores\.implantacao_original\}/g, fmtBRL(impOriginal))
      .replace(/\{valores\.implantacao_com_desconto\}/g, implantacaoComDesconto)
      .replace(/\{valores\.mensalidade\}/g, fmtBRL(pedido?.tipo_pedido === "Upgrade" ? mensalidadeTotalUpgrade : mensFinal))
      .replace(/\{valores\.mensalidade_upgrade_com_desconto\}/g, mensalidadeUpgradeComDesconto || fmtBRL(pedido?.tipo_pedido === "Upgrade" ? mensalidadeTotalUpgrade : mensFinal))
      .replace(/\{valores\.mensalidade_original\}/g, fmtBRL(mensOriginal))
      .replace(/\{valores\.mensalidade_com_desconto\}/g, mensalidadeComDesconto)
      .replace(/\{valores\.desconto_implantacao\}/g, descontoImpl > 0 ? fmtBRL(descontoImpl) : "")
      .replace(/\{valores\.desconto_mensalidade\}/g, descontoMens > 0 ? fmtBRL(descontoMens) : "")
      .replace(/\{regras\.mensalidade\}/g, regrasMens)
      .replace(/\{regras\.implantacao\}/g, regrasImpl)
      .replace(/\{formas\.pagamento\}/g, formasPagamento)
      .replace(/\{link_assinatura\}/g, linkAssinatura || "{link_assinatura}")
      .replace(/\{servicos\.lista_html\}/g, servicosListaTexto)
      .replace(/\{servicos\.valor_total\}/g, servicosValorTotal)
      .replace(/\{servicos\.quantidade_total\}/g, servicosQtdTotal)
      .replace(/\{servicos\.tipo_atendimento\}/g, pedido?.tipo_atendimento || "")
      .replace(/\{pagamento\.observacoes\}/g, obsPagamentoMens || obsPagamentoImpl || "")
      .replace(/\{pagamento\.implantacao\.forma\}/g, pedido?.pagamento_implantacao_forma || "")
      .replace(/\{pagamento\.implantacao\.parcelas\}/g, pedido?.pagamento_implantacao_parcelas ? `${pedido.pagamento_implantacao_parcelas}x` : "")
      .replace(/\{pagamento\.implantacao\.observacao\}/g, obsPagamentoImpl)
      .replace(/\{pagamento\.mensalidade\.forma\}/g, pedido?.pagamento_mensalidade_forma || "")
      .replace(/\{pagamento\.mensalidade\.parcelas\}/g, pedido?.pagamento_mensalidade_parcelas ? `${pedido.pagamento_mensalidade_parcelas}x` : "")
      .replace(/\{pagamento\.mensalidade\.observacao\}/g, obsPagamentoMens)
      .replace(/\{desconto\.oa_html\}/g, (() => {
        const descImpl2 = impOriginal - impFinal;
        if (descImpl2 <= 0) return "";
        let txt = `⚡ *Desconto:* ~${fmtBRL(impOriginal)}~ → *${fmtBRL(impFinal)}* (economia de ${fmtBRL(descImpl2)})`;
        if (pedido?.motivo_desconto) txt += `\n📋 *Motivo:* ${pedido.motivo_desconto}`;
        return txt;
      })())
      .replace(/\{pedido\.observacoes_geral\}/g, pedido?.observacoes || "")
      .replace(/\{empresa\.nome\}/g, "Softplus Tecnologia")
      .replace(/\{vendedor\.nome\}/g, nomeVendedorPedido)
      .replace(/\{usuario\.nome\}/g, nomeUsuario);
  }

  // Fallback hardcoded
  const impOrigFb = pedido?.valor_implantacao_original ?? 0;
  const mensOrigFb = pedido?.valor_mensalidade_original ?? 0;
  const descImplFb = impOrigFb - impFinal;
  const descMensFb = mensOrigFb - mensFinal;
  const obsImplFb = pedido?.pagamento_implantacao_observacao || "";
  const obsMensFb = pedido?.pagamento_mensalidade_observacao || "";

  return `Olá ${nomeDecisor}, ${saudacao}!

Tudo bem?

Me chamo *${nomeUsuario}*, sou do financeiro da Softplus Tecnologia. 

Primeiro queria agradecer por ter escolhido nosso sistema para auxiliar nos processos da *${nomeFantasia}*. 

Saiba que vamos nos empenhar ao máximo para que tudo corra como o esperado. ☺️💙

Passando para alinhar o que ficou acertado com ${nomeVendedorPedido}:

☑️ *Módulos Contratados*

Plano ${nomePlano}${modulosTexto ? "\n" + modulosTexto : ""}

Valor base do plano: ${valorMensBase}${adicionais.length > 0 ? `\n\n🔘 *ADICIONAIS*\n\n${adicionaisTexto}\n\nTotal adicionais: ${fmtBRL(totalAdicionais)}` : ""}

*MENSALIDADE TOTAL*

${descMensFb > 0 ? `~${fmtBRL(mensOrigFb)}~\n` : ""}*${fmtBRL(mensFinal)}*

${obsMensFb || "Valor pré-pago."}${regrasMens ? "\n" + regrasMens : ""}

*IMPLANTAÇÃO E TREINAMENTO*

${descImplFb > 0 ? `~${fmtBRL(impOrigFb)}~\n` : ""}*${fmtBRL(impFinal)}*${obsImplFb ? "\n" + obsImplFb : ""}${regrasImpl ? "\n" + regrasImpl : ""}

✍️ *TERMO DE ACEITE:*

${linkAssinatura || "{link_assinatura}"}

Implantação confirmada para:

{datas_implantacao}

Os boletos referentes à implantação e primeira mensalidade foram enviados por e-mail.

Caso prefira, posso encaminhar novamente.

Estou à disposição.`;
}

// ─── Badge / Presentation Helpers ─────────────────────────────────────────

export function getZapSignStatusBadge(status: string | undefined, contratoStatus?: string) {
  if (!status) return null;
  const canceladoBadge = contratoStatus === "Encerrado" ? (
    <Badge className="bg-red-100 text-red-700 border-red-200 hover:bg-red-100 text-xs flex items-center gap-1 w-fit">
      <XCircle className="h-3 w-3" />
      Cancelado
    </Badge>
  ) : null;
  if (status === "Assinado")
    return (
      <div className="flex flex-col gap-0.5 w-fit">
        <Badge className="bg-emerald-100 text-emerald-700 border-emerald-200 hover:bg-emerald-100 text-xs flex items-center gap-1 w-fit">
          <CheckCircle2 className="h-3 w-3" />
          Assinado
        </Badge>
        {canceladoBadge}
      </div>
    );
  if (status === "Recusado")
    return (
      <div className="flex flex-col gap-0.5 w-fit">
        <Badge className="bg-red-100 text-red-700 border-red-200 hover:bg-red-100 text-xs flex items-center gap-1 w-fit">
          <XCircle className="h-3 w-3" />
          Recusado
        </Badge>
        {canceladoBadge}
      </div>
    );
  if (status === "Enviado" || status === "Pendente")
    return (
      <div className="flex flex-col gap-0.5 w-fit">
        <Badge className="bg-amber-100 text-amber-700 border-amber-200 hover:bg-amber-100 text-xs flex items-center gap-1 w-fit">
          <Send className="h-3 w-3" />
          Enviado
        </Badge>
        <span className="text-[10px] text-amber-600 text-center w-full">Aguardando assinatura</span>
        {canceladoBadge}
      </div>
    );
  return (
    <div className="flex flex-col gap-0.5 w-fit">
      <Badge variant="secondary" className="text-xs w-fit">{status}</Badge>
      {canceladoBadge}
    </div>
  );
}

export function getStatusBadge(status: string) {
  if (status === "Ativo")
    return (
      <Badge className="bg-emerald-100 text-emerald-700 border-emerald-200 hover:bg-emerald-100 dark:bg-emerald-900/30 dark:text-emerald-400 text-xs flex items-center gap-1 w-fit">
        <CheckCircle2 className="h-3 w-3" />
        Ativo
      </Badge>
    );
  return (
    <Badge variant="secondary" className="text-xs flex items-center gap-1 w-fit">
      <MinusCircle className="h-3 w-3" />
      Encerrado
    </Badge>
  );
}

export function getStatusGeracaoBadge(statusGeracao: string | null, contratoStatus?: string) {
  if (contratoStatus === "Encerrado") {
    return (
      <Badge className="bg-red-100 text-red-700 border-red-200 hover:bg-red-100 text-xs flex items-center gap-1 w-fit">
        <XCircle className="h-3 w-3" />
        Cancelado
      </Badge>
    );
  }
  if (statusGeracao === "Manual")
    return (
      <Badge className="bg-slate-100 text-slate-600 border-slate-200 hover:bg-slate-100 text-xs flex items-center gap-1 w-fit">
        Retroativo
      </Badge>
    );
  if (statusGeracao === "Gerado")
    return (
      <Badge className="bg-blue-100 text-blue-700 border-blue-200 hover:bg-blue-100 text-xs flex items-center gap-1 w-fit">
        <CheckCircle2 className="h-3 w-3" />
        Gerado
      </Badge>
    );
  return (
    <Badge variant="secondary" className="text-xs w-fit">
      Pendente
    </Badge>
  );
}

export function getTipoBadge(tipo: string) {
  if (tipo === "Base")
    return (
      <Badge className="bg-primary/10 text-primary border-primary/20 hover:bg-primary/10 text-xs flex items-center gap-1 w-fit">
        Base
      </Badge>
    );
  if (tipo === "Upgrade")
    return (
      <Badge className="bg-violet-100 text-violet-700 border-violet-200 hover:bg-violet-100 dark:bg-violet-900/30 dark:text-violet-400 text-xs flex items-center gap-1 w-fit">
        Upgrade
      </Badge>
    );
  if (tipo === "Aditivo")
    return (
      <Badge className="bg-indigo-100 text-indigo-700 border-indigo-200 hover:bg-indigo-100 dark:bg-indigo-900/30 dark:text-indigo-400 text-xs flex items-center gap-1 w-fit">
        <FilePen className="h-3 w-3" /> Aditivo
      </Badge>
    );
  if (tipo === "OA")
    return (
      <Badge className="bg-teal-100 text-teal-700 border-teal-200 hover:bg-teal-100 dark:bg-teal-900/30 dark:text-teal-400 text-xs flex items-center gap-1 w-fit">
        <FileOutput className="h-3 w-3" /> OA
      </Badge>
    );
  if (tipo === "Downgrade")
    return (
      <Badge className="bg-amber-100 text-amber-700 border-amber-200 hover:bg-amber-100 dark:bg-amber-900/30 dark:text-amber-400 text-xs flex items-center gap-1 w-fit">
        Downgrade
      </Badge>
    );
  return <Badge variant="outline" className="text-xs w-fit">{tipo}</Badge>;
}

export function getPedidoStatusBadges(contrato: Contrato) {
  if (!contrato.pedidos) return <span className="text-xs text-muted-foreground">—</span>;
  if (contrato.status === "Encerrado") {
    return (
      <Badge className="bg-red-100 text-red-700 border-red-200 hover:bg-red-100 text-xs flex items-center gap-1 w-fit">
        <XCircle className="h-3 w-3" />
        Cancelado
      </Badge>
    );
  }
  return (
    <div className="flex flex-col gap-1">
      {contrato.pedidos.financeiro_status === "Aprovado" && (
        <Badge className="bg-emerald-100 text-emerald-700 border-emerald-200 hover:bg-emerald-100 text-xs flex items-center gap-1 w-fit">
          <CheckCircle2 className="h-3 w-3" />
          Aprovado
        </Badge>
      )}
      {contrato.pedidos.contrato_liberado && (
        <Badge className="bg-blue-100 text-blue-700 border-blue-200 hover:bg-blue-100 text-xs flex items-center gap-1 w-fit">
          <CheckCircle2 className="h-3 w-3" />
          Liberado
        </Badge>
      )}
    </div>
  );
}
