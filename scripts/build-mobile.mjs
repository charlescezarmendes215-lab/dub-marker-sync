import { cp, mkdir, readdir, rm, writeFile } from "node:fs/promises";
import { resolve } from "node:path";

const root = process.cwd();
const clientDir = resolve(root, ".output/public");
const outDir = resolve(root, "dist-mobile");

await rm(outDir, { recursive: true, force: true });
await mkdir(outDir, { recursive: true });
await cp(clientDir, outDir, { recursive: true });

const assets = await readdir(resolve(outDir, "assets"));
const jsFiles = assets.filter((f) => f.endsWith(".js"));
const cssFiles = assets.filter((f) => f.endsWith(".css"));

// Identifica os bundles gerados
const mainJs = jsFiles.find((f) => f.startsWith("index-") || f.startsWith("start-") || f.startsWith("routes-")) || jsFiles[0];

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
  <body class="bg-background text-foreground">
    <div id="root"></div>
${jsFiles.map((f) => `    <script type="module" src="./assets/${f}"></script>`).join("\n")}
  </body>
</html>
`;

await writeFile(resolve(outDir, "index.html"), html, "utf8");

try {
  await rm(resolve(outDir, "sw.js"), { force: true });
} catch {}

console.log("dist-mobile compilado com sucesso com carregamento de todos os bundles para o Capacitor!");
