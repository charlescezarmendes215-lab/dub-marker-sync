// Gera a pasta estática "dist-mobile" (SPA) usada pelo Capacitor a partir do
// build web (.output/public). O app é 100% client-side, então basta um index.html
// que carregue o bundle do cliente.
import { cp, mkdir, readdir, rm, writeFile } from "node:fs/promises";
import { resolve } from "node:path";

const root = process.cwd();
const clientDir = resolve(root, ".output/public");
const outDir = resolve(root, "dist-mobile");

const assets = await readdir(resolve(clientDir, "assets"));
const entry = assets.find((f) => /^index-.*\.js$/.test(f));
const css = assets.filter((f) => f.endsWith(".css"));

if (!entry) {
  throw new Error("Bundle de entrada não encontrado em .output/public/assets");
}

await rm(outDir, { recursive: true, force: true });
await mkdir(outDir, { recursive: true });
await cp(clientDir, outDir, { recursive: true });

const html = `<!DOCTYPE html>
<html lang="pt-BR" class="dark">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0, viewport-fit=cover" />
    <meta name="theme-color" content="#0f172a" />
    <title>DubMarker</title>
    <link rel="icon" href="/favicon.png" />
${css.map((f) => `    <link rel="stylesheet" href="/assets/${f}" />`).join("\n")}
    <script type="module" src="/assets/${entry}"></script>
  </head>
  <body></body>
</html>
`;

await writeFile(resolve(outDir, "index.html"), html, "utf8");
// O service worker do PWA não é necessário dentro do app nativo.
await rm(resolve(outDir, "sw.js"), { force: true });

console.log(`dist-mobile pronto (entry: ${entry})`);
