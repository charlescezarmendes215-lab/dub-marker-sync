/**
 * Salvamento de arquivos no Android nativo (Capacitor).
 * No navegador, `isNative()` retorna false e o app continua usando Blob/share da Web.
 */
import { Capacitor } from "@capacitor/core";
import { Directory, Filesystem } from "@capacitor/filesystem";
import { Share } from "@capacitor/share";

export function isNative(): boolean {
  try {
    return Capacitor.isNativePlatform();
  } catch {
    return false;
  }
}

function toBase64(content: string | Blob): Promise<string> {
  const blob = typeof content === "string" ? new Blob([content]) : content;
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = () => reject(reader.error);
    reader.onload = () => {
      const result = String(reader.result ?? "");
      resolve(result.slice(result.indexOf(",") + 1));
    };
    reader.readAsDataURL(blob);
  });
}

/**
 * Grava o arquivo na pasta pública "Downloads" do Android.
 * Se o sistema bloquear (armazenamento com escopo), grava em Documents e abre
 * o seletor nativo para o usuário salvar onde quiser.
 */
export async function saveToDownloads(
  content: string | Blob,
  filename: string,
): Promise<"downloads" | "shared"> {
  const name = filename.replace(/[\\/:*?"<>|]+/g, "_");
  const data = await toBase64(content);

  try {
    await Filesystem.writeFile({
      path: `Download/${name}`,
      data,
      directory: Directory.ExternalStorage,
      recursive: true,
    });
    return "downloads";
  } catch {
    const written = await Filesystem.writeFile({
      path: name,
      data,
      directory: Directory.Documents,
      recursive: true,
    });
    await Share.share({ title: name, url: written.uri });
    return "shared";
  }
}
