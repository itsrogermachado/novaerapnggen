import { launch, openApp, PHONE, signalsFixture } from "./harness.mjs";
const b = await launch();
let falhas = 0;
const ok = (c, m) => {
  console.log((c ? "  ✓ " : "  ✗ ") + m);
  if (!c) falhas++;
};

console.log("\n[mobile] 75 resultados num dia — paginação");
{
  const muitos = signalsFixture(75);
  const { ctx, page, erros } = await openApp(b, "/resultados", {
    viewport: PHONE,
    signals: muitos,
  });
  await page.waitForTimeout(900);

  let n = await page.locator("main img[alt='Resultado']").count();
  ok(n === 30, `primeira página traz 30 (achei ${n})`);
  ok(await page.getByText(/^30\+/).isVisible(), 'contador mostra "30+" e não engana');

  const btn = page.getByRole("button", { name: "Carregar mais" });
  ok(await btn.isVisible(), "botão Carregar mais presente");
  const box = await btn.boundingBox();
  ok(box && box.height >= 44, `alvo do botão ${box ? Math.round(box.height) : "?"}px`);

  await btn.click();
  await page.waitForTimeout(900);
  n = await page.locator("main img[alt='Resultado']").count();
  ok(n === 60, `segunda página acumula 60 (achei ${n})`);

  await page.getByRole("button", { name: "Carregar mais" }).click();
  await page.waitForTimeout(900);
  n = await page.locator("main img[alt='Resultado']").count();
  ok(n === 75, `terceira página fecha em 75 (achei ${n})`);
  ok(
    (await page.getByRole("button", { name: "Carregar mais" }).count()) === 0,
    "botão some no fim da lista",
  );
  ok(await page.getByText("75 resultados").isVisible(), "contador final sem o +");

  const reais = erros.filter((e) => !e.includes("ERR_CONNECTION_RESET") && !e.includes("404"));
  ok(reais.length === 0, "sem erro de console " + JSON.stringify(reais.slice(0, 2)));
  await page.screenshot({ path: "s3-paginacao.png" });
  await ctx.close();
}

console.log("\n[mobile] lista curta não mostra o botão");
{
  const { ctx, page } = await openApp(b, "/resultados", {
    viewport: PHONE,
    signals: signalsFixture(5),
  });
  await page.waitForTimeout(800);
  ok(
    (await page.getByRole("button", { name: "Carregar mais" }).count()) === 0,
    "sem botão com 5 resultados",
  );
  ok(await page.getByText("5 resultados").isVisible(), "contador exato");
  await ctx.close();
}

await b.close();
console.log(falhas === 0 ? "\n=== TODOS OS TESTES PASSARAM ===" : `\n=== ${falhas} FALHA(S) ===`);
process.exit(falhas ? 1 : 0);
