import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useRef, useState } from "react";
import {
  parseWorkbook,
  filterDialogues,
  buildSrt,
  srtDataUri,
  textDataUri,
  sanitize,
  type Dialogue,
  type Workbook,
  type ActorEntry,
} from "@/lib/dubmarker";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "DubMarker App — Marcadores SRT para Dubladores" },
      {
        name: "description",
        content:
          "Carregue a planilha de dublagem, filtre por dublador e gere marcadores SRT para o CapCut e links de vídeo por episódio.",
      },
      { property: "og:title", content: "DubMarker App — Marcadores SRT para Dubladores" },
      {
        property: "og:description",
        content:
          "Organize scripts de dublagem: filtre por dublador, gere SRT limpo para CapCut e baixe os vídeos por episódio.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: Index,
});

function Index() {
  const [wbData, setWbData] = useState<Workbook | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [query, setQuery] = useState("");
  const [open, setOpen] = useState(false);
  const [selected, setSelected] = useState<ActorEntry | null>(null);
  const [modalOpen, setModalOpen] = useState(false);
  const [downloadIdx, setDownloadIdx] = useState(0);
  const [busyEp, setBusyEp] = useState<number | null>(null);
  const [copiedEp, setCopiedEp] = useState<number | null>(null);

  async function copyLines(lines: Dialogue[]) {
    const text = lines.map((l) => `[${l.start}] ${l.text}`).join("\n");
    try {
      await navigator.clipboard.writeText(text);
    } catch {
      // fallback silencioso — o usuário também pode selecionar o texto manualmente
    }
  }


  async function onFile(f: File) {
    setLoading(true);
    setError(null);
    try {
      const parsed = parseWorkbook(await f.arrayBuffer());
      if (parsed.actors.length === 0) throw new Error("Nenhum dublador encontrado na aba 'Character List'.");
      setWbData(parsed);
      setSelected(null);
      setQuery("");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Falha ao ler a planilha.");
    } finally {
      setLoading(false);
    }
  }

  const options = useMemo(() => {
    if (!wbData) return [];
    const q = query.trim().toLowerCase();
    return wbData.actors.filter(
      (a) =>
        !q ||
        a.actor.toLowerCase().includes(q) ||
        a.characters.some((c) => c.toLowerCase().includes(q)),
    );
  }, [wbData, query]);

  const lines: Dialogue[] = useMemo(
    () => (wbData && selected ? filterDialogues(wbData.dialogues, selected.characters) : []),
    [wbData, selected],
  );

  const episodes = useMemo(() => {
    const map = new Map<number, Dialogue[]>();
    for (const l of lines) {
      const arr = map.get(l.episode) ?? [];
      arr.push(l);
      map.set(l.episode, arr);
    }
    return [...map.entries()].sort((a, b) => a[0] - b[0]);
  }, [lines]);

  const actorName = selected ? sanitize(selected.actor) : "Dublador";
  const selectedCharacters = selected?.characters ?? [];
  const videoEps = episodes.filter(([ep]) => wbData?.videoLinks[ep]);

  async function forceDownload(url: string, filename: string) {
    try {
      const res = await fetch(url);
      if (!res.ok) throw new Error(String(res.status));
      const blob = await res.blob();
      const objUrl = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = objUrl;
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      setTimeout(() => URL.revokeObjectURL(objUrl), 4000);
    } catch {
      const a = document.createElement("a");
      a.href = url;
      a.download = filename;
      a.rel = "noopener";
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
    }
  }

  return (
    <main className="min-h-screen bg-background text-foreground">
      <header className="sticky top-0 z-20 border-b border-border bg-background/90 px-4 py-4 backdrop-blur">
        <h1 className="text-lg font-semibold tracking-tight">
          Dub<span className="text-primary">Marker</span> App
        </h1>
        <p className="mt-0.5 text-xs text-muted-foreground">
          Marcadores de tempo para dubladores · CapCut
        </p>
      </header>

      <div className="mx-auto max-w-xl space-y-5 px-4 pb-24 pt-5">
        {/* Upload */}
        <section className="rounded-2xl border border-border bg-card p-4">
          <input
            ref={fileRef}
            type="file"
            accept=".xlsx,.xls"
            className="hidden"
            onChange={(e) => {
              const f = e.target.files?.[0];
              if (f) void onFile(f);
            }}
          />
          <button
            onClick={() => fileRef.current?.click()}
            className="w-full rounded-xl bg-primary px-4 py-3 text-sm font-semibold text-primary-foreground transition-opacity active:opacity-80"
          >
            {loading ? "Lendo planilha…" : wbData ? "Trocar planilha (.xlsx)" : "Carregar planilha (.xlsx)"}
          </button>
          {wbData && (
            <p className="mt-2 text-center text-xs text-muted-foreground">
              {wbData.dialogues.length} falas · {wbData.actors.length} dubladores ·{" "}
              {Object.keys(wbData.videoLinks).length} vídeos
            </p>
          )}
          {error && <p className="mt-2 text-center text-xs text-destructive">{error}</p>}
        </section>

        {/* Combobox */}
        {wbData && (
          <section className="relative rounded-2xl border border-border bg-card p-4">
            <label className="text-xs font-medium text-muted-foreground">Dublador / Ator</label>
            <input
              value={query}
              onChange={(e) => {
                setQuery(e.target.value);
                setOpen(true);
              }}
              onFocus={() => setOpen(true)}
              placeholder="Buscar dublador (ex: Charles)"
              className="mt-2 w-full rounded-xl border border-input bg-secondary px-3 py-3 text-sm outline-none placeholder:text-muted-foreground focus:border-ring"
            />
            {open && (
              <ul className="absolute left-4 right-4 z-30 mt-1 max-h-72 overflow-auto rounded-xl border border-border bg-popover shadow-xl">
                {options.length === 0 && (
                  <li className="px-3 py-3 text-sm text-muted-foreground">Nenhum resultado</li>
                )}
                {options.map((a) => (
                  <li key={a.actor}>
                    <button
                      onClick={() => {
                        setSelected(a);
                        setQuery(a.actor);
                        setOpen(false);
                        setDownloadIdx(0);
                      }}
                      className="w-full px-3 py-3 text-left text-sm transition-colors hover:bg-accent"
                    >
                      <span className="font-medium">{a.actor}</span>
                      <span className="text-muted-foreground"> — {a.characters.join(", ")}</span>
                      <span className="text-primary"> ({a.lines} falas)</span>
                    </button>
                  </li>
                ))}
              </ul>
            )}
            {selected && (
              <p className="mt-3 text-xs text-muted-foreground">
                {lines.length} falas encontradas em {episodes.length} episódios para{" "}
                <span className="text-foreground">{selected.characters.join(", ")}</span>
              </p>
            )}
          </section>
        )}

        {/* Actions */}
        {selected && lines.length > 0 && (
          <section className="grid grid-cols-2 gap-2">
            <button
              onClick={() => {
                setDownloadIdx(0);
                setModalOpen(true);
              }}
              className="rounded-xl border border-border bg-card px-3 py-3 text-sm font-medium active:opacity-80"
            >
              Baixar vídeos
            </button>
            <a
              href={textDataUri(
                videoEps.map(([ep]) => wbData?.videoLinks[ep]).filter(Boolean).join("\n") + "\n",
              )}
              download={`Links_${actorName}.txt`}
              className="rounded-xl border border-border bg-card px-3 py-3 text-center text-sm font-medium active:opacity-80"
            >
              Lista de links (.txt)
            </a>
          </section>
        )}

        {/* Episode cards */}
        {episodes.map(([ep, eps]) => {
          const link = wbData?.videoLinks[ep];
          return (
            <article key={ep} className="rounded-2xl border border-border bg-card p-4">
              <div className="flex items-center justify-between">
                <h2 className="text-sm font-semibold">Episódio {ep}</h2>
                <span className="rounded-full bg-secondary px-2 py-0.5 text-xs text-muted-foreground">
                  {eps.length} falas
                </span>
              </div>
              <p className="mt-1 text-xs text-muted-foreground">
                {eps[0]?.start} → {eps[eps.length - 1]?.end}
              </p>
              <ul className="mt-3 space-y-1.5">
                {eps.slice(0, 4).map((l, i) => (
                  <li key={i} className="rounded-lg bg-secondary/60 px-2.5 py-1.5 text-xs">
                    <span className="font-mono text-primary">{l.start}</span>
                    <span className="ml-2 text-muted-foreground line-clamp-1">{l.text}</span>
                  </li>
                ))}
                {eps.length > 4 && (
                  <li className="px-1 text-xs text-muted-foreground">+ {eps.length - 4} falas…</li>
                )}
              </ul>
              <div className="mt-3 flex gap-2">
                <a
                  href={srtDataUri(
                    buildSrt(
                      eps.filter((dialogue) =>
                        selectedCharacters.some(
                          (character) =>
                            character.trim().toLowerCase() ===
                            dialogue.character.trim().toLowerCase(),
                        ),
                      ),
                    ),
                  )}
                  download={`Episodio_${ep}_${actorName}.srt`}
                  className="flex-1 rounded-lg bg-primary px-3 py-2 text-center text-xs font-semibold text-primary-foreground active:opacity-80"
                >
                  SRT
                </a>
                {link && (
                  <>
                    <button
                      onClick={async () => {
                        setBusyEp(ep);
                        await forceDownload(link, `Episodio_${ep}_${actorName}.mp4`);
                        setBusyEp(null);
                      }}
                      className="flex-1 rounded-lg border border-border px-3 py-2 text-xs font-medium active:opacity-80"
                    >
                      {busyEp === ep ? "Baixando…" : "Vídeo"}
                    </button>
                    <a
                      href={link}
                      target="_blank"
                      rel="noreferrer"
                      className="rounded-lg border border-border px-3 py-2 text-xs text-muted-foreground"
                    >
                      Prévia
                    </a>
                  </>
                )}
              </div>
            </article>
          );
        })}
      </div>

      {/* Download modal */}
      {modalOpen && (
        <div className="fixed inset-0 z-40 flex items-end bg-black/70">
          <div className="max-h-[85vh] w-full overflow-auto rounded-t-3xl border-t border-border bg-card p-4">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-semibold">Baixar vídeos</h3>
              <button
                onClick={() => setModalOpen(false)}
                className="rounded-lg px-3 py-1 text-xs text-muted-foreground"
              >
                Fechar
              </button>
            </div>
            <p className="mt-1 text-xs text-muted-foreground">
              Toque em cada botão para autorizar o download no navegador.
            </p>
            <div className="mt-3 h-1.5 w-full overflow-hidden rounded-full bg-secondary">
              <div
                className="h-full bg-primary transition-all"
                style={{
                  width: `${videoEps.length ? (downloadIdx / videoEps.length) * 100 : 0}%`,
                }}
              />
            </div>
            {downloadIdx < videoEps.length && (
              <button
                onClick={async () => {
                  const entry = videoEps[downloadIdx];
                  if (!entry) return;
                  const ep = entry[0];
                  const url = wbData?.videoLinks[ep];
                  if (!url) return;
                  setBusyEp(ep);
                  await forceDownload(url, `Episodio_${ep}_${actorName}.mp4`);
                  setBusyEp(null);
                  setDownloadIdx((i) => i + 1);
                }}
                className="mt-3 w-full rounded-xl bg-primary px-4 py-3 text-sm font-semibold text-primary-foreground active:opacity-80"
              >
                {busyEp !== null
                  ? "Baixando…"
                  : `Baixar próximo (${downloadIdx + 1} de ${videoEps.length}) · Ep ${videoEps[downloadIdx]?.[0]}`}
              </button>
            )}
            <ul className="mt-3 space-y-2">
              {videoEps.map(([ep], i) => (
                <li key={ep}>
                  <button
                    onClick={async () => {
                      const url = wbData?.videoLinks[ep];
                      if (!url) return;
                      setBusyEp(ep);
                      await forceDownload(url, `Episodio_${ep}_${actorName}.mp4`);
                      setBusyEp(null);
                      setDownloadIdx(i + 1);
                    }}
                    className={`w-full rounded-xl border px-3 py-3 text-left text-sm ${
                      i === downloadIdx
                        ? "border-primary bg-primary/10 text-foreground"
                        : i < downloadIdx
                          ? "border-border text-muted-foreground"
                          : "border-border"
                    }`}
                  >
                    {i < downloadIdx ? "✓ " : ""}Episódio {ep}
                  </button>
                </li>
              ))}
            </ul>
          </div>
        </div>
      )}
    </main>
  );
}
