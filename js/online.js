// Weltrangliste und Online-Highscore über Supabase (REST, ohne zusätzliche Bibliothek).
//
// Jedes Profil hat eine zufällige ID und einen geheimen Schlüssel (profile.online). Die Datenbank speichert
// nur die Prüfsumme des Schlüssels; schreiben geht nur über die Funktionen in docs/supabase.sql.
// Ohne Internet oder ohne eingetragenes Supabase-Projekt läuft alles lokal weiter: Einträge, die nicht
// ankommen, bleiben im Profil liegen und werden beim nächsten Mal nachgeschickt.

import { SUPABASE } from "./config.js";

const TIMEOUT_MS = 8000;

export const onlineConfigured = () => !!(SUPABASE.url && SUPABASE.anonKey);

/** Sorgt dafür, dass das Profil eine ID und einen Schlüssel hat. Gibt true zurück, wenn neu erzeugt. */
export function ensureIdentity(profile) {
  const o = profile.online || (profile.online = {});
  let fresh = false;
  if (!/^[0-9a-f-]{36}$/.test(o.id || "")) { o.id = uuid(); fresh = true; }
  if (!/^[0-9a-f]{32,64}$/.test(o.key || "")) { o.key = randomHex(40); fresh = true; }
  if (typeof o.join !== "boolean") o.join = true;
  if (!Array.isArray(o.pendingScores)) o.pendingScores = [];
  return fresh;
}

function uuid() {
  if (crypto.randomUUID) return crypto.randomUUID();
  const h = randomHex(32);
  return `${h.slice(0, 8)}-${h.slice(8, 12)}-4${h.slice(13, 16)}-a${h.slice(17, 20)}-${h.slice(20, 32)}`;
}
/** Zufällige Hex-Zeichenkette mit `chars` Zeichen. */
function randomHex(chars) {
  const a = new Uint8Array(Math.ceil(chars / 2)); crypto.getRandomValues(a);
  return [...a].map(b => b.toString(16).padStart(2, "0")).join("").slice(0, chars);
}

async function call(path, { method = "GET", body } = {}) {
  const ctl = new AbortController(), t = setTimeout(() => ctl.abort(), TIMEOUT_MS);
  try {
    const res = await fetch(SUPABASE.url.replace(/\/$/, "") + path, {
      method, signal: ctl.signal,
      headers: {
        apikey: SUPABASE.anonKey, "Content-Type": "application/json",
        // ältere «anon»-Schlüssel sind JWTs und gehören zusätzlich in Authorization; neue «publishable»-Schlüssel nicht
        ...(SUPABASE.anonKey.startsWith("eyJ") ? { Authorization: "Bearer " + SUPABASE.anonKey } : {}),
      },
      body: body ? JSON.stringify(body) : undefined,
    });
    if (!res.ok) throw new Error("HTTP " + res.status + " " + (await res.text()).slice(0, 200));
    const txt = await res.text();
    return txt ? JSON.parse(txt) : null;
  } finally { clearTimeout(t); }
}
const rpc = (fn, args) => call("/rest/v1/rpc/" + fn, { method: "POST", body: args });

// Registrierung gilt pro Datenbank: Wechselt die Adresse (z. B. vom Test-Server zu Supabase), wird neu eingetragen.
const regMark = profile => SUPABASE.url + "|" + profile.name + "|" + profile.land;
const canSend = profile => onlineConfigured() && profile.online && profile.online.join && profile.name;

/** Name und Land eintragen bzw. aktualisieren. */
export async function register(profile) {
  if (!canSend(profile)) return false;
  const o = profile.online;
  await rpc("nr_register", { p_id: o.id, p_key: o.key, p_name: profile.name, p_land: profile.land });
  o.registered = regMark(profile);
  return true;
}

/** Ballmaschine: Ergebnis merken und (wenn möglich) gleich hochladen. */
export function queueScore(profile, points, kmh) {
  ensureIdentity(profile);
  if (points <= 0) return;
  const list = profile.online.pendingScores;
  list.push({ points, kmh });
  list.sort((a, b) => b.points - a.points);
  list.length = Math.min(list.length, 3);                 // höchstens die drei besten warten lassen
}

/** Karriere: aktuellen Stand zum Hochladen vormerken. */
export function queueCareer(profile, points, titles, rank, tier) {
  ensureIdentity(profile);
  profile.online.pendingCareer = { points, titles, rank: Math.max(1, Math.min(64, rank)), tier };
}

/**
 * Alles Offene hochladen. Gibt { sent, failed } zurück; wirft nie.
 * save() wird aufgerufen, wenn sich am Profil etwas geändert hat.
 */
export async function sync(profile, save) {
  const res = { sent: 0, failed: 0 };
  if (!canSend(profile)) return res;
  const o = profile.online;
  try {
    if (o.registered !== regMark(profile)) { await register(profile); save(); }
  } catch (e) { res.failed++; return res; }
  while (o.pendingScores.length) {
    const s = o.pendingScores[0];
    try { await rpc("nr_submit_score", { p_id: o.id, p_key: o.key, p_points: s.points, p_speed: s.kmh }); o.pendingScores.shift(); res.sent++; save(); }
    catch (e) { res.failed++; break; }                     // z. B. «höchstens ein Eintrag pro Minute»: später nochmals
  }
  if (o.pendingCareer) {
    const c = o.pendingCareer;
    try { await rpc("nr_submit_career", { p_id: o.id, p_key: o.key, p_tier: c.tier || "WORLD", p_points: c.points, p_titles: c.titles, p_rank: c.rank ?? c.bestRank ?? 64 }); delete o.pendingCareer; res.sent++; save(); }
    catch (e) { res.failed++; }
  }
  return res;
}

/** Weltrangliste laden: by = "career" (Ranglistenpunkte) oder "machine" (Ballmaschine). */
export async function loadWorld(by = "career", limit = 100) {
  const order = by === "machine" ? "machine_best.desc.nullslast,ranking_points.desc" : "tier_order.desc,ranking_points.desc,titles.desc";
  const filter = by === "machine" ? "&machine_best=not.is.null" : "";
  return call(`/rest/v1/world_ranking?select=id,name,land,tier,tier_order,ranking_points,titles,tier_rank,machine_best,machine_speed&order=${order}&limit=${limit}${filter}`);
}
