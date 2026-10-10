// Nachgebauter Supabase-Server zum lokalen Testen der Weltrangliste (Daten nur im Speicher).
//   node tools/mock-supabase.mjs [Port] [Sekunden zwischen Einträgen]   → http://localhost:8766
// Verhält sich wie docs/supabase.sql: Schlüsselprüfung, Plausibilität, höchstens ein Eintrag pro Zeitfenster.
// Im Spiel einschalten (Konsole): __netzroller.test.supabase("http://localhost:8766", "test-anon-key")

import http from "node:http";
import { createHash } from "node:crypto";

const port = +process.argv[2] || 8766;
const windowMs = (+process.argv[3] || 60) * 1000;
const ANON = "test-anon-key";
const players = new Map(), scores = [], career = new Map();
const hash = k => createHash("sha256").update(k).digest("hex");

function fail(res, code, msg) { res.writeHead(code, cors({ "Content-Type": "application/json" })); res.end(JSON.stringify({ message: msg })); }
function ok(res, data) { res.writeHead(data === null ? 204 : 200, cors({ "Content-Type": "application/json" })); res.end(data === null ? "" : JSON.stringify(data)); }
function cors(h) { return { ...h, "Access-Control-Allow-Origin": "*", "Access-Control-Allow-Headers": "apikey, authorization, content-type", "Access-Control-Allow-Methods": "GET, POST, OPTIONS" }; }
const keyOk = (id, key) => players.has(id) && players.get(id).key_hash === hash(String(key));

const rpc = {
  nr_register({ p_id, p_key, p_name, p_land }) {
    if (!p_key || String(p_key).length < 20) throw "Schlüssel zu kurz";
    if (!/^.{1,14}$/u.test(p_name || "") || !/^[A-Z]{2}$/.test(p_land || "")) throw "unplausibel";
    const p = players.get(p_id);
    if (p && p.key_hash !== hash(p_key)) throw "Schlüssel passt nicht";
    players.set(p_id, { id: p_id, key_hash: hash(p_key), name: p_name, land: p_land, updated_at: Date.now() });
  },
  nr_submit_score({ p_id, p_key, p_points, p_speed }) {
    if (!keyOk(p_id, p_key)) throw "Schlüssel passt nicht";
    if (!(p_points >= 0 && p_points <= 1e6 && p_speed >= 0 && p_speed <= 5000)) throw "unplausibel";
    if (scores.some(s => s.player_id === p_id && Date.now() - s.at < windowMs)) throw "höchstens ein Eintrag pro Minute";
    scores.push({ player_id: p_id, points: p_points, speed: p_speed, at: Date.now() });
  },
  nr_submit_career({ p_id, p_key, p_points, p_titles, p_best }) {
    if (!keyOk(p_id, p_key)) throw "Schlüssel passt nicht";
    if (!(p_points >= 0 && p_points <= 1e5 && p_titles >= 0 && p_best >= 1 && p_best <= 64)) throw "unplausibel";
    const c = career.get(p_id);
    if (c && Date.now() - c.at < windowMs) throw "höchstens ein Eintrag pro Minute";
    career.set(p_id, { ranking_points: p_points, titles: p_titles, best_rank: p_best, at: Date.now() });
  },
};

function worldRanking(q) {
  let rows = [...players.values()].map(p => {
    const c = career.get(p.id), mine = scores.filter(s => s.player_id === p.id);
    return {
      id: p.id, name: p.name, land: p.land,
      ranking_points: c ? c.ranking_points : 0, titles: c ? c.titles : 0, best_rank: c ? c.best_rank : null,
      machine_best: mine.length ? Math.max(...mine.map(s => s.points)) : null,
      machine_speed: mine.length ? Math.max(...mine.map(s => s.speed)) : null,
    };
  });
  if (q.get("machine_best") === "not.is.null") rows = rows.filter(r => r.machine_best !== null);
  const order = (q.get("order") || "").split(",").map(o => o.split("."));
  rows.sort((a, b) => { for (const [k] of order) { const d = (b[k] ?? -1) - (a[k] ?? -1); if (d) return d; } return 0; });
  return rows.slice(0, +q.get("limit") || 100);
}

http.createServer((req, res) => {
  if (req.method === "OPTIONS") { res.writeHead(204, cors({})); res.end(); return; }
  if (req.headers.apikey !== ANON) return fail(res, 401, "apikey fehlt");
  const url = new URL(req.url, "http://x");
  if (req.method === "GET" && url.pathname === "/rest/v1/world_ranking") return ok(res, worldRanking(url.searchParams));
  const m = url.pathname.match(/^\/rest\/v1\/rpc\/(\w+)$/);
  if (req.method === "POST" && m && rpc[m[1]]) {
    let body = "";
    req.on("data", d => { body += d; });
    req.on("end", () => {
      try { rpc[m[1]](JSON.parse(body || "{}")); ok(res, null); }
      catch (e) { fail(res, 400, String(e)); }
    });
    return;
  }
  fail(res, 404, "unbekannt");
}).listen(port, () => console.log(`Supabase-Attrappe auf http://localhost:${port} (anon key: ${ANON}, Zeitfenster ${windowMs / 1000} s)`));
