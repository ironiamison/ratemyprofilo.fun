const STORAGE_KEY = "ss-mp-server";

/** Default relay URL for this build / hostname. */
export function defaultMpServerUrl(): string {
  const env = import.meta.env.VITE_MP_SERVER;
  if (env) return env;

  if (typeof location !== "undefined") {
    const host = location.hostname;
    if (
      host === "spacesalvagers.com" ||
      host === "www.spacesalvagers.com" ||
      location.protocol === "https:"
    ) {
      return "wss://mp.spacesalvagers.com";
    }
    if (host === "localhost" || host === "127.0.0.1") {
      return "ws://localhost:8787";
    }
    const proto = location.protocol === "https:" ? "wss:" : "ws:";
    return `${proto}//${host}:8787`;
  }

  return "ws://localhost:8787";
}

export function getMpServerUrl(): string {
  try {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved?.trim()) return saved.trim();
  } catch {
    /* private browsing */
  }
  return defaultMpServerUrl();
}

export function saveMpServerUrl(url: string): void {
  try {
    localStorage.setItem(STORAGE_KEY, url.trim());
  } catch {
    /* ignore */
  }
}
