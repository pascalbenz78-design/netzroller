// Ballmaschine: Endlos-Modus mit Leben, Kombo, Zielscheiben und Highscore.
// Reine Logik ohne Darstellung: läuft im Browser und in tools/simulate.mjs.
//
// Koordinaten wie auf dem eigenen Bildschirm: Spieler bei v = +1, Maschine bei v = -1.
// Zielscheiben liegen in der Hälfte der Maschine (v < 0).

import { BALANCE as B } from "./balance.js";
import { C, clamp, makeMachineShot } from "./rules.js";

const M = B.machine;

export function createRun(lv, rand = Math.random) {
  const run = {
    lv, rand, lives: M.lives, points: 0, combo: 0, bestCombo: 0, returns: 0,
    speed: lv.base * M.startSpeed, maxSpeed: 0, machineX: 0.5, targets: [], over: false,
  };
  for (let i = 0; i < M.targets.count; i++) run.targets.push(newTarget(run));
  return run;
}

export function multiplier(combo) {
  for (const [from, mult] of M.combo) if (combo >= from) return mult;
  return 1;
}
export const kmh = speed => Math.round(speed * M.kmhPerSpeed);

/** Nächster Ball der Maschine (Datensatz im Blick der Maschine). */
export function nextMachineShot(run) {
  const rand = run.rand;
  const [a, b] = M.moveRange;
  run.machineX = a + (b - a) * rand();                           // Bildschirm-x der Maschine
  const spread = Math.min(M.spread.max, M.spread.start + run.returns * M.spread.perReturn);
  let cv = 0;
  if (run.returns >= M.spin.from && rand() < M.spin.chance) {
    const [c0, c1] = M.spin.amount;
    cv = (rand() < 0.5 ? -1 : 1) * (c0 + (c1 - c0) * rand());
  }
  run.maxSpeed = Math.max(run.maxSpeed, run.speed);
  return makeMachineShot({ x0: 1 - run.machineX, speed: run.speed, spread, cv }, rand);
}

/**
 * Dein Rückschlag ist im Feld aufgesprungen.
 * @param bx, bv  Aufsprung auf dem eigenen Bildschirm (bv < 0: Hälfte der Maschine)
 * @returns { gained, target } für die Anzeige
 */
export function onReturn(run, bx, bv, sup) {
  run.returns++; run.combo++;
  run.bestCombo = Math.max(run.bestCombo, run.combo);
  const mult = multiplier(run.combo);
  let gained = M.pointsPerReturn * mult, target = null;
  // Zielscheibe als Ellipse: quer in Platzbreiten, längs in v (Ball zählt, wenn er sie berührt)
  const i = run.targets.findIndex(t => ((bx - t.x) / (t.r + C.ballR)) ** 2 + ((bv - t.v) / (t.r + C.ballRV)) ** 2 <= 1);
  if (i >= 0) {
    target = run.targets[i];
    const bonus = M.targets.bonus * (sup ? M.targets.superMult : 1) * mult;
    gained += bonus;
    target.hit = true;
    run.targets[i] = newTarget(run);
  }
  run.points += gained;
  run.speed *= M.growth;
  return { gained, target, mult };
}

/** Verpasst oder ins Aus/Netz gespielt: ein Leben weniger. */
export function onError(run) {
  run.lives--; run.combo = 0;
  run.speed = Math.max(run.lv.base * M.startSpeed, run.speed * M.afterError);
  if (run.lives <= 0) run.over = true;
  return run.lives;
}

/** Zielscheiben altern und werden ersetzt. */
export function stepTargets(run, dt) {
  for (let i = 0; i < run.targets.length; i++) {
    run.targets[i].age += dt;
    if (run.targets[i].age >= M.targets.ttl) run.targets[i] = newTarget(run);
  }
}

/** Neue Zielscheibe, die keine andere überdeckt (höchstens 8 Versuche). */
function newTarget(run) {
  let t;
  for (let k = 0; k < 8; k++) {
    t = rollTarget(run);
    if (run.targets.every(o => Math.hypot(o.x - t.x, o.v - t.v) > o.r + t.r + 0.04)) break;
  }
  return t;
}

function rollTarget(run) {
  const T = M.targets, rand = run.rand;
  const r = Math.max(T.rMin, T.r - run.returns * T.shrinkPer);
  const [v0, v1] = T.area;                                       // Abstand vom Netz (Anteil der Grundlinie)
  return {
    x: clamp(C.singlesL + r + rand() * (C.singlesR - C.singlesL - 2 * r), 0, 1),
    v: -(v0 + (v1 - v0) * rand()) * C.baseline,
    r, age: 0,
  };
}

// ---------- Highscore (lokale Top 10) ----------
/** Trägt einen Durchgang ein. Gibt den Rang zurück (0 = neuer Rekord) oder -1, wenn er nicht reicht. */
export function addHighscore(list, entry) {
  const all = [...list, entry].sort((a, b) => b.points - a.points || a.date.localeCompare(b.date));
  const top = all.slice(0, M.topCount);
  list.length = 0; list.push(...top);
  return top.indexOf(entry);
}
