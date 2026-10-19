import { useEffect, useState } from "react";
import { Eye, Pencil, Trash2, ArrowRightLeft, XCircle, Info } from "lucide-react";
import logo from "@/assets/logo-softflow-azul.png";
import { cn } from "@/lib/utils";

const ATUALIZACAO = "19 de outubro de 2026";
const DPO = "privacidade@softplustecnologia.com.br";

const dados = [
  ["Nome, e-mail e telefone dos usuários", "Criar e gerenciar o acesso ao sistema", "Execução de contrato (art. 7º, V)"],
  ["Dados cadastrais de empresas clientes (razão social, CNPJ, endereço)", "Cadastro, contratos e faturamento", "Execução de contrato (art. 7º, V)"],
  ["Dados de contatos e mensagens de WhatsApp", "Atendimento e histórico de conversas", "Execução de contrato e legítimo interesse (art. 7º, V e IX)"],
  ["Dados de cobrança e pagamento", "Emissão de boletos, Pix e controle financeiro", "Execução de contrato e obrigação legal (art. 7º, V e II)"],
  ["Documentos e assinaturas de contratos", "Formalização de contratos digitais", "Execução de contrato (art. 7º, V)"],
  ["Registros de acesso (IP, data, hora, navegador)", "Segurança e cumprimento do Marco Civil da Internet", "Obrigação legal (art. 7º, II)"],
  ["Preferências salvas no navegador", "Manter a sessão e configurações", "Legítimo interesse (art. 7º, IX)"],
];

const terceiros = [
  ["Supabase", "Hospedagem do banco de dados e autenticação"],
  ["Meta Platforms Inc.", "Envio e recebimento de mensagens pela WhatsApp Business API"],
  ["Asaas Pagamentos S.A.", "Emissão e gestão de cobranças"],
  ["ZapSign", "Assinatura digital de contratos"],
  ["Anthropic (Claude API)", "Recursos de inteligência artificial, como leitura de documentos e assistentes"],
];

const direitos = [
  { icon: Eye, t: "Acesso", d: "Saber quais dados seus nós tratamos." },
  { icon: Pencil, t: "Correção", d: "Corrigir dados incompletos, errados ou desatualizados." },
  { icon: Trash2, t: "Exclusão", d: "Pedir a eliminação de dados, salvo quando a lei exigir a guarda." },
  { icon: ArrowRightLeft, t: "Portabilidade", d: "Receber seus dados para levar a outro fornecedor." },
  { icon: XCircle, t: "Revogação", d: "Retirar o consentimento dado, quando ele for a base do tratamento." },
  { icon: Info, t: "Informação", d: "Saber com quem compartilhamos seus dados e as consequências de não consentir." },
];

const link = "text-primary underline";

const secoes: { id: string; titulo: string; conteudo: React.ReactNode }[] = [
  { id: "introducao", titulo: "Introdução e Controlador dos Dados", conteudo: <p>Esta Política explica como o Softflow coleta, usa e protege dados pessoais, conforme a Lei Geral de Proteção de Dados (Lei nº 13.709/2018 — LGPD). O controlador dos dados é a SOFTPLUS TECNOLOGIA EM SISTEMAS LTDA, CNPJ 13.382.798/0001-25. Quando sua empresa insere dados de clientes e contatos no sistema, ela é a controladora desses dados e a Softplus atua como operadora, tratando-os apenas para prestar o serviço.</p> },
  { id: "dados", titulo: "Dados Coletados", conteudo: (
    <div className="overflow-x-auto rounded-lg border">
      <table className="w-full text-sm">
        <thead className="bg-muted text-left"><tr><th className="p-3 font-semibold">Dado</th><th className="p-3 font-semibold">Finalidade</th><th className="p-3 font-semibold">Base legal</th></tr></thead>
        <tbody>{dados.map((r) => <tr key={r[0]} className="border-t align-top">{r.map((c) => <td key={c} className="p-3">{c}</td>)}</tr>)}</tbody>
      </table>
    </div>) },
  { id: "finalidade", titulo: "Finalidade do Tratamento", conteudo: <p>Usamos os dados apenas para: oferecer e manter o Softflow funcionando; permitir o atendimento aos clientes da sua empresa; emitir cobranças e contratos; dar suporte técnico; garantir a segurança da plataforma; e cumprir obrigações legais. Não vendemos dados pessoais.</p> },
  { id: "bases", titulo: "Bases Legais", conteudo: (<><p>Conforme o art. 7º da LGPD, tratamos dados com base em:</p><ul className="list-disc pl-6 space-y-1.5 mt-3"><li><strong>Execução de contrato</strong> (inciso V): para prestar o serviço contratado;</li><li><strong>Cumprimento de obrigação legal</strong> (inciso II): como guarda de registros de acesso e documentos fiscais;</li><li><strong>Legítimo interesse</strong> (inciso IX): para segurança e melhoria do serviço, respeitando seus direitos;</li><li><strong>Consentimento</strong> (inciso I): quando necessário, podendo ser revogado a qualquer momento.</li></ul></>) },
  { id: "compartilhamento", titulo: "Compartilhamento com Terceiros", conteudo: (<><p>Compartilhamos dados apenas com fornecedores necessários para o funcionamento do serviço:</p><ul className="list-disc pl-6 space-y-1.5 mt-3">{terceiros.map(([n, f]) => <li key={n}><strong>{n}</strong> — {f}</li>)}</ul><p className="mt-3">Alguns desses fornecedores podem processar dados fora do Brasil, com garantias compatíveis com a LGPD. Também podemos compartilhar dados quando exigido por lei ou ordem judicial.</p></>) },
  { id: "retencao", titulo: "Retenção e Exclusão", conteudo: <p>Mantemos os dados enquanto o contrato estiver ativo ou enquanto forem necessários para as finalidades desta Política. Após o encerramento, os dados são excluídos ou anonimizados, exceto quando a lei exigir a guarda por mais tempo (por exemplo, registros de acesso por 6 meses, conforme o Marco Civil da Internet, e documentos fiscais pelo prazo legal).</p> },
  { id: "seguranca", titulo: "Segurança", conteudo: <p>Adotamos medidas técnicas e administrativas para proteger os dados, como conexão criptografada, controle de acesso por perfil de usuário, senhas protegidas e registros de auditoria. Nenhum sistema é totalmente imune a riscos; em caso de incidente relevante, comunicaremos os afetados e a ANPD conforme a lei.</p> },
  { id: "cookies", titulo: "Cookies", conteudo: <p>Usamos cookies e armazenamento local do navegador apenas para manter sua sessão ativa e lembrar preferências. Não usamos cookies de publicidade. Você pode apagá-los nas configurações do navegador, mas isso pode exigir novo login.</p> },
  { id: "direitos", titulo: "Direitos do Titular", conteudo: (<><p className="mb-4">Você pode exercer os seguintes direitos (art. 18 da LGPD):</p><div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">{direitos.map(({ icon: Icon, t, d }) => (<div key={t} className="rounded-lg border bg-card p-4 shadow-card"><Icon className="h-5 w-5 text-primary mb-2" /><p className="font-semibold">{t}</p><p className="text-sm text-muted-foreground mt-1">{d}</p></div>))}</div><p className="mt-4">Envie seu pedido para <a href={`mailto:${DPO}`} className={link}>{DPO}</a>. Respondemos em até <strong>15 dias úteis</strong>.</p></>) },
  { id: "criancas", titulo: "Crianças e Adolescentes", conteudo: <p>O Softflow é voltado para empresas e não se destina a menores de 18 anos. Não coletamos intencionalmente dados de crianças e adolescentes. Se identificarmos esse tipo de dado sem a autorização adequada, ele será excluído.</p> },
  { id: "alteracoes", titulo: "Alterações", conteudo: <p>Esta Política pode ser atualizada. Mudanças relevantes serão avisadas pelo sistema ou por e-mail, e a data da última atualização fica sempre indicada nesta página.</p> },
  { id: "contato", titulo: "DPO e Contato", conteudo: <p>Nosso Encarregado de Proteção de Dados (DPO) pode ser contatado pelo e-mail <a href={`mailto:${DPO}`} className={link}>{DPO}</a>. Se não ficar satisfeito com a resposta, você também pode procurar a Autoridade Nacional de Proteção de Dados (ANPD) em <a href="https://www.gov.br/anpd" target="_blank" rel="noopener noreferrer" className={link}>www.gov.br/anpd</a>.</p> },
];

const PoliticaPrivacidade = () => {
  const [ativa, setAtiva] = useState(secoes[0].id);

  useEffect(() => {
    document.title = "Política de Privacidade | Softflow";
    const obs = new IntersectionObserver(
      (entries) => {
        const vis = entries.filter((e) => e.isIntersecting).sort((a, b) => a.boundingClientRect.top - b.boundingClientRect.top);
        if (vis[0]) setAtiva(vis[0].target.id);
      },
      { rootMargin: "-15% 0px -70% 0px" },
    );
    secoes.forEach((s) => { const el = document.getElementById(s.id); if (el) obs.observe(el); });
    return () => obs.disconnect();
  }, []);

  return (
    <div className="min-h-screen bg-background text-foreground">
      <header className="border-b bg-card">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 py-4"><img src={logo} alt="Softflow" className="h-8" /></div>
      </header>
      <div className="max-w-6xl mx-auto px-4 sm:px-6 py-10 flex gap-10">
        <aside className="hidden md:block w-64 shrink-0">
          <nav className="sticky top-8 space-y-1">
            <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-3">Seções</p>
            {secoes.map((s, i) => (
              <a key={s.id} href={`#${s.id}`}
                className={cn("block rounded-md px-3 py-1.5 text-sm border-l-2 transition-colors",
                  ativa === s.id ? "border-primary bg-primary/10 text-primary font-medium" : "border-transparent text-muted-foreground hover:text-foreground hover:bg-muted")}>
                {i + 1}. {s.titulo}
              </a>
            ))}
          </nav>
        </aside>
        <main className="flex-1 min-w-0">
          <h1 className="text-3xl sm:text-4xl font-bold tracking-tight mb-2">Política de Privacidade</h1>
          <p className="text-muted-foreground mb-10">Última atualização: {ATUALIZACAO}</p>
          <div className="space-y-10 leading-relaxed text-foreground/90">
            {secoes.map((s, i) => (
              <section key={s.id} id={s.id} className="scroll-mt-8">
                <h2 className="text-xl font-semibold mb-3 text-foreground">{i + 1}. {s.titulo}</h2>
                {s.conteudo}
              </section>
            ))}
          </div>
        </main>
      </div>
      <footer className="border-t bg-card">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 py-6 text-sm text-muted-foreground flex flex-wrap gap-x-6 gap-y-2">
          <span>SOFTPLUS TECNOLOGIA EM SISTEMAS LTDA</span>
          <span>CNPJ: 13.382.798/0001-25</span>
          <span>DPO: <a href={`mailto:${DPO}`} className="text-primary">{DPO}</a></span>
          <span>Última atualização: {ATUALIZACAO}</span>
        </div>
      </footer>
    </div>
  );
};

export default PoliticaPrivacidade;
