import { cp, mkdir, readdir, rm, writeFile } from "node:fs/promises";
import { resolve } from "node:path";

const root = process.cwd();
const clientDir = resolve(root, ".output/public");
const outDir = resolve(root, "dist-mobile");

await rm(outDir, { recursive: true, force: true });
await mkdir(outDir, { recursive: true });
await cp(clientDir, outDir, { recursive: true });

const assets = await readdir(resolve(outDir, "assets"));
const entry = assets.find((f) => /^index-.*\.js$/.test(f) || /^web-.*\.js$/.test(f));
const css = assets.filter((f) => f.endsWith(".css"));

const html = `<!DOCTYPE html>
<html lang="pt-BR" class="dark">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0, viewport-fit=cover" />
    <meta name="theme-color" content="#0f172a" />
    <title>DubMarker</title>
    <link rel="icon" href="./favicon.png" />
${css.map((f) => `    <link rel="stylesheet" href="./assets/${f}" />`).join("\n")}
    <script type="module" src="./assets/${entry}"></script>
  </head>
  <body>
    <div id="root"></div>
  </body>
</html>
`;

await writeFile(resolve(outDir, "index.html"), html, "utf8");
try {
  await rm(resolve(outDir, "sw.js"), { force: true });
} catch {}

console.log(`dist-mobile pronto com sucesso (entry: ${entry})`);
