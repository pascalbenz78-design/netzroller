// Profil und Einstellungen, lokal im Browser (localStorage, immer in try/catch).
// Export/Import als kurzer Text-Code, damit man den Spielstand auf ein anderes Gerät mitnehmen kann.

const KEY = "nr-profile";
const CODE_PREFIX = "NR1.";

export const DEFAULT_SETTINGS = { sound: true, voice: true, vibration: true, lefty: false, swipe: true, intro: true };

function defaults() {
  return { v: 1, name: "", land: "CH", level: 1, settings: { ...DEFAULT_SETTINGS }, introSeen: "", highscores: [], career: null, online: null };
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
  if (Array.isArray(src.highscores)) p.highscores = cleanHighscores(src.highscores);
  if (src.career && typeof src.career === "object") p.career = src.career;   // genauer geprüft in tour.validCareer
  if (src.online && typeof src.online === "object") p.online = cleanOnline(src.online);
  return p;
}

/** Online-Identität (Weltrangliste): ID, geheimer Schlüssel, Teilnahme, noch nicht gesendete Einträge. */
function cleanOnline(o) {
  const r = {};
  if (/^[0-9a-f-]{36}$/.test(o.id || "")) r.id = o.id;
  if (/^[0-9a-f]{32,64}$/.test(o.key || "")) r.key = o.key;
  r.join = o.join !== false;
  r.pendingScores = Array.isArray(o.pendingScores) ? o.pendingScores.filter(x => x && Number.isInteger(x.points) && Number.isInteger(x.kmh)).slice(0, 3) : [];
  if (o.pendingCareer && typeof o.pendingCareer === "object") r.pendingCareer = o.pendingCareer;
  if (typeof o.registered === "string") r.registered = o.registered;
  return r;
}

/** Ballmaschine-Highscores: nur gültige Einträge, höchstens 10, absteigend. */
function cleanHighscores(list) {
  return list
    .filter(e => e && typeof e === "object" && Number.isInteger(e.points) && e.points >= 0 && e.points < 1e7)
    .map(e => ({
      name: String(e.name || "").replace(/[^\p{L}\p{N} ._-]/gu, "").trim().slice(0, 14) || "?",
      points: e.points,
      date: /^\d{4}-\d{2}-\d{2}$/.test(e.date) ? e.date : "",
      kmh: Number.isInteger(e.kmh) && e.kmh >= 0 && e.kmh < 5000 ? e.kmh : 0,
    }))
    .sort((a, b) => b.points - a.points)
    .slice(0, 10);
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
  const { name, land, level, settings, highscores, career, online } = p;
  return CODE_PREFIX + toB64(JSON.stringify({ v: 1, name, land, level, settings, highscores, career, online }));
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
