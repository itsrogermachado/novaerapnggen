// Testes do escritor de .zip (src/lib/zip.ts). Só lógica pura: nada de navegador.
// Rodar com: npm run test:unit
//
// A conferência final não é feita pelo nosso próprio código: o arquivo é gravado
// no disco e lido pelo `zipfile` do Python, que é uma implementação
// independente. Um zip que só o nosso leitor entende não serve de nada — o que
// importa é abrir no Windows, no celular e no descompactador de quem recebe.
import { test } from "node:test";
import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { mkdtempSync, writeFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { createHash } from "node:crypto";
import { crc32, criarZip, ZipGrandeDemaisError } from "../src/lib/zip.ts";

const texto = (s) => new TextEncoder().encode(s);

test("crc32 bate com os valores de referência do padrão", () => {
  assert.equal(crc32(texto("")), 0);
  // Vetor clássico do CRC-32: "123456789" -> 0xCBF43926.
  assert.equal(crc32(texto("123456789")), 0xcbf43926);
  assert.equal(crc32(texto("Nova Era")) >>> 0, crc32(texto("Nova Era")));
});

test("crc32 em pedaços dá o mesmo que de uma vez", () => {
  const todo = texto("resultado do dia 17, com acento: ação");
  const inteiro = crc32(todo);
  const emPartes = crc32(todo.slice(7), crc32(todo.slice(0, 7)));
  assert.equal(emPartes, inteiro);
});

/**
 * Grava o zip e devolve o que o Python enxerga dentro dele.
 *
 * O conteúdo sai como texto só quando pedido: um arquivo binário grande
 * estourava o buffer de saída do processo. Para esses, o que vale é o `sha256`.
 */
function lerComPython(blobBytes, { comTexto = true } = {}) {
  const pasta = mkdtempSync(join(tmpdir(), "zip-teste-"));
  const arquivo = join(pasta, "lote.zip");
  try {
    writeFileSync(arquivo, blobBytes);
    const script = `
import hashlib, json, zipfile
with zipfile.ZipFile(${JSON.stringify(arquivo)}) as z:
    nomes = z.namelist()
    # testzip() confere o CRC de cada arquivo e devolve o primeiro quebrado.
    saida = {
        "quebrado": z.testzip(),
        "nomes": nomes,
        "metodos": [i.compress_type for i in z.infolist()],
        "datas": [list(i.date_time) for i in z.infolist()],
        "tamanhos": [i.file_size for i in z.infolist()],
        "hashes": [hashlib.sha256(z.read(n)).hexdigest() for n in nomes],
    }
    if ${comTexto ? "True" : "False"}:
        saida["conteudos"] = [z.read(n).decode("utf-8", "replace") for n in nomes]
    print(json.dumps(saida))
`;
    return JSON.parse(execFileSync("python3", ["-c", script], { encoding: "utf-8" }));
  } finally {
    rmSync(pasta, { recursive: true, force: true });
  }
}

async function bytesDo(blob) {
  return Buffer.from(await blob.arrayBuffer());
}

test("o .zip abre em outro programa, com nomes e conteúdos certos", async () => {
  const zip = await criarZip([
    { nome: "primeiro.txt", dados: new Blob(["um"]) },
    { nome: "segundo.txt", dados: new Blob(["dois dois dois"]) },
  ]);

  assert.equal(zip.type, "application/zip");
  const visto = lerComPython(await bytesDo(zip));

  assert.equal(visto.quebrado, null, "nenhum arquivo com CRC errado");
  assert.deepEqual(visto.nomes, ["primeiro.txt", "segundo.txt"]);
  assert.deepEqual(visto.conteudos, ["um", "dois dois dois"]);
  // 0 = armazenado sem compressão, que é o combinado.
  assert.deepEqual(visto.metodos, [0, 0]);
});

test("nome com acento sai legível do outro lado", async () => {
  const zip = await criarZip([
    { nome: "nova-era_resultados_da-manhã.txt", dados: new Blob(["ação"]) },
  ]);
  const visto = lerComPython(await bytesDo(zip));
  assert.deepEqual(visto.nomes, ["nova-era_resultados_da-manhã.txt"]);
  assert.deepEqual(visto.conteudos, ["ação"]);
});

test("a data de cada arquivo é a que foi passada", async () => {
  const quando = new Date(2026, 8, 17, 14, 32, 10); // 17/09/2026 14:32:10
  const zip = await criarZip([{ nome: "a.txt", dados: new Blob(["x"]), data: quando }]);
  const visto = lerComPython(await bytesDo(zip));
  // O zip guarda o segundo em passos de 2 — 10 continua 10.
  assert.deepEqual(visto.datas[0], [2026, 9, 17, 14, 32, 10]);
});

test("arquivo vazio e arquivo grande passam byte a byte", async () => {
  // Maior que o pedaço de 4 MB com que o CRC é calculado, para o encadeamento
  // dos pedaços ser exercitado de verdade.
  const grande = new Uint8Array(5 * 1024 * 1024);
  for (let i = 0; i < grande.length; i++) grande[i] = (i * 7) % 251;

  const zip = await criarZip([
    { nome: "vazio.bin", dados: new Blob([]) },
    { nome: "grande.bin", dados: new Blob([grande]) },
  ]);
  const bytes = await bytesDo(zip);
  const visto = lerComPython(bytes, { comTexto: false });

  assert.equal(visto.quebrado, null, "nenhum arquivo com CRC errado");
  assert.deepEqual(visto.nomes, ["vazio.bin", "grande.bin"]);
  assert.deepEqual(visto.tamanhos, [0, grande.length]);
  assert.equal(
    visto.hashes[1],
    createHash("sha256").update(grande).digest("hex"),
    "o arquivo grande sai idêntico ao que entrou",
  );
});

test("zip sem nenhum arquivo ainda é um zip válido", async () => {
  const zip = await criarZip([]);
  const visto = lerComPython(await bytesDo(zip));
  assert.deepEqual(visto.nomes, []);
});

test("barra invertida no nome vira barra normal", async () => {
  const zip = await criarZip([{ nome: "pasta\\arquivo.txt", dados: new Blob(["ok"]) }]);
  const visto = lerComPython(await bytesDo(zip));
  assert.deepEqual(visto.nomes, ["pasta/arquivo.txt"]);
});

test("recusa mais arquivos do que o formato aguenta", async () => {
  const demais = new Array(0x10000).fill(null).map((_, i) => ({
    nome: `${i}.txt`,
    dados: new Blob(["x"]),
  }));
  await assert.rejects(() => criarZip(demais), ZipGrandeDemaisError);
});
