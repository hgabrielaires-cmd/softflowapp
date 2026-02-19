import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { PDFDocument, StandardFonts, rgb, PageSizes } from "https://esm.sh/pdf-lib@1.17.1";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    const { contrato_id } = await req.json();
    if (!contrato_id) {
      return new Response(JSON.stringify({ error: "contrato_id obrigatório" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // 1. Buscar contrato com joins
    const { data: contrato, error: contratoError } = await supabase
      .from("contratos")
      .select(`
        *,
        clientes(
          id, nome_fantasia, razao_social, cnpj_cpf, inscricao_estadual,
          cidade, uf, cep, logradouro, numero, complemento, bairro,
          telefone, email, filial_id
        ),
        planos(id, nome, descricao, valor_mensalidade_padrao, valor_implantacao_padrao),
        pedidos(
          id, filial_id,
          valor_implantacao_final, valor_mensalidade_final, valor_total,
          observacoes, pagamento_mensalidade_observacao, pagamento_mensalidade_forma,
          pagamento_mensalidade_parcelas, pagamento_implantacao_forma,
          pagamento_implantacao_parcelas, modulos_adicionais
        )
      `)
      .eq("id", contrato_id)
      .single();

    if (contratoError || !contrato) {
      return new Response(JSON.stringify({ error: "Contrato não encontrado: " + contratoError?.message }), {
        status: 404,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const cliente = (contrato as any).clientes;
    const plano = (contrato as any).planos;
    const pedido = (contrato as any).pedidos;

    // 2. Buscar contatos do cliente (decisor)
    const { data: contatos } = await supabase
      .from("cliente_contatos")
      .select("nome, decisor, ativo")
      .eq("cliente_id", contrato.cliente_id)
      .eq("ativo", true);

    const decisor = (contatos || []).find((c: any) => c.decisor) || (contatos || [])[0];

    // 3. Buscar parâmetros da filial
    const filialId = pedido?.filial_id || cliente?.filial_id;
    const { data: filialParams } = filialId
      ? await supabase.from("filial_parametros").select("*").eq("filial_id", filialId).maybeSingle()
      : { data: null };

    // 4. Buscar modelo ativo (filial > global)
    let modelo = null;
    if (filialId) {
      const { data: modeloFilial } = await supabase
        .from("modelos_contrato")
        .select("*")
        .eq("filial_id", filialId)
        .eq("ativo", true)
        .maybeSingle();
      modelo = modeloFilial;
    }
    if (!modelo) {
      const { data: modeloGlobal } = await supabase
        .from("modelos_contrato")
        .select("*")
        .is("filial_id", null)
        .eq("ativo", true)
        .maybeSingle();
      modelo = modeloGlobal;
    }

    if (!modelo?.arquivo_docx_url) {
      return new Response(
        JSON.stringify({ error: "Nenhum modelo de contrato ativo encontrado para esta filial." }),
        { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // 5. Extrair path do storage do DOCX
    const url = modelo.arquivo_docx_url;
    const pathMatch = url.match(/\/modelos-contrato\/([^?]+)/);
    if (!pathMatch) {
      return new Response(
        JSON.stringify({ error: "Não foi possível extrair o path do arquivo DOCX." }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }
    const storagePath = decodeURIComponent(pathMatch[1]);

    // 6. Baixar o DOCX do storage
    const { data: fileData, error: downloadError } = await supabase.storage
      .from("modelos-contrato")
      .download(storagePath);

    if (downloadError || !fileData) {
      return new Response(
        JSON.stringify({ error: "Erro ao baixar modelo DOCX: " + downloadError?.message }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const buffer = await fileData.arrayBuffer();
    const bytes = new Uint8Array(buffer);

    // 7. Montar mapeamento de variáveis
    const fmtBRL = (v: number) =>
      (v ?? 0).toLocaleString("pt-BR", { style: "currency", currency: "BRL" });

    const modulos = (pedido?.modulos_adicionais || []) as any[];
    const modulosTexto = modulos.length > 0
      ? modulos.map((m: any) => `${m.nome} (${m.quantidade}x - ${fmtBRL(m.valor_mensalidade_modulo * m.quantidade)}/mês)`).join("; ")
      : "";

    const planoDescricaoFormatada = [
      plano?.nome ? `Plano: ${plano.nome}` : "",
      plano?.valor_mensalidade_padrao ? `Mensalidade base: ${fmtBRL(plano.valor_mensalidade_padrao)}` : "",
      modulosTexto ? `Módulos adicionais: ${modulosTexto}` : "",
    ].filter(Boolean).join(" | ");

    const formaPagamentoMensalidade = (() => {
      const forma = pedido?.pagamento_mensalidade_forma || "";
      const parcelas = pedido?.pagamento_mensalidade_parcelas;
      if (forma && parcelas && parcelas > 1) return `${forma} em ${parcelas}x`;
      return forma || "";
    })();

    const valorTotalExtenso = valorPorExtenso(pedido?.valor_total ?? 0);

    const variaveis: Record<string, string> = {
      "CLIENTE_RAZAO": cliente?.razao_social || cliente?.nome_fantasia || "",
      "CLIENTE_FANTASIA": cliente?.nome_fantasia || "",
      "CLIENTE_CNPJ": cliente?.cnpj_cpf || "",
      "CLIENTE_INSC_ESTADUAL": cliente?.inscricao_estadual || "",
      "CLIENTE_ENDERECO_RUA": cliente?.logradouro || "",
      "CLIENTE_NUMERO": cliente?.numero || "",
      "CLIENTE_COMPLEMENTO": cliente?.complemento || "",
      "CLIENTE_BAIRRO": cliente?.bairro || "",
      "CLIENTE_CIDADE": cliente?.cidade || "",
      "CLIENTE_UF": cliente?.uf || "",
      "CLIENTE_CEP": cliente?.cep || "",
      "CLIENTE_TELEFONE": cliente?.telefone || "",
      "CLIENTE_EMAIL": cliente?.email || "",
      "PLANO_SERVICOS_VALOR": plano ? `${plano.nome} - ${fmtBRL(plano.valor_mensalidade_padrao)}` : "",
      "MENSALIDADES_TOTAIS_COM_DESCRICAO_DO_PLANO": planoDescricaoFormatada,
      "VALOR_TOTAL_IMPLANTACAO_TREINAMENTO": fmtBRL(pedido?.valor_implantacao_final ?? 0),
      "VALOR_TOTAL_SERVICO_UNICO_EXTENSO": valorTotalExtenso,
      "PROPOSTA_OBSERVACOES_NEGOCIACAO": pedido?.observacoes || "",
      "FORMA_DE_PAGAMENTO_MENSALIDADE": formaPagamentoMensalidade,
      "VALOR_TOTAL_MENSALIDADE": fmtBRL(pedido?.valor_mensalidade_final ?? 0),
      "PROPOSTA_OBSERVACOES_GERAIS": pedido?.pagamento_mensalidade_observacao || "",
      "NOME_DECISOR": decisor?.nome || "",
    };

    // 8. Substituir variáveis no XML interno do DOCX (ZIP)
    const docxModificado = await substituirVariaveisNoDocx(bytes, variaveis);

    // 9. Extrair texto do DOCX modificado e gerar PDF
    const textoParagrafos = await extrairTextoDOCX(docxModificado);
    console.log("Parágrafos extraídos:", textoParagrafos.length, "primeiros:", textoParagrafos.slice(0, 3));
    const pdfBytes = await gerarPDF(textoParagrafos, variaveis);

    // 10. Upload do PDF gerado
    const outputPath = `${contrato_id}.pdf`;
    const { error: uploadError } = await supabase.storage
      .from("contratos-pdf")
      .upload(outputPath, pdfBytes, {
        contentType: "application/pdf",
        upsert: true,
      });

    if (uploadError) {
      return new Response(
        JSON.stringify({ error: "Erro ao salvar contrato gerado: " + uploadError.message }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // 10. Criar signed URL válida por 1 hora
    const { data: signedData, error: signedError } = await supabase.storage
      .from("contratos-pdf")
      .createSignedUrl(outputPath, 3600);

    if (signedError || !signedData) {
      return new Response(
        JSON.stringify({ error: "Erro ao gerar URL do contrato: " + signedError?.message }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // 11. Atualizar contrato com pdf_url e status_geracao
    const { error: updateError } = await supabase
      .from("contratos")
      .update({
        pdf_url: outputPath,
        status_geracao: "Gerado",
      })
      .eq("id", contrato_id);

    if (updateError) {
      return new Response(
        JSON.stringify({ error: "Erro ao atualizar contrato: " + updateError.message }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    return new Response(
      JSON.stringify({
        success: true,
        signed_url: signedData.signedUrl,
        storage_path: outputPath,
      }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (err) {
    return new Response(JSON.stringify({ error: String(err) }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});

// ─── Extrai parágrafos de texto do DOCX (após substituição) ──────────────────
async function extrairTextoDOCX(docxBytes: Uint8Array): Promise<string[]> {
  try {
    const entries = await lerEntradasZip(docxBytes);
    const docEntry = entries.find((e) => e.filename === "word/document.xml");
    if (!docEntry) return [];

    const xml = new TextDecoder("utf-8").decode(docEntry.data);

    // Extrair parágrafos <w:p> e obter texto concatenado dos <w:t>
    const paragrafos: string[] = [];
    const paraRegex = /<w:p[ >][\s\S]*?<\/w:p>/g;
    let paraMatch;
    while ((paraMatch = paraRegex.exec(xml)) !== null) {
      const paraXml = paraMatch[0];
      const textos: string[] = [];
      const tRegex = /<w:t(?:[^>]*)>([\s\S]*?)<\/w:t>/g;
      let tMatch;
      while ((tMatch = tRegex.exec(paraXml)) !== null) {
        textos.push(tMatch[1]);
      }
      const linha = textos.join("").trim();
      paragrafos.push(linha); // manter vazios para preservar espaçamento
    }
    return paragrafos;
  } catch (e) {
    console.error("Erro ao extrair texto do DOCX:", e);
    return [];
  }
}

// ─── Gera PDF a partir dos parágrafos extraídos do DOCX ──────────────────────
async function gerarPDF(
  paragrafos: string[],
  _variaveis: Record<string, string>
): Promise<Uint8Array> {
  const pdfDoc = await PDFDocument.create();
  const font = await pdfDoc.embedFont(StandardFonts.Helvetica);
  const fontBold = await pdfDoc.embedFont(StandardFonts.HelveticaBold);

  const pageWidth = PageSizes.A4[0];
  const pageHeight = PageSizes.A4[1];
  const marginX = 60;
  const marginTop = 60;
  const marginBottom = 60;
  const maxWidth = pageWidth - marginX * 2;
  const fontSize = 10;
  const lineHeight = fontSize * 1.5;

  let page = pdfDoc.addPage(PageSizes.A4);
  let y = pageHeight - marginTop;

  const wrapText = (text: string, f: typeof font, size: number): string[] => {
    if (!text) return [""];
    const words = text.split(" ");
    const lines: string[] = [];
    let current = "";
    for (const word of words) {
      const test = current ? current + " " + word : word;
      const w = f.widthOfTextAtSize(test, size);
      if (w > maxWidth && current) {
        lines.push(current);
        current = word;
      } else {
        current = test;
      }
    }
    if (current) lines.push(current);
    return lines;
  };

  // Sanitize text to only WinAnsi-encodable characters
  const sanitize = (t: string): string =>
    t.replace(/[^\x20-\x7E\xA0-\xFF]/g, (ch) => {
      const code = ch.charCodeAt(0);
      // Map common unicode chars to ASCII equivalents
      if (code === 0x21E8 || code === 0x2192) return "->";
      if (code === 0x2013 || code === 0x2014) return "-";
      if (code === 0x2018 || code === 0x2019) return "'";
      if (code === 0x201C || code === 0x201D) return '"';
      if (code === 0x2026) return "...";
      if (code === 0x2022 || code === 0x00B7) return "-";
      return "";
    });

  const addLine = (text: string, bold = false) => {
    text = sanitize(text);
    const f = bold ? fontBold : font;
    const wrapped = wrapText(text, f, fontSize);
    for (const line of wrapped) {
      if (y < marginBottom + lineHeight) {
        page = pdfDoc.addPage(PageSizes.A4);
        y = pageHeight - marginTop;
      }
      page.drawText(line, {
        x: marginX,
        y,
        size: fontSize,
        font: f,
        color: rgb(0, 0, 0),
      });
      y -= lineHeight;
    }
  };

  for (const para of paragrafos) {
    if (!para) {
      y -= lineHeight * 0.4; // espaço entre parágrafos
    } else {
      addLine(para);
    }
  }

  const pdfBytes = await pdfDoc.save();
  return new Uint8Array(pdfBytes);
}

// ─── Substituição de variáveis no DOCX (ZIP interno) ─────────────────────────
async function substituirVariaveisNoDocx(
  bytes: Uint8Array,
  variaveis: Record<string, string>
): Promise<Uint8Array> {
  try {
    const result = await processarZip(bytes, (filename, content) => {
      if (
        filename === "word/document.xml" ||
        filename.startsWith("word/header") ||
        filename.startsWith("word/footer") ||
        filename === "word/styles.xml"
      ) {
        return substituirNoXml(content, variaveis);
      }
      return content;
    });
    return result;
  } catch (e) {
    console.error("Erro ao processar ZIP:", e);
    return bytes;
  }
}

function substituirNoXml(xmlBytes: Uint8Array, variaveis: Record<string, string>): Uint8Array {
  const decoder = new TextDecoder("utf-8");
  const encoder = new TextEncoder();
  let xml = decoder.decode(xmlBytes);

  // Substituir marcadores simples no formato #CAMPO#
  for (const [campo, valor] of Object.entries(variaveis)) {
    const marcador = `#${campo}#`;
    // Escapar valor para uso em XML
    const valorEscapado = (valor || "").replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&apos;");
    xml = xml.split(marcador).join(valorEscapado);
  }

  // Alguns marcadores podem estar fragmentados entre tags XML (problema comum em DOCX)
  // Tentar reconstruir texto contínuo dentro de <w:r> antes de substituir
  xml = resolverMarcadoresFragmentados(xml, variaveis);

  return encoder.encode(xml);
}

// Resolve marcadores que o Word fragmenta em múltiplos <w:r>
function resolverMarcadoresFragmentados(xml: string, variaveis: Record<string, string>): string {
  // Concatenar texto de w:t adjacentes dentro do mesmo parágrafo para detectar marcadores
  // Depois substituir no XML original
  const allKeys = Object.keys(variaveis);

  for (const campo of allKeys) {
    const marcador = `#${campo}#`;
    // Tentar encontrar o marcador dividido entre runs consecutivos
    // Padrão: #CAMPO# pode aparecer como #CAM em um run e PO# em outro
    // Estratégia: procurar no texto decodificado e se não achar, tentar juntar runs
    // Já foi feito na passagem anterior. Esta é uma segunda passagem mais agressiva:
    // substituir marcadores divididos com regex que ignora tags XML entre partes do marcador
    const partes = marcador.split("");
    let regexStr = "";
    for (const parte of partes) {
      regexStr += escapeRegex(parte) + "(?:<[^>]*>)*";
    }
    // Remove o último "(?:<[^>]*>)*"
    regexStr = regexStr.slice(0, regexStr.lastIndexOf("(?:<[^>]*>)*"));
    try {
      const regex = new RegExp(regexStr, "g");
      const valorEscapado = (variaveis[campo] || "").replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;");
      xml = xml.replace(regex, valorEscapado);
    } catch {
      // ignorar erros de regex
    }
  }
  return xml;
}

function escapeRegex(str: string): string {
  return str.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

// ─── Parser/Packer de ZIP ─────────────────────────────────────────────────────
interface ZipEntry {
  filename: string;
  compression: number;
  offset: number;
  compressedSize: number;
  uncompressedSize: number;
  localHeaderOffset: number;
  data: Uint8Array; // descomprimido
  extraField: Uint8Array;
  comment: Uint8Array;
}

function readUint16LE(buf: Uint8Array, offset: number): number {
  return buf[offset] | (buf[offset + 1] << 8);
}
function readUint32LE(buf: Uint8Array, offset: number): number {
  return (buf[offset] | (buf[offset + 1] << 8) | (buf[offset + 2] << 16) | (buf[offset + 3] << 24)) >>> 0;
}
function writeUint16LE(buf: Uint8Array, offset: number, value: number) {
  buf[offset] = value & 0xff;
  buf[offset + 1] = (value >> 8) & 0xff;
}
function writeUint32LE(buf: Uint8Array, offset: number, value: number) {
  buf[offset] = value & 0xff;
  buf[offset + 1] = (value >> 8) & 0xff;
  buf[offset + 2] = (value >> 16) & 0xff;
  buf[offset + 3] = (value >> 24) & 0xff;
}

function crc32(data: Uint8Array): number {
  const table = makeCrc32Table();
  let crc = 0xffffffff;
  for (let i = 0; i < data.length; i++) {
    crc = (crc >>> 8) ^ table[(crc ^ data[i]) & 0xff];
  }
  return (crc ^ 0xffffffff) >>> 0;
}

let _crc32Table: Uint32Array | null = null;
function makeCrc32Table(): Uint32Array {
  if (_crc32Table) return _crc32Table;
  _crc32Table = new Uint32Array(256);
  for (let i = 0; i < 256; i++) {
    let c = i;
    for (let j = 0; j < 8; j++) {
      c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
    }
    _crc32Table[i] = c;
  }
  return _crc32Table;
}

async function processarZip(
  zipBytes: Uint8Array,
  transformer: (filename: string, content: Uint8Array) => Uint8Array
): Promise<Uint8Array> {
  const entries = await lerEntradasZip(zipBytes);

  // Transformar entradas relevantes
  const entriesModificadas = entries.map((entry) => {
    const novoConteudo = transformer(entry.filename, entry.data);
    return { ...entry, data: novoConteudo };
  });

  // Repack ZIP
  return repackZip(entriesModificadas);
}

async function lerEntradasZip(zipBytes: Uint8Array): Promise<ZipEntry[]> {
  // Encontrar End of Central Directory (EOCD)
  let eocdOffset = -1;
  for (let i = zipBytes.length - 22; i >= 0; i--) {
    if (
      zipBytes[i] === 0x50 && zipBytes[i + 1] === 0x4b &&
      zipBytes[i + 2] === 0x05 && zipBytes[i + 3] === 0x06
    ) {
      eocdOffset = i;
      break;
    }
  }
  if (eocdOffset === -1) throw new Error("ZIP inválido: EOCD não encontrado");

  const numEntries = readUint16LE(zipBytes, eocdOffset + 10);
  const cdOffset = readUint32LE(zipBytes, eocdOffset + 16);

  const entries: ZipEntry[] = [];
  let cdPos = cdOffset;

  for (let i = 0; i < numEntries; i++) {
    if (
      zipBytes[cdPos] !== 0x50 || zipBytes[cdPos + 1] !== 0x4b ||
      zipBytes[cdPos + 2] !== 0x01 || zipBytes[cdPos + 3] !== 0x02
    ) {
      throw new Error("ZIP inválido: assinatura de entrada central incorreta");
    }

    const compression = readUint16LE(zipBytes, cdPos + 10);
    const compressedSize = readUint32LE(zipBytes, cdPos + 20);
    const uncompressedSize = readUint32LE(zipBytes, cdPos + 24);
    const filenameLen = readUint16LE(zipBytes, cdPos + 28);
    const extraLen = readUint16LE(zipBytes, cdPos + 30);
    const commentLen = readUint16LE(zipBytes, cdPos + 32);
    const localHeaderOffset = readUint32LE(zipBytes, cdPos + 42);

    const filenameBytes = zipBytes.slice(cdPos + 46, cdPos + 46 + filenameLen);
    const filename = new TextDecoder("utf-8").decode(filenameBytes);

    // Ler dados locais
    const localPos = localHeaderOffset;
    const localFilenameLen = readUint16LE(zipBytes, localPos + 26);
    const localExtraLen = readUint16LE(zipBytes, localPos + 28);
    const dataOffset = localPos + 30 + localFilenameLen + localExtraLen;

    let data: Uint8Array;
    if (compression === 0) {
      // Store (sem compressão)
      data = zipBytes.slice(dataOffset, dataOffset + uncompressedSize);
    } else if (compression === 8) {
      // Deflate - usar descompressão async real
      const compressed = zipBytes.slice(dataOffset, dataOffset + compressedSize);
      data = await decompressDeflateAsync(compressed);
    } else {
      // Método não suportado — usar dados brutos
      data = zipBytes.slice(dataOffset, dataOffset + compressedSize);
    }

    entries.push({
      filename,
      compression,
      offset: dataOffset,
      compressedSize,
      uncompressedSize,
      localHeaderOffset,
      data,
      extraField: zipBytes.slice(cdPos + 46 + filenameLen, cdPos + 46 + filenameLen + extraLen),
      comment: zipBytes.slice(cdPos + 46 + filenameLen + extraLen, cdPos + 46 + filenameLen + extraLen + commentLen),
    });

    cdPos += 46 + filenameLen + extraLen + commentLen;
  }

  return entries;
}

function repackZip(entries: ZipEntry[]): Uint8Array {
  const parts: Uint8Array[] = [];
  const centralDir: Uint8Array[] = [];
  let offset = 0;

  for (const entry of entries) {
    const filenameBytes = new TextEncoder().encode(entry.filename);
    const data = entry.data;
    const crc = crc32(data);
    const uncompressedSize = data.length;

    // Armazenar sem compressão (Store) para simplificar
    const localHeader = new Uint8Array(30 + filenameBytes.length);
    writeUint32LE(localHeader, 0, 0x04034b50); // local file header signature
    writeUint16LE(localHeader, 4, 20); // version needed
    writeUint16LE(localHeader, 6, 0); // flags
    writeUint16LE(localHeader, 8, 0); // compression: Store
    writeUint16LE(localHeader, 10, 0); // last mod time
    writeUint16LE(localHeader, 12, 0); // last mod date
    writeUint32LE(localHeader, 14, crc);
    writeUint32LE(localHeader, 18, uncompressedSize);
    writeUint32LE(localHeader, 22, uncompressedSize);
    writeUint16LE(localHeader, 26, filenameBytes.length);
    writeUint16LE(localHeader, 28, 0); // extra length
    localHeader.set(filenameBytes, 30);

    // Central directory entry
    const cdEntry = new Uint8Array(46 + filenameBytes.length);
    writeUint32LE(cdEntry, 0, 0x02014b50); // central dir signature
    writeUint16LE(cdEntry, 4, 20); // version made by
    writeUint16LE(cdEntry, 6, 20); // version needed
    writeUint16LE(cdEntry, 8, 0); // flags
    writeUint16LE(cdEntry, 10, 0); // compression: Store
    writeUint16LE(cdEntry, 12, 0); // last mod time
    writeUint16LE(cdEntry, 14, 0); // last mod date
    writeUint32LE(cdEntry, 16, crc);
    writeUint32LE(cdEntry, 20, uncompressedSize);
    writeUint32LE(cdEntry, 24, uncompressedSize);
    writeUint16LE(cdEntry, 28, filenameBytes.length);
    writeUint16LE(cdEntry, 30, 0); // extra length
    writeUint16LE(cdEntry, 32, 0); // comment length
    writeUint16LE(cdEntry, 34, 0); // disk number start
    writeUint16LE(cdEntry, 36, 0); // internal attr
    writeUint32LE(cdEntry, 38, 0); // external attr
    writeUint32LE(cdEntry, 42, offset); // local header offset
    cdEntry.set(filenameBytes, 46);

    parts.push(localHeader);
    parts.push(data);
    offset += localHeader.length + data.length;
    centralDir.push(cdEntry);
  }

  // End of central directory
  const cdSize = centralDir.reduce((s, e) => s + e.length, 0);
  const eocd = new Uint8Array(22);
  writeUint32LE(eocd, 0, 0x06054b50);
  writeUint16LE(eocd, 4, 0); // disk number
  writeUint16LE(eocd, 6, 0); // disk with start of cd
  writeUint16LE(eocd, 8, entries.length);
  writeUint16LE(eocd, 10, entries.length);
  writeUint32LE(eocd, 12, cdSize);
  writeUint32LE(eocd, 16, offset);
  writeUint16LE(eocd, 20, 0); // comment length

  const allParts = [...parts, ...centralDir, eocd];
  const totalSize = allParts.reduce((s, p) => s + p.length, 0);
  const result = new Uint8Array(totalSize);
  let pos = 0;
  for (const part of allParts) {
    result.set(part, pos);
    pos += part.length;
  }
  return result;
}

// Decompress DEFLATE (raw) usando DecompressionStream
async function decompressDeflateAsync(data: Uint8Array): Promise<Uint8Array> {
  const ds = new DecompressionStream("deflate-raw");
  const writer = ds.writable.getWriter();
  const reader = ds.readable.getReader();
  writer.write(data);
  writer.close();
  const chunks: Uint8Array[] = [];
  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    chunks.push(value);
  }
  const total = chunks.reduce((s, c) => s + c.length, 0);
  const result = new Uint8Array(total);
  let offset = 0;
  for (const chunk of chunks) {
    result.set(chunk, offset);
    offset += chunk.length;
  }
  return result;
}

// decompressDeflate removed — using decompressDeflateAsync directly

// ─── Conversão de número por extenso (pt-BR) ─────────────────────────────────
function valorPorExtenso(valor: number): string {
  if (valor === 0) return "zero reais";

  const centavos = Math.round((valor % 1) * 100);
  const reais = Math.floor(valor);

  const partes: string[] = [];
  if (reais > 0) {
    partes.push(numeroPorExtenso(reais) + (reais === 1 ? " real" : " reais"));
  }
  if (centavos > 0) {
    partes.push(numeroPorExtenso(centavos) + (centavos === 1 ? " centavo" : " centavos"));
  }
  return partes.join(" e ");
}

function numeroPorExtenso(n: number): string {
  if (n === 0) return "zero";
  if (n < 0) return "menos " + numeroPorExtenso(-n);

  const unidades = ["", "um", "dois", "três", "quatro", "cinco", "seis", "sete", "oito", "nove",
    "dez", "onze", "doze", "treze", "quatorze", "quinze", "dezesseis", "dezessete", "dezoito", "dezenove"];
  const dezenas = ["", "", "vinte", "trinta", "quarenta", "cinquenta", "sessenta", "setenta", "oitenta", "noventa"];
  const centenas = ["", "cem", "duzentos", "trezentos", "quatrocentos", "quinhentos",
    "seiscentos", "setecentos", "oitocentos", "novecentos"];

  if (n < 20) return unidades[n];
  if (n < 100) {
    const d = Math.floor(n / 10);
    const u = n % 10;
    return dezenas[d] + (u > 0 ? " e " + unidades[u] : "");
  }
  if (n === 100) return "cem";
  if (n < 1000) {
    const c = Math.floor(n / 100);
    const r = n % 100;
    return centenas[c] + (r > 0 ? " e " + numeroPorExtenso(r) : "");
  }
  if (n < 1000000) {
    const m = Math.floor(n / 1000);
    const r = n % 1000;
    const milStr = m === 1 ? "mil" : numeroPorExtenso(m) + " mil";
    return milStr + (r > 0 ? " e " + numeroPorExtenso(r) : "");
  }
  if (n < 1000000000) {
    const m = Math.floor(n / 1000000);
    const r = n % 1000000;
    const milStr = m === 1 ? "um milhão" : numeroPorExtenso(m) + " milhões";
    return milStr + (r > 0 ? " e " + numeroPorExtenso(r) : "");
  }
  return n.toString();
}
