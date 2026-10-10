// Karriere: Tour mit 63 erfundenen Computerspielern und dir, 8 Turniere pro Saison, rollende Rangliste.
// Reine Logik ohne Darstellung: läuft im Browser und in tools/simulate.mjs (tour).
//
// Spieler-Index 0 … 62 = Computerspieler, 63 = du (USER).
// Ein Turnier ist ein K.-o.-Raster: rounds[0] sind die Startplätze, rounds[r + 1][k] gewinnt das Spiel
// rounds[r][2k] gegen rounds[r][2k + 1]. Das Saisonfinale hat zwei Vierergruppen, dann Halbfinal und Final.

import { BALANCE as B } from "./balance.js";

const K = B.career;
export const USER = 63;

// Name, Land, Stil, Rating. Erfunden; Ähnlichkeiten mit echten Spielern sind nicht beabsichtigt.
export const PLAYERS = [
  ["Viktor Lindqvist", "SE", "allround", 1950], ["Mateo Ibarra", "ES", "cannon", 1920], ["Felix Brandauer", "AT", "wall", 1900],
  ["Hugo Delacroix", "FR", "angle", 1880], ["Kenji Mori", "JP", "counter", 1860], ["Liam O'Rourke", "IE", "cannon", 1840],
  ["Davide Rinaldi", "IT", "allround", 1820], ["Jonas Achermann", "CH", "wall", 1800], ["Tomás Navarro", "AR", "angle", 1785],
  ["Erik Solberg", "NO", "counter", 1770], ["Pieter van Dijkhuis", "NL", "cannon", 1755], ["Marek Novotný", "CZ", "allround", 1740],
  ["Sam Whitfield", "GB", "angle", 1725], ["Lukas Reinholt", "DE", "wall", 1710], ["Bruno Carvalho", "BR", "cannon", 1695],
  ["Aleksi Virtanen", "FI", "counter", 1680], ["Ivan Petrović", "RS", "allround", 1665], ["Jae-won Park", "KR", "angle", 1650],
  ["Owen Mercer", "AU", "cannon", 1640], ["Mathis Lefort", "BE", "wall", 1630], ["Cole Harrington", "US", "cannon", 1620],
  ["Andrej Kovač", "HR", "angle", 1610], ["Nikola Dimitrov", "BG", "allround", 1600], ["Kasper Holm", "DK", "counter", 1590],
  ["Julien Moreau", "FR", "allround", 1580], ["Simon Gerber", "CH", "counter", 1570], ["Diego Restrepo", "CO", "angle", 1560],
  ["Tobias Krenn", "AT", "allround", 1550], ["Gabriel Lindgren", "SE", "wall", 1540], ["Nathan Bouchard", "CA", "cannon", 1530],
  ["Paweł Zieliński", "PL", "allround", 1520], ["Lorenzo Basile", "IT", "angle", 1510], ["Henrik Strand", "NO", "wall", 1500],
  ["Rafael Montes", "ES", "counter", 1490], ["Bence Horváth", "HU", "cannon", 1480], ["Timo Lobmeier", "DE", "allround", 1470],
  ["Arthur Penhallow", "GB", "wall", 1460], ["Yuto Hayashi", "JP", "angle", 1450], ["Mykola Bondar", "UA", "counter", 1440],
  ["Joel Wüthrich", "CH", "cannon", 1430], ["Ruben Vermeer", "NL", "allround", 1420], ["Théo Marchand", "MC", "angle", 1410],
  ["Ethan Calloway", "US", "counter", 1400], ["Lucas Pereira", "BR", "allround", 1390], ["Jakub Dvořák", "CZ", "wall", 1380],
  ["Emil Lundberg", "SE", "cannon", 1370], ["Niko Laine", "FI", "allround", 1360], ["Matteo Galli", "IT", "counter", 1350],
  ["Florian Haas", "DE", "angle", 1340], ["Ignacio Ferrer", "AR", "wall", 1330], ["Cian Gallagher", "IE", "allround", 1320],
  ["Damir Rakić", "HR", "cannon", 1310], ["Oliver Kent", "AU", "counter", 1300], ["Mads Kjær", "DK", "angle", 1290],
  ["Raphael Imhof", "CH", "allround", 1280], ["Tom Wagner", "LU", "wall", 1270], ["Ji-ho Shin", "KR", "cannon", 1260],
  ["Vincent Dubois", "BE", "counter", 1250], ["Patrick Lennox", "CA", "allround", 1240], ["Gustav Ek", "SE", "angle", 1230],
  ["Daniel Mráz", "CZ", "counter", 1220], ["Adrian Bühler", "CH", "cannon", 1210], ["Pablo Volea", "ES", "allround", 1200],
].map(([name, land, style, rating]) => ({ name, land, style, rating }));

const lerp = (a, b, t) => a + (b - a) * t;
const clamp01 = v => Math.max(0, Math.min(1, v));

// ---------- Karriere anlegen ----------
/** Neue Karriere: Die Computerspieler haben schon eine Saison hinter sich (Ranglistenpunkte), du startest auf Rang 64. */
export function newCareer(rand = Math.random) {
  const c = {
    v: 1, season: 1, ti: 0, wildcardUsed: false, current: null,
    results: Array.from({ length: 64 }, () => []),   // Punkte der letzten Turniere pro Spieler
    prevRanks: null, history: [],
    stats: { wins: 0, losses: 0, aces: 0, doubleFaults: 0, longestRally: 0, bestRank: 64, titles: [] },
    racket: "classic",
  };
  for (let t = 0; t < K.tournaments.length; t++) {    // Vorsaison ohne dich
    startTournament(c, t, false, rand);
    simulateRest(c, rand);
    closeTournament(c, false);
  }
  c.season = 1; c.ti = 0; c.wildcardUsed = false;   // die Vorsaison zählt nicht als deine Saison
  c.prevRanks = ranks(c);
  return c;
}

// ---------- Rangliste ----------
export const totalPoints = (c, i) => c.results[i].reduce((a, b) => a + b, 0);

/** Rangliste: [{ idx, points, rank }], bei Gleichstand entscheidet das Rating, du zuletzt. */
export function ranking(c) {
  const rows = c.results.map((r, idx) => ({ idx, points: totalPoints(c, idx) }));
  rows.sort((a, b) => b.points - a.points || ratingOf(b.idx) - ratingOf(a.idx));
  rows.forEach((r, i) => { r.rank = i + 1; });
  return rows;
}
export function ranks(c) { const m = new Array(64); ranking(c).forEach(r => { m[r.idx] = r.rank; }); return m; }
const ratingOf = idx => (idx === USER ? -1 : PLAYERS[idx].rating);

// ---------- Turniere ----------
export function tournament(ti) { return K.tournaments[ti]; }

/** Darfst du mitspielen? { ok, wildcard } – wildcard: nur mit Wildcard möglich. */
export function eligibility(c, ti) {
  const t = tournament(ti), rank = ranks(c)[USER];
  if (t.cat === "final") return { ok: rank <= 8, wildcard: false, rank };
  const need = K.entry[t.cat];
  if (!need || rank <= need) return { ok: true, wildcard: false, rank };
  return { ok: false, wildcard: !c.wildcardUsed, rank, need };
}

/** Startet ein Turnier: Teilnehmer wählen, Gesetzte verteilen. */
export function startTournament(c, ti, withUser, rand = Math.random) {
  const t = tournament(ti), rk = ranks(c);
  const [lo, hi] = K.pools[t.cat];
  const pool = [...Array(63).keys()].filter(i => rk[i] >= lo && rk[i] <= hi);
  const need = t.size - (withUser ? 1 : 0);
  // die besser Rangierten spielen eher: gewichtete Auswahl
  const chosen = [];
  const weighted = pool.map(i => ({ i, w: rand() * (1 + (hi - rk[i]) / (hi - lo + 1)) }));
  weighted.sort((a, b) => b.w - a.w);
  for (const { i } of weighted) { if (chosen.length >= need) break; chosen.push(i); }
  if (t.cat === "final") { chosen.length = 0; pool.sort((a, b) => rk[a] - rk[b]).slice(0, need).forEach(i => chosen.push(i)); }
  const entrants = withUser ? [...chosen, USER] : chosen;
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

/** Matchformat einer Runde: früh Kurzsatz bis 3, ab Halbfinal bis 4, Grand-Slam-Final zwei Gewinnsätze. */
export function formatFor(c, key) {
  const t = tournament(c.current.ti), F = K.format;
  if (key === "F" && t.finalSets) return F.gsFinal;
  return key === "F" || key === "SF" ? F.late : F.early;
}

/** Nächstes Spiel für dich: { opp, key, roundIndex } oder null. */
export function userNextMatch(c) {
  const cur = c.current;
  if (!cur || !cur.userIn || cur.userOut || cur.done) return null;
  if (cur.cat === "final") {
    if (cur.day < 3) {
      const g = cur.groups.find(gr => gr.includes(USER)), pairs = groupPairs(g, cur.day);
      const pr = pairs.find(([a, b]) => a === USER || b === USER);
      return { opp: pr[0] === USER ? pr[1] : pr[0], key: "G", roundIndex: cur.day };
    }
    if (cur.semis && cur.day === 3) { const pr = cur.semis.find(([a, b]) => a === USER || b === USER); if (pr) return { opp: pr[0] === USER ? pr[1] : pr[0], key: "SF", roundIndex: 3 }; }
    if (cur.final && cur.day === 4) { const [a, b] = cur.final; if (a === USER || b === USER) return { opp: a === USER ? b : a, key: "F", roundIndex: 4 }; }
    return null;
  }
  const r = cur.round, slots = cur.rounds[r], k = slots.indexOf(USER);
  if (k < 0) return null;
  return { opp: slots[k ^ 1], key: roundKey(cur.size, r), roundIndex: r };
}

/** Wahrscheinlichkeit, dass a gegen b gewinnt (Hintergrund-Simulation). */
export function winProb(a, b, roundIndex = 0) {
  const ra = ratingOf(a) + roundIndex * 0, rb = ratingOf(b);
  return 1 / (1 + Math.pow(10, (rb - ra) / K.elo));
}
const playOut = (a, b, rand) => (rand() < winProb(a, b) ? a : b);

/** Dein Match ist fertig: Ergebnis eintragen, die übrigen Spiele der Runde simulieren. */
export function recordUserMatch(c, won, rand = Math.random) {
  const cur = c.current;
  if (cur.cat === "final") return advanceFinal(c, won, rand);
  const r = cur.round, slots = cur.rounds[r], next = [];
  for (let k = 0; k < slots.length; k += 2) {
    const a = slots[k], b = slots[k + 1];
    let w;
    if (a === USER || b === USER) w = won ? USER : (a === USER ? b : a);
    else w = playOut(a, b, rand);
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
      const a = slots[k], b = slots[k + 1], w = playOut(a, b, rand);
      next.push(w); cur.lost[w === a ? b : a] = cur.round;
    }
    pushRound(c, next);
  }
}

// ---------- Saisonfinale ----------
export function groupPairs(g, day) { return [[[0, 1], [2, 3]], [[0, 2], [1, 3]], [[0, 3], [1, 2]]][day].map(([x, y]) => [g[x], g[y]]); }

/** Ein Spieltag (oder Halbfinal/Final) des Saisonfinales. won: dein Ergebnis oder null (ohne dich). */
function advanceFinal(c, won, rand) {
  const cur = c.current;
  const decide = (a, b) => (a === USER || b === USER) && won !== null ? (won ? USER : (a === USER ? b : a)) : playOut(a, b, rand);
  if (cur.day < 3) {
    for (const g of cur.groups) for (const [a, b] of groupPairs(g, cur.day)) {
      const w = decide(a, b); cur.wins[w]++; cur.groupResults.push({ a, b, w });
    }
    cur.day++;
    if (cur.day === 3) {
      const st = cur.groups.map(g => standings(cur, g));
      cur.semis = [[st[0][0], st[1][1]], [st[1][0], st[0][1]]];
      if (cur.userIn && !cur.semis.flat().includes(USER)) cur.userOut = true;
    }
    return cur;
  }
  if (cur.day === 3) {
    cur.final = cur.semis.map(([a, b]) => decide(a, b));
    cur.semis.forEach(([a, b], i) => { cur.lost[cur.final[i] === a ? b : a] = 3; });
    if (cur.userIn && !cur.final.includes(USER)) cur.userOut = true;
    cur.day = 4;
    return cur;
  }
  const [a, b] = cur.final, w = decide(a, b);
  cur.champion = w; cur.lost[w === a ? b : a] = 4; cur.done = true;
  if (cur.userIn && w !== USER) cur.userOut = true;
  cur.day = 5;
  return cur;
}

/** Tabelle einer Gruppe: Siege, bei Gleichstand direkte Begegnung, dann Rating. */
export function standings(cur, g) {
  return [...g].sort((a, b) => {
    if (cur.wins[b] !== cur.wins[a]) return cur.wins[b] - cur.wins[a];
    const m = cur.groupResults.find(x => (x.a === a && x.b === b) || (x.a === b && x.b === a));
    if (m) return m.w === a ? -1 : 1;
    return ratingOf(b) - ratingOf(a);
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
  const cur = c.current;
  const before = ranks(c);
  for (let i = 0; i < 64; i++) {
    c.results[i].push(pointsFor(cur, i));
    if (c.results[i].length > K.rolling) c.results[i].shift();
  }
  const summary = { ti: cur.ti, season: c.season, champion: cur.champion, userIn: cur.userIn, userPoints: pointsFor(cur, USER), userWon: cur.champion === USER };
  if (track) {
    c.prevRanks = before;
    const after = ranks(c)[USER];
    summary.rankBefore = before[USER]; summary.rankAfter = after;
    c.stats.bestRank = Math.min(c.stats.bestRank, after);
    if (summary.userWon) c.stats.titles.push({ ti: cur.ti, season: c.season });
    c.history.push({ season: c.season, ti: cur.ti, points: summary.userPoints, result: userResultKey(cur) });
    if (c.history.length > 40) c.history.shift();
  }
  c.current = null;
  c.ti++;
  if (c.ti >= K.tournaments.length) { c.ti = 0; c.season++; c.wildcardUsed = false; }
  return summary;
}

/** Wie weit bist du gekommen? "W", "F", "SF", … oder "G" (Gruppe), "-" nicht gespielt. */
export function userResultKey(cur) {
  if (!cur.userIn) return "-";
  if (cur.champion === USER) return "W";
  if (cur.cat === "final") return cur.final && cur.final.includes(USER) ? "F" : cur.semis && cur.semis.flat().includes(USER) ? "SF" : "G";
  return roundKey(cur.size, cur.lost[USER]);
}

// ---------- Computergegner aus Rating und Stil ----------
/** Werte für ai.js und rules.js: hw (Schlägerbreite), up (Tempozuwachs), ai { … }. */
export function opponentLevel(idx, roundIndex, baseLv, tournamentBonus = 0) {
  const p = PLAYERS[idx], A = K.ai, S = K.styles[p.style] || {};
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

// ---------- Belohnungen ----------
/** Freigeschaltete Schlägerfarben. */
export function unlockedColors(c) {
  const s = c.stats;
  return K.colors.filter(col =>
    (!col.wins || s.wins >= col.wins) && (!col.titles || s.titles.length >= col.titles) && (!col.rank || s.bestRank <= col.rank));
}

/** Prüft eine geladene Karriere grob auf die richtige Form. */
export function validCareer(c) {
  return c && c.v === 1 && Array.isArray(c.results) && c.results.length === 64 && c.results.every(r => Array.isArray(r) && r.every(Number.isFinite))
    && Number.isInteger(c.ti) && c.ti >= 0 && c.ti < K.tournaments.length && Number.isInteger(c.season) && c.stats && typeof c.stats === "object";
}
