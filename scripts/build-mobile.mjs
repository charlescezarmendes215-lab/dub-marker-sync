import { cp, mkdir, readdir, rm, writeFile } from "node:fs/promises";
import { resolve } from "node:path";

const root = process.cwd();
const clientDir = resolve(root, ".output/public");
const outDir = resolve(root, "dist-mobile");

// 1. Limpa e recria a pasta dist-mobile
await rm(outDir, { recursive: true, force: true });
await mkdir(outDir, { recursive: true });
await cp(clientDir, outDir, { recursive: true });

// 2. Lê os arquivos compilados
const assetsDir = resolve(outDir, "assets");
const assets = await readdir(assetsDir);
const jsFiles = assets.filter((f) => f.endsWith(".js"));
const cssFiles = assets.filter((f) => f.endsWith(".css"));

// Identifica os bundles principais
const mainJs = jsFiles.find((f) => f.startsWith("index-")) || jsFiles[0];
const otherJs = jsFiles.filter((f) => f !== mainJs);

// 3. Monta o index.html com todos os bundles e script de montagem
const html = `<!DOCTYPE html>
<html lang="pt-BR" class="dark">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no, viewport-fit=cover" />
    <meta name="theme-color" content="#0f172a" />
    <title>DubMarker</title>
    <link rel="icon" href="./favicon.png" />
${cssFiles.map((f) => `    <link rel="stylesheet" href="./assets/${f}" />`).join("\n")}
  </head>
  <body class="bg-background text-foreground min-h-screen">
    <div id="root"></div>
${otherJs.map((f) => `    <script type="module" src="./assets/${f}"></script>`).join("\n")}
    <script type="module" src="./assets/${mainJs}"></script>
    <script type="module">
      // Gatilho de fallback para garantir inicialização no WebView do Android
      window.addEventListener('DOMContentLoaded', () => {
        const rootEl = document.getElementById('root');
        if (rootEl && rootEl.childElementCount === 0) {
          import('./assets/${mainJs}').then((mod) => {
            if (mod && typeof mod.render === 'function') mod.render();
            if (mod && typeof mod.hydrate === 'function') mod.hydrate();
          }).catch(console.error);
        }
      });
    </script>
  </body>
</html>
`;

await writeFile(resolve(outDir, "index.html"), html, "utf8");

try {
  await rm(resolve(outDir, "sw.js"), { force: true });
} catch {}

console.log("dist-mobile gerado com sucesso com todos os bundles conectados!");
