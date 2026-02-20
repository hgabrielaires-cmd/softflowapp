
## Mover Anexo I para logo apos os dados de Contratante/Contratado

### O que sera feito

O bloco do **ANEXO I** (que contem Plano Selecionado, Modulos Adicionais, Resumo de Valores/Pagamento, descontos e observacoes) sera **movido** da posicao atual (apos as clausulas e assinaturas, no final do documento) para **logo apos os dados de CONTRATANTE e CONTRATADO**, iniciando na **pagina 2** com um `page-break-before`.

### Estrutura atual do documento

1. Cabecalho com Logo + Numero do Contrato
2. Dados CONTRATADA (Filial) e CONTRATANTE (Cliente)
3. Texto introdutorio
4. Clausulas 1 a 16
5. Assinaturas
6. **ANEXO I** (plano, modulos, valores, pagamento, descontos)
7. Clausulas A a F do Anexo
8. Assinaturas finais

### Nova estrutura proposta

1. Cabecalho com Logo + Numero do Contrato
2. Dados CONTRATADA (Filial) e CONTRATANTE (Cliente)
3. **ANEXO I** (plano, modulos, valores, pagamento, descontos) -- com page-break-before para iniciar na pagina 2
4. Texto introdutorio
5. Clausulas 1 a 16
6. Clausulas A a F do Anexo
7. Assinaturas finais

### Detalhes tecnicos

A alteracao sera feita via SQL UPDATE no template `document_templates` (id `90b43be1-...`):

1. **Recortar** o bloco HTML do ANEXO I: desde `<div class="anexo-header"...>ANEXO I...` ate o fechamento do ultimo `data-box` (Resumo de Valores), incluindo os 3 blocos (Plano, Modulos, Valores/Pagamento/Descontos/Observacoes).

2. **Inserir** esse bloco logo apos o fechamento do `</div>` do `data-grid` (que contem CONTRATADA e CONTRATANTE), mantendo o `page-break-before:always` no cabecalho do Anexo para garantir que inicie na pagina 2.

3. **Remover** o bloco original da posicao antiga (antes das Clausulas A-F).

Nenhum arquivo de codigo sera alterado -- apenas o conteudo HTML armazenado no banco de dados.
