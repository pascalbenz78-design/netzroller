// Computergegner. Er nutzt dieselbe Schnittstelle wie ein Mensch: Er bewegt seinen Schläger,
// und getroffen wird nur, wenn Ball und Schläger sich wirklich treffen (rules.js entscheidet den Rest).
// Alles im eigenen Blick der KI: Sie steht bei v = +1, wie ein Mensch auf dem eigenen Handy.

import { BALANCE as B } from "./balance.js";
import { C, clamp, gauss, xAt, serveZone } from "./rules.js";

export function createAI(lv, rand = Math.random) {
  return { lv, rand, x: 0.5, target: 0.5, react: 0, vel: 0, supers: B.supersPerRally };
}

/** Ein Schlag des Gegners kommt (Datensatz im Blick des Gegners). Die KI plant, wo sie den Ball treffen will. */
export function aiIncoming(ai, sh) {
  const A = ai.lv.ai, rand = ai.rand;
  ai.react = A.reaction * (0.7 + 0.6 * rand());
  if (sh.res !== "in") { ai.target = 0.5; return; }          // Aus, Netz, Fehler: nicht hinterherlaufen
  const xr = 1 - xAt(sh, 2);                                  // dort kommt der Ball an der eigenen Schlägerlinie an
  const sg = rand() < 0.5 ? -1 : 1;
  const want = rand() < A.angleRate ? sg * (0.62 + 0.18 * rand()) : sg * 0.5 * rand();
  const off = want + gauss(rand) * A.err;
  ai.target = clamp(xr - off * (ai.lv.hw + C.ballR), ai.lv.hw, 1 - ai.lv.hw);
}

export function aiIdle(ai, x = 0.5) { ai.target = x; ai.react = 0; }

export function aiStep(ai, dt) {
  if (ai.react > 0) { ai.react -= dt; ai.vel = 0; return; }
  const m = ai.lv.ai.speed * dt;
  const step = clamp(ai.target - ai.x, -m, m);
  ai.x = clamp(ai.x + step, ai.lv.hw, 1 - ai.lv.hw);
  ai.vel = dt > 0 ? step / dt : 0;
}

export function aiWantsSuper(ai) {
  if (ai.supers > 0 && ai.rand() < ai.lv.ai.superRate) { ai.supers--; return true; }
  return false;
}

/** Abweichung vom idealen Aufschlagmoment, gewürfelt nach Stärke (siehe BALANCE.levels[].ai.serve). */
export function aiServeErr(ai, no) {
  const W = no === 1 ? B.serve.first : B.serve.second, P = ai.lv.ai.serve, rand = ai.rand;
  const sg = rand() < 0.5 ? -1 : 1, r = rand();
  const fault = no === 1 ? P.fault1 : P.fault2;
  if (r < fault) return sg * Math.min(1, W.good + 0.01 + (1 - W.good) * 0.9 * rand());
  if (r < fault + P.perfect) return sg * W.perfect * 0.9 * rand();
  return sg * (W.perfect + (W.good - W.perfect) * rand());
}

/** Aufschlagposition: irgendwo in der Aufschlagzone (Mitte, Körper oder aussen). */
export function aiServeSpot(ai, side) {
  const [a, b] = serveZone(side);
  return a + (b - a) * ai.rand();
}
