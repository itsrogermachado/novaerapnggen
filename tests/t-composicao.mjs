// Testes de "voltar de onde parou" (rascunho no navegador) e dos modelos salvos na conta.
import { launch, openApp, PHONE, DESKTOP, STORAGE } from "./harness.mjs";
const b = await launch();
let falhas = 0;
const ok = (c, m) => {
  console.log((c ? "  ✓ " : "  ✗ ") + m);
  if (!c) falhas++;
};

const USER_ID = "00000000-0000-4000-8000-000000000001";
const FUNDO = `${STORAGE}backgrounds/u/fundo-1.webp`;
const LOGO = `${STORAGE}logos/u/logo-1.png`;
const fundos = [{ id: "bg1", name: "Fundo 1", image_url: FUNDO, created_at: "2026-09-01" }];
const logos = [{ id: "lg1", name: "Logo 1", image_url: LOGO, created_at: "2026-09-01" }];

// Imagem "do computador" para o campo de destaques.
const arquivo = (nome, cor, w = 300, h = 450) => ({
  name: `${nome}.svg`,
  mimeType: "image/svg+xml",
  buffer: Buffer.from(
    `<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${h}"><rect width="${w}" height="${h}" fill="#${cor}"/></svg>`,
  ),
});

// Posições das camadas no canvas (destaques e logo), lidas do estilo de cada uma.
const camadas = (page) =>
  page.$$eval('[data-canvas="preview"] > div[style]:not([data-lugar-vazio])', (els) =>
    els.map((e) => `${e.style.left}|${e.style.top}|${e.style.width}`),
  );
const temFundo = (page) =>
  page
    .locator('[data-canvas="preview"] > img')
    .count()
    .then((n) => n > 0);
const lugaresVazios = (page) => page.locator("[data-lugar-vazio]").count();
// Clica no canto de baixo à esquerda da miniatura: no computador o botão de excluir
// aparece no hover e cobre o centro das miniaturas pequenas da aba Destaques.
const usarMiniatura = async (page, i) => {
  const alvo = page.locator("[data-gerenciando] > div > button:first-child").nth(i);
  const caixa = await alvo.boundingBox();
  await alvo.click({ position: { x: 8, y: caixa.height - 8 } });
};

// Abre uma aba do painel e espera o conteúdo aparecer.
const aba = async (page, nome) => {
  await page.getByRole("tab", { name: nome }).click();
  await page.waitForTimeout(250);
};
const menu = async (page, item) => {
  await page.getByRole("button", { name: "Modelos" }).click();
  await page.getByRole("menuitem", { name: item }).click();
  await page.waitForTimeout(300);
};
// Espera a gravação automática (800 ms depois da última mudança).
const esperarGravar = (page) => page.waitForTimeout(1400);

// Grava um rascunho direto no IndexedDB do navegador, como se fosse de antes.
const gravarNoNavegador = (page, chave, rascunho) =>
  page.evaluate(
    ([chave, rascunho]) =>
      new Promise((resolve, reject) => {
        const pedido = indexedDB.open("nova-era-estudio", 1);
        pedido.onupgradeneeded = () => pedido.result.createObjectStore("rascunhos");
        pedido.onsuccess = () => {
          const t = pedido.result.transaction("rascunhos", "readwrite");
          t.objectStore("rascunhos").put({ rascunho, arquivos: {} }, chave);
          t.oncomplete = () => resolve(true);
          t.onerror = () => reject(t.error);
        };
      }),
    [chave, rascunho],
  );

console.log("\n[desktop] A. voltar de onde parou");
{
  const { ctx, page, erros } = await openApp(b, "/app", {
    viewport: DESKTOP,
    backgrounds: fundos,
    logos,
  });
  await page.waitForTimeout(800);

  // Monta: fundo, logo, dois destaques do computador e move a logo.
  await page.getByRole("button", { name: "Fundo 1" }).click();
  await aba(page, "Logos");
  await page.getByRole("button", { name: "Logo 1" }).click();
  await aba(page, "Destaques");
  await page
    .locator('input[type="file"][multiple]')
    .setInputFiles([arquivo("a", "16a34a"), arquivo("b", "0ea5e9", 400, 300)]);
  await page.waitForTimeout(500);
  await usarMiniatura(page, 0);
  await usarMiniatura(page, 1);
  await page.waitForTimeout(400);
  const logoCaixa = await page.locator('[data-canvas="preview"] > div[style]').last().boundingBox();
  await page.mouse.move(logoCaixa.x + logoCaixa.width / 2, logoCaixa.y + logoCaixa.height / 2);
  await page.mouse.down();
  await page.mouse.move(logoCaixa.x + 60, logoCaixa.y + 90, { steps: 5 });
  await page.mouse.up();
  await esperarGravar(page);
  const antes = await camadas(page);
  ok(antes.length === 3, `3 camadas montadas (${antes.length})`);

  await page.reload({ waitUntil: "networkidle" });
  await page.waitForTimeout(1500);
  const depois = await camadas(page);
  ok(await temFundo(page), "fundo voltou depois de recarregar");
  ok(JSON.stringify(depois) === JSON.stringify(antes), "logo e destaques voltaram no mesmo lugar");
  ok(
    await page.getByText("Continuando de onde você parou").isVisible(),
    "avisa que continuou de onde parou",
  );
  await aba(page, "Destaques");
  ok(
    (await page.locator("[data-gerenciando] > div").count()) === 2,
    "as 2 imagens do computador voltaram para a aba Destaques",
  );

  // Nova composição: limpa a tela e, ao recarregar, continua vazia.
  await menu(page, "Nova composição");
  await page.getByRole("button", { name: "Limpar a tela" }).click();
  await esperarGravar(page);
  ok((await camadas(page)).length === 0 && !(await temFundo(page)), "Nova composição limpa a tela");
  await page.keyboard.press("Control+z");
  await page.waitForTimeout(400);
  ok((await camadas(page)).length === 3, "Ctrl+Z traz a tela de volta");
  await menu(page, "Nova composição");
  await page.getByRole("button", { name: "Limpar a tela" }).click();
  await esperarGravar(page);
  await page.reload({ waitUntil: "networkidle" });
  await page.waitForTimeout(1200);
  ok(
    (await camadas(page)).length === 0 && !(await temFundo(page)),
    "recarregar depois continua vazio",
  );

  // Rascunho de outra conta no mesmo navegador não aparece.
  await gravarNoNavegador(page, "outra-conta", {
    versao: 1,
    formato: "story",
    fundo: FUNDO,
    logo: null,
    biblioteca: [],
    destaques: [],
    lugares: null,
    modeloNome: null,
  });
  await page.reload({ waitUntil: "networkidle" });
  await page.waitForTimeout(1200);
  ok(!(await temFundo(page)), "rascunho de outra conta não aparece");

  const errosReais = erros.filter((e) => !e.includes("404") && !e.includes("Failed to load"));
  ok(
    errosReais.length === 0,
    `console sem erros ${errosReais.length ? JSON.stringify(errosReais) : ""}`,
  );
  await ctx.close();
}

console.log("\n[desktop] A. imagem que sumiu");
{
  const SUMIU = `${STORAGE}backgrounds/u/apagado.webp`;
  const PRINT = `${STORAGE}discord-images/bot/1/embed0.png`;
  const { ctx, page } = await openApp(b, "/app", {
    viewport: DESKTOP,
    backgrounds: fundos,
    imagensSumidas: [SUMIU],
  });
  await page.waitForTimeout(800);
  await gravarNoNavegador(page, USER_ID, {
    versao: 1,
    formato: "feed",
    fundo: SUMIU,
    logo: null,
    biblioteca: [{ id: "p1", origem: "url", url: PRINT }],
    destaques: [{ id: "p1", x: 0.3, y: 0.6, size: 0.35 }],
    lugares: null,
    modeloNome: null,
  });
  await page.reload({ waitUntil: "networkidle" });
  await page.waitForTimeout(1500);
  ok(
    await page.getByText("1 imagem não está mais disponível e ficou de fora.").isVisible(),
    "avisa a imagem que não existe mais",
  );
  ok(
    JSON.stringify(await camadas(page)) === JSON.stringify(["30%|60%|35%"]),
    "o print que ainda existe voltou na posição salva",
  );

  await ctx.close();
}

console.log("\n[desktop] A. prints vindos de /resultados não somem com a restauração");
{
  // A imagem do rascunho demora 1,5 s: a importação termina antes da restauração.
  // Sem a espera pelo rascunho, a restauração chegaria depois e apagaria os prints.
  const PRINT = `${STORAGE}discord-images/bot/1/embed0.png`;
  const { ctx, page } = await openApp(b, "/app", { viewport: DESKTOP, atrasoStorageMs: 1500 });
  await page.waitForTimeout(800);
  await gravarNoNavegador(page, USER_ID, {
    versao: 1,
    formato: "feed",
    fundo: null,
    logo: null,
    biblioteca: [{ id: "p1", origem: "url", url: PRINT }],
    destaques: [{ id: "p1", x: 0.3, y: 0.6, size: 0.35 }],
    lugares: null,
    modeloNome: null,
  });
  await page.goto("http://127.0.0.1:5199/app?resultados=sig-1", { waitUntil: "networkidle" });
  await page.waitForTimeout(3500);
  const lista = await camadas(page);
  // O simulador devolve os 6 prints de teste: 1 do rascunho + 6 importados.
  ok(lista.length === 7, `rascunho e prints importados juntos na tela (${lista.length} de 7)`);
  await ctx.close();
}

console.log("\n[desktop] B. modelos");
{
  const modelos = [];
  const { ctx, page, erros } = await openApp(b, "/app", {
    viewport: DESKTOP,
    backgrounds: fundos,
    logos,
    modelos,
  });
  await page.waitForTimeout(800);

  // Sem nada na tela, não dá para salvar.
  await page.getByRole("button", { name: "Modelos" }).click();
  ok(
    (await page
      .getByRole("menuitem", { name: /Salvar como modelo/ })
      .getAttribute("aria-disabled")) === "true",
    "Salvar como modelo desativado com a tela vazia",
  );
  await page.keyboard.press("Escape");

  // Monta fundo + 3 destaques e salva como modelo.
  await page.getByRole("button", { name: "Fundo 1" }).click();
  await aba(page, "Destaques");
  await page
    .locator('input[type="file"][multiple]')
    .setInputFiles([arquivo("a", "16a34a"), arquivo("b", "0ea5e9"), arquivo("c", "f97316")]);
  await page.waitForTimeout(500);
  for (let i = 0; i < 3; i++) await usarMiniatura(page, i);
  await page.waitForTimeout(400);
  const posicoesModelo = await camadas(page);

  await menu(page, /Salvar como modelo/);
  const campo = page.locator("#nome-modelo");
  await campo.fill("x".repeat(61));
  ok((await campo.inputValue()).length === 60, "nome do modelo para em 60 caracteres");
  await campo.fill("Green do dia");
  await page.keyboard.press("Enter");
  await page.waitForTimeout(700);
  ok(modelos.length === 1 && modelos[0].nome === "Green do dia", "modelo gravado na conta");
  ok(
    modelos[0].dados.lugares.length === 3 && !JSON.stringify(modelos[0].dados).includes("blob:"),
    "modelo guarda 3 lugares e nenhuma imagem do computador",
  );

  // Nome repetido pede para substituir.
  await menu(page, /Salvar como modelo/);
  await page.locator("#nome-modelo").fill("  green DO dia ");
  await page.keyboard.press("Enter");
  await page.waitForTimeout(500);
  ok(await page.getByText("Substituir modelo?").isVisible(), "nome repetido pede para substituir");
  await page.getByRole("button", { name: "Substituir" }).click();
  await page.waitForTimeout(600);
  ok(
    modelos.length === 1 && modelos[0].nome === "green DO dia",
    "substituir não cria um segundo modelo e fica com o nome digitado",
  );

  // Tela vazia, abrir o modelo: 3 lugares tracejados esperando os prints.
  await menu(page, "Nova composição");
  await page.getByRole("button", { name: "Limpar a tela" }).click();
  await page.waitForTimeout(300);
  await menu(page, "Abrir modelo");
  ok(await page.getByText("Feed ·").isVisible(), "lista mostra o formato do modelo");
  await page.getByRole("button", { name: /^green do dia/i }).click();
  await page.waitForTimeout(700);
  ok((await lugaresVazios(page)) === 3, "abre com 3 lugares vazios");
  ok(await temFundo(page), "abre com o fundo do modelo");
  ok(await page.locator('[data-selo="modelo"]').getByText("0/3").isVisible(), "selo mostra 0/3");

  // Ctrl+Z desfaz a abertura do modelo.
  await page.keyboard.press("Control+z");
  await page.waitForTimeout(400);
  ok(
    (await lugaresVazios(page)) === 0 && (await page.locator('[data-selo="modelo"]').count()) === 0,
    "Ctrl+Z desfaz a abertura do modelo",
  );
  await page.keyboard.press("Control+y");
  await page.waitForTimeout(400);
  ok((await lugaresVazios(page)) === 3, "Ctrl+Y abre de novo");

  // Dois prints entram: ocupam os lugares 1 e 2.
  await aba(page, "Destaques");
  await usarMiniatura(page, 0);
  await usarMiniatura(page, 1);
  await page.waitForTimeout(500);
  ok(
    JSON.stringify(await camadas(page)) === JSON.stringify(posicoesModelo.slice(0, 2)),
    "os 2 prints ocupam os lugares 1 e 2",
  );
  ok((await lugaresVazios(page)) === 1, "sobra 1 lugar vazio");

  // Recarregar com o modelo aberto: volta com o lugar vazio (rascunho + modelo juntos).
  await esperarGravar(page);
  await page.reload({ waitUntil: "networkidle" });
  await page.waitForTimeout(1500);
  ok((await lugaresVazios(page)) === 1, "recarregar mantém o modelo aberto e o lugar vazio");
  ok(await page.locator('[data-selo="modelo"]').getByText("2/3").isVisible(), "selo mostra 2/3");

  // Mais prints que lugares: reorganiza e avisa.
  await aba(page, "Destaques");
  await page
    .locator('input[type="file"][multiple]')
    .setInputFiles([arquivo("d", "a855f7"), arquivo("e", "ef4444")]);
  await page.waitForTimeout(500);
  for (let i = 2; i < 5; i++) await usarMiniatura(page, i);
  await page.waitForTimeout(600);
  ok(
    await page
      .getByText(/reorganizei automaticamente/)
      .first()
      .isVisible(),
    "avisa que reorganizou",
  );

  // Fechar o modelo tira o selo e os lugares.
  await page.getByRole("button", { name: "Fechar modelo" }).click();
  await page.waitForTimeout(300);
  ok((await page.locator('[data-selo="modelo"]').count()) === 0, "fechar modelo tira o selo");

  // Apagar o modelo.
  await menu(page, "Abrir modelo");
  await page.getByRole("button", { name: /Apagar modelo green do dia/i }).click();
  await page.getByRole("button", { name: "Apagar", exact: true }).click();
  await page.waitForTimeout(600);
  ok(modelos.length === 0, "modelo apagado da conta");
  ok(await page.getByText(/Nenhum modelo ainda/).isVisible(), "lista vazia explica o que fazer");

  ok(erros.length === 0, `console sem erros ${erros.length ? JSON.stringify(erros) : ""}`);
  await ctx.close();
}

console.log("\n[mobile] menu e diálogos cabem na tela");
{
  const modelos = [
    {
      id: "m1",
      user_id: USER_ID,
      nome: "Um modelo com nome bem comprido para ver se quebra direitinho no celular",
      dados: { versao: 1, formato: "story", fundo: FUNDO, logo: null, lugares: [] },
      criado_em: "2026-09-10T00:00:00Z",
      atualizado_em: "2026-09-10T00:00:00Z",
    },
  ];
  const { ctx, page } = await openApp(b, "/app", { viewport: PHONE, backgrounds: fundos, modelos });
  await page.waitForTimeout(900);
  const semRolagemLateral = () =>
    page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth);
  const botao = await page.getByRole("button", { name: "Modelos" }).boundingBox();
  ok(botao && botao.height >= 44, `botão Modelos com ${botao ? Math.round(botao.height) : "?"}px`);
  await menu(page, "Abrir modelo");
  ok(await page.getByText("Stories ·").isVisible(), "lista abre no celular");
  ok(await semRolagemLateral(), "lista sem rolagem lateral");
  await page.screenshot({ path: "s5-modelos-celular.png" });
  await page.getByRole("button", { name: /^Um modelo com nome/ }).click();
  await page.waitForTimeout(700);
  ok(await page.locator('[data-selo="modelo"]').isVisible(), "selo aparece no celular");
  ok(await semRolagemLateral(), "selo com nome comprido sem rolagem lateral");
  await ctx.close();
}

await b.close();
console.log(falhas === 0 ? "\n=== TODOS OS TESTES PASSARAM ===" : `\n=== ${falhas} FALHA(S) ===`);
process.exit(falhas ? 1 : 0);
