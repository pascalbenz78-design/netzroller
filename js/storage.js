// Profil und Einstellungen, lokal im Browser (localStorage, immer in try/catch).
// Export/Import als kurzer Text-Code, damit man den Spielstand auf ein anderes Gerät mitnehmen kann.

const KEY = "nr-profile";
const CODE_PREFIX = "NR1.";

export const DEFAULT_SETTINGS = { sound: true, voice: true, vibration: true, lefty: false, swipe: true, intro: true };

function defaults() {
  return { v: 1, name: "", land: "CH", level: 1, settings: { ...DEFAULT_SETTINGS }, introSeen: "" };
}

/** Übernimmt nur bekannte Felder mit gültigen Werten. */
function sanitize(src) {
  const p = defaults();
  if (!src || typeof src !== "object") return p;
  if (typeof src.name === "string") p.name = src.name.replace(/[^\p{L}\p{N} ._-]/gu, "").trim().slice(0, 14);
  if (typeof src.land === "string" && /^[A-Z]{2}$/.test(src.land)) p.land = src.land;
  if (Number.isInteger(src.level) && src.level >= 0 && src.level <= 2) p.level = src.level;
  if (src.settings && typeof src.settings === "object") {
    for (const k of Object.keys(DEFAULT_SETTINGS)) if (typeof src.settings[k] === "boolean") p.settings[k] = src.settings[k];
  }
  if (typeof src.introSeen === "string") p.introSeen = src.introSeen.slice(0, 10);
  return p;
}

export function loadProfile() {
  let raw = null;
  try { raw = JSON.parse(localStorage.getItem(KEY) || "null"); } catch (e) {}
  if (raw) return sanitize(raw);
  // frühere Version speicherte Name und Stufe einzeln
  const p = defaults();
  try { p.name = sanitize({ name: localStorage.getItem("nr-name") || "" }).name; } catch (e) {}
  try { const l = parseInt(localStorage.getItem("nr-level"), 10); if (l >= 0 && l <= 2) p.level = l; } catch (e) {}
  return p;
}

export function saveProfile(p) {
  try { localStorage.setItem(KEY, JSON.stringify(p)); } catch (e) {}
}

export function today() { return new Date().toISOString().slice(0, 10); }

// ---------- Export / Import ----------
function toB64(str) { return btoa(unescape(encodeURIComponent(str))).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, ""); }
function fromB64(b) { b = b.replace(/-/g, "+").replace(/_/g, "/"); while (b.length % 4) b += "="; return decodeURIComponent(escape(atob(b))); }

export function exportCode(p) {
  const { name, land, level, settings } = p;
  return CODE_PREFIX + toB64(JSON.stringify({ v: 1, name, land, level, settings }));
}

/** Liest einen Code; wirft einen Fehler, wenn er nicht passt. Gibt ein vollständiges Profil zurück. */
export function importCode(code, current) {
  const c = String(code || "").trim().replace(/\s+/g, "");
  if (!c.startsWith(CODE_PREFIX)) throw new Error("format");
  let data;
  try { data = JSON.parse(fromB64(c.slice(CODE_PREFIX.length))); } catch (e) { throw new Error("format"); }
  if (!data || data.v !== 1) throw new Error("format");
  return sanitize({ ...current, ...data, introSeen: current.introSeen });
}
