/**
 * Baixar resultados: um, vários selecionados e o período inteiro — no
 * computador e no celular.
 *
 * O download é conferido de verdade: o arquivo que o Chromium grava é lido do
 * disco, e o .zip é aberto pelo `unzip` do sistema. Assim o teste falha se o
 * nome vier errado, se o arquivo vier vazio ou se o .zip não abrir em outro
 * programa.
 */
import { execFileSync } from "node:child_process";
import { statSync } from "node:fs";
import { launch, openApp, PHONE, DESKTOP, STORAGE } from "./harness.mjs";

const b = await launch();
let falhas = 0;
const ok = (c, m) => {
  console.log((c ? "  ✓ " : "  ✗ ") + m);
  if (!c) falhas++;
};

/** Resultados apontando para o armazenamento, como em produção (e com .png no fim). */
function sinaisNoStorage(n = 6) {
  return Array.from({ length: n }, (_, i) => ({
    id: `sig-${i + 1}`,
    image_url: `${STORAGE}discord-images/bot/print-${i + 1}.png`,
    storage_path: `bot/print-${i + 1}.png`,
    // Minutos diferentes para os nomes saírem diferentes, sem virar o dia.
    uploaded_at: new Date(Date.now() - i * 60_000).toISOString(),
    expires_at: new Date(Date.now() - i * 60_000 + 30 * 864e5).toISOString(),
    caption: i === 0 ? "Green na casa 1" : null,
    author: null,
    source: "discord",
    status: "novo",
  }));
}

/** Nomes dos arquivos dentro de um .zip, pelo descompactador do sistema. */
function dentroDoZip(caminho) {
  const saida = execFileSync("unzip", ["-Z1", caminho], { encoding: "utf-8" });
  return saida.split("\n").filter(Boolean);
}

const NOME_DE_IMAGEM = /^nova-era_\d{4}-\d{2}-\d{2}_\d{2}h\d{2}(_[a-z0-9-]+)?\.png$/;

console.log("\n[desktop] baixar um resultado pelo cartão");
{
  const { ctx, page, erros } = await openApp(b, "/resultados", {
    viewport: DESKTOP,
    signals: sinaisNoStorage(),
  });
  await page.waitForTimeout(800);

  const botao = page.getByRole("button", { name: "Baixar este resultado" }).first();
  ok(await botao.isVisible(), "cada cartão tem botão de baixar");

  const [download] = await Promise.all([page.waitForEvent("download"), botao.click()]);
  const nome = download.suggestedFilename();
  ok(NOME_DE_IMAGEM.test(nome), `nome com data e hora: ${nome}`);

  const caminho = await download.path();
  ok(statSync(caminho).size > 0, "o arquivo baixado não está vazio");

  const reais = erros.filter((e) => !e.includes("ERR_CONNECTION_RESET") && !e.includes("404"));
  ok(reais.length === 0, "sem erro de console " + JSON.stringify(reais.slice(0, 2)));
  await ctx.close();
}

console.log("\n[desktop] baixar pelo lightbox");
{
  const { ctx, page } = await openApp(b, "/resultados", {
    viewport: DESKTOP,
    signals: sinaisNoStorage(3),
  });
  await page.waitForTimeout(800);

  await page.locator('[data-slot="card"], .group').first().click();
  await page.waitForTimeout(400);

  const botao = page.getByRole("button", { name: "Baixar", exact: true });
  ok(await botao.isVisible(), "lightbox tem botão de baixar");
  const [download] = await Promise.all([page.waitForEvent("download"), botao.click()]);
  ok(NOME_DE_IMAGEM.test(download.suggestedFilename()), "baixou a imagem ampliada");
  await ctx.close();
}

console.log("\n[desktop] selecionar vários e baixar em .zip");
{
  const { ctx, page } = await openApp(b, "/resultados", {
    viewport: DESKTOP,
    signals: sinaisNoStorage(4),
  });
  await page.waitForTimeout(800);

  const marcar = page.getByRole("button", { name: "Selecionar para usar no estúdio" });
  await marcar.nth(0).click();
  await marcar.nth(1).click();
  ok(await page.getByText("2 selecionados").isVisible(), "a barra conta a seleção");

  const [download] = await Promise.all([
    page.waitForEvent("download"),
    page.getByRole("button", { name: "Baixar", exact: true }).click(),
  ]);
  const nome = download.suggestedFilename();
  ok(/^nova-era_hoje_\d{4}-\d{2}-\d{2}\.zip$/.test(nome), `.zip com o período no nome: ${nome}`);

  const dentro = dentroDoZip(await download.path());
  ok(dentro.length === 2, `o .zip tem os 2 escolhidos (${dentro.length})`);
  ok(
    dentro.every((n) => NOME_DE_IMAGEM.test(n)),
    "cada imagem dentro do .zip tem nome com data " + JSON.stringify(dentro),
  );
  ok(new Set(dentro).size === dentro.length, "sem nome repetido dentro do .zip");
  await ctx.close();
}

console.log("\n[desktop] selecionar todos");
{
  const { ctx, page } = await openApp(b, "/resultados", {
    viewport: DESKTOP,
    signals: sinaisNoStorage(5),
  });
  await page.waitForTimeout(800);

  await page.getByRole("button", { name: "Selecionar todos" }).click();
  ok(await page.getByText("5 selecionados").isVisible(), "marca a lista inteira de uma vez");

  const [download] = await Promise.all([
    page.waitForEvent("download"),
    page.getByRole("button", { name: "Baixar", exact: true }).click(),
  ]);
  ok(dentroDoZip(await download.path()).length === 5, "o .zip traz os 5");
  await ctx.close();
}

console.log("\n[desktop] baixar o período inteiro pelo menu");
{
  const { ctx, page } = await openApp(b, "/resultados", {
    viewport: DESKTOP,
    signals: sinaisNoStorage(7),
  });
  await page.waitForTimeout(800);

  await page.getByTestId("menu-baixar").click();
  await page.waitForTimeout(300);
  for (const rotulo of ["Do dia", "Da semana", "Do mês"]) {
    ok(await page.getByRole("menuitem", { name: new RegExp(rotulo) }).isVisible(), rotulo);
  }

  const [download] = await Promise.all([
    page.waitForEvent("download"),
    page.getByRole("menuitem", { name: /Da semana/ }).click(),
  ]);
  const nome = download.suggestedFilename();
  ok(
    /^nova-era_ultimos-7-dias_\d{4}-\d{2}-\d{2}\.zip$/.test(nome),
    `o nome diz qual período: ${nome}`,
  );
  // O lote do menu busca no banco, não na lista da tela — os 7 têm que vir.
  ok(dentroDoZip(await download.path()).length === 7, "o período inteiro entrou no .zip");
  await ctx.close();
}

console.log("\n[desktop] a barra de progresso aparece e dá para cancelar");
{
  // Armazenamento lento de propósito: são 12 imagens, 5 por vez, ~1,2s cada
  // rodada — tempo de sobra para ver a barra e clicar em cancelar.
  const { ctx, page } = await openApp(b, "/resultados", {
    viewport: DESKTOP,
    signals: sinaisNoStorage(12),
    atrasoStorageMs: 1_200,
  });
  await page.waitForTimeout(800);

  await page.getByRole("button", { name: "Selecionar todos" }).click();
  await page.getByRole("button", { name: "Baixar", exact: true }).click();

  const barra = page.getByTestId("progresso-download");
  await barra.waitFor({ state: "visible", timeout: 5_000 });
  ok(true, "a barra de progresso aparece durante o download");

  // Espera a animação de entrada terminar; antes disso o botão ainda se move.
  await page.waitForTimeout(500);
  await barra.getByRole("button", { name: "Cancelar" }).click();
  await page.waitForTimeout(600);
  ok(await barra.isHidden(), "cancelar fecha a barra");
  ok(
    await page.getByText("Download cancelado.").first().isVisible(),
    "o cancelamento é avisado na tela",
  );
  await ctx.close();
}

console.log("\n[celular] baixar funciona no toque");
{
  const { ctx, page, erros } = await openApp(b, "/resultados", {
    viewport: PHONE,
    signals: sinaisNoStorage(4),
  });
  await page.waitForTimeout(800);

  const botao = page.getByRole("button", { name: "Baixar este resultado" }).first();
  const alvo = await botao.boundingBox();
  ok(
    alvo && alvo.height >= 44 && alvo.width >= 44,
    `alvo de toque ${alvo ? `${Math.round(alvo.width)}x${Math.round(alvo.height)}` : "?"}px`,
  );

  // Sem menu de compartilhar no Chromium, o caminho é o mesmo do computador —
  // que é justamente o que precisa funcionar no celular de quem não tem Web Share.
  const [download] = await Promise.all([page.waitForEvent("download"), botao.click()]);
  ok(NOME_DE_IMAGEM.test(download.suggestedFilename()), "baixou no celular");

  ok(await page.getByTestId("menu-baixar").isVisible(), 'o menu "Baixar tudo" cabe na tela');
  await page.screenshot({ path: "s5-baixar-celular.png" });

  const reais = erros.filter((e) => !e.includes("ERR_CONNECTION_RESET") && !e.includes("404"));
  ok(reais.length === 0, "sem erro de console " + JSON.stringify(reais.slice(0, 2)));
  await ctx.close();
}

console.log("\n[celular] a barra de seleção não cobre nem é coberta");
{
  const { ctx, page } = await openApp(b, "/resultados", {
    viewport: PHONE,
    signals: sinaisNoStorage(3),
  });
  await page.waitForTimeout(800);

  await page.getByRole("button", { name: "Selecionar para usar no estúdio" }).first().click();
  const baixar = await page.getByRole("button", { name: "Baixar", exact: true }).boundingBox();
  const nav = await page.locator('nav[data-nav="mobile"]').boundingBox();
  ok(baixar && baixar.height >= 44, "o botão Baixar da seleção é alcançável no polegar");
  ok(
    baixar && nav && baixar.y + baixar.height <= nav.y + 1,
    "a barra de abas não cobre o botão Baixar",
  );
  await ctx.close();
}

console.log("\n[celular] período vazio ainda deixa baixar outro período");
{
  const { ctx, page } = await openApp(b, "/resultados", { viewport: PHONE, signals: [] });
  await page.waitForTimeout(700);
  ok(
    await page.getByTestId("menu-baixar").isVisible(),
    'com a lista vazia, "Baixar tudo" continua na tela',
  );
  await ctx.close();
}

await b.close();
console.log(falhas === 0 ? "\n=== TODOS OS TESTES PASSARAM ===" : `\n=== ${falhas} FALHA(S) ===`);
process.exit(falhas ? 1 : 0);
