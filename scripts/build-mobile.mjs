import { cp, mkdir, readdir, rm, writeFile } from "node:fs/promises";
import { resolve } from "node:path";

const root = process.cwd();
const clientDir = resolve(root, ".output/public");
const outDir = resolve(root, "dist-mobile");

// 1. Limpa e copia a pasta compilada pelo build padrão
await rm(outDir, { recursive: true, force: true });
await mkdir(outDir, { recursive: true });
await cp(clientDir, outDir, { recursive: true });

// 2. Identifica os arquivos CSS e JS gerados
const assetsDir = resolve(outDir, "assets");
const assets = await readdir(assetsDir);
const jsFiles = assets.filter((f) => f.endsWith(".js"));
const cssFiles = assets.filter((f) => f.endsWith(".css"));

// Identifica o arquivo de rotas/entrada e os demais scripts
const routesJs = jsFiles.find((f) => f.startsWith("routes-")) || jsFiles[0];
const otherScripts = jsFiles.filter((f) => f !== routesJs);

// 3. Monta o index.html conectando todos os módulos e inicializando a rota raiz
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
${otherScripts.map((f) => `    <script type="module" crossorigin src="./assets/${f}"></script>`).join("\n")}
    <script type="module" crossorigin src="./assets/${routesJs}"></script>
  </body>
</html>
`;

await writeFile(resolve(outDir, "index.html"), html, "utf8");

try {
  await rm(resolve(outDir, "sw.js"), { force: true });
} catch {}

console.log("dist-mobile gerado com sucesso com todos os assets compilados!");
