// Töne mit Web Audio (erst nach dem ersten Antippen möglich) und Vibration.

let ac = null;

export function audioInit() {
  if (!ac) { try { ac = new (window.AudioContext || window.webkitAudioContext)(); } catch (e) {} }
  if (ac && ac.state === "suspended") ac.resume().catch(() => {});
}

/** Kurzer Ton: Schlag, Aufsprung, Netz. */
export function pock(freq = 520, dur = 0.07, vol = 0.25, type = "triangle") {
  if (!ac) return;
  try {
    const o = ac.createOscillator(), g = ac.createGain(), t = ac.currentTime;
    o.type = type; o.frequency.setValueAtTime(freq, t);
    o.frequency.exponentialRampToValueAtTime(Math.max(40, freq * 0.5), t + dur);
    g.gain.setValueAtTime(vol, t); g.gain.exponentialRampToValueAtTime(0.001, t + dur);
    o.connect(g).connect(ac.destination); o.start(t); o.stop(t + dur);
  } catch (e) {}
}

export const sfx = {
  hit: speed => pock(480 + speed * 90),
  superHit: () => pock(760, 0.09, 0.3),
  bounce: () => pock(260, 0.05, 0.12, "sine"),
  tock: () => { pock(900, 0.04, 0.3, "square"); setTimeout(() => pock(620, 0.05, 0.2, "square"), 45); },   // Netzkante
  net: () => pock(140, 0.16, 0.25, "sawtooth"),
  toss: () => pock(330, 0.05, 0.1, "sine"),
  arm: () => pock(980, 0.06, 0.15),
  lost: () => pock(180, 0.18, 0.3),
  won: () => pock(880, 0.12, 0.2),
};

export function buzz(ms) { try { navigator.vibrate && navigator.vibrate(ms); } catch (e) {} }
