// Testes da tela "Criar nova senha" (link de "Esqueci minha senha") e do mínimo de senha no cadastro.
import { launch, openApp, PHONE } from "./harness.mjs";
const b = await launch();
let falhas = 0;
const ok = (c, m) => {
  console.log((c ? "  ✓ " : "  ✗ ") + m);
  if (!c) falhas++;
};

console.log("\n[mobile] chegou pelo link do e-mail (logado)");
{
  const { ctx, page } = await openApp(b, "/auth?novaSenha=1", { viewport: PHONE });
  await page.waitForTimeout(1000);
  ok(page.url().includes("/auth"), "não foi mandado direto para o estúdio");
  ok(
    await page.getByRole("heading", { name: "Criar nova senha" }).isVisible(),
    "mostra o formulário de senha nova",
  );

  // Senha curta: o próprio campo barra o envio (minLength 8), sem sair da tela.
  await page.getByLabel("Nova senha").fill("abc12");
  await page.getByLabel("Confirmar senha").fill("abc12");
  await page.getByRole("button", { name: "Salvar nova senha" }).click();
  await page.waitForTimeout(400);
  ok(
    await page.getByLabel("Nova senha").evaluate((el) => el.validity.tooShort),
    "senha com menos de 8 caracteres é recusada pelo campo",
  );
  ok(page.url().includes("/auth"), "senha curta não sai da tela");

  // Senhas diferentes: avisa e não sai da tela.
  await page.getByLabel("Nova senha").fill("senhaNova123");
  await page.getByLabel("Confirmar senha").fill("outraCoisa99");
  await page.getByRole("button", { name: "Salvar nova senha" }).click();
  await page.waitForTimeout(500);
  ok(await page.getByText("As duas senhas não são iguais.").isVisible(), "avisa senhas diferentes");
  ok(page.url().includes("/auth"), "continua na tela depois do erro");

  // Senhas iguais: grava e leva para o estúdio.
  await page.getByLabel("Confirmar senha").fill("senhaNova123");
  await page.getByRole("button", { name: "Salvar nova senha" }).click();
  await page.waitForURL("**/app", { timeout: 5000 }).catch(() => {});
  ok(page.url().includes("/app"), "depois de salvar, vai para o estúdio");
  await ctx.close();
}

console.log("\n[mobile] link vencido (sem sessão)");
{
  const { ctx, page } = await openApp(b, "/auth?novaSenha=1", { viewport: PHONE, loggedIn: false });
  await page.waitForTimeout(800);
  ok(
    await page.getByRole("heading", { name: "Link expirado" }).isVisible(),
    "explica que o link venceu",
  );
  await page.getByRole("button", { name: "Voltar ao login" }).click();
  await page.waitForTimeout(500);
  ok(await page.getByRole("button", { name: "Entrar" }).isVisible(), "volta para o login normal");
  ok(!page.url().includes("novaSenha"), "tira a marca do endereço");
  await ctx.close();
}

console.log("\n[mobile] cadastro exige 8 caracteres");
{
  const { ctx, page } = await openApp(b, "/auth", { viewport: PHONE, loggedIn: false });
  await page.waitForTimeout(700);
  ok(
    (await page.getByLabel("Senha").getAttribute("minlength")) === "6",
    "login aceita senha antiga de 6",
  );
  await page.getByRole("button", { name: /Cadastre-se/ }).click();
  await page.waitForTimeout(300);
  ok(
    (await page.getByLabel("Senha").getAttribute("minlength")) === "8",
    "cadastro pede no mínimo 8",
  );
  await ctx.close();
}

await b.close();
console.log(falhas === 0 ? "\n=== TODOS OS TESTES PASSARAM ===" : `\n=== ${falhas} FALHA(S) ===`);
process.exit(falhas ? 1 : 0);
