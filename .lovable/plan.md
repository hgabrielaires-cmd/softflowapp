

## Melhorias no menu lateral (sidebar)

### O que sera feito

1. **Remover a barra de rolagem feia** - Substituir o `overflow-y-auto` da nav por scroll nativo da pagina, ou usar uma scrollbar customizada invisivel/thin que so aparece no hover.

2. **Aumentar a logo em 200%** - A logo atual tem `h-12`. Sera aumentada para `h-24` (dobro do tamanho).

3. **Logo clicavel para o Dashboard** - Envolver a logo (tanto expandida quanto colapsada) em um link/botao que navega para `/dashboard`.

### Detalhes tecnicos

**Arquivo:** `src/components/AppLayout.tsx`

- **Scrollbar** (linha 156): Trocar `overflow-y-auto` por classes customizadas com scrollbar thin/invisivel usando CSS utilitario do Tailwind (`scrollbar-thin scrollbar-thumb-transparent hover:scrollbar-thumb-sidebar-border`) ou aplicar estilo inline/CSS para esconder a scrollbar mas manter o scroll funcional (`overflow-y-auto` + `scrollbar-width: none` / `-webkit-scrollbar: display none`). A abordagem mais limpa sera usar `overflow-y-auto` com classes CSS que escondem a scrollbar visualmente.

- **Logo expandida** (linha 152): Trocar `h-12` por `h-24` na img da logo branca. Envolver em `<button onClick={() => navigate('/dashboard')}>` ou `<NavLink to="/dashboard">`.

- **Logo colapsada** (linha 150): Trocar `h-8 w-8` por `h-10 w-10` (proporcional). Envolver no mesmo link clicavel.

- **CSS** (em `src/index.css` ou inline): Adicionar estilo para esconder scrollbar no nav do sidebar:
  ```css
  .sidebar-nav-scroll::-webkit-scrollbar { display: none; }
  .sidebar-nav-scroll { scrollbar-width: none; }
  ```

