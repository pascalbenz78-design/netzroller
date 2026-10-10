// Turnier zu zweit: zwei (später bis vier) Menschen im selben Turnierfeld mit Computerspielern.
// Reine Logik ohne Darstellung und Netzwerk. Das eröffnende Handy führt den Turnierstand und schickt
// ihn als Ganzes (klein genug fürs Präsenz-Objekt); das andere Handy zeigt ihn nur an.
//
// Plätze im Raster: Zahl = Computerspieler (Index in tour.PLAYERS), Text "H0", "H1", … = Mensch.
// Jeder Mensch bekommt einen eigenen Abschnitt des Felds (Hälfte bei 2, Viertel bei 4): So treffen sich
// Menschen frühestens im Final (bei 4 im Halbfinal).

import { BALANCE as B } from "./balance.js";
import * as TO from "./tour.js";
import { TIER_PLAYERS } from "./tiers.js";

const D = B.duoTour;
const isHuman = p => typeof p === "string";
const shuffle = (a, rand) => { for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(rand() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; } return a; };

/**
 * Neues Turnier.
 * @param humans [{ id: "H0", name, land }, …] (2 oder 4)
 * @param career Karriere des eröffnenden Handys: Die Computerspieler kommen aus deren Stufe
 */
export function createDuoTour(humans, career, rand = Math.random) {
  const size = D.size, nH = humans.length, sec = size / nH, ranks = TO.ranks(career), n = TO.players(career).length;
  // ohne die drei Besten der Stufe; reicht das Feld nicht, kommen auch sie dazu
  let pool = shuffle([...Array(n).keys()].filter(i => ranks[i] > 3), rand);
  if (pool.length < size - nH) pool = shuffle([...Array(n).keys()], rand);
  const cpu = pool.slice(0, size - nH).sort((a, b) => ranks[a] - ranks[b]);
  const slots = new Array(size).fill(null);
  // Gesetzte Computerspieler wie in der Karriere
  const S = size / 4, seedPos = [[0], [size - 1], shuffle([size / 2 - 1, size / 2], rand), shuffle([size / 4 - 1, size / 4, (3 * size) / 4 - 1, (3 * size) / 4], rand)].flat();
  cpu.slice(0, S).forEach((p, i) => { slots[seedPos[i]] = p; });
  // Menschen: je ein freier Platz in ihrem Abschnitt
  humans.forEach((h, k) => {
    const free = [];
    for (let i = k * sec; i < (k + 1) * sec; i++) if (slots[i] === null) free.push(i);
    slots[free[Math.floor(rand() * free.length)]] = h.id;
  });
  const rest = shuffle(cpu.slice(S), rand);
  for (let i = 0, j = 0; i < size; i++) if (slots[i] === null) slots[i] = rest[j++];
  const surfaces = D.surfaces;
  return {
    v: 1, id: Math.random().toString(36).slice(2, 8), rev: 1, size, cat: D.cat, tier: career.tier,
    surface: surfaces[Math.floor(rand() * surfaces.length)],
    humans, rounds: [slots], round: 0, res: {}, lost: {}, champion: null, done: false,
  };
}

const roundKey = (st, r) => TO.roundKey(st.size, r);

/** Nächstes Spiel eines Menschen: { opp, vsHuman, key, round } oder null (ausgeschieden, wartet, fertig). */
export function humanMatch(st, hid) {
  if (st.done) return null;
  const slots = st.rounds[st.round], k = slots.indexOf(hid);
  if (k < 0) return null;
  if (st.res[st.round + ":" + hid] !== undefined) return null;   // schon gespielt, wartet auf die Runde
  const opp = slots[k ^ 1];
  return { opp, vsHuman: isHuman(opp), key: roundKey(st, st.round), round: st.round };
}

/** Ist dieser Mensch noch im Turnier? */
export const alive = (st, hid) => !st.done && st.rounds[st.round].includes(hid);

/** Ergebnis eines Menschen in der laufenden Runde eintragen (bei Mensch gegen Mensch: Sieger für beide). */
export function report(st, hid, round, won) {
  if (round !== st.round || st.done) return false;
  const slots = st.rounds[st.round], k = slots.indexOf(hid);
  if (k < 0) return false;
  st.res[round + ":" + hid] = won;
  const opp = slots[k ^ 1];
  if (isHuman(opp)) st.res[round + ":" + opp] = !won;
  return true;
}

/** Alle Menschen dieser Runde haben gespielt? */
export function roundComplete(st) {
  if (st.done) return false;
  return st.rounds[st.round].filter(isHuman).every(h => st.res[st.round + ":" + h] !== undefined);
}

/** Runde abschliessen: Computerspiele simulieren, nächste Runde bilden. */
export function advance(st, rand = Math.random) {
  const slots = st.rounds[st.round], next = [];
  for (let k = 0; k < slots.length; k += 2) {
    const a = slots[k], b = slots[k + 1];
    let w;
    if (isHuman(a) || isHuman(b)) {
      const h = isHuman(a) ? a : b;
      w = st.res[st.round + ":" + h] ? h : (h === a ? b : a);
    } else w = rand() < TO.winProbRating(cpuPlayer(st, a).rating, cpuPlayer(st, b).rating) ? a : b;
    next.push(w);
    st.lost[w === a ? b : a] = st.round;
  }
  st.rounds.push(next); st.round++; st.rev++;
  if (next.length === 1) { st.champion = next[0]; st.done = true; }
  // Sind keine Menschen mehr dabei, wird der Rest gleich durchgespielt
  if (!st.done && !next.some(isHuman)) advance(st, rand);
}

/** Ergebnis eines Menschen: "W", "F", "SF", … */
export function resultKey(st, hid) {
  if (st.champion === hid) return "W";
  return st.lost[hid] !== undefined ? roundKey(st, st.lost[hid]) : "-";
}

/** Ranglistenpunkte für die eigene Karriere (Tabelle der Kategorie). */
export function pointsFor(st, hid) {
  const P = B.career.points[st.cat], key = resultKey(st, hid);
  return key === "-" ? 0 : P[key] || 0;
}

/** Name und Land eines Platzes für die Anzeige. */
export function who(st, p) {
  if (isHuman(p)) { const h = st.humans.find(x => x.id === p); return { name: h ? h.name : "?", land: h ? h.land : "NR", human: true }; }
  const pl = cpuPlayer(st, p);
  return { name: pl.name, land: pl.land, style: pl.style, human: false };
}

/** Computerspieler eines Platzes (aus der Stufe des Turniers). */
export function cpuPlayer(st, p) { return TIER_PLAYERS[st.tier || "WORLD"][p]; }

/** Grobe Prüfung eines empfangenen Turnierstands. */
export function validDuo(st) {
  return st && st.v === 1 && Array.isArray(st.rounds) && st.rounds.length >= 1 && Array.isArray(st.humans)
    && TIER_PLAYERS[st.tier || "WORLD"]
    && st.rounds.every(r => Array.isArray(r) && r.every(p => typeof p === "string" || (Number.isInteger(p) && p >= 0 && p < TIER_PLAYERS[st.tier || "WORLD"].length)))
    && Number.isInteger(st.round) && st.round < st.rounds.length && typeof st.res === "object";
}
