// Spielablauf, Eingabe und Darstellung. Die Regeln selbst stehen in rules.js, die Zahlen in balance.js.
//
// Ablauf eines Punkts:
//   prepareServe → (serve → toss → Schlag) → fly → … → Entscheid → scorePoint → resetForPoint
// Wer den Ball bekommt, entscheidet den Punkt (Aus, Netz, verpasst). Fehler beim Aufschlag
// und Let verwaltet der Aufschläger. Im Spiel zu zweit sind so nie beide Handys gleichzeitig zuständig.

import { BALANCE as B } from "./balance.js";
import * as R from "./rules.js";
import { C, clamp, other } from "./rules.js";
import { T } from "./texts.js";
import { createAI, aiIncoming, aiIdle, aiStep, aiWantsSuper, aiServeErr, aiServeSpot } from "./ai.js";
import { connectRoomProvider, netTest } from "./net.js";
import { audioInit, sfx, buzz, crowd, setSound, setVibration } from "./audio.js";
import { say, setVoice, hasVoice } from "./voice.js";
import { loadProfile, saveProfile, today } from "./storage.js";
import { initUI, showScreen, currentScreen, refreshProfileUI, matchIntro } from "./ui.js";
import { playIntro } from "./intro.js";
import * as MA from "./machine.js";
import { renderHighscores } from "./ui.js";
import * as TO from "./tour.js";
import { initCareerUI, showBracket, reportMatch, racketColor } from "./careerui.js";
import * as ON from "./online.js";
import * as DT from "./duotour.js";
import { renderDuo } from "./duoui.js";
import { SUPABASE } from "./config.js";

const $ = id => document.getElementById(id);
const cv = $("cv"), ctx = cv.getContext("2d");
const reducedMotion = matchMedia("(prefers-reduced-motion: reduce)");
const GAMES = B.match.gamesToWin, TOSS = B.serve.tossTime, HIT_LINE = 0.04, MISS_D = 2.18;

// Texte aus texts.js ins HTML
document.querySelectorAll("[data-t]").forEach(el => { if (typeof T[el.dataset.t] === "string") el.textContent = T[el.dataset.t]; });
document.querySelectorAll("[data-tp]").forEach(el => { el.placeholder = T[el.dataset.tp]; });

// ---------- Zustand ----------
let level = 1, LV = B.levels[1];
let W = 1, H = 1, dpr = 1, s = 1, ox = 0, D = 0.8;          // Bildschirm: s px pro Platzbreite, D = Netz bis Schlägerlinie

let mode = "idle";                                          // idle | waiting | play | solo
let room = null, p2pMode = false, game = null, unsub = [];
let myRole = "A", host = false, oppPeer = null, oppName = T.opponent, oppHere = false;
let myName = "", oppLand = "NR";
const profile = loadProfile();
let score = R.freshScore(0), serveNo = 1;
// Ball: phase idle | serve | toss | oppserve | opptoss | fly | dead | gone | none
let ball = { phase: "idle", shot: null, from: null, t: 0, tl: null, hold: 0, held: false, ev: {}, tossT: 0, last: null };
let shotN = 0, handled = new Set();
let px = 0.5, lastPx = 0.5, pVel = 0, sentPx = -1, kbV = 0;
let oppX = 0.5, oppTossT = -1;
let ai = null, aiTimer = 0, aiErr = 0;
let mySupers = B.supersPerRally, armed = false;
let marks = [], flashes = [], trail = [], netShake = 0, resetTok = 0, pending = [], gameTime = 0;
let rallyStrokes = 0, hawk = null, activeIntro = null;
let run = null, popups = [], fireworks = [], fwTimer = 0, machineFlash = 0;   // Ballmaschine
// Karriere (Phase 5): laufendes Match, Belag, Statistik
// Turnier zu zweit (Phase 6)
let tourWanted = false, duo = null, duoMe = "H0", duoOther = null, duoMatch = null, duoFinal = false, duoReturn = false;
let duoLive = null, duoReady = false, duoClosed = false, duoNote = "", lastTres, lastCheer, oppFready = "", netRole = "A";
let careerMatch = null, careerReturn = false, matchOpts = {}, surfaceCol = null, matchStats = null, myRacketCol = null;
// Verbindung zu zweit (Phase 4): Herzschlag, Pause, Epoche für wiederholte Punkte, Nachfragen
let paused = false, pausedAt = 0, matchStarted = false, lastHeard = 0, lastHb, hbN = 0, lastHbSent = 0, lastWatch = 0, epoch = 0;
let syncFromHost = false, lastAsk, lastRq, lastReplayAt = 0, waitMs = 0, askedThisWait = false, currentCode = "";
const NET = { pauseAfter: 3000, resumeWithin: 1500, askAfter: 2000, replayAfter: 6000, hintAfter: 8000, tick: 250, lastGameMinutes: 30 };
const token = () => Math.random().toString(36).slice(2, 8);

const playing = () => mode === "play" || mode === "solo" || mode === "machine";
const isLocal = role => mode !== "play" || role === myRole;
const reach = () => LV.hw + C.ballR;
const oppReach = () => (ai && ai.lv ? ai.lv.hw : LV.hw) + C.ballR;   // der Computer hat je nach Stil eine andere Schlägerbreite
/** Verzögert in Spielzeit (läuft mit der Spielschleife, auch im Schnelltest). */
const later = (sec, fn) => { pending.push({ at: gameTime + sec, fn, tok: resetTok }); };
function runTimers() {
  const due = pending.filter(p => p.at <= gameTime);
  if (!due.length) return;
  pending = pending.filter(p => p.at > gameTime);
  due.forEach(p => { if (p.tok === resetTok) p.fn(); });
}

myName = profile.name; level = profile.level;
const hashCode = (location.hash || "").slice(1).toLowerCase();
if (/^[a-z0-9]{4}$/.test(hashCode)) $("codeIn").value = hashCode;

function setLevel(i, save) {
  if (!(i >= 0 && i <= 2)) return;
  level = i; LV = B.levels[i];
  document.querySelectorAll(".seg button").forEach(b => b.setAttribute("aria-pressed", String(+b.dataset.level === i)));
  $("lvlHint").textContent = T.levelHints[i];
  px = clamp(px, LV.hw, 1 - LV.hw);
  if (ai) ai.lv = LV;
  if (save) { profile.level = i; saveProfile(profile); }
  renderBoard();
}
document.querySelectorAll(".seg button").forEach(b => b.addEventListener("click", () => setLevel(+b.dataset.level, true)));

// ---------- Bildschirmgrösse ----------
function resize() {
  const r = cv.getBoundingClientRect();
  dpr = Math.min(window.devicePixelRatio || 1, 3);
  W = r.width || 1; H = r.height || 1;
  cv.width = Math.round(W * dpr); cv.height = Math.round(H * dpr);
  s = Math.min(W, H / 1.9);
  ox = (W - s) / 2;
  D = Math.max(0.45, (H / s) / 2 - 0.30);   // unten Platz für Schlägergriff und Super-Knopf
}
new ResizeObserver(resize).observe($("stage"));

// ---------- Eingabe ----------
// Mehrere Finger: Der Schläger folgt dem Finger, der zuletzt auf dem Platz aufgesetzt hat.
const pointers = new Map();
let steerId = null;
function racketLimits() {
  if (ball.phase === "serve" || ball.phase === "toss") return R.serveZone(R.serveSide(score));
  return [LV.hw, 1 - LV.hw];
}
function setPxFromClient(clientX) {
  const r = cv.getBoundingClientRect(), [a, b] = racketLimits();
  px = clamp((clientX - r.left - ox) / s, a, b);
}
cv.addEventListener("pointerdown", e => {
  try { cv.setPointerCapture(e.pointerId); } catch (err) {}
  pointers.set(e.pointerId, { x: e.clientX, y: e.clientY, t: performance.now(), swiped: false });
  steerId = e.pointerId; setPxFromClient(e.clientX); audioInit();
});
cv.addEventListener("pointermove", e => {
  const p = pointers.get(e.pointerId);
  if (e.pointerId === steerId || (!p && e.pointerType === "mouse")) setPxFromClient(e.clientX);
  if (!p || p.swiped) return;
  const dy = p.y - e.clientY, dx = Math.abs(e.clientX - p.x);
  // nur eindeutig senkrechtes, schnelles Wischen lädt den Super-Schlag
  if (profile.settings.swipe && dy > B.touch.swipeMin && dy > dx * B.touch.swipeRatio && performance.now() - p.t < B.touch.swipeTime) { p.swiped = true; arm(true); }
});
function endPointer(e, cancelled) {
  const p = pointers.get(e.pointerId);
  pointers.delete(e.pointerId);
  if (!cancelled && p && !p.swiped && Math.hypot(e.clientX - p.x, e.clientY - p.y) < 14 && performance.now() - p.t < 350) tap();
  if (steerId === e.pointerId) steerId = pointers.size ? [...pointers.keys()].pop() : null;
}
cv.addEventListener("pointerup", e => endPointer(e, false));
cv.addEventListener("pointercancel", e => endPointer(e, true));
["touchstart", "touchmove"].forEach(t => cv.addEventListener(t, e => e.preventDefault(), { passive: false }));
cv.addEventListener("contextmenu", e => e.preventDefault());

const keys = {};
addEventListener("keydown", e => {
  if (e.target.tagName === "INPUT") return;
  keys[e.key] = true;
  if (!playing()) return;
  if (e.key === " ") { e.preventDefault(); if (!e.repeat) tap(); }
  if (e.key === "ArrowUp" || e.key === "s" || e.key === "S") { e.preventDefault(); if (!e.repeat) arm(); }
  if (e.key === "ArrowLeft" || e.key === "ArrowRight") e.preventDefault();
});
addEventListener("keyup", e => { keys[e.key] = false; });

const superBtn = $("superBtn");
superBtn.addEventListener("pointerdown", e => e.stopPropagation());
superBtn.addEventListener("click", () => { audioInit(); arm(); });

function arm(only) {
  if (!playing() || mySupers <= 0) return;
  if (!["serve", "toss", "oppserve", "opptoss", "fly"].includes(ball.phase)) return;
  armed = only ? true : !armed;
  updateSuperBtn();
  if (armed) { sfx.arm(); buzz(12); }
}
function consumeSuper() {
  if (!armed || mySupers <= 0) return false;
  mySupers--; armed = false; updateSuperBtn();
  return true;
}
function updateSuperBtn() {
  superBtn.hidden = !playing();
  $("superN").textContent = mySupers;
  superBtn.disabled = mySupers <= 0;
  superBtn.classList.toggle("armed", armed);
  superBtn.setAttribute("aria-pressed", String(armed));
}

/** Antippen: beim Aufschlag erst hochwerfen, dann schlagen. */
function tap() {
  if (!playing()) return;
  if (hawk) { hawk.t = hawk.dur; return; }
  if (ball.phase === "serve") {
    if (mode === "play" && !oppHere) return;
    ball.phase = "toss"; ball.tossT = 0; sfx.toss();
  } else if (ball.phase === "toss") {
    const err = clamp((ball.tossT - TOSS / 2) / (TOSS / 2), -1, 1);
    const side = R.serveSide(score);
    const sh = R.makeServe({ x0: px, side, no: serveNo, err, sup: consumeSuper() }, LV, Math.random, matchOpts);
    launch(sh, myRole);
  }
}

// ---------- Schläge ----------
function launch(sh, from) {
  ball.phase = "fly"; ball.shot = sh; ball.from = from; ball.t = 0; ball.tl = R.timeline(sh);
  ball.hold = 0; ball.held = false; ball.ev = {}; trail = [];
  if (sh.serve) serveNo = sh.serve;
  rallyStrokes++;
  if (activeIntro && from !== myRole) activeIntro.close();
  const p = display(0);
  flashes.push({ x: p.x, y: p.v * D, t: 0, sup: sh.sup });
  if (sh.sup) { banner(T.superShot, true); sfx.superHit(); buzz(35); } else { sfx.hit(sh.s1); if (from === myRole) buzz(18); }
  if (from === myRole && mode === "play") {
    shotN++;
    publish({ shot: { ...roundShot(sh), seq: score.seq, n: shotN, ep: epoch }, toss: null });
  }
  if (mode === "solo") {
    if (from === myRole) aiIncoming(ai, sh); else aiIdle(ai, 0.5);
  }
  renderBoard();
}

function myHit(x) {
  const off = (x - px) / reach();
  const sh = R.makeRallyShot({ x0: x, off, pv: pVel, prevNormal: ball.shot.ns, sup: consumeSuper() }, LV, Math.random, matchOpts);
  launch(sh, myRole);
}

function aiHit(x) {
  const xa = 1 - x;                                  // Blick der KI
  const sh = R.makeRallyShot({ x0: xa, off: (xa - ai.x) / oppReach(), pv: ai.vel, prevNormal: ball.shot.ns, sup: aiWantsSuper(ai) }, ai.lv, Math.random, matchOpts);
  launch(sh, "B");
}

/** Ballposition auf diesem Bildschirm: x quer, v längs (+1 = eigene Schlägerlinie). */
function display(t) { return shotDisplay(ball.shot, ball.from, t); }
function shotDisplay(sh, from, t) {
  const p = R.at(sh, t);
  const mine = from === myRole;
  return { x: mine ? p.x : 1 - p.x, v: mine ? 1 - p.d : p.d - 1, h: p.h, d: p.d, bounced: p.bounced };
}

/** Banner und Schiedsrichter-Ruf zusammen. */
function announce(text, speech, hot) { banner(text, hot); if (speech) say(speech); }
const nameOf = role => (role === myRole ? (myName || T.you) : oppName);

// ---------- Hawk-Eye ----------
/** Knapper Ball: Aufsprung weniger als einen Balldurchmesser von der Linie entfernt. */
const closeCall = sh => sh.why !== "net" && R.lineGap(sh) < B.hawk.gap * C.ballR;
/** Zeigt bei knappen Bällen die Zoom-Wiederholung und macht danach mit then() weiter. */
function withHawk(sh, from, isIn, then) {
  if (!closeCall(sh)) { then(); return; }
  crowd.murmur();
  clearTimeout(bannerT); $("banner").classList.remove("show");
  hawk = { sh, from, isIn, t: 0, dur: reducedMotion.matches ? B.hawk.durReduced : B.hawk.dur, then };
}

/** Aus, Netz, Fehler oder Let: Entscheid am Aufsprung (bzw. am Netz). */
function resolveDead() {
  const sh = ball.shot, from = ball.from, recv = other(from);
  ball.phase = "dead";
  if (sh.serve && sh.res === "let") {
    announce(T.let, T.sayLet);
    later(B.timing.faultPause, () => prepareServe());
    return;
  }
  withHawk(sh, from, false, () => {
    if (sh.serve === 1) {
      announce(sh.why === "net" ? T.net + " " + T.fault : T.fault, sh.why === "net" ? T.sayNet : T.sayFault);
      later(B.timing.faultPause, () => { serveNo = 2; prepareServe(); });
    } else if (sh.serve === 2) {
      if (careerMatch && from === myRole) matchStats.doubleFaults++;
      announce(T.doubleFault, T.sayDoubleFault);
      if (isLocal(recv)) later(0.6, () => awardPoint(recv));
    } else {
      announce(sh.why === "net" ? T.net : T.out, sh.why === "net" ? T.sayNet : T.sayOut);
      if (isLocal(recv)) later(0.6, () => awardPoint(recv));
    }
  });
}

// ---------- Punkte ----------
/** Punkt entschieden. In der Ballmaschine kostet jeder Fehler ein Leben, es gibt keinen Punktestand. */
function awardPoint(w) {
  if (mode === "machine") { if (w !== myRole) machineError(); return; }
  scorePoint(w);
}

function scorePoint(w) {
  if (w === myRole) sfx.won(); else { sfx.lost(); buzz([40, 40, 40]); }
  applyScore(R.addPoint(score, w, GAMES), true);
}

function applyScore(s2, mine) {
  const prev = score;
  if (careerMatch && s2.seq > prev.seq) matchStats.longestRally = Math.max(matchStats.longestRally, rallyStrokes);
  if (duoMatch) publish({ live: { r: duoMatch.no, key: duoMatch.key, a: s2.g[myRole], b: s2.g[other(myRole)], opp: oppName } });
  score = s2;
  if (mine && mode === "play") publish({ score: s2 });     // nur im Match zu zweit teilen
  saveLastGame();
  pending = []; ++resetTok;
  if (hawk && !mine) hawk.then = () => {};          // Punkt kam vom anderen Handy: Wiederholung nur noch zeigen
  if (ball.phase !== "dead") ball.phase = "none";
  armed = false;
  renderBoard();
  if (rallyStrokes >= B.crowd.applauseFrom && s2.seq > prev.seq) crowd.applause(Math.min(1.6, rallyStrokes / B.crowd.applauseFrom));
  rallyStrokes = 0;
  if (s2.win) {
    announce(s2.win === myRole ? T.setYou : T.setOpp(oppName), T.sayMatch(nameOf(s2.win)));
    crowd.cheer(1.3);
  } else if (s2.setWon && s2.st && prev.st && s2.st[s2.setWon] > prev.st[s2.setWon]) {
    // Satz gewonnen, Match geht weiter
    const w = s2.setWon;
    announce(w === myRole ? T.setWonYou : T.setWon(oppName), T.saySet(nameOf(w)));
    crowd.cheer(0.9);
  } else if (s2.g.A + s2.g.B > prev.g.A + prev.g.B) {
    const w = s2.g.A > prev.g.A ? "A" : "B";
    announce(w === myRole ? T.gameYou : T.gameOpp(oppName), T.sayGame(nameOf(w)));
    crowd.cheer(0.6);
  } else if (s2.p.A || s2.p.B) announce(pointCall(s2), pointSpeech(s2));
  const fresh = !s2.p.A && !s2.p.B && !s2.g.A && !s2.g.B;
  later(fresh ? 0 : B.timing.pointPause, resetForPoint);
}

function resetForPoint() {
  trail = []; marks = marks.filter(m => m.t < 1);
  mySupers = B.supersPerRally; armed = false; serveNo = 1;
  if (ai) ai.supers = B.supersPerRally;
  updateSuperBtn();
  if (!playing() || mode === "machine") return;
  if (score.win) { ball.phase = "none"; showOver(); return; }
  if (currentScreen() === "over") showScreen(null);
  prepareServe();
}

/** Aufstellung für den nächsten Aufschlag (erster, zweiter oder nach Let). */
function prepareServe() {
  const side = R.serveSide(score);
  rallyStrokes = 0;
  if (R.server(score) === myRole) {
    ball.phase = "serve";
    const [a, b] = R.serveZone(side);
    px = clamp(px, a, b);
    if (ai) aiIdle(ai, 0.5);
  } else {
    ball.phase = "oppserve";
    if (mode === "solo") {
      ai.x = ai.target = aiServeSpot(ai, side);
      const [d0, d1] = B.timing.aiServeDelay;
      aiTimer = d0 + (d1 - d0) * Math.random();
    }
  }
  renderBoard();
}

/** Spielstand, wie ihn der Schiedsrichter ausruft: «Fünfzehn null», «Dreissig beide», «Vorteil Pascal». */
function pointSpeech(s2) {
  const a0 = s2.p[myRole], b0 = s2.p[other(myRole)];
  if (a0 >= 3 && b0 >= 3) return a0 === b0 ? T.sayDeuce : T.sayAdv(nameOf(a0 > b0 ? myRole : other(myRole)));
  const N = T.sayNumbers, sv = R.server(s2), a = s2.p[sv], b = s2.p[other(sv)];
  return a === b ? T.sayAll(N[a]) : N[a] + " " + N[b];
}

function pointCall(s2) {
  const me = s2.p[myRole], op = s2.p[other(myRole)];
  if (me >= 3 && op >= 3) return me === op ? T.deuce : (me > op ? T.advYou : T.adv(oppName));
  const P = ["0", "15", "30", "40"], sv = R.server(s2), a = s2.p[sv], b = s2.p[other(sv)];
  return (P[a] || "40") + " : " + (P[b] || "40");      // Punkte des Aufschlägers zuerst, wie beim Schiedsrichter
}

// ---------- Anzeige ----------
function renderBoard() {
  const isMachine = mode === "machine" && run;
  $("board").hidden = !!isMachine; $("mboard").hidden = !isMachine;
  if (isMachine) {
    const mult = MA.multiplier(run.combo), L = B.machine.lives;
    $("mPoints").textContent = run.points;
    $("mCombo").textContent = run.combo + (mult > 1 ? " ×" + mult : "");
    $("mLives").textContent = "●".repeat(Math.max(0, run.lives)) + "○".repeat(L - Math.max(0, run.lives));
    $("mLives").setAttribute("aria-label", T.livesAria(Math.max(0, run.lives), L));
    $("mSpeed").textContent = MA.kmh(run.speed);
    $("status").textContent = T.machineStatus(LV.name, run.returns);
    return;
  }
  const me = myRole, op = other(myRole);
  $("nameMe").textContent = myName || T.you; $("nameOp").textContent = oppName;
  $("gMe").textContent = score.g[me]; $("gOp").textContent = score.g[op];
  const a = score.p[me], b = score.p[op];
  const P = ["0", "15", "30", "40"];
  let ta = P[a], tb = P[b];
  if (a >= 3 && b >= 3) { ta = a > b ? "AD" : "40"; tb = b > a ? "AD" : "40"; }
  $("pMe").textContent = ta; $("pOp").textContent = tb;
  $("srvMe").classList.toggle("on", R.server(score) === me);
  $("srvOp").classList.toggle("on", R.server(score) === op);
  const mc = careerMatch || duoMatch;
  let st = mc ? mc.tName + " · " + mc.round : duoFinal ? T.duoFinalEvent : T.status(LV.name, GAMES);
  if ((score.sw || 1) > 1) st += " · " + T.setsLineFull(score.st[me], score.st[op], score.sw);
  if (a >= 3 && b >= 3) st = LV.name + " · " + (a === b ? T.deuce : (a > b ? T.advYou : T.adv(oppName)));
  if (playing() && ["serve", "toss", "oppserve", "opptoss"].includes(ball.phase)) st += " · " + (serveNo === 2 ? T.serve2 : T.serve1);
  if (mode === "play" && paused) st = T.netPaused;
  $("status").textContent = st;
}

let bannerT = 0;
function banner(t, hot) {
  const b = $("banner"); b.textContent = t; b.classList.add("show"); b.classList.toggle("hot", !!hot);
  clearTimeout(bannerT); bannerT = setTimeout(() => b.classList.remove("show"), 1100);
}

function showOver() {
  if (careerMatch) { careerOver(); return; }
  if (duoMatch || duoFinal) { duoMatchOver(); return; }
  $("againBtn").hidden = false; $("leaveBtn").textContent = T.backMenu;
  $("overList").hidden = true; $("againBtn").textContent = T.again;
  const won = score.win === myRole;
  $("overTitle").textContent = won ? T.won : T.lost;
  $("overText").textContent = T.overText(score.g[myRole], score.g[other(myRole)], oppName, LV.name);
  showScreen("over");
}

// ---------- Spiel zu zweit ----------
function publish(patch) { if (game) game.presence(patch).catch(() => {}); }

const r3 = v => Math.round(v * 1000) / 1000;
function roundShot(sh) {
  const o = { ...sh };
  for (const k of ["x0", "xn", "bx", "bd", "s1", "s2", "ns", "cv", "adj"]) if (typeof sh[k] === "number") o[k] = r3(sh[k]);
  return o;
}
/** Schlag des anderen Handys prüfen: nur bekannte Felder, Zahlen in vernünftigen Grenzen. */
function cleanShot(x) {
  const n = (v, a, b, d) => (typeof v === "number" && isFinite(v) ? clamp(v, a, b) : d);
  const one = (v, list, d) => (list.includes(v) ? v : d);
  return {
    kind: one(x.kind, ["rally", "serve"], "rally"),
    x0: n(x.x0, -0.5, 1.5, 0.5), xn: n(x.xn, -0.5, 1.5, 0.5), bx: n(x.bx, -0.5, 1.5, 0.5),
    bd: n(x.bd, 1.02, 1.99, 1.6), s1: n(x.s1, 0.1, 12, LV.base), s2: n(x.s2, 0.1, 12, LV.base),
    res: one(x.res, ["in", "out", "net", "fault", "let"], "in"), why: one(x.why, ["wide", "long", "net", null], null),
    nc: !!x.nc, serve: one(x.serve, [0, 1, 2], 0), side: one(x.side, ["deuce", "ad"], "deuce"),
    sup: !!x.sup, ns: n(x.ns, 0.1, 6, LV.base), frame: !!x.frame, quality: String(x.quality || ""),
    cv: n(x.cv, -0.3, 0.3, 0), adj: n(x.adj, -1, 1, 0),
  };
}

function onPeers({ peers }) {
  const players = peers.filter(p => p.presence && p.presence.app === "nr");
  const me = players.find(p => p.sameTab);
  if (!me) return;
  const others = players.filter(p => !p.sameTab);
  const opp = others.find(p => p.peer === oppPeer) || others.sort((a, b) => (a.peer < b.peer ? -1 : 1))[0];
  oppHere = !!opp;
  if (!opp) { renderBoard(); return; }                 // Pause und Wiederaufnahme regelt netWatch()

  if (opp.peer !== oppPeer) {
    oppPeer = opp.peer; lastHb = undefined;
    const theyHost = !!opp.presence.host;
    netRole = host && !theyHost ? "A" : (!host && theyHost ? "B" : (me.peer < opp.peer ? "A" : "B"));
    if (mode !== "solo") myRole = netRole;               // im Computermatch des Turniers bleibt die Rolle A
  }
  // Herzschlag: jede Änderung des Zählers heisst «das andere Handy lebt»
  if (opp.presence.hb !== lastHb) { lastHb = opp.presence.hb; lastHeard = performance.now(); }
  if (!duoMatch) {                                     // während eines Computermatches heisst der Gegner anders
    oppName = cleanName(opp.presence.name) || T.opponent;
    oppLand = /^[A-Z]{2}$/.test(opp.presence.land || "") ? opp.presence.land : "NR";
  }
  if (mode === "play" && typeof opp.presence.px === "number") oppX = clamp(1 - opp.presence.px, 0, 1);
  oppTossT = typeof opp.presence.toss === "number" ? opp.presence.toss : -1;
  // wer das Spiel eröffnet (A), bestimmt die Stufe
  if (myRole === "B" && Number.isInteger(opp.presence.level) && opp.presence.level !== level) setLevel(opp.presence.level, false);

  // Münzwurf des eröffnenden Handys übernehmen, solange noch kein Punkt gespielt ist
  const sc0 = opp.presence.score;
  if (myRole === "B" && sc0 && sc0.seq === 0 && score.seq === 0 && (sc0.fs === "A" || sc0.fs === "B") && sc0.fs !== score.fs) {
    score = { ...score, fs: sc0.fs }; publish({ score });
  }
  if (mode === "waiting") { if (host ? tourWanted : !!opp.presence.tour) startTourLobby(); else startMatch(); }
  if (duo || opp.presence.tour) handleTourPresence(opp.presence);
  if (mode !== "play") { renderBoard(); return; }      // Spielstand und Schläge nur im laufenden Match zu zweit

  const sc = opp.presence.score;
  if (validScore(sc)) {
    if (syncFromHost && !host && opp.presence.host) {
      // nach dem (Wieder-)Verbinden gilt der Spielstand des eröffnenden Handys, auch wenn er kleiner ist
      syncFromHost = false;
      if (JSON.stringify(sc) !== JSON.stringify(score)) { score = sc; publish({ score: sc }); saveLastGame(); replayPoint(); }
    } else if (sc.seq > score.seq) { applyScore(sc, false); publish({ score: sc }); }
  }

  // Epoche: Das eröffnende Handy hat den laufenden Punkt neu gestartet
  const ep = opp.presence.ep | 0;
  if (ep > epoch) { epoch = ep; publish({ ep: epoch }); replayPoint(); }
  // Bitte des beitretenden Handys, den Punkt zu wiederholen
  const rq = opp.presence.rq;
  if (host && rq && rq !== lastRq) { lastRq = rq; if (performance.now() - lastReplayAt > 2000) startReplay(); }
  else if (rq) lastRq = rq;
  // Nachfrage nach dem Spielstand: Stand nochmals schicken
  const ask = opp.presence.ask;
  if (ask && ask !== lastAsk) { lastAsk = ask; publish({ score: { ...score }, ans: ask }); }

  const sh = opp.presence.shot;
  if (sh && typeof sh === "object" && sh.seq === score.seq && (sh.ep | 0) === epoch && typeof sh.n === "number" && !paused) {
    const key = epoch + ":" + sh.seq + ":" + sh.n;
    if (!handled.has(key)) { handled.add(key); launch(cleanShot(sh), other(myRole)); }
  }
  renderBoard();
}

// ---------- Verbindungswächter (läuft in Echtzeit, auch wenn das Spiel pausiert) ----------
function netWatch() {
  if (mode !== "play" && mode !== "waiting" && !duo) return;
  const now = performance.now(), elapsed = Math.min(now - (lastWatch || now), 2000);
  lastWatch = now;
  if (now - lastHbSent >= 900) { lastHbSent = now; publish({ hb: ++hbN }); }   // Herzschlag etwa jede Sekunde
  if (mode !== "play" || !matchStarted) return;
  const stale = !oppHere || now - lastHeard > NET.pauseAfter;
  if (!paused && stale) pauseGame();
  else if (paused && oppHere && now - lastHeard < NET.resumeWithin) resumeGame();
  if (paused) {
    $("netPauseHint").hidden = now - pausedAt < NET.hintAfter;
    return;
  }
  // Kein Hängenbleiben: Wer auf den Entscheid des anderen Handys wartet, fragt nach
  if ((ball.phase === "gone" || ball.phase === "dead") && !hawk) {
    waitMs += elapsed;
    if (waitMs >= NET.askAfter && !askedThisWait) { askedThisWait = true; publish({ ask: token() }); }
    if (waitMs >= NET.replayAfter) {
      waitMs = 0; askedThisWait = false;
      if (host) startReplay(); else publish({ rq: token() });
    }
  } else { waitMs = 0; askedThisWait = false; }
}
setInterval(netWatch, NET.tick);

function pauseGame() {
  paused = true; pausedAt = performance.now();
  pending = []; ++resetTok; hawk = null; armed = false;
  $("netPauseText").textContent = T.netWaiting(oppName);
  $("netPauseHint").hidden = true;
  $("netPause").hidden = false;
  buzz(60);
  renderBoard();
}

function resumeGame() {
  paused = false;
  $("netPause").hidden = true;
  if (host) { publish({ score: { ...score } }); startReplay(); }
  else {
    // Nur nachfragen, wenn das eröffnende Handy nicht schon selbst einen neuen Durchgang gestartet hat
    syncFromHost = true;
    const e0 = epoch;
    setTimeout(() => { if (mode === "play" && !paused && epoch === e0) publish({ rq: token() }); }, 1500);
  }
  renderBoard();
}

/** Das eröffnende Handy startet den laufenden Punkt neu (neue Epoche, alte Schläge zählen nicht mehr). */
function startReplay() {
  lastReplayAt = performance.now();
  epoch++;
  publish({ ep: epoch });
  replayPoint();
}

function replayPoint() {
  pending = []; ++resetTok; hawk = null; armed = false; trail = [];
  ball.phase = "none";
  announce(T.replay, null);
  renderBoard();
  later(0.9, resetForPoint);
}

/** Letztes Spiel zu zweit merken, damit es nach einem Neuladen mit demselben Code weitergeht. */
function saveLastGame() {
  if ((mode !== "play" && mode !== "waiting") || duo || tourWanted) return;   // Turniere zu zweit lassen sich nicht fortsetzen
  try { localStorage.setItem("nr-lastgame", JSON.stringify({ code: currentCode, host, score, level, at: Date.now() })); } catch (e) {}
}
function loadLastGame() {
  try {
    const g = JSON.parse(localStorage.getItem("nr-lastgame") || "null");
    if (g && /^[a-z0-9]{4}$/.test(g.code) && Date.now() - g.at < NET.lastGameMinutes * 60000 && validScore(g.score) && !g.score.win) return g;
  } catch (e) {}
  return null;
}
function refreshResume() {
  const g = loadLastGame();
  $("resumeBtn").hidden = !g || !room;
  if (g) $("resumeBtn").textContent = T.resume(g.code);
}

function validScore(x) {
  return x && typeof x.seq === "number" && x.p && x.g &&
    ["A", "B"].every(k => Number.isInteger(x.p[k]) && Number.isInteger(x.g[k]) && x.p[k] >= 0 && x.g[k] >= 0 && x.p[k] < 50 && x.g[k] <= (x.gw || GAMES)) &&
    (x.win === null || x.win === "A" || x.win === "B") && (x.fs === undefined || x.fs === "A" || x.fs === "B");
}

async function enterRoom(code, asHost, saved) {
  if (!room) return;
  saveName();
  host = asHost; oppPeer = null; oppHere = false; handled = new Set(); shotN = 0;
  currentCode = code; matchStarted = false; paused = false; epoch = 0; lastHb = undefined; lastAsk = undefined; lastRq = undefined;
  syncFromHost = !asHost;                                      // das beitretende Handy übernimmt den Stand des eröffnenden
  if (saved && validScore(saved.score)) { score = saved.score; if (asHost && Number.isInteger(saved.level)) setLevel(saved.level, false); }
  else score = R.freshScore(0, Math.random() < 0.5 ? "A" : "B");   // Münzwurf: das eröffnende Handy entscheidet
  try {
    note(T.connecting);
    game = await room.join("nr-" + code, asHost);
    note("");
  } catch (e) {
    note((p2pMode && e && e.message) || T.joinFailed);
    return;
  }
  mode = "waiting"; inGame(true);
  $("codeOut").textContent = code;
  $("shareBtn").hidden = !p2pMode;
  shareLink = location.origin + location.pathname + "#" + code;
  showScreen("waiting");
  unsub.push(game.onPeers(onPeers, () => {}));
  publish({ app: "nr", name: myName, land: profile.land, host: asHost, level, px: 0.5, score, shot: null, hb: 0, ep: 0, ask: "", rq: "",
           tour: tourWanted && asHost, tourState: null, tres: null, live: null, cheer: "", fready: "" });
  saveLastGame();
}

function startMatch() {
  mode = "play"; matchStarted = true; lastHeard = performance.now();
  showScreen(null); $("quit").hidden = false;
  ball.phase = "none";
  renderBoard();
  if (score.seq > 0) { announce(T.resumed, null); later(0.9, resetForPoint); return; }   // fortgesetztes Spiel
  beginWithIntro(T.duoEvent(LV.name));
}

/** Match-Intro mit Münzwurf, danach der erste Aufschlag (ausser es kam schon ein Schlag an). */
function beginWithIntro(event) {
  const first = R.server(score) === myRole ? "me" : "opp";
  activeIntro = matchIntro({
    me: { name: myName || T.you, land: profile.land, isYou: !myName }, opp: { name: oppName, land: oppLand },
    event, first, reduced: reducedMotion.matches,
  });
  activeIntro.done.then(() => {
    activeIntro = null;
    if (!playing() || ball.phase !== "none") return;
    say(T.firstServe(first === "me" ? myName : oppName, first === "me" && !myName));
    banner(T.start);
    resetForPoint();
  });
}

/** Eigene Karriere (ältere übernommen, sonst neu im Aargau). */
function myCareer() {
  if (TO.migrateCareer(profile.career)) saveProfile(profile);
  if (!TO.validCareer(profile.career)) { profile.career = TO.newCareer(); saveProfile(profile); }
  return profile.career;
}
/** Karriere-Stand für die Weltrangliste vormerken. */
function queueCareerOnline(c) {
  ON.queueCareer(profile, TO.totalPoints(c, TO.me(c)), c.stats.titles.length, TO.ranks(c)[TO.me(c)], c.tier);
}

// ---------- Turnier zu zweit ----------
/** Beide sind verbunden: Das eröffnende Handy legt das Turnierfeld an und schickt es. */
function startTourLobby() {
  mode = "tour"; matchStarted = false; myRole = netRole;
  duoMe = host ? "H0" : "H1"; duoOther = { name: oppName, land: oppLand };
  duoReady = false; duoClosed = false; duoNote = ""; duoLive = null;
  if (host) {
    // Feld aus der Stufe der eigenen Karriere: im Aargau gegen Aargauer, auf der Welt-Tour gegen die Besten
    duo = DT.createDuoTour([{ id: "H0", name: myName || T.you, land: profile.land }, { id: "H1", name: oppName, land: oppLand }], myCareer());
    publish({ tourState: duo });
  }
  $("quit").hidden = true; inGame(true);
  showScreen("duoBracket"); drawDuo();
}

/** Was das andere Handy im Turnier gemeldet hat. */
function handleTourPresence(P) {
  if (!host && P.tourState && DT.validDuo(P.tourState) && (!duo || P.tourState.id !== duo.id || P.tourState.rev > duo.rev)) {
    const roundBefore = duo && duo.id === P.tourState.id ? duo.round : -1;
    duo = JSON.parse(JSON.stringify(P.tourState));
    if (duo.round !== roundBefore) duoReady = false;
    if (mode === "waiting") startTourLobby();
    duoChanged();
  }
  if (host && duo && P.tres && P.tres.tok !== lastTres) {
    lastTres = P.tres.tok;
    if (DT.report(duo, "H1", P.tres.r, P.tres.won)) hostAdvance();
  }
  if (JSON.stringify(P.live || null) !== JSON.stringify(duoLive)) { duoLive = P.live || null; duoChanged(); }
  if (P.cheer && P.cheer !== lastCheer) {
    const first = lastCheer === undefined && !duo;
    lastCheer = P.cheer;
    if (!first) { announce(T.duoCheered(duoOther ? duoOther.name : oppName), null, true); crowd.cheer(0.8); buzz(30); }
  }
  oppFready = P.fready || "";
  if (duo && duoReady && !duoFinal && oppFready === duo.id + ":" + duo.round) startDuoFinal();
}

/** Das eröffnende Handy: Runde abschliessen, sobald alle gespielt haben, und den Stand verteilen. */
function hostAdvance() {
  const roundBefore = duo.round;
  if (DT.roundComplete(duo)) DT.advance(duo);
  duo.rev++;
  if (duo.round !== roundBefore) duoReady = false;
  publish({ tourState: JSON.parse(JSON.stringify(duo)) });
  duoChanged();
}

function duoChanged() { if (currentScreen() === "duoBracket") drawDuo(); }

function drawDuo() {
  renderDuo(duo, {
    me: duoMe, live: duoLive, ready: duoReady, closed: duoClosed, note: duoNote,
    on: { play: startDuoMatch, ready: duoSetReady, cheer: duoSendCheer, close: duoCloseTour, leave },
  });
}

/** Belag des Turniers für ein Match einstellen (gleich auf beiden Handys). */
function applySurface(surface) {
  const sf = B.surfaces[surface], base = B.levels[level];
  LV = { ...base, base: base.base * sf.speed, max: base.max * sf.speed };
  matchOpts = { netcordChance: B.netcord.chance * sf.netcord, spin: sf.spin };
  surfaceCol = { court: sf.court, surround: sf.surround };
}

/** Dein Match gegen einen Computerspieler in dieser Runde. */
function startDuoMatch() {
  const m = DT.humanMatch(duo, duoMe);
  if (!m || m.vsHuman) return;
  audioInit(); goFullscreen();
  applySurface(duo.surface);
  const info = DT.who(duo, m.opp);
  mode = "solo"; myRole = "A"; oppHere = true; oppName = info.name; oppLand = info.land;
  ai = createAI(TO.levelFor(DT.cpuPlayer(duo, m.opp), m.round, LV)); oppX = 0.5;
  duoMatch = { no: m.round, key: m.key, round: T.rounds[m.key], tName: T.duoTourName };
  score = R.freshScore(0, Math.random() < 0.5 ? "A" : "B", TO.formatFor(m.key));
  marks = []; pending = []; ++resetTok;
  publish({ live: { r: m.round, key: m.key, a: 0, b: 0, opp: info.name } });
  showScreen(null); $("quit").hidden = false;
  ball.phase = "none"; renderBoard();
  beginWithIntro(T.duoTourName + " · " + duoMatch.round);
}

/** Final gegeneinander: beide bereit, dann ein normales Match zu zweit über die bestehende Verbindung. */
function duoSetReady() {
  duoReady = true;
  publish({ fready: duo.id + ":" + duo.round });
  drawDuo();
  if (oppFready === duo.id + ":" + duo.round) startDuoFinal();
}

function startDuoFinal() {
  if (duoFinal) return;
  duoFinal = true; duoReady = false;
  applySurface(duo.surface);
  mode = "play"; myRole = netRole; oppName = duoOther.name; oppLand = duoOther.land; oppHere = true;
  const fs = duo.id.charCodeAt(0) % 2 ? "A" : "B";                     // auf beiden Handys gleich
  score = R.freshScore(1000 + duo.round * 10, fs, B.career.format.final);
  handled = new Set(); paused = false; matchStarted = true; lastHeard = performance.now();
  syncFromHost = false;                                   // beide starten mit demselben frischen Stand
  publish({ score });
  marks = []; pending = []; ++resetTok;
  showScreen(null); $("quit").hidden = false;
  ball.phase = "none"; renderBoard();
  beginWithIntro(T.duoFinalEvent);
}

function duoMatchOver() {
  const won = score.win === myRole;
  if (duoMatch) {
    const r = duoMatch.no;
    publish({ live: { r, key: duoMatch.key, a: score.g[myRole], b: score.g[other(myRole)], opp: oppName, done: true, won } });
    DT.report(duo, duoMe, r, won);                                        // gleich anzeigen …
    if (host) hostAdvance(); else publish({ tres: { r, won, tok: token() } });   // … und dem eröffnenden Handy melden
  } else {
    DT.report(duo, duoMe, duo.round, won);
    if (host) hostAdvance();
  }
  if (won) crowd.cheer(1); else crowd.applause(0.4);
  const label = duoMatch ? duoMatch.round : T.rounds.F;
  $("overList").hidden = true; $("againBtn").hidden = true;
  $("overTitle").textContent = won ? T.matchWon : T.matchLost;
  $("overText").textContent = (won ? T.matchWonText : T.matchLostText)(label, oppName);
  $("leaveBtn").textContent = T.continueBtn;
  duoReturn = true;
  showScreen("over");
}

/** Nach einem Match zurück zum Turnierbaum, die Verbindung bleibt bestehen. */
function backToTour() {
  mode = "tour"; duoMatch = null; duoFinal = false; matchStarted = false; ai = null;
  LV = B.levels[level]; matchOpts = {}; surfaceCol = null;
  myRole = netRole; oppName = duoOther.name; oppLand = duoOther.land;
  pending = []; ++resetTok; hawk = null; armed = false; marks = []; ball.phase = "idle";
  if (activeIntro) activeIntro.close();
  $("quit").hidden = true; inGame(true);
  showScreen("duoBracket"); drawDuo(); renderBoard();
}

function duoSendCheer() {
  publish({ cheer: token() });
  banner(T.duoCheerSent);
  sfx.arm();
}

/** Turnier fertig: Punkte in die eigene Karriere eintragen (wenn dort gerade kein Turnier läuft). */
function duoCloseTour() {
  const c = myCareer(), won = duo.champion === duoMe;
  const sum = TO.recordExternal(c, DT.resultKey(duo, duoMe), won);
  if (sum) {
    duoNote = T.duoRecorded(sum.userPoints, sum.rankBefore, sum.rankAfter);
    queueCareerOnline(c);
    syncOnline();
  } else duoNote = T.duoNotRecorded;
  saveProfile(profile);
  duoClosed = true;
  if (won) celebrate();
  drawDuo();
}

// ---------- Karriere ----------
/** Ein Match der Karriere: Belag, Gegner nach Rating und Stil, Format der Runde. */
function startCareerMatch(m) {
  audioInit(); saveName(); goFullscreen();
  const c = myCareer(), t = TO.tournament(c, m.ti), sf = B.surfaces[t.surface], base = B.levels[level];
  LV = { ...base, base: base.base * sf.speed, max: base.max * sf.speed };
  matchOpts = { netcordChance: B.netcord.chance * sf.netcord, spin: sf.spin };
  surfaceCol = { court: sf.court, surround: sf.surround };
  const pl = TO.player(c, m.opp);
  mode = "solo"; myRole = "A"; oppHere = true; oppName = pl.name; oppLand = pl.land;
  ai = createAI(TO.opponentLevel(c, m.opp, m.roundIndex, LV, t.stronger || 0)); oppX = 0.5;
  careerMatch = { ...m, tName: T.tierTournaments[c.tier][m.ti] };
  matchStats = { aces: 0, doubleFaults: 0, longestRally: 0 };
  score = R.freshScore(0, Math.random() < 0.5 ? "A" : "B", TO.formatFor(m.key));
  marks = []; pending = []; ++resetTok;
  showScreen(null); $("quit").hidden = false; inGame(true);
  ball.phase = "none"; renderBoard();
  beginWithIntro(careerMatch.tName + " · " + m.round);
}

function careerOver() {
  const won = score.win === myRole;
  const fresh = reportMatch(won, matchStats);
  if (won) crowd.cheer(1); else crowd.applause(0.4);
  $("overList").hidden = true; $("againBtn").hidden = true;
  $("overTitle").textContent = won ? T.matchWon : T.matchLost;
  $("overText").textContent = (won ? T.matchWonText : T.matchLostText)(careerMatch.round, oppName) + (fresh.length ? " · " + T.newColor(fresh.join(", ")) : "");
  $("leaveBtn").textContent = T.continueBtn;
  careerReturn = true;
  showScreen("over");
}

function celebrate() {
  crowd.cheer(1.4); say(T.ceremony);
  if (!reducedMotion.matches) fwTimer = 2.6;
}

async function leave() {
  unsub.forEach(u => { try { u(); } catch (e) {} }); unsub = [];
  if (game) { try { await game.leave(); } catch (e) {} game = null; }
  pending = []; ++resetTok;
  mode = "idle"; oppPeer = null; oppHere = false; oppName = T.opponent; myRole = "A"; ai = null;
  if (activeIntro) activeIntro.close();
  hawk = null; run = null; popups = []; fireworks = []; fwTimer = 0;
  careerMatch = null; matchStats = null; matchOpts = {}; surfaceCol = null; LV = B.levels[level];
  duo = null; duoMatch = null; duoFinal = false; duoReturn = false; duoLive = null; duoReady = false; duoClosed = false; duoNote = "";
  tourWanted = false; lastTres = undefined; lastCheer = undefined; oppFready = ""; duoOther = null;
  paused = false; matchStarted = false; $("netPause").hidden = true;
  try { localStorage.removeItem("nr-lastgame"); } catch (e) {}
  $("quit").hidden = true; showScreen("menu"); inGame(false);
  score = R.freshScore(0); serveNo = 1; armed = false; marks = []; updateSuperBtn();
  ball.phase = "idle"; renderBoard();
}

// ---------- Startseite ----------
function note(t) { $("roomNote").hidden = !t; $("roomNote").textContent = t; }
function saveName() {
  if (document.activeElement && document.activeElement.blur) document.activeElement.blur();
  myName = profile.name;
}
function makeCode() {
  const al = "abcdefghjkmnpqrstuvwxyz23456789"; let c = "";
  for (let i = 0; i < 4; i++) c += al[Math.floor(Math.random() * al.length)];
  return c;
}
$("hostBtn").onclick = () => { audioInit(); goFullscreen(); enterRoom(makeCode(), true); };
$("joinBtn").onclick = () => {
  audioInit();
  const c = $("codeIn").value.trim().toLowerCase();
  if (!/^[a-z0-9]{4}$/.test(c)) { note(T.codeFormat); return; }
  goFullscreen(); enterRoom(c, false);
};
$("codeIn").addEventListener("keydown", e => { if (e.key === "Enter") $("joinBtn").click(); });
$("cancelBtn").onclick = leave;
$("leaveBtn").onclick = async () => {
  if (duoReturn) { duoReturn = false; backToTour(); return; }
  const back = careerReturn;
  careerReturn = false;
  await leave();
  if (back) showBracket();
};
$("quit").onclick = () => {
  if (mode === "machine") { if (run && !run.over) { pending = []; ++resetTok; endRun(); } else leave(); return; }
  if (mode === "solo" && !careerMatch && !duoMatch && (score.win || !score.seq)) { leave(); return; }
  if (playing() && !score.win) { const s2 = { ...JSON.parse(JSON.stringify(score)), seq: score.seq + 1, win: other(myRole) }; applyScore(s2, true); }
};
$("againBtn").onclick = () => (mode === "machine" ? startMachine() : applyScore(R.freshScore(score.seq + 1, other(score.fs || "A")), true));
$("soloBtn").onclick = () => {
  audioInit(); saveName(); goFullscreen();
  mode = "solo"; myRole = "A"; oppName = T.computer; oppLand = "NR"; oppHere = true;
  ai = createAI(LV); oppX = 0.5;
  score = R.freshScore(0, Math.random() < 0.5 ? "A" : "B"); marks = [];
  showScreen(null); $("quit").hidden = false; inGame(true);
  ball.phase = "none"; renderBoard();
  beginWithIntro(T.quickEvent(LV.name));
};

let shareLink = "";
$("shareBtn").onclick = async () => {
  try { if (navigator.share) { await navigator.share({ title: "Netzroller", text: T.shareText, url: shareLink }); return; } } catch (e) { return; }
  try { await navigator.clipboard.writeText(shareLink); $("shareBtn").textContent = T.shareCopied; }
  catch (e) { $("shareBtn").textContent = shareLink; }
  setTimeout(() => { $("shareBtn").textContent = T.share; }, 2500);
};

connectRoomProvider().then(({ room: r, p2p }) => {
  room = r; p2pMode = p2p;
  if (room) { $("hostBtn").disabled = false; $("joinBtn").disabled = false; note(""); refreshResume(); }
  else note(T.needClaude);
});

function keepAwake() { try { navigator.wakeLock && navigator.wakeLock.request("screen").catch(() => {}); } catch (e) {} }
keepAwake();
document.addEventListener("visibilitychange", () => { if (!document.hidden) keepAwake(); });

const fsOk = !!(document.documentElement.requestFullscreen && document.fullscreenEnabled);
async function goFullscreen() {
  if (!fsOk || document.fullscreenElement || !matchMedia("(pointer: coarse)").matches) return;
  try { await document.documentElement.requestFullscreen({ navigationUI: "hide" }); } catch (e) { return; }
  try { await screen.orientation.lock("portrait"); } catch (e) {}
}
$("fsBtn").onclick = () => (document.fullscreenElement ? document.exitFullscreen().catch(() => {}) : document.documentElement.requestFullscreen().catch(() => {}));
document.addEventListener("fullscreenchange", () => { $("fsBtn").textContent = document.fullscreenElement ? T.windowed : T.fullscreen; });
function inGame(on) { $("turn").classList.toggle("active", on); $("fsBtn").hidden = !on || !fsOk; keepAwake(); }

// ---------- Spielschleife ----------
let last = performance.now();
function frame(now) {
  const dt = Math.min((now - last) / 1000, 0.033); last = now;
  // Testmodus: mehrere Schritte pro Bild, damit ein automatisch gespielter Satz schnell durchläuft
  for (let k = 0; k < (test.pause || paused ? 0 : test.speed); k++) { try { if (test.auto) autopilot(dt); step(dt); } catch (e) { console.error(e); } }
  draw();
  requestAnimationFrame(frame);
}

function step(dt) {
  gameTime += dt;
  if (hawk) {
    hawk.t += dt;
    if (hawk.t >= hawk.dur) { const then = hawk.then; hawk = null; then(); }
    return;
  }
  runTimers();
  // Tastatur: Schläger beschleunigt bis auf etwa doppeltes Tempo
  const dir = (keys.ArrowRight ? 1 : 0) - (keys.ArrowLeft ? 1 : 0);
  if (dir) {
    kbV = Math.min(Math.max(kbV, B.keyboard.start) + B.keyboard.accel * dt, B.keyboard.max);
    const [a, b] = racketLimits();
    px = clamp(px + dir * kbV * dt, a, b);
  } else kbV = 0;
  { const [a, b] = racketLimits(); px = clamp(px, a, b); }
  const v = (px - lastPx) / Math.max(dt, 1e-3); lastPx = px;
  pVel = pVel * 0.7 + v * 0.3;
  if (mode === "play" && Math.abs(px - sentPx) > 0.004) { sentPx = px; publish({ px: r3(px) }); }
  if (mode === "solo" && ai) { aiStep(ai, dt); oppX = 1 - ai.x; }

  flashes.forEach(f => { f.t += dt; }); flashes = flashes.filter(f => f.t < 0.35);
  if (mode === "machine" && run && !run.over) MA.stepTargets(run, dt);
  popups.forEach(q => { q.t += dt; }); popups = popups.filter(q => q.t < 1);
  machineFlash = Math.max(0, machineFlash - dt);
  stepFireworks(dt);
  marks.forEach(m => { m.t += dt; }); marks = marks.filter(m => m.t < 2.2);
  netShake = Math.max(0, netShake - dt * 2.5);

  switch (ball.phase) {
    case "toss":
      ball.tossT += dt;
      if (mode === "play") publish({ toss: r3(ball.tossT / TOSS) });
      if (ball.tossT > TOSS) { ball.phase = "serve"; if (mode === "play") publish({ toss: null }); }   // nicht geschlagen: nochmals werfen
      return;
    case "oppserve":
      if (mode === "solo" && (aiTimer -= dt) <= 0) {
        ball.phase = "opptoss"; ball.tossT = 0; aiErr = aiServeErr(ai, serveNo); sfx.toss();
      }
      return;
    case "opptoss":
      ball.tossT += dt;
      if (ball.tossT >= (TOSS / 2) * (1 + aiErr)) {
        const sh = R.makeServe({ x0: ai.x, side: R.serveSide(score), no: serveNo, err: aiErr, sup: false }, ai.lv, Math.random, matchOpts);
        launch(sh, "B");
      }
      return;
    case "fly": stepFlight(dt); return;
    default:
  }
}

function stepFlight(dt) {
  const sh = ball.shot, tl = ball.tl, recv = other(ball.from);
  if (ball.hold > 0) { ball.hold -= dt; return; }
  const prevD = R.at(sh, ball.t).d;
  ball.t += dt;
  const p = display(ball.t);
  trail.push({ x: p.x, y: p.v * D - p.h * 0.9 }); if (trail.length > (sh.sup ? 16 : 10)) trail.shift();

  // Netz: hängen bleiben, Netzroller oder einfach drüber
  if (!ball.ev.net && ball.t >= tl.tNet) {
    ball.ev.net = true;
    if (sh.why === "net") { sfx.net(); netShake = 1; later(0.35, resolveDead); ball.phase = "dead"; ball.last = p; return; }
    if (sh.nc) { sfx.tock(); netShake = 1; announce(T.netcord, null, true); buzz(25); }
  }
  // Aufsprung: Ballabdruck, bei Aus/Fehler/Let sofort entschieden
  if (!ball.ev.bounce && sh.why !== "net" && ball.t >= tl.tBounce) {
    ball.ev.bounce = true;
    const bp = display(tl.tBounce);
    marks.push({ x: bp.x, y: bp.v * D, t: 0, out: sh.res !== "in" && sh.res !== "let" });
    sfx.bounce();
    if (sh.res !== "in") { ball.last = bp; resolveDead(); return; }
    if (closeCall(sh)) crowd.murmur();
    if (mode === "machine" && ball.from === myRole) machineReturn(sh, bp);
  }
  if (sh.res !== "in" || !p.bounced) return;

  // Empfänger: treffen oder verpassen
  const d = p.d, line = 2 - HIT_LINE;
  if (recv === myRole) {
    if (d >= line && prevD <= 2 + 0.06 && Math.abs(p.x - px) <= reach()) { myHit(p.x); return; }
    if (d > MISS_D) { ball.phase = "gone"; const s0 = sh, f0 = ball.from; later(0.2, () => withHawk(s0, f0, true, () => awardPoint(f0))); }
  } else if (mode === "machine") {
    if (d > MISS_D) ball.phase = "gone";
  } else if (mode === "solo") {
    if (d >= line && prevD <= 2 + 0.06 && Math.abs(p.x - oppX) <= oppReach()) { aiHit(p.x); return; }
    if (d > MISS_D) {
      ball.phase = "gone";
      if (careerMatch && sh.serve && rallyStrokes === 1) matchStats.aces++;
      const s0 = sh, f0 = ball.from; later(0.2, () => withHawk(s0, f0, true, () => scorePoint(myRole)));
    }
  } else {
    // Gegner auf dem anderen Handy: am Schläger kurz halten, bis sein Rückschlag eintrifft
    if (!ball.held && d >= line && d <= 2 + 0.06 && Math.abs(p.x - oppX) <= reach()) { ball.held = true; ball.hold = B.timing.holdMax; }
    else if (d > MISS_D) ball.phase = "gone";
  }
}

// ---------- Zeichnen (Einheit: Platzbreite, Ursprung: Netz am linken Rand) ----------
function draw() {
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  ctx.fillStyle = surfaceCol ? surfaceCol.surround : css("--surround"); ctx.fillRect(0, 0, W, H);
  ctx.setTransform(s * dpr, 0, 0, s * dpr, ox * dpr, (H / 2) * dpr);

  const bl = C.baseline * D, sl = C.serviceLine * D, white = css("--line");
  drawCourtSurface();

  // Aufschlagfeld leuchtet beim Aufschlag dezent
  const side = R.serveSide(score);
  if (playing() && (ball.phase === "serve" || ball.phase === "toss")) {
    const [b0, b1] = R.serviceBox(side);
    ctx.fillStyle = "rgba(223,242,60,.14)"; ctx.fillRect(b0, -sl, b1 - b0, sl);
  } else if (playing() && (ball.phase === "oppserve" || ball.phase === "opptoss")) {
    const [b0, b1] = R.serviceBox(side);
    ctx.fillStyle = "rgba(223,242,60,.10)"; ctx.fillRect(1 - b1, 0, b1 - b0, sl);
  }


  // Ballabdrücke (bei Aus zusätzlich beschriftet, nicht nur farbig)
  marks.forEach(m => {
    const a = Math.max(0, 1 - m.t / 2.2);
    ctx.globalAlpha = 0.75 * a;
    ctx.beginPath(); ctx.ellipse(m.x, m.y, C.ballR * 1.1, C.ballR * 0.7, 0, 0, Math.PI * 2);
    ctx.fillStyle = m.out ? "rgba(255,138,61,.9)" : "rgba(255,255,255,.85)"; ctx.fill();
    if (m.out) {
      ctx.fillStyle = white; ctx.font = "700 0.04px 'Barlow Condensed', system-ui, sans-serif"; ctx.textAlign = "center";
      ctx.fillText("AUS", m.x, m.y + (m.y < 0 ? -0.045 : 0.07));
    }
    ctx.globalAlpha = 1;
  });

  // Netz in der Mitte, wackelt beim Netzroller
  const shake = reducedMotion.matches ? 0 : Math.sin(performance.now() / 18) * 0.007 * netShake;
  ctx.save(); ctx.translate(0, shake);
  ctx.fillStyle = "rgba(10,20,18,.5)"; ctx.fillRect(0.02, -0.016, 0.96, 0.032);
  ctx.strokeStyle = "rgba(255,255,255,.2)"; ctx.lineWidth = 0.002;
  for (let x = 0.02; x <= 0.98; x += 0.016) line(x, -0.016, x, 0.016);
  ctx.fillStyle = white; ctx.fillRect(0.02, -0.004, 0.96, 0.008);
  ctx.restore();
  circle(0.02, 0, 0.012, "#1a1a1a"); circle(0.98, 0, 0.012, "#1a1a1a");

  // Schläger: Gegner oben (Griff nach oben), du unten
  const showOpp = mode === "solo" || (mode === "play" && oppHere);
  if (mode === "machine") { drawTargets(); drawMachine(); }
  else if (showOpp) drawRacket(oppX, -D, -1, false, ai && ai.lv ? ai.lv.hw : LV.hw);
  drawRacket(px, D, 1, armed);

  drawBall(showOpp);
  drawPopups();
  drawFireworks();
  if (hawk) { drawHawk(); return; }

  flashes.forEach(f => {
    ctx.globalAlpha = 1 - f.t / 0.35; ctx.strokeStyle = f.sup ? css("--super") : css("--line"); ctx.lineWidth = f.sup ? 0.008 : 0.005;
    ctx.beginPath(); ctx.arc(f.x, f.y, C.ballR + f.t * (f.sup ? 0.45 : 0.25), 0, Math.PI * 2); ctx.stroke(); ctx.globalAlpha = 1;
  });

  // Hinweise in der eigenen Hälfte
  let hint = "";
  if (playing()) {
    if (ball.phase === "serve") hint = mode === "play" && !oppHere ? T.hintWait : T.hintServe;
    else if (ball.phase === "toss") hint = T.hintToss;
    else if (ball.phase === "oppserve" || ball.phase === "opptoss") hint = T.hintOppServe(oppName);
  }
  if (hint) {
    ctx.fillStyle = "rgba(244,247,242,.92)"; ctx.textAlign = "center";
    ctx.font = "600 0.042px Barlow, system-ui, sans-serif";
    ctx.fillText(hint, 0.5, D * 0.42);
    if (serveNo === 2 && ball.phase !== "idle") {
      ctx.font = "700 0.05px 'Barlow Condensed', system-ui, sans-serif"; ctx.fillStyle = css("--ball");
      ctx.fillText(T.serve2.toUpperCase(), 0.5, D * 0.42 - 0.065);
    }
  }
}

/** Platzfläche mit Gassen und allen Linien (ohne Netz), in Platzeinheiten. */
function drawCourtSurface() {
  const bl = C.baseline * D, sl = C.serviceLine * D, lw = 0.008;
  ctx.fillStyle = surfaceCol ? surfaceCol.court : css("--court"); ctx.fillRect(C.doublesL, -bl, C.doublesR - C.doublesL, bl * 2);
  // Doppelgassen sind Aus: dunkler
  ctx.fillStyle = "rgba(0,0,0,.16)";
  ctx.fillRect(C.doublesL, -bl, C.singlesL - C.doublesL, bl * 2);
  ctx.fillRect(C.singlesR, -bl, C.doublesR - C.singlesR, bl * 2);
  ctx.strokeStyle = css("--line"); ctx.lineWidth = lw;
  line(C.doublesL + lw / 2, -bl, C.doublesL + lw / 2, bl);
  line(C.doublesR - lw / 2, -bl, C.doublesR - lw / 2, bl);
  line(C.singlesL, -bl, C.singlesL, bl);
  line(C.singlesR, -bl, C.singlesR, bl);
  line(C.singlesL, sl, C.singlesR, sl);
  line(C.singlesL, -sl, C.singlesR, -sl);
  line(0.5, -sl, 0.5, sl);
  ctx.lineWidth = lw * 1.6; line(C.doublesL, bl, C.doublesR, bl); line(C.doublesL, -bl, C.doublesR, -bl);
  ctx.lineWidth = lw; line(0.5, bl, 0.5, bl - 0.03); line(0.5, -bl, 0.5, -bl + 0.03);
}

/** Hawk-Eye: Zoom auf den Aufsprung, Ball in Zeitlupe, Abdruck, Entscheid IN oder AUS. */
function drawHawk() {
  const h = hawk, sh = h.sh, tl = R.timeline(sh);
  const bp = shotDisplay(sh, h.from, tl.tBounce), gx = bp.x, gy = bp.v * D;
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  ctx.fillStyle = "rgba(4,12,10,.62)"; ctx.fillRect(0, 0, W, H);
  const P = Math.min(W - 32, H * 0.55), wx = (W - P) / 2, wy = (H - P) / 2, k = P / 0.24;
  ctx.save();
  ctx.beginPath(); ctx.rect(wx, wy, P, P); ctx.clip();
  ctx.fillStyle = surfaceCol ? surfaceCol.surround : css("--surround"); ctx.fillRect(wx, wy, P, P);
  ctx.setTransform(k * dpr, 0, 0, k * dpr, (wx + P / 2 - gx * k) * dpr, (wy + P / 2 - gy * k) * dpr);
  drawCourtSurface();
  const u = h.t / h.dur, R0 = C.ballR;
  if (u < 0.55) {
    // Zeitlupe über die letzten 0,11 Platzbreiten vor dem Aufsprung (so bleibt der Ball im Zoom-Fenster)
    const span = Math.min(0.25, 0.11 / Math.max(0.05, sh.s2 * D));
    const p = shotDisplay(sh, h.from, tl.tBounce - span + (u / 0.55) * span), y = p.v * D;
    circle(p.x + p.h * 0.15, y + 0.004, R0 * 0.95, "rgba(0,0,0,.3)");
    circle(p.x, y - p.h * 0.9, R0 * (1 + p.h * 2.2), css("--ball"));
  } else {
    ctx.beginPath(); ctx.ellipse(gx, gy, R0 * 1.25, R0 * 0.85, 0, 0, Math.PI * 2);
    ctx.fillStyle = "rgba(255,255,255,.55)"; ctx.fill();
    ctx.lineWidth = 0.002; ctx.strokeStyle = h.isIn ? "#ffffff" : css("--super"); ctx.stroke();
  }
  ctx.restore();
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  ctx.strokeStyle = "rgba(255,255,255,.7)"; ctx.lineWidth = 2; ctx.strokeRect(wx, wy, P, P);
  ctx.fillStyle = "rgba(15,42,34,.85)"; ctx.fillRect(wx, wy, 96, 26);
  ctx.fillStyle = "#f4f7f2"; ctx.font = "700 14px 'Barlow Condensed', system-ui, sans-serif"; ctx.textAlign = "left"; ctx.textBaseline = "middle";
  ctx.fillText(T.hawk.toUpperCase(), wx + 10, wy + 13);
  if (u >= 0.6) {
    const label = h.isIn ? T.hawkIn : T.hawkOut;
    ctx.font = "800 44px 'Barlow Condensed', system-ui, sans-serif"; ctx.textAlign = "center";
    const tw = ctx.measureText(label).width + 36;
    ctx.fillStyle = h.isIn ? "rgba(15,42,34,.92)" : css("--super");
    ctx.fillRect(W / 2 - tw / 2, wy + P - 64, tw, 52);
    ctx.fillStyle = h.isIn ? css("--ball") : "#0f2a22";
    ctx.fillText(label, W / 2, wy + P - 37);
  }
  ctx.textBaseline = "alphabetic";
}

function drawBall(showOpp) {
  let x, v, h, ring = -1, sup = false;
  const ph = ball.phase;
  if (ph === "idle" || ph === "serve" || ph === "toss") {
    x = px; v = 1 - 0.1 / D; h = 0.02;
    if (ph === "toss") {
      const u = ball.tossT / TOSS; h = 0.02 + B.serve.height * 4 * u * (1 - u);
      ring = Math.abs(u - 0.5) / 0.5;                          // 0 = idealer Moment
    }
  } else if ((ph === "oppserve" || ph === "opptoss") && showOpp) {
    x = oppX; v = -1 + 0.1 / D; h = 0.02;
    const tu = ph === "opptoss" ? ball.tossT / TOSS : oppTossT;
    if (tu >= 0) h = 0.02 + B.serve.height * 4 * tu * (1 - tu);
  } else if (ph === "fly" || ph === "dead" || ph === "gone") {
    if (ph === "gone") return;
    const p = ph === "dead" && ball.last ? ball.last : display(ball.t);
    x = p.x; v = p.v; h = p.h; sup = ball.shot.sup;
  } else return;

  const gy = v * D, by = gy - h * 0.9, r = C.ballR * (1 + h * 2.2);
  if (ph === "fly") {
    const col = sup ? css("--super") : css("--ball");
    for (let i = 0; i < trail.length; i++) {
      const t = trail[i]; ctx.globalAlpha = (i / trail.length) * (sup ? 0.55 : 0.22);
      circle(t.x, t.y, C.ballR * (0.5 + (i / trail.length) * 0.5), col);
    }
    ctx.globalAlpha = 1;
  }
  circle(x + 0.006 + h * 0.15, gy + 0.008, C.ballR * 0.95, "rgba(0,0,0,.28)");    // Schatten auf dem Boden
  if (sup && ph === "fly") { ctx.globalAlpha = 0.35; circle(x, by, r * 1.8, css("--super")); ctx.globalAlpha = 1; }
  circle(x, by, r, css("--ball"));
  ctx.strokeStyle = "rgba(255,255,255,.85)"; ctx.lineWidth = 0.004;
  ctx.beginPath(); ctx.arc(x - r * 1.15, by, r * 0.9, -0.9, 0.9); ctx.stroke();
  ctx.beginPath(); ctx.arc(x + r * 1.15, by, r * 0.9, Math.PI - 0.9, Math.PI + 0.9); ctx.stroke();
  if (ring >= 0) {
    // Ring um den Ball: am kleinsten im idealen Moment
    const W1 = (serveNo === 1 ? B.serve.first : B.serve.second);
    ctx.lineWidth = 0.006;
    ctx.strokeStyle = ring <= W1.perfect ? css("--ball") : ring <= W1.good ? "rgba(255,255,255,.9)" : "rgba(255,255,255,.35)";
    ctx.beginPath(); ctx.arc(x, by, r + 0.012 + ring * 0.09, 0, Math.PI * 2); ctx.stroke();
  }
}

// dir: +1 = eigener Schläger (Griff nach unten), -1 = Gegner (Griff nach oben); y = Trefferkante
function drawRacket(x, y, dir, glow, hw = LV.hw) {
  const hh = 0.05, cy = y + dir * hh * 0.6;
  ctx.fillStyle = "#1a1a1a";
  if (dir > 0) roundRect(x - 0.016, cy + hh * 0.85, 0.032, 0.085, 0.01); else roundRect(x - 0.016, cy - hh * 0.85 - 0.085, 0.032, 0.085, 0.01);
  ctx.fill();
  ctx.save();
  ctx.beginPath(); ctx.ellipse(x, cy, hw, hh, 0, 0, Math.PI * 2);
  ctx.fillStyle = glow ? "rgba(255,138,61,.35)" : "rgba(255,255,255,.12)"; ctx.fill();
  ctx.clip();
  ctx.strokeStyle = "rgba(255,255,255,.55)"; ctx.lineWidth = 0.0025;
  for (let i = -hw; i <= hw; i += 0.02) line(x + i, cy - hh, x + i, cy + hh);
  for (let j = -hh; j <= hh; j += 0.016) line(x - hw, cy + j, x + hw, cy + j);
  // Zonen andeuten: Mitte sicher, aussen scharf
  ctx.fillStyle = "rgba(255,255,255,.08)";
  ctx.fillRect(x - hw * B.zones.center, cy - hh, hw * B.zones.center * 2, hh * 2);
  ctx.restore();
  ctx.beginPath(); ctx.ellipse(x, cy, hw, hh, 0, 0, Math.PI * 2);
  ctx.strokeStyle = "#111"; ctx.lineWidth = 0.014; ctx.stroke();
  ctx.strokeStyle = glow ? css("--super") : (dir > 0 ? (myRacketCol || css("--ball")) : css("--line")); ctx.lineWidth = glow ? 0.009 : 0.005; ctx.stroke();
}

// ---------- Hilfen ----------
const cssCache = {};
function css(n) { return cssCache[n] || (cssCache[n] = getComputedStyle(document.documentElement).getPropertyValue(n).trim()); }
function line(a, b, c, d) { ctx.beginPath(); ctx.moveTo(a, b); ctx.lineTo(c, d); ctx.stroke(); }
function circle(x, y, r, c) { ctx.beginPath(); ctx.arc(x, y, r, 0, Math.PI * 2); ctx.fillStyle = c; ctx.fill(); }
function roundRect(x, y, w, h, r) { ctx.beginPath(); ctx.moveTo(x + r, y); ctx.arcTo(x + w, y, x + w, y + h, r); ctx.arcTo(x + w, y + h, x, y + h, r); ctx.arcTo(x, y + h, x, y, r); ctx.arcTo(x, y, x + w, y, r); ctx.closePath(); }
function cleanName(x) { return String(x || "").replace(/[^\p{L}\p{N} ._-]/gu, "").trim().slice(0, 14); }

// ---------- Automatischer Test (nur über die Konsole: __netzroller.test.auto = true) ----------
// Spielt die eigene Seite wie ein Mensch: Schläger zum Ball ziehen, Aufschlag mit Timing.
const test = { auto: false, speed: 1, spread: 0.6, pause: false };   // spread: Treffpunkt-Streuung des Autopiloten (> 1 = verpasst manchmal); pause: Spiel anhalten, Bild bleibt
function autopilot(dt) {
  if (!playing()) return;
  if (ball.phase === "serve") { tap(); return; }
  if (ball.phase === "toss") { if (ball.tossT >= TOSS / 2 * (1 + (Math.random() - 0.5) * 0.3)) tap(); return; }
  let target = 0.5;
  if (ball.phase === "fly" && ball.from !== myRole && ball.shot.res === "in") {
    const xr = 1 - R.xAt(ball.shot, 2);
    test.off ??= (Math.random() * 2 - 1) * test.spread;
    target = xr - test.off * reach();
  } else test.off = undefined;
  const m = 3 * dt, [a, b] = racketLimits();
  px = clamp(px + clamp(target - px, -m, m), a, b);
}
/** Spielt sec Sekunden Spielzeit sofort durch (ohne Bildschirm), mit Autopilot. */
function runFor(sec, dt = 1 / 60) { for (let t = 0; t < sec; t += dt) { if (paused) return; if (test.auto) autopilot(dt); step(dt); } }
test.drop = sec => { netTest.dropUntil = performance.now() + sec * 1000; };
test.supabase = (url, key) => { SUPABASE.url = url; SUPABASE.anonKey = key; };   // Weltrangliste gegen tools/mock-supabase.mjs testen   // WLAN kurz aus (nur Direktverbindung)
window.__netzroller = { test, runFor, get state() { return { duo, duoMe, duoFinal, duoMatch, paused, epoch, mode, phase: ball.phase, score, serveNo, myRole, px, oppX, shot: ball.shot, hawk: hawk && { isIn: hawk.isIn, t: hawk.t }, run: run && { lives: run.lives, points: run.points, combo: run.combo, returns: run.returns, speed: run.speed, over: run.over } }; } };

// ---------- Ballmaschine ----------
function startMachine() {
  audioInit(); saveName(); goFullscreen();
  pending = []; ++resetTok;
  mode = "machine"; myRole = "A"; oppName = T.machine; oppHere = true; ai = null;
  run = MA.createRun(LV); oppX = run.machineX;
  marks = []; popups = []; fireworks = []; fwTimer = 0; rallyStrokes = 0;
  showScreen(null); $("quit").hidden = false; inGame(true);
  mySupers = B.machine.supersPerLife; armed = false; updateSuperBtn();
  ball.phase = "none"; renderBoard();
  announce(T.machineStart, null);
  later(B.machine.firstDelay, fireMachine);
}

function fireMachine() {
  if (mode !== "machine" || !run || run.over) return;
  const sh = MA.nextMachineShot(run);
  oppX = run.machineX; machineFlash = 0.25;
  launch(sh, "B");
  renderBoard();
}

/** Dein Rückschlag ist im Feld der Maschine aufgesprungen. */
function machineReturn(sh, bp) {
  const r = MA.onReturn(run, bp.x, bp.v, sh.sup);
  popups.push({ x: bp.x, y: bp.v * D, t: 0, text: "+" + r.gained, hot: !!r.target });
  if (r.target) { announce(T.targetHit(r.gained), null, true); sfx.won(); burst(bp.x, bp.v * D, 18); }
  else if (B.machine.combo.some(([from]) => from === run.combo)) { announce(T.comboUp(r.mult), null, true); crowd.applause(0.5); }
  renderBoard();
  later(B.machine.nextDelay, fireMachine);
}

/** Verpasst oder ins Aus/Netz: ein Leben weniger. */
function machineError() {
  sfx.lost(); buzz([40, 40, 40]);
  const left = MA.onError(run);
  renderBoard();
  if (left <= 0) { endRun(); return; }
  announce(T.lifeLost(left), null);
  mySupers = B.machine.supersPerLife; armed = false; updateSuperBtn();
  later(B.machine.firstDelay, fireMachine);
}

/** Durchgang vorbei: in die Top 10 eintragen, bei neuem Rekord Feuerwerk. */
function endRun() {
  run.over = true; ball.phase = "none";
  const entry = { name: myName || T.you, points: run.points, date: today(), kmh: MA.kmh(run.maxSpeed) };
  const rank = MA.addHighscore(profile.highscores, entry);
  ON.queueScore(profile, run.points, entry.kmh);
  saveProfile(profile);
  syncOnline();
  const record = rank === 0 && run.points > 0;
  $("overTitle").textContent = record ? T.newRecord : T.runOver;
  $("overText").textContent = T.runText(run.points, run.bestCombo, entry.kmh);
  renderHighscores($("overList"), profile.highscores, entry);
  $("overList").hidden = false;
  $("againBtn").textContent = T.againMachine;
  renderBoard();
  if (record) {
    announce(T.newRecord, T.newRecord, true); crowd.cheer(1.4);
    if (!reducedMotion.matches) { fwTimer = 2.6; later(2.6, () => showScreen("over")); return; }
  } else crowd.applause(0.6);
  showScreen("over");
}

// ---------- Feuerwerk (nur Darstellung, in Bildschirm-Pixeln) ----------
function burst(x, y, n, inPx) {
  const cols = [css("--ball"), css("--super"), "#ffffff", "#7fd3ff", "#ff6b8b"];
  const cx = inPx ? x : ox + x * s, cy = inPx ? y : H / 2 + y * s;
  for (let i = 0; i < n; i++) {
    const a = Math.random() * Math.PI * 2, sp = 60 + Math.random() * 160;
    fireworks.push({ x: cx, y: cy, vx: Math.cos(a) * sp, vy: Math.sin(a) * sp, t: 0, life: 0.8 + Math.random() * 0.6, c: cols[i % cols.length] });
  }
}
function stepFireworks(dt) {
  if (fwTimer > 0) {
    fwTimer -= dt;
    if (Math.random() < dt * 3.2) burst(W * (0.15 + Math.random() * 0.7), H * (0.12 + Math.random() * 0.4), 46, true);
  }
  fireworks.forEach(f => { f.t += dt; f.x += f.vx * dt; f.y += f.vy * dt; f.vy += 140 * dt; f.vx *= 0.99; });
  fireworks = fireworks.filter(f => f.t < f.life);
}
function drawFireworks() {
  if (!fireworks.length) return;
  ctx.save(); ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  fireworks.forEach(f => { ctx.globalAlpha = Math.max(0, 1 - f.t / f.life); ctx.fillStyle = f.c; ctx.fillRect(f.x - 2, f.y - 2, 4, 4); });
  ctx.restore(); ctx.globalAlpha = 1;
}

function drawTargets() {
  if (!run) return;
  run.targets.forEach(t => {
    const fade = Math.min(1, (B.machine.targets.ttl - t.age) / 1.2, t.age / 0.3);
    const cy = t.v * D, ry = t.r * D;
    ctx.globalAlpha = Math.max(0, fade);
    ctx.beginPath(); ctx.ellipse(t.x, cy, t.r, ry, 0, 0, Math.PI * 2); ctx.fillStyle = "rgba(255,255,255,.85)"; ctx.fill();
    ctx.beginPath(); ctx.ellipse(t.x, cy, t.r * 0.68, ry * 0.68, 0, 0, Math.PI * 2); ctx.fillStyle = css("--super"); ctx.fill();
    ctx.beginPath(); ctx.ellipse(t.x, cy, t.r * 0.34, ry * 0.34, 0, 0, Math.PI * 2); ctx.fillStyle = "rgba(255,255,255,.95)"; ctx.fill();
    ctx.globalAlpha = 1;
  });
}

/** Die Ballmaschine oben hinter der Grundlinie. */
function drawMachine() {
  const x = oppX, y = -D;
  ctx.fillStyle = "#1a1a1a"; roundRect(x - 0.13, y - 0.11, 0.26, 0.1, 0.02); ctx.fill();
  ctx.fillStyle = css("--ball");
  for (let i = 0; i < 5; i++) { ctx.beginPath(); ctx.moveTo(x - 0.11 + i * 0.05, y - 0.03); ctx.lineTo(x - 0.09 + i * 0.05, y - 0.03); ctx.lineTo(x - 0.065 + i * 0.05, y - 0.06); ctx.lineTo(x - 0.085 + i * 0.05, y - 0.06); ctx.fill(); }
  ctx.fillStyle = "#2b2b2b"; roundRect(x - 0.03, y - 0.03, 0.06, 0.05, 0.01); ctx.fill();          // Rohr
  for (let i = 0; i < 4; i++) circle(x - 0.075 + i * 0.05, y - 0.095, 0.016, css("--ball"));      // Bälle im Korb
  if (machineFlash > 0) { ctx.globalAlpha = machineFlash / 0.25; circle(x, y + 0.03, 0.04, "rgba(255,255,255,.8)"); ctx.globalAlpha = 1; }
}

function drawPopups() {
  popups.forEach(q => {
    ctx.globalAlpha = 1 - q.t;
    ctx.fillStyle = q.hot ? css("--super") : css("--line");
    ctx.font = "800 0.06px 'Barlow Condensed', system-ui, sans-serif"; ctx.textAlign = "center";
    ctx.fillText(q.text, q.x, q.y - 0.05 - q.t * 0.08);
    ctx.globalAlpha = 1;
  });
}

$("machineBtn").onclick = startMachine;
$("netPauseLeave").onclick = leave;
$("duoBtn").addEventListener("click", () => {
  tourWanted = false;
  $("duoTitle").textContent = T.duoTitle; $("duoHelp").hidden = true; $("hostBtn").textContent = T.host;
  refreshResume();
});
$("duoTourBtn").onclick = () => {
  tourWanted = true;
  $("duoTitle").textContent = T.duoTourTitle; $("duoHelp").hidden = false; $("hostBtn").textContent = T.duoTourHost;
  $("resumeBtn").hidden = true;
  showScreen("duo");
};
$("resumeBtn").onclick = () => { const g = loadLastGame(); if (g) { audioInit(); goFullscreen(); enterRoom(g.code, g.host, g); } };

// ---------- Einstellungen, Intro, Menü ----------
// ---------- Weltrangliste ----------
/** Offene Einträge im Hintergrund hochladen (gebündelt, Fehler stören das Spiel nie). */
let syncT = 0;
function syncOnline(delay = 500) {
  clearTimeout(syncT);
  syncT = setTimeout(() => { ON.sync(profile, () => saveProfile(profile)).catch(() => {}); }, delay);
}
if (ON.ensureIdentity(profile)) saveProfile(profile);
syncOnline(3000);

function applySettings(p) {
  setSound(p.settings.sound); setVoice(p.settings.voice); setVibration(p.settings.vibration);
  superBtn.classList.toggle("lefty", p.settings.lefty);
  myName = p.name;
  syncOnline(2000);                                       // Name oder Land geändert: in der Weltrangliste nachführen
  $("noVoice").hidden = !p.settings.voice || hasVoice();
  renderBoard();
}
function runIntro() {
  showScreen(null);
  return playIntro({ root: $("intro"), canvas: $("introCv"), skip: $("introSkip"), tapHint: $("introTap"), reduced: reducedMotion.matches })
    .then(() => { profile.introSeen = today(); saveProfile(profile); showScreen(/^[a-z0-9]{4}$/.test(hashCode) ? "duo" : "menu"); });
}
initUI({ profile, onChange: applySettings, onIntro: runIntro });
myRacketCol = racketColor(profile);
initCareerUI({
  profile, save: () => saveProfile(profile), onPlay: startCareerMatch, onCelebrate: celebrate,
  onClosed: c => { queueCareerOnline(c); saveProfile(profile); syncOnline(); },
  userName: () => myName || T.you, onRacket: () => { myRacketCol = racketColor(profile); },
});
applySettings(profile);

resize(); setLevel(level, false); renderBoard();
if (profile.settings.intro && profile.introSeen !== today()) runIntro();
else showScreen(/^[a-z0-9]{4}$/.test(hashCode) ? "duo" : "menu");
requestAnimationFrame(frame);
