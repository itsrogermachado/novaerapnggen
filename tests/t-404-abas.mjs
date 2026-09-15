import { launch, openApp, PHONE, DESKTOP, profileFixture } from "./harness.mjs";
const b = await launch();
let falhas = 0;
const ok = (c, m) => {
  console.log((c ? "  ✓ " : "  ✗ ") + m);
  if (!c) falhas++;
};

const bgSvg = `<svg xmlns="http://www.w3.org/2000/svg" width="1080" height="1350"><rect width="1080" height="1350" fill="#1f2937"/></svg>`;
const mk = (n, nome) =>
  Array.from({ length: n }, (_, i) => ({
    id: `${nome}-${i}`,
    user_id: "u",
    name: `${nome} ${i}`,
    image_url: `data:image/svg+xml;base64,${Buffer.from(bgSvg).toString("base64")}`,
    created_at: new Date().toISOString(),
  }));

console.log("\n[mobile] 404 — deslogado");
{
  const { ctx, page } = await openApp(b, "/rota-que-nao-existe", {
    viewport: PHONE,
    loggedIn: false,
  });
  await page.waitForTimeout(700);
  ok(
    await page.getByRole("heading", { name: /Esta página não existe/i }).isVisible(),
    "título diz que a página não existe (e leitor de tela ouve 'Erro 404')",
  );
  ok(await page.getByText("404", { exact: true }).isVisible(), "404 grande no canvas vazio");
  ok(await page.getByText("1080 × 1350").isVisible(), "canvas no formato de feed");
  // Sem rolar: no celular o botão principal precisa aparecer já na primeira tela.
  const principal = await page.getByRole("link", { name: /Entrar na plataforma/i }).boundingBox();
  ok(
    principal && principal.y + principal.height <= 844,
    `botão principal visível sem rolar (y=${principal ? Math.round(principal.y) : "?"})`,
  );
  ok(await page.getByRole("link", { name: /Entrar na plataforma/i }).isVisible(), "oferece entrar");
  ok(
    (await page.getByRole("link", { name: /Voltar ao estúdio/i }).count()) === 0,
    "não oferece estúdio a quem não entrou",
  );
  ok(
    principal && principal.height >= 44,
    `alvo ${principal ? Math.round(principal.height) : "?"}px`,
  );
  ok(
    !(await page.locator("body").innerText()).includes("rota-que-nao-existe"),
    "não ecoa o endereço tentado",
  );
  await page.screenshot({ path: "s4-404-deslogado.png" });
  await ctx.close();
}

console.log("\n[mobile] 404 — logado");
{
  const { ctx, page } = await openApp(b, "/xyz", { viewport: PHONE });
  await page.waitForTimeout(900);
  ok(
    await page.getByRole("link", { name: /Voltar ao estúdio/i }).isVisible(),
    "oferece voltar ao estúdio",
  );
  ok(
    await page.getByRole("link", { name: /Ver resultados/i }).isVisible(),
    "oferece a aba de resultados",
  );
  ok(
    (await page.locator('nav[data-nav="mobile"]').count()) === 0,
    "sem barra de abas numa rota inexistente",
  );
  ok(
    (await page.getByRole("link", { name: /painel admin/i }).count()) === 0,
    "membro comum não vê atalho do painel admin",
  );
  await ctx.close();
}

console.log("\n[desktop] 404 — admin logado");
{
  const { ctx, page } = await openApp(b, "/xyz", {
    viewport: DESKTOP,
    profile: profileFixture({ is_admin: true }),
  });
  await page.waitForTimeout(1200);
  ok(
    await page.getByRole("link", { name: /painel admin/i }).isVisible(),
    "admin vê atalho do painel admin",
  );
  const canvas = await page.getByText("1080 × 1350").boundingBox();
  const titulo = await page.getByRole("heading", { name: /Esta página não existe/i }).boundingBox();
  ok(canvas && titulo && canvas.x > titulo.x, "no computador o canvas fica à direita do texto");
  await page.screenshot({ path: "s4-404-admin-desktop.png" });
  await ctx.close();
}

console.log("\n[mobile] painel de controles em abas");
{
  const { ctx, page } = await openApp(b, "/app", {
    viewport: PHONE,
    backgrounds: mk(12, "Fundo"),
    logos: mk(8, "Logo"),
  });
  await page.waitForTimeout(1200);
  for (const t of ["Fundos", "Logos", "Destaques", "Ajustes"]) {
    ok(await page.getByRole("tab", { name: t }).isVisible(), `aba ${t}`);
  }
  const bb = await page.getByRole("tab", { name: "Fundos" }).boundingBox();
  ok(bb && bb.height >= 44, `alvo da aba ${bb ? Math.round(bb.height) : "?"}px`);

  // só o conteúdo da aba ativa fica montado
  ok(await page.getByText("Biblioteca de Fundos").isVisible(), "Fundos é a aba inicial");
  ok((await page.getByText("Biblioteca de Logos").count()) === 0, "Logos não fica montada junto");

  await page.getByRole("tab", { name: "Logos" }).click();
  await page.waitForTimeout(400);
  ok(await page.getByText("Biblioteca de Logos").isVisible(), "troca para Logos");

  await page.getByRole("tab", { name: "Ajustes" }).click();
  await page.waitForTimeout(400);
  ok(await page.getByText("Composição Rápida").isVisible(), "Ajustes traz os randomizadores");
  await page.screenshot({ path: "s4-abas.png" });
  await ctx.close();
}

console.log("\n[mobile] biblioteca rola na horizontal, não dentro da página");
{
  const { ctx, page } = await openApp(b, "/app", { viewport: PHONE, backgrounds: mk(12, "Fundo") });
  await page.waitForTimeout(1200);
  const faixa = page.locator('[class*="snap-x"]').first();
  ok((await faixa.count()) > 0, "faixa com snap horizontal existe");
  const m = await faixa.evaluate((el) => ({
    x: el.scrollWidth > el.clientWidth,
    y: el.scrollHeight > el.clientHeight,
  }));
  ok(m.x && !m.y, `rola na horizontal (x=${m.x}) e não na vertical (y=${m.y})`);
  await ctx.close();
}

await b.close();
console.log(falhas === 0 ? "\n=== TODOS OS TESTES PASSARAM ===" : `\n=== ${falhas} FALHA(S) ===`);
process.exit(falhas ? 1 : 0);
