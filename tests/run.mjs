/**
 * Roda toda a suíte de navegador e devolve exit != 0 se algo falhar.
 *   npm run test:e2e   (com o dev server já de pé em :5199)
 */
import { spawn } from "node:child_process";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const aqui = dirname(fileURLToPath(import.meta.url));
const arquivos = [
  "t-fase1",
  "t-fase2",
  "t-resultados",
  "t-paginacao",
  "t-mobile",
  "t-404-abas",
  "t-senha",
];

let falhas = 0;
for (const nome of arquivos) {
  const codigo = await new Promise((resolve) => {
    const p = spawn(process.execPath, [join(aqui, `${nome}.mjs`)], { stdio: "inherit" });
    p.on("close", resolve);
  });
  if (codigo !== 0) falhas++;
}

console.log(falhas === 0 ? "\n✓ suíte completa passou" : `\n✗ ${falhas} arquivo(s) com falha`);
process.exit(falhas ? 1 : 0);
