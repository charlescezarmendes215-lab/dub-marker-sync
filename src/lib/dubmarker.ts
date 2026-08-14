import * as XLSX from "xlsx";

export type Dialogue = {
  episode: number;
  index: number;
  character: string;
  text: string;
  start: string; // 00:00:00,000
  end: string;
};

export type ActorEntry = {
  actor: string;
  characters: string[];
  lines: number;
};

export type Workbook = {
  dialogues: Dialogue[];
  actors: ActorEntry[];
  videoLinks: Record<number, string>;
  charToActor: Record<string, string>;
};

const norm = (s: unknown) => String(s ?? "").trim();
const key = (s: string) => s.toLowerCase().replace(/[\s._-]+/g, "");

function pick(row: Record<string, unknown>, names: string[]): string {
  for (const n of names) {
    for (const k of Object.keys(row)) {
      if (key(k) === key(n)) {
        const v = norm(row[k]);
        if (v) return v;
      }
    }
  }
  return "";
}

function padTime(t: string): string {
  let v = norm(t).replace(/\./g, ",");
  const m = v.match(/^(\d{1,2}):(\d{2}):(\d{2})(?:,(\d{1,3}))?$/);
  if (m) {
    const ms = (m[4] ?? "0").padEnd(3, "0");
    return `${(m[1] ?? "0").padStart(2, "0")}:${m[2] ?? "00"}:${m[3] ?? "00"},${ms}`;
  }
  const m2 = v.match(/^(\d{1,2}):(\d{2})(?:,(\d{1,3}))?$/);
  if (m2) return `00:${(m2[1] ?? "0").padStart(2, "0")}:${m2[2] ?? "00"},${(m2[3] ?? "0").padEnd(3, "0")}`;
  return "00:00:00,000";
}

export function toMs(t: string): number {
  const m = t.match(/^(\d{2}):(\d{2}):(\d{2}),(\d{3})$/);
  if (!m) return 0;
  return +(m[1] ?? 0) * 3600000 + +(m[2] ?? 0) * 60000 + +(m[3] ?? 0) * 1000 + +(m[4] ?? 0);
}

export function fromMs(ms: number): string {
  const v = Math.max(0, Math.round(ms));
  const h = Math.floor(v / 3600000);
  const mn = Math.floor((v % 3600000) / 60000);
  const s = Math.floor((v % 60000) / 1000);
  const msec = v % 1000;
  return `${String(h).padStart(2, "0")}:${String(mn).padStart(2, "0")}:${String(s).padStart(2, "0")},${String(msec).padStart(3, "0")}`;
}

export function parseWorkbook(data: ArrayBuffer): Workbook {
  const wb = XLSX.read(data, { type: "array" });
  
  const findSheet = (patterns: RegExp[]) => 
    wb.SheetNames.find((n) => patterns.some((p) => p.test(n)));

  const rowsOf = (name: string) => {
    const ws = name ? wb.Sheets[name] : undefined;
    if (!ws) return [] as Record<string, unknown>[];
    return XLSX.utils.sheet_to_json(ws, { defval: "" }) as Record<string, unknown>[];
  };

  const charToActor: Record<string, string> = {};
  const actorMap = new Map<string, { characters: Set<string>; lines: number }>();

  // Busca flexível por abas de dubladores/personagens
  const charSheetName = findSheet([/character/i, /personag/i, /actor/i, /dublador/i, /elenco/i, /lista/i]);

  if (charSheetName) {
    for (const row of rowsOf(charSheetName)) {
      const role = pick(row, ["Labeled Role", "Role-EN", "Role", "Character", "Personagem", "Papel", "Nome"]);
      const actor = pick(row, ["Voice Actor", "VA", "Dublador", "Ator", "Voz"]);
      const lines = Number(pick(row, ["Number of Lines", "台词数", "Linhas", "Falas", "Total"]));
      
      const effectiveActor = actor || role; // Se não houver coluna de dublador, usa o nome do personagem
      if (!role) continue;

      charToActor[role] = effectiveActor;
      const e = actorMap.get(effectiveActor) ?? { characters: new Set<string>(), lines: 0 };
      e.characters.add(role);
      e.lines += Number.isFinite(lines) ? lines : 0;
      actorMap.set(effectiveActor, e);
    }
  }

  // Leitura das abas de diálogo / falas
  const dialogues: Dialogue[] = [];
  const dialogueSheets = wb.SheetNames.filter((n) => /dialogue|falas|script|legenda|episod/i.test(n));
  const targetSheets = dialogueSheets.length > 0 ? dialogueSheets : wb.SheetNames;

  for (const sn of targetSheets) {
    // Pula a aba de personagens para não ler como fala
    if (charSheetName && key(sn) === key(charSheetName)) continue;

    for (const row of rowsOf(sn)) {
      const character = pick(row, ["Labeled Role", "Labeled Role-EN", "Role", "Character", "Personagem", "Papel", "Nome"]);
      if (!character) continue;

      const actor = pick(row, ["Voice Actor", "VA", "Dublador", "Ator"]);
      if (actor) {
        charToActor[character] = actor;
      }

      const tc = pick(row, ["Timecode", "Time Code", "Tempo"]);
      let start = "";
      let end = "";
      if (tc.includes("-->")) {
        const parts = tc.split("-->");
        start = padTime(parts[0] ?? "");
        end = padTime(parts[1] ?? "");
      } else {
        start = padTime(pick(row, ["Start Timecode", "Start", "Inicio", "In", "Início"]));
        end = padTime(pick(row, ["End Timecode", "End", "Fim", "Out"]));
      }
      if (toMs(end) <= toMs(start)) end = fromMs(toMs(start) + 1000);
      const ep = Number(pick(row, ["Episode No.", "Episode", "Episodio", "Ep", "Episódio"]));
      
      dialogues.push({
        episode: Number.isFinite(ep) ? ep : 0,
        index: Number(pick(row, ["Subtitle Index", "Index", "ID", "Nº"])) || dialogues.length + 1,
        character,
        text: pick(row, ["Translated Text", "Source Text", "Text", "Texto", "Fala"]),
        start,
        end,
      });

      // Se a aba de personagens não existia, cria a lista dinamicamente com os personagens encontrados nas falas
      const effectiveActor = actor || charToActor[character] || character;
      const e = actorMap.get(effectiveActor) ?? { characters: new Set<string>(), lines: 0 };
      e.characters.add(character);
      actorMap.set(effectiveActor, e);
    }
  }

  // Recalcula o total exato de falas por dublador
  const counts = new Map<string, number>();
  for (const d of dialogues) counts.set(d.character, (counts.get(d.character) ?? 0) + 1);

  for (const [actor, e] of actorMap) {
    const real = [...e.characters].reduce((n, c) => n + (counts.get(c) ?? 0), 0);
    e.lines = real;
  }

  // Links de Vídeo
  const videoLinks: Record<number, string> = {};
  const vlSheet = wb.SheetNames.find((n) => /video.*download|links|videos/i.test(n));
  const ws = vlSheet ? wb.Sheets[vlSheet] : undefined;
  if (ws && ws["!ref"]) {
    const range = XLSX.utils.decode_range(ws["!ref"]);
    for (let r = range.s.r; r <= range.e.r; r++) {
      let ep = 0;
      let link = "";
      for (let c = range.s.c; c <= range.e.c; c++) {
        const cell = ws[XLSX.utils.encode_cell({ r, c })] as { v?: unknown; r?: unknown; l?: { Target?: string } } | undefined;
        if (!cell) continue;
        const target = cell.l?.Target ?? "";
        const value = norm(cell.v);
        const rich = String(cell.r ?? "").match(/https?:\/\/[^\s]+/)?.[0] ?? "";
        if (/^https?:\/\//i.test(target)) link = target;
        else if (/^https?:\/\//i.test(value)) link = value;
        else if (rich) link = rich;
        else if (!ep && /^\d+$/.test(value)) ep = Number(value);
      }
      if (ep && link) videoLinks[ep] = link;
    }
  }

  const actors: ActorEntry[] = [...actorMap.entries()]
    .filter(([_, e]) => e.lines > 0) // Remove entradas sem nenhuma fala
    .map(([actor, e]) => ({ actor, characters: [...e.characters], lines: e.lines }))
    .sort((a, b) => b.lines - a.lines);

  return { dialogues, actors, videoLinks, charToActor };
}

/** Strict: apenas diálogos pertencentes aos personagens do dublador selecionado */
export function filterDialogues(all: Dialogue[], characters: string[]): Dialogue[] {
  const set = new Set(characters.map((c) => c.trim().toLowerCase()));
  return all
    .filter((d) => d && d.character && set.has(d.character.trim().toLowerCase()))
    .sort((a, b) => a.episode - b.episode || toMs(a.start) - toMs(b.start) || toMs(a.end) - toMs(b.end));
}

/** Clean marker SRT: gera o arquivo com apenas os marcadores do dublador selecionado */
export function buildSrt(lines: Dialogue[]): string {
  const sorted = lines
    .filter((l) => l && l.character && l.start && l.end && toMs(l.end) > toMs(l.start))
    .sort((a, b) => toMs(a.start) - toMs(b.start) || toMs(a.end) - toMs(b.end));

  const clean: Dialogue[] = [];
  for (const line of sorted) {
    const previous = clean[clean.length - 1];
    if (!previous) {
      clean.push({ ...line });
      continue;
    }

    const sameCharacter = previous.character.trim().toLowerCase() === line.character.trim().toLowerCase();
    const overlaps = toMs(line.start) <= toMs(previous.end);

    if (sameCharacter && overlaps) {
      if (toMs(line.end) > toMs(previous.end)) {
        previous.end = line.end;
      }
    } else if (!overlaps) {
      clean.push({ ...line });
    }
  }

  const blocks = clean.map(
    (line, i) => `${i + 1}\n${line.start} --> ${line.end}\n \n`
  );

  if (blocks.length === 0) return "1\n00:00:00,000 --> 00:00:01,000\n \n";
  return blocks.join("\n");
}

export function srtDataUri(content: string): string {
  const safe = content && content.trim().length > 0 ? content : "1\n00:00:00,000 --> 00:00:01,000\n \n";
  const b64 = btoa(unescape(encodeURIComponent(safe)));
  return `data:application/x-subrip;base64,${b64}`;
}

export function textDataUri(content: string, mime = "text/plain"): string {
  return `data:${mime};base64,${btoa(unescape(encodeURIComponent(content)))}`;
}

/** Salva pela pasta pública Downloads no app Android nativo (Capacitor). */
async function nativeSave(content: string, filename: string): Promise<boolean> {
  try {
    const mod = await import("./native-save");
    if (!mod.isNative()) return false;
    await mod.saveToDownloads(content, filename);
    return true;
  } catch {
    return false;
  }
}

/** Força o download real do arquivo para a pasta pública "Downloads" (Android/PWA). */
export function downloadFile(content: string, filename: string, mime: string): void {
  const name = filename.replace(/[\\/:*?"<>|]+/g, "_");
  const blob = new Blob([content], { type: mime });

  void nativeSave(content, name).then((done) => {
    if (done) return;
    webDownload(blob, name);
  });
}

function webDownload(blob: Blob, name: string): void {
  const nav = navigator as Navigator & { msSaveOrOpenBlob?: (b: Blob, n: string) => void };
  if (typeof nav.msSaveOrOpenBlob === "function") {
    nav.msSaveOrOpenBlob(blob, name);
    return;
  }


  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = name;
  a.rel = "noopener";
  a.style.display = "none";
  document.body.appendChild(a);
  a.click();
  setTimeout(() => {
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }, 4000);
}

export function downloadSrt(content: string, filename: string): void {
  const safe = content && content.trim().length > 0 ? content : "1\n00:00:00,000 --> 00:00:01,000\n \n";
  const name = filename.toLowerCase().endsWith(".srt") ? filename : `${filename}.srt`;
  downloadFile(safe.replace(/\r?\n/g, "\r\n"), name, "application/x-subrip;charset=utf-8");
}

/**
 * Tenta salvar o SRT pelo seletor nativo do Android (navigator.share com arquivos).
 * Se não houver suporte (ou o usuário cancelar/falhar), cai no download via Blob.
 */
export async function shareOrDownloadSrt(content: string, filename: string): Promise<"shared" | "downloaded"> {
  const safe = content && content.trim().length > 0 ? content : "1\n00:00:00,000 --> 00:00:01,000\n \n";
  const name = (filename.toLowerCase().endsWith(".srt") ? filename : `${filename}.srt`).replace(
    /[\\/:*?"<>|]+/g,
    "_",
  );
  const data = safe.replace(/\r?\n/g, "\r\n");

  if (await nativeSave(data, name)) return "downloaded";



  try {
    if (typeof File !== "undefined" && navigator.canShare && navigator.share) {
      const file = new File([data], name, { type: "application/x-subrip" });
      if (navigator.canShare({ files: [file] })) {
        await navigator.share({ files: [file], title: "Exportar SRT" });
        return "shared";
      }
    }
  } catch (e) {
    // Usuário cancelou: não força download duplicado
    if (e instanceof DOMException && e.name === "AbortError") return "shared";
  }

  downloadFile(data, name, "application/octet-stream");
  return "downloaded";
}


export function sanitize(s: string): string {
  return s.replace(/[^\p{L}\p{N}]+/gu, "_").replace(/^|_$/g, "");
}
