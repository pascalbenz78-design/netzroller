// Menüs und Überlagerungen: Hauptmenü, Zu zweit, Einstellungen, Match-Intro mit Münzwurf.
// Spielaktionen (Spiel starten, beitreten …) verdrahtet main.js; hier geht es um Anzeige und Profil.

import { T } from "./texts.js";
import { COUNTRIES, paintFlag, drawFlag, countryName } from "./flags.js";
import { exportCode, importCode, saveProfile } from "./storage.js";

const $ = id => document.getElementById(id);
const SCREENS = ["menu", "duo", "settings", "waiting", "over"];

/** Zeigt genau eine Menü-Seite (oder keine, mit null). */
export function showScreen(id) {
  SCREENS.forEach(s => { $(s).hidden = s !== id; });
}
export function currentScreen() { return SCREENS.find(s => !$(s).hidden) || null; }

/**
 * @param o.profile   Profil-Objekt (wird direkt verändert und gespeichert)
 * @param o.onChange  nach jeder Änderung am Profil (Einstellungen anwenden)
 * @param o.onIntro   «Intro ansehen»
 */
export function initUI({ profile, onChange, onIntro }) {
  // Länderliste
  const sel = $("landSel");
  COUNTRIES.forEach(c => { const o = document.createElement("option"); o.value = c.code; o.textContent = c.name; sel.appendChild(o); });

  const save = () => { saveProfile(profile); refreshProfileUI(profile); onChange(profile); };

  // Navigation
  $("duoBtn").onclick = () => showScreen("duo");
  $("settingsBtn").onclick = () => { fillSettings(profile); showScreen("settings"); };
  $("duoBack").onclick = () => showScreen("menu");
  $("settingsBack").onclick = () => showScreen("menu");
  $("introBtn").onclick = () => onIntro();
  $("introBtn2").onclick = () => onIntro();

  // Profil
  $("nameIn").addEventListener("change", () => { profile.name = $("nameIn").value.replace(/[^\p{L}\p{N} ._-]/gu, "").trim().slice(0, 14); save(); });
  sel.addEventListener("change", () => { profile.land = sel.value; save(); });

  // Schalter
  const toggles = { setSound: "sound", setVoice: "voice", setVibration: "vibration", setLefty: "lefty", setSwipe: "swipe", setIntro: "intro" };
  Object.entries(toggles).forEach(([id, key]) => $(id).addEventListener("change", () => { profile.settings[key] = $(id).checked; save(); }));

  // Export / Import
  $("exportBtn").onclick = () => { $("exportOut").value = exportCode(profile); $("exportRow").hidden = false; $("exportOut").select(); };
  $("copyBtn").onclick = async () => {
    try { await navigator.clipboard.writeText($("exportOut").value); msg(T.copied); }
    catch (e) { $("exportOut").select(); msg(T.copyManual); }
  };
  $("importBtn").onclick = () => {
    try {
      const p = importCode($("importIn").value, profile);
      Object.assign(profile, p); profile.settings = { ...p.settings };
      save(); fillSettings(profile); $("importIn").value = ""; msg(T.imported);
    } catch (e) { msg(T.importBad, true); }
  };
  function msg(t, warn) { const m = $("settingsMsg"); m.textContent = t; m.classList.toggle("warn", !!warn); m.hidden = false; }

  refreshProfileUI(profile);
}

function fillSettings(p) {
  $("nameIn").value = p.name;
  $("landSel").value = p.land;
  $("setSound").checked = p.settings.sound; $("setVoice").checked = p.settings.voice;
  $("setVibration").checked = p.settings.vibration; $("setLefty").checked = p.settings.lefty;
  $("setSwipe").checked = p.settings.swipe; $("setIntro").checked = p.settings.intro;
  $("exportRow").hidden = true; $("settingsMsg").hidden = true;
}

/** Begrüssung im Hauptmenü mit Name und Flagge. */
export function refreshProfileUI(p) {
  $("greetName").textContent = p.name ? T.hello(p.name) : T.helloAnon;
  $("greetLand").textContent = countryName(p.land);
  requestAnimationFrame(() => paintFlag($("greetFlag"), p.land));
}

// ---------- Match-Intro ----------
/**
 * Spieler mit Namen und Flagge, Anlass und Runde, Münzwurf um den Aufschlag. Antippen überspringt.
 * @param o.me / o.opp  { name, land }
 * @param o.event       z. B. «Schnelles Spiel · Mittel»
 * @param o.first       "me" | "opp": wer aufschlägt (steht schon fest, die Münze zeigt es nur)
 */
export function matchIntro({ me, opp, event, first, reduced }) {
  const root = $("matchIntro"), coin = $("coinCv");
  $("miNameMe").textContent = me.name; $("miLandMe").textContent = countryName(me.land) || "";
  $("miNameOp").textContent = opp.name; $("miLandOp").textContent = countryName(opp.land) || "";
  $("miEvent").textContent = event;
  $("miResult").textContent = "";
  root.hidden = false; root.classList.remove("show");
  requestAnimationFrame(() => {
    paintFlag($("miFlagMe"), me.land); paintFlag($("miFlagOp"), opp.land);
    root.classList.add("show");
  });

  const dpr = Math.min(window.devicePixelRatio || 1, 2), cs = 96;
  coin.width = cs * dpr; coin.height = cs * dpr;
  const cx = coin.getContext("2d");
  const FLIP_AT = reduced ? 0 : 0.8, FLIP = reduced ? 0 : 1.3, DONE = reduced ? 1.6 : 3.2;
  const turns = 6 + (first === "opp" ? 1 : 0);          // gerade Anzahl halber Drehungen = deine Seite oben
  let t = 0, last = performance.now(), raf = 0, closed = false, resolveDone;
  const done = new Promise(r => { resolveDone = r; });

  function drawCoin(angle) {
    cx.setTransform(dpr, 0, 0, dpr, 0, 0);
    cx.clearRect(0, 0, cs, cs);
    const c = Math.cos(angle), ry = Math.max(0.04, Math.abs(c)), r = cs * 0.42, lift = Math.sin(Math.min(1, t / Math.max(FLIP, 0.01)) * Math.PI) * cs * 0.06;
    const face = c >= 0 ? me.land : opp.land;
    cx.save(); cx.translate(cs / 2, cs / 2 - lift); cx.scale(1, ry);
    cx.fillStyle = "#b8902a"; cx.beginPath(); cx.arc(0, 0, r, 0, 7); cx.fill();
    cx.fillStyle = "#e9c75a"; cx.beginPath(); cx.arc(0, 0, r * 0.9, 0, 7); cx.fill();
    cx.beginPath(); cx.arc(0, 0, r * 0.7, 0, 7); cx.clip();
    drawFlag(cx, face, -r * 0.7, -r * 0.7, r * 1.4, r * 1.4);
    cx.restore();
  }
  function frame(now) {
    if (closed) return;
    t += Math.min((now - last) / 1000, 0.05); last = now;
    const k = FLIP ? Math.min(1, Math.max(0, (t - FLIP_AT) / FLIP)) : 1;
    const eased = 1 - Math.pow(1 - k, 3);
    drawCoin(eased * turns * Math.PI);
    if (k >= 1 && !$("miResult").textContent) $("miResult").textContent = T.firstServe(first === "me" ? me.name : opp.name, first === "me" && me.isYou);
    if (t >= DONE) { close(); return; }
    raf = requestAnimationFrame(frame);
  }
  function close() {
    if (closed) return;
    closed = true; cancelAnimationFrame(raf);
    root.hidden = true; root.classList.remove("show");
    root.removeEventListener("pointerdown", close);
    resolveDone();
  }
  root.addEventListener("pointerdown", close);
  raf = requestAnimationFrame(frame);
  return { done, close };
}
