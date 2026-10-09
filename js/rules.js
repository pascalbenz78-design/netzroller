// Spielregeln ohne Darstellung und Eingabe. Läuft im Browser und in Node (tools/simulate.mjs).
//
// Ein Schlag ist ein Datensatz im Blick des Schlagenden (er steht bei v = +1 und schlägt nach oben).
// Beide Handys rechnen aus demselben Datensatz denselben Flug, Aufsprung und Entscheid.
//   { kind, x0, xn, bx, bd, s1, s2, res, why, nc, serve, sup, ns, frame, quality }
//   x0  Querposition beim Schlag       xn  Querposition über dem Netz
//   bx  Querposition beim Aufsprung    bd  Fortschritt beim Aufsprung (1 + Abstand vom Netz)
//   s1  Tempo bis zum Netz             s2  Tempo nach dem Netz (kleiner bei Netzroller)
//   res "in" | "out" | "net" | "fault" | "let"     why "wide" | "long" | "net" | null
//   nc  Netzroller   serve 0 | 1 | 2   sup Super-Schlag   ns normales Tempo des Ballwechsels

import { BALANCE as B } from "./balance.js";

export const C = B.court;
export const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
const lerp = (a, b, t) => a + (b - a) * t;
const uni = (rand, [a, b]) => a + (b - a) * rand();
const SH = (C.singlesR - C.singlesL) / 2;   // halbe Einzelbreite

export function gauss(rand) {
  const u = Math.max(rand(), 1e-9), v = rand();
  return Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * v);
}

// ---------- Linienentscheide ----------
export function lateralIn(bx) { return bx >= C.singlesL - C.ballR && bx <= C.singlesR + C.ballR; }
export function depthIn(bv, limit) { return bv <= limit + C.ballRV; }
/** Abstand des Aufsprungs zur nächsten relevanten Linie (für knappe Bälle / Hawk-Eye in Phase 2). */
export function lineGap(sh) {
  const bv = sh.bd - 1;
  const lim = sh.serve ? C.serviceLine : C.baseline;
  const side = Math.min(Math.abs(sh.bx - C.singlesL), Math.abs(sh.bx - C.singlesR));
  return Math.min(side, Math.abs(bv - lim));
}

// ---------- Flugbahn ----------
/** Zeiten der Ereignisse eines Schlags in Sekunden ab dem Schlag. */
export function timeline(sh) {
  const s3 = sh.s2 * B.flight.afterBounce;
  const tNet = 1 / sh.s1;
  const tBounce = tNet + (sh.bd - 1) / sh.s2;
  const tRacket = tBounce + (2 - sh.bd) / s3;
  return { tNet, tBounce, tRacket, s3 };
}

/** Position eines Schlags nach t Sekunden: Fortschritt d, Querposition x (Blick des Schlagenden), Höhe h. */
export function at(sh, t) {
  const tl = timeline(sh);
  let d;
  if (t <= tl.tNet) d = t * sh.s1;
  else if (sh.why === "net") d = 1 - 0.03;                       // bleibt im Netz hängen
  else if (t <= tl.tBounce) d = 1 + (t - tl.tNet) * sh.s2;
  else d = sh.bd + (t - tl.tBounce) * tl.s3;
  if (sh.why === "net") d = Math.min(d, 0.97);
  const x = xAt(sh, d);
  let h;
  const arc = sh.sup ? B.flight.arcSuper : B.flight.arc;
  if (sh.why === "net" && t > tl.tNet) h = Math.max(0, 0.05 - (t - tl.tNet) * 0.2);
  else if (d <= sh.bd) {
    const u = d / sh.bd, h0 = sh.serve ? B.serve.height : 0.02;
    h = h0 * (1 - u) + arc * 4 * u * (1 - u);
  } else {
    // nach dem Aufsprung ein kleiner zweiter Bogen bis auf Schlaghöhe beim Empfänger
    const w = (d - sh.bd) / Math.max(2 - sh.bd, 0.05);
    h = w <= 1 ? B.flight.arcAfter * 4 * w * (1 - w) + 0.02 * w : 0.02;
  }
  return { d, x, h, bounced: sh.why !== "net" && t >= tl.tBounce };
}

export function xAt(sh, d) {
  if (d <= 1) return sh.x0 + (sh.xn - sh.x0) * d;
  const slope = (sh.bx - sh.xn) / Math.max(sh.bd - 1, 0.02);
  return sh.xn + slope * (d - 1);
}

/** Begrenzt das Tempo so, dass der Empfänger mindestens minReaction Sekunden hat. */
function applyReactionFloor(sh, minReaction) {
  if (!minReaction) return sh;
  const t = timeline(sh).tRacket;
  if (t < minReaction) { const k = t / minReaction; sh.s1 *= k; sh.s2 *= k; }
  return sh;
}

function finish(sh, lv, rand, opts) {
  // Netzroller: nur bei Bällen, die das Netz überqueren
  if (sh.why !== "net" && rand() < (opts.netcordChance ?? B.netcord.chance)) {
    sh.nc = true;
    sh.s2 = sh.s1 * B.netcord.slow;
    const bv = uni(rand, B.netcord.bounce);
    sh.bx = clamp(lerp(sh.xn, sh.bx, 0.5) + (rand() * 2 - 1) * B.netcord.deflect, 0.02, 0.98);
    sh.bd = 1 + bv;
    judge(sh);
  }
  if (!opts.noFloor) applyReactionFloor(sh, lv.minReaction);
  return sh;
}

function judge(sh) {
  const bv = sh.bd - 1;
  if (sh.why === "net") { sh.res = sh.serve ? "fault" : "net"; return; }
  if (sh.serve) {
    const deuce = sh.side === "deuce";
    const lo = deuce ? C.singlesL : 0.5, hi = deuce ? 0.5 : C.singlesR;
    const inBox = sh.bx >= lo - C.ballR && sh.bx <= hi + C.ballR && depthIn(bv, C.serviceLine);
    if (inBox) { sh.res = sh.nc ? "let" : "in"; sh.why = null; }
    else { sh.res = "fault"; sh.why = depthIn(bv, C.serviceLine) ? "wide" : "long"; }
    return;
  }
  if (!lateralIn(sh.bx)) { sh.res = "out"; sh.why = "wide"; }
  else if (!depthIn(bv, C.baseline)) { sh.res = "out"; sh.why = "long"; }
  else { sh.res = "in"; sh.why = null; }
}

// ---------- Rückschlag ----------
/**
 * @param o.x0  Querposition des Balls beim Schlag
 * @param o.off Trefferpunkt auf dem Schläger, -1 (linker Rand) .. +1 (rechter Rand)
 * @param o.pv  Schlägertempo quer (Platzbreiten/s)
 * @param o.prevNormal  normales Tempo des letzten Schlags
 */
export function makeRallyShot(o, lv, rand = Math.random, opts = {}) {
  const Z = B.zones, a = Math.abs(o.off), sg = o.off < 0 ? -1 : 1;
  const normal = Math.min(o.prevNormal * lv.up, opts.maxSpeed ?? lv.max);
  let speed = o.sup ? normal * B.superMult : normal;
  const pvAim = clamp(o.pv * Z.paddleInfluence, -Z.paddleAimMax, Z.paddleAimMax);
  let lat, f, why = null, frame = false;
  if (a <= Z.center) lat = (a / Z.center) * Z.centerAim;
  else if (a <= Z.outer) lat = Z.centerAim + ((a - Z.center) / (Z.outer - Z.center)) * (Z.outerAimMax - Z.centerAim);
  else frame = true;

  let bx;
  if (!frame) {
    bx = 0.5 + (sg * lat + pvAim + (rand() * 2 - 1) * Z.aimNoise) * SH;
    f = o.sup ? uni(rand, a <= Z.center ? B.depth.superCenter : B.depth.superOuter) : uni(rand, B.depth.normal);
  } else {
    const r = rand();
    if (r < B.frame.net) { why = "net"; bx = 0.5 + sg * SH * 0.5; f = 0.5; }
    else if (r < B.frame.net + B.frame.out) {
      if (rand() < 0.5) { bx = 0.5 + sg * SH * uni(rand, [1.12, 1.35]); f = uni(rand, B.depth.normal); }
      else { bx = 0.5 + (rand() * 2 - 1) * SH * 0.6; f = uni(rand, B.depth.frameLong); }
    } else {
      speed = normal * B.frame.weakSpeed;
      bx = 0.5 + (rand() * 2 - 1) * SH * 0.6;
      f = uni(rand, B.depth.frameWeak);
    }
  }
  const bv = clamp(C.serviceLine + f * (C.baseline - C.serviceLine), 0.12, C.bounceMax);
  const sh = { kind: "rally", x0: o.x0, bx, bd: 1 + bv, s1: speed, s2: speed, why, nc: false,
               serve: 0, sup: !!o.sup, ns: normal, frame, res: "in" };
  sh.xn = sh.x0 + (sh.bx - sh.x0) / sh.bd;
  judge(sh);
  return finish(sh, lv, rand, opts);
}

// ---------- Aufschlag ----------
/** Wo steht der Aufschläger (eigener Blick)? Einstand-Seite = rechts der Mitte. */
export function serveZone(side) {
  const S = B.serve;
  return side === "deuce" ? [S.zoneInner, S.zoneOuter] : [1 - S.zoneOuter, 1 - S.zoneInner];
}
/** Aufschlagfeld beim Gegner (Blick des Aufschlägers): diagonal gegenüber. */
export function serviceBox(side) {
  return side === "deuce" ? [C.singlesL, 0.5] : [0.5, C.singlesR];
}

/**
 * @param o.x0   Position des Aufschlägers (eigener Blick)
 * @param o.side "deuce" | "ad"
 * @param o.no   1 | 2
 * @param o.err  Abweichung vom idealen Moment, -1 (viel zu früh) .. +1 (viel zu spät)
 */
export function makeServe(o, lv, rand = Math.random, opts = {}) {
  const S = B.serve, W = o.no === 1 ? S.first : S.second;
  const [z0, z1] = serveZone(o.side);
  const deuce = o.side === "deuce";
  const a = clamp(deuce ? (o.x0 - z0) / (z1 - z0) : (z1 - o.x0) / (z1 - z0), 0, 1);   // 0 = Mitte, 1 = aussen
  const [b0, b1] = serviceBox(o.side);
  const tIn = deuce ? b1 - 0.035 : b0 + 0.035, tOut = deuce ? b0 + 0.035 : b1 - 0.035;
  const target = lerp(tIn, tOut, a), boxMid = (b0 + b1) / 2;

  const e = Math.abs(o.err);
  let quality, speed, bx, bv, why = null;
  if (e <= W.perfect) quality = "perfect";
  else if (e <= W.good) quality = "good";
  else quality = o.err < 0 ? "net" : "long";

  if (o.no === 1) speed = lv.base * (quality === "perfect" ? S.speed.perfect : S.speed.good);
  else speed = lv.base * S.speed.second * (quality === "perfect" ? 1.1 : 1);
  if (o.sup) speed *= B.superMult;

  if (quality === "perfect") { bx = target + (rand() * 2 - 1) * 0.01; bv = C.serviceLine * uni(rand, S.depthPerfect); }
  else { bx = lerp(target, boxMid, S.goodPull) + (rand() * 2 - 1) * 0.04; bv = C.serviceLine * uni(rand, S.depthGood); }
  if (o.sup) bv += 0.06;
  if (quality === "net") why = "net";
  if (quality === "long") bv = C.serviceLine + uni(rand, S.long);

  const sh = { kind: "serve", x0: o.x0, bx, bd: 1 + Math.min(bv, C.bounceMax), s1: speed, s2: speed, why, nc: false,
               serve: o.no, side: o.side, sup: !!o.sup, ns: lv.base, frame: false, quality, res: "in" };
  sh.xn = sh.x0 + (sh.bx - sh.x0) / sh.bd;
  judge(sh);
  return finish(sh, lv, rand, opts);
}

// ---------- Zählweise ----------
export const other = r => (r === "A" ? "B" : "A");
export function freshScore(seq = 0) { return { seq, p: { A: 0, B: 0 }, g: { A: 0, B: 0 }, win: null }; }
/** Aufschläger: wechselt nach jedem Spiel, A beginnt. */
export function server(s) { return (s.g.A + s.g.B) % 2 === 0 ? "A" : "B"; }
/** Seite: gerade Punktzahl im Spiel = Einstand-Seite (rechts), ungerade = Vorteil-Seite (links). */
export function serveSide(s) { return (s.p.A + s.p.B) % 2 === 0 ? "deuce" : "ad"; }

export function addPoint(s, w, gamesToWin = B.match.gamesToWin) {
  const n = JSON.parse(JSON.stringify(s));
  n.seq++; n.p[w]++;
  const l = other(w);
  if (n.p[w] >= 4 && n.p[w] - n.p[l] >= 2) {
    n.g[w]++; n.p = { A: 0, B: 0 };
    if (n.g[w] >= gamesToWin) n.win = w;
  }
  return n;
}
