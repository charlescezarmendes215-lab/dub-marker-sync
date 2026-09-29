import { cp, mkdir, rm, access } from "node:fs/promises";
import { resolve } from "node:path";

const root = process.cwd();
const clientDir = resolve(root, ".output/public");
const outDir = resolve(root, "dist-mobile");

await rm(outDir, { recursive: true, force: true });
await mkdir(outDir, { recursive: true });
await cp(clientDir, outDir, { recursive: true });

// O index.html vem do shell SPA gerado pelo TanStack Start (MOBILE_BUILD=1),
// que contém os scripts de hidratação corretos — sem ele o app fica em tela azul.
await access(resolve(outDir, "index.html"));
await rm(resolve(outDir, "sw.js"), { force: true });
await rm(resolve(outDir, "_shell.html"), { force: true });

console.log("dist-mobile gerado com sucesso!");
