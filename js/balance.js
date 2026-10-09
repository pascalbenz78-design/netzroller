// Alle Zahlenwerte des Spiels an einem Ort. Anpassen, neu laden, fertig.
//
// Koordinaten (siehe docs/GAME_DESIGN.md, «Entscheide»):
//   x  quer über den Platz in Platzbreiten, 0 = linker Rand, 1 = rechter Rand.
//   v  längs, normiert: -1 = Schlägerlinie oben (Gegner), 0 = Netz, +1 = eigene Schlägerlinie.
//   d  Fortschritt eines Schlags: 0 = Schläger des Schlagenden, 1 = Netz, 2 = Schläger des Empfängers.
// Tempo wird in d pro Sekunde gemessen (2 = einmal von Schläger zu Schläger in 1 s).

export const BALANCE = {
  court: {
    doublesL: 0.04, doublesR: 0.96,     // Doppel-Seitenlinien (Gassen sind Aus)
    singlesL: 0.155, singlesR: 0.845,   // Einzel-Seitenlinien
    baseline: 0.88,                     // Grundlinie, Abstand vom Netz (v)
    serviceLine: 0.475,                 // Aufschlaglinie, Abstand vom Netz (v)
    ballR: 0.032,                       // Ballradius quer (Platzbreiten)
    ballRV: 0.035,                      // Ballradius längs (v); Linie berührt = drin
    bounceMax: 0.98,                    // tiefster Aufsprung (v), immer vor der Schlägerlinie
  },

  levels: [
    {
      name: "Leicht", base: 0.85, max: 1.9, up: 1.05, hw: 0.17, minReaction: 0.40,
      ai: { speed: 0.60, reaction: 0.26, err: 0.55, angleRate: 0.15, superRate: 0.00,
            serve: { perfect: 0.10, fault1: 0.40, fault2: 0.17 } },
    },
    {
      name: "Mittel", base: 1.15, max: 2.5, up: 1.07, hw: 0.15, minReaction: 0.32,
      ai: { speed: 0.80, reaction: 0.22, err: 0.50, angleRate: 0.24, superRate: 0.12,
            serve: { perfect: 0.25, fault1: 0.35, fault2: 0.14 } },
    },
    {
      name: "Schwer", base: 1.6, max: 3.2, up: 1.08, hw: 0.13, minReaction: 0.26,
      ai: { speed: 1.10, reaction: 0.18, err: 0.36, angleRate: 0.38, superRate: 0.25,
            serve: { perfect: 0.40, fault1: 0.30, fault2: 0.10 } },
    },
  ],

  // Schlägerzonen, gemessen als Abstand Ball–Schlägermitte im Verhältnis zur halben Schlägerbreite.
  zones: {
    center: 0.60,          // bis hier: sicher, moderater Winkel
    outer: 0.92,           // bis hier: scharfer Winkel; dahinter Rahmen
    centerAim: 0.55,       // Mitte zielt höchstens so weit nach aussen (Anteil der halben Einzelbreite)
    outerAimMax: 1.12,     // Aussenzone ganz aussen: über die Linie hinaus = Aus (ab Trefferabstand ≈ 0,90)
    aimNoise: 0.05,        // Streuung des Zielpunkts quer
    paddleInfluence: 0.10, // Schlägerbewegung verstärkt den Winkel …
    paddleAimMax: 0.15,    // … aber höchstens so viel
  },

  // Rahmentreffer: was mit dem Ball passiert (Rest = harmloser, langsamer Ball ins Feld)
  frame: { net: 0.25, out: 0.22, weakSpeed: 0.55 },

  // Tiefe des Aufsprungs: 0 = Aufschlaglinie, 1 = Grundlinie, > 1 = lang (Aus)
  depth: {
    normal: [0.30, 0.90],
    superCenter: [0.70, 0.98],
    superOuter: [0.80, 1.18],
    frameLong: [1.06, 1.25],
    frameWeak: [-0.6, 0.2],
  },

  superMult: 2.2,          // Super-Schlag = normales Tempo × 2,2 (begrenzt durch minReaction)
  supersPerRally: 2,

  netcord: {
    chance: 0.04,          // pro Ball, der das Netz überquert
    slow: 0.5,             // Tempo nach dem Netzroller
    deflect: 0.06,         // seitliche Ablenkung (Platzbreiten)
    bounce: [0.10, 0.32],  // Aufsprung kurz hinter dem Netz (v)
  },

  serve: {
    tossTime: 1.1,                              // Ball hoch und wieder unten (s)
    first: { perfect: 0.10, good: 0.30 },        // Zeitfenster als Abweichung vom höchsten Punkt (0..1)
    second: { perfect: 0.12, good: 0.55 },
    speed: { perfect: 1.8, good: 1.35, second: 0.95 },  // × Grundtempo der Stufe
    zoneInner: 0.53, zoneOuter: 0.80,           // Aufschlagposition: nahe Mitte = «Mitte», aussen = «nach aussen»
    depthPerfect: [0.86, 0.97],                 // × Aufschlaglinie
    depthGood: [0.50, 0.85],
    long: [0.08, 0.22],                         // zu spät: so weit hinter der Aufschlaglinie
    goodPull: 0.4,                              // normaler Aufschlag wird zur Feldmitte gezogen
    height: 0.16,                               // Wurfhöhe (Darstellung)
  },

  flight: { arc: 0.10, arcSuper: 0.05, arcAfter: 0.06, afterBounce: 0.92 },

  keyboard: { start: 0.8, max: 2.8, accel: 6.0 },     // Platzbreiten/s, Beschleunigung pro s
  touch: { swipeMin: 70, swipeRatio: 2.5, swipeTime: 300 },

  // Hawk-Eye: knapp = Aufsprung näher an der Linie als gap × Ballradius (2 = ein Balldurchmesser)
  hawk: { gap: 2, dur: 1.7, durReduced: 0.8 },
  crowd: { applauseFrom: 8 },      // Applaus ab so vielen Schlägen im Ballwechsel

  match: { gamesToWin: 3 },
  timing: { pointPause: 0.9, faultPause: 0.8, holdMax: 1.2, aiServeDelay: [0.6, 1.0] },
};
