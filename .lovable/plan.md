

## Ampliar area de edicao do template de mensagem

O dialog de edicao do template esta pequeno, fazendo com que a area de texto do conteudo da mensagem fique muito curta para editar mensagens longas.

### Alteracoes

**Arquivo:** `src/components/MessageTemplates.tsx`

1. Aumentar a largura maxima do dialog de `max-w-3xl` para `max-w-5xl`
2. Aumentar a altura minima do Textarea de `min-h-[200px]` para `min-h-[350px]`
3. Aumentar a altura maxima do dialog de `max-h-[85vh]` para `max-h-[90vh]`

Isso dara muito mais espaco para visualizar e editar o conteudo da mensagem sem precisar rolar tanto dentro do campo de texto.

