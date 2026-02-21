

# Melhorar Campo de Horas Estimadas nas Atividades

## Problema
O campo "Horas Estimadas" usa um input numerico simples (`type="number"`) que nao e intuitivo para preencher. O usuario precisa digitar valores decimais manualmente.

## Solucao
Substituir o input numerico por um campo mais amigavel com botoes de incremento/decremento (+ e -) e opcoes rapidas de horas pre-definidas.

### Detalhes da Implementacao

**Arquivo:** `src/pages/JornadaImplantacao.tsx` (linha ~638-641)

**Antes:** Input simples `type="number"` com step 0.5

**Depois:** Layout com:
1. Botao "-" para decrementar 0.5h
2. Valor exibido no centro (ex: "2h", "1.5h")
3. Botao "+" para incrementar 0.5h
4. Botoes rapidos abaixo: 0.5h, 1h, 2h, 4h, 8h para selecao direta

```text
   [ - ]   2h   [ + ]
   [0.5h] [1h] [2h] [4h] [8h]
```

### Detalhes Tecnicos
- Substituir o `<Input type="number">` na linha 640 por um componente inline com botoes usando `<Button variant="outline" size="sm">`
- Manter o valor minimo em 0
- Incrementos de 0.5 nos botoes +/-
- Botoes rapidos preenchem diretamente o valor
- Visual limpo e compacto dentro do dialog de atividade
