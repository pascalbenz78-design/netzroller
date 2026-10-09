// Balance-Simulation, ohne Browser.
//   node tools/simulate.mjs [Punkte pro Stufe] [Startwert]     Computer gegen Computer
//   node tools/simulate.mjs machine [Durchgänge] [Startwert]  Ballmaschine: wie lange dauert ein Durchgang?
// Gibt pro Stufe aus: Länge der Ballwechsel, wie Punkte enden (Aus, Netz, Doppelfehler, Gewinnschlag),
// dazu Netzroller und Let. Richtwerte für Mittel: 5–8 Schläge, 10–20 % Aus, 3–8 % Doppelfehler.

import { BALANCE as B } from "../js/balance.js";
import * as R from "../js/rules.js";
import { createAI, aiIncoming, aiStep, aiWantsSuper, aiServeErr, aiServeSpot, aiIdle } from "../js/ai.js";
import * as MA from "../js/machine.js";

const MACHINE = process.argv[2] === "machine";
const args = MACHINE ? process.argv.slice(3) : process.argv.slice(2);
const N = +args[0] || (MACHINE ? 300 : 500);
let seed = +args[1] || 12345;
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
if (MACHINE) { simMachine(); process.exit(0); }
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

// ---------- Ballmaschine ----------
// Zwei Spielermodelle (der Computergegner als Ersatz für einen Menschen):
function players() {
  return [
    { name: "Gelegenheitsspieler", ai: { speed: 2.0, reaction: 0.25, err: 0.32, angleRate: 0.05, superRate: 0.1 } },
    { name: "geübter Spieler", ai: { speed: 3.0, reaction: 0.2, err: 0.22, angleRate: 0.05, superRate: 0.15 } },
  ];
}
function simMachine() {
  const MB = B.machine, lv = B.levels[1];
  console.log(`Ballmaschine: ${N} Durchgänge pro Spielermodell, Stufe ${lv.name}
`);
  console.log("| Spieler | Dauer Ø | Dauer Median | Punkte Ø | Rückschläge Ø | beste Kombo Ø | Höchsttempo Ø |");
  console.log("|---|---|---|---|---|---|---|");
  for (const pl of players()) {
    const plv = { ...lv, ai: { ...lv.ai, ...pl.ai } };
    const res = [];
    for (let i = 0; i < N; i++) {
      const run = MA.createRun(lv, rand), me = createAI(plv, rand);
      let t = MB.firstDelay;
      while (!run.over) {
        const sh = MA.nextMachineShot(run);
        aiIncoming(me, sh);
        const tl = R.timeline(sh);
        for (let k = 0; k < tl.tRacket; k += DT) aiStep(me, DT);
        t += tl.tRacket;
        const xr = 1 - R.xAt(sh, 2), reach = lv.hw + R.C.ballR;
        if (Math.abs(xr - me.x) > reach) { MA.onError(run); t += MB.firstDelay; continue; }
        const sup = rand() < pl.ai.superRate;
        const mine = R.makeRallyShot({ x0: xr, off: (xr - me.x) / reach, pv: me.vel, prevNormal: run.speed / lv.up, sup }, lv, rand, { noFloor: true, maxSpeed: Infinity });
        const mt = R.timeline(mine);
        if (mine.res !== "in") { MA.onError(run); t += mt.tNet + MB.firstDelay; continue; }
        MA.onReturn(run, mine.bx, 1 - mine.bd, sup);
        MA.stepTargets(run, tl.tRacket + mt.tBounce + MB.nextDelay);
        t += mt.tBounce + MB.nextDelay;
        aiIdle(me, 0.5);
      }
      res.push({ t, points: run.points, returns: run.returns, combo: run.bestCombo, kmh: MA.kmh(run.maxSpeed) });
    }
    const avg = k => res.reduce((a, r) => a + r[k], 0) / res.length;
    const med = [...res].sort((a, b) => a.t - b.t)[Math.floor(res.length / 2)].t;
    const mmss = x => `${Math.floor(x / 60)}:${String(Math.round(x % 60)).padStart(2, "0")}`;
    console.log(`| ${pl.name} | ${mmss(avg("t"))} | ${mmss(med)} | ${Math.round(avg("points"))} | ${avg("returns").toFixed(0)} | ${avg("combo").toFixed(0)} | ${Math.round(avg("kmh"))} km/h |`);
  }
}
