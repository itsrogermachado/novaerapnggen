# Testes de navegador

Rodam o app de verdade no Chromium — SSR, hidratação, router e CSS — com a
sessão do Supabase e todas as respostas da API interceptadas por fixtures
locais.

**Nada toca a produção.** Nenhuma conta é criada, nenhuma linha é escrita,
nenhuma imagem sobe. Todas as chamadas para `*.supabase.co` são interceptadas
antes de sair do navegador.

## Rodando

```bash
npm run dev            # em um terminal, precisa estar em :5199
npm run test:e2e       # em outro
```

Um arquivo isolado:

```bash
node tests/t-mobile.mjs
```

## O que cada arquivo cobre

| Arquivo        | Cobertura                                                                                                                                                                                                                                                                                     |
| -------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `t-fase1`      | Barra de abas: existe sem dados, alvos de toque, some fora do app, Admin só para admin                                                                                                                                                                                                        |
| `t-fase2`      | Aba com dados reais, badge, descarte de vencido, estado vazio, lightbox, envio manual                                                                                                                                                                                                         |
| `t-resultados` | Nome correto na interface, filtro de data, fluxo resultado → canvas                                                                                                                                                                                                                           |
| `t-paginacao`  | 75 resultados num dia: páginas de 30, acúmulo, fim da lista                                                                                                                                                                                                                                   |
| `t-mobile`     | Ordem de empilhamento, alcance do botão Baixar, excluir no toque, sliders, desktop preservado                                                                                                                                                                                                 |
| `t-baixar`     | Baixar um resultado, vários e o período inteiro; no celular, ida para a galeria com poucas E com muitas imagens (inclusive com o gesto expirado e em aparelho com limite por envio), aviso quando o aparelho não salva na galeria, e no computador o conteúdo do `.zip`, progresso e cancelar |

Os testes de `node --test` (`npm run test:unit`) cobrem a parte que não precisa de
navegador: `zip.test.mjs` grava um `.zip` de verdade e manda o Python abrir — se
só o nosso código conseguisse ler o arquivo, não adiantaria nada — e
`baixar.test.mjs` cobre as regras de nome de arquivo.

## Simulando o celular que salva na galeria

O Chromium de teste não tem `navigator.share`, então por padrão o app acha que
está num aparelho que só sabe baixar `.zip`. `openApp` aceita duas opções para
cobrir o caminho da galeria:

- `comGaleria: true` — injeta `navigator.share`/`canShare` e guarda em
  `window.__compartilhados` os nomes de arquivo de cada envio, para o teste
  conferir que foi imagem, e não `.zip`.
- `galeriaRecusa: true` — faz o menu recusar com `NotAllowedError`, que é o que
  o iOS faz quando o toque do usuário já expirou enquanto as imagens baixavam.
  É o caso que o painel "Salvar na galeria" existe para resolver.
- `limiteDaGaleria: 12` — aparelho que só aceita 12 arquivos por envio. Serve
  para conferir que o app descobre esse limite sozinho e vai em levas, em vez de
  desistir e entregar um `.zip`.

## Como o mock funciona

`harness.mjs` injeta uma sessão falsa em `localStorage` e intercepta
`/rest/v1/**` e `/auth/v1/**`. Ele imita o que o `supabase-js` realmente faz:

- `.single()` manda `Accept: application/vnd.pgrst.object+json` e recebe um
  objeto; sem ele, recebe uma lista.
- Paginação vai como `offset`/`limit` na query string, não como header `Range`.
- Contagem vai como `Prefer: count=exact`, e a resposta traz `content-range`.

Viewports abaixo de 768px sobem com `isMobile`/`hasTouch`, que é o que faz o
Chromium reportar `hover: none` — sem isso os testes de toque passariam de
mentira.
