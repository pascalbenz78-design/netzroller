// Anzeige des Turniers zu zweit: Turnierbaum, eigenes nächstes Spiel, Live-Stand des anderen, Knöpfe.
// Die Abläufe (Netzwerk, Matches) steuert main.js; hier wird nur gezeichnet und auf Klicks weitergeleitet.

import * as DT from "./duotour.js";
import { roundKey } from "./tour.js";
import { T } from "./texts.js";
import { paintFlag } from "./flags.js";

const $ = id => document.getElementById(id);
function el(tag, cls, text) { const e = document.createElement(tag); if (cls) e.className = cls; if (text !== undefined) e.textContent = text; return e; }
function flag(code) { const c = el("canvas", "flag sm"); requestAnimationFrame(() => paintFlag(c, code)); return c; }

/**
 * @param st   Turnierstand (oder null, solange das eröffnende Handy ihn noch nicht geschickt hat)
 * @param o.me eigene Kennung ("H0" / "H1")
 * @param o.live  Live-Stand des anderen { r, a, b, opp, done, won } oder null
 * @param o.ready true, wenn du für den Final bereit bist
 * @param o.closed true, wenn du das fertige Turnier schon abgeschlossen hast
 * @param o.note  zusätzlicher Hinweis (z. B. Eintrag in die Karriere)
 * @param o.on    { play, ready, cheer, close, leave }
 */
export function renderDuo(st, o) {
  $("dtTitle").textContent = T.duoTourTitle;
  const body = $("dtBody"), act = $("dtAction");
  body.textContent = ""; act.textContent = "";
  if (!st) {
    $("dtMeta").textContent = "";
    act.appendChild(el("p", "small", T.duoWaitHost));
    act.appendChild(button(T.duoLeave, "ghost", o.on.leave));
    return;
  }
  $("dtMeta").textContent = `${T.categories[st.cat]} · ${T.surfaceNames[st.surface]}`;

  // Turnierbaum
  const meH = o.me, other = st.humans.find(h => h.id !== meH);
  st.rounds.forEach((slots, r) => {
    if (slots.length === 1) return;
    const col = el("div", "col");
    col.appendChild(el("div", "ct", T.rounds[roundKey(st.size, r)] || ""));
    const next = st.rounds[r + 1];
    for (let k = 0; k < slots.length; k += 2) {
      const a = slots[k], b = slots[k + 1], w = next ? next[k / 2] : undefined;
      const box = el("div", "mb" + (a === meH || b === meH ? " you" : (typeof a === "string" || typeof b === "string") ? " other" : ""));
      for (const p of [a, b]) {
        const info = DT.who(st, p);
        const row = el("div", "mr" + (w === p ? " won" : w !== undefined ? " out" : ""));
        row.append(flag(info.land), el("span", "nm", info.name));
        box.appendChild(row);
      }
      col.appendChild(box);
    }
    body.appendChild(col);
  });
  if (st.done) {
    const col = el("div", "col"); col.appendChild(el("div", "ct", T.rounds.W));
    const info = DT.who(st, st.champion);
    const box = el("div", "mb champ"); const row = el("div", "mr won"); row.append(flag(info.land), el("span", "nm", info.name));
    box.appendChild(row); col.appendChild(box); body.appendChild(col);
  }

  // Live-Stand des anderen
  if (other && o.live && !st.done) {
    const L = o.live;
    const txt = L.done ? T.duoOtherDone(other.name, L.won) : T.duoOtherLive(other.name, T.rounds[L.key] || "", L.a, L.b, L.opp);
    act.appendChild(el("p", "note good", txt));
  }

  // Was kannst du tun?
  const m = DT.humanMatch(st, meH);
  if (st.done) {
    act.appendChild(el("p", "small", T.duoChampion(DT.who(st, st.champion).name)));
    if (o.note) act.appendChild(el("p", "note good", o.note));
    if (!o.closed) act.appendChild(button(T.duoClose, "", o.on.close));
    act.appendChild(button(T.backMenu, o.closed ? "" : "ghost", o.on.leave));
    return;
  }
  if (m && !m.vsHuman) {
    const info = DT.who(st, m.opp);
    const card = el("div", "next");
    const whoRow = el("div", "who"); whoRow.append(flag(info.land), el("b", "", info.name));
    card.append(el("div", "label", T.duoYourMatch(T.rounds[m.key], "")), whoRow, el("div", "small", T.styles[info.style] + " · " + T.styleHints[info.style]));
    act.append(card, button(T.playMatch, "", o.on.play));
  } else if (m && m.vsHuman) {
    const name = DT.who(st, m.opp).name;
    if (o.ready) act.appendChild(el("p", "small", T.duoFinalWait(name)));
    else act.appendChild(button(T.duoFinalReady(name), "", o.on.ready));
  } else if (DT.alive(st, meH)) {
    act.appendChild(el("p", "small", T.duoWaitOther(other ? other.name : "")));
  } else {
    act.appendChild(el("p", "small", T.duoOut));
  }
  // Anfeuern: wenn du ausgeschieden bist oder auf den anderen wartest, solange er noch im Turnier ist
  if (other && !m && DT.alive(st, other.id)) act.appendChild(button(T.duoCheer, "ghost", o.on.cheer));
  act.appendChild(button(T.duoLeave, "ghost", o.on.leave));
}

function button(label, cls, fn) { const b = el("button", cls, label); b.onclick = fn; return b; }
