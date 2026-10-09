// Töne mit Web Audio (erst nach dem ersten Antippen möglich), Publikum und Vibration.
// Alles wird erzeugt, es gibt keine Tondateien.

let ac = null, master = null, soundOn = true, vibrationOn = true, noiseBuf = null;

export function audioInit() {
  if (!ac) {
    try {
      ac = new (window.AudioContext || window.webkitAudioContext)();
      master = ac.createGain(); master.gain.value = soundOn ? 1 : 0; master.connect(ac.destination);
    } catch (e) {}
  }
  if (ac && ac.state === "suspended") ac.resume().catch(() => {});
}
/** true, wenn Töne gerade abgespielt werden können (nach einem Antippen). */
export function audioRunning() { return !!ac && ac.state === "running"; }

export function setSound(on) { soundOn = !!on; if (master) master.gain.value = soundOn ? 1 : 0; }
export function setVibration(on) { vibrationOn = !!on; }
export function buzz(ms) { if (!vibrationOn) return; try { navigator.vibrate && navigator.vibrate(ms); } catch (e) {} }

/** Kurzer Ton: Schlag, Aufsprung, Netz. */
export function pock(freq = 520, dur = 0.07, vol = 0.25, type = "triangle", when = 0) {
  if (!ac || !soundOn) return;
  try {
    const o = ac.createOscillator(), g = ac.createGain(), t = ac.currentTime + when;
    o.type = type; o.frequency.setValueAtTime(freq, t);
    o.frequency.exponentialRampToValueAtTime(Math.max(40, freq * 0.5), t + dur);
    g.gain.setValueAtTime(vol, t); g.gain.exponentialRampToValueAtTime(0.001, t + dur);
    o.connect(g).connect(master); o.start(t); o.stop(t + dur + 0.02);
  } catch (e) {}
}

function noise() {
  if (!noiseBuf) {
    noiseBuf = ac.createBuffer(1, ac.sampleRate * 2, ac.sampleRate);
    const d = noiseBuf.getChannelData(0);
    for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1;
  }
  const src = ac.createBufferSource(); src.buffer = noiseBuf; src.loop = true;
  return src;
}

/** Gefiltertes Rauschen mit Hüllkurve: Grundbaustein für Publikum und «Klack». */
function noiseBurst({ when = 0, dur = 0.5, vol = 0.3, type = "bandpass", freq = 1000, q = 1, attack = 0.01, freqEnd = null }) {
  if (!ac || !soundOn) return;
  try {
    const t = ac.currentTime + when, src = noise(), f = ac.createBiquadFilter(), g = ac.createGain();
    f.type = type; f.frequency.setValueAtTime(freq, t); f.Q.value = q;
    if (freqEnd) f.frequency.linearRampToValueAtTime(freqEnd, t + dur);
    g.gain.setValueAtTime(0.0001, t);
    g.gain.linearRampToValueAtTime(vol, t + attack);
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    src.connect(f).connect(g).connect(master);
    src.start(t, Math.random()); src.stop(t + dur + 0.05);
  } catch (e) {}
}

export const sfx = {
  hit: speed => pock(480 + speed * 90),
  superHit: () => pock(760, 0.09, 0.3),
  bounce: () => pock(260, 0.05, 0.12, "sine"),
  tock: () => { pock(900, 0.04, 0.3, "square"); pock(620, 0.05, 0.2, "square", 0.045); },   // Netzkante
  net: () => pock(140, 0.16, 0.25, "sawtooth"),
  toss: () => pock(330, 0.05, 0.1, "sine"),
  arm: () => pock(980, 0.06, 0.15),
  lost: () => pock(180, 0.18, 0.3),
  won: () => pock(880, 0.12, 0.2),
  /** Flutlicht geht an: satter «Klack». */
  klack: () => {
    pock(70, 0.25, 0.5, "sine");
    noiseBurst({ dur: 0.08, vol: 0.5, type: "highpass", freq: 1800, q: 0.7, attack: 0.002 });
    noiseBurst({ when: 0.01, dur: 0.35, vol: 0.12, type: "lowpass", freq: 300, q: 0.5, attack: 0.005 });
  },
};

export const crowd = {
  /** Raunen bei knappen Bällen: dunkles «Oooh», das an- und abschwillt. */
  murmur() {
    noiseBurst({ dur: 1.4, vol: 0.16, type: "bandpass", freq: 420, freqEnd: 330, q: 4, attack: 0.35 });
    noiseBurst({ dur: 1.3, vol: 0.08, type: "bandpass", freq: 900, freqEnd: 700, q: 6, attack: 0.4 });
  },
  /** Applaus: viele kurze Klatscher, dicht und dann ausklingend. */
  applause(strength = 1) {
    if (!ac || !soundOn) return;
    const n = Math.round(60 * strength), len = 1.6 + strength;
    for (let i = 0; i < n; i++) {
      const when = Math.pow(Math.random(), 1.6) * len;
      noiseBurst({ when, dur: 0.05 + Math.random() * 0.04, vol: 0.05 + Math.random() * 0.06, type: "bandpass", freq: 1200 + Math.random() * 1800, q: 1.2, attack: 0.003 });
    }
  },
  /** Jubel: breites Rauschen mit Vokal-Färbung, dazu Applaus. */
  cheer(strength = 1) {
    noiseBurst({ dur: 1.6 * strength + 0.6, vol: 0.18 * strength + 0.05, type: "bandpass", freq: 650, freqEnd: 800, q: 1.5, attack: 0.15 });
    noiseBurst({ dur: 1.4 * strength + 0.5, vol: 0.1 * strength + 0.03, type: "bandpass", freq: 1500, freqEnd: 1300, q: 2.5, attack: 0.2 });
    crowd.applause(strength);
  },
};
