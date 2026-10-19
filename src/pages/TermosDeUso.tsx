import { useEffect, useState } from "react";
import logo from "@/assets/logo-softflow-azul.png";
import { cn } from "@/lib/utils";

const ATUALIZACAO = "19 de outubro de 2026";
const EMAIL = "contato@softplustecnologia.com.br";

const secoes: { id: string; titulo: string; conteudo: React.ReactNode }[] = [
  { id: "introducao", titulo: "Introdução", conteudo: <p>Estes Termos de Uso regulam o acesso e a utilização do Softflow, plataforma de gestão oferecida pela SOFTPLUS TECNOLOGIA EM SISTEMAS LTDA, inscrita no CNPJ 13.382.798/0001-25, com sede em Natal/RN. Leia com atenção antes de usar o sistema.</p> },
  { id: "aceitacao", titulo: "Aceitação dos Termos", conteudo: <p>Ao criar uma conta, acessar ou utilizar o Softflow, você declara que leu, entendeu e concorda com estes Termos. Se você usa o sistema em nome de uma empresa, declara ter autorização para aceitá-los em nome dela. Caso não concorde, não utilize a plataforma.</p> },
  { id: "servico", titulo: "Descrição do Serviço", conteudo: <p>O Softflow é um software disponibilizado pela internet (SaaS) que reúne ferramentas de gestão, como CRM, vendas, financeiro, contratos, atendimento e integrações com serviços de terceiros. Os recursos disponíveis dependem do plano contratado e podem ser aprimorados ao longo do tempo.</p> },
  { id: "conta", titulo: "Conta de Usuário", conteudo: <p>Cada usuário recebe um acesso pessoal. Você é responsável por manter seu login e senha em sigilo, pelas ações realizadas com sua conta e por manter seus dados de cadastro atualizados. A empresa contratante define quem pode acessar o sistema e com quais permissões. Em caso de uso indevido da sua conta, avise-nos imediatamente.</p> },
  { id: "uso", titulo: "Uso Adequado", conteudo: (<><p>Você deve usar o Softflow de acordo com a lei e com estes Termos. É proibido:</p><ul className="list-disc pl-6 space-y-1.5 mt-3"><li>usar a plataforma para atividades ilegais ou fraudulentas;</li><li>enviar spam ou mensagens em massa sem consentimento dos destinatários;</li><li>compartilhar seu acesso com pessoas não autorizadas;</li><li>copiar, modificar, revender ou fazer engenharia reversa do sistema;</li><li>tentar invadir, sobrecarregar ou comprometer a segurança da plataforma;</li><li>inserir conteúdo que viole direitos de terceiros.</li></ul></>) },
  { id: "propriedade", titulo: "Propriedade Intelectual", conteudo: <p>O Softflow, incluindo código, marca, logotipos, layout e documentação, pertence à SOFTPLUS TECNOLOGIA EM SISTEMAS LTDA. A contratação concede apenas o direito de uso, limitado, não exclusivo e intransferível, durante a vigência do plano. Os dados inseridos pela sua empresa continuam sendo seus.</p> },
  { id: "pagamentos", titulo: "Pagamentos e Reembolsos", conteudo: <p>Valores, formas de pagamento, vencimentos e condições de reembolso seguem o que foi definido na proposta comercial ou contrato firmado com sua empresa. Atrasos no pagamento podem levar à suspensão do acesso até a regularização.</p> },
  { id: "lgpd", titulo: "Proteção de Dados (LGPD)", conteudo: <p>Tratamos dados pessoais conforme a Lei Geral de Proteção de Dados (Lei nº 13.709/2018). A empresa contratante é responsável pelos dados que insere no sistema e por ter base legal para tratá-los; a Softplus atua no tratamento necessário para prestar o serviço. Mais detalhes estão na nossa <a href="/privacidade" className="text-primary underline">Política de Privacidade</a>. Para exercer seus direitos, fale conosco pelo e-mail abaixo.</p> },
  { id: "responsabilidade", titulo: "Limitação de Responsabilidade", conteudo: <p>Trabalhamos para manter o Softflow disponível e seguro, mas não garantimos funcionamento sem interrupções, já que podem ocorrer manutenções, falhas técnicas ou indisponibilidade de serviços de terceiros integrados. A Softplus não se responsabiliza por danos indiretos ou por decisões tomadas com base nas informações inseridas pelos usuários. Limites específicos de responsabilidade seguem o contrato firmado.</p> },
  { id: "suspensao", titulo: "Suspensão e Cancelamento", conteudo: <p>Sua empresa pode solicitar o cancelamento conforme as condições do contrato. A Softplus pode suspender ou encerrar o acesso em caso de descumprimento destes Termos, inadimplência ou determinação legal. Após o encerramento, os dados poderão ser excluídos, respeitadas as obrigações legais de guarda.</p> },
  { id: "alteracoes", titulo: "Alterações nos Termos", conteudo: <p>Estes Termos podem ser atualizados. Avisaremos sobre mudanças relevantes pelo sistema ou por e-mail. A data da última atualização fica sempre indicada nesta página, e o uso contínuo após as mudanças significa concordância com a nova versão.</p> },
  { id: "contato", titulo: "Contato e Foro", conteudo: <p>Dúvidas sobre estes Termos podem ser enviadas para <a href={`mailto:${EMAIL}`} className="text-primary underline">{EMAIL}</a>. Estes Termos seguem a legislação brasileira, e fica eleito o foro da Comarca de Natal/RN para resolver eventuais conflitos.</p> },
];

const TermosDeUso = () => {
  const [ativa, setAtiva] = useState(secoes[0].id);

  useEffect(() => {
    document.title = "Termos de Uso | Softflow";
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
        <div className="max-w-6xl mx-auto px-4 sm:px-6 py-4 flex items-center gap-3">
          <img src={logo} alt="Softflow" className="h-8" />
        </div>
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
          <h1 className="text-3xl sm:text-4xl font-bold tracking-tight mb-2">Termos de Uso</h1>
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
          <span>E-mail: <a href={`mailto:${EMAIL}`} className="text-primary">{EMAIL}</a></span>
          <span>Foro: Comarca de Natal/RN</span>
          <span>Última atualização: {ATUALIZACAO}</span>
        </div>
      </footer>
    </div>
  );
};

export default TermosDeUso;
