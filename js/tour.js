// Karriere in Stufen: Aargau → Schweiz → Europa → Welt. Pro Stufe ein Feld erfundener Computerspieler
// und du, eigene Turniere pro Saison, rollende Rangliste, Aufstieg ab einer Rangierung.
// Reine Logik ohne Darstellung: läuft im Browser und in tools/simulate.mjs (tour).
//
// Spieler-Index 0 … n-1 = Computerspieler der Stufe (tiers.js), n = du (me(c)).
// Ein Turnier ist ein K.-o.-Raster: rounds[0] sind die Startplätze, rounds[r + 1][k] gewinnt das Spiel
// rounds[r][2k] gegen rounds[r][2k + 1]. Ein «final»-Turnier hat zwei Vierergruppen, dann Halbfinal und Final.

import { BALANCE as B } from "./balance.js";
import { TIER_PLAYERS } from "./tiers.js";

const K = B.career;
export const TIER_IDS = K.tiers.map(t => t.id);

const lerp = (a, b, t) => a + (b - a) * t;
const clamp01 = v => Math.max(0, Math.min(1, v));

// ---------- Stufe ----------
export const tierDef = c => K.tiers.find(t => t.id === (c.tier || "WORLD"));
export const players = c => TIER_PLAYERS[c.tier || "WORLD"];
export const player = (c, i) => players(c)[i];
/** Dein Index in der Stufe (nach allen Computerspielern). */
export const me = c => players(c).length;
export const tournament = (c, ti) => tierDef(c).tournaments[ti];
const ratingOf = (c, idx) => (idx === me(c) ? -1 : players(c)[idx].rating);

/** Nächste Stufe oder null (Welt ist die letzte). */
export function nextTier(c) {
  const i = TIER_IDS.indexOf(c.tier || "WORLD");
  return i >= 0 && i < TIER_IDS.length - 1 ? TIER_IDS[i + 1] : null;
}

// ---------- Karriere anlegen ----------
/**
 * Neue Karriere in einer Stufe: Die Computerspieler haben schon eine Saison hinter sich, du startest ganz unten.
 * Mit `keep` (bisherige Karriere) bleiben Statistik, Titel, Verlauf, Saison und Schlägerfarbe erhalten (Aufstieg).
 */
export function newCareer(rand = Math.random, tier = "AG", keep = null) {
  const n = TIER_PLAYERS[tier].length;
  const c = {
    v: 2, tier, season: 1, ti: 0, wildcardUsed: false, current: null,
    results: Array.from({ length: n + 1 }, () => []),
    prevRanks: null, history: [], tiersReached: [tier], tierPlayed: 0,
    stats: { wins: 0, losses: 0, aces: 0, doubleFaults: 0, longestRally: 0, bestRank: n + 1, titles: [] },
    racket: "classic",
  };
  for (let t = 0; t < tierDef(c).tournaments.length; t++) {    // Vorsaison ohne dich
    startTournament(c, t, false, rand);
    simulateRest(c, rand);
    closeTournament(c, false);
  }
  c.ti = 0; c.wildcardUsed = false; c.season = 1;            // die Vorsaison zählt nicht als deine Saison
  if (keep) {
    c.season = keep.season; c.history = keep.history; c.racket = keep.racket;
    c.stats = { ...keep.stats, bestRank: n + 1 };
    c.tiersReached = [...new Set([...(keep.tiersReached || []), tier])];
  }
  c.prevRanks = ranks(c);
  return c;
}

/** Aufstieg möglich? Nur zwischen zwei Turnieren und ab der Aufstiegs-Rangierung der Stufe. */
export function canPromote(c) {
  const t = tierDef(c);
  return !!nextTier(c) && !c.current && t.promoteTop > 0 && (c.tierPlayed || 0) >= (t.minPlay || 0) && ranks(c)[me(c)] <= t.promoteTop;
}

/** In die nächste Stufe aufsteigen. Gibt die neue Karriere zurück (Statistik und Titel bleiben). */
export function promote(c, rand = Math.random) {
  const nt = nextTier(c);
  if (!nt) return c;
  const fresh = newCareer(rand, nt, c);
  Object.keys(c).forEach(k => delete c[k]);
  Object.assign(c, fresh);
  return c;
}

/** Ältere Karrieren (Phase 5, nur Welt-Tour) übernehmen. Gibt true zurück, wenn etwas geändert wurde. */
export function migrateCareer(c) {
  if (!c || typeof c !== "object" || c.v !== 1) return false;
  c.v = 2; c.tier = "WORLD"; c.tiersReached = [...TIER_IDS];
  (c.stats.titles || []).forEach(t => { t.tier = t.tier || "WORLD"; });
  (c.history || []).forEach(h => { h.tier = h.tier || "WORLD"; });
  return true;
}

// ---------- Rangliste ----------
export const totalPoints = (c, i) => c.results[i].reduce((a, b) => a + b, 0);

/** Rangliste: [{ idx, points, rank }], bei Gleichstand entscheidet das Rating, du zuletzt. */
export function ranking(c) {
  const rows = c.results.map((r, idx) => ({ idx, points: totalPoints(c, idx) }));
  rows.sort((a, b) => b.points - a.points || ratingOf(c, b.idx) - ratingOf(c, a.idx));
  rows.forEach((r, i) => { r.rank = i + 1; });
  return rows;
}
export function ranks(c) { const m = new Array(c.results.length); ranking(c).forEach(r => { m[r.idx] = r.rank; }); return m; }

// ---------- Turniere ----------
/** Darfst du mitspielen? { ok, wildcard } – wildcard: nur mit Wildcard möglich. */
export function eligibility(c, ti) {
  const t = tournament(c, ti), rank = ranks(c)[me(c)];
  if (t.cat === "final") return { ok: rank <= 8, wildcard: false, rank };
  const need = (tierDef(c).entry || {})[t.cat];
  if (!need || rank <= need) return { ok: true, wildcard: false, rank };
  return { ok: false, wildcard: !c.wildcardUsed, rank, need };
}

/** Startet ein Turnier: Teilnehmer wählen, Gesetzte verteilen. */
export function startTournament(c, ti, withUser, rand = Math.random) {
  const t = tournament(c, ti), rk = ranks(c), n = players(c).length, U = me(c);
  const [lo, hi] = tierDef(c).pools[t.cat] || [1, n + 1];
  const pool = [...Array(n).keys()].filter(i => rk[i] >= lo && rk[i] <= hi);
  const need = t.size - (withUser ? 1 : 0);
  // die besser Rangierten spielen eher: gewichtete Auswahl
  const chosen = [];
  const weighted = pool.map(i => ({ i, w: rand() * (1 + (hi - rk[i]) / (hi - lo + 1)) }));
  weighted.sort((a, b) => b.w - a.w);
  for (const { i } of weighted) { if (chosen.length >= need) break; chosen.push(i); }
  if (t.cat === "final") { chosen.length = 0; pool.sort((a, b) => rk[a] - rk[b]).slice(0, need).forEach(i => chosen.push(i)); }
  const entrants = withUser ? [...chosen, U] : chosen;
  entrants.sort((a, b) => rk[a] - rk[b]);

  const cur = { ti, cat: t.cat, size: t.size, userIn: withUser, userOut: false, done: false, lost: {} };
  if (t.cat === "final") {
    // Gruppen im Zickzack: 1, 4, 5, 8 und 2, 3, 6, 7
    const g = [[entrants[0], entrants[3], entrants[4], entrants[7]], [entrants[1], entrants[2], entrants[5], entrants[6]]];
    cur.groups = g; cur.wins = {}; entrants.forEach(i => { cur.wins[i] = 0; });
    cur.day = 0; cur.groupResults = [];               // [{ a, b, w }]
    cur.semis = null; cur.final = null; cur.champion = null;
  } else {
    cur.rounds = [seedDraw(entrants, t.size, rand)];
    cur.round = 0;
  }
  c.current = cur;
  return cur;
}

/** Gesetzte so verteilen, dass sie sich spät treffen; die übrigen zufällig. */
function seedDraw(entrants, N, rand) {
  const slots = new Array(N).fill(null), S = N / 4;
  const seeds = entrants.slice(0, S), rest = entrants.slice(S);
  const pos = [[0], [N - 1], shuffle([N / 2 - 1, N / 2], rand), shuffle([N / 4 - 1, N / 4, (3 * N) / 4 - 1, (3 * N) / 4], rand)].flat();
  seeds.forEach((p, i) => { slots[pos[i]] = p; });
  const free = shuffle(slots.map((v, i) => (v === null ? i : -1)).filter(i => i >= 0), rand);
  shuffle(rest, rand).forEach((p, i) => { slots[free[i]] = p; });
  return slots;
}
function shuffle(a, rand) { for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(rand() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; } return a; }

/** Rundenname für K.-o.-Raster: Abstand zum Final. */
export function roundKey(size, r) {
  const fromEnd = Math.log2(size) - r;                // 1 = Final, 2 = Halbfinal, …
  return ["F", "SF", "QF", "R16", "R32"][fromEnd - 1];
}

/** Matchformat: zwei Gewinnsätze, im Final drei (jeder Satz ein Kurzsatz). */
export function formatFor(key) {
  return key === "F" ? K.format.final : K.format.normal;
}

/** Nächstes Spiel für dich: { opp, key, roundIndex } oder null. */
export function userNextMatch(c) {
  const cur = c.current, U = me(c);
  if (!cur || !cur.userIn || cur.userOut || cur.done) return null;
  if (cur.cat === "final") {
    if (cur.day < 3) {
      const g = cur.groups.find(gr => gr.includes(U)), pairs = groupPairs(g, cur.day);
      const pr = pairs.find(([a, b]) => a === U || b === U);
      return { opp: pr[0] === U ? pr[1] : pr[0], key: "G", roundIndex: cur.day };
    }
    if (cur.semis && cur.day === 3) { const pr = cur.semis.find(([a, b]) => a === U || b === U); if (pr) return { opp: pr[0] === U ? pr[1] : pr[0], key: "SF", roundIndex: 3 }; }
    if (cur.final && cur.day === 4) { const [a, b] = cur.final; if (a === U || b === U) return { opp: a === U ? b : a, key: "F", roundIndex: 4 }; }
    return null;
  }
  const r = cur.round, slots = cur.rounds[r], k = slots.indexOf(U);
  if (k < 0) return null;
  return { opp: slots[k ^ 1], key: roundKey(cur.size, r), roundIndex: r };
}

/** Freilose für dich: kampflos weiter, bis ein echter Gegner kommt. Gibt true zurück, wenn sich etwas geändert hat. */
export function skipByes(c, rand = Math.random) {
  let changed = false, m;
  while ((m = userNextMatch(c)) && m.opp === null) { recordUserMatch(c, true, rand); changed = true; }
  return changed;
}

/** Wahrscheinlichkeit, dass a gegen b gewinnt (Hintergrund-Simulation), für Ratings oder eine Stufe. */
export function winProbRating(ra, rb) { return 1 / (1 + Math.pow(10, (rb - ra) / K.elo)); }
export function winProb(c, a, b) { return winProbRating(ratingOf(c, a), ratingOf(c, b)); }
// Freilos: ein leerer Platz (null) verliert immer
const playOut = (c, a, b, rand) => (a === null ? b : b === null ? a : rand() < winProb(c, a, b) ? a : b);

/** Dein Match ist fertig: Ergebnis eintragen, die übrigen Spiele der Runde simulieren. */
export function recordUserMatch(c, won, rand = Math.random) {
  const cur = c.current, U = me(c);
  if (cur.cat === "final") return advanceFinal(c, won, rand);
  const r = cur.round, slots = cur.rounds[r], next = [];
  for (let k = 0; k < slots.length; k += 2) {
    const a = slots[k], b = slots[k + 1];
    let w;
    if (a === U || b === U) w = won ? U : (a === U ? b : a);
    else w = playOut(c, a, b, rand);
    next.push(w);
    cur.lost[w === a ? b : a] = r;
  }
  if (!won) cur.userOut = true;
  pushRound(c, next);
  return cur;
}

function pushRound(c, next) {
  const cur = c.current;
  if (next.length === 1) { cur.champion = next[0]; cur.done = true; cur.rounds.push(next); cur.round++; return; }
  cur.rounds.push(next); cur.round++;
}

/** Rest des Turniers ohne dich durchspielen. */
export function simulateRest(c, rand = Math.random) {
  const cur = c.current;
  if (cur.cat === "final") { while (!cur.done) advanceFinal(c, null, rand); return; }
  while (!cur.done) {
    const slots = cur.rounds[cur.round], next = [];
    for (let k = 0; k < slots.length; k += 2) {
      const a = slots[k], b = slots[k + 1], w = playOut(c, a, b, rand);
      next.push(w); cur.lost[w === a ? b : a] = cur.round;
    }
    pushRound(c, next);
  }
}

// ---------- Finale mit Gruppen ----------
export function groupPairs(g, day) { return [[[0, 1], [2, 3]], [[0, 2], [1, 3]], [[0, 3], [1, 2]]][day].map(([x, y]) => [g[x], g[y]]); }

/** Ein Spieltag (oder Halbfinal/Final) des Finales. won: dein Ergebnis oder null (ohne dich). */
function advanceFinal(c, won, rand) {
  const cur = c.current, U = me(c);
  const decide = (a, b) => (a === U || b === U) && won !== null ? (won ? U : (a === U ? b : a)) : playOut(c, a, b, rand);
  if (cur.day < 3) {
    for (const g of cur.groups) for (const [a, b] of groupPairs(g, cur.day)) {
      const w = decide(a, b); cur.wins[w]++; cur.groupResults.push({ a, b, w });
    }
    cur.day++;
    if (cur.day === 3) {
      const st = cur.groups.map(g => standings(c, cur, g));
      cur.semis = [[st[0][0], st[1][1]], [st[1][0], st[0][1]]];
      if (cur.userIn && !cur.semis.flat().includes(U)) cur.userOut = true;
    }
    return cur;
  }
  if (cur.day === 3) {
    cur.final = cur.semis.map(([a, b]) => decide(a, b));
    cur.semis.forEach(([a, b], i) => { cur.lost[cur.final[i] === a ? b : a] = 3; });
    if (cur.userIn && !cur.final.includes(U)) cur.userOut = true;
    cur.day = 4;
    return cur;
  }
  const [a, b] = cur.final, w = decide(a, b);
  cur.champion = w; cur.lost[w === a ? b : a] = 4; cur.done = true;
  if (cur.userIn && w !== U) cur.userOut = true;
  cur.day = 5;
  return cur;
}

/** Tabelle einer Gruppe: Siege, bei Gleichstand direkte Begegnung, dann Rating. */
export function standings(c, cur, g) {
  return [...g].sort((a, b) => {
    if (cur.wins[b] !== cur.wins[a]) return cur.wins[b] - cur.wins[a];
    const m = cur.groupResults.find(x => (x.a === a && x.b === b) || (x.a === b && x.b === a));
    if (m) return m.w === a ? -1 : 1;
    return ratingOf(c, b) - ratingOf(c, a);
  });
}

// ---------- Turnier abschliessen ----------
/** Punkte eines Spielers in diesem Turnier. */
export function pointsFor(cur, idx) {
  const P = K.points[cur.cat];
  if (cur.cat === "final") {
    if (!cur.wins || !(idx in cur.wins)) return 0;
    let p = cur.wins[idx] * P.group;
    if (cur.final && cur.final.includes(idx)) p += P.SF;
    if (cur.champion === idx) p += P.F;
    return p;
  }
  if (!cur.rounds[0].includes(idx)) return 0;
  if (cur.champion === idx) return P.W;
  const r = cur.lost[idx];
  return P[roundKey(cur.size, r)] || 0;
}

/** Ergebnis eintragen (rollende Wertung), nächstes Turnier vorbereiten. Gibt eine Zusammenfassung zurück. */
export function closeTournament(c, track = true) {
  const cur = c.current, U = me(c), rolling = tierDef(c).tournaments.length;
  const before = ranks(c), ext = cur.external;
  for (let i = 0; i < c.results.length; i++) {
    c.results[i].push(i === U && ext ? ext.points : pointsFor(cur, i));
    if (c.results[i].length > rolling) c.results[i].shift();
  }
  const summary = ext
    ? { ti: cur.ti, tier: c.tier, season: c.season, champion: cur.champion, userIn: true, userPoints: ext.points, userWon: ext.won, duo: true }
    : { ti: cur.ti, tier: c.tier, season: c.season, champion: cur.champion, userIn: cur.userIn, userPoints: pointsFor(cur, U), userWon: cur.champion === U };
  if (track) {
    c.prevRanks = before;
    const after = ranks(c)[U];
    summary.rankBefore = before[U]; summary.rankAfter = after;
    c.stats.bestRank = Math.min(c.stats.bestRank, after);
    if (summary.userWon) c.stats.titles.push({ ti: cur.ti, season: c.season, tier: c.tier, ...(ext ? { duo: true } : {}) });
    c.history.push({ season: c.season, tier: c.tier, ti: cur.ti, points: summary.userPoints, result: ext ? ext.result : userResultKey(c, cur), duo: !!ext });
    if (c.history.length > 60) c.history.shift();
    c.tierPlayed = (c.tierPlayed || 0) + 1;
    summary.canPromote = false;
  }
  c.current = null;
  c.ti++;
  if (c.ti >= rolling) { c.ti = 0; c.season++; c.wildcardUsed = false; }
  if (track) summary.canPromote = canPromote(c);
  return summary;
}

/** Wie weit bist du gekommen? "W", "F", "SF", … oder "G" (Gruppe), "-" nicht gespielt. */
export function userResultKey(c, cur) {
  const U = me(c);
  if (!cur.userIn) return "-";
  if (cur.champion === U) return "W";
  if (cur.cat === "final") return cur.final && cur.final.includes(U) ? "F" : cur.semis && cur.semis.flat().includes(U) ? "SF" : "G";
  return roundKey(cur.size, cur.lost[U]);
}

/**
 * Ergebnis eines Turniers zu zweit in die eigene Karriere eintragen: Es ersetzt deinen nächsten
 * Turnierplatz der Saison (die Computerspieler spielen ihn ohne dich). Geht nur, wenn gerade kein
 * Karriere-Turnier läuft. Die Punkte richten sich nach der Kategorie dieses Turnierplatzes.
 * Gibt die Zusammenfassung zurück oder null.
 */
export function recordExternal(c, result, won, rand = Math.random) {
  if (c.current) return null;
  const P = K.points[tournament(c, c.ti).cat];
  const points = P[result] ?? (result === "W" ? P.W ?? P.F ?? 0 : 0);
  startTournament(c, c.ti, false, rand);
  simulateRest(c, rand);
  c.current.external = { points, result, won };
  return closeTournament(c, true);
}

// ---------- Computergegner aus Rating und Stil ----------
/** Werte für ai.js und rules.js aus einem Spieler { rating, style }: hw, up, ai { … }. */
export function levelFor(p, roundIndex, baseLv, tournamentBonus = 0) {
  const A = K.ai, S = K.styles[p.style] || {};
  const [r0, r1] = K.ratingRange;
  const r = clamp01((p.rating + roundIndex * K.roundBoost + tournamentBonus - r0) / (r1 - r0));
  const v = key => lerp(A[key][0], A[key][1], r);
  const ai = {
    err: v("err") * (S.err ?? 1), speed: v("speed") * (S.speed ?? 1), reaction: v("reaction"),
    angleRate: Math.min(0.7, v("angleRate") * (S.angleRate ?? 1)), superRate: Math.min(0.6, v("superRate") * (S.superRate ?? 1)),
    serve: {
      perfect: Math.min(0.7, v("servePerfect") * (S.servePerfect ?? 1)),
      fault1: Math.min(0.6, v("fault1") * (S.fault1 ?? 1)), fault2: Math.min(0.35, v("fault2") * (S.fault2 ?? 1)),
    },
  };
  return { ...baseLv, hw: baseLv.hw + (S.hw || 0), up: baseLv.up + (S.up || 0), ai, strength: r };
}
export function opponentLevel(c, idx, roundIndex, baseLv, tournamentBonus = 0) {
  return levelFor(player(c, idx), roundIndex, baseLv, tournamentBonus);
}

// ---------- Belohnungen ----------
/** Freigeschaltete Schlägerfarben. */
export function unlockedColors(c) {
  const s = c.stats, reached = c.tiersReached || [c.tier];
  return K.colors.filter(col =>
    (!col.wins || s.wins >= col.wins) && (!col.titles || s.titles.length >= col.titles) && (!col.tier || reached.includes(col.tier)));
}

/** Prüft eine geladene Karriere grob auf die richtige Form (vorher migrateCareer aufrufen). */
export function validCareer(c) {
  if (!c || c.v !== 2 || !TIER_PLAYERS[c.tier]) return false;
  const n = TIER_PLAYERS[c.tier].length;
  return Array.isArray(c.results) && c.results.length === n + 1 && c.results.every(r => Array.isArray(r) && r.every(Number.isFinite))
    && Number.isInteger(c.ti) && c.ti >= 0 && c.ti < tierDef(c).tournaments.length && Number.isInteger(c.season) && c.stats && typeof c.stats === "object";
}
