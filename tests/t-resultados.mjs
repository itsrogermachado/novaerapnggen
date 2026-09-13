import { launch, openApp, PHONE, signalsFixture } from "./harness.mjs";
const b = await launch();
let falhas = 0;
const ok = (c, m) => {
  console.log((c ? "  ✓ " : "  ✗ ") + m);
  if (!c) falhas++;
};

console.log("\n[mobile] /resultados — nome, filtro e fluxo");
{
  const { ctx, page, erros } = await openApp(b, "/resultados", { viewport: PHONE });
  await page.waitForTimeout(800);

  ok(
    await page.getByRole("heading", { name: "Resultados", exact: true }).isVisible(),
    'título é "Resultados"',
  );
  ok(
    (await page.getByText(/sinal|sinais/i).count()) === 0,
    'a palavra "sinal/sinais" sumiu da tela',
  );

  const filtro = page.getByRole("group", { name: "Filtrar por data" });
  ok(await filtro.isVisible(), "filtro de data presente");
  for (const r of ["Hoje", "Ontem", "7 dias", "30 dias", "Tudo"]) {
    ok(await filtro.getByRole("button", { name: r }).isVisible(), `período ${r}`);
  }
  const alvo = await filtro.getByRole("button", { name: "Hoje" }).boundingBox();
  ok(
    alvo && alvo.height >= 44,
    `alvo de toque do filtro ${alvo ? Math.round(alvo.height) : "?"}px`,
  );
  ok(
    (await filtro.getByRole("button", { name: "Hoje" }).getAttribute("aria-pressed")) === "true",
    "Hoje é o padrão",
  );

  await filtro.getByRole("button", { name: "30 dias" }).click();
  await page.waitForTimeout(600);
  ok(
    (await filtro.getByRole("button", { name: "30 dias" }).getAttribute("aria-pressed")) === "true",
    "troca de período aplica",
  );

  await page.screenshot({ path: "s3-resultados-filtro.png" });
  const reais = erros.filter((e) => !e.includes("ERR_CONNECTION_RESET") && !e.includes("404"));
  ok(reais.length === 0, "sem erro de console " + JSON.stringify(reais.slice(0, 2)));
  await ctx.close();
}

console.log("\n[mobile] filtro com lista vazia continua acessível");
{
  const { ctx, page } = await openApp(b, "/resultados", { viewport: PHONE, signals: [] });
  await page.waitForTimeout(600);
  ok(
    await page.getByRole("group", { name: "Filtrar por data" }).isVisible(),
    "filtro visível mesmo sem dados",
  );
  ok(await page.getByText("Nenhum resultado hoje").isVisible(), "vazio diz de qual período");
  await ctx.close();
}

console.log("\n[mobile] a aba se chama Resultados");
{
  const { ctx, page } = await openApp(b, "/app", { viewport: PHONE, signals: signalsFixture(2) });
  await page.waitForTimeout(700);
  ok(
    await page.locator('nav[data-nav="mobile"]').getByText("Resultados").isVisible(),
    "aba Resultados na barra",
  );
  await ctx.close();
}

console.log("\n[mobile] resultado -> canvas");
{
  const { ctx, page } = await openApp(b, "/resultados", { viewport: PHONE });
  await page.waitForTimeout(800);
  await page.getByRole("button", { name: "Usar este resultado no estúdio" }).first().click();
  await page.waitForTimeout(2200);
  ok(page.url().includes("/app"), "foi para o estúdio");
  ok(!page.url().includes("resultados="), "parâmetro limpo depois de importar");
  const n = await page.locator('[data-canvas="preview"] img').count();
  ok(n >= 1, `destaque no canvas (${n})`);
  await ctx.close();
}

await b.close();
console.log(falhas === 0 ? "\n=== TODOS OS TESTES PASSARAM ===" : `\n=== ${falhas} FALHA(S) ===`);
process.exit(falhas ? 1 : 0);
