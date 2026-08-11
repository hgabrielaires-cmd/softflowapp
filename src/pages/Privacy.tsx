import { useEffect } from "react";

const Privacy = () => {
  useEffect(() => {
    document.title = "Política de Privacidade | SoftFlow";
  }, []);

  return (
    <div className="min-h-screen bg-background text-foreground">
      <div className="max-w-3xl mx-auto px-4 sm:px-6 py-12 sm:py-16">
        <div className="mb-8">
          <h1 className="text-3xl sm:text-4xl font-bold tracking-tight mb-2">Política de Privacidade</h1>
          <p className="text-muted-foreground">Última atualização: 11 de agosto de 2026</p>
        </div>

        <div className="prose prose-sm sm:prose-base max-w-none text-foreground/90">
          <p className="lead">
            Esta Política de Privacidade descreve como a <strong>SOFTPLUS TECNOLOGIA LTDA</strong>, inscrita no CNPJ nº <strong>13.382.798/0001-25</strong>, com sede em <strong>AV PRUDENTE DE MORAIS, 5121, LAGOA NOVA, NATAL, RN</strong> ("nós", "nossa empresa"), coleta, utiliza, armazena e protege os dados pessoais dos usuários que interagem conosco, inclusive por meio do <strong>WhatsApp</strong>, em conformidade com a Lei nº 13.709/2018 (Lei Geral de Proteção de Dados — LGPD).
          </p>

          <h2 className="text-xl font-semibold mt-8 mb-3">1. Controlador dos dados</h2>
          <p>
            O controlador responsável pelo tratamento dos seus dados pessoais é a <strong>SOFTPLUS TECNOLOGIA LTDA</strong> (CNPJ 13.382.798/0001-25). Para qualquer questão relativa a privacidade, entre em contato pelo e-mail{" "}
            <a href="mailto:COMERCIAL@SOFTPLUSTECNOLOGIA.COM.BR" className="text-primary underline hover:text-primary/90">
              COMERCIAL@SOFTPLUSTECNOLOGIA.COM.BR
            </a>.
          </p>

          <h2 className="text-xl font-semibold mt-8 mb-3">2. Dados que coletamos</h2>
          <p>Ao interagir conosco, podemos coletar:</p>
          <ul className="list-disc pl-6 space-y-2">
            <li><strong>Dados de identificação e contato:</strong> nome e número de telefone associado à sua conta de WhatsApp.</li>
            <li><strong>Conteúdo das comunicações:</strong> as mensagens, arquivos e mídias que você nos envia e que enviamos a você durante o atendimento.</li>
            <li><strong>Dados de uso e técnicos:</strong> data e horário das mensagens, status de entrega e informações necessárias ao funcionamento do atendimento.</li>
            <li><strong>Outros dados que você fornecer voluntariamente</strong> no decorrer da conversa (por exemplo, informações de pedido, cadastro ou solicitação).</li>
          </ul>

          <h2 className="text-xl font-semibold mt-8 mb-3">3. Como e por que usamos seus dados</h2>
          <p>Tratamos os seus dados pessoais para as seguintes finalidades:</p>
          <ul className="list-disc pl-6 space-y-2">
            <li>Prestar atendimento, suporte e responder às suas solicitações;</li>
            <li>Enviar notificações e informações relacionadas a produtos, serviços, pedidos ou solicitações que você iniciou;</li>
            <li>Cumprir obrigações legais e regulatórias;</li>
            <li>Melhorar a qualidade do nosso atendimento e dos nossos serviços.</li>
          </ul>
          <p>
            O tratamento se dá com base nas hipóteses legais previstas na LGPD, tais como o consentimento do titular, a execução de contrato ou de procedimentos preliminares, o cumprimento de obrigação legal e o legítimo interesse, conforme aplicável a cada finalidade.
          </p>

          <h2 className="text-xl font-semibold mt-8 mb-3">4. WhatsApp e a Meta</h2>
          <p>
            Nosso atendimento por WhatsApp utiliza a Plataforma WhatsApp Business, operada pela <strong>Meta Platforms, Inc.</strong> Para viabilizar o envio e o recebimento das mensagens, determinados dados (como seu número de telefone e o conteúdo das mensagens) são processados pela infraestrutura da Meta, que atua como operadora dessa plataforma. O tratamento realizado pela Meta é regido pelas políticas próprias da empresa, disponíveis em{" "}
            <a href="https://www.whatsapp.com/legal/privacy-policy" target="_blank" rel="noopener noreferrer" className="text-primary underline hover:text-primary/90">
              https://www.whatsapp.com/legal/privacy-policy
            </a>.
          </p>

          <h2 className="text-xl font-semibold mt-8 mb-3">5. Compartilhamento de dados</h2>
          <p>Não vendemos seus dados pessoais. Podemos compartilhá-los apenas quando necessário com:</p>
          <ul className="list-disc pl-6 space-y-2">
            <li>Prestadores de serviço que nos apoiam na operação do atendimento (sob obrigação de confidencialidade);</li>
            <li>Autoridades públicas, quando exigido por lei ou ordem judicial;</li>
            <li>A plataforma de mensagens (Meta/WhatsApp), conforme descrito acima.</li>
          </ul>

          <h2 className="text-xl font-semibold mt-8 mb-3">6. Armazenamento e retenção</h2>
          <p>
            Mantemos seus dados pessoais apenas pelo período necessário ao cumprimento das finalidades para as quais foram coletados, ou conforme exigido por obrigações legais e regulatórias. Encerrado esse período, os dados são eliminados ou anonimizados de forma segura.
          </p>

          <h2 className="text-xl font-semibold mt-8 mb-3">7. Segurança</h2>
          <p>
            Adotamos medidas técnicas e organizacionais razoáveis para proteger seus dados pessoais contra acessos não autorizados, perda, alteração ou divulgação indevida.
          </p>

          <h2 className="text-xl font-semibold mt-8 mb-3">8. Seus direitos</h2>
          <p>Nos termos da LGPD, você pode, a qualquer momento, solicitar:</p>
          <ul className="list-disc pl-6 space-y-2">
            <li>Confirmação da existência de tratamento;</li>
            <li>Acesso aos seus dados;</li>
            <li>Correção de dados incompletos, inexatos ou desatualizados;</li>
            <li>Anonimização, bloqueio ou eliminação de dados desnecessários ou tratados em desconformidade com a lei;</li>
            <li>Portabilidade dos dados;</li>
            <li>Informação sobre o compartilhamento dos seus dados;</li>
            <li>Revogação do consentimento.</li>
          </ul>
          <p>
            Para exercer esses direitos, entre em contato pelo e-mail{" "}
            <a href="mailto:COMERCIAL@SOFTPLUSTECNOLOGIA.COM.BR" className="text-primary underline hover:text-primary/90">
              COMERCIAL@SOFTPLUSTECNOLOGIA.COM.BR
            </a>.
          </p>

          <h2 className="text-xl font-semibold mt-8 mb-3">9. Exclusão de dados</h2>
          <p>
            Você pode solicitar a exclusão dos seus dados pessoais a qualquer momento enviando um pedido para o e-mail{" "}
            <a href="mailto:COMERCIAL@SOFTPLUSTECNOLOGIA.COM.BR" className="text-primary underline hover:text-primary/90">
              COMERCIAL@SOFTPLUSTECNOLOGIA.COM.BR
            </a>{" "}
            com o assunto "Exclusão de dados", informando o número de telefone utilizado no atendimento. Processaremos a solicitação no menor prazo possível, ressalvadas as hipóteses em que a retenção seja exigida por lei.
          </p>

          <h2 className="text-xl font-semibold mt-8 mb-3">10. Cookies</h2>
          <p>
            Caso você acesse nosso site, poderemos utilizar cookies e tecnologias semelhantes para o funcionamento das páginas e para melhorar sua experiência. Você pode gerenciar as preferências de cookies nas configurações do seu navegador.
          </p>

          <h2 className="text-xl font-semibold mt-8 mb-3">11. Alterações desta política</h2>
          <p>
            Esta Política poderá ser atualizada periodicamente. A versão vigente estará sempre disponível nesta página, com a respectiva data de atualização.
          </p>

          <h2 className="text-xl font-semibold mt-8 mb-3">12. Contato</h2>
          <p>
            Em caso de dúvidas sobre esta Política de Privacidade ou sobre o tratamento dos seus dados pessoais, fale com o nosso Encarregado de Proteção de Dados (DPO) pelo e-mail{" "}
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

export default Privacy;
