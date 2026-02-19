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
    ],
  },
  {
    label: "Filial",
    icon: "🏢",
    variables: [
      { key: "filial.nome", label: "Nome da Filial", example: "Filial São Paulo" },
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
  return html.replace(/\{\{([^}]+)\}\}/g, (match, key) => {
    const trimmedKey = key.trim();
    // Se a variável é modulos.tabela_detalhada e o valor está vazio, remover o bloco inteiro
    if (trimmedKey === "modulos.tabela_detalhada" && (!dados[trimmedKey] || dados[trimmedKey] === "")) {
      return "";
    }
    return dados[trimmedKey] ?? match;
  });
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
