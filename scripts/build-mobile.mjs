import { build } from "vite";
import { resolve } from "node:path";
import { rm, writeFile, mkdir } from "node:fs/promises";

const root = process.cwd();
const outDir = resolve(root, "dist-mobile");

// 1. Limpa o diretório de destino mobile
await rm(outDir, { recursive: true, force: true });
await mkdir(outDir, { recursive: true });

// 2. Cria o HTML de entrada idêntico ao modelo funcional
const entryHtml = `<!DOCTYPE html>
<html lang="pt-BR" class="dark">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no, viewport-fit=cover" />
    <meta name="theme-color" content="#0f172a" />
    <title>DubMarker</title>
  </head>
  <body class="bg-background text-foreground min-h-screen">
    <div id="root"></div>
    <script type="module" src="/src/entry-mobile.tsx"></script>
  </body>
</html>
`;

await writeFile(resolve(root, "index-mobile.html"), entryHtml, "utf8");

// 3. Cria o inicializador direto com createRoot
const entryTsx = `import React from "react";
import ReactDOM from "react-dom/client";
import { RouterProvider } from "@tanstack/react-router";
import { getRouter } from "./router";
import "./styles.css";

const router = getRouter();
const rootElement = document.getElementById("root");

if (rootElement) {
  const root = ReactDOM.createRoot(rootElement);
  root.render(
    <React.StrictMode>
      <RouterProvider router={router} />
    </React.StrictMode>
  );
}
`;

await writeFile(resolve(root, "src/entry-mobile.tsx"), entryTsx, "utf8");

// 4. Executa a compilação como SPA puro para o Capacitor
await build({
  root,
  configFile: false,
  build: {
    outDir,
    emptyOutDir: true,
    rollupOptions: {
      input: resolve(root, "index-mobile.html"),
    },
  },
  base: "./",
});

// 5. Remove os arquivos temporários da raiz
await rm(resolve(root, "index-mobile.html"), { force: true });
await rm(resolve(root, "src/entry-mobile.tsx"), { force: true });

console.log("Compilação nativa SPA concluída com sucesso para dist-mobile!");
