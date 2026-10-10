// Karriere-Bildschirme: Übersicht, Turnierbaum, Tour-Rangliste, Vitrine und Statistik, Siegerehrung.
// Die Logik steckt in tour.js; hier wird nur angezeigt und auf Knöpfe reagiert.

import * as TO from "./tour.js";
import { T } from "./texts.js";
import { BALANCE as B } from "./balance.js";
import { showScreen } from "./ui.js";
import { paintFlag } from "./flags.js";

const $ = id => document.getElementById(id);
const K = B.career;
let ctx = null;   // { profile, save(), onPlay(match), onCelebrate(), userName(), onRacket() }

function el(tag, cls, text) { const e = document.createElement(tag); if (cls) e.className = cls; if (text !== undefined) e.textContent = text; return e; }
function flag(code) { const c = el("canvas", "flag sm"); requestAnimationFrame(() => paintFlag(c, code)); return c; }
const nameOf = i => (i === TO.USER ? ctx.userName() : TO.PLAYERS[i].name);
const landOf = i => (i === TO.USER ? ctx.profile.land : TO.PLAYERS[i].land);

/** Karriere aus dem Profil, bei Bedarf neu angelegt. */
function career() {
  if (!TO.validCareer(ctx.profile.career)) { ctx.profile.career = TO.newCareer(); ctx.save(); }
  return ctx.profile.career;
}

export function initCareerUI(o) {
  ctx = o;
  $("careerBtn").onclick = openCareer;
  $("crBack").onclick = () => showScreen("menu");
  $("crRankBtn").onclick = () => { renderRanking(); showScreen("tourRank"); };
  $("crCabBtn").onclick = () => { renderCabinet(); showScreen("cabinet"); };
  $("tourRankBack").onclick = openCareer;
  $("cabinetBack").onclick = openCareer;
  $("bracketBack").onclick = openCareer;
  $("ceremonyBtn").onclick = openCareer;
  let confirmT = 0;
  $("newCareerBtn").onclick = () => {
    if (Date.now() - confirmT > 4000) { confirmT = Date.now(); $("newCareerMsg").hidden = false; return; }
    ctx.profile.career = TO.newCareer(); ctx.save(); $("newCareerMsg").hidden = true; confirmT = 0; openCareer();
  };
}

// ---------- Übersicht ----------
export function openCareer() { renderHub(); showScreen("career"); }

function renderHub(note) {
  const c = career(), rk = TO.ranks(c), rank = rk[TO.USER];
  $("crSeason").textContent = T.season(c.season);
  $("crRank").textContent = T.rankLine(rank, TO.totalPoints(c, TO.USER));
  $("crIntro").hidden = c.history.length > 0;
  $("crNote").hidden = !note; $("crNote").textContent = note || "";

  const t = TO.tournament(c.ti), sf = B.surfaces[t.surface];
  $("crTName").textContent = T.tournaments[c.ti];
  $("crTMeta").textContent = `${T.categories[t.cat]} · ${T.surfaceNames[t.surface]} (${T.surfaceHints[t.surface]}) · ${T.drawSize(t.size)}`;
  $("crSwatch").style.background = sf.court;
  $("crTFormat").textContent = t.cat === "final" ? T.formatFinal : t.finalSets ? T.formatGs : T.formatEarly;

  const actions = $("crActions"); actions.textContent = "";
  const btn = (label, cls, fn) => { const b = el("button", cls, label); b.onclick = fn; actions.appendChild(b); };
  const elig = TO.eligibility(c, c.ti);
  let info = "";
  if (c.current) btn(T.bracket, "", showBracket);
  else if (elig.ok) { btn(T.playTournament, "", () => start(true)); btn(T.skipTournament, "ghost", () => start(false)); }
  else {
    info = t.cat === "final" ? T.finalOnlyTop8(rank) : T.needRank(elig.need, rank) + " " + (elig.wildcard ? T.wildcardLeft : T.wildcardGone);
    if (elig.wildcard) btn(T.useWildcard, "", () => { c.wildcardUsed = true; start(true); });
    btn(T.watchTournament, elig.wildcard ? "ghost" : "", () => start(false));
  }
  $("crElig").textContent = info; $("crElig").hidden = !info;

  // Saisonplan
  const plan = $("crPlan"); plan.textContent = "";
  K.tournaments.forEach((tt, i) => {
    const li = el("li", i === c.ti ? "now" : "");
    const sw = el("i", "sw"); sw.style.background = B.surfaces[tt.surface].court;
    const h = c.history.slice().reverse().find(x => x.season === c.season && x.ti === i);
    li.append(sw, el("span", "pl-name", T.tournaments[i]), el("span", "pl-res", h ? T.rounds[h.result] + (h.points ? ` · +${h.points}` : "") : i === c.ti ? "←" : ""));
    plan.appendChild(li);
  });
}

function start(withUser) {
  const c = career();
  TO.startTournament(c, c.ti, withUser);
  if (!withUser) TO.simulateRest(c);
  ctx.save();
  showBracket();
}

// ---------- Turnierbaum ----------
export function showBracket() { renderBracket(); showScreen("bracket"); }

function renderBracket() {
  const c = career(), cur = c.current;
  if (!cur) { openCareer(); return; }
  const t = TO.tournament(cur.ti), rk = TO.ranks(c);
  $("brTitle").textContent = T.tournaments[cur.ti];
  $("brMeta").textContent = `${T.categories[t.cat]} · ${T.surfaceNames[t.surface]}`;
  const body = $("brBody"); body.textContent = "";

  const matchBox = (a, b, w) => {
    const box = el("div", "mb" + (a === TO.USER || b === TO.USER ? " you" : ""));
    for (const p of [a, b]) {
      const row = el("div", "mr" + (w === p ? " won" : w !== undefined && w !== null ? " out" : ""));
      if (p === null || p === undefined) { row.append(el("span", "nm", "–")); box.appendChild(row); continue; }
      row.append(flag(landOf(p)), el("span", "nm", nameOf(p)), el("span", "rk", "#" + rk[p]));
      box.appendChild(row);
    }
    return box;
  };

  if (cur.cat === "final") {
    cur.groups.forEach((g, gi) => {
      const col = el("div", "grp");
      col.appendChild(el("div", "ct", T.groupTable(gi === 0 ? "A" : "B")));
      TO.standings(cur, g).forEach(p => {
        const row = el("div", "mr" + (p === TO.USER ? " me" : ""));
        row.append(flag(landOf(p)), el("span", "nm", nameOf(p)), el("span", "rk", T.groupWins(cur.wins[p])));
        col.appendChild(row);
      });
      body.appendChild(col);
    });
    if (cur.semis) {
      const col = el("div", "col"); col.appendChild(el("div", "ct", T.rounds.SF));
      cur.semis.forEach(([a, b], i) => col.appendChild(matchBox(a, b, cur.final ? cur.final[i] : undefined)));
      body.appendChild(col);
    }
    if (cur.final) {
      const col = el("div", "col"); col.appendChild(el("div", "ct", T.rounds.F));
      col.appendChild(matchBox(cur.final[0], cur.final[1], cur.champion ?? undefined));
      body.appendChild(col);
    }
  } else {
    cur.rounds.forEach((slots, r) => {
      if (slots.length === 1) return;
      const col = el("div", "col");
      col.appendChild(el("div", "ct", T.rounds[TO.roundKey(cur.size, r)]));
      const next = cur.rounds[r + 1];
      for (let k = 0; k < slots.length; k += 2) col.appendChild(matchBox(slots[k], slots[k + 1], next ? next[k / 2] : undefined));
      body.appendChild(col);
    });
    if (cur.champion !== undefined && cur.champion !== null) {
      const col = el("div", "col"); col.appendChild(el("div", "ct", T.rounds.W));
      const box = el("div", "mb champ" + (cur.champion === TO.USER ? " you" : ""));
      const row = el("div", "mr won"); row.append(flag(landOf(cur.champion)), el("span", "nm", nameOf(cur.champion)));
      box.appendChild(row); col.appendChild(box); body.appendChild(col);
    }
  }

  // Was als Nächstes?
  const act = $("brAction"); act.textContent = "";
  const m = TO.userNextMatch(c);
  if (m) {
    const p = TO.PLAYERS[m.opp], round = m.key === "G" ? T.groupDay(m.roundIndex + 1) : T.rounds[m.key];
    const card = el("div", "next");
    const who = el("div", "who"); who.append(flag(p.land), el("b", "", p.name));
    card.append(el("div", "label", T.nextMatch(round, "")), who, el("div", "small", T.oppInfo(rk[m.opp], T.styles[p.style]) + " · " + T.styleHints[p.style]));
    const b = el("button", "", T.playMatch); b.onclick = () => ctx.onPlay({ ...m, ti: cur.ti, round });
    act.append(card, b);
  } else if (!cur.done) {
    act.appendChild(el("p", "small", cur.userIn ? T.youOut(T.rounds[TO.userResultKey(cur)] || "") : T.youWatch));
    const b = el("button", "", T.finishTournament); b.onclick = () => { TO.simulateRest(c); ctx.save(); renderBracket(); };
    act.appendChild(b);
  } else {
    act.appendChild(el("p", "small", T.champion(nameOf(cur.champion))));
    const b = el("button", "", T.closeTournament); b.onclick = close;
    act.appendChild(b);
  }
}

/** Turnier abschliessen: Punkte, Rangliste, Belohnungen, bei Turniersieg Siegerehrung. */
function close() {
  const c = career(), colorsBefore = TO.unlockedColors(c).map(x => x.id);
  const s = TO.closeTournament(c, true);
  ctx.save();
  const fresh = TO.unlockedColors(c).filter(x => !colorsBefore.includes(x.id)).map(x => T.colorNames[x.id]);
  const note = (s.userIn ? T.summary(s.userPoints, s.rankBefore, s.rankAfter) : "") + (fresh.length ? " · " + T.newColor(fresh.join(", ")) : "");
  if (s.userWon) {
    $("cerTrophy").innerHTML = trophySvg(TO.tournament(s.ti).cat, 96);
    $("cerTitle").textContent = T.tournaments[s.ti];
    $("cerText").textContent = T.ceremonyText(T.tournaments[s.ti], s.season);
    $("cerSummary").textContent = note;
    showScreen("ceremony");
    ctx.onCelebrate();
  } else {
    renderHub(note);
    showScreen("career");
  }
}

/** Nach deinem Match: Ergebnis eintragen. Gibt die Namen neu freigeschalteter Schlägerfarben zurück. */
export function reportMatch(won, stats) {
  const c = career(), before = TO.unlockedColors(c).map(x => x.id);
  Object.keys(stats).forEach(k => {
    if (k === "longestRally") c.stats.longestRally = Math.max(c.stats.longestRally, stats[k]);
    else c.stats[k] = (c.stats[k] || 0) + stats[k];
  });
  if (won) c.stats.wins++; else c.stats.losses++;
  TO.recordUserMatch(c, won);
  ctx.save();
  return TO.unlockedColors(c).filter(x => !before.includes(x.id)).map(x => T.colorNames[x.id]);
}

// ---------- Tour-Rangliste ----------
function renderRanking() {
  const c = career(), list = $("tourRankList"); list.textContent = "";
  const prev = c.prevRanks || TO.ranks(c);
  TO.ranking(c).forEach(r => {
    const li = el("li", r.idx === TO.USER ? "me" : "");
    const d = prev[r.idx] - r.rank;
    const arrow = el("span", "ar " + (d > 0 ? "up" : d < 0 ? "down" : ""), d > 0 ? T.rankUp(d) : d < 0 ? T.rankDown(-d) : T.rankSame);
    const style = r.idx === TO.USER ? "" : T.styles[TO.PLAYERS[r.idx].style];
    li.append(el("span", "rk", String(r.rank)), arrow, flag(landOf(r.idx)), el("span", "nm", nameOf(r.idx)), el("span", "st", style), el("span", "pt", String(r.points)));
    list.appendChild(li);
  });
  requestAnimationFrame(() => { const me = list.querySelector(".me"); if (me) me.scrollIntoView({ block: "center" }); });
}

// ---------- Vitrine und Statistik ----------
function renderCabinet() {
  const c = career(), s = c.stats, grid = $("cabStats"); grid.textContent = "";
  const val = { ...s, titles: s.titles.length, bestRank: s.bestRank };
  for (const k of ["wins", "losses", "titles", "bestRank", "aces", "doubleFaults", "longestRally"]) {
    const d = el("div"); d.append(el("b", "", String(val[k] ?? 0)), el("span", "", T.stats[k])); grid.appendChild(d);
  }
  const tro = $("cabTrophies"); tro.textContent = "";
  if (!s.titles.length) tro.appendChild(el("p", "small", T.trophiesEmpty));
  s.titles.forEach(x => {
    const d = el("div", "trophy");
    d.innerHTML = trophySvg(TO.tournament(x.ti).cat, 48);
    d.appendChild(el("span", "small", T.trophyLine(T.tournaments[x.ti], x.season)));
    tro.appendChild(d);
  });
  const cols = $("cabColors"); cols.textContent = "";
  const open = TO.unlockedColors(c).map(x => x.id);
  K.colors.forEach(col => {
    const b = el("button", "swatch");
    const unlocked = open.includes(col.id);
    b.disabled = !unlocked;
    b.setAttribute("aria-pressed", String(c.racket === col.id));
    const dot = el("i"); dot.style.background = col.color;
    const need = col.wins ? T.colorNeed.wins(col.wins) : col.titles ? T.colorNeed.titles(col.titles) : col.rank ? T.colorNeed.rank(col.rank) : "";
    b.append(dot, el("span", "", T.colorNames[col.id]), el("small", "", unlocked ? "" : need));
    b.onclick = () => { c.racket = col.id; ctx.save(); ctx.onRacket(); renderCabinet(); };
    cols.appendChild(b);
  });
  $("newCareerMsg").hidden = true;
}

/** Pokal als kleine SVG-Zeichnung, Farbe nach Kategorie. */
function trophySvg(cat, size) {
  const col = { GS: "#f2c94c", "1000": "#cfd8dc", "500": "#d08a4a", "250": "#dff23c", final: "#b38cff" }[cat] || "#dff23c";
  return `<svg width="${size}" height="${size}" viewBox="0 0 64 64" aria-hidden="true">
    <path d="M18 8h28v10c0 10-6 18-14 18S18 28 18 18z" fill="${col}"/>
    <path d="M18 12H9c0 9 5 14 11 15M46 12h9c0 9-5 14-11 15" fill="none" stroke="${col}" stroke-width="4"/>
    <rect x="29" y="36" width="6" height="10" fill="${col}"/><rect x="20" y="46" width="24" height="9" rx="2" fill="#3b2f1a"/></svg>`;
}

/** Aktuelle Schlägerfarbe (Karriere-Belohnung) oder null. */
export function racketColor(profile) {
  const c = profile.career;
  if (!c || !c.racket) return null;
  const col = K.colors.find(x => x.id === c.racket);
  return col ? col.color : null;
}
