// Balance-Simulation: Computer gegen Computer, ohne Browser.
//   node tools/simulate.mjs [Punkte pro Stufe] [Startwert]
// Gibt pro Stufe aus: Länge der Ballwechsel, wie Punkte enden (Aus, Netz, Doppelfehler, Gewinnschlag),
// dazu Netzroller und Let. Richtwerte für Mittel: 5–8 Schläge, 10–20 % Aus, 3–8 % Doppelfehler.

import { BALANCE as B } from "../js/balance.js";
import * as R from "../js/rules.js";
import { createAI, aiIncoming, aiStep, aiWantsSuper, aiServeErr, aiServeSpot, aiIdle } from "../js/ai.js";

const N = +process.argv[2] || 500;
let seed = +process.argv[3] || 12345;
const rand = () => { seed = (seed * 1664525 + 1013904223) >>> 0; return seed / 4294967296; };   // reproduzierbar
const DT = 1 / 60;

function simPoint(lv, side, st) {
  const ai = [createAI(lv, rand), createAI(lv, rand)];
  let no = 1;
  // Aufschlag: A (Index 0) schlägt auf
  for (;;) {
    ai[0].x = aiServeSpot(ai[0], side);
    const sh = R.makeServe({ x0: ai[0].x, side, no, err: aiServeErr(ai[0], no) }, lv, rand);
    if (sh.nc) st.netcord++;
    if (sh.res === "let") { st.let++; continue; }
    if (sh.res === "fault") {
      if (no === 1) { no = 2; st.fault1++; continue; }
      st.end.df++; return;
    }
    return rally(sh, 0, ai, lv, st);
  }
}

function rally(sh, hitter, ai, lv, st) {
  let strokes = 1, maxSpeed = 0;
  for (;;) {
    const recv = 1 - hitter;
    aiIncoming(ai[recv], sh);
    aiIdle(ai[hitter], 0.5);
    const tl = R.timeline(sh);
    maxSpeed = Math.max(maxSpeed, sh.s1);
    if (sh.res === "in") st.minTime = Math.min(st.minTime, tl.tRacket);
    if (sh.res === "out") { st.end.out++; break; }
    if (sh.res === "net") { st.end.net++; break; }
    for (let t = 0; t < tl.tRacket; t += DT) { aiStep(ai[recv], DT); aiStep(ai[hitter], DT); }
    const xr = 1 - R.xAt(sh, 2);
    const reach = lv.hw + R.C.ballR;
    if (Math.abs(xr - ai[recv].x) > reach) { st.end[strokes === 1 ? "ace" : "winner"]++; break; }
    const off = (xr - ai[recv].x) / reach;
    const sup = aiWantsSuper(ai[recv]);
    if (sup) st.supers++;
    sh = R.makeRallyShot({ x0: xr, off, pv: ai[recv].vel, prevNormal: sh.ns, sup }, lv, rand);
    if (sh.nc) st.netcord++;
    if (sh.frame) st.frames++;
    strokes++;
    hitter = recv;
  }
  st.rallies.push(strokes);
}

const pct = (a, n) => (100 * a / n).toFixed(1) + " %";
const rows = [];
for (const lv of B.levels) {
  const st = { end: { out: 0, net: 0, df: 0, winner: 0, ace: 0 }, rallies: [], netcord: 0, let: 0, fault1: 0, supers: 0, frames: 0, minTime: Infinity };
  for (let i = 0; i < N; i++) simPoint(lv, i % 2 ? "ad" : "deuce", st);
  const r = st.rallies, mean = r.reduce((a, b) => a + b, 0) / r.length;
  const sorted = [...r].sort((a, b) => a - b), median = sorted[Math.floor(sorted.length / 2)];
  rows.push([lv.name, mean.toFixed(1), median, pct(st.end.out, N), pct(st.end.net, N), pct(st.end.df, N),
             pct(st.end.winner + st.end.ace, N), pct(st.end.ace, N), pct(st.fault1, N), st.netcord, st.let, st.minTime.toFixed(2) + " s (min. " + lv.minReaction + ")"]);
}
console.log(`Simulation: ${N} Punkte pro Stufe, Computer gegen Computer\n`);
console.log("| Stufe | Schläge Ø | Median | Aus | Netz | Doppelfehler | Gewinnschlag | davon Ass | 1. Aufschlag Fehler | Netzroller | Let | kürzeste Flugzeit |");
console.log("|---|---|---|---|---|---|---|---|---|---|---|---|");
for (const r of rows) console.log("| " + r.join(" | ") + " |");
