// Definições de variáveis dinâmicas para templates de contrato HTML

export interface VariableCategory {
  label: string;
  icon: string;
  variables: { key: string; label: string; example: string }[];
}

export const CONTRACT_VARIABLE_CATEGORIES: VariableCategory[] = [
  {
    label: "Cliente",
    icon: "👤",
    variables: [
      { key: "cliente.razao_social", label: "Razão Social", example: "Empresa Exemplo LTDA" },
      { key: "cliente.nome_fantasia", label: "Nome Fantasia", example: "Empresa Exemplo" },
      { key: "cliente.cnpj", label: "CNPJ/CPF", example: "12.345.678/0001-99" },
      { key: "cliente.inscricao_estadual", label: "Inscrição Estadual", example: "123456789" },
      { key: "cliente.endereco_completo", label: "Endereço Completo", example: "Rua das Flores, 123 - Centro - São Paulo/SP - CEP 01001-000" },
      { key: "cliente.logradouro", label: "Logradouro", example: "Rua das Flores" },
      { key: "cliente.numero", label: "Número", example: "123" },
      { key: "cliente.complemento", label: "Complemento", example: "Sala 10" },
      { key: "cliente.bairro", label: "Bairro", example: "Centro" },
      { key: "cliente.cidade", label: "Cidade", example: "São Paulo" },
      { key: "cliente.uf", label: "UF", example: "SP" },
      { key: "cliente.cep", label: "CEP", example: "01001-000" },
      { key: "cliente.telefone", label: "Telefone", example: "(11) 99999-9999" },
      { key: "cliente.email", label: "E-mail", example: "contato@empresa.com.br" },
    ],
  },
  {
    label: "Contato",
    icon: "📞",
    variables: [
      { key: "contato.nome_decisor", label: "Nome do Decisor", example: "João da Silva" },
      { key: "contato.telefone_decisor", label: "Telefone do Decisor", example: "(11) 99999-9999" },
      { key: "contato.email_decisor", label: "E-mail do Decisor", example: "decisor@empresa.com.br" },
    ],
  },
  {
    label: "Contrato",
    icon: "📄",
    variables: [
      { key: "contrato.numero", label: "Número do Contrato", example: "2025-0001" },
      { key: "contrato.status", label: "Status", example: "Ativo" },
    ],
  },
  {
    label: "Plano",
    icon: "📦",
    variables: [
      { key: "plano.nome", label: "Nome do Plano", example: "Plano Profissional" },
      { key: "plano.valor_mensalidade", label: "Valor Mensalidade Padrão", example: "R$ 499,00" },
    ],
  },
  {
    label: "Módulos",
    icon: "🧩",
    variables: [
      { key: "modulos.inclusos_lista", label: "Lista de Módulos Inclusos", example: "<ul><li>Módulo A</li><li>Módulo B</li></ul>" },
      { key: "modulos.adicionais_lista", label: "Lista de Adicionais", example: "<ul><li>Módulo Extra (2x)</li></ul>" },
      { key: "modulos.tabela_detalhada", label: "Tabela Detalhada (só se houver adicionais)", example: "<table>...</table>" },
    ],
  },
  {
    label: "Valores",
    icon: "💰",
    variables: [
      { key: "valores.implantacao.original", label: "Implantação Original", example: "R$ 2.000,00" },
      { key: "valores.implantacao.desconto", label: "Desconto Implantação", example: "R$ 200,00" },
      { key: "valores.implantacao.final", label: "Implantação Final", example: "R$ 1.800,00" },
      { key: "valores.mensalidade.original", label: "Mensalidade Original", example: "R$ 500,00" },
      { key: "valores.mensalidade.desconto", label: "Desconto Mensalidade", example: "R$ 50,00" },
      { key: "valores.mensalidade.final", label: "Mensalidade Final", example: "R$ 450,00" },
      { key: "valores.total_geral", label: "Total Geral", example: "R$ 2.250,00" },
      { key: "valores.total_extenso", label: "Total por Extenso", example: "dois mil duzentos e cinquenta reais" },
      { key: "valores.desconto_implantacao_html", label: "Desconto Implantação (HTML)", example: "(condicional)" },
      { key: "valores.desconto_mensalidade_html", label: "Desconto Mensalidade (HTML)", example: "(condicional)" },
      { key: "valores.motivo_desconto_html", label: "Motivo do Desconto (HTML)", example: "(condicional)" },
    ],
  },
  {
    label: "Serviços (OA)",
    icon: "🔧",
    variables: [
      { key: "servicos.lista_html", label: "Lista de Serviços (HTML)", example: "<ul><li>Consultoria - 2 horas - R$ 300,00</li></ul>" },
      { key: "servicos.tabela_html", label: "Tabela de Serviços (HTML)", example: "<table>...</table>" },
      { key: "servicos.valor_total", label: "Valor Total Serviços", example: "R$ 1.500,00" },
      { key: "servicos.valor_total_extenso", label: "Valor Total por Extenso", example: "mil e quinhentos reais" },
      { key: "servicos.quantidade_total", label: "Quantidade Total", example: "5" },
      { key: "servicos.tipo_atendimento", label: "Tipo de Atendimento", example: "Interno" },
      { key: "servicos.comissao_percentual", label: "Comissão Serviço (%)", example: "5%" },
      { key: "servicos.comissao_valor", label: "Comissão Serviço (R$)", example: "R$ 75,00" },
    ],
  },
  {
    label: "Pagamento",
    icon: "💳",
    variables: [
      { key: "pagamento.implantacao.forma", label: "Forma Pgto Implantação", example: "Boleto" },
      { key: "pagamento.implantacao.parcelas", label: "Parcelas Implantação", example: "3x" },
      { key: "pagamento.mensalidade.forma", label: "Forma Pgto Mensalidade", example: "Boleto" },
      { key: "pagamento.mensalidade.parcelas", label: "Parcelas Mensalidade", example: "1x" },
      { key: "pagamento.observacoes", label: "Observações Pagamento", example: "Vencimento todo dia 10" },
    ],
  },
  {
    label: "Sistema",
    icon: "⚙️",
    variables: [
      { key: "data.atual", label: "Data Atual", example: "19/02/2026" },
      { key: "data.atual_extenso", label: "Data Atual por Extenso", example: "19 de fevereiro de 2026" },
      { key: "logo.url", label: "URL da Logo", example: "https://..." },
      { key: "empresa.logo", label: "Logo da Empresa (alias)", example: "https://..." },
    ],
  },
  {
    label: "Filial",
    icon: "🏢",
    variables: [
      { key: "filial.nome", label: "Nome da Filial", example: "Filial São Paulo" },
      { key: "filial.razao_social", label: "Razão Social", example: "Softflow Tecnologia Ltda" },
      { key: "filial.responsavel", label: "Responsável (Assinante)", example: "José da Silva" },
      { key: "filial.cnpj", label: "CNPJ da Filial", example: "12.345.678/0001-99" },
      { key: "filial.inscricao_estadual", label: "Inscrição Estadual", example: "123456789" },
      { key: "filial.logradouro", label: "Logradouro", example: "Av. Paulista" },
      { key: "filial.numero", label: "Número", example: "1000" },
      { key: "filial.complemento", label: "Complemento", example: "Sala 501" },
      { key: "filial.bairro", label: "Bairro", example: "Bela Vista" },
      { key: "filial.cidade", label: "Cidade", example: "São Paulo" },
      { key: "filial.uf", label: "UF", example: "SP" },
      { key: "filial.cep", label: "CEP", example: "01310-100" },
      { key: "filial.endereco_completo", label: "Endereço Completo", example: "Av. Paulista, 1000 - Sala 501 - Bela Vista - São Paulo/SP - CEP 01310-100" },
      { key: "filial.telefone", label: "Telefone", example: "(11) 3000-0000" },
      { key: "filial.email", label: "E-mail", example: "filial@softflow.com.br" },
    ],
  },
];

// Gerar dados de exemplo para preview no editor
export function getExampleData(): Record<string, string> {
  const data: Record<string, string> = {};
  CONTRACT_VARIABLE_CATEGORIES.forEach((cat) => {
    cat.variables.forEach((v) => {
      data[v.key] = v.example;
    });
  });
  return data;
}

// Substituir todas as variáveis {{key}} no HTML
export function substituirVariaveis(html: string, dados: Record<string, string>): string {
  let result = html.replace(/\{\{([^}]+)\}\}/g, (match, key) => {
    const trimmedKey = key.trim();
    // Se a variável é modulos.tabela_detalhada e o valor está vazio, remover o bloco inteiro
    if (trimmedKey === "modulos.tabela_detalhada" && (!dados[trimmedKey] || dados[trimmedKey] === "")) {
      return "";
    }
    const value = dados[trimmedKey];
    if (value === undefined) return match;
    // Para variáveis de logo, retornar apenas a URL (o HTML já contém a tag <img src="...">)
    if ((trimmedKey === "logo.url" || trimmedKey === "empresa.logo") && value) {
      return value;
    }
    return value;
  });

  // Adicionar estilos base ao body (idênticos ao container de PDF para fidelidade)
  if (!result.includes("max-width") && !result.includes("<style")) {
    result = `<style>body { max-width: 794px; margin: 0 auto; padding: 76px 56px; box-sizing: border-box; font-family: Arial, sans-serif; font-size: 12pt; line-height: 1.5; color: #000; }</style>` + result;
  }

  return result;
}

export function fmtBRL(v: number): string {
  return v.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

// Número por extenso (simplificado para valores monetários comuns)
export function numeroPorExtenso(valor: number): string {
  const unidades = ["", "um", "dois", "três", "quatro", "cinco", "seis", "sete", "oito", "nove"];
  const especiais = ["dez", "onze", "doze", "treze", "quatorze", "quinze", "dezesseis", "dezessete", "dezoito", "dezenove"];
  const dezenas = ["", "", "vinte", "trinta", "quarenta", "cinquenta", "sessenta", "setenta", "oitenta", "noventa"];
  const centenas = ["", "cento", "duzentos", "trezentos", "quatrocentos", "quinhentos", "seiscentos", "setecentos", "oitocentos", "novecentos"];

  if (valor === 0) return "zero reais";

  const inteiro = Math.floor(valor);
  const centavos = Math.round((valor - inteiro) * 100);

  function porExtenso(n: number): string {
    if (n === 0) return "";
    if (n === 100) return "cem";
    if (n < 10) return unidades[n];
    if (n < 20) return especiais[n - 10];
    if (n < 100) {
      const d = Math.floor(n / 10);
      const u = n % 10;
      return dezenas[d] + (u > 0 ? " e " + unidades[u] : "");
    }
    if (n < 1000) {
      const c = Math.floor(n / 100);
      const resto = n % 100;
      return centenas[c] + (resto > 0 ? " e " + porExtenso(resto) : "");
    }
    if (n < 1000000) {
      const milhares = Math.floor(n / 1000);
      const resto = n % 1000;
      const milStr = milhares === 1 ? "mil" : porExtenso(milhares) + " mil";
      return milStr + (resto > 0 ? (resto < 100 ? " e " : " ") + porExtenso(resto) : "");
    }
    return String(n);
  }

  let resultado = porExtenso(inteiro) + (inteiro === 1 ? " real" : " reais");
  if (centavos > 0) {
    resultado += " e " + porExtenso(centavos) + (centavos === 1 ? " centavo" : " centavos");
  }
  return resultado;
}
