import { cp, mkdir, readdir, rm, writeFile, readFile } from "node:fs/promises";
import { resolve } from "node:path";

const root = process.cwd();
const clientDir = resolve(root, ".output/public");
const outDir = resolve(root, "dist-mobile");

// 1. Limpa e copia a pasta compilada
await rm(outDir, { recursive: true, force: true });
await mkdir(outDir, { recursive: true });
await cp(clientDir, outDir, { recursive: true });

// 2. Identifica todos os arquivos gerados
const assetsDir = resolve(outDir, "assets");
const assets = await readdir(assetsDir);
const jsFiles = assets.filter((f) => f.endsWith(".js"));
const cssFiles = assets.filter((f) => f.endsWith(".css"));

// Localiza os bundles principais
const mainJs = jsFiles.find((f) => f.startsWith("index-") || f.startsWith("routes-")) || jsFiles[0];
const otherScripts = jsFiles.filter((f) => f !== mainJs);

// 3. Monta o index.html com fallback de inicialização e desbloqueio visual
const html = `<!DOCTYPE html>
<html lang="pt-BR" class="dark">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no, viewport-fit=cover" />
    <meta name="theme-color" content="#0f172a" />
    <title>DubMarker</title>
    <link rel="icon" href="./favicon.png" />
${cssFiles.map((f) => `    <link rel="stylesheet" href="./assets/${f}" />`).join("\n")}
    <style>
      html, body, #root {
        width: 100%;
        height: 100%;
        margin: 0;
        padding: 0;
        background-color: #0f172a;
      }
    </style>
  </head>
  <body class="bg-background text-foreground min-h-screen">
    <div id="root"></div>
${otherScripts.map((f) => `    <script type="module" crossorigin src="./assets/${f}"></script>`).join("\n")}
    <script type="module" crossorigin src="./assets/${mainJs}"></script>
    <script type="module">
      // Força a remoção de qualquer travamento de Splash e garante montagem
      window.addEventListener('load', () => {
        setTimeout(() => {
          if (window.Capacitor && window.Capacitor.Plugins && window.Capacitor.Plugins.SplashScreen) {
            window.Capacitor.Plugins.SplashScreen.hide();
          }
        }, 300);
      });
    </script>
  </body>
</html>
`;

await writeFile(resolve(outDir, "index.html"), html, "utf8");

try {
  await rm(resolve(outDir, "sw.js"), { force: true });
} catch {}

console.log("dist-mobile gerado com sucesso e tela inicial desbloqueada!");
