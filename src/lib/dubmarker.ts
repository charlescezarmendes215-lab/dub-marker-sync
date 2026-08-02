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
    return `${m[1].padStart(2, "0")}:${m[2]}:${m[3]},${ms}`;
  }
  const m2 = v.match(/^(\d{1,2}):(\d{2})(?:,(\d{1,3}))?$/);
  if (m2) return `00:${m2[1].padStart(2, "0")}:${m2[2]},${(m2[3] ?? "0").padEnd(3, "0")}`;
  return "00:00:00,000";
}

export function toMs(t: string): number {
  const m = t.match(/^(\d{2}):(\d{2}):(\d{2}),(\d{3})$/);
  if (!m) return 0;
  return +m[1] * 3600000 + +m[2] * 60000 + +m[3] * 1000 + +m[4];
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
  const sheet = (name: string) =>
    wb.SheetNames.find((n) => key(n) === key(name));
  const rowsOf = (name?: string) =>
    name
      ? (XLSX.utils.sheet_to_json(wb.Sheets[name], { defval: "" }) as Record<string, unknown>[])
      : [];

  // Character List -> actor mapping
  const charToActor: Record<string, string> = {};
  const actorMap = new Map<string, { characters: Set<string>; lines: number }>();
  for (const row of rowsOf(sheet("Character List"))) {
    const role = pick(row, ["Labeled Role", "Role-EN", "Character"]);
    const actor = pick(row, ["Voice Actor", "VA", "Dublador"]);
    const lines = Number(pick(row, ["Number of Lines", "台词数"]) || 0);
    if (!role || !actor) continue;
    charToActor[role] = actor;
    const e = actorMap.get(actor) ?? { characters: new Set<string>(), lines: 0 };
    e.characters.add(role);
    e.lines += Number.isFinite(lines) ? lines : 0;
    actorMap.set(actor, e);
  }

  // Dialogue sheets
  const dialogues: Dialogue[] = [];
  const dialogueSheets = wb.SheetNames.filter((n) => /dialogue/i.test(n));
  for (const sn of dialogueSheets) {
    for (const row of rowsOf(sn)) {
      const character = pick(row, ["Labeled Role", "Labeled Role-EN", "Character"]);
      if (!character) continue;
      const tc = pick(row, ["Timecode", "Time Code"]);
      let start = "";
      let end = "";
      if (tc.includes("-->")) {
        const [a, b] = tc.split("-->");
        start = padTime(a);
        end = padTime(b);
      } else {
        start = padTime(pick(row, ["Start Timecode", "Start", "In"]) || tc);
        end = padTime(pick(row, ["End Timecode", "End", "Out"]) || start);
      }
      if (toMs(end) <= toMs(start)) end = fromMs(toMs(start) + 600);
      const ep = Number(pick(row, ["Episode No.", "Episode", "EP"]) || 0);
      dialogues.push({
        episode: Number.isFinite(ep) ? ep : 0,
        index: Number(pick(row, ["Subtitle Index", "Index"]) || 0),
        character,
        text: pick(row, ["Translated Text", "Source Text", "Text"]),
        start,
        end,
      });
    }
  }

  // real line counts from dialogues
  const counts = new Map<string, number>();
  for (const d of dialogues) counts.set(d.character, (counts.get(d.character) ?? 0) + 1);
  for (const [actor, e] of actorMap) {
    const real = [...e.characters].reduce((n, c) => n + (counts.get(c) ?? 0), 0);
    if (real > 0) e.lines = real;
  }

  // Video links
  const videoLinks: Record<number, string> = {};
  const vlSheet = wb.SheetNames.find((n) => /video.*(download|link)/i.test(n));
  for (const row of rowsOf(vlSheet)) {
    const ep = Number(pick(row, ["episode", "Episode No.", "EP"]) || 0);
    const link = pick(row, ["link", "url", "Download Link"]);
    if (ep && link) videoLinks[ep] = link;
  }

  const actors: ActorEntry[] = [...actorMap.entries()]
    .map(([actor, e]) => ({ actor, characters: [...e.characters], lines: e.lines }))
    .sort((a, b) => b.lines - a.lines);

  return { dialogues, actors, videoLinks, charToActor };
}

/** Strict: only dialogues whose character belongs to the selected actor. */
export function filterDialogues(all: Dialogue[], characters: string[]): Dialogue[] {
  const set = new Set(characters.map((c) => c.trim().toLowerCase()));
  return all
    .filter((d) => d && d.character && set.has(d.character.trim().toLowerCase()))
    .sort((a, b) => a.episode - b.episode || toMs(a.start) - toMs(b.start));
}

/** Clean marker SRT: one block per line of the selected actor, invisible text. */
export function buildSrt(lines: Dialogue[]): string {
  const blocks = lines
    .filter((l) => l && l.start && l.end)
    .map((l, i) => `${i + 1}\n${l.start} --> ${l.end}\n \n`);
  if (blocks.length === 0) return "1\n00:00:00,000 --> 00:00:01,000\n \n";
  return blocks.join("\n");
}

export function srtDataUri(content: string): string {
  const safe = content && content.trim().length > 0 ? content : "1\n00:00:00,000 --> 00:00:01,000\n \n";
  const b64 = btoa(unescape(encodeURIComponent(safe)));
  return `data:application/x-subrip;base64,${b64}`;
}

export function textDataUri(content: string, mime = "text/plain;charset=utf-8"): string {
  return `data:${mime};base64,${btoa(unescape(encodeURIComponent(content || " ")))}`;
}

export function sanitize(s: string): string {
  return s.replace(/[^\p{L}\p{N}]+/gu, "_").replace(/^_|_$/g, "") || "arquivo";
}
