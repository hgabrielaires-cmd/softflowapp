/**
 * Builds the WhatsApp proposal message from opportunity data.
 * Pure function — no side effects.
 */

const fmt = (v: number) =>
  v.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });

function getSaudacao(): string {
  const h = new Date().getHours();
  if (h < 12) return "Bom dia!";
  if (h < 18) return "Boa tarde!";
  return "Boa noite!";
}

export interface PropostaItem {
  tipo: "plano" | "modulo";
  nome: string;
  quantidade: number;
  valor_implantacao: number;
  valor_mensalidade: number;
  descricao?: string; // plano description (comma-separated features)
}

export interface PropostaDescontos {
  descontoImplantacao: number;
  descontoImplantacaoTipo: "R$" | "%";
  descontoMensalidade: number;
  descontoMensalidadeTipo: "R$" | "%";
  motivoImplantacao?: string;
  motivoMensalidade?: string;
}

export interface PropostaParams {
  titulo: string; // opportunity title (empresa name)
  contatoNome: string;
  items: PropostaItem[];
  descontos: PropostaDescontos;
}

export function buildPropostaMessage(params: PropostaParams): string {
  const { titulo, contatoNome, items, descontos } = params;
  const saudacao = getSaudacao();

  const planoItem = items.find(i => i.tipo === "plano");
  const modulos = items.filter(i => i.tipo === "modulo");

  // --- Plano block ---
  let planoBlock = "";
  if (planoItem) {
    const features = (planoItem.descricao || "")
      .split(",")
      .map(s => s.trim())
      .filter(Boolean);
    const featureLines = features.map(f => `✔️ ${f}`).join("\n");
    const mensPlano = planoItem.valor_mensalidade * planoItem.quantidade;

    planoBlock = `📦 *${planoItem.nome}*\n\n${featureLines}\n\nMensalidade do plano: *${fmt(mensPlano)}*`;
  }

  // --- Módulos block ---
  let modulosBlock = "";
  if (modulos.length > 0) {
    const lines = modulos.map(m => {
      const total = m.valor_mensalidade * m.quantidade;
      return `✔️ ${m.nome} (${m.quantidade}x ${fmt(m.valor_mensalidade)}) — ${fmt(total)}`;
    });
    const totalAdicionais = modulos.reduce(
      (s, m) => s + m.valor_mensalidade * m.quantidade, 0
    );
    modulosBlock = `📦 Módulos Adicionais\n\n${lines.join("\n")}\n\nTotal Adicionais: *${fmt(totalAdicionais)}*\n\n━━━━━━━━━━━━━━━━━━━\n\n`;
  }

  // --- Calculate totals ---
  const totalImplBruto = items.reduce(
    (s, i) => s + i.valor_implantacao * i.quantidade, 0
  );
  const totalMensBruto = items.reduce(
    (s, i) => s + i.valor_mensalidade * i.quantidade, 0
  );

  const descImplValor =
    descontos.descontoImplantacaoTipo === "%"
      ? (totalImplBruto * descontos.descontoImplantacao) / 100
      : descontos.descontoImplantacao;
  const descMensValor =
    descontos.descontoMensalidadeTipo === "%"
      ? (totalMensBruto * descontos.descontoMensalidade) / 100
      : descontos.descontoMensalidade;

  const totalImplFinal = Math.max(0, totalImplBruto - descImplValor);
  const totalMensFinal = Math.max(0, totalMensBruto - descMensValor);

  const hasDescontoImpl = descImplValor > 0;
  const hasDescontoMens = descMensValor > 0;
  const hasModulos = modulos.length > 0;

  // --- Implantação line ---
  let implLine: string;
  if (hasDescontoImpl) {
    implLine = `💵 Implantação: ~${fmt(totalImplBruto)}~ por *${fmt(totalImplFinal)}*`;
    if (descontos.motivoImplantacao?.trim()) {
      implLine += `\n_${descontos.motivoImplantacao.trim()}_ — economia de *${fmt(descImplValor)}*`;
    } else {
      implLine += `\n— economia de *${fmt(descImplValor)}*`;
    }
  } else {
    implLine = `💵 Implantação: *${fmt(totalImplBruto)}*`;
  }

  // --- Mensalidade line ---
  const sufixoAdicionais = hasModulos ? " (plano + adicionais)" : "";
  let mensLine: string;
  if (hasDescontoMens) {
    mensLine = `🔄 Mensalidade: ~${fmt(totalMensBruto)}~ por *${fmt(totalMensFinal)}/mês*${sufixoAdicionais}`;
    if (descontos.motivoMensalidade?.trim()) {
      mensLine += `\n_${descontos.motivoMensalidade.trim()}_ — economia de *${fmt(descMensValor)}*`;
    } else {
      mensLine += `\n— economia de *${fmt(descMensValor)}*`;
    }
  } else {
    mensLine = `🔄 Mensalidade: *${fmt(totalMensFinal)}/mês*${sufixoAdicionais}`;
  }

  // --- Assemble ---
  const msg = `Olá, ${contatoNome}! ${saudacao} 🎉

Montamos uma proposta pensada especialmente para *${titulo}*. Dá uma olhada 👇

━━━━━━━━━━━━━━━━━━━

${planoBlock}

━━━━━━━━━━━━━━━━━━━

${modulosBlock}💳 Pagamento

${implLine}

${mensLine}

━━━━━━━━━━━━━━━━━━━

💡 Por que escolher a Softplus?

✔️ +10 anos de experiência no mercado
✔️ Suporte humano, rápido e eficiente
✔️ Sistema feito para o seu negócio
✔️ Funciona Online e Offline

Qualquer dúvida é só me chamar! 😊

_Softplus Tecnologia_`;

  return msg;
}
