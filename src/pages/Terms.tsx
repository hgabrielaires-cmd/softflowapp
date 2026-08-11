import { useEffect } from "react";

const Terms = () => {
  useEffect(() => {
    document.title = "Termos de Serviço | SoftFlow";
  }, []);

  return (
    <div className="min-h-screen bg-background text-foreground">
      <div className="max-w-3xl mx-auto px-4 sm:px-6 py-12 sm:py-16">
        <div className="mb-8">
          <h1 className="text-3xl sm:text-4xl font-bold tracking-tight mb-2">Termos de Serviço</h1>
          <p className="text-muted-foreground">Última atualização: 11 de agosto de 2026</p>
        </div>

        <div className="prose prose-sm sm:prose-base max-w-none text-foreground/90">
          <p className="lead">
            Estes Termos de Serviço regem o uso da plataforma <strong>SoftFlow</strong>, desenvolvida e operada pela <strong>SOFTPLUS TECNOLOGIA LTDA</strong>, pessoa jurídica inscrita no CNPJ nº <strong>13.382.798/0001-25</strong>, com sede em <strong>AV PRUDENTE DE MORAIS, 5121, LAGOA NOVA, NATAL, RN</strong> ("Softplus", "nós" ou "nossa empresa"). Ao acessar ou usar a plataforma, você concorda com estes Termos. Se não concordar, não utilize o SoftFlow.
          </p>

          <h2 className="text-xl font-semibold mt-8 mb-3">1. Definições</h2>
          <ul className="list-disc pl-6 space-y-2">
            <li><strong>Plataforma:</strong> o software SoftFlow, incluindo seus módulos web, integrações, APIs e canais de atendimento.</li>
            <li><strong>Cliente:</strong> a empresa contratante que utiliza a Plataforma para gestão de seus processos.</li>
            <li><strong>Usuário:</strong> qualquer pessoa autorizada pelo Cliente a acessar a Plataforma.</li>
            <li><strong>Conteúdo:</strong> dados, mensagens, arquivos e informações inseridas ou trafegadas pela Plataforma.</li>
          </ul>

          <h2 className="text-xl font-semibold mt-8 mb-3">2. Objeto</h2>
          <p>
            O SoftFlow é uma plataforma de gestão empresarial que oferece ferramentas para CRM, vendas, financeiro, atendimento, helpdesk, contratos, automações e integrações com serviços de terceiros. Os serviços são disponibilizados conforme o plano contratado pelo Cliente.
          </p>

          <h2 className="text-xl font-semibold mt-8 mb-3">3. Cadastro e acesso</h2>
          <p>
            O Cliente é responsável pelo cadastro e pela gestão de seus Usuários, incluindo a definição de permissões de acesso. Cada Usuário deve manter suas credenciais de acesso em sigilo e não compartilhá-las com terceiros. A Softplus não se responsabiliza por acessos decorrentes de negligência na guarda de senhas.
          </p>

          <h2 className="text-xl font-semibold mt-8 mb-3">4. Uso permitido</h2>
          <p>O Cliente se compromete a usar a Plataforma de forma lícita, ética e em conformidade com a legislação aplicável. É proibido:</p>
          <ul className="list-disc pl-6 space-y-2">
            <li>Utilizar a Plataforma para atividades ilegais, fraudulentas ou não autorizadas;</li>
            <li>Enviar spam ou mensagens não solicitadas em massa sem o consentimento dos destinatários;</li>
            <li>Reproduzir, modificar, engenharia reversa, distribuir ou vender qualquer parte do SoftFlow sem autorização prévia e expressa;</li>
            <li>Tentar comprometer a segurança, disponibilidade ou integridade da Plataforma.</li>
          </ul>

          <h2 className="text-xl font-semibold mt-8 mb-3">5. Responsabilidades do Cliente</h2>
          <p>O Cliente é exclusivamente responsável por:</p>
          <ul className="list-disc pl-6 space-y-2">
            <li>Veracidade, legalidade e adequação dos dados e Conteúdos inseridos na Plataforma;</li>
            <li>Obtenção de consentimentos, autorizações e permissões necessárias para o tratamento de dados de terceiros;</li>
            <li>Conformidade com a LGPD, Marco Civil da Internet e outras normas aplicáveis à sua atividade;</li>
            <li>Conduta de seus Usuários e de terceiros que interajam com a Plataforma por meio de canais integrados.</li>
          </ul>

          <h2 className="text-xl font-semibold mt-8 mb-3">6. Integrações com terceiros</h2>
          <p>
            O SoftFlow pode se integrar a serviços de terceiros, como WhatsApp Business (Meta), Evolution API, Asaas, Conta Azul, Zapsign, Telegram, Anthropic (Claude) e outros. O Cliente reconhece que o uso dessas integrações está sujeito aos termos de uso e políticas de privacidade dos respectivos provedores. A Softplus não garante a disponibilidade contínua de serviços de terceiros.
          </p>

          <h2 className="text-xl font-semibold mt-8 mb-3">7. Disponibilidade e suporte</h2>
          <p>
            A Softplus se empenha para manter a Plataforma disponível, mas não garante operação ininterrupta ou livre de falhas. Eventuais interrupções poderão ocorrer por manutenção, atualizações, problemas técnicos ou força maior. O suporte técnico será prestado nos canais e horários definidos no contrato ou plano contratado.
          </p>

          <h2 className="text-xl font-semibold mt-8 mb-3">8. Propriedade intelectual</h2>
          <p>
            Todos os direitos de propriedade intelectual relativos ao SoftFlow — incluindo código, marcas, logotipos, layouts, funcionalidades e documentação — pertencem à SOFTPLUS TECNOLOGIA LTDA. O Cliente recebe apenas uma licença de uso limitada, não exclusiva e intransferível, vinculada ao plano contratado.
          </p>

          <h2 className="text-xl font-semibold mt-8 mb-3">9. Pagamento</h2>
          <p>
            Os valores, prazos e condições de pagamento são definidos no contrato ou proposta comercial firmada entre as partes. O atraso no pagamento pode acarretar suspensão ou cancelamento do acesso à Plataforma.
          </p>

          <h2 className="text-xl font-semibold mt-8 mb-3">10. Cancelamento e rescisão</h2>
          <p>
            O Cliente pode solicitar o cancelamento do serviço conforme as condições contratuais. A Softplus pode suspender ou rescindir o acesso em caso de violação destes Termos, uso indevido ou determinação legal. Após a rescisão, os dados do Cliente poderão ser excluídos ou anonimizados, salvo obrigação legal de retenção.
          </p>

          <h2 className="text-xl font-semibold mt-8 mb-3">11. Limitação de responsabilidade</h2>
          <p>
            Na máxima extensão permitida pela lei aplicável, a Softplus não será responsabilizada por danos indiretos, incidentais, especiais ou consequenciais, incluindo lucros cessantes, decorrentes do uso ou da impossibilidade de uso da Plataforma. A responsabilidade total da Softplus está limitada ao valor pago pelo Cliente nos 12 (doze) meses anteriores ao evento.
          </p>

          <h2 className="text-xl font-semibold mt-8 mb-3">12. Alterações dos termos</h2>
          <p>
            A Softplus pode atualizar estes Termos a qualquer momento. As alterações serão comunicadas por meio da Plataforma ou por e-mail. O uso continuado após a publicação das alterações constituirá aceitação dos novos Termos.
          </p>

          <h2 className="text-xl font-semibold mt-8 mb-3">13. Lei aplicável e foro</h2>
          <p>
            Estes Termos são regidos pela legislação brasileira. Fica eleito o foro da Comarca de Natal/RN, com expressa renúncia a qualquer outro, por mais privilegiado que seja, para dirimir quaisquer dúvidas ou controvérsias oriundas deste instrumento.
          </p>

          <h2 className="text-xl font-semibold mt-8 mb-3">14. Contato</h2>
          <p>
            Para dúvidas sobre estes Termos de Serviço, entre em contato pelo e-mail{" "}
            <a href="mailto:COMERCIAL@SOFTPLUSTECNOLOGIA.COM.BR" className="text-primary underline hover:text-primary/90">
              COMERCIAL@SOFTPLUSTECNOLOGIA.COM.BR
            </a>.
          </p>

          <p className="mt-10 text-sm text-muted-foreground">
            © 2026 SOFTPLUS TECNOLOGIA LTDA — CNPJ 13.382.798/0001-25. Todos os direitos reservados.
          </p>
        </div>
      </div>
    </div>
  );
};

export default Terms;
